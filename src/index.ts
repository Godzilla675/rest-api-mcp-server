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
import FormData from "form-data";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

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

// File upload schema
const FileUploadSchema = BaseRequestSchema.extend({
  filePath: z.string().describe("Absolute path to the file to upload"),
  fileFieldName: z.string().optional().default("file").describe("Name of the file field in the form (default: 'file')"),
  formFields: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe("Additional form fields to include with the file upload"),
});

// File download schema
const FileDownloadSchema = BaseRequestSchema.extend({
  savePath: z.string().describe("Absolute path where the downloaded file should be saved"),
  responseType: z.enum(["arraybuffer", "stream"]).optional().default("arraybuffer").describe("How to handle the response (default: arraybuffer)"),
});

// Form-urlencoded schema
const FormUrlencodedSchema = BaseRequestSchema.extend({
  formData: z.record(z.union([z.string(), z.number(), z.boolean()])).describe("Form data as key-value pairs"),
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

// Helper function to retry requests with exponential backoff
async function retryRequest<T>(
  requestFn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on 4xx errors (client errors)
      if (axios.isAxiosError(error) && error.response?.status && error.response.status >= 400 && error.response.status < 500) {
        throw error;
      }
      
      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

// Helper function to handle file upload with multipart/form-data
async function uploadFile(params: z.infer<typeof FileUploadSchema>): Promise<AxiosResponse> {
  const form = new FormData();
  
  // Read and append the file
  const filePath = resolve(params.filePath);
  const fileBuffer = readFileSync(filePath);
  form.append(params.fileFieldName || "file", fileBuffer, {
    filename: filePath.split(/[\\/]/).pop(),
  });
  
  // Append additional form fields if provided
  if (params.formFields) {
    for (const [key, value] of Object.entries(params.formFields)) {
      form.append(key, String(value));
    }
  }
  
  const config: AxiosRequestConfig = {
    method: "POST",
    url: params.url,
    data: form,
    headers: {
      ...form.getHeaders(),
      ...(params.headers || {}),
    },
    params: params.queryParams,
    timeout: params.timeout,
  };
  
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
  }
  
  return await retryRequest(() => axios(config));
}

// Helper function to download file
async function downloadFile(params: z.infer<typeof FileDownloadSchema>): Promise<any> {
  const config = buildRequestConfig("GET", params);
  config.responseType = params.responseType || "arraybuffer";
  
  const response = await retryRequest(() => axios(config));
  
  // Save the file
  const savePath = resolve(params.savePath);
  writeFileSync(savePath, response.data);
  
  return {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    savedTo: savePath,
    size: response.data.length,
  };
}

// Create server instance
const server = new Server(
  {
    name: "rest-api-mcp-server",
    version: "1.1.0",
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
    description: "Make a GET request to any REST API. IMPORTANT: Before using this tool, read the API documentation first to understand endpoints, required parameters, authentication methods, and response formats. Supports authentication (API key, Bearer token, Basic auth), custom headers, and query parameters.",
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
    description: "Make a POST request to any REST API with request body. IMPORTANT: Before using this tool, read the API documentation first to understand endpoints, required body structure, authentication methods, and response formats. Supports authentication, custom headers, and query parameters.",
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
    description: "Make a PUT request to any REST API to update a resource. IMPORTANT: Before using this tool, read the API documentation first to understand endpoints, required body structure, authentication methods, and response formats. Supports authentication, custom headers, and request body.",
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
    description: "Make a PATCH request to any REST API to partially update a resource. IMPORTANT: Before using this tool, read the API documentation first to understand endpoints, required body structure, authentication methods, and response formats. Supports authentication, custom headers, and request body.",
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
    description: "Make a DELETE request to any REST API to delete a resource. IMPORTANT: Before using this tool, read the API documentation first to understand endpoints, authentication methods, and any required parameters. Supports authentication, custom headers, and optional request body.",
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
  {
    name: "rest_api_upload_file",
    description: "Upload a file (including images, documents, etc.) to a REST API using multipart/form-data. IMPORTANT: Before using this tool, read the API documentation to understand the expected file field name, supported file types, size limits, and any required form fields. Perfect for image uploads, document uploads, and file attachments.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The full URL to upload the file to",
        },
        filePath: {
          type: "string",
          description: "Absolute path to the file to upload (e.g., C:\\Users\\Name\\image.jpg or /home/user/image.png)",
        },
        fileFieldName: {
          type: "string",
          description: "Name of the file field in the form (default: 'file'). Check API docs for the correct field name.",
          default: "file",
        },
        formFields: {
          type: "object",
          description: "Additional form fields to include with the file upload (e.g., description, tags, metadata)",
          additionalProperties: { type: ["string", "number", "boolean"] },
        },
        headers: {
          type: "object",
          description: "Custom headers to include (Content-Type will be set automatically for multipart/form-data)",
          additionalProperties: { type: "string" },
        },
        queryParams: {
          type: "object",
          description: "Query parameters to append to the URL",
          additionalProperties: { type: ["string", "number", "boolean"] },
        },
        timeout: {
          type: "number",
          description: "Request timeout in milliseconds (default: 30000, increase for large files)",
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
      required: ["url", "filePath"],
    },
  },
  {
    name: "rest_api_download_file",
    description: "Download a file from a REST API and save it locally. IMPORTANT: Before using this tool, read the API documentation to understand authentication requirements, rate limits, and file size limits. Supports downloading images, PDFs, documents, archives, and any binary data.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The full URL to download the file from",
        },
        savePath: {
          type: "string",
          description: "Absolute path where the downloaded file should be saved (e.g., C:\\Users\\Name\\download.jpg)",
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
          description: "Request timeout in milliseconds (default: 30000, increase for large files)",
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
      required: ["url", "savePath"],
    },
  },
  {
    name: "rest_api_form_urlencoded",
    description: "Submit form data using application/x-www-form-urlencoded content type. IMPORTANT: Before using this tool, read the API documentation to understand the required form fields and their format. Commonly used for traditional HTML form submissions and OAuth token requests.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The full URL to submit the form to",
        },
        formData: {
          type: "object",
          description: "Form data as key-value pairs",
          additionalProperties: { type: ["string", "number", "boolean"] },
        },
        headers: {
          type: "object",
          description: "Custom headers to include (Content-Type will be set automatically)",
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
      required: ["url", "formData"],
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
        const response = await retryRequest(() => axios(config));
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
        const response = await retryRequest(() => axios(config));
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
        const response = await retryRequest(() => axios(config));
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
        const response = await retryRequest(() => axios(config));
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
        const response = await retryRequest(() => axios(config));
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(formatResponse(response), null, 2),
            },
          ],
        };
      }

      case "rest_api_upload_file": {
        const params = FileUploadSchema.parse(args);
        const response = await uploadFile(params);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(formatResponse(response), null, 2),
            },
          ],
        };
      }

      case "rest_api_download_file": {
        const params = FileDownloadSchema.parse(args);
        const result = await downloadFile(params);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "rest_api_form_urlencoded": {
        const params = FormUrlencodedSchema.parse(args);
        const urlSearchParams = new URLSearchParams();
        for (const [key, value] of Object.entries(params.formData)) {
          urlSearchParams.append(key, String(value));
        }
        
        const config: AxiosRequestConfig = {
          method: "POST",
          url: params.url,
          data: urlSearchParams.toString(),
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            ...(params.headers || {}),
          },
          params: params.queryParams,
          timeout: params.timeout,
        };

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
        }

        const response = await retryRequest(() => axios(config));
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
