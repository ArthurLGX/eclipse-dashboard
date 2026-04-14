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

async function checkSite(url: string, alertThreshold: number): Promise<CheckResult> {
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Eclipse-Monitoring/1.0',
      },
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    const sslExpiry: string | null = null;
    let sslValid = true;

    if (url.startsWith('https://')) {
      sslValid = true;
    }

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

async function updateSiteStatus(
  documentId: string,
  result: CheckResult,
  currentStats: { total_checks: number; successful_checks: number }
) {
  const newTotalChecks = currentStats.total_checks + 1;
  const newSuccessfulChecks =
    result.status !== 'down' ? currentStats.successful_checks + 1 : currentStats.successful_checks;
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

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dashboardUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  const dashboardHost = dashboardUrl ? new URL(dashboardUrl).host : '';
  const excludedHosts = ['localhost', '127.0.0.1', '[::1]'];
  if (dashboardHost) excludedHosts.push(dashboardHost);

  try {
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

    const now = new Date();
    const sitesToCheck = sites.filter((site) => {
      try {
        const siteUrl = new URL(site.url);
        const siteHost = siteUrl.hostname;
        if (excludedHosts.some((h) => siteHost === h || siteHost.includes(h))) {
          return false;
        }
      } catch {
        console.error(`Invalid URL for site ${site.name}: ${site.url}`);
        return false;
      }

      if (!site.last_check) return true;
      const lastCheck = new Date(site.last_check);
      const minutesSinceLastCheck = (now.getTime() - lastCheck.getTime()) / 60000;
      return minutesSinceLastCheck >= site.check_interval;
    });

    const results = await Promise.all(
      sitesToCheck.map(async (site) => {
        try {
          const result = await checkSite(site.url, site.alert_threshold);

          await updateSiteStatus(site.documentId, result, {
            total_checks: site.total_checks || 0,
            successful_checks: site.successful_checks || 0,
          });

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

export async function POST(request: NextRequest) {
  try {
    const { siteId } = await request.json();

    if (!siteId) {
      return NextResponse.json({ error: 'Site ID required' }, { status: 400 });
    }

    const response = await fetch(`${STRAPI_URL}/api/monitored-sites/${siteId}?populate=users`, {
      headers: {
        ...(STRAPI_API_TOKEN && { Authorization: `Bearer ${STRAPI_API_TOKEN}` }),
      },
    });

    if (!response.ok) {
      throw new Error('Site not found');
    }

    const { data: site } = (await response.json()) as { data: MonitoredSite };

    const result = await checkSite(site.url, site.alert_threshold);

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
