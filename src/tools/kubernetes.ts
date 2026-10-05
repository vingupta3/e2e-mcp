import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { E2EClient } from '../client/e2e-client.js';

export function registerKubernetesTools(server: McpServer, client: E2EClient): void {
  // 1. List Kubernetes Clusters
  server.tool(
    'e2e_list_k8s_clusters',
    'List all managed Kubernetes clusters in your E2E Cloud project.',
    {
      project_id: z.number().optional().describe('Project ID.'),
      location: z.string().optional().describe('Location/region code.'),
    },
    async (args) => {
      try {
        const response = await client.request({
          method: 'GET',
          path: '/api/v1/kubernetes/',
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
          content: [{ type: 'text', text: `Failed to list Kubernetes clusters: ${error.message}` }],
        };
      }
    }
  );

  // 2. Get Kubernetes Cluster Details
  server.tool(
    'e2e_get_k8s_cluster',
    'Get detailed information about a managed Kubernetes cluster by its service ID.',
    {
      service_id: z.string().describe('Kubernetes service ID.'),
      project_id: z.number().optional().describe('Project ID.'),
      location: z.string().optional().describe('Location/region code.'),
    },
    async (args) => {
      try {
        const response = await client.request({
          method: 'GET',
          path: `/api/v1/kubernetes/${args.service_id}`,
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
          content: [{ type: 'text', text: `Failed to get cluster details for ${args.service_id}: ${error.message}` }],
        };
      }
    }
  );

  // 3. List Node Pools
  server.tool(
    'e2e_list_k8s_node_pools',
    'List all node pools attached to a managed Kubernetes cluster.',
    {
      service_id: z.string().describe('Kubernetes service ID.'),
      project_id: z.number().optional().describe('Project ID.'),
      location: z.string().optional().describe('Location/region code.'),
    },
    async (args) => {
      try {
        const response = await client.request({
          method: 'GET',
          path: `/api/v1/kubernetes/node-pool-services/${args.service_id}`,
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
          content: [{ type: 'text', text: `Failed to list node pools for cluster ${args.service_id}: ${error.message}` }],
        };
      }
    }
  );
}
