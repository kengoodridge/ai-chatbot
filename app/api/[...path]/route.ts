import { NextRequest, NextResponse } from 'next/server';
import { dynamicRouteManager } from '@/lib/dynamic-route-manager';
import { corsMiddleware, withCorsHeaders } from '../cors';

export const dynamic = 'force-dynamic'; // Make sure the route is not statically optimized

// This catch-all route handler is used for handling dynamic API endpoints
// All requests that don't match static routes will be handled here

/**
 * @swagger
 * /api/{path}:
 *   get:
 *     tags:
 *       - Dynamic Routes
 *     summary: Dynamic endpoint handler for GET requests
 *     description: Handles all dynamic GET endpoints registered in the system
 *     parameters:
 *       - in: path
 *         name: path
 *         required: true
 *         schema:
 *           type: string
 *         description: The path to the dynamic endpoint
 *       - in: query
 *         name: '*'
 *         schema:
 *           type: object
 *         description: Any query parameters required by the endpoint
 *     responses:
 *       200:
 *         description: Successful response from the dynamic endpoint
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       404:
 *         description: Endpoint not found
 *       500:
 *         description: Server error or error in endpoint execution
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  const corsResponse = corsMiddleware(request);
  if (corsResponse) return corsResponse;
  
  const path = '/' + resolvedParams.path.join('/');
  const response = await dynamicRouteManager.handleRequest(request, path);
  
  // Add CORS headers to the response
  return withCorsHeaders(response);
}

/**
 * @swagger
 * /api/{path}:
 *   post:
 *     tags:
 *       - Dynamic Routes
 *     summary: Dynamic endpoint handler for POST requests
 *     description: Handles all dynamic POST endpoints registered in the system
 *     parameters:
 *       - in: path
 *         name: path
 *         required: true
 *         schema:
 *           type: string
 *         description: The path to the dynamic endpoint
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Successful response from the dynamic endpoint
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       404:
 *         description: Endpoint not found
 *       500:
 *         description: Server error or error in endpoint execution
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  const corsResponse = corsMiddleware(request);
  if (corsResponse) return corsResponse;
  
  const path = '/' + resolvedParams.path.join('/');
  const response = await dynamicRouteManager.handleRequest(request, path);
  
  // Add CORS headers to the response
  return withCorsHeaders(response);
}

/**
 * @swagger
 * /api/{path}:
 *   options:
 *     tags:
 *       - Dynamic Routes
 *     summary: CORS preflight handler for dynamic endpoints
 *     description: Handles CORS preflight requests for all dynamic endpoints
 *     parameters:
 *       - in: path
 *         name: path
 *         required: true
 *         schema:
 *           type: string
 *         description: The path to the dynamic endpoint
 *     responses:
 *       204:
 *         description: CORS preflight response
 */
export async function OPTIONS(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return corsMiddleware(request) || NextResponse.json({}, { status: 204 });
}