import { auth } from '@/app/(auth)/auth';
import { createPage, getPagesByUserId } from '@/lib/db/queries';
import { NextRequest, NextResponse } from 'next/server';
import { corsMiddleware, withCorsHeaders } from '../cors';

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

    // Sanitize the path to ensure it starts with a slash
    const sanitizedPath = path.startsWith('/') ? path : `/${path}`;

    const newPage = await createPage({
      path: sanitizedPath,
      htmlContent,
      projectId,
      userId: session.user.id,
    });

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