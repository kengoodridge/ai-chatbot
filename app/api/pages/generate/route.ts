import { auth } from '@/app/(auth)/auth';
import { createPage, getProjectById } from '@/lib/db/queries';
import { NextRequest, NextResponse } from 'next/server';
import { corsMiddleware, withCorsHeaders } from '../../cors';

export const dynamic = 'force-dynamic'; // Make sure the route is not statically optimized

/**
 * @swagger
 * /api/pages/generate:
 *   post:
 *     tags:
 *       - Pages
 *     summary: Generate a new page with AI
 *     description: Generate a new page with AI based on a description and add it to a project
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
 *                 description: Description of the page to generate
 *               projectId:
 *                 type: string
 *                 description: ID of the project this page belongs to
 *     responses:
 *       201:
 *         description: Page generated and created successfully
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
 *         description: Failed to generate page or server error
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
        { error: 'You do not have permission to add pages to this project' },
        { status: 403 }
      ));
    }

    // MOCK IMPLEMENTATION ONLY
    // Instead of using AI to generate content, we'll use a template with the description
    const projectName = project.name.toLowerCase().replace(/\s+/g, '-');
    const pagePath = `/${projectName}/${description.toLowerCase().replace(/\s+/g, '-')}`;
    
    const mockHtmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${description}</title>
    <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
        }
        h1 {
            color: #2c3e50;
        }
        .card {
            border: 1px solid #e1e1e1;
            border-radius: 5px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
    </style>
</head>
<body>
    <div id="root"></div>

    <script type="text/babel">
        function App() {
            const [data, setData] = React.useState({ title: "${description}", content: "This is a mock generated page. Replace with AI-generated content in the future." });
            
            return (
                <div>
                    <h1>{data.title}</h1>
                    <div className="card">
                        <p>{data.content}</p>
                    </div>
                    <p>This page was generated for project: ${project.name}</p>
                </div>
            );
        }

        ReactDOM.render(<App />, document.getElementById('root'));
    </script>
</body>
</html>
`;

    // Create the page in the database
    const newPage = await createPage({
      path: pagePath,
      htmlContent: mockHtmlContent,
      projectId,
      userId: session.user.id,
    });

    return withCorsHeaders(NextResponse.json(newPage, { status: 201 }));
  } catch (error) {
    console.error('Error generating page:', error);
    return withCorsHeaders(NextResponse.json(
      { error: 'An error occurred while generating the page' },
      { status: 500 }
    ));
  }
}

// CORS preflight requests are handled by the corsMiddleware function