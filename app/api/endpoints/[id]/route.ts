import { auth } from '@/app/(auth)/auth';
import { 
  deleteEndpoint, 
  getEndpointById, 
  updateEndpoint 
} from '@/lib/db/queries';
import { NextRequest, NextResponse } from 'next/server';
import { corsMiddleware, withCorsHeaders } from '../../cors';
import { endpointManager } from '@/lib/endpoint-manager';

export const dynamic = 'force-dynamic'; // Make sure the route is not statically optimized

/**
 * @swagger
 * /api/endpoints/{id}:
 *   get:
 *     tags:
 *       - Endpoints
 *     summary: Get a specific endpoint by ID
 *     description: Returns an endpoint with the specified ID. User can only access their own endpoints.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Endpoint ID
 *     responses:
 *       200:
 *         description: Endpoint details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 path:
 *                   type: string
 *                 code:
 *                   type: string
 *                 parameters:
 *                   type: string
 *                 httpMethod:
 *                   type: string
 *                 projectId:
 *                   type: string
 *                 projectName:
 *                   type: string
 *                 userId:
 *                   type: string
 *                   description: ID of the user who owns the endpoint
 *                 userEmail:
 *                   type: string
 *                   description: Email of the user who owns the endpoint
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Unauthorized - user not authenticated
 *       403:
 *         description: Forbidden - user does not own this endpoint
 *       404:
 *         description: Endpoint not found
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
    const endpoint = await getEndpointById({ id: params.id });

    if (!endpoint) {
      return withCorsHeaders(NextResponse.json({ error: 'Endpoint not found' }, { status: 404 }));
    }

    if (endpoint.userId !== session.user.id) {
      return withCorsHeaders(NextResponse.json(
        { error: 'You do not have permission to access this endpoint' },
        { status: 403 }
      ));
    }

    return withCorsHeaders(NextResponse.json(endpoint));
  } catch (error) {
    console.error('Error fetching endpoint:', error);
    return withCorsHeaders(NextResponse.json(
      { error: 'An error occurred while fetching the endpoint' },
      { status: 500 }
    ));
  }
}

/**
 * @swagger
 * /api/endpoints/{id}:
 *   put:
 *     tags:
 *       - Endpoints
 *     summary: Update an endpoint
 *     description: Update an endpoint with the given ID. User can only update their own endpoints.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Endpoint ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               path:
 *                 type: string
 *                 description: URL path for the endpoint
 *               code:
 *                 type: string
 *                 description: JavaScript code implementing the endpoint_function
 *               parameters:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Parameter names this endpoint expects
 *               httpMethod:
 *                 type: string
 *                 enum: [GET, POST]
 *                 description: HTTP method for this endpoint
 *     responses:
 *       200:
 *         description: Endpoint updated successfully
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
 *         description: Forbidden - user does not own this endpoint
 *       404:
 *         description: Endpoint not found
 *       500:
 *         description: Failed to update endpoint or server error
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
    const endpoint = await getEndpointById({ id: params.id });

    if (!endpoint) {
      return withCorsHeaders(NextResponse.json({ error: 'Endpoint not found' }, { status: 404 }));
    }

    if (endpoint.userId !== session.user.id) {
      return withCorsHeaders(NextResponse.json(
        { error: 'You do not have permission to modify this endpoint' },
        { status: 403 }
      ));
    }

    const data = await request.json();

    if (!data || (data.path === undefined && data.code === undefined && 
                  data.parameters === undefined && data.httpMethod === undefined)) {
      return withCorsHeaders(NextResponse.json(
        { error: 'No data provided' },
        { status: 400 }
      ));
    }

    const success = await updateEndpoint({
      id: params.id,
      path: data.path,
      parameters: data.parameters,
      code: data.code,
      httpMethod: data.httpMethod,
      userId: session.user.id,
    });

    if (!success) {
      return withCorsHeaders(NextResponse.json(
        { error: 'Failed to update endpoint' },
        { status: 500 }
      ));
    }

    // Refresh the endpoint in the manager if it exists
    if (endpoint.path) {
      await endpointManager.refreshEndpoint(endpoint.path);
    }

    return withCorsHeaders(NextResponse.json({ message: 'Endpoint updated successfully' }));
  } catch (error) {
    console.error('Error updating endpoint:', error);
    return withCorsHeaders(NextResponse.json(
      { error: 'An error occurred while updating the endpoint' },
      { status: 500 }
    ));
  }
}

/**
 * @swagger
 * /api/endpoints/{id}:
 *   delete:
 *     tags:
 *       - Endpoints
 *     summary: Delete an endpoint
 *     description: Delete an endpoint with the given ID. User can only delete their own endpoints.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Endpoint ID
 *     responses:
 *       200:
 *         description: Endpoint deleted successfully
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
 *         description: Forbidden - user does not own this endpoint
 *       404:
 *         description: Endpoint not found
 *       500:
 *         description: Failed to delete endpoint or server error
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
    const endpoint = await getEndpointById({ id: params.id });

    if (!endpoint) {
      return withCorsHeaders(NextResponse.json({ error: 'Endpoint not found' }, { status: 404 }));
    }

    if (endpoint.userId !== session.user.id) {
      return withCorsHeaders(NextResponse.json(
        { error: 'You do not have permission to delete this endpoint' },
        { status: 403 }
      ));
    }

    const success = await deleteEndpoint({ 
      id: params.id,
      userId: session.user.id
    });

    if (!success) {
      return withCorsHeaders(NextResponse.json(
        { error: 'Failed to delete endpoint' },
        { status: 500 }
      ));
    }

    // Remove the endpoint from the manager if it exists
    if (endpoint.path) {
      await endpointManager.refreshEndpoint(endpoint.path);
    }

    return withCorsHeaders(NextResponse.json({ message: 'Endpoint deleted successfully' }));
  } catch (error) {
    console.error('Error deleting endpoint:', error);
    return withCorsHeaders(NextResponse.json(
      { error: 'An error occurred while deleting the endpoint' },
      { status: 500 }
    ));
  }
}

// CORS preflight requests are handled by the corsMiddleware function