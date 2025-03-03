import { tool } from 'ai';
import { z } from 'zod';
import { auth } from '@/app/(auth)/auth';
import { 
  createProject as createProjectDB,
  getProjectById as getProjectByIdDB,
  getProjectsByUserId as getProjectsByUserIdDB,
  updateProject as updateProjectDB,
  deleteProject as deleteProjectDB
} from '@/lib/db/queries';

export const listProjects = tool({
  description: 'List all projects for the current user',
  parameters: z.object({}),
  execute: async () => {
    try {
      // Get the current user session
      const session = await auth();
      
      if (!session || !session.user || !session.user.id) {
        return {
          status: 'error',
          message: 'Unauthorized: User not authenticated'
        };
      }
      
      // Get projects directly from the database
      const projects = await getProjectsByUserIdDB({ id: session.user.id });
      
      return {
        status: 'success',
        data: projects,
        message: `Found ${projects.length} project(s)`
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to list projects'
      };
    }
  }
});

export const getProject = tool({
  description: 'Get details of a specific project by ID',
  parameters: z.object({
    id: z.string().describe('The ID of the project to retrieve')
  }),
  execute: async ({ id }) => {
    try {
      // Get the current user session
      const session = await auth();
      
      if (!session || !session.user || !session.user.id) {
        return {
          status: 'error',
          message: 'Unauthorized: User not authenticated'
        };
      }
      
      // Get project directly from the database
      const project = await getProjectByIdDB({ id });
      
      if (!project) {
        return {
          status: 'error',
          message: 'Project not found'
        };
      }
      
      // Verify ownership
      if (project.userId !== session.user.id) {
        return {
          status: 'error',
          message: 'Unauthorized: You do not have permission to access this project'
        };
      }
      
      return {
        status: 'success',
        data: project,
        message: `Retrieved project: ${project.name}`
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to get project'
      };
    }
  }
});

export const createProject = tool({
  description: 'Create a new project with name and optional description',
  parameters: z.object({
    name: z.string().describe('The name of the new project'),
    description: z.string().optional().describe('Optional description for the project')
  }),
  execute: async ({ name, description }) => {
    try {
      // Get the current user session
      const session = await auth();
      
      if (!session || !session.user || !session.user.id) {
        return {
          status: 'error',
          message: 'Unauthorized: User not authenticated'
        };
      }
      
      if (!name) {
        return {
          status: 'error',
          message: 'Name is required'
        };
      }
      
      // Create project directly in the database
      const project = await createProjectDB({
        name,
        description,
        userId: session.user.id
      });
      
      return {
        status: 'success',
        data: project,
        message: `Created project: ${project.name}`
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to create project'
      };
    }
  }
});

export const updateProject = tool({
  description: 'Update an existing project\'s name and/or description',
  parameters: z.object({
    id: z.string().describe('The ID of the project to update'),
    name: z.string().optional().describe('New name for the project'),
    description: z.string().optional().describe('New description for the project')
  }),
  execute: async ({ id, name, description }) => {
    try {
      // Get the current user session
      const session = await auth();
      
      if (!session || !session.user || !session.user.id) {
        return {
          status: 'error',
          message: 'Unauthorized: User not authenticated'
        };
      }
      
      // Validate we have at least one field to update
      if (!name && description === undefined) {
        return {
          status: 'error',
          message: 'Must provide either name or description to update'
        };
      }
      
      // Verify the project exists
      const existingProject = await getProjectByIdDB({ id });
      
      if (!existingProject) {
        return {
          status: 'error',
          message: 'Project not found'
        };
      }
      
      // Verify ownership
      if (existingProject.userId !== session.user.id) {
        return {
          status: 'error',
          message: 'Unauthorized: You do not have permission to modify this project'
        };
      }
      
      // Update project directly in the database
      const success = await updateProjectDB({
        id,
        name,
        description,
        userId: session.user.id
      });
      
      if (!success) {
        return {
          status: 'error',
          message: 'Failed to update project'
        };
      }
      
      // Get the updated project
      const updatedProject = await getProjectByIdDB({ id });
      
      return {
        status: 'success',
        data: updatedProject,
        message: 'Project updated successfully'
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to update project'
      };
    }
  }
});

export const deleteProject = tool({
  description: 'Delete a project by ID',
  parameters: z.object({
    id: z.string().describe('The ID of the project to delete')
  }),
  execute: async ({ id }) => {
    try {
      // Get the current user session
      const session = await auth();
      
      if (!session || !session.user || !session.user.id) {
        return {
          status: 'error',
          message: 'Unauthorized: User not authenticated'
        };
      }
      
      // Verify the project exists
      const existingProject = await getProjectByIdDB({ id });
      
      if (!existingProject) {
        return {
          status: 'error',
          message: 'Project not found'
        };
      }
      
      // Verify ownership
      if (existingProject.userId !== session.user.id) {
        return {
          status: 'error',
          message: 'Unauthorized: You do not have permission to delete this project'
        };
      }
      
      // Delete project directly from the database
      const success = await deleteProjectDB({ 
        id, 
        userId: session.user.id 
      });
      
      if (!success) {
        return {
          status: 'error',
          message: 'Failed to delete project'
        };
      }
      
      return {
        status: 'success',
        message: 'Project deleted successfully'
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to delete project'
      };
    }
  }
});