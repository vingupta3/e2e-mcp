import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { E2EClient } from '../client/e2e-client.js';
import {
  parseIniFile,
  writeIniFile,
  getE2ECredentialsPath,
  getE2EConfigPath,
} from '../config.js';

export function registerPlatformTools(server: McpServer, client: E2EClient): void {
  // 1. List Projects
  server.tool(
    'e2e_list_projects',
    'List all available IAM projects and access control scopes in your E2E Cloud account.',
    {
      location: z.string().optional().describe('Location/region code (optional: if omitted, queries across all regions).'),
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
      project_id: z.number().optional().describe('Project ID (optional: if omitted, checks across default/all projects).'),
      location: z.string().optional().describe('Location/region code (optional: if omitted, checks across all regions).'),
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

  // 4. Configure Credentials via AI Assistant
  server.tool(
    'e2e_configure_credentials',
    'Configure E2E Networks API credentials in ~/.e2e/credentials and ~/.e2e/config. ' +
    'Allows any AI assistant (Google Antigravity, Claude, Cursor, Codex) to set up or update API credentials directly. ' +
    'location and project_id are optional and should be omitted to allow searching across all projects and locations.',
    {
      api_key: z.string().describe('Your E2E API Key (from MyAccount -> Security / API Tokens).'),
      auth_token: z.string().describe('Your E2E Auth Token (Bearer token).'),
      profile: z.string().optional().default('rb-e2e-account').describe('Configuration profile name (default: "rb-e2e-account").'),
      project_id: z.number().optional().describe('Default Project ID (optional: leave empty to query across default/all projects).'),
      location: z.string().optional().describe('Default Region/Location (optional: leave empty to search across all locations).'),
    },
    async (args) => {
      try {
        const profile = args.profile || 'rb-e2e-account';
        const credentialsPath = getE2ECredentialsPath();
        const configPath = getE2EConfigPath();

        const credentialsAll = parseIniFile(credentialsPath);
        const configAll = parseIniFile(configPath);

        if (!credentialsAll[profile]) credentialsAll[profile] = {};
        credentialsAll[profile]['api_key'] = args.api_key;
        credentialsAll[profile]['auth_token'] = args.auth_token;

        if (!configAll[profile]) configAll[profile] = {};
        if (args.project_id !== undefined) {
          configAll[profile]['project_id'] = String(args.project_id);
        } else {
          delete configAll[profile]['project_id'];
        }

        if (args.location) {
          configAll[profile]['location'] = args.location;
        } else {
          delete configAll[profile]['location'];
        }

        writeIniFile(credentialsPath, credentialsAll, false);
        writeIniFile(configPath, configAll, true);

        // Instantly update live in-memory client
        client.updateConfig({
          profile,
          apiKey: args.api_key,
          authToken: args.auth_token,
          projectId: args.project_id,
          location: args.location,
        });

        // Test connection live
        const testRes = await client.testConnection();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  profile,
                  credentials_file: credentialsPath,
                  config_file: configPath,
                  project_id: args.project_id ?? 'all/default (unrestricted)',
                  location: args.location ?? 'all/default (unrestricted)',
                  connection_test: testRes,
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
          content: [{ type: 'text', text: `Failed to configure credentials: ${error.message}` }],
        };
      }
    }
  );
}
