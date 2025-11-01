# REST API MCP Server

**Universal MCP server for REST & GraphQL APIs** - Just 2 simple tools handle everything: all HTTP methods, file uploads/downloads, and auto-detection of content types.

## Why This Server?

**Before (v1.2):** 9 confusing tools - `rest_api_get`, `rest_api_post`, `rest_api_put`, `rest_api_patch`, `rest_api_delete`, `rest_api_upload_file`, `rest_api_download_file`, `rest_api_form_urlencoded`, `rest_api_graphql`

**Now (v1.3):** Just 2 smart tools:
- `rest_api_request` - Handles ALL REST API operations
- `rest_api_graphql` - Handles GraphQL queries/mutations

No more confusion about which tool to use!

## Features

-  **Universal Tool**: One tool for all HTTP methods (GET, POST, PUT, PATCH, DELETE)
-  **Smart Auto-Detection**: Automatically detects JSON, form-urlencoded, or multipart file uploads
-  **File Uploads**: Upload images, documents via multipart/form-data
-  **File Downloads**: Auto-saves binary responses (images, PDFs, etc.)
-  **All Auth Types**: API Key, Bearer Token, Basic Auth
-  **Retry Logic**: Automatic exponential backoff for network errors
-  **GraphQL**: Full support for queries, mutations, variables
-  **Fixed Hugging Face**: Now works with image generation APIs (Accept: */*)

## Installation

```bash
npm install -g rest-api-mcp-server
```

Or locally:
```bash
npm install rest-api-mcp-server
```

## Configuration

Add to your MCP settings (e.g., Claude Desktop config):

```json
{
  "mcpServers": {
    "rest-api": {
      "command": "rest-api-mcp-server"
    }
  }
}
```

## The 2 Tools

### 1. `rest_api_request` - Universal REST API Tool

Handles **everything**: GET, POST, PUT, PATCH, DELETE, file uploads, file downloads, form submissions.

**Key Parameters:**
- `url` (required): Full URL
- `method` (optional): GET, POST, PUT, PATCH, DELETE (default: GET)
- `body` (optional): Request body (auto-detects JSON/form/multipart)
- `saveResponseTo` (optional): File path to save binary response
- `contentType` (optional): Override auto-detection
- `headers`, `queryParams`, `timeout`: Standard options
- Auth: `authType`, `bearerToken`, `apiKey`, `username`, `password`

**Examples:**

**Simple GET:**
```json
{
  "url": "https://api.example.com/users",
  "method": "GET"
}
```

**POST JSON:**
```json
{
  "url": "https://api.example.com/users",
  "method": "POST",
  "body": {
    "name": "John Doe",
    "email": "john@example.com"
  },
  "bearerToken": "your-token"
}
```

**Upload File:**
```json
{
  "url": "https://api.example.com/upload",
  "method": "POST",
  "body": {
    "files": [
      {
        "path": "C:\\Users\\Name\\image.jpg",
        "fieldName": "file",
        "mimeType": "image/jpeg"
      }
    ]
  },
  "bearerToken": "your-token"
}
```

**Download Image (e.g., Hugging Face):**
```json
{
  "url": "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-dev",
  "method": "POST",
  "body": {
    "inputs": "A cat in a sunbeam"
  },
  "saveResponseTo": "C:\\Users\\Name\\generated_cat.png",
  "bearerToken": "hf_xxxxx",
  "timeout": 60000
}
```

**Form Submission (OAuth):**
```json
{
  "url": "https://oauth.example.com/token",
  "method": "POST",
  "body": {
    "grant_type": "client_credentials",
    "client_id": "xxx",
    "client_secret": "yyy"
  },
  "contentType": "application/x-www-form-urlencoded"
}
```

### 2. `rest_api_graphql` - GraphQL Tool

Execute GraphQL queries and mutations.

**Key Parameters:**
- `url` (required): GraphQL endpoint
- `query` (required): GraphQL query/mutation string
- `variables` (optional): Variables object
- `operationName` (optional): Operation name
- `httpMethod` (optional): GET or POST (default: POST)
- Auth: Same as rest_api_request

**Example:**
```json
{
  "url": "https://api.example.com/graphql",
  "query": "query GetUser($id: ID!) { user(id: $id) { name email } }",
  "variables": {
    "id": "123"
  },
  "bearerToken": "your-token"
}
```

## What Changed in v1.3?

### Consolidation
-  Removed: `rest_api_get`, `rest_api_post`, `rest_api_put`, `rest_api_patch`, `rest_api_delete`
-  Removed: `rest_api_upload_file`, `rest_api_download_file`, `rest_api_form_urlencoded`
-  Added: Single `rest_api_request` that does it all

### Fixes
-  Fixed `Accept: */*` header (now works with Hugging Face image generation)
-  Auto-detects content type from body structure
-  Auto-saves binary responses when `saveResponseTo` provided

### For AI Models
Much clearer! No more confusion about:
- When to use `rest_api_get` vs `rest_api_download_file`
- When to use `rest_api_post` vs `rest_api_upload_file` vs `rest_api_form_urlencoded`

Now: Just use `rest_api_request` with the appropriate parameters!

## Testing

```bash
npm test
```

## Example Use Cases

1. **Fetch API data**: Simple GET with auth
2. **Create resources**: POST with JSON body
3. **Update resources**: PUT/PATCH with JSON
4. **Delete resources**: DELETE with auth
5. **Upload files**: POST with multipart (auto-detected)
6. **Download files**: Any method + `saveResponseTo`
7. **OAuth tokens**: POST form-urlencoded (auto-detected)
8. **GraphQL APIs**: Queries and mutations with variables
9. **AI Image Generation**: Hugging Face, Replicate, etc.

## License

MIT

## Contributing

Issues and PRs welcome at [GitHub](https://github.com/Godzilla675/rest-api-mcp-server)

## Version History

- **v1.3.0**: Consolidated 9 tools into 2; Fixed Accept header; Auto-detection
- **v1.2.0**: Added GraphQL support
- **v1.1.0**: Added file upload/download, form-urlencoded, retry logic
- **v1.0.0**: Initial release with basic REST methods
