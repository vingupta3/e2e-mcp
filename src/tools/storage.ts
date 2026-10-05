import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { E2EClient } from '../client/e2e-client.js';

export function registerStorageTools(server: McpServer, client: E2EClient): void {
  // 1. List Volumes
  server.tool(
    'e2e_list_volumes',
    'List all block storage volumes in your E2E Cloud project (size, IOPS, attached node status, filesystem).',
    {
      page_no: z.number().optional().default(1).describe('Page number for pagination.'),
      per_page: z.number().optional().default(20).describe('Number of items per page.'),
      project_id: z.number().optional().describe('Project ID.'),
      location: z.string().optional().describe('Location/region code.'),
    },
    async (args) => {
      try {
        const response = await client.request({
          method: 'GET',
          path: '/api/v1/block_storage/',
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
          content: [{ type: 'text', text: `Failed to list volumes: ${error.message}` }],
        };
      }
    }
  );

  // 2. Create Volume
  server.tool(
    'e2e_create_volume',
    'Create an independent block storage volume on E2E Cloud.',
    {
      name: z.string().describe('Volume name identifier.'),
      size: z.number().describe('Volume size in GB (e.g. 50, 100, 250, 500, 1000).'),
      iops: z.number().default(3000).describe('Provisioned IOPS (e.g. 3000, 5000).'),
      project_id: z.number().optional().describe('Project ID.'),
      location: z.string().optional().describe('Location/region code.'),
    },
    async (args) => {
      try {
        const response = await client.request({
          method: 'POST',
          path: '/api/v1/block_storage/',
          body: {
            name: args.name,
            size: args.size,
            iops: args.iops,
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
          content: [{ type: 'text', text: `Failed to create volume "${args.name}": ${error.message}` }],
        };
      }
    }
  );

  // 3. Attach Volume
  server.tool(
    'e2e_attach_volume',
    'Attach a block storage volume to a compute node (VM).',
    {
      block_id: z.string().describe('Block volume ID.'),
      vm_id: z.number().describe('Target node / VM ID to attach the volume to.'),
      project_id: z.number().optional().describe('Project ID.'),
      location: z.string().optional().describe('Location/region code.'),
    },
    async (args) => {
      try {
        const response = await client.request({
          method: 'PUT',
          path: `/api/v1/block_storage/${args.block_id}/vm/attach/`,
          body: { vm_id: args.vm_id },
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
          content: [{ type: 'text', text: `Failed to attach volume ${args.block_id} to VM ${args.vm_id}: ${error.message}` }],
        };
      }
    }
  );

  // 4. Detach Volume
  server.tool(
    'e2e_detach_volume',
    'Detach a block storage volume from a compute node.',
    {
      block_id: z.string().describe('Block volume ID.'),
      vm_id: z.number().describe('Node / VM ID the volume is currently attached to.'),
      project_id: z.number().optional().describe('Project ID.'),
      location: z.string().optional().describe('Location/region code.'),
    },
    async (args) => {
      try {
        const response = await client.request({
          method: 'PUT',
          path: `/api/v1/block_storage/${args.block_id}/vm/detach/`,
          body: { vm_id: args.vm_id },
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
          content: [{ type: 'text', text: `Failed to detach volume ${args.block_id}: ${error.message}` }],
        };
      }
    }
  );

  // 5. Delete Volume
  server.tool(
    'e2e_delete_volume',
    'Permanently delete an unattached block storage volume.',
    {
      block_id: z.string().describe('Block volume ID.'),
      project_id: z.number().optional().describe('Project ID.'),
      location: z.string().optional().describe('Location/region code.'),
    },
    async (args) => {
      try {
        const response = await client.request({
          method: 'DELETE',
          path: `/api/v1/block_storage/${args.block_id}/`,
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
          content: [{ type: 'text', text: `Failed to delete volume ${args.block_id}: ${error.message}` }],
        };
      }
    }
  );

  // 6. List Object Storage Buckets
  server.tool(
    'e2e_list_buckets',
    'List all EOS (E2E Object Storage) S3-compatible buckets in your account.',
    {
      project_id: z.number().optional().describe('Project ID.'),
      location: z.string().optional().describe('Location/region code.'),
    },
    async (args) => {
      try {
        const response = await client.request({
          method: 'GET',
          path: '/api/v1/storage/buckets/',
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
          content: [{ type: 'text', text: `Failed to list buckets: ${error.message}` }],
        };
      }
    }
  );

  // 7. Create Object Storage Bucket
  server.tool(
    'e2e_create_bucket',
    'Create an EOS (E2E Object Storage) bucket.',
    {
      bucket_name: z.string().describe('Unique name for the bucket.'),
      is_lock_enabled: z.boolean().optional().default(false).describe('Enable Object Lock.'),
      is_versioning_enabled: z.boolean().optional().default(false).describe('Enable Bucket Versioning.'),
      is_encryption_enabled: z.boolean().optional().default(true).describe('Enable Server-Side Encryption.'),
      project_id: z.number().optional().describe('Project ID.'),
      location: z.string().optional().describe('Location/region code.'),
    },
    async (args) => {
      try {
        const response = await client.request({
          method: 'POST',
          path: `/api/v1/storage/buckets/${args.bucket_name}/`,
          body: {
            is_lock_enabled: args.is_lock_enabled,
            is_versioning_enabled: args.is_versioning_enabled,
            is_encryption_enabled: args.is_encryption_enabled,
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
          content: [{ type: 'text', text: `Failed to create bucket ${args.bucket_name}: ${error.message}` }],
        };
      }
    }
  );

  // 8. Delete Object Storage Bucket
  server.tool(
    'e2e_delete_bucket',
    'Delete an EOS object storage bucket. The bucket must be empty before deletion.',
    {
      bucket_name: z.string().describe('Name of the bucket to delete.'),
      project_id: z.number().optional().describe('Project ID.'),
      location: z.string().optional().describe('Location/region code.'),
    },
    async (args) => {
      try {
        const response = await client.request({
          method: 'DELETE',
          path: `/api/v1/storage/buckets/${args.bucket_name}/`,
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
          content: [{ type: 'text', text: `Failed to delete bucket ${args.bucket_name}: ${error.message}` }],
        };
      }
    }
  );

  // 9. List Shared File Systems (SFS)
  server.tool(
    'e2e_list_sfs',
    'List all SFS (Shared File System / Elastic File Storage) instances.',
    {
      project_id: z.number().optional().describe('Project ID.'),
      location: z.string().optional().describe('Location/region code.'),
    },
    async (args) => {
      try {
        const response = await client.request({
          method: 'GET',
          path: '/api/v1/efs/',
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
          content: [{ type: 'text', text: `Failed to list SFS file systems: ${error.message}` }],
        };
      }
    }
  );
}
