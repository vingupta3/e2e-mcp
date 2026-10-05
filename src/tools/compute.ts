import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { E2EClient } from '../client/e2e-client.js';

export function registerComputeTools(server: McpServer, client: E2EClient): void {
  // 1. List Nodes
  server.tool(
    'e2e_list_nodes',
    'List all compute nodes (virtual machines and GPU instances) in your E2E Cloud project, including status, IP addresses, plans, and regions.',
    {
      project_id: z.number().optional().describe('Project ID to filter by. Defaults to configured default project.'),
      location: z.string().optional().describe('Location/region code (e.g. "DEL-1", "NCR-1"). Defaults to configured location.'),
    },
    async (args) => {
      try {
        const response = await client.request({
          method: 'GET',
          path: '/api/v1/nodes/',
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
          content: [{ type: 'text', text: `Failed to list nodes: ${error.message}` }],
        };
      }
    }
  );

  // 2. Get Node Details
  server.tool(
    'e2e_get_node',
    'Get detailed information about a specific compute node by its ID (specs, status, public/private IPs, attached disks, security groups).',
    {
      node_id: z.string().describe('The ID or VM ID of the compute node to inspect.'),
      project_id: z.number().optional().describe('Project ID.'),
      location: z.string().optional().describe('Location/region code (e.g. "DEL-1").'),
    },
    async (args) => {
      try {
        const response = await client.request({
          method: 'GET',
          path: `/api/v1/nodes/${args.node_id}/`,
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
          content: [{ type: 'text', text: `Failed to get node details for ${args.node_id}: ${error.message}` }],
        };
      }
    }
  );

  // 3. Create Node
  server.tool(
    'e2e_create_node',
    'Launch and provision a new compute node or GPU instance on E2E Cloud.',
    {
      name: z.string().describe('Host name for the compute node (alphanumeric and hyphens).'),
      plan: z.string().describe('Compute/GPU plan identifier (e.g. "C3.8GB", "C3-4vCPU-8RAM-100DISK", "GPU-H100.80GB"). Use e2e_list_plans to view available plans.'),
      image: z.string().describe('Operating system template or saved image (e.g. "Ubuntu-22.04", "Ubuntu-24.04", "CentOS-7"). Use e2e_list_os_images to view options.'),
      region: z.string().default('ncr').describe('Target region code (e.g. "ncr", "del"). Defaults to "ncr".'),
      ssh_keys: z.array(z.string()).optional().describe('List of SSH public key IDs or names to inject for root login.'),
      disk: z.number().optional().describe('Additional root disk size in GB.'),
      is_committed: z.boolean().optional().default(false).describe('Whether to provision as committed pricing rather than hourly on-demand.'),
      number_of_instances: z.number().optional().default(1).describe('Number of instances to create (default 1).'),
      vpc_id: z.string().optional().describe('Optional VPC Network ID to attach.'),
      subnet_id: z.string().optional().describe('Optional Subnet ID within the VPC.'),
      security_group_id: z.string().optional().describe('Optional Security Group ID to attach.'),
      default_public_ip: z.boolean().optional().default(true).describe('Whether to allocate a public IP address (default true).'),
      project_id: z.number().optional().describe('Project ID.'),
      location: z.string().optional().describe('Location/region code (e.g. "DEL-1").'),
    },
    async (args) => {
      try {
        const body: Record<string, any> = {
          name: args.name,
          plan: args.plan,
          image: args.image,
          region: args.region,
          number_of_instances: args.number_of_instances,
          ssh_keys: args.ssh_keys || [],
        };

        if (args.disk) body.disk = args.disk;
        if (args.vpc_id) body.vpc_id = args.vpc_id;
        if (args.subnet_id) body.subnet_id = args.subnet_id;
        if (args.security_group_id) body.security_group_id = args.security_group_id;
        if (args.default_public_ip !== undefined) body.default_public_ip = args.default_public_ip;
        if (args.is_committed) body.label = 'committed';

        const response = await client.request({
          method: 'POST',
          path: '/api/v1/nodes/',
          body,
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
          content: [{ type: 'text', text: `Failed to create node ${args.name}: ${error.message}` }],
        };
      }
    }
  );

  // 4. Perform Node Action
  server.tool(
    'e2e_node_action',
    'Execute a lifecycle action on a compute node: power_off, power_on, reboot, reinstall, save_images, rename, lock, or unlock.',
    {
      node_id: z.string().describe('ID of the compute node.'),
      action: z.enum(['power_off', 'power_on', 'reboot', 'reinstall', 'save_images', 'rename', 'lock', 'unlock', 'enable_recovery_mode', 'disable_recovery_mode']).describe('Lifecycle action to perform.'),
      name: z.string().optional().describe('New name (required only when action is "rename" or "save_images").'),
      project_id: z.number().optional().describe('Project ID.'),
      location: z.string().optional().describe('Location/region code.'),
    },
    async (args) => {
      try {
        const body: Record<string, any> = {
          type: args.action,
        };
        if (args.name) {
          body.name = args.name;
        }

        const response = await client.request({
          method: 'PUT',
          path: `/api/v1/nodes/${args.node_id}/actions/`,
          body,
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
          content: [{ type: 'text', text: `Action "${args.action}" failed on node ${args.node_id}: ${error.message}` }],
        };
      }
    }
  );

  // 5. Delete Node
  server.tool(
    'e2e_delete_node',
    'Terminate and delete a compute node from E2E Cloud. Warning: This permanently removes the node and its local disk.',
    {
      node_id: z.string().describe('ID of the node to delete.'),
      project_id: z.number().optional().describe('Project ID.'),
      location: z.string().optional().describe('Location/region code.'),
    },
    async (args) => {
      try {
        const response = await client.request({
          method: 'DELETE',
          path: `/api/v1/nodes/${args.node_id}/`,
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
          content: [{ type: 'text', text: `Failed to delete node ${args.node_id}: ${error.message}` }],
        };
      }
    }
  );

  // 6. List Plans
  server.tool(
    'e2e_list_plans',
    'List available compute plans, GPU instances, CPU/RAM configurations, and pricing options.',
    {
      category: z.string().optional().describe('Filter by category (e.g. "Linux", "GPU", "Windows").'),
      project_id: z.number().optional().describe('Project ID.'),
      location: z.string().optional().describe('Location/region code.'),
    },
    async (args) => {
      try {
        const response = await client.request({
          method: 'GET',
          path: '/api/v1/images/',
          queryParams: { category: args.category },
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
          content: [{ type: 'text', text: `Failed to list plans: ${error.message}` }],
        };
      }
    }
  );

  // 7. List OS Images
  server.tool(
    'e2e_list_os_images',
    'List available OS categories, distributions (Ubuntu, Debian, CentOS, AlmaLinux, Windows), and version templates.',
    {
      project_id: z.number().optional().describe('Project ID.'),
      location: z.string().optional().describe('Location/region code.'),
    },
    async (args) => {
      try {
        const response = await client.request({
          method: 'GET',
          path: '/api/v1/images/os-category/',
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
          content: [{ type: 'text', text: `Failed to list OS categories: ${error.message}` }],
        };
      }
    }
  );

  // 8. Get Node Health
  server.tool(
    'e2e_get_node_health',
    'Retrieve server health information and metrics (CPU utilization, memory usage, disk space) for a node.',
    {
      node_id: z.string().describe('ID of the compute node.'),
      project_id: z.number().optional().describe('Project ID.'),
      location: z.string().optional().describe('Location/region code.'),
    },
    async (args) => {
      try {
        const response = await client.request({
          method: 'GET',
          path: `/api/v1/nodes/${args.node_id}/monitor/server-health-info/`,
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
          content: [{ type: 'text', text: `Failed to get health info for node ${args.node_id}: ${error.message}` }],
        };
      }
    }
  );
}
