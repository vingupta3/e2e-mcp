import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { E2EClient } from '../client/e2e-client.js';

export function registerNetworkTools(server: McpServer, client: E2EClient): void {
  // 1. List VPCs
  server.tool(
    'e2e_list_vpcs',
    'List all Virtual Private Clouds (VPCs) in your E2E Cloud project.',
    {
      page_no: z.number().optional().default(1).describe('Page number.'),
      per_page: z.number().optional().default(20).describe('Items per page.'),
      project_id: z.number().optional().describe('Project ID.'),
      location: z.string().optional().describe('Location/region code.'),
    },
    async (args) => {
      try {
        const response = await client.requestAcrossLocations({
          method: 'GET',
          path: '/api/v1/vpc/list/',
          queryParams: { page_no: args.page_no, per_page: args.per_page },
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
          content: [{ type: 'text', text: `Failed to list VPCs: ${error.message}` }],
        };
      }
    }
  );

  // 2. Create VPC
  server.tool(
    'e2e_create_vpc',
    'Create a new Virtual Private Cloud (VPC) network.',
    {
      vpc_name: z.string().describe('Name of the VPC network.'),
      ipv4: z.string().optional().describe('Custom IPv4 CIDR block (e.g. "10.10.0.0/23"). Omit if is_e2e_vpc is true.'),
      is_e2e_vpc: z.boolean().optional().default(false).describe('If true, CIDR will be assigned automatically by E2E.'),
      project_id: z.number().optional().describe('Project ID.'),
      location: z.string().optional().describe('Location/region code.'),
    },
    async (args) => {
      try {
        const body: Record<string, any> = {
          vpc_name: args.vpc_name,
          is_e2e_vpc: args.is_e2e_vpc,
        };
        if (args.ipv4 && !args.is_e2e_vpc) {
          body.ipv4 = args.ipv4;
        }

        const response = await client.request({
          method: 'POST',
          path: '/api/v1/vpc/',
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
          content: [{ type: 'text', text: `Failed to create VPC "${args.vpc_name}": ${error.message}` }],
        };
      }
    }
  );

  // 3. Delete VPC
  server.tool(
    'e2e_delete_vpc',
    'Delete a VPC network by its network ID.',
    {
      vpc_network_id: z.string().describe('VPC Network ID to delete.'),
      project_id: z.number().optional().describe('Project ID.'),
      location: z.string().optional().describe('Location/region code.'),
    },
    async (args) => {
      try {
        const response = await client.request({
          method: 'DELETE',
          path: `/api/v1/vpc/${args.vpc_network_id}/`,
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
          content: [{ type: 'text', text: `Failed to delete VPC ${args.vpc_network_id}: ${error.message}` }],
        };
      }
    }
  );

  // 4. List Reserved IPs
  server.tool(
    'e2e_list_reserved_ips',
    'List all reserved (static public) IP addresses in your project.',
    {
      project_id: z.number().optional().describe('Project ID.'),
      location: z.string().optional().describe('Location/region code.'),
    },
    async (args) => {
      try {
        const response = await client.requestAcrossLocations({
          method: 'GET',
          path: '/api/v1/reserve_ips/',
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
          content: [{ type: 'text', text: `Failed to list reserved IPs: ${error.message}` }],
        };
      }
    }
  );

  // 5. Action Reserved IP (Attach, Detach, Live Reserve)
  server.tool(
    'e2e_action_reserved_ip',
    'Attach, detach, or live-reserve a static public IP to/from a compute node or load balancer.',
    {
      ip_address: z.string().describe('The reserved IP address (e.g. "203.0.113.10").'),
      vm_id: z.number().describe('Target node / VM ID.'),
      type: z.enum(['attach', 'detach', 'live-reserve']).describe('Action type: "attach", "detach", or "live-reserve".'),
      project_id: z.number().optional().describe('Project ID.'),
      location: z.string().optional().describe('Location/region code.'),
    },
    async (args) => {
      try {
        const response = await client.request({
          method: 'POST',
          path: `/api/v1/reserve_ips/${args.ip_address}/actions/`,
          body: {
            vm_id: args.vm_id,
            type: args.type,
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
          content: [{ type: 'text', text: `Failed to perform ${args.type} on IP ${args.ip_address}: ${error.message}` }],
        };
      }
    }
  );

  // 6. List Attached Security Groups for a Node
  server.tool(
    'e2e_list_security_groups',
    'List security groups attached to or available for a specific compute node.',
    {
      vm_id: z.number().describe('Compute node VM ID.'),
      type: z.enum(['attached', 'available']).default('attached').describe('List "attached" or "available" security groups.'),
      project_id: z.number().optional().describe('Project ID.'),
      location: z.string().optional().describe('Location/region code.'),
    },
    async (args) => {
      try {
        const subPath = args.type === 'available' ? 'detach' : 'attach';
        const response = await client.request({
          method: 'GET',
          path: `/api/v1/security_group/${args.vm_id}/${subPath}/`,
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
          content: [{ type: 'text', text: `Failed to list security groups for VM ${args.vm_id}: ${error.message}` }],
        };
      }
    }
  );

  // 7. Attach Security Group to Node
  server.tool(
    'e2e_attach_security_group',
    'Attach a security group to a compute node.',
    {
      vm_id: z.number().describe('Compute node VM ID.'),
      security_group_id: z.string().describe('Security group ID to attach.'),
      project_id: z.number().optional().describe('Project ID.'),
      location: z.string().optional().describe('Location/region code.'),
    },
    async (args) => {
      try {
        const response = await client.request({
          method: 'POST',
          path: `/api/v1/security_group/${args.vm_id}/attach/`,
          body: { security_group_id: args.security_group_id },
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
          content: [{ type: 'text', text: `Failed to attach security group to VM ${args.vm_id}: ${error.message}` }],
        };
      }
    }
  );

  // 8. Detach Security Group from Node
  server.tool(
    'e2e_detach_security_group',
    'Detach a security group from a compute node.',
    {
      vm_id: z.number().describe('Compute node VM ID.'),
      security_group_id: z.string().describe('Security group ID to detach.'),
      project_id: z.number().optional().describe('Project ID.'),
      location: z.string().optional().describe('Location/region code.'),
    },
    async (args) => {
      try {
        const response = await client.request({
          method: 'POST',
          path: `/api/v1/security_group/${args.vm_id}/detach/`,
          body: { security_group_id: args.security_group_id },
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
          content: [{ type: 'text', text: `Failed to detach security group from VM ${args.vm_id}: ${error.message}` }],
        };
      }
    }
  );

  // 9. List Load Balancers
  server.tool(
    'e2e_list_load_balancers',
    'List all managed Load Balancers (Application Load Balancers and Network Load Balancers) in your project.',
    {
      project_id: z.number().optional().describe('Project ID.'),
      location: z.string().optional().describe('Location/region code.'),
    },
    async (args) => {
      try {
        const response = await client.requestAcrossLocations({
          method: 'GET',
          path: '/api/v1/appliances/',
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
          content: [{ type: 'text', text: `Failed to list load balancers: ${error.message}` }],
        };
      }
    }
  );
}
