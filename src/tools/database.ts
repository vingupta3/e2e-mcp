import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { E2EClient } from '../client/e2e-client.js';

export function registerDatabaseTools(server: McpServer, client: E2EClient): void {
  // 1. List Managed Databases
  server.tool(
    'e2e_list_databases',
    'List all managed database clusters (DBaaS) in your project (MySQL, PostgreSQL, MariaDB, Kafka, Valkey, OpenSearch).',
    {
      project_id: z.number().optional().describe('Project ID.'),
      location: z.string().optional().describe('Location/region code.'),
    },
    async (args) => {
      try {
        const response = await client.requestAcrossLocations({
          method: 'GET',
          path: '/api/v1/rds/cluster/',
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
          content: [{ type: 'text', text: `Failed to list database clusters: ${error.message}` }],
        };
      }
    }
  );

  // 2. Get Database Details
  server.tool(
    'e2e_get_database',
    'Get detailed information, topology, connection endpoints, and health of a managed database cluster.',
    {
      cluster_id: z.string().describe('ID of the database cluster.'),
      project_id: z.number().optional().describe('Project ID.'),
      location: z.string().optional().describe('Location/region code.'),
    },
    async (args) => {
      try {
        const response = await client.request({
          method: 'GET',
          path: `/api/v1/rds/cluster/${args.cluster_id}/`,
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
          content: [{ type: 'text', text: `Failed to get database details for cluster ${args.cluster_id}: ${error.message}` }],
        };
      }
    }
  );

  // 3. Create Database Cluster
  server.tool(
    'e2e_create_database',
    'Provision a managed database cluster (MySQL, PostgreSQL, etc.).',
    {
      name: z.string().describe('Name of the database cluster.'),
      software_id: z.string().describe('Database engine software ID (e.g. MySQL, PostgreSQL).'),
      template_id: z.string().describe('Hardware sizing plan template ID.'),
      public_ip_required: z.boolean().default(false).describe('Whether to allocate a public IP address for the database.'),
      vpcs: z.array(z.string()).optional().describe('VPC IDs to associate with the cluster.'),
      project_id: z.number().optional().describe('Project ID.'),
      location: z.string().optional().describe('Location/region code.'),
    },
    async (args) => {
      try {
        const response = await client.request({
          method: 'POST',
          path: '/api/v1/rds/cluster/',
          body: {
            name: args.name,
            software_id: args.software_id,
            template_id: args.template_id,
            public_ip_required: args.public_ip_required,
            vpcs: args.vpcs || [],
          },
          projectId: args.project_id,
          location: args.location,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.data || response.raw, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to create database cluster "${args.name}": ${error.message}` }],
        };
      }
    }
  );

  // 4. Database Action (start, stop, restart)
  server.tool(
    'e2e_database_action',
    'Execute a control action (start, stop, restart) on a managed database cluster.',
    {
      cluster_id: z.string().describe('ID of the database cluster.'),
      action: z.enum(['start', 'stop', 'restart']).describe('Action to perform.'),
      project_id: z.number().optional().describe('Project ID.'),
      location: z.string().optional().describe('Location/region code.'),
    },
    async (args) => {
      try {
        const response = await client.request({
          method: 'POST',
          path: `/api/v1/rds/cluster/${args.cluster_id}/${args.action}`,
          projectId: args.project_id,
          location: args.location,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.data || response.raw, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to perform action "${args.action}" on database cluster ${args.cluster_id}: ${error.message}` }],
        };
      }
    }
  );

  // 5. List Database Plans
  server.tool(
    'e2e_list_database_plans',
    'List available DBaaS database sizing plans, engine versions, and pricing.',
    {
      project_id: z.number().optional().describe('Project ID.'),
      location: z.string().optional().describe('Location/region code.'),
    },
    async (args) => {
      try {
        const response = await client.request({
          method: 'GET',
          path: '/api/v1/rds/plans/',
          projectId: args.project_id,
          location: args.location || 'Delhi',
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
          content: [{ type: 'text', text: `Failed to list database plans: ${error.message}` }],
        };
      }
    }
  );
}
