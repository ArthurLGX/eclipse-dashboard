import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { AI_MODELS } from '@/lib/ai';

const getOpenAIClient = () => {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
};

interface PriceEstimationPayload {
  userId: number;
  projectId?: string;
  clientId?: string;
  description?: string;
  currentTotal: number;
  language: 'fr' | 'en';
}

// Fetch historical data for comparison
async function fetchHistoricalData(userId: number, projectId?: string, clientId?: string) {
  const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337/api';
  const token = process.env.STRAPI_API_TOKEN;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    // Fetch paid invoices and accepted quotes
    const [facturesRes, projectsRes] = await Promise.all([
      fetch(`${strapiUrl}/factures?filters[user][id][$eq]=${userId}&filters[$or][0][invoice_status][$eq]=paid&filters[$or][1][quote_status][$eq]=accepted&populate=client,project&pagination[limit]=50&sort=createdAt:desc`, { headers }),
      fetch(`${strapiUrl}/projects?filters[user][id][$eq]=${userId}&filters[project_status][$eq]=completed&populate=client&pagination[limit]=30`, { headers }),
    ]);

    const [factures, projects] = await Promise.all([
      facturesRes.ok ? facturesRes.json() : { data: [] },
      projectsRes.ok ? projectsRes.json() : { data: [] },
    ]);

    // Also fetch time entries to calculate average hourly rates
    const timeEntriesRes = await fetch(`${strapiUrl}/time-entries?filters[user][id][$eq]=${userId}&filters[is_invoiced][$eq]=true&pagination[limit]=200`, { headers });
    const timeEntries = timeEntriesRes.ok ? await timeEntriesRes.json() : { data: [] };

    return {
      factures: factures.data || [],
      projects: projects.data || [],
      timeEntries: timeEntries.data || [],
    };
  } catch (error) {
    console.error('Error fetching historical data:', error);
    return {
      factures: [],
      projects: [],
      timeEntries: [],
    };
  }
}

// Calculate statistics from historical data
function calculateStats(data: Awaited<ReturnType<typeof fetchHistoricalData>>) {
  const { factures, timeEntries } = data;
  
  // Filter invoices with valid amounts
  const validInvoices = factures.filter((f: any) => f.total_ttc && f.total_ttc > 0);
  
  // Calculate average invoice amount
  const avgAmount = validInvoices.length > 0
    ? validInvoices.reduce((sum: number, f: any) => sum + f.total_ttc, 0) / validInvoices.length
    : 0;
  
  // Calculate min/max
  const amounts = validInvoices.map((f: any) => f.total_ttc);
  const minAmount = amounts.length > 0 ? Math.min(...amounts) : 0;
  const maxAmount = amounts.length > 0 ? Math.max(...amounts) : 0;
  
  // Calculate average hourly rate from time entries
  const totalHours = timeEntries.reduce((sum: number, e: any) => sum + ((e.duration || 0) / 60), 0);
  const totalBilled = validInvoices
    .filter((f: any) => f.type === 'facture')
    .reduce((sum: number, f: any) => sum + f.total_ttc, 0);
  const avgHourlyRate = totalHours > 0 ? Math.round(totalBilled / totalHours) : 0;
  
  // Recent projects breakdown
  const recentProjects = validInvoices.slice(0, 10).map((f: any) => ({
    amount: f.total_ttc,
    clientName: f.client?.name,
    projectTitle: f.project?.title,
    type: f.type,
    date: f.createdAt,
  }));

  return {
    count: validInvoices.length,
    avgAmount: Math.round(avgAmount),
    minAmount,
    maxAmount,
    avgHourlyRate,
    recentProjects,
  };
}

export async function POST(req: Request) {
  try {
    const payload: PriceEstimationPayload = await req.json();
    const { userId, projectId, clientId, description, currentTotal, language = 'fr' } = payload;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Fetch historical data
    const historicalData = await fetchHistoricalData(userId, projectId, clientId);
    const stats = calculateStats(historicalData);

    // If no historical data, return a basic response
    if (stats.count === 0) {
      return NextResponse.json({
        suggested_price: currentTotal || 0,
        confidence: 'low',
        comparison: 'similar',
        similar_projects_count: 0,
        avg_hourly_rate: 0,
        reasoning: language === 'fr' 
          ? 'Pas assez de données historiques pour faire une estimation précise. Continuez à utiliser Eclipse pour améliorer les suggestions futures.'
          : 'Not enough historical data for an accurate estimation. Keep using Eclipse to improve future suggestions.',
        recommendations: language === 'fr'
          ? ['Complétez vos premiers projets pour obtenir des estimations plus précises']
          : ['Complete your first projects to get more accurate estimates'],
      });
    }

    const openai = getOpenAIClient();

    const systemPrompt = language === 'fr' 
      ? `Tu es un assistant spécialisé dans l'estimation de prix pour freelances et agences.
Analyse les données historiques et suggère un prix approprié.

RÈGLES:
- Le prix suggéré doit être réaliste et basé sur les données
- La confiance doit refléter la qualité des données (high si >10 projets similaires, medium si 5-10, low si <5)
- La comparaison doit indiquer si le prix actuel est above (trop cher), below (sous-évalué) ou similar
- Le raisonnement doit être concis (1-2 phrases)
- Les recommandations doivent être actionnables (max 3)

Réponds en JSON avec ce format exact:
{
  "suggested_price": number,
  "confidence": "high" | "medium" | "low",
  "comparison": "above" | "below" | "similar",
  "similar_projects_count": number,
  "avg_hourly_rate": number,
  "reasoning": "string",
  "recommendations": ["string", "string"]
}`
      : `You are an assistant specialized in price estimation for freelancers and agencies.
Analyze historical data and suggest an appropriate price.

RULES:
- Suggested price must be realistic and data-based
- Confidence should reflect data quality (high if >10 similar projects, medium if 5-10, low if <5)
- Comparison should indicate if current price is above (too expensive), below (undervalued) or similar
- Reasoning should be concise (1-2 sentences)
- Recommendations should be actionable (max 3)

Respond in JSON with this exact format:
{
  "suggested_price": number,
  "confidence": "high" | "medium" | "low",
  "comparison": "above" | "below" | "similar",
  "similar_projects_count": number,
  "avg_hourly_rate": number,
  "reasoning": "string",
  "recommendations": ["string", "string"]
}`;

    const userPrompt = `Données historiques de l'utilisateur:
- Nombre de projets/factures: ${stats.count}
- Montant moyen: ${stats.avgAmount}€
- Montant min: ${stats.minAmount}€
- Montant max: ${stats.maxAmount}€
- Taux horaire moyen: ${stats.avgHourlyRate}€/h

Projets récents:
${stats.recentProjects.map((p: any) => `- ${p.projectTitle || 'Sans titre'} (${p.clientName || 'Client inconnu'}): ${p.amount}€`).join('\n')}

Prix actuel du devis: ${currentTotal}€
${description ? `Description: ${description}` : ''}

Génère une estimation de prix basée sur ces données.`;

    const completion = await openai.chat.completions.create({
      model: AI_MODELS.fast.id,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 500,
    });

    const responseContent = completion.choices[0].message.content;
    if (!responseContent) {
      throw new Error('AI did not return content');
    }

    const estimation = JSON.parse(responseContent);
    return NextResponse.json(estimation);

  } catch (error) {
    console.error('Error in price-estimation API:', error);
    return NextResponse.json(
      { error: 'Failed to generate estimation', details: (error as Error).message },
      { status: 500 }
    );
  }
}

