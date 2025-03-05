import { auth } from '@/app/(auth)/auth';
import { createPage, getPagesByUserId, getProjectById } from '@/lib/db/queries';
import { NextRequest, NextResponse } from 'next/server';
import { corsMiddleware, withCorsHeaders } from '../cors';
import { dynamicRouteManager } from '@/lib/dynamic-route-manager';

export const dynamic = 'force-dynamic'; // Ensures the route is not statically optimized

/**
 * @swagger
 * /api/pages:
 *   post:
 *     tags:
 *       - Pages
 *     summary: Create a new page
 *     description: Create a new page with the given path, HTML content, and project ID. Pages are owned by the authenticated user.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - path
 *               - htmlContent
 *               - projectId
 *             properties:
 *               path:
 *                 type: string
 *                 description: URL path for the page (must be unique)
 *               htmlContent:
 *                 type: string
 *                 description: HTML content of the page
 *               projectId:
 *                 type: string
 *                 description: ID of the project this page belongs to
 *     responses:
 *       201:
 *         description: Page created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 path:
 *                   type: string
 *                 htmlContent:
 *                   type: string
 *                 projectId:
 *                   type: string
 *                 userId:
 *                   type: string
 *                   description: ID of the user who owns the page
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Bad request - missing required fields
 *       401:
 *         description: Unauthorized - user not authenticated
 */
export async function POST(request: NextRequest) {
  // Handle OPTIONS request and apply CORS
  const corsResponse = corsMiddleware(request);
  if (corsResponse) return corsResponse;
  
  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return withCorsHeaders(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
  }

  try {
    const { path, htmlContent, projectId } = await request.json();

    if (!path || !htmlContent || !projectId) {
      return withCorsHeaders(NextResponse.json(
        { error: 'Path, HTML content, and project ID are required' },
        { status: 400 }
      ));
    }

    // Verify the project exists and belongs to the user
    const project = await getProjectById({ id: projectId });
    if (!project) {
      return withCorsHeaders(NextResponse.json({ error: 'Project not found' }, { status: 404 }));
    }

    if (project.userId !== session.user.id) {
      return withCorsHeaders(NextResponse.json(
        { error: 'You do not have permission to add pages to this project' },
        { status: 403 }
      ));
    }

    // Sanitize the path to ensure it starts with a slash
    const projectName = project.name.toLowerCase().replace(/\s+/g, '-');
    let sanitizedPath = path.startsWith('/') ? path : `/${path}`;
    
    // Create full path with project name prefix
    const fullPath = `/${projectName}${sanitizedPath}`;

    const newPage = await createPage({
      path: fullPath,
      htmlContent,
      projectId,
      userId: session.user.id,
    });
    
    // Register the page in the dynamic route manager
    await dynamicRouteManager.registerPage(fullPath, htmlContent);

    return withCorsHeaders(NextResponse.json(newPage, { status: 201 }));
  } catch (error) {
    console.error('Error creating page:', error);
    return withCorsHeaders(NextResponse.json(
      { error: 'An error occurred while creating the page' },
      { status: 500 }
    ));
  }
}

/**
 * @swagger
 * /api/pages:
 *   get:
 *     tags:
 *       - Pages
 *     summary: Get all pages for the authenticated user
 *     description: Returns a list of all pages owned by the authenticated user
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of pages
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
 */
export async function GET(request: NextRequest) {
  // Handle OPTIONS request and apply CORS
  const corsResponse = corsMiddleware(request);
  if (corsResponse) return corsResponse;
  
  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return withCorsHeaders(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
  }

  try {
    const pages = await getPagesByUserId({ userId: session.user.id });
    return withCorsHeaders(NextResponse.json(pages));
  } catch (error) {
    console.error('Error fetching pages:', error);
    return withCorsHeaders(NextResponse.json(
      { error: 'An error occurred while fetching pages' },
      { status: 500 }
    ));
  }
}

// CORS preflight requests are handled by the corsMiddleware function