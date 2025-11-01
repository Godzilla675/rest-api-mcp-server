#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { z } from "zod";
import FormData from "form-data";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const AuthTypeSchema = z.enum(["none", "api-key", "bearer", "basic"]);
type AuthType = z.infer<typeof AuthTypeSchema>;

const HeaderSchema = z.record(z.string());
const QueryParamsSchema = z.record(z.union([z.string(), z.number(), z.boolean()]));

const RestApiRequestSchema = z.object({
  url: z.string().url(),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("GET"),
  body: z.any().optional(),
  headers: HeaderSchema.optional(),
  queryParams: QueryParamsSchema.optional(),
  contentType: z.string().optional(),
  saveResponseTo: z.string().optional(),
  timeout: z.number().optional().default(30000),
  authType: AuthTypeSchema.optional().default("none"),
  apiKey: z.string().optional(),
  apiKeyHeader: z.string().optional().default("X-API-Key"),
  bearerToken: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
});

const GraphQLRequestSchema = z.object({
  url: z.string().url(),
  query: z.string(),
  variables: z.record(z.any()).optional(),
  operationName: z.string().optional(),
  httpMethod: z.enum(["GET", "POST"]).optional().default("POST"),
  headers: HeaderSchema.optional(),
  queryParams: QueryParamsSchema.optional(),
  timeout: z.number().optional().default(30000),
  authType: AuthTypeSchema.optional().default("none"),
  apiKey: z.string().optional(),
  apiKeyHeader: z.string().optional().default("X-API-Key"),
  bearerToken: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
});

function detectContentType(body: any): string | undefined {
  if (!body) return undefined;
  if (typeof body === 'object' && body.files && Array.isArray(body.files)) {
    return 'multipart/form-data';
  }
  if (typeof body === 'object' && !Array.isArray(body)) {
    const values = Object.values(body);
    const allScalar = values.every(v => 
      typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || v === null
    );
    if (allScalar && Object.keys(body).some(k => k.includes('_') || k === 'grant_type')) {
      return 'application/x-www-form-urlencoded';
    }
  }
  return 'application/json';
}

function buildRequestConfig(params: z.infer<typeof RestApiRequestSchema>): AxiosRequestConfig {
  const config: AxiosRequestConfig = {
    method: params.method || 'GET',
    url: params.url,
    timeout: params.timeout,
    headers: params.headers ? { ...params.headers } : {},
    params: params.queryParams,
  };

  if (!config.headers!['Accept']) {
    config.headers!['Accept'] = '*/*';
  }

  let contentType = params.contentType;
  if (!contentType && params.body) {
    contentType = detectContentType(params.body);
  }

  if (params.body !== undefined) {
    if (contentType === 'multipart/form-data' && typeof params.body === 'object' && params.body.files) {
      const form = new FormData();
      for (const fileSpec of params.body.files) {
        const filePath = resolve(fileSpec.path);
        const fileBuffer = readFileSync(filePath);
        form.append(
          fileSpec.fieldName || 'file',
          fileBuffer,
          {
            filename: fileSpec.filename || filePath.split(/[\\/]/).pop(),
            contentType: fileSpec.mimeType,
          }
        );
      }
      if (params.body.fields) {
        for (const [key, value] of Object.entries(params.body.fields)) {
          form.append(key, String(value));
        }
      }
      config.data = form;
      config.headers = {
        ...config.headers,
        ...form.getHeaders(),
      };
    } else if (contentType === 'application/x-www-form-urlencoded') {
      const urlSearchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params.body)) {
        urlSearchParams.append(key, String(value));
      }
      config.data = urlSearchParams.toString();
      config.headers!['Content-Type'] = 'application/x-www-form-urlencoded';
    } else {
      config.headers!['Content-Type'] = contentType || 'application/json';
      config.data = params.body;
    }
  }

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

  if (params.saveResponseTo) {
    config.responseType = 'arraybuffer';
  }

  return config;
}

function formatResponse(response: AxiosResponse): any {
  return {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    data: response.data,
  };
}

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
      if (axios.isAxiosError(error) && error.response?.status && error.response.status >= 400 && error.response.status < 500) {
        throw error;
      }
      if (attempt === maxRetries) {
        throw error;
      }
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

const server = new Server(
  {
    name: "rest-api-mcp-server",
    version: "1.3.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const tools: Tool[] = [
  {
    name: "rest_api_request",
    description: `Universal REST API request tool. Handles ALL HTTP methods (GET, POST, PUT, PATCH, DELETE) and automatically detects content types and response types. IMPORTANT: Before using, read the API documentation. Features: Supports JSON, form-urlencoded, multipart file uploads; Auto-saves binary responses if saveResponseTo provided; Handles auth; Automatic retry. Examples: GET {url, method:"GET"}; POST {url, method:"POST", body:{data}, bearerToken}; Upload {url, method:"POST", body:{files:[{path}]}}; Download {url, method:"POST", body:{prompt}, saveResponseTo, bearerToken}; Form {url, method:"POST", body:{grant_type}, contentType:"application/x-www-form-urlencoded"}`,
    inputSchema: {
      type: "object",
      ...RestApiRequestSchema.shape,
    } as any,
  },
  {
    name: "rest_api_graphql",
    description: `Execute GraphQL queries and mutations. IMPORTANT: Read API docs first. Supports queries, mutations, variables, operation names, GET/POST methods, all auth types. Example: {url, query, variables, bearerToken}`,
    inputSchema: {
      type: "object",
      ...GraphQLRequestSchema.shape,
    } as any,
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    switch (name) {
      case "rest_api_request": {
        const params = RestApiRequestSchema.parse(args);
        const config = buildRequestConfig(params);
        const response = await retryRequest(() => axios(config));
        if (params.saveResponseTo) {
          const savePath = resolve(params.saveResponseTo);
          writeFileSync(savePath, response.data);
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
                savedTo: savePath,
                size: response.data.length,
              }, null, 2),
            }],
          };
        }
        return {
          content: [{
            type: "text",
            text: JSON.stringify(formatResponse(response), null, 2),
          }],
        };
      }
      case "rest_api_graphql": {
        const params = GraphQLRequestSchema.parse(args);
        const { queryParams, query, variables, operationName, httpMethod } = params;
        const method = (httpMethod || "POST").toUpperCase();
        if (method === "GET") {
          const combinedQueryParams: Record<string, any> = {
            ...(queryParams || {}),
            query,
          };
          if (variables) combinedQueryParams.variables = JSON.stringify(variables);
          if (operationName) combinedQueryParams.operationName = operationName;
          const config: AxiosRequestConfig = {
            method: "GET",
            url: params.url,
            params: combinedQueryParams,
            timeout: params.timeout,
            headers: { 'Accept': '*/*', ...(params.headers || {}) },
          };
          switch (params.authType) {
            case "api-key":
              if (params.apiKey) config.headers![params.apiKeyHeader || "X-API-Key"] = params.apiKey;
              break;
            case "bearer":
              if (params.bearerToken) config.headers!["Authorization"] = `Bearer ${params.bearerToken}`;
              break;
            case "basic":
              if (params.username && params.password) config.auth = { username: params.username, password: params.password };
              break;
          }
          const response = await retryRequest(() => axios(config));
          return {
            content: [{
              type: "text",
              text: JSON.stringify(formatResponse(response), null, 2),
            }],
          };
        } else {
          const requestBody: Record<string, any> = { query };
          if (variables) requestBody.variables = variables;
          if (operationName) requestBody.operationName = operationName;
          const config: AxiosRequestConfig = {
            method: "POST",
            url: params.url,
            data: requestBody,
            params: queryParams,
            timeout: params.timeout,
            headers: { "Content-Type": "application/json", 'Accept': '*/*', ...(params.headers || {}) },
          };
          switch (params.authType) {
            case "api-key":
              if (params.apiKey) config.headers![params.apiKeyHeader || "X-API-Key"] = params.apiKey;
              break;
            case "bearer":
              if (params.bearerToken) config.headers!["Authorization"] = `Bearer ${params.bearerToken}`;
              break;
            case "basic":
              if (params.username && params.password) config.auth = { username: params.username, password: params.password };
              break;
          }
          const response = await retryRequest(() => axios(config));
          return {
            content: [{
              type: "text",
              text: JSON.stringify(formatResponse(response), null, 2),
            }],
          };
        }
      }
      default:
        return {
          content: [{
            type: "text",
            text: `Unknown tool: ${name}`,
          }],
          isError: true,
        };
    }
  } catch (error: any) {
    return {
      content: [{
        type: "text",
        text: JSON.stringify(formatError(error), null, 2),
      }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("REST API MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
