# Quick Start Guide

Get started with REST API MCP Server in 5 minutes!

## Installation

```bash
# Clone the repository
git clone https://github.com/Godzilla675/rest-api-mcp-server.git
cd rest-api-mcp-server

# Install dependencies
npm install

# Build the project
npm run build
```

## Testing the Server

Run the included test suite to verify everything works:

```bash
npm test
```

This will test all five HTTP methods (GET, POST, PUT, PATCH, DELETE) using the JSONPlaceholder API.

## Using with Claude Desktop

### Step 1: Build the Server

```bash
npm run build
```

### Step 2: Configure Claude Desktop

**On macOS:**
Edit `~/Library/Application Support/Claude/claude_desktop_config.json`

**On Windows:**
Edit `%APPDATA%/Claude/claude_desktop_config.json`

Add the following configuration:

```json
{
  "mcpServers": {
    "rest-api": {
      "command": "node",
      "args": [
        "/absolute/path/to/rest-api-mcp-server/dist/index.js"
      ]
    }
  }
}
```

Replace `/absolute/path/to/rest-api-mcp-server` with the actual path where you cloned the repository.

### Step 3: Restart Claude Desktop

Restart Claude Desktop to load the new MCP server.

### Step 4: Test It!

Try asking Claude:

> "Can you fetch the first post from JSONPlaceholder API? Use the rest_api_get tool with URL https://jsonplaceholder.typicode.com/posts/1"

## First API Call Examples

### Example 1: Simple GET Request

```
Use rest_api_get to fetch data from https://api.github.com/users/octocat
```

### Example 2: GET with Query Parameters

```
Use rest_api_get to fetch posts from https://jsonplaceholder.typicode.com/posts with query parameters: userId=1 and _limit=5
```

### Example 3: POST Request

```
Use rest_api_post to create a new post at https://jsonplaceholder.typicode.com/posts with body:
{
  "title": "My First Post",
  "body": "This is my first post via MCP!",
  "userId": 1
}
```

### Example 4: API with Authentication

```
Use rest_api_get to fetch data from https://api.example.com/data with bearer token authentication. Use token: YOUR_TOKEN_HERE
```

## Common Use Cases

### Public APIs (No Authentication)

Perfect for:
- JSONPlaceholder (testing)
- Public GitHub API endpoints
- OpenWeather API (with API key in query params)
- RESTful example APIs

### Authenticated APIs

Works with:
- APIs requiring API keys (custom header)
- OAuth 2.0 APIs (Bearer token)
- Basic Auth APIs (username/password)
- GitHub API with personal access tokens
- Stripe API
- SendGrid API
- Most modern REST APIs

## Troubleshooting

### Server Not Starting

1. Make sure you've run `npm install` and `npm run build`
2. Check the path in your Claude Desktop config is absolute
3. Verify Node.js is installed: `node --version`

### Authentication Not Working

1. Verify you're using the correct `authType`: "none", "api-key", "bearer", or "basic"
2. Check your API key/token is correct
3. Verify the `apiKeyHeader` matches what the API expects (default is "X-API-Key")

### Request Timeout

1. Increase the `timeout` parameter (default is 30000ms)
2. Check your internet connection
3. Verify the API endpoint is accessible

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Check out [USAGE_EXAMPLES.md](USAGE_EXAMPLES.md) for more examples
- Try it with your favorite APIs!

## Support

If you encounter issues:
1. Check the console output when Claude Desktop starts
2. Review the error messages returned by the server
3. Verify your API credentials and endpoints
4. Open an issue on GitHub with details

## Quick Reference

| Tool | Purpose | Required Params |
|------|---------|-----------------|
| `rest_api_get` | Fetch data | `url` |
| `rest_api_post` | Create resource | `url` |
| `rest_api_put` | Update resource | `url` |
| `rest_api_patch` | Partial update | `url` |
| `rest_api_delete` | Delete resource | `url` |

All tools support:
- `headers` - Custom headers
- `queryParams` - URL query parameters
- `timeout` - Request timeout (ms)
- `authType` - Authentication type
- API key, Bearer token, or Basic auth credentials
