#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import axios, { AxiosRequestConfig, AxiosResponse, Method } from "axios";
import { z } from "zod";

// Define authentication types
const AuthTypeSchema = z.enum(["none", "api-key", "bearer", "basic"]);
type AuthType = z.infer<typeof AuthTypeSchema>;

// Define request schemas
const HeaderSchema = z.record(z.string());
const QueryParamsSchema = z.record(z.union([z.string(), z.number(), z.boolean()]));

const BaseRequestSchema = z.object({
  url: z.string().url().describe("The full URL to make the request to"),
  headers: HeaderSchema.optional().describe("Custom headers to include in the request"),
  queryParams: QueryParamsSchema.optional().describe("Query parameters to append to the URL"),
  timeout: z.number().optional().default(30000).describe("Request timeout in milliseconds (default: 30000)"),
  authType: AuthTypeSchema.optional().default("none").describe("Type of authentication to use"),
  apiKey: z.string().optional().describe("API key (for api-key auth type)"),
  apiKeyHeader: z.string().optional().default("X-API-Key").describe("Header name for API key (default: X-API-Key)"),
  bearerToken: z.string().optional().describe("Bearer token (for bearer auth type)"),
  username: z.string().optional().describe("Username (for basic auth type)"),
  password: z.string().optional().describe("Password (for basic auth type)"),
});

const GetRequestSchema = BaseRequestSchema;

const PostRequestSchema = BaseRequestSchema.extend({
  body: z.any().optional().describe("Request body (JSON object, string, or other data)"),
  contentType: z.string().optional().default("application/json").describe("Content-Type header (default: application/json)"),
});

const PutRequestSchema = PostRequestSchema;
const PatchRequestSchema = PostRequestSchema;
const DeleteRequestSchema = BaseRequestSchema.extend({
  body: z.any().optional().describe("Optional request body"),
});

// Helper function to build request config with authentication
function buildRequestConfig(
  method: Method,
  params: z.infer<typeof BaseRequestSchema> & { body?: any; contentType?: string }
): AxiosRequestConfig {
  const config: AxiosRequestConfig = {
    method,
    url: params.url,
    timeout: params.timeout,
    headers: params.headers ? { ...params.headers } : {},
    params: params.queryParams,
  };

  // Add content type for requests with body
  if (params.body !== undefined && params.contentType) {
    config.headers!["Content-Type"] = params.contentType;
    config.data = params.body;
  }

  // Handle authentication
  switch (params.authType) {
    case "api-key":
      if (params.apiKey) {
        config.headers![params.apiKeyHeader || "X-API-Key"] = params.apiKey;
      }
      break;
    case "bearer":
      if (params.bearerToken) {
        config.headers!["Authorization"] = `Bearer ${params.bearerToken}`;
      }
      break;
    case "basic":
      if (params.username && params.password) {
        config.auth = {
          username: params.username,
          password: params.password,
        };
      }
      break;
    case "none":
    default:
      // No authentication
      break;
  }

  return config;
}

// Helper function to format response
function formatResponse(response: AxiosResponse): any {
  return {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    data: response.data,
  };
}

// Helper function to format error
function formatError(error: any): any {
  if (axios.isAxiosError(error)) {
    return {
      error: true,
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      headers: error.response?.headers,
      data: error.response?.data,
    };
  }
  return {
    error: true,
    message: error.message || "Unknown error occurred",
  };
}

// Create server instance
const server = new Server(
  {
    name: "rest-api-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define tools
const tools: Tool[] = [
  {
    name: "rest_api_get",
    description: "Make a GET request to any REST API. Supports authentication (API key, Bearer token, Basic auth), custom headers, and query parameters.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The full URL to make the GET request to",
        },
        headers: {
          type: "object",
          description: "Custom headers to include in the request",
          additionalProperties: { type: "string" },
        },
        queryParams: {
          type: "object",
          description: "Query parameters to append to the URL",
          additionalProperties: { type: ["string", "number", "boolean"] },
        },
        timeout: {
          type: "number",
          description: "Request timeout in milliseconds (default: 30000)",
          default: 30000,
        },
        authType: {
          type: "string",
          enum: ["none", "api-key", "bearer", "basic"],
          description: "Type of authentication to use",
          default: "none",
        },
        apiKey: {
          type: "string",
          description: "API key (for api-key auth type)",
        },
        apiKeyHeader: {
          type: "string",
          description: "Header name for API key (default: X-API-Key)",
          default: "X-API-Key",
        },
        bearerToken: {
          type: "string",
          description: "Bearer token (for bearer auth type)",
        },
        username: {
          type: "string",
          description: "Username (for basic auth type)",
        },
        password: {
          type: "string",
          description: "Password (for basic auth type)",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "rest_api_post",
    description: "Make a POST request to any REST API with request body. Supports authentication, custom headers, and query parameters.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The full URL to make the POST request to",
        },
        body: {
          description: "Request body (JSON object, string, or other data)",
        },
        contentType: {
          type: "string",
          description: "Content-Type header (default: application/json)",
          default: "application/json",
        },
        headers: {
          type: "object",
          description: "Custom headers to include in the request",
          additionalProperties: { type: "string" },
        },
        queryParams: {
          type: "object",
          description: "Query parameters to append to the URL",
          additionalProperties: { type: ["string", "number", "boolean"] },
        },
        timeout: {
          type: "number",
          description: "Request timeout in milliseconds (default: 30000)",
          default: 30000,
        },
        authType: {
          type: "string",
          enum: ["none", "api-key", "bearer", "basic"],
          description: "Type of authentication to use",
          default: "none",
        },
        apiKey: {
          type: "string",
          description: "API key (for api-key auth type)",
        },
        apiKeyHeader: {
          type: "string",
          description: "Header name for API key (default: X-API-Key)",
          default: "X-API-Key",
        },
        bearerToken: {
          type: "string",
          description: "Bearer token (for bearer auth type)",
        },
        username: {
          type: "string",
          description: "Username (for basic auth type)",
        },
        password: {
          type: "string",
          description: "Password (for basic auth type)",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "rest_api_put",
    description: "Make a PUT request to any REST API to update a resource. Supports authentication, custom headers, and request body.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The full URL to make the PUT request to",
        },
        body: {
          description: "Request body (JSON object, string, or other data)",
        },
        contentType: {
          type: "string",
          description: "Content-Type header (default: application/json)",
          default: "application/json",
        },
        headers: {
          type: "object",
          description: "Custom headers to include in the request",
          additionalProperties: { type: "string" },
        },
        queryParams: {
          type: "object",
          description: "Query parameters to append to the URL",
          additionalProperties: { type: ["string", "number", "boolean"] },
        },
        timeout: {
          type: "number",
          description: "Request timeout in milliseconds (default: 30000)",
          default: 30000,
        },
        authType: {
          type: "string",
          enum: ["none", "api-key", "bearer", "basic"],
          description: "Type of authentication to use",
          default: "none",
        },
        apiKey: {
          type: "string",
          description: "API key (for api-key auth type)",
        },
        apiKeyHeader: {
          type: "string",
          description: "Header name for API key (default: X-API-Key)",
          default: "X-API-Key",
        },
        bearerToken: {
          type: "string",
          description: "Bearer token (for bearer auth type)",
        },
        username: {
          type: "string",
          description: "Username (for basic auth type)",
        },
        password: {
          type: "string",
          description: "Password (for basic auth type)",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "rest_api_patch",
    description: "Make a PATCH request to any REST API to partially update a resource. Supports authentication, custom headers, and request body.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The full URL to make the PATCH request to",
        },
        body: {
          description: "Request body (JSON object, string, or other data)",
        },
        contentType: {
          type: "string",
          description: "Content-Type header (default: application/json)",
          default: "application/json",
        },
        headers: {
          type: "object",
          description: "Custom headers to include in the request",
          additionalProperties: { type: "string" },
        },
        queryParams: {
          type: "object",
          description: "Query parameters to append to the URL",
          additionalProperties: { type: ["string", "number", "boolean"] },
        },
        timeout: {
          type: "number",
          description: "Request timeout in milliseconds (default: 30000)",
          default: 30000,
        },
        authType: {
          type: "string",
          enum: ["none", "api-key", "bearer", "basic"],
          description: "Type of authentication to use",
          default: "none",
        },
        apiKey: {
          type: "string",
          description: "API key (for api-key auth type)",
        },
        apiKeyHeader: {
          type: "string",
          description: "Header name for API key (default: X-API-Key)",
          default: "X-API-Key",
        },
        bearerToken: {
          type: "string",
          description: "Bearer token (for bearer auth type)",
        },
        username: {
          type: "string",
          description: "Username (for basic auth type)",
        },
        password: {
          type: "string",
          description: "Password (for basic auth type)",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "rest_api_delete",
    description: "Make a DELETE request to any REST API to delete a resource. Supports authentication, custom headers, and optional request body.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The full URL to make the DELETE request to",
        },
        body: {
          description: "Optional request body",
        },
        headers: {
          type: "object",
          description: "Custom headers to include in the request",
          additionalProperties: { type: "string" },
        },
        queryParams: {
          type: "object",
          description: "Query parameters to append to the URL",
          additionalProperties: { type: ["string", "number", "boolean"] },
        },
        timeout: {
          type: "number",
          description: "Request timeout in milliseconds (default: 30000)",
          default: 30000,
        },
        authType: {
          type: "string",
          enum: ["none", "api-key", "bearer", "basic"],
          description: "Type of authentication to use",
          default: "none",
        },
        apiKey: {
          type: "string",
          description: "API key (for api-key auth type)",
        },
        apiKeyHeader: {
          type: "string",
          description: "Header name for API key (default: X-API-Key)",
          default: "X-API-Key",
        },
        bearerToken: {
          type: "string",
          description: "Bearer token (for bearer auth type)",
        },
        username: {
          type: "string",
          description: "Username (for basic auth type)",
        },
        password: {
          type: "string",
          description: "Password (for basic auth type)",
        },
      },
      required: ["url"],
    },
  },
];

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "rest_api_get": {
        const params = GetRequestSchema.parse(args);
        const config = buildRequestConfig("GET", params);
        const response = await axios(config);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(formatResponse(response), null, 2),
            },
          ],
        };
      }

      case "rest_api_post": {
        const params = PostRequestSchema.parse(args);
        const config = buildRequestConfig("POST", params);
        const response = await axios(config);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(formatResponse(response), null, 2),
            },
          ],
        };
      }

      case "rest_api_put": {
        const params = PutRequestSchema.parse(args);
        const config = buildRequestConfig("PUT", params);
        const response = await axios(config);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(formatResponse(response), null, 2),
            },
          ],
        };
      }

      case "rest_api_patch": {
        const params = PatchRequestSchema.parse(args);
        const config = buildRequestConfig("PATCH", params);
        const response = await axios(config);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(formatResponse(response), null, 2),
            },
          ],
        };
      }

      case "rest_api_delete": {
        const params = DeleteRequestSchema.parse(args);
        const config = buildRequestConfig("DELETE", params);
        const response = await axios(config);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(formatResponse(response), null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorResponse = formatError(error);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(errorResponse, null, 2),
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("REST API MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
