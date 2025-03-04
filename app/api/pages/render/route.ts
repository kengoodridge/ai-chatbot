import { NextRequest, NextResponse } from 'next/server';
import { getPageByPath } from '@/lib/db/queries';
import { corsMiddleware, withCorsHeaders } from '../../cors';

export const dynamic = 'force-dynamic'; // Make sure the route is not statically optimized

/**
 * @swagger
 * /api/pages/render:
 *   get:
 *     tags:
 *       - Pages
 *     summary: Render a dynamic page by its path
 *     description: Returns the HTML content of a page matching the requested path
 *     parameters:
 *       - in: query
 *         name: path
 *         required: true
 *         schema:
 *           type: string
 *         description: The path of the page to render
 *     responses:
 *       200:
 *         description: HTML content of the page
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *       404:
 *         description: Page not found
 *       500:
 *         description: Server error
 */
export async function GET(request: NextRequest) {
  // Handle OPTIONS request and apply CORS
  const corsResponse = corsMiddleware(request);
  if (corsResponse) return corsResponse;
  
  try {
    // Get the path from the request query parameters
    const url = new URL(request.url);
    let path = url.searchParams.get('path');
    
    if (!path) {
      return withCorsHeaders(NextResponse.json(
        { error: 'Path parameter is required' },
        { status: 400 }
      ));
    }

    // Ensure path starts with a slash
    if (!path.startsWith('/')) {
      path = `/${path}`;
    }

    // Fetch the page content by path
    const page = await getPageByPath({ path });
    
    if (!page) {
      return withCorsHeaders(NextResponse.json(
        { error: 'Page not found' },
        { status: 404 }
      ));
    }

    // Return the HTML content with the appropriate content type
    return new NextResponse(page.htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        ...corsMiddleware.headers
      }
    });
  } catch (error) {
    console.error('Error rendering page:', error);
    return withCorsHeaders(NextResponse.json(
      { error: 'An error occurred while rendering the page' },
      { status: 500 }
    ));
  }
}

// CORS preflight requests are handled by the corsMiddleware function