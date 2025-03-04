import { auth } from '@/app/(auth)/auth';
import { getPagesByProjectId, getProjectById } from '@/lib/db/queries';
import { NextRequest, NextResponse } from 'next/server';
import { corsMiddleware, withCorsHeaders } from '../../../cors';

export const dynamic = 'force-dynamic'; // Make sure the route is not statically optimized

/**
 * @swagger
 * /api/pages/project/{id}:
 *   get:
 *     tags:
 *       - Pages
 *     summary: Get all pages for a specific project
 *     description: Returns a list of all pages belonging to the specified project. User can only access their own project pages.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *     responses:
 *       200:
 *         description: List of pages for the project
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   path:
 *                     type: string
 *                   htmlContent:
 *                     type: string
 *                   projectId:
 *                     type: string
 *                   projectName:
 *                     type: string
 *                   userId:
 *                     type: string
 *                     description: ID of the user who owns the page
 *                   userEmail:
 *                     type: string
 *                     description: Email of the user who owns the page
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Unauthorized - user not authenticated
 *       403:
 *         description: Forbidden - user does not own this project
 *       404:
 *         description: Project not found
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Handle OPTIONS request and apply CORS
  const corsResponse = corsMiddleware(request);
  if (corsResponse) return corsResponse;
  
  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return withCorsHeaders(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
  }

  try {
    // First verify the project exists and belongs to the user
    const project = await getProjectById({ id: params.id });

    if (!project) {
      return withCorsHeaders(NextResponse.json({ error: 'Project not found' }, { status: 404 }));
    }

    if (project.userId !== session.user.id) {
      return withCorsHeaders(NextResponse.json(
        { error: 'You do not have permission to access this project' },
        { status: 403 }
      ));
    }

    // Then get all pages for this project
    const pages = await getPagesByProjectId({ projectId: params.id });
    return withCorsHeaders(NextResponse.json(pages));
  } catch (error) {
    console.error('Error fetching pages for project:', error);
    return withCorsHeaders(NextResponse.json(
      { error: 'An error occurred while fetching the project pages' },
      { status: 500 }
    ));
  }
}

// CORS preflight requests are handled by the corsMiddleware function