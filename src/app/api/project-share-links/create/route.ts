import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route pour créer un lien de partage public.
 * Contrôle la vérification d'ownership côté Next.js (project-collaborators)
 * puis proxi vers Strapi pour contourner d'éventuels bugs de policy Strapi.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    const token = authHeader.slice(7);

    const body = await request.json();
    const { projectDocumentId, show_gantt, show_progress, show_tasks, expires_in_days } = body;

    if (!projectDocumentId) {
      return NextResponse.json({ error: 'projectDocumentId requis' }, { status: 400 });
    }

    const apiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || process.env.STRAPI_URL;
    if (!apiUrl) {
      return NextResponse.json({ error: 'Configuration API manquante' }, { status: 500 });
    }

    // 1. Récupérer l'utilisateur connecté
    const meRes = await fetch(`${apiUrl}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!meRes.ok) {
      return NextResponse.json({ error: 'Session invalide' }, { status: 401 });
    }
    const me = await meRes.json();
    const userId = me.id;
    const userDocumentId = me.documentId;

    // 2. Vérifier que l'utilisateur est bien le propriétaire du projet
    const collabRes = await fetch(
      `${apiUrl}/api/project-collaborators?filters[project][documentId][$eq]=${projectDocumentId}&filters[user][id][$eq]=${userId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const collabData = await collabRes.json();
    const collaborators = collabData.data || [];

    let isOwner = false;
    if (collaborators.length > 0) {
      isOwner = collaborators[0].is_owner === true;
    } else {
      // Fallback : vérifier project.user (créateur original)
      const projectRes = await fetch(
        `${apiUrl}/api/projects?filters[documentId][$eq]=${projectDocumentId}&populate=user`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const projectData = await projectRes.json();
      const project = projectData.data?.[0];
      isOwner = project?.user?.id === userId || project?.user?.documentId === userDocumentId;
    }

    if (!isOwner) {
      return NextResponse.json(
        { error: 'This project does not belong to you' },
        { status: 403 }
      );
    }

    // 3. Créer le lien de partage via Strapi
    const shareToken = generateShareToken();
    const expiresAt = expires_in_days
      ? new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const payload = {
      data: {
        share_token: shareToken,
        is_active: true,
        show_gantt: show_gantt ?? true,
        show_progress: show_progress ?? true,
        show_tasks: show_tasks ?? true,
        expires_at: expiresAt,
        views_count: 0,
        project: projectDocumentId,
        // created_by_user est écrasé par le controller Strapi avec user.id
        created_by_user: userId,
      },
    };

    const createRes = await fetch(`${apiUrl}/api/project-share-links`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!createRes.ok) {
      const errData = await createRes.json().catch(() => ({}));
      console.error('Strapi create share link error:', createRes.status, errData);
      return NextResponse.json(
        { error: errData?.error?.message || 'Erreur lors de la création du lien' },
        { status: createRes.status }
      );
    }

    const result = await createRes.json();
    return NextResponse.json(result.data || result);
  } catch (error) {
    console.error('Create project share link error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    );
  }
}

function generateShareToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 24; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}
