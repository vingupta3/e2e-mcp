import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { E2EClient } from '../client/e2e-client.js';

export function registerPlatformTools(server: McpServer, client: E2EClient): void {
  // 1. List Projects
  server.tool(
    'e2e_list_projects',
    'List all available IAM projects and access control scopes in your E2E Cloud account.',
    {
      location: z.string().optional().describe('Location/region code.'),
    },
    async (args) => {
      try {
        const response = await client.request({
          method: 'GET',
          path: '/api/v1/pbac/projects-header/',
          location: args.location,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to list projects: ${error.message}` }],
        };
      }
    }
  );

  // 2. Billing Summary
  server.tool(
    'e2e_get_billing_summary',
    'Get estimated monthly usage, prepaid credits balance, or billing summary.',
    {
      project_id: z.number().optional().describe('Project ID.'),
      location: z.string().optional().describe('Location/region code.'),
    },
    async (args) => {
      try {
        const response = await client.request({
          method: 'GET',
          path: '/api/v1/billing/prepaid/monthly-estimate/',
          projectId: args.project_id,
          location: args.location,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to get billing summary: ${error.message}` }],
        };
      }
    }
  );

  // 3. Test Connection
  server.tool(
    'e2e_test_connection',
    'Verify that the MCP server can authenticate and connect to the E2E Networks Cloud REST API.',
    {},
    async () => {
      const res = await client.testConnection();
      return {
        isError: !res.ok,
        content: [
          {
            type: 'text',
            text: JSON.stringify(res, null, 2),
          },
        ],
      };
    }
  );
}
