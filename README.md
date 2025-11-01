# REST API MCP Server

A powerful Model Context Protocol (MCP) server that enables AI models to interact with any REST API. This server provides comprehensive support for all HTTP methods (GET, POST, PUT, PATCH, DELETE) with multiple authentication methods, custom headers, and query parameters.

## Features

- ✅ **All HTTP Methods**: Support for GET, POST, PUT, PATCH, and DELETE requests
- � **File Uploads**: Upload images, documents, and any files using multipart/form-data
- 📥 **File Downloads**: Download files and save them locally with proper binary handling
- 📝 **Form Submissions**: Support for application/x-www-form-urlencoded content type
- 🧭 **GraphQL Support**: Execute GraphQL queries and mutations with variables, operation names, and GET/POST methods
- �🔐 **Multiple Authentication Types**:
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
- 🔄 **Retry Logic**: Automatic retry with exponential backoff for failed requests (excludes 4xx errors)
- 📊 **Rich Response Handling**:
  - Full response details (status, headers, data)
  - Comprehensive error information
  - File download progress tracking
- 🧪 **Tested**: Includes comprehensive test suite with JSONPlaceholder API

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

The server provides 9 powerful tools for interacting with REST and GraphQL APIs:

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

### 6. `rest_api_upload_file`

Upload files (images, documents, etc.) using multipart/form-data encoding.

**Parameters:**
- `url` (required): The full URL to upload to
- `filePath` (required): Absolute path to the file to upload
- `fileFieldName` (optional): Name of the file field (default: "file")
- `formFields` (optional): Additional form fields to include
- All authentication and header parameters from `rest_api_get`

**Example:**
```json
{
  "url": "https://api.example.com/upload",
  "filePath": "C:\\Users\\Name\\Pictures\\image.jpg",
  "fileFieldName": "photo",
  "formFields": {
    "description": "Profile picture",
    "category": "avatar"
  },
  "authType": "bearer",
  "bearerToken": "your-token-here"
}
```

### 7. `rest_api_download_file`

Download files from a REST API and save them locally.

**Parameters:**
- `url` (required): The full URL to download from
- `savePath` (required): Absolute path where the file should be saved
- All authentication and header parameters from `rest_api_get`

**Example:**
```json
{
  "url": "https://api.example.com/files/report.pdf",
  "savePath": "C:\\Users\\Name\\Downloads\\report.pdf",
  "authType": "api-key",
  "apiKey": "your-api-key"
}
```

### 8. `rest_api_form_urlencoded`

Submit form data using application/x-www-form-urlencoded encoding.

**Parameters:**
- `url` (required): The full URL to submit to
- `formData` (required): Form data as key-value pairs
- All authentication and header parameters from `rest_api_get`

**Example:**
```json
{
  "url": "https://api.example.com/oauth/token",
  "formData": {
    "grant_type": "client_credentials",
    "client_id": "your-client-id",
    "client_secret": "your-client-secret"
  }
}
```

### 9. `rest_api_graphql`

Execute GraphQL queries and mutations with full support for variables and operation names.

**Parameters:**
- `url` (required): GraphQL endpoint URL
- `query` (required): GraphQL query or mutation string
- `variables` (optional): Variables object for the query
- `operationName` (optional): Operation name if document contains multiple operations
- `httpMethod` (optional): HTTP method to use - "POST" (default) or "GET"
- All authentication and header parameters from `rest_api_get`

**Example - Simple Query:**
```json
{
  "url": "https://countries.trevorblades.com/",
  "query": "{ countries { code name } }"
}
```

**Example - Query with Variables:**
```json
{
  "url": "https://api.github.com/graphql",
  "query": "query GetUser($login: String!) { user(login: $login) { name bio } }",
  "variables": {
    "login": "octocat"
  },
  "authType": "bearer",
  "bearerToken": "your-github-token"
}
```

**Example - Mutation:**
```json
{
  "url": "https://api.example.com/graphql",
  "query": "mutation CreatePost($title: String!, $content: String!) { createPost(title: $title, content: $content) { id title } }",
  "variables": {
    "title": "New Post",
    "content": "Post content here"
  },
  "authType": "bearer",
  "bearerToken": "your-token"
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

**Option 1: Using local installation**
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

**Option 2: Using npx (recommended after npm publish)**
```json
{
  "mcpServers": {
    "rest-api": {
      "command": "npx",
      "args": ["-y", "rest-api-mcp-server"]
    }
  }
}
```

**Option 3: Using global installation**
```bash
npm install -g rest-api-mcp-server
```

```json
{
  "mcpServers": {
    "rest-api": {
      "command": "rest-api-mcp-server"
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