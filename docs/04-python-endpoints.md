# Python Endpoints

In addition to JavaScript endpoints, the application now supports Python endpoints. This allows you to create endpoints in either language based on your preference or requirements.

## Creating a Python Endpoint

When creating an endpoint, you can specify the language as either `javascript` (default) or `python`.

### Example Python Endpoint

```python
# A simple Python endpoint that calculates the factorial of a number

def endpoint_function(params):
    try:
        # Get the number parameter
        number = int(params.get('number', 1))
        
        # Calculate factorial
        if number < 0:
            return {"error": "Number must be non-negative"}
        
        factorial = 1
        for i in range(1, number + 1):
            factorial *= i
        
        # Return the result
        return {
            "success": True,
            "number": number,
            "factorial": factorial,
            "language": "python"
        }
    except Exception as e:
        return {"error": f"Calculation error: {str(e)}"}
```

### Example JavaScript Endpoint

```javascript
/**
 * A simple JavaScript endpoint that calculates the factorial of a number
 */
function endpoint_function(params) {
  try {
    // Get the number parameter
    const number = parseInt(params.number || 1);
    
    // Validate input
    if (number < 0) {
      return { error: "Number must be non-negative" };
    }
    
    // Calculate factorial
    let factorial = 1;
    for (let i = 1; i <= number; i++) {
      factorial *= i;
    }
    
    // Return the result
    return {
      success: true,
      number: number,
      factorial: factorial,
      language: "javascript"
    };
  } catch (error) {
    return { error: `Calculation error: ${error.message}` };
  }
}
```

## API

When creating an endpoint through the API, include the `language` parameter:

```bash
# Creating a Python endpoint
curl -X POST http://localhost:5555/api/endpoints \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "path": "/calculate/factorial",
    "code": "def endpoint_function(params):\n    try:\n        number = int(params.get(\"number\", 1))\n        if number < 0:\n            return {\"error\": \"Number must be non-negative\"}\n        factorial = 1\n        for i in range(1, number + 1):\n            factorial *= i\n        return {\n            \"success\": True,\n            \"number\": number,\n            \"factorial\": factorial,\n            \"language\": \"python\"\n        }\n    except Exception as e:\n        return {\"error\": f\"Calculation error: {str(e)}\"}",
    "parameters": ["number"],
    "httpMethod": "GET",
    "language": "python",
    "projectId": "your-project-id"
  }'
```

## Implementation Details

- Python endpoints use the Pythonia library to execute Python code from Node.js
- Parameters are automatically converted between JavaScript and Python formats
- Results from Python endpoints are converted to JSON for response handling
- Both languages follow the same interface pattern for consistency

## Notes

- Python endpoints have access to standard Python libraries
- For security reasons, certain Python modules may be restricted in the execution environment
- Each Python endpoint runs in its own isolated environment