# JavaScript Endpoints

JavaScript is the default language for creating dynamic endpoints in the system. This document covers how to create, test, and work with JavaScript endpoints.

## Creating a JavaScript Endpoint

When creating an endpoint, JavaScript is the default language. You can explicitly specify `javascript` as the language, or omit the language parameter entirely.

### Basic JavaScript Endpoint Structure

Every JavaScript endpoint must define an `endpoint_function` function that accepts a parameters object:

```javascript
/**
 * A basic JavaScript endpoint
 * 
 * @param {Object} params - The parameters passed to the endpoint
 * @returns {Object} The response object
 */
function endpoint_function(params) {
  // Your code here
  return {
    success: true,
    message: "Hello from JavaScript!"
  };
}
```

### Example JavaScript Endpoint: Data Transformation

```javascript
/**
 * An endpoint that transforms input data
 * 
 * @param {Object} params - The input parameters
 * @param {Array} params.data - Array of objects to transform
 * @param {string} params.field - Field to extract
 * @returns {Object} The transformed data
 */
function endpoint_function(params) {
  try {
    // Get the input data
    const data = params.data || [];
    const field = params.field || 'value';
    
    // Perform transformation
    const result = data.map(item => {
      // Extract the specified field
      const value = item[field];
      
      // Return transformed data
      return {
        originalValue: value,
        uppercase: typeof value === 'string' ? value.toUpperCase() : value,
        type: typeof value,
        isValid: value !== undefined && value !== null
      };
    });
    
    return {
      success: true,
      count: result.length,
      transformedData: result,
      language: "javascript"
    };
  } catch (error) {
    return {
      error: `Transformation error: ${error.message}`,
      success: false
    };
  }
}
```

### Example JavaScript Endpoint: API Integration

```javascript
/**
 * An endpoint that integrates with external APIs
 * Note: This is a simplified example. In production, 
 * you'd need to handle API keys and proper error handling.
 * 
 * @param {Object} params - The input parameters
 * @param {string} params.query - Search query
 * @returns {Object} The search results
 */
function endpoint_function(params) {
  // In a real implementation, you would use the fetch API
  // This is a mock demonstration
  const query = params.query || '';
  
  // Simulate API response
  const mockResults = [
    { title: `Result for ${query} - Item 1`, score: 0.95 },
    { title: `Result for ${query} - Item 2`, score: 0.87 },
    { title: `Result for ${query} - Item 3`, score: 0.76 }
  ];
  
  return {
    success: true,
    query: query,
    timestamp: new Date().toISOString(),
    results: mockResults,
    language: "javascript"
  };
}
```

## API

When creating a JavaScript endpoint through the API:

```bash
# Creating a JavaScript endpoint
curl -X POST http://localhost:3000/api/endpoints \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "path": "/data/transform",
    "code": "function endpoint_function(params) {\n  try {\n    const data = params.data || [];\n    const field = params.field || \"value\";\n    \n    const result = data.map(item => {\n      const value = item[field];\n      return {\n        originalValue: value,\n        uppercase: typeof value === \"string\" ? value.toUpperCase() : value,\n        type: typeof value,\n        isValid: value !== undefined && value !== null\n      };\n    });\n    \n    return {\n      success: true,\n      count: result.length,\n      transformedData: result,\n      language: \"javascript\"\n    };\n  } catch (error) {\n    return {\n      error: `Transformation error: ${error.message}`,\n      success: false\n    };\n  }\n}",
    "parameters": ["data", "field"],
    "httpMethod": "POST",
    "language": "javascript",
    "projectId": "your-project-id"
  }'
```

## Implementation Details

- JavaScript endpoints are executed using Node.js VM module
- The endpoint code is evaluated in a sandbox environment
- Parameters are passed directly to the function
- The function should return a JSON-serializable object

## JavaScript Features and Limitations

### Available Features

- Full access to JavaScript language features (ES6+)
- Standard JavaScript objects and methods (Array, Object, String, etc.)
- Date and JSON manipulation
- Math functions and operations

### Limitations

- No access to Node.js built-in modules (fs, path, etc.)
- No ability to import external modules
- Limited access to global objects
- No file system or network access within the endpoint code itself
- Execution timeout limits apply to prevent infinite loops

## Best Practices

1. **Input Validation**: Always validate and sanitize input parameters
2. **Error Handling**: Use try/catch blocks to handle errors gracefully
3. **Default Values**: Provide default values for parameters
4. **Documentation**: Document your endpoint's purpose, parameters, and return values
5. **Response Structure**: Maintain a consistent response structure
6. **Security**: Don't include sensitive information in your code

## Examples of Using JavaScript Endpoints

### GET Request
```
GET /api/your-project/data/calculate?number=5
```

### POST Request
```
POST /api/your-project/data/transform
Content-Type: application/json

{
  "data": [
    {"name": "item1", "value": "test"},
    {"name": "item2", "value": 123},
    {"name": "item3", "value": null}
  ],
  "field": "value"
}
```