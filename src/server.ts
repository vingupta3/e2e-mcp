import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { E2EConfig } from './config.js';
import { E2EClient } from './client/e2e-client.js';
import { registerComputeTools } from './tools/compute.js';
import { registerStorageTools } from './tools/storage.js';
import { registerNetworkTools } from './tools/network.js';
import { registerDatabaseTools } from './tools/database.js';
import { registerKubernetesTools } from './tools/kubernetes.js';
import { registerTIRTools } from './tools/tir.js';
import { registerPlatformTools } from './tools/platform.js';
import { registerRawRequestTool } from './tools/raw.js';

export function createE2EMcpServer(config: E2EConfig): { server: McpServer; client: E2EClient } {
  const client = new E2EClient(config);

  const server = new McpServer(
    {
      name: 'e2e-networks-mcp-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    }
  );

  // Register all tool modules
  registerComputeTools(server, client);
  registerStorageTools(server, client);
  registerNetworkTools(server, client);
  registerDatabaseTools(server, client);
  registerKubernetesTools(server, client);
  registerTIRTools(server, client);
  registerPlatformTools(server, client);
  registerRawRequestTool(server, client);

  // Register MCP Resources
  server.resource(
    'e2e-status',
    'e2e://status',
    async (uri) => {
      const cfg = client.getConfig();
      const status = {
        server: 'e2e-networks-mcp-server',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        auth_configured: Boolean(cfg.apiKey && cfg.authToken),
        api_key_set: Boolean(cfg.apiKey),
        auth_token_set: Boolean(cfg.authToken),
        default_project_id: cfg.projectId ?? null,
        default_location: cfg.location,
        myaccount_base_url: cfg.myaccountBaseUrl,
        tir_base_url: cfg.tirBaseUrl,
      };

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(status, null, 2),
          },
        ],
      };
    }
  );

  server.resource(
    'e2e-architecture',
    'e2e://docs/architecture',
    async (uri) => {
      const text = `# E2E Cloud MCP Integration

Architecture:
Claude / MCP Client ➔ E2E MCP Server ➔ E2E Networks REST API ➔ Cloud Services

Endpoints Surfaces:
1. MyAccount API: https://api.e2enetworks.com/myaccount/api/v1
   - Compute: Nodes, GPU VMs, OS Plans, Images, Health
   - Storage: Block Volumes, SFS, EOS Object Storage Buckets
   - Network: VPCs, Subnets, Reserved IPs, Security Groups, Load Balancers
   - Database: Managed DBaaS (MySQL, PostgreSQL, etc.)
   - Kubernetes: Managed K8s clusters and node pools
   - Platform: IAM Projects, Billing, Quotas

2. TIR AI/ML Platform API: https://api.e2enetworks.com/myaccount/api/v1/gpu
   - AI Labs: Jupyter notebooks with GPU
   - Models: Inference endpoints & Model repository
   - Hardware: NVIDIA H100, A100, L40S, A40, L4, V100 GPU SKUs
   - Clusters: Slurm & distributed training clusters
   - Data: Datasets & Syncing
`;

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'text/markdown',
            text,
          },
        ],
      };
    }
  );

  return { server, client };
}
