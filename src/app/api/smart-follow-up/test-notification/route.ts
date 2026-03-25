/**
 * Envoie un message WhatsApp de test en utilisant la configuration **enregistrée** (Strapi),
 * pas le brouillon du formulaire — même flux que /api/whatsapp-meta/test.
 */
import { NextRequest, NextResponse } from 'next/server';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });
    }

    const settingsRes = await fetch(`${STRAPI_URL}/api/automation-settings?populate=user`, {
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
    });

    if (!settingsRes.ok) {
      const err = await settingsRes.json().catch(() => ({}));
      return NextResponse.json(
        {
          success: false,
          error: (err as { error?: { message?: string } })?.error?.message || 'Impossible de lire les paramètres',
        },
        { status: settingsRes.status }
      );
    }

    const json = (await settingsRes.json()) as {
      data?: Array<{
        whatsapp_config?: {
          enabled?: boolean;
          provider?: string;
          twilio?: {
            account_sid?: string;
            auth_token?: string;
            from_number?: string;
            to_number?: string;
          };
          meta?: {
            phone_number_id?: string;
            access_token?: string;
            recipient_number?: string;
          };
          phone_number_id?: string;
          access_token?: string;
          recipient_number?: string;
          notification_template?: string;
          use_smart_follow_up_template?: boolean;
        };
      }>;
    };

    const settings = json.data?.[0];
    const wc = settings?.whatsapp_config;

    if (!wc?.enabled) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Notifications WhatsApp désactivées ou non enregistrées. Activez-les et enregistrez dans Paramètres → WhatsApp.',
        },
        { status: 400 }
      );
    }

    const provider = wc.provider === 'twilio' ? 'twilio' : 'meta';

    const body: Record<string, unknown> =
      provider === 'meta'
        ? {
            provider: 'meta',
            phone_number_id: wc.meta?.phone_number_id ?? wc.phone_number_id,
            access_token: wc.meta?.access_token ?? wc.access_token,
            recipient_number: wc.meta?.recipient_number ?? wc.recipient_number,
            notification_template: wc.notification_template,
            use_smart_follow_up_template: wc.use_smart_follow_up_template,
          }
        : {
            provider: 'twilio',
            account_sid: wc.twilio?.account_sid,
            auth_token: wc.twilio?.auth_token,
            from_number: wc.twilio?.from_number,
            to_number: wc.twilio?.to_number,
            notification_template: wc.notification_template,
          };

    if (provider === 'meta') {
      if (!body.phone_number_id || !body.access_token || !body.recipient_number) {
        return NextResponse.json(
          {
            success: false,
            error: 'Configuration Meta incomplète dans les paramètres enregistrés (Phone ID, token, numéro).',
          },
          { status: 400 }
        );
      }
    } else {
      if (!body.account_sid || !body.auth_token || !body.from_number || !body.to_number) {
        return NextResponse.json(
          {
            success: false,
            error: 'Configuration Twilio incomplète dans les paramètres enregistrés.',
          },
          { status: 400 }
        );
      }
    }

    const testRes = await fetch(`${STRAPI_URL}/api/whatsapp-meta/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(body),
    });

    const result = await testRes.json().catch(() => ({}));

    if (!testRes.ok) {
      return NextResponse.json(
        {
          success: false,
          error: (result as { error?: { message?: string } })?.error?.message || 'Erreur envoi test WhatsApp',
        },
        { status: testRes.status }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[smart-follow-up/test-notification]', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
