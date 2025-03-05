import { auth } from '@/app/(auth)/auth';
import { NextRequest, NextResponse } from 'next/server';
import { corsMiddleware, withCorsHeaders } from '../../cors';
import { dynamicRouteManager } from '@/lib/dynamic-route-manager';

export const dynamic = 'force-dynamic'; // Make sure the route is not statically optimized

/**
 * @swagger
 * /api/debug/routes:
 *   get:
 *     tags:
 *       - Debug
 *     summary: List all registered dynamic routes
 *     description: Returns a list of all registered dynamic routes (endpoints and pages)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of routes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 routes:
 *                   type: array
 *                   items:
 *                     type: string
 *                 count:
 *                   type: number
 *       401:
 *         description: Unauthorized - user not authenticated
 */
export async function GET(request: NextRequest) {
  // Handle OPTIONS request and apply CORS
  const corsResponse = corsMiddleware(request);
  if (corsResponse) return corsResponse;
  
  const session = await auth();

  if (!session || !session.user || !session.user.email) {
    return withCorsHeaders(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
  }

  // For security, only allow certain users to view this debug information
  // In a production environment, you would want to restrict this further
  // or remove this endpoint entirely
  if (!session.user.email.endsWith('@yourdomain.com') && session.user.email !== 'admin@example.com') {
    return withCorsHeaders(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
  }

  try {
    // Make sure the dynamic route manager is initialized
    await dynamicRouteManager.ensureInitialized();
    
    // Get all registered routes
    const routes = dynamicRouteManager.getRegisteredRoutes();
    
    return withCorsHeaders(NextResponse.json({
      routes,
      count: routes.length
    }));
  } catch (error) {
    console.error('Error fetching routes:', error);
    return withCorsHeaders(NextResponse.json(
      { error: 'An error occurred while fetching routes' },
      { status: 500 }
    ));
  }
}