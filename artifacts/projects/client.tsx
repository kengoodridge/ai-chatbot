import { Artifact } from '@/components/create-artifact';
import {
  CopyIcon,
  PlusIcon,
  RefreshIcon,
  TrashIcon,
} from '@/components/icons';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useState, useEffect } from 'react';
import { generateUUID } from '@/lib/utils';

interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  userId: string;
  userEmail?: string;
}

interface Metadata {
  projects: Project[];
  currentProject: Project | null;
  isEditing: boolean;
  isCreating: boolean;
  isLoading: boolean;
  error: string | null;
  requestedAction?: 'list' | 'create' | 'get' | 'update' | 'delete';
  requestedName?: string;
  requestedDescription?: string;
  requestedId?: string;
}

export const projectsArtifact = new Artifact<'projects', Metadata>({
  kind: 'projects',
  description: 'Manage your projects and create new ones',
  initialize: async ({ documentId, setMetadata }) => {
    setMetadata({
      projects: [],
      currentProject: null,
      isEditing: false,
      isCreating: false,
      isLoading: true,
      error: null,
    });

    try {
      const response = await fetch('/api/projects');
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      const projects = await response.json();
      
      setMetadata({
        projects,
        currentProject: null,
        isEditing: false,
        isCreating: false,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setMetadata({
        projects: [],
        currentProject: null,
        isEditing: false,
        isCreating: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch projects',
      });
    }
  },
  onStreamPart: ({ streamPart, setArtifact, setMetadata }) => {
    if (streamPart.type === 'text-delta') {
      setArtifact((draftArtifact) => ({
        ...draftArtifact,
        content: streamPart.content as string,
        isVisible: true,
        status: 'streaming',
      }));
    }
  },
  content: ({ content, metadata, setMetadata, ...props }) => {
    const [nameInput, setNameInput] = useState('');
    const [descriptionInput, setDescriptionInput] = useState('');

    // Process actions from AI tool
    useEffect(() => {
      if (content) {
        try {
          const parsedContent = JSON.parse(content);
          const { action, name, description, id } = parsedContent;
          
          // Set the requested action in metadata
          setMetadata({
            ...metadata,
            requestedAction: action,
            requestedName: name,
            requestedDescription: description,
            requestedId: id
          });
          
          // Handle immediate actions
          switch (action) {
            case 'list':
              // List is handled by default on load
              break;
            case 'create':
              if (name) {
                setMetadata({
                  ...metadata,
                  isCreating: true,
                });
                setNameInput(name);
                setDescriptionInput(description || '');
              }
              break;
            case 'get':
              if (id) {
                // Find and display the specific project
                const project = metadata.projects.find(p => p.id === id);
                if (project) {
                  setMetadata({
                    ...metadata,
                    currentProject: project,
                  });
                }
              }
              break;
            case 'update':
              if (id) {
                // Find the project to update
                const project = metadata.projects.find(p => p.id === id);
                if (project) {
                  setMetadata({
                    ...metadata,
                    currentProject: project,
                    isEditing: true,
                  });
                  setNameInput(name || project.name);
                  setDescriptionInput(description !== undefined ? description : (project.description || ''));
                }
              }
              break;
            case 'delete':
              if (id) {
                // Find the project to delete
                const project = metadata.projects.find(p => p.id === id);
                if (project) {
                  setMetadata({
                    ...metadata,
                    currentProject: project,
                  });
                  // Prompt deletion
                  setTimeout(() => {
                    if (confirm(`Are you sure you want to delete project "${project.name}"?`)) {
                      handleDeleteProject(project.id);
                    }
                  }, 500);
                }
              }
              break;
          }
        } catch (e) {
          // Content wasn't valid JSON or other error
          console.error("Error processing content:", e);
        }
      }
    }, [content]);

    useEffect(() => {
      if (metadata.currentProject && metadata.isEditing) {
        setNameInput(metadata.currentProject.name);
        setDescriptionInput(metadata.currentProject.description || '');
      } else if (metadata.isCreating) {
        setNameInput(metadata.requestedName || '');
        setDescriptionInput(metadata.requestedDescription || '');
      }
    }, [metadata.currentProject, metadata.isEditing, metadata.isCreating, metadata.requestedName, metadata.requestedDescription]);

    const fetchProjects = async () => {
      setMetadata({
        ...metadata,
        isLoading: true,
        error: null,
      });

      try {
        const response = await fetch('/api/projects');
        if (!response.ok) {
          throw new Error('Failed to fetch projects');
        }
        const projects = await response.json();
        
        setMetadata({
          ...metadata,
          projects,
          isLoading: false,
        });
      } catch (error) {
        setMetadata({
          ...metadata,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to fetch projects',
        });
      }
    };

    const handleCreateProject = async () => {
      if (!nameInput.trim()) {
        toast.error('Project name is required');
        return;
      }

      setMetadata({
        ...metadata,
        isLoading: true,
        error: null,
      });

      try {
        const response = await fetch('/api/projects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: nameInput,
            description: descriptionInput,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create project');
        }

        const newProject = await response.json();
        
        setMetadata({
          ...metadata,
          projects: [newProject, ...metadata.projects],
          currentProject: null,
          isCreating: false,
          isLoading: false,
        });

        toast.success('Project created successfully');
      } catch (error) {
        setMetadata({
          ...metadata,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to create project',
        });
        toast.error(error instanceof Error ? error.message : 'Failed to create project');
      }
    };

    const handleUpdateProject = async () => {
      if (!metadata.currentProject || !nameInput.trim()) {
        toast.error('Project name is required');
        return;
      }

      setMetadata({
        ...metadata,
        isLoading: true,
        error: null,
      });

      try {
        const response = await fetch(`/api/projects/${metadata.currentProject.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: nameInput,
            description: descriptionInput,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update project');
        }

        // Update the project in the projects array
        const updatedProjects = metadata.projects.map(project => 
          project.id === metadata.currentProject!.id 
            ? { ...project, name: nameInput, description: descriptionInput }
            : project
        );
        
        setMetadata({
          ...metadata,
          projects: updatedProjects,
          currentProject: null,
          isEditing: false,
          isLoading: false,
        });

        toast.success('Project updated successfully');
      } catch (error) {
        setMetadata({
          ...metadata,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to update project',
        });
        toast.error(error instanceof Error ? error.message : 'Failed to update project');
      }
    };

    const handleDeleteProject = async (projectId: string) => {
      if (!confirm('Are you sure you want to delete this project?')) {
        return;
      }

      setMetadata({
        ...metadata,
        isLoading: true,
        error: null,
      });

      try {
        const response = await fetch(`/api/projects/${projectId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to delete project');
        }

        setMetadata({
          ...metadata,
          projects: metadata.projects.filter(p => p.id !== projectId),
          currentProject: null,
          isLoading: false,
        });

        toast.success('Project deleted successfully');
      } catch (error) {
        setMetadata({
          ...metadata,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to delete project',
        });
        toast.error(error instanceof Error ? error.message : 'Failed to delete project');
      }
    };

    const handleViewProject = async (projectId: string) => {
      setMetadata({
        ...metadata,
        isLoading: true,
        error: null,
      });

      try {
        const response = await fetch(`/api/projects/${projectId}`);
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to fetch project');
        }

        const project = await response.json();
        
        setMetadata({
          ...metadata,
          currentProject: project,
          isLoading: false,
        });
      } catch (error) {
        setMetadata({
          ...metadata,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to fetch project',
        });
        toast.error(error instanceof Error ? error.message : 'Failed to fetch project');
      }
    };

    return (
      <div className="flex flex-col gap-4 p-4">
        {metadata.error && (
          <div className="text-red-500 p-2 rounded bg-red-50 dark:bg-red-900/20">
            {metadata.error}
          </div>
        )}

        {metadata.isLoading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin h-6 w-6 border-2 border-primary rounded-full border-t-transparent"></div>
          </div>
        ) : metadata.isCreating ? (
          <Card>
            <CardHeader>
              <CardTitle>Create New Project</CardTitle>
              <CardDescription>Add details for your new project</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input 
                  id="name" 
                  placeholder="Project name" 
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  placeholder="Project description (optional)" 
                  value={descriptionInput}
                  onChange={(e) => setDescriptionInput(e.target.value)}
                  rows={4}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setMetadata({...metadata, isCreating: false})}>
                Cancel
              </Button>
              <Button onClick={handleCreateProject}>
                Create Project
              </Button>
            </CardFooter>
          </Card>
        ) : metadata.isEditing && metadata.currentProject ? (
          <Card>
            <CardHeader>
              <CardTitle>Edit Project</CardTitle>
              <CardDescription>Update project details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input 
                  id="name" 
                  placeholder="Project name" 
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  placeholder="Project description (optional)" 
                  value={descriptionInput}
                  onChange={(e) => setDescriptionInput(e.target.value)}
                  rows={4}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setMetadata({...metadata, isEditing: false, currentProject: null})}>
                Cancel
              </Button>
              <Button onClick={handleUpdateProject}>
                Update Project
              </Button>
            </CardFooter>
          </Card>
        ) : metadata.currentProject ? (
          <Card>
            <CardHeader>
              <CardTitle>{metadata.currentProject.name}</CardTitle>
              <CardDescription>Created: {new Date(metadata.currentProject.createdAt).toLocaleDateString()}</CardDescription>
            </CardHeader>
            <CardContent>
              <p>{metadata.currentProject.description || 'No description provided'}</p>
              {metadata.currentProject.userEmail && (
                <p className="text-sm text-muted-foreground mt-2">Owner: {metadata.currentProject.userEmail}</p>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setMetadata({...metadata, currentProject: null})}>
                Back to List
              </Button>
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={() => setMetadata({...metadata, isEditing: true})}
                >
                  Edit Project
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => handleDeleteProject(metadata.currentProject!.id)}
                >
                  Delete
                </Button>
              </div>
            </CardFooter>
          </Card>
        ) : (
          <>
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Projects</h2>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={fetchProjects}
                  title="Refresh projects"
                >
                  <RefreshIcon size={18} />
                </Button>
                <Button 
                  onClick={() => setMetadata({...metadata, isCreating: true})}
                >
                  <PlusIcon size={18} className="mr-2" /> New Project
                </Button>
              </div>
            </div>
            
            {metadata.projects.length === 0 ? (
              <div className="text-center p-8 border rounded-lg bg-muted/20">
                <p className="text-muted-foreground">No projects found. Create your first project to get started.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {metadata.projects.map(project => (
                  <Card key={project.id} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                      <CardDescription className="text-xs">
                        Created: {new Date(project.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <p className="text-sm line-clamp-2">
                        {project.description || 'No description provided'}
                      </p>
                    </CardContent>
                    <CardFooter className="flex justify-between pt-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleViewProject(project.id)}
                      >
                        View Details
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteProject(project.id)}
                      >
                        <TrashIcon size={16} />
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    );
  },
  actions: [
    {
      icon: <RefreshIcon size={18} />,
      label: 'Refresh',
      description: 'Refresh projects list',
      onClick: async ({ setMetadata }) => {
        setMetadata((metadata) => ({
          ...metadata,
          isLoading: true,
          error: null,
        }));

        try {
          const response = await fetch('/api/projects');
          if (!response.ok) {
            throw new Error('Failed to fetch projects');
          }
          const projects = await response.json();
          
          setMetadata((metadata) => ({
            ...metadata,
            projects,
            isLoading: false,
          }));
        } catch (error) {
          setMetadata((metadata) => ({
            ...metadata,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to fetch projects',
          }));
        }
      },
    },
    {
      icon: <CopyIcon size={18} />,
      description: 'Copy project details',
      onClick: ({ metadata }) => {
        if (metadata.currentProject) {
          const projectDetails = `Project: ${metadata.currentProject.name}
Description: ${metadata.currentProject.description || 'None'}
Created: ${new Date(metadata.currentProject.createdAt).toLocaleDateString()}
ID: ${metadata.currentProject.id}`;
          
          navigator.clipboard.writeText(projectDetails);
          toast.success('Project details copied to clipboard!');
        } else {
          toast.error('No project selected to copy');
        }
      },
      isDisabled: ({ metadata }) => !metadata.currentProject,
    },
  ],
  toolbar: [
    {
      icon: <PlusIcon />,
      description: 'Create a new project',
      onClick: ({ appendMessage }) => {
        appendMessage({
          role: 'user',
          content: 'Create a new project for me',
        });
      },
    },
  ],
});