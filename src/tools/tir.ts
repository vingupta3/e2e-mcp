import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { E2EClient } from '../client/e2e-client.js';

export function registerTIRTools(server: McpServer, client: E2EClient): void {
  // 1. List AI Labs / Notebooks
  server.tool(
    'e2e_tir_list_notebooks',
    'List all AI Labs and Jupyter notebook instances in E2E TIR (AI/ML platform).',
    {
      page_no: z.number().optional().default(1).describe('Page number.'),
      per_page: z.number().optional().default(20).describe('Items per page.'),
      instance_category: z.string().optional().default('notebook').describe('Category filter (default: "notebook").'),
      status: z.string().optional().describe('Filter by status (e.g. "running", "stopped").'),
      project_id: z.number().optional().describe('Project ID.'),
      location: z.string().optional().describe('Location/region code.'),
    },
    async (args) => {
      try {
        const response = await client.request({
          method: 'GET',
          path: '/notebooks/',
          service: 'tir',
          queryParams: {
            page_no: args.page_no,
            per_page: args.per_page,
            instance_category: args.instance_category,
            status: args.status,
          },
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
          content: [{ type: 'text', text: `Failed to list TIR notebooks: ${error.message}` }],
        };
      }
    }
  );

  // 2. Create AI Lab / Notebook Instance
  server.tool(
    'e2e_tir_create_notebook',
    'Provision an AI Lab instance with GPU acceleration (PyTorch, TensorFlow, vLLM, etc.) in E2E TIR.',
    {
      name: z.string().describe('Instance name identifier.'),
      sku_name: z.string().describe('GPU SKU identifier (e.g. "H100-SXM5-80GB", "A100-SXM4-80GB", "L40S-48GB", "A40-48GB", "L4-24GB"). Use e2e_tir_list_gpu_skus to list options.'),
      image_version_id: z.string().optional().describe('Framework image template ID.'),
      disk_size: z.number().optional().default(50).describe('Storage disk size in GB.'),
      is_jupyterlab_enabled: z.boolean().optional().default(true).describe('Enable JupyterLab environment.'),
      project_id: z.number().optional().describe('Project ID.'),
      location: z.string().optional().describe('Location/region code.'),
    },
    async (args) => {
      try {
        const body: Record<string, any> = {
          name: args.name,
          sku_name: args.sku_name,
          cluster_type: 'tir-cluster',
          image_type: 'pre-built',
          is_jupyterlab_enabled: args.is_jupyterlab_enabled,
          storage: args.disk_size,
        };
        if (args.image_version_id) body.image_version_id = args.image_version_id;

        const response = await client.request({
          method: 'POST',
          path: '/notebooks/',
          service: 'tir',
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
          content: [{ type: 'text', text: `Failed to create TIR notebook instance "${args.name}": ${error.message}` }],
        };
      }
    }
  );

  // 3. Notebook Actions
  server.tool(
    'e2e_tir_notebook_action',
    'Execute a control action (start, stop, reboot, attach_reserve_ip) on an AI Lab notebook instance.',
    {
      instance_id: z.string().describe('Notebook instance ID.'),
      action: z.enum(['start', 'stop', 'reboot', 'attach_reserve_ip', 'detach_reserve_ip']).describe('Action to execute.'),
      project_id: z.number().optional().describe('Project ID.'),
      location: z.string().optional().describe('Location/region code.'),
    },
    async (args) => {
      try {
        const response = await client.request({
          method: 'PUT',
          path: `/notebooks/${args.instance_id}/actions/`,
          service: 'tir',
          queryParams: { action: args.action },
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
          content: [{ type: 'text', text: `Failed to perform action "${args.action}" on notebook ${args.instance_id}: ${error.message}` }],
        };
      }
    }
  );

  // 4. List GPU SKUs
  server.tool(
    'e2e_tir_list_gpu_skus',
    'List available NVIDIA GPU hardware SKUs on E2E TIR (H100, A100, L40S, A40, A30, L4, V100, T4) with pricing and specs.',
    {
      service: z.string().optional().default('notebook').describe('Service type filter (e.g. "notebook", "endpoint", "cluster").'),
      project_id: z.number().optional().describe('Project ID.'),
      location: z.string().optional().describe('Location/region code.'),
    },
    async (args) => {
      try {
        const response = await client.request({
          method: 'GET',
          path: '/gpu_service/sku/',
          service: 'tir',
          queryParams: { service: args.service },
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
          content: [{ type: 'text', text: `Failed to list GPU SKUs: ${error.message}` }],
        };
      }
    }
  );

  // 5. List Model Endpoints
  server.tool(
    'e2e_tir_list_model_endpoints',
    'List deployed model inference endpoints in E2E TIR (e.g., vLLM or HuggingFace endpoints).',
    {
      project_id: z.number().optional().describe('Project ID.'),
      location: z.string().optional().describe('Location/region code.'),
    },
    async (args) => {
      try {
        const response = await client.request({
          method: 'GET',
          path: '/serving/model/',
          service: 'tir',
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
          content: [{ type: 'text', text: `Failed to list model endpoints: ${error.message}` }],
        };
      }
    }
  );

  // 6. List Datasets
  server.tool(
    'e2e_tir_list_datasets',
    'List all datasets stored in E2E TIR for AI/ML training and fine-tuning.',
    {
      project_id: z.number().optional().describe('Project ID.'),
      location: z.string().optional().describe('Location/region code.'),
    },
    async (args) => {
      try {
        const response = await client.request({
          method: 'GET',
          path: '/datasets/',
          service: 'tir',
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
          content: [{ type: 'text', text: `Failed to list datasets: ${error.message}` }],
        };
      }
    }
  );

  // 7. List Training Clusters
  server.tool(
    'e2e_tir_list_training_clusters',
    'List managed Slurm / distributed GPU training clusters in E2E TIR.',
    {
      project_id: z.number().optional().describe('Project ID.'),
      location: z.string().optional().describe('Location/region code.'),
    },
    async (args) => {
      try {
        const response = await client.request({
          method: 'GET',
          path: '/distributed_jobs_v2/cluster/',
          service: 'tir',
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
          content: [{ type: 'text', text: `Failed to list training clusters: ${error.message}` }],
        };
      }
    }
  );
}
