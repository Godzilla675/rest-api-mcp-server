# REST API MCP Server - AI Agent Instructions

## Project Overview
This is a **Model Context Protocol (MCP) server** that enables AI models to make HTTP requests to any REST API. It's a TypeScript/Node.js project that implements the MCP SDK to expose 5 HTTP method tools (GET, POST, PUT, PATCH, DELETE) with comprehensive authentication support.

**Key Architecture**: Single-file server (`src/index.ts`) that:
1. Defines Zod schemas for request validation
2. Implements MCP tool handlers using `@modelcontextprotocol/sdk`
3. Uses Axios for HTTP requests with authentication helpers
4. Communicates via stdio transport (no network server)

## Development Workflow

### Build & Run Commands
```bash
npm run build        # Compile TypeScript to dist/
npm run dev         # Run with tsx (development, no build needed)
npm start           # Run compiled version from dist/
npm test            # Run test suite using JSONPlaceholder API
```

**Important**: This is a **stdio-based MCP server**, not a web server. It reads JSON-RPC messages from stdin and writes responses to stdout. Use the test suite in `test/test-server.js` to verify functionality.

### Adding New HTTP Methods or Features
When modifying `src/index.ts`:
1. **Add Zod schema** for request validation (see `BaseRequestSchema` pattern)
2. **Update the `tools` array** with the new tool definition
3. **Add case handler** in the `CallToolRequestSchema` handler
4. **Use helper functions**: `buildRequestConfig()` for Axios setup, `formatResponse()` and `formatError()` for consistent responses
5. **Rebuild**: Always run `npm run build` before testing with actual MCP clients

## Code Patterns & Conventions

### Authentication Architecture
All authentication is handled through the `buildRequestConfig()` helper function. The pattern:
- **Unified auth parameters**: `authType`, `apiKey`, `bearerToken`, `username`, `password` are in every request schema
- **Switch-based routing**: Auth type determines which headers/config to set
- **Example**: To add OAuth2, extend `AuthTypeSchema` enum and add a new case in `buildRequestConfig()`

```typescript
// Current auth types: "none" | "api-key" | "bearer" | "basic"
// To extend, modify AuthTypeSchema and buildRequestConfig() switch statement
```

### Request/Response Formatting
- **All requests** return standardized format: `{ status, statusText, headers, data }`
- **All errors** return: `{ error: true, message, status?, statusText?, headers?, data? }`
- **Never throw unformatted errors** from tool handlers - always use `formatError()`

### Schema Extension Pattern
New endpoints should extend `BaseRequestSchema` (includes common params like `url`, `headers`, `queryParams`, `timeout`, auth fields). See `PostRequestSchema` for body-enabled requests.

## Testing Strategy
The `test/test-server.js` file demonstrates the complete MCP protocol flow:
1. Spawns server process with stdio pipes
2. Sends JSON-RPC `initialize` request
3. Lists tools with `tools/list`
4. Calls each HTTP method tool with `tools/call`
5. Uses **JSONPlaceholder** (public test API - no auth required) for all tests

**When adding features**: Add corresponding test cases to `test/test-server.js` following the existing pattern of setTimeout-chained requests.

## MCP Protocol Integration
This server implements MCP SDK v1.20.2+. Key integration points:
- **Server creation**: Uses `Server` class with stdio transport (`StdioServerTransport`)
- **Tool definition**: Tools array defines the JSON schema interface AI models see
- **Request handlers**: `setRequestHandler()` for `ListToolsRequestSchema` and `CallToolRequestSchema`
- **Response format**: Returns `{ content: [{ type: "text", text: JSON.stringify(...) }] }`

**Client configuration example** (Claude Desktop):
```json
{
  "mcpServers": {
    "rest-api": {
      "command": "node",
      "args": ["C:/absolute/path/to/rest-api-mcp-server/dist/index.js"]
    }
  }
}
```

## Common Modification Scenarios

### Adding a New Authentication Method
1. Extend `AuthTypeSchema` enum with new type (e.g., `"oauth2"`)
2. Add optional parameters to `BaseRequestSchema` (e.g., `accessToken`, `refreshToken`)
3. Add case in `buildRequestConfig()` switch statement to set appropriate headers
4. Update all 5 tool descriptions in the `tools` array to document new auth type

### Adding Request Interceptors or Middleware
Axios instances are created per-request in `buildRequestConfig()`. To add global interceptors:
- Create a configured Axios instance at module level
- Modify `buildRequestConfig()` to return config object only
- Use instance with config in tool handlers: `await axiosInstance.request(config)`

### Supporting Additional Content Types
For non-JSON bodies (e.g., form data, XML):
- The `contentType` parameter already exists in POST/PUT/PATCH schemas
- Axios auto-handles most content types based on `Content-Type` header
- For special encoding (multipart/form-data), import `FormData` and construct in tool handler

## File Structure Rationale
- **Single `src/index.ts`**: Entire server implementation in one file for simplicity - MCP servers are typically focused tools
- **`test/` as JS not TS**: Test file is pure Node.js to avoid compilation dependency
- **`dist/` in .gitignore**: Compiled output, generated by `npm run build`
- **ESM modules**: `"type": "module"` in package.json, uses ES6 imports throughout

## Dependencies
- `@modelcontextprotocol/sdk`: MCP protocol implementation (stdio transport + tool schemas)
- `axios`: HTTP client - chosen for comprehensive error handling and config flexibility
- `zod`: Runtime schema validation - validates all incoming tool arguments before making requests

**Don't add**: Express, Fastify, or other web frameworks - this is stdio-only, not HTTP-served.

## Debugging Tips
- **MCP protocol debugging**: Check stderr output (server logs to `console.error()`)
- **Request debugging**: Add `console.error(JSON.stringify(config))` before Axios calls in tool handlers
- **Test in isolation**: Use `npm test` before configuring with MCP clients
- **Client config issues**: Use absolute paths in MCP client configs - relative paths often fail
