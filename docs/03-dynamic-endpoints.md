# Dynamic Endpoints

The dynamic endpoints feature allows you to create custom API endpoints on-the-fly, without having to modify the application code or redeploy the service. These endpoints can be written in either JavaScript or Python, and are automatically exposed through the API with the specified URL paths.

## Key Features

- **Dynamic Creation**: Create, update, and delete endpoints through the API
- **Multiple Languages**: Write endpoints in JavaScript (default) or Python
- **Project Namespacing**: Endpoints are automatically namespaced under your project
- **Parameter Handling**: Define and validate parameters for your endpoints
- **Security**: Endpoints run in sandboxed environments
- **Simple Interface**: Standard interface for both languages

## How It Works

1. You create an endpoint by specifying:
   - **Path**: The URL path for your endpoint
   - **Code**: The function implementation in JavaScript or Python
   - **Parameters**: The parameters your endpoint expects
   - **HTTP Method**: GET or POST
   - **Language**: JavaScript or Python
   - **Project**: The project this endpoint belongs to

2. The system:
   - Validates your code
   - Stores the endpoint in the database
   - Registers the endpoint in memory
   - Makes it immediately available at `/api/<project-name>/<endpoint-path>`

3. When your endpoint is called:
   - The system looks up the endpoint by its path
   - Extracts parameters from the request
   - Executes your code in a sandboxed environment
   - Returns the result as a JSON response

## Example Usage

### Creating an Endpoint

```bash
curl -X POST http://localhost:3000/api/endpoints \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "path": "/calculate/add",
    "code": "function endpoint_function(params) { return { result: parseInt(params.a) + parseInt(params.b) }; }",
    "parameters": ["a", "b"],
    "httpMethod": "GET",
    "language": "javascript",
    "projectId": "your-project-id"
  }'
```

### Using the Endpoint

```bash
curl http://localhost:3000/api/your-project/calculate/add?a=5&b=10
```

Response:
```json
{
  "result": 15
}
```

## Endpoint Runtime Environment

Endpoints run in a sandboxed environment for security. This means:

- No access to the file system
- No network access from within the endpoint code
- Limited access to global objects
- No ability to import external modules within the endpoint code

## Language Support

The system supports two languages for implementing endpoints:

- **JavaScript**: Default option, using Node.js VM
- **Python**: Using Pythonia to execute Python code

Both languages follow the same interface patterns, making it easy to switch between them as needed. See the language-specific documentation for details:

- [JavaScript Endpoints](05-javascript-endpoints.md)
- [Python Endpoints](04-python-endpoints.md)

## Best Practices

1. **Keep endpoints focused**: Each endpoint should do one thing well
2. **Validate input**: Always validate and sanitize input parameters
3. **Handle errors gracefully**: Use try/catch blocks to catch and report errors
4. **Document your endpoints**: Include comments explaining what the endpoint does
5. **Use consistent response structures**: Make your API consistent and predictable
6. **Consider performance**: Keep endpoints efficient and fast-responding
7. **Security**: Don't include sensitive information in your endpoint code