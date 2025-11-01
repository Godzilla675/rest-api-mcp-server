# Usage Examples

This document provides practical examples of how to use the REST API MCP Server with various APIs.

## Table of Contents

1. [Basic GET Request](#basic-get-request)
2. [GET with Query Parameters](#get-with-query-parameters)
3. [POST Request with Body](#post-request-with-body)
4. [API Key Authentication](#api-key-authentication)
5. [Bearer Token Authentication](#bearer-token-authentication)
6. [Basic Authentication](#basic-authentication)
7. [Custom Headers](#custom-headers)
8. [PUT Request](#put-request)
9. [PATCH Request](#patch-request)
10. [DELETE Request](#delete-request)

## Basic GET Request

Fetch a single resource from a public API:

```json
{
  "name": "rest_api_get",
  "arguments": {
    "url": "https://jsonplaceholder.typicode.com/posts/1"
  }
}
```

**Response:**
```json
{
  "status": 200,
  "statusText": "OK",
  "headers": {...},
  "data": {
    "userId": 1,
    "id": 1,
    "title": "sunt aut facere repellat provident occaecati excepturi optio reprehenderit",
    "body": "quia et suscipit..."
  }
}
```

## GET with Query Parameters

Fetch multiple resources with filtering:

```json
{
  "name": "rest_api_get",
  "arguments": {
    "url": "https://jsonplaceholder.typicode.com/posts",
    "queryParams": {
      "userId": 1,
      "_limit": 5
    }
  }
}
```

This will request: `https://jsonplaceholder.typicode.com/posts?userId=1&_limit=5`

## POST Request with Body

Create a new resource:

```json
{
  "name": "rest_api_post",
  "arguments": {
    "url": "https://jsonplaceholder.typicode.com/posts",
    "body": {
      "title": "My New Post",
      "body": "This is the content of my new post",
      "userId": 1
    }
  }
}
```

**Response:**
```json
{
  "status": 201,
  "statusText": "Created",
  "data": {
    "id": 101,
    "title": "My New Post",
    "body": "This is the content of my new post",
    "userId": 1
  }
}
```

## API Key Authentication

Many APIs require an API key in a custom header:

```json
{
  "name": "rest_api_get",
  "arguments": {
    "url": "https://api.example.com/data",
    "authType": "api-key",
    "apiKey": "your-api-key-here",
    "apiKeyHeader": "X-API-Key"
  }
}
```

For APIs that use different header names:

```json
{
  "name": "rest_api_get",
  "arguments": {
    "url": "https://api.example.com/data",
    "authType": "api-key",
    "apiKey": "your-api-key-here",
    "apiKeyHeader": "Authorization"
  }
}
```

## Bearer Token Authentication

For APIs using OAuth 2.0 or JWT tokens:

```json
{
  "name": "rest_api_get",
  "arguments": {
    "url": "https://api.github.com/user",
    "authType": "bearer",
    "bearerToken": "ghp_YourGitHubPersonalAccessToken"
  }
}
```

## Basic Authentication

For APIs using HTTP Basic Authentication:

```json
{
  "name": "rest_api_get",
  "arguments": {
    "url": "https://api.example.com/protected",
    "authType": "basic",
    "username": "your-username",
    "password": "your-password"
  }
}
```

## Custom Headers

Add custom headers for special requirements:

```json
{
  "name": "rest_api_get",
  "arguments": {
    "url": "https://api.example.com/data",
    "headers": {
      "Accept": "application/json",
      "User-Agent": "MyApp/1.0",
      "X-Custom-Header": "custom-value"
    }
  }
}
```

## PUT Request

Update an entire resource:

```json
{
  "name": "rest_api_put",
  "arguments": {
    "url": "https://jsonplaceholder.typicode.com/posts/1",
    "body": {
      "id": 1,
      "title": "Updated Title",
      "body": "Completely updated content",
      "userId": 1
    },
    "authType": "bearer",
    "bearerToken": "your-token-here"
  }
}
```

## PATCH Request

Partially update a resource:

```json
{
  "name": "rest_api_patch",
  "arguments": {
    "url": "https://jsonplaceholder.typicode.com/posts/1",
    "body": {
      "title": "Only updating the title"
    }
  }
}
```

## DELETE Request

Remove a resource:

```json
{
  "name": "rest_api_delete",
  "arguments": {
    "url": "https://jsonplaceholder.typicode.com/posts/1",
    "authType": "bearer",
    "bearerToken": "your-token-here"
  }
}
```

## Real-World API Examples

### GitHub API

List user repositories:

```json
{
  "name": "rest_api_get",
  "arguments": {
    "url": "https://api.github.com/users/octocat/repos",
    "queryParams": {
      "sort": "updated",
      "per_page": 10
    }
  }
}
```

### Weather API (OpenWeatherMap)

Get weather data:

```json
{
  "name": "rest_api_get",
  "arguments": {
    "url": "https://api.openweathermap.org/data/2.5/weather",
    "queryParams": {
      "q": "London",
      "appid": "your-api-key"
    }
  }
}
```

### Stripe API

Create a customer:

```json
{
  "name": "rest_api_post",
  "arguments": {
    "url": "https://api.stripe.com/v1/customers",
    "authType": "bearer",
    "bearerToken": "sk_test_your_stripe_key",
    "body": {
      "email": "customer@example.com",
      "name": "John Doe"
    },
    "contentType": "application/x-www-form-urlencoded"
  }
}
```

### SendGrid API

Send an email:

```json
{
  "name": "rest_api_post",
  "arguments": {
    "url": "https://api.sendgrid.com/v3/mail/send",
    "authType": "bearer",
    "bearerToken": "SG.your-sendgrid-api-key",
    "body": {
      "personalizations": [
        {
          "to": [{"email": "recipient@example.com"}]
        }
      ],
      "from": {"email": "sender@example.com"},
      "subject": "Hello from MCP",
      "content": [
        {
          "type": "text/plain",
          "value": "Hello from REST API MCP Server!"
        }
      ]
    }
  }
}
```

## Error Handling

The server handles errors gracefully and returns detailed information:

```json
{
  "error": true,
  "message": "Request failed with status code 404",
  "status": 404,
  "statusText": "Not Found",
  "data": {
    "message": "Resource not found"
  }
}
```

Common error scenarios:
- Invalid URL: Returns validation error
- Network timeout: Returns timeout error
- Authentication failure: Returns 401/403 status
- Invalid JSON body: Returns parsing error
- Rate limiting: Returns 429 status

## File Upload Examples

### Upload an Image

Upload an image file with metadata:

```json
{
  "name": "rest_api_upload_file",
  "arguments": {
    "url": "https://api.example.com/upload",
    "filePath": "C:\\Users\\Name\\Pictures\\photo.jpg",
    "fileFieldName": "image",
    "formFields": {
      "title": "My Photo",
      "description": "A beautiful sunset",
      "tags": "nature,sunset,photography"
    },
    "authType": "bearer",
    "bearerToken": "your-token-here"
  }
}
```

### Upload a Document

```json
{
  "name": "rest_api_upload_file",
  "arguments": {
    "url": "https://api.example.com/documents",
    "filePath": "/home/user/documents/report.pdf",
    "fileFieldName": "file",
    "formFields": {
      "category": "reports",
      "year": 2025
    }
  }
}
```

## File Download Examples

### Download an Image

```json
{
  "name": "rest_api_download_file",
  "arguments": {
    "url": "https://example.com/images/photo.jpg",
    "savePath": "C:\\Users\\Name\\Downloads\\photo.jpg"
  }
}
```

### Download a PDF with Authentication

```json
{
  "name": "rest_api_download_file",
  "arguments": {
    "url": "https://api.example.com/reports/2025/summary.pdf",
    "savePath": "/home/user/reports/summary.pdf",
    "authType": "bearer",
    "bearerToken": "your-token-here"
  }
}
```

## Form-Urlencoded Examples

### OAuth Token Request

```json
{
  "name": "rest_api_form_urlencoded",
  "arguments": {
    "url": "https://oauth.example.com/token",
    "formData": {
      "grant_type": "client_credentials",
      "client_id": "your-client-id",
      "client_secret": "your-client-secret",
      "scope": "read write"
    }
  }
}
```

### Traditional Form Submission

```json
{
  "name": "rest_api_form_urlencoded",
  "arguments": {
    "url": "https://api.example.com/contact",
    "formData": {
      "name": "John Doe",
      "email": "john@example.com",
      "message": "Hello!",
      "subscribe": true
    }
  }
}
```

## Advanced Features

### Automatic Retry with Backoff

The server automatically retries failed requests (excluding 4xx client errors) up to 3 times with exponential backoff:
- First retry: 1 second delay
- Second retry: 2 seconds delay  
- Third retry: 4 seconds delay

### Large File Handling

For large files, increase the timeout:

```json
{
  "name": "rest_api_upload_file",
  "arguments": {
    "url": "https://api.example.com/upload",
    "filePath": "C:\\Users\\Name\\large-video.mp4",
    "timeout": 120000
  }
}
```

## Tips

1. **URL Encoding**: Query parameters are automatically URL-encoded
2. **JSON Bodies**: Objects in the `body` field are automatically stringified to JSON
3. **Timeouts**: Adjust the `timeout` parameter for slow APIs or large files (default: 30 seconds)
4. **Headers**: Custom headers override default headers
5. **Content-Type**: The `contentType` parameter sets the Content-Type header for POST/PUT/PATCH requests
6. **File Paths**: Always use absolute paths for file uploads and downloads
7. **Retry Logic**: Automatic retries work for network/server errors but not client errors (4xx)
8. **Binary Data**: File downloads handle binary data correctly for images, PDFs, videos, etc.
