import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

// Types pour le payload Fathom
interface FathomAttendee {
  name: string;
  email?: string;
}

interface FathomActionItem {
  text: string;
  assignee?: string;
}

interface FathomWebhookPayload {
  call_id: string;
  title: string;
  start_time: string;
  end_time: string;
  duration_seconds: number;
  summary?: string;
  transcript?: string;
  action_items?: FathomActionItem[];
  attendees?: FathomAttendee[];
  recording_url?: string;
  meeting_url?: string;
}

/**
 * Récupère le secret webhook Fathom d'un utilisateur depuis Strapi
 */
async function getUserWebhookSecret(userId: string): Promise<string | null> {
  try {
    const response = await fetch(
      `${STRAPI_URL}/api/integration-configs?filters[user][id][$eq]=${userId}&filters[provider][$eq]=fathom`,
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    return data.data?.[0]?.webhook_secret || null;
  } catch {
    return null;
  }
}

/**
 * Vérifie la signature du webhook Fathom
 */
function verifyWebhookSignature(
  secret: string,
  signature: string | null,
  rawBody: string
): boolean {
  if (!signature) return false;

  try {
    const [, signatureBlock] = signature.split(',');
    if (!signatureBlock) return false;

    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody, 'utf8')
      .digest('base64');

    const signatures = signatureBlock.split(' ');
    return signatures.includes(expected);
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}

/**
 * Trouve l'événement calendrier correspondant
 */
async function findMatchingCalendarEvent(
  userId: string,
  meetingDate: string,
  meetingTitle: string,
  meetingUrl?: string
) {
  try {
    const date = new Date(meetingDate);
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const query = new URLSearchParams({
      'filters[users][id][$eq]': userId,
      'filters[event_type][$eq]': 'meeting',
      'filters[start_date][$gte]': startOfDay.toISOString(),
      'filters[start_date][$lte]': endOfDay.toISOString(),
      'populate[0]': 'users',
      'populate[1]': 'project',
      'populate[2]': 'client',
    });

    const response = await fetch(`${STRAPI_URL}/api/calendar-events?${query}`, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) return null;

    const data = await response.json();
    const events = data.data || [];

    if (events.length === 0) return null;

    // Match par URL, titre, ou premier du jour
    for (const event of events) {
      const eventLocation = event.location?.toLowerCase() || '';
      const eventTitle = event.title?.toLowerCase() || '';
      const searchTitle = meetingTitle.toLowerCase();

      if (meetingUrl && eventLocation.includes(meetingUrl.toLowerCase())) {
        return event;
      }
      if (eventTitle.includes(searchTitle) || searchTitle.includes(eventTitle)) {
        return event;
      }
    }

    return events[0];
  } catch (error) {
    console.error('Error finding calendar event:', error);
    return null;
  }
}

/**
 * Crée la note de réunion
 */
async function createMeetingNote(
  userId: string,
  calendarEventId: number | null,
  payload: FathomWebhookPayload,
  projectId?: number,
  clientId?: number
): Promise<boolean> {
  try {
    // Vérifier si une note existe déjà
    let existingNote = null;
    if (calendarEventId) {
      const checkResponse = await fetch(
        `${STRAPI_URL}/api/meeting-notes?filters[calendar_event][id][$eq]=${calendarEventId}`,
        { headers: { 'Content-Type': 'application/json' } }
      );
      const checkData = await checkResponse.json();
      existingNote = checkData.data?.[0];
    }

    const actionItems = payload.action_items?.map((item, index) => ({
      id: `fathom-${payload.call_id}-${index}`,
      text: item.text,
      assignee: item.assignee,
      completed: false,
    }));

    const attendees = payload.attendees?.map((attendee) => ({
      name: attendee.name,
      email: attendee.email,
    }));

    const noteData = {
      data: {
        title: payload.title,
        transcription: payload.transcript || null,
        summary: payload.summary || null,
        action_items: actionItems || null,
        attendees: attendees || null,
        duration_minutes: Math.round(payload.duration_seconds / 60),
        recording_url: payload.recording_url || null,
        source: 'phantom_ai',
        status: 'completed',
        meeting_date: payload.start_time,
        users: parseInt(userId),
        ...(calendarEventId && { calendar_event: calendarEventId }),
        ...(projectId && { project: projectId }),
        ...(clientId && { client: clientId }),
      },
    };

    const url = existingNote
      ? `${STRAPI_URL}/api/meeting-notes/${existingNote.documentId}`
      : `${STRAPI_URL}/api/meeting-notes`;

    const response = await fetch(url, {
      method: existingNote ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(noteData),
    });

    return response.ok;
  } catch (error) {
    console.error('Error creating meeting note:', error);
    return false;
  }
}

/**
 * Webhook endpoint pour Fathom AI (par utilisateur)
 * POST /api/webhooks/fathom/[userId]
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  try {
    const rawBody = await request.text();
    const signature = request.headers.get('webhook-signature');

    // Récupérer le secret de l'utilisateur
    const webhookSecret = await getUserWebhookSecret(userId);

    if (webhookSecret) {
      if (!verifyWebhookSignature(webhookSecret, signature, rawBody)) {
        console.error('Invalid webhook signature for user:', userId);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    } else {
      console.warn('No webhook secret configured for user:', userId);
    }

    const payload: FathomWebhookPayload = JSON.parse(rawBody);
    console.log('Received Fathom webhook for user:', userId, {
      call_id: payload.call_id,
      title: payload.title,
    });

    // Trouver l'événement calendrier
    const calendarEvent = await findMatchingCalendarEvent(
      userId,
      payload.start_time,
      payload.title,
      payload.meeting_url
    );

    // Créer la note
    const success = await createMeetingNote(
      userId,
      calendarEvent?.id || null,
      payload,
      calendarEvent?.project?.id,
      calendarEvent?.client?.id
    );

    if (!success) {
      return NextResponse.json({ error: 'Failed to save meeting note' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Meeting note saved',
      linked_to_event: !!calendarEvent,
      linked_to_project: !!calendarEvent?.project,
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET pour tester l'endpoint
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const webhookSecret = await getUserWebhookSecret(userId);

  return NextResponse.json({
    status: 'ok',
    userId,
    webhook_secret_configured: !!webhookSecret,
    message: 'Fathom webhook endpoint ready for this user',
  });
}

