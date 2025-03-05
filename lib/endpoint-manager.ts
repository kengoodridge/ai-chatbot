import * as vm from 'node:vm';
import { 
  getAllEndpoints, 
  getEndpointByPath, 
  getPageByPath 
} from './db/queries';
import { NextRequest, NextResponse } from 'next/server';

interface RouteInfo {
  type: 'endpoint' | 'page';
  path: string;
  function?: Function;
  parameters?: string[];
  httpMethod?: string;
  htmlContent?: string;
}

export class EndpointManager {
  private dynamicRoutes: Record<string, RouteInfo> = {};
  private isInitialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    // Load routes on first access
    this.initializationPromise = this.loadAllRoutes();
  }

  private async loadAllRoutes(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load endpoints from database
      const endpoints = await getAllEndpoints();
      
      for (const endpoint of endpoints) {
        const paramList = endpoint.parameters ? endpoint.parameters.split(',') : [];
        await this.registerEndpoint(
          endpoint.path,
          paramList,
          endpoint.code,
          endpoint.httpMethod
        );
      }
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Error loading routes:', error);
      throw error;
    }
  }

  async ensureInitialized(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initializationPromise) {
      await this.initializationPromise;
    } else {
      this.initializationPromise = this.loadAllRoutes();
      await this.initializationPromise;
    }
  }

  async registerEndpoint(path: string, parameters: string[], code: string, httpMethod: string): Promise<void> {
    console.log(`Registering endpoint ${path}`);
    
    try {
      // Create a new context for the VM
      const context = {
        endpoint_function: null,
        console: console
      };
      
      // Use VM to execute the code safely
      // Wrapped in a try-catch to handle execution errors
      try {
        const script = new vm.Script(`
          ${code}
          endpoint_function;
        `);
        
        const vmContext = vm.createContext(context);
        const func = script.runInContext(vmContext);
        
        if (!func || typeof func !== 'function') {
          throw new Error(`Invalid function definition in endpoint at ${path}`);
        }
        
        // Store in dynamic routes dictionary
        this.dynamicRoutes[path] = {
          type: 'endpoint',
          path,
          parameters,
          function: func,
          httpMethod
        };
      } catch (execError) {
        console.error(`Error compiling code for endpoint ${path}:`, execError);
        // Store a placeholder function that returns an error
        this.dynamicRoutes[path] = {
          type: 'endpoint',
          path,
          parameters,
          function: () => ({ 
            error: 'Endpoint code compilation error', 
            details: execError instanceof Error ? execError.message : String(execError) 
          }),
          httpMethod
        };
      }
    } catch (error) {
      console.error(`Error registering endpoint ${path}:`, error);
      throw error;
    }
  }
  
  // Refresh or add a specific endpoint (e.g., after updates)
  async refreshEndpoint(path: string): Promise<void> {
    const endpoint = await getEndpointByPath({ path });
    if (endpoint) {
      const paramList = endpoint.parameters ? endpoint.parameters.split(',') : [];
      await this.registerEndpoint(
        endpoint.path,
        paramList,
        endpoint.code,
        endpoint.httpMethod
      );
    } else {
      // If endpoint no longer exists in DB, remove it from in-memory routes
      delete this.dynamicRoutes[path];
    }
  }
  
  // Handle the request for dynamic endpoints
  async handleRequest(request: NextRequest, path: string): Promise<NextResponse> {
    await this.ensureInitialized();
    
    console.log(`Dynamic handler received: ${path}`);
    
    const sanitizedPath = this.sanitizePath(path);
    
    // Check if path exists in our dynamic routes
    if (this.dynamicRoutes[sanitizedPath]) {
      const route = this.dynamicRoutes[sanitizedPath];
      
      if (route.type === 'endpoint' && route.function && request.method === route.httpMethod) {
        let params: Record<string, any> = {};
        
        if (request.method === 'GET') {
          // Parse query parameters
          const url = new URL(request.url);
          route.parameters?.forEach(param => {
            params[param] = url.searchParams.get(param);
          });
        } else if (request.method === 'POST') {
          // Parse JSON body
          try {
            params = await request.json();
          } catch (e) {
            console.error('Error parsing JSON body:', e);
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
          }
        }
        
        try {
          // Execute the dynamic function
          const result = route.function(params);
          return NextResponse.json(result);
        } catch (error) {
          console.error(`Error executing endpoint ${sanitizedPath}:`, error);
          return NextResponse.json(
            { error: 'Error executing endpoint', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
          );
        }
      }
    }
    
    // Check if this might be a dynamic page request
    try {
      const page = await getPageByPath({ path: sanitizedPath });
      if (page) {
        return new NextResponse(page.htmlContent, {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8'
          }
        });
      }
    } catch (error) {
      console.error(`Error trying to serve page at ${sanitizedPath}:`, error);
    }
    
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  
  sanitizePath(path: string): string {
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    if (path !== '/' && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    return path;
  }
}

// Create a singleton instance for the application
export const endpointManager = new EndpointManager();