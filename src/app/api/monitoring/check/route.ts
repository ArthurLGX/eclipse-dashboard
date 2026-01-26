import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

// Configuration SMTP système pour les alertes (variables d'environnement)
const SYSTEM_SMTP_HOST = process.env.SMTP_HOST;
const SYSTEM_SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SYSTEM_SMTP_USER = process.env.SMTP_USER;
const SYSTEM_SMTP_PASS = process.env.SMTP_PASS;
const SYSTEM_SMTP_SECURE = process.env.SMTP_SECURE === 'true';

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

// Générer le template d'email d'alerte (mode clair)
function generateAlertEmailTemplate(site: MonitoredSite, result: CheckResult): string {
  const isDown = result.status === 'down';
  const statusColor = isDown ? '#DC2626' : '#F59E0B'; // Rouge pour down, orange pour slow
  const statusBgColor = isDown ? '#FEE2E2' : '#FEF3C7';
  const statusText = isDown ? 'HORS LIGNE' : 'LENT';
  const statusIcon = isDown ? '🔴' : '🟡';
  const dateStr = new Date().toLocaleString('fr-FR');

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <title>Alerte Monitoring</title>
  <style>
    /* Force light mode pour tous les clients email */
    :root { 
      color-scheme: light only !important; 
      supported-color-schemes: light only !important;
    }
    
    /* Bloque spécifiquement le dark mode */
    @media (prefers-color-scheme: dark) {
      :root { 
        color-scheme: light !important; 
      }
      body, table, td, div, p, a, span, h1, strong {
        background-color: #FFFFFF !important;
        color: #111827 !important;
      }
      [data-ogsc] {
        background-color: #FFFFFF !important;
        color: #111827 !important;
      }
    }
    
    /* Gmail spécifique */
    u + .body { 
      background-color: #F3F4F6 !important; 
    }
    
    /* Outlook spécifique */
    .ExternalClass { 
      width: 100%; 
      background-color: #F3F4F6 !important; 
    }
    .ExternalClass, .ExternalClass p, .ExternalClass span, .ExternalClass font, .ExternalClass td, .ExternalClass div {
      line-height: 100%;
      background-color: #FFFFFF !important;
      color: #111827 !important;
    }
  </style>
</head>
<body class="body" style="margin: 0; padding: 0; background-color: #F3F4F6 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;" data-ogsc>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F3F4F6 !important; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
    <tr>
      <td align="center" style="padding: 40px 20px; background-color: #F3F4F6 !important;">
        <!--[if mso | IE]>
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #FFFFFF;">
        <tr><td>
        <![endif]-->
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #FFFFFF !important; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
          <!-- Header -->
          <tr>
            <td align="center" style="padding: 32px 40px 24px; background-color: #FFFFFF !important;">
              <div style="font-size: 48px; margin-bottom: 16px; line-height: 1;">${statusIcon}</div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #111827 !important; background-color: transparent !important;">ALERTE MONITORING</h1>
            </td>
          </tr>
          
          <!-- Status Banner -->
          <tr>
            <td style="padding: 0 40px; background-color: #FFFFFF !important;">
              <div style="background-color: ${statusBgColor} !important; border-left: 4px solid ${statusColor}; border-radius: 8px; padding: 16px 20px;">
                <p style="margin: 0; font-size: 16px; color: #374151 !important; background-color: transparent !important;">
                  <strong style="color: ${statusColor} !important; background-color: transparent !important;">${site.name}</strong> est actuellement <strong style="color: ${statusColor} !important; background-color: transparent !important;">${statusText}</strong>
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Details -->
          <tr>
            <td style="padding: 24px 40px; background-color: #FFFFFF !important;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #FFFFFF !important; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB; background-color: #FFFFFF !important;">
                    <span style="color: #6B7280 !important; font-size: 14px; background-color: transparent !important;">URL</span><br>
                    <a href="${site.url}" style="color: #7C3AED !important; text-decoration: none; font-size: 14px; word-break: break-all; background-color: transparent !important;">${site.url}</a>
                  </td>
                </tr>
                ${result.responseTime ? `
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB; background-color: #FFFFFF !important;">
                    <span style="color: #6B7280 !important; font-size: 14px; background-color: transparent !important;">Temps de réponse</span><br>
                    <span style="color: #111827 !important; font-size: 16px; font-weight: 600; background-color: transparent !important;">${result.responseTime}ms</span>
                  </td>
                </tr>
                ` : ''}
                ${result.error ? `
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB; background-color: #FFFFFF !important;">
                    <span style="color: #6B7280 !important; font-size: 14px; background-color: transparent !important;">Erreur</span><br>
                    <span style="color: #DC2626 !important; font-size: 14px; background-color: transparent !important;">${result.error}</span>
                  </td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 12px 0; background-color: #FFFFFF !important;">
                    <span style="color: #6B7280 !important; font-size: 14px; background-color: transparent !important;">Vérifié le</span><br>
                    <span style="color: #111827 !important; font-size: 14px; background-color: transparent !important;">${dateStr}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 24px 40px 32px; border-top: 1px solid #E5E7EB; background-color: #FFFFFF !important;">
              <p style="margin: 0; font-size: 12px; color: #9CA3AF !important; background-color: transparent !important;">Eclipse Dashboard - Monitoring</p>
            </td>
          </tr>
        </table>
        <!--[if mso | IE]>
        </td></tr></table>
        <![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// Envoyer une alerte email
async function sendAlert(site: MonitoredSite, result: CheckResult) {
  if (!site.alert_email || !site.users?.length) return;
  
  const userEmail = site.users[0]?.email;
  if (!userEmail) return;
  
  // Vérifier que la config SMTP système est présente
  if (!SYSTEM_SMTP_HOST || !SYSTEM_SMTP_USER || !SYSTEM_SMTP_PASS) {
    console.error('System SMTP not configured for monitoring alerts');
    return;
  }
  
  try {
    const isDown = result.status === 'down';
    const emoji = isDown ? '🔴' : '🟡';
    const statusText = isDown ? 'hors ligne' : 'lent';
    
    // Créer le transporteur Nodemailer
    const transporter = nodemailer.createTransport({
      host: SYSTEM_SMTP_HOST,
      port: SYSTEM_SMTP_PORT,
      secure: SYSTEM_SMTP_SECURE,
      auth: {
        user: SYSTEM_SMTP_USER,
        pass: SYSTEM_SMTP_PASS,
      },
    });
    
    // Envoyer l'email avec le nom "Eclipse Monitoring"
    await transporter.sendMail({
      from: `"Eclipse Monitoring" <${SYSTEM_SMTP_USER}>`,
      to: userEmail,
      subject: `${emoji} Alerte: ${site.name} est ${statusText}`,
      html: generateAlertEmailTemplate(site, result),
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
  
  // URLs à ne pas vérifier (dashboard lui-même, localhost, etc.)
  const dashboardUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  const dashboardHost = dashboardUrl ? new URL(dashboardUrl).host : '';
  const excludedHosts = ['localhost', '127.0.0.1', '[::1]'];
  if (dashboardHost) excludedHosts.push(dashboardHost);
  
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
      const errorText = await response.text();
      console.error('Strapi response error:', response.status, errorText);
      throw new Error(`Failed to fetch monitored sites: ${response.status}`);
    }
    
    const responseData = await response.json();
    const sites = responseData.data as MonitoredSite[] | undefined;
    
    if (!sites?.length) {
      return NextResponse.json({ message: 'No sites to check', checked: 0 });
    }
    
    // Filtrer les sites qui doivent être vérifiés (basé sur check_interval)
    // Et éviter de vérifier le propre domaine du dashboard
    const now = new Date();
    const sitesToCheck = sites.filter(site => {
      // Éviter de vérifier le dashboard lui-même, localhost, etc.
      try {
        const siteUrl = new URL(site.url);
        const siteHost = siteUrl.hostname;
        if (excludedHosts.some(h => siteHost === h || siteHost.includes(h))) {
          return false;
        }
      } catch {
        // URL invalide, on la skippe
        console.error(`Invalid URL for site ${site.name}: ${site.url}`);
        return false;
      }
      
      if (!site.last_check) return true;
      const lastCheck = new Date(site.last_check);
      const minutesSinceLastCheck = (now.getTime() - lastCheck.getTime()) / 60000;
      return minutesSinceLastCheck >= site.check_interval;
    });
    
    // Vérifier chaque site avec gestion d'erreur individuelle
    const results = await Promise.all(
      sitesToCheck.map(async (site) => {
        try {
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
            error: null,
          };
        } catch (error) {
          console.error(`Error checking site ${site.name}:`, error);
          return {
            name: site.name,
            url: site.url,
            status: 'error' as const,
            responseTime: null,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
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
      { 
        error: error instanceof Error ? error.message : 'Monitoring check failed',
        details: error instanceof Error ? error.stack : undefined,
      },
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

