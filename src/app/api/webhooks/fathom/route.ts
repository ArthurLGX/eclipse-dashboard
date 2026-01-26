import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';
const FATHOM_WEBHOOK_SECRET = process.env.FATHOM_WEBHOOK_SECRET;

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
  start_time: string; // ISO date
  end_time: string; // ISO date
  duration_seconds: number;
  summary?: string;
  transcript?: string;
  action_items?: FathomActionItem[];
  attendees?: FathomAttendee[];
  recording_url?: string;
  meeting_url?: string; // URL Google Meet/Zoom
}

/**
 * Vérifie la signature du webhook Fathom
 * @see https://developers.fathom.ai/webhooks
 */
function verifyWebhookSignature(
  secret: string,
  signature: string | null,
  rawBody: string
): boolean {
  if (!signature) return false;

  try {
    // Format: "v1,signature1 signature2..."
    const [, signatureBlock] = signature.split(',');
    if (!signatureBlock) return false;

    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody, 'utf8')
      .digest('base64');

    const signatures = signatureBlock.split(' ');
    return signatures.includes(expected);
  } catch (_error) {
    console.error('Error verifying webhook signature:', _error);
    return false;
  }
}

interface MatchedCalendarEvent {
  id: number;
  documentId: string;
  users: { id: number }[];
  project?: { id: number };
  client?: { id: number };
}

/**
 * Trouve l'événement calendrier correspondant à la réunion
 */
async function findMatchingCalendarEvent(
  meetingDate: string,
  meetingTitle: string,
  meetingUrl?: string
): Promise<MatchedCalendarEvent | null> {
  try {
    // Chercher par date (même jour) et type meeting
    const date = new Date(meetingDate);
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const query = new URLSearchParams({
      'filters[event_type][$eq]': 'meeting',
      'filters[start_date][$gte]': startOfDay.toISOString(),
      'filters[start_date][$lte]': endOfDay.toISOString(),
      'populate[0]': 'users',
      'populate[1]': 'project',
      'populate[2]': 'client',
    });

    const response = await fetch(`${STRAPI_URL}/api/calendar-events?${query}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch calendar events:', response.status);
      return null;
    }

    const data = await response.json();
    const events = data.data || [];

    if (events.length === 0) {
      return null;
    }

    // Essayer de matcher par titre ou URL
    for (const event of events) {
      const eventTitle = event.title?.toLowerCase() || '';
      const searchTitle = meetingTitle.toLowerCase();
      const eventLocation = event.location?.toLowerCase() || '';

      // Match par URL de meeting dans location
      if (meetingUrl && eventLocation.includes(meetingUrl.toLowerCase())) {
        return event;
      }

      // Match par titre similaire
      if (
        eventTitle.includes(searchTitle) ||
        searchTitle.includes(eventTitle) ||
        eventTitle === searchTitle
      ) {
        return event;
      }
    }

    // Si pas de match exact, prendre le premier événement meeting du jour
    return events[0];
  } catch {
    return null;
  }
}

/**
 * Crée ou met à jour la note de réunion dans Strapi
 */
async function createOrUpdateMeetingNote(
  userId: number,
  calendarEventId: number | null,
  payload: FathomWebhookPayload,
  projectId?: number,
  clientId?: number
): Promise<boolean> {
  try {
    // Vérifier si une note existe déjà pour cet événement
    let existingNote = null;
    if (calendarEventId) {
      const checkResponse = await fetch(
        `${STRAPI_URL}/api/meeting-notes?filters[calendar_event][id][$eq]=${calendarEventId}`,
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const checkData = await checkResponse.json();
      existingNote = checkData.data?.[0];
    }

    // Formater les action items
    const actionItems = payload.action_items?.map((item, index) => ({
      id: `fathom-${payload.call_id}-${index}`,
      text: item.text,
      assignee: item.assignee,
      completed: false,
    }));

    // Formater les participants
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
        source: 'phantom_ai', // Fathom = Phantom AI
        status: 'completed',
        meeting_date: payload.start_time,
        users: userId,
        ...(calendarEventId && { calendar_event: calendarEventId }),
        ...(projectId && { project: projectId }),
        ...(clientId && { client: clientId }),
      },
    };

    let response;
    if (existingNote) {
      // Mettre à jour la note existante
      response = await fetch(
        `${STRAPI_URL}/api/meeting-notes/${existingNote.documentId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(noteData),
        }
      );
    } else {
      // Créer une nouvelle note
      response = await fetch(`${STRAPI_URL}/api/meeting-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noteData),
      });
    }

    if (!response.ok) {
      await response.text();
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Webhook endpoint pour Fathom AI
 * POST /api/webhooks/fathom
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('webhook-signature');

    // Vérifier la signature si le secret est configuré
    if (FATHOM_WEBHOOK_SECRET) {
      if (!verifyWebhookSignature(FATHOM_WEBHOOK_SECRET, signature, rawBody)) {
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    } else {
      console.warn('FATHOM_WEBHOOK_SECRET not configured - skipping signature verification');
    }

    const payload: FathomWebhookPayload = JSON.parse(rawBody);

    // Trouver l'événement calendrier correspondant
    const calendarEvent = await findMatchingCalendarEvent(
      payload.start_time,
      payload.title,
      payload.meeting_url
    );

    if (!calendarEvent) {
    }

    // Récupérer l'ID utilisateur depuis l'événement ou utiliser un default
    const userId = calendarEvent?.users?.[0]?.id;
    if (!userId) {
        return NextResponse.json(
        { error: 'No user associated with this meeting' },
        { status: 400 }
      );
    }

    // Créer la note de réunion avec le projet et client de l'événement
    const success = await createOrUpdateMeetingNote(
      userId,
      calendarEvent?.id || null,
      payload,
      calendarEvent?.project?.id,
      calendarEvent?.client?.id
    );

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to save meeting note' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Meeting note saved successfully',
      linked_to_event: !!calendarEvent,
    });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET pour tester que l'endpoint est accessible
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Fathom webhook endpoint is ready',
    webhook_secret_configured: !!FATHOM_WEBHOOK_SECRET,
  });
}

