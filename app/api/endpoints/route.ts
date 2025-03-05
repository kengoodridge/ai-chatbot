import { auth } from '@/app/(auth)/auth';
import { 
  createEndpoint, 
  getEndpointsByUserId,
  getProjectById
} from '@/lib/db/queries';
import { NextRequest, NextResponse } from 'next/server';
import { corsMiddleware, withCorsHeaders } from '../cors';
import { dynamicRouteManager } from '@/lib/dynamic-route-manager';

export const dynamic = 'force-dynamic'; // Ensures the route is not statically optimized

/**
 * @swagger
 * /api/endpoints:
 *   post:
 *     tags:
 *       - Endpoints
 *     summary: Create a new endpoint
 *     description: Create a new endpoint with the given path, code, parameters, and HTTP method. Endpoints are owned by the authenticated user.
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
 *               - code
 *               - projectId
 *             properties:
 *               path:
 *                 type: string
 *                 description: URL path for the endpoint (must be unique)
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
 *                 default: GET
 *                 description: HTTP method for this endpoint
 *               projectId:
 *                 type: string
 *                 description: ID of the project this endpoint belongs to
 *     responses:
 *       201:
 *         description: Endpoint created successfully
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
 *                 userId:
 *                   type: string
 *                   description: ID of the user who owns the endpoint
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Bad request - missing required fields
 *       401:
 *         description: Unauthorized - user not authenticated
 *       404:
 *         description: Project not found
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
    const { path, code, parameters = [], httpMethod = 'GET', projectId } = await request.json();

    if (!path || !code || !projectId) {
      return withCorsHeaders(NextResponse.json(
        { error: 'Path, code, and project ID are required' },
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
        { error: 'You do not have permission to add endpoints to this project' },
        { status: 403 }
      ));
    }

    // Sanitize the path to ensure it starts with a slash
    const projectName = project.name.toLowerCase().replace(/\s+/g, '-');
    let sanitizedPath = path.startsWith('/') ? path : `/${path}`;
    
    // Create full path with project name and /api prefix
    const fullPath = `/${projectName}/api${sanitizedPath}`;

    const newEndpoint = await createEndpoint({
      path: fullPath,
      parameters,
      code,
      httpMethod: httpMethod.toUpperCase(),
      projectId,
      userId: session.user.id,
    });

    // Register the endpoint in the dynamic route manager
    await dynamicRouteManager.registerEndpoint(
      fullPath,
      parameters,
      code,
      httpMethod.toUpperCase()
    );

    return withCorsHeaders(NextResponse.json(newEndpoint, { status: 201 }));
  } catch (error) {
    console.error('Error creating endpoint:', error);
    return withCorsHeaders(NextResponse.json(
      { error: 'An error occurred while creating the endpoint' },
      { status: 500 }
    ));
  }
}

/**
 * @swagger
 * /api/endpoints:
 *   get:
 *     tags:
 *       - Endpoints
 *     summary: Get all endpoints for the authenticated user
 *     description: Returns a list of all endpoints owned by the authenticated user
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of endpoints
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
 *                   code:
 *                     type: string
 *                   parameters:
 *                     type: string
 *                   httpMethod:
 *                     type: string
 *                   projectId:
 *                     type: string
 *                   projectName:
 *                     type: string
 *                   userId:
 *                     type: string
 *                     description: ID of the user who owns the endpoint
 *                   userEmail:
 *                     type: string
 *                     description: Email of the user who owns the endpoint
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
    const endpoints = await getEndpointsByUserId({ userId: session.user.id });
    return withCorsHeaders(NextResponse.json(endpoints));
  } catch (error) {
    console.error('Error fetching endpoints:', error);
    return withCorsHeaders(NextResponse.json(
      { error: 'An error occurred while fetching endpoints' },
      { status: 500 }
    ));
  }
}

// CORS preflight requests are handled by the corsMiddleware function