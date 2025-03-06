import { auth } from '@/app/(auth)/auth';
import { createEndpoint, getProjectById } from '@/lib/db/queries';
import { NextRequest, NextResponse } from 'next/server';
import { corsMiddleware, withCorsHeaders } from '../../cors';
import { dynamicRouteManager } from '@/lib/dynamic-route-manager';

export const dynamic = 'force-dynamic'; // Make sure the route is not statically optimized

/**
 * @swagger
 * /api/endpoints/generate:
 *   post:
 *     tags:
 *       - Endpoints
 *     summary: Generate a new endpoint with AI
 *     description: Generate a new endpoint with AI based on a description and add it to a project (mock implementation)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - description
 *               - projectId
 *             properties:
 *               description:
 *                 type: string
 *                 description: Description of the endpoint to generate
 *               projectId:
 *                 type: string
 *                 description: ID of the project this endpoint belongs to
 *     parameters:
 *       - in: header
 *         name: x-preferred-language
 *         schema:
 *           type: string
 *           enum: [javascript, python]
 *           default: javascript
 *         description: Optional header to specify the preferred language for the endpoint
 *     responses:
 *       201:
 *         description: Endpoint generated and created successfully
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
 *       403:
 *         description: Forbidden - user does not own this project
 *       404:
 *         description: Project not found
 *       500:
 *         description: Failed to generate endpoint or server error
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
    const { description, projectId } = await request.json();

    if (!description || !projectId) {
      return withCorsHeaders(NextResponse.json(
        { error: 'Description and project ID are required' },
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

    // MOCK IMPLEMENTATION ONLY
    // Instead of using AI to generate the endpoint, we'll use a template based on the description
    const projectName = project.name.toLowerCase().replace(/\s+/g, '-');
    const endpointSlug = description.toLowerCase().replace(/\s+/g, '-');
    const endpointPath = `/api/${projectName}/${endpointSlug}`;
    
    // Create mock parameters
    const parameters = ['query'];
    
    // Get the optional language parameter or default to JavaScript
    const language = request.headers.get('x-preferred-language') === 'python' ? 'python' : 'javascript';
    
    // Create mock code based on the description and language
    let mockCode;
    
    if (language === 'javascript') {
      mockCode = `
/**
 * Sample endpoint function for: ${description}
 * This is a mock implementation.
 * 
 * @param {Object} params - The parameters passed to the endpoint
 * @param {string} params.query - The query parameter
 * @returns {Object} The response object
 */
function endpoint_function(params) {
  const query = params.query || '';
  
  return {
    success: true,
    language: "javascript",
    description: "${description}",
    query: query,
    timestamp: new Date().toISOString(),
    result: "This is a mock result for: " + query
  };
}
`;
    } else {
      mockCode = `
# Sample endpoint function for: ${description}
# This is a mock implementation.
#
# Parameters:
#   params (dict): The parameters passed to the endpoint
#   params['query'] (str): The query parameter
# Returns:
#   dict: The response object

import json
from datetime import datetime

def endpoint_function(params):
    query = params.get('query', '')
    
    return {
        "success": True,
        "language": "python",
        "description": "${description}",
        "query": query,
        "timestamp": datetime.now().isoformat(),
        "result": f"This is a Python mock result for: {query}"
    }
`;
    }

    const httpMethod = 'GET';

    // Create the endpoint in the database
    const newEndpoint = await createEndpoint({
      path: endpointPath,
      parameters,
      code: mockCode,
      httpMethod,
      language,
      projectId,
      userId: session.user.id,
    });

    // Register the endpoint in the dynamic route manager
    await dynamicRouteManager.registerEndpoint(
      endpointPath,
      parameters,
      mockCode,
      httpMethod,
      language
    );

    return withCorsHeaders(NextResponse.json(newEndpoint, { status: 201 }));
  } catch (error) {
    console.error('Error generating endpoint:', error);
    return withCorsHeaders(NextResponse.json(
      { error: 'An error occurred while generating the endpoint' },
      { status: 500 }
    ));
  }
}

// CORS preflight requests are handled by the corsMiddleware function