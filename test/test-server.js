#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const serverPath = join(__dirname, '..', 'dist', 'index.js');

console.log('Testing REST API MCP Server...\n');

// Start the MCP server
const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'inherit']
});

let outputBuffer = '';
let requestId = 1;

server.stdout.on('data', (data) => {
  outputBuffer += data.toString();
  
  // Process complete JSON messages
  const lines = outputBuffer.split('\n');
  outputBuffer = lines.pop() || ''; // Keep incomplete line in buffer
  
  for (const line of lines) {
    if (line.trim()) {
      try {
        const response = JSON.parse(line);
        console.log('Response:', JSON.stringify(response, null, 2));
        
        // Check if this is a tool call response
        if (response.result && response.result.content) {
          const content = response.result.content[0];
          if (content.type === 'text') {
            const result = JSON.parse(content.text);
            console.log('\nAPI Response Data:');
            console.log('Status:', result.status);
            console.log('Data:', JSON.stringify(result.data, null, 2));
          }
        }
      } catch (e) {
        // Ignore non-JSON lines (like the stderr message)
      }
    }
  }
});

function sendRequest(method, params) {
  const request = {
    jsonrpc: '2.0',
    id: requestId++,
    method: method,
    params: params
  };
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Sending ${method} request:`);
  console.log(JSON.stringify(request, null, 2));
  console.log('='.repeat(60));
  
  server.stdin.write(JSON.stringify(request) + '\n');
}

// Wait a bit for server to start
setTimeout(() => {
  // Test 1: Initialize
  sendRequest('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: {
      name: 'test-client',
      version: '1.0.0'
    }
  });

  setTimeout(() => {
    // Test 2: List tools
    sendRequest('tools/list', {});

    setTimeout(() => {
      // Test 3: GET request to JSONPlaceholder (no auth required)
      sendRequest('tools/call', {
        name: 'rest_api_request',
        arguments: {
          url: 'https://jsonplaceholder.typicode.com/posts/1',
          method: 'GET'
        }
      });

      setTimeout(() => {
        // Test 4: GET request with query parameters
        sendRequest('tools/call', {
          name: 'rest_api_request',
          arguments: {
            url: 'https://jsonplaceholder.typicode.com/posts',
            method: 'GET',
            queryParams: {
              userId: 1,
              _limit: 3
            }
          }
        });

        setTimeout(() => {
          // Test 5: POST request
          sendRequest('tools/call', {
            name: 'rest_api_request',
            arguments: {
              url: 'https://jsonplaceholder.typicode.com/posts',
              method: 'POST',
              body: {
                title: 'Test Post',
                body: 'This is a test post',
                userId: 1
              }
            }
          });

          setTimeout(() => {
            // Test 6: PUT request
            sendRequest('tools/call', {
              name: 'rest_api_request',
              arguments: {
                url: 'https://jsonplaceholder.typicode.com/posts/1',
                method: 'PUT',
                body: {
                  id: 1,
                  title: 'Updated Post',
                  body: 'This is an updated post',
                  userId: 1
                }
              }
            });

            setTimeout(() => {
              // Test 7: DELETE request
              sendRequest('tools/call', {
                name: 'rest_api_request',
                arguments: {
                  url: 'https://jsonplaceholder.typicode.com/posts/1',
                  method: 'DELETE'
                }
              });

              setTimeout(() => {
                // Test 8: GraphQL request
                sendRequest('tools/call', {
                  name: 'rest_api_graphql',
                  arguments: {
                    url: 'https://countries.trevorblades.com/',
                    query: 'query GetCountry($code: ID!) { country(code: $code) { name capital } }',
                    variables: {
                      code: 'US'
                    }
                  }
                });

                setTimeout(() => {
                  console.log('\n' + '='.repeat(60));
                  console.log('All tests completed!');
                  console.log('='.repeat(60));
                  server.kill();
                  process.exit(0);
                }, 2000);
              }, 2000);
            }, 2000);
          }, 2000);
        }, 2000);
      }, 2000);
    }, 1000);
  }, 1000);
}, 1000);

// Handle server exit
server.on('close', (code) => {
  console.log(`\nServer process exited with code ${code}`);
});

// Handle errors
server.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  server.kill();
  process.exit(0);
});
