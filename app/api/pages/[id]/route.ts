import { auth } from '@/app/(auth)/auth';
import { 
  deletePage, 
  getPageById, 
  updatePage 
} from '@/lib/db/queries';
import { NextRequest, NextResponse } from 'next/server';
import { corsMiddleware, withCorsHeaders } from '../../cors';

export const dynamic = 'force-dynamic'; // Make sure the route is not statically optimized

/**
 * @swagger
 * /api/pages/{id}:
 *   get:
 *     tags:
 *       - Pages
 *     summary: Get a specific page by ID
 *     description: Returns a page with the specified ID. User can only access their own pages.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Page ID
 *     responses:
 *       200:
 *         description: Page details
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
 *                 projectName:
 *                   type: string
 *                 userId:
 *                   type: string
 *                   description: ID of the user who owns the page
 *                 userEmail:
 *                   type: string
 *                   description: Email of the user who owns the page
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Unauthorized - user not authenticated
 *       403:
 *         description: Forbidden - user does not own this page
 *       404:
 *         description: Page not found
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
    const page = await getPageById({ id: params.id });

    if (!page) {
      return withCorsHeaders(NextResponse.json({ error: 'Page not found' }, { status: 404 }));
    }

    if (page.userId !== session.user.id) {
      return withCorsHeaders(NextResponse.json(
        { error: 'You do not have permission to access this page' },
        { status: 403 }
      ));
    }

    return withCorsHeaders(NextResponse.json(page));
  } catch (error) {
    console.error('Error fetching page:', error);
    return withCorsHeaders(NextResponse.json(
      { error: 'An error occurred while fetching the page' },
      { status: 500 }
    ));
  }
}

/**
 * @swagger
 * /api/pages/{id}:
 *   put:
 *     tags:
 *       - Pages
 *     summary: Update a page
 *     description: Update a page with the given ID. User can only update their own pages.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Page ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               path:
 *                 type: string
 *                 description: URL path for the page
 *               htmlContent:
 *                 type: string
 *                 description: HTML content of the page
 *     responses:
 *       200:
 *         description: Page updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad request - no data provided
 *       401:
 *         description: Unauthorized - user not authenticated
 *       403:
 *         description: Forbidden - user does not own this page
 *       404:
 *         description: Page not found
 *       500:
 *         description: Failed to update page or server error
 */
export async function PUT(
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
    const page = await getPageById({ id: params.id });

    if (!page) {
      return withCorsHeaders(NextResponse.json({ error: 'Page not found' }, { status: 404 }));
    }

    if (page.userId !== session.user.id) {
      return withCorsHeaders(NextResponse.json(
        { error: 'You do not have permission to modify this page' },
        { status: 403 }
      ));
    }

    const data = await request.json();

    if (!data || (data.path === undefined && data.htmlContent === undefined)) {
      return withCorsHeaders(NextResponse.json(
        { error: 'No data provided' },
        { status: 400 }
      ));
    }

    const success = await updatePage({
      id: params.id,
      path: data.path,
      htmlContent: data.htmlContent,
      userId: session.user.id,
    });

    if (!success) {
      return withCorsHeaders(NextResponse.json(
        { error: 'Failed to update page' },
        { status: 500 }
      ));
    }

    return withCorsHeaders(NextResponse.json({ message: 'Page updated successfully' }));
  } catch (error) {
    console.error('Error updating page:', error);
    return withCorsHeaders(NextResponse.json(
      { error: 'An error occurred while updating the page' },
      { status: 500 }
    ));
  }
}

/**
 * @swagger
 * /api/pages/{id}:
 *   delete:
 *     tags:
 *       - Pages
 *     summary: Delete a page
 *     description: Delete a page with the given ID. User can only delete their own pages.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Page ID
 *     responses:
 *       200:
 *         description: Page deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized - user not authenticated
 *       403:
 *         description: Forbidden - user does not own this page
 *       404:
 *         description: Page not found
 *       500:
 *         description: Failed to delete page or server error
 */
export async function DELETE(
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
    const page = await getPageById({ id: params.id });

    if (!page) {
      return withCorsHeaders(NextResponse.json({ error: 'Page not found' }, { status: 404 }));
    }

    if (page.userId !== session.user.id) {
      return withCorsHeaders(NextResponse.json(
        { error: 'You do not have permission to delete this page' },
        { status: 403 }
      ));
    }

    const success = await deletePage({ 
      id: params.id,
      userId: session.user.id
    });

    if (!success) {
      return withCorsHeaders(NextResponse.json(
        { error: 'Failed to delete page' },
        { status: 500 }
      ));
    }

    return withCorsHeaders(NextResponse.json({ message: 'Page deleted successfully' }));
  } catch (error) {
    console.error('Error deleting page:', error);
    return withCorsHeaders(NextResponse.json(
      { error: 'An error occurred while deleting the page' },
      { status: 500 }
    ));
  }
}

// CORS preflight requests are handled by the corsMiddleware function