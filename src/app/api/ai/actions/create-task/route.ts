import { NextResponse } from 'next/server';

// ============================================================================
// TYPES
// ============================================================================

interface TaskInput {
  title: string;
  projectId?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  description?: string;
}

// ============================================================================
// ROUTE HANDLER
// ============================================================================

export async function POST(req: Request) {
  try {
    // Get auth token from Authorization header
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const taskInput: TaskInput = await req.json();

    if (!taskInput.title) {
      return NextResponse.json(
        { error: 'Le titre de la tâche est requis' },
        { status: 400 }
      );
    }

    const apiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

    // If no projectId provided, we need to get user's first project or create a standalone task
    let projectDocumentId = taskInput.projectId;

    if (!projectDocumentId) {
      // Get user info first
      const userRes = await fetch(`${apiUrl}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!userRes.ok) {
        return NextResponse.json(
          { error: 'Impossible de récupérer l\'utilisateur' },
          { status: 401 }
        );
      }
      
      const user = await userRes.json();

      // Get user's first project
      const projectsRes = await fetch(
        `${apiUrl}/api/projects?filters[user][id][$eq]=${user.id}&pagination[limit]=1`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const projectsData = await projectsRes.json();
      
      if (projectsData.data && projectsData.data.length > 0) {
        projectDocumentId = projectsData.data[0].documentId;
      }
    }

    if (!projectDocumentId) {
      return NextResponse.json(
        { error: 'Aucun projet trouvé. Veuillez d\'abord créer un projet.' },
        { status: 400 }
      );
    }

    // Create the task in Strapi
    const taskData = {
      data: {
        title: taskInput.title,
        description: taskInput.description || '',
        task_status: 'todo',
        priority: taskInput.priority || 'medium',
        progress: 0,
        due_date: taskInput.dueDate || null,
        project: projectDocumentId,
      },
    };

    const createRes = await fetch(`${apiUrl}/api/project-tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(taskData),
    });

    if (!createRes.ok) {
      const errorData = await createRes.json();
      console.error('Failed to create task:', errorData);
      return NextResponse.json(
        { error: 'Erreur lors de la création de la tâche' },
        { status: 500 }
      );
    }

    const createdTask = await createRes.json();

    return NextResponse.json({
      success: true,
      id: createdTask.data?.documentId,
      title: taskInput.title,
      message: `Tâche "${taskInput.title}" créée avec succès`,
    });
  } catch (error) {
    console.error('Create task error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue lors de la création de la tâche' },
      { status: 500 }
    );
  }
}

