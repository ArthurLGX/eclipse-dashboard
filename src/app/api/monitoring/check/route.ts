import { NextRequest, NextResponse } from 'next/server';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

interface MonitoredSite {
  id: number;
  documentId: string;
  name: string;
  url: string;
  check_interval: number;
  site_status: string;
  last_check: string | null;
  uptime_percentage: number;
  total_checks: number;
  successful_checks: number;
  alert_email: boolean;
  alert_threshold: number;
  users?: { id: number; email: string }[];
}

interface CheckResult {
  status: 'up' | 'down' | 'slow';
  responseTime: number | null;
  sslExpiry: string | null;
  sslValid: boolean;
  error?: string;
}

// Vérifier un site
async function checkSite(url: string, alertThreshold: number): Promise<CheckResult> {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
    
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Eclipse-Monitoring/1.0',
      },
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    // Vérifier le SSL (si HTTPS)
    const sslExpiry: string | null = null;
    let sslValid = true;
    
    if (url.startsWith('https://')) {
      // Note: Pour obtenir les infos SSL détaillées, il faudrait un module Node.js
      // comme 'tls' ou 'https'. Pour l'instant, on considère SSL valide si la requête réussit
      sslValid = true;
    }
    
    // Déterminer le statut
    let status: 'up' | 'down' | 'slow' = 'up';
    
    if (!response.ok && response.status >= 500) {
      status = 'down';
    } else if (responseTime > alertThreshold) {
      status = 'slow';
    }
    
    return {
      status,
      responseTime,
      sslExpiry,
      sslValid,
    };
  } catch (error) {
    return {
      status: 'down',
      responseTime: null,
      sslExpiry: null,
      sslValid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Mettre à jour un site dans Strapi
async function updateSiteStatus(
  documentId: string, 
  result: CheckResult,
  currentStats: { total_checks: number; successful_checks: number }
) {
  const newTotalChecks = currentStats.total_checks + 1;
  const newSuccessfulChecks = result.status !== 'down' 
    ? currentStats.successful_checks + 1 
    : currentStats.successful_checks;
  const uptimePercentage = (newSuccessfulChecks / newTotalChecks) * 100;
  
  const updateData = {
    site_status: result.status,
    last_check: new Date().toISOString(),
    last_response_time: result.responseTime,
    uptime_percentage: uptimePercentage,
    total_checks: newTotalChecks,
    successful_checks: newSuccessfulChecks,
    ssl_valid: result.sslValid,
    ...(result.sslExpiry && { ssl_expiry: result.sslExpiry }),
    ...(result.status === 'down' && { last_down_at: new Date().toISOString() }),
  };
  
  const response = await fetch(`${STRAPI_URL}/api/monitored-sites/${documentId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(STRAPI_API_TOKEN && { Authorization: `Bearer ${STRAPI_API_TOKEN}` }),
    },
    body: JSON.stringify({ data: updateData }),
  });
  
  if (!response.ok) {
    console.error(`Failed to update site ${documentId}:`, await response.text());
  }
  
  return response.ok;
}

// Envoyer une alerte email
async function sendAlert(site: MonitoredSite, result: CheckResult) {
  if (!site.alert_email || !site.users?.length) return;
  
  const userEmail = site.users[0]?.email;
  if (!userEmail) return;
  
  try {
    // Utiliser l'API d'envoi d'email existante
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/emails/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: userEmail,
        subject: `🚨 Alerte: ${site.name} est ${result.status === 'down' ? 'hors ligne' : 'lent'}`,
        html: `
          <h2>Alerte Monitoring Eclipse</h2>
          <p>Le site <strong>${site.name}</strong> (${site.url}) est actuellement <strong>${
            result.status === 'down' ? 'HORS LIGNE' : 'LENT'
          }</strong>.</p>
          ${result.responseTime ? `<p>Temps de réponse: ${result.responseTime}ms</p>` : ''}
          ${result.error ? `<p>Erreur: ${result.error}</p>` : ''}
          <p>Vérifié le: ${new Date().toLocaleString('fr-FR')}</p>
          <hr>
          <p><small>Eclipse Dashboard - Monitoring</small></p>
        `,
      }),
    });
  } catch (error) {
    console.error('Failed to send alert email:', error);
  }
}

// GET - Vérifier tous les sites (appelé par le cron)
export async function GET(request: NextRequest) {
  // Vérifier le secret pour sécuriser l'endpoint
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Récupérer tous les sites à vérifier
    const response = await fetch(
      `${STRAPI_URL}/api/monitored-sites?populate=users&pagination[pageSize]=100`,
      {
        headers: {
          ...(STRAPI_API_TOKEN && { Authorization: `Bearer ${STRAPI_API_TOKEN}` }),
        },
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch monitored sites');
    }
    
    const { data: sites } = await response.json() as { data: MonitoredSite[] };
    
    if (!sites?.length) {
      return NextResponse.json({ message: 'No sites to check', checked: 0 });
    }
    
    // Filtrer les sites qui doivent être vérifiés (basé sur check_interval)
    const now = new Date();
    const sitesToCheck = sites.filter(site => {
      if (!site.last_check) return true;
      const lastCheck = new Date(site.last_check);
      const minutesSinceLastCheck = (now.getTime() - lastCheck.getTime()) / 60000;
      return minutesSinceLastCheck >= site.check_interval;
    });
    
    console.log(`Checking ${sitesToCheck.length} sites out of ${sites.length}`);
    
    // Vérifier chaque site
    const results = await Promise.all(
      sitesToCheck.map(async (site) => {
        const result = await checkSite(site.url, site.alert_threshold);
        
        // Mettre à jour le statut dans Strapi
        await updateSiteStatus(site.documentId, result, {
          total_checks: site.total_checks || 0,
          successful_checks: site.successful_checks || 0,
        });
        
        // Envoyer une alerte si nécessaire
        if (result.status === 'down' || result.status === 'slow') {
          // Ne pas envoyer si le site était déjà down
          if (site.site_status !== result.status) {
            await sendAlert(site, result);
          }
        }
        
        return {
          name: site.name,
          url: site.url,
          status: result.status,
          responseTime: result.responseTime,
        };
      })
    );
    
    return NextResponse.json({
      message: 'Monitoring check completed',
      checked: results.length,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Monitoring check error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Monitoring check failed' },
      { status: 500 }
    );
  }
}

// POST - Vérifier un site spécifique (manuel)
export async function POST(request: NextRequest) {
  try {
    const { siteId } = await request.json();
    
    if (!siteId) {
      return NextResponse.json({ error: 'Site ID required' }, { status: 400 });
    }
    
    // Récupérer le site
    const response = await fetch(
      `${STRAPI_URL}/api/monitored-sites/${siteId}?populate=users`,
      {
        headers: {
          ...(STRAPI_API_TOKEN && { Authorization: `Bearer ${STRAPI_API_TOKEN}` }),
        },
      }
    );
    
    if (!response.ok) {
      throw new Error('Site not found');
    }
    
    const { data: site } = await response.json() as { data: MonitoredSite };
    
    // Vérifier le site
    const result = await checkSite(site.url, site.alert_threshold);
    
    // Mettre à jour
    await updateSiteStatus(site.documentId, result, {
      total_checks: site.total_checks || 0,
      successful_checks: site.successful_checks || 0,
    });
    
    return NextResponse.json({
      name: site.name,
      url: site.url,
      status: result.status,
      responseTime: result.responseTime,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Site check error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Site check failed' },
      { status: 500 }
    );
  }
}

