import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { E2EClient } from '../client/e2e-client.js';

export function registerRawRequestTool(server: McpServer, client: E2EClient): void {
  server.tool(
    'e2e_raw_request',
    'Execute a direct, authenticated HTTP request against ANY E2E Networks Cloud REST API endpoint (MyAccount or TIR AI platform). ' +
    'Automatically handles authentication (API key + Bearer token), project scoping, and error normalization. ' +
    'Consult the E2E API docs (https://docs.e2enetworks.com/api/myaccount/ or https://docs.e2enetworks.com/api/tir/) for specific path structures.',
    {
      method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).describe('HTTP method to use.'),
      path: z.string().describe('API path (e.g. "/api/v1/nodes/" for MyAccount or "/notebooks/" for TIR).'),
      service: z.enum(['myaccount', 'tir']).default('myaccount').describe('Target service: "myaccount" (Core Cloud) or "tir" (AI/ML Platform).'),
      queryParams: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query parameters to include in the request URL.'),
      body: z.record(z.string(), z.any()).optional().describe('Optional JSON request body for POST/PUT/PATCH/DELETE requests.'),
      project_id: z.number().optional().describe('Override project ID for this request.'),
      location: z.string().optional().describe('Override location/region code for this request.'),
    },
    async (args) => {
      try {
        const response = await client.request({
          method: args.method,
          path: args.path,
          service: args.service,
          queryParams: args.queryParams,
          body: args.body,
          projectId: args.project_id,
          location: args.location,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  status: response.status,
                  data: response.data,
                  raw: response.raw,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Raw request failed (${args.method} ${args.path}): ${error.message}\nDetails: ${JSON.stringify(error.details || {}, null, 2)}`,
            },
          ],
        };
      }
    }
  );
}
