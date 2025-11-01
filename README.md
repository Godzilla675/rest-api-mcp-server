# REST API MCP Server

A powerful Model Context Protocol (MCP) server that enables AI models to interact with any REST API. This server provides comprehensive support for all HTTP methods (GET, POST, PUT, PATCH, DELETE) with multiple authentication methods, custom headers, and query parameters.

## Features

- ✅ **All HTTP Methods**: Support for GET, POST, PUT, PATCH, and DELETE requests
- 🔐 **Multiple Authentication Types**:
  - API Key (with customizable header name)
  - Bearer Token
  - Basic Authentication
  - No authentication (for public APIs)
- 🎯 **Flexible Request Configuration**:
  - Custom headers
  - Query parameters
  - Request body (JSON or other formats)
  - Configurable timeouts
  - Custom Content-Type headers
- 📊 **Rich Response Handling**:
  - Full response details (status, headers, data)
  - Comprehensive error information
- 🧪 **Tested**: Includes test suite with JSONPlaceholder API

## Installation

```bash
npm install
npm run build
```

## Usage

### Running the Server

```bash
npm start
```

Or for development:

```bash
npm run dev
```

### Testing the Server

Run the included test suite that demonstrates all features:

```bash
npm test
```

## Available Tools

The server provides 5 main tools for interacting with REST APIs:

### 1. `rest_api_get`

Make GET requests to retrieve data from any REST API.

**Parameters:**
- `url` (required): The full URL to request
- `headers` (optional): Custom headers object
- `queryParams` (optional): Query parameters object
- `timeout` (optional): Request timeout in milliseconds (default: 30000)
- `authType` (optional): Authentication type - "none", "api-key", "bearer", or "basic" (default: "none")
- `apiKey` (optional): API key for api-key authentication
- `apiKeyHeader` (optional): Header name for API key (default: "X-API-Key")
- `bearerToken` (optional): Token for bearer authentication
- `username` (optional): Username for basic authentication
- `password` (optional): Password for basic authentication

**Example:**
```json
{
  "url": "https://api.example.com/users",
  "queryParams": {
    "page": 1,
    "limit": 10
  },
  "authType": "bearer",
  "bearerToken": "your-token-here"
}
```

### 2. `rest_api_post`

Make POST requests to create new resources.

**Parameters:**
- All parameters from `rest_api_get`
- `body` (optional): Request body (will be JSON stringified if object)
- `contentType` (optional): Content-Type header (default: "application/json")

**Example:**
```json
{
  "url": "https://api.example.com/users",
  "body": {
    "name": "John Doe",
    "email": "john@example.com"
  },
  "authType": "api-key",
  "apiKey": "your-api-key",
  "apiKeyHeader": "X-API-Key"
}
```

### 3. `rest_api_put`

Make PUT requests to update existing resources completely.

**Parameters:** Same as `rest_api_post`

**Example:**
```json
{
  "url": "https://api.example.com/users/123",
  "body": {
    "name": "John Doe Updated",
    "email": "john.updated@example.com"
  },
  "authType": "bearer",
  "bearerToken": "your-token-here"
}
```

### 4. `rest_api_patch`

Make PATCH requests to partially update resources.

**Parameters:** Same as `rest_api_post`

**Example:**
```json
{
  "url": "https://api.example.com/users/123",
  "body": {
    "email": "newemail@example.com"
  }
}
```

### 5. `rest_api_delete`

Make DELETE requests to remove resources.

**Parameters:**
- All parameters from `rest_api_get`
- `body` (optional): Optional request body

**Example:**
```json
{
  "url": "https://api.example.com/users/123",
  "authType": "bearer",
  "bearerToken": "your-token-here"
}
```

## Authentication Examples

### API Key Authentication

```json
{
  "url": "https://api.example.com/data",
  "authType": "api-key",
  "apiKey": "your-api-key-here",
  "apiKeyHeader": "X-API-Key"
}
```

### Bearer Token Authentication

```json
{
  "url": "https://api.example.com/data",
  "authType": "bearer",
  "bearerToken": "your-bearer-token-here"
}
```

### Basic Authentication

```json
{
  "url": "https://api.example.com/data",
  "authType": "basic",
  "username": "your-username",
  "password": "your-password"
}
```

### No Authentication (Public APIs)

```json
{
  "url": "https://api.publicapi.com/data",
  "authType": "none"
}
```

## Response Format

All successful requests return a response in the following format:

```json
{
  "status": 200,
  "statusText": "OK",
  "headers": {
    "content-type": "application/json",
    ...
  },
  "data": {
    ... API response data ...
  }
}
```

Error responses include:

```json
{
  "error": true,
  "message": "Error message",
  "status": 404,
  "statusText": "Not Found",
  "data": {
    ... error details if available ...
  }
}
```

## Configuration with MCP Clients

To use this server with an MCP client like Claude Desktop, add it to your configuration:

### Claude Desktop Configuration

On MacOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

On Windows: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "rest-api": {
      "command": "node",
      "args": ["/path/to/rest-api-mcp-server/dist/index.js"]
    }
  }
}
```

## Examples

### Example 1: Fetch Data from Public API

```json
{
  "name": "rest_api_get",
  "arguments": {
    "url": "https://jsonplaceholder.typicode.com/posts/1"
  }
}
```

### Example 2: Create Resource with Authentication

```json
{
  "name": "rest_api_post",
  "arguments": {
    "url": "https://api.example.com/posts",
    "body": {
      "title": "New Post",
      "content": "Post content here"
    },
    "authType": "bearer",
    "bearerToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Example 3: Query with Parameters

```json
{
  "name": "rest_api_get",
  "arguments": {
    "url": "https://api.example.com/search",
    "queryParams": {
      "q": "search term",
      "page": 1,
      "limit": 20
    },
    "headers": {
      "Accept": "application/json"
    }
  }
}
```

## Development

### Build

```bash
npm run build
```

### Run in Development Mode

```bash
npm run dev
```

### Project Structure

```
rest-api-mcp-server/
├── src/
│   └── index.ts        # Main server implementation
├── dist/               # Compiled JavaScript output
├── test/
│   └── test-server.js  # Test suite
├── package.json
├── tsconfig.json
└── README.md
```

## Dependencies

- `@modelcontextprotocol/sdk`: MCP protocol implementation
- `axios`: HTTP client for making API requests
- `zod`: Schema validation

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.