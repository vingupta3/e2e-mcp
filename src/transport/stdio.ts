import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { E2EConfig } from '../config.js';
import { createE2EMcpServer } from '../server.js';

export async function runStdioServer(config: E2EConfig): Promise<void> {
  const { server } = createE2EMcpServer(config);
  const transport = new StdioServerTransport();

  // Log to stderr because stdout is reserved for JSON-RPC in stdio mode
  console.error('[E2E MCP Server] Starting in stdio mode...');
  console.error(`[E2E MCP Server] Default Project: ${config.projectId ?? 'None (Default account project)'}`);
  console.error(`[E2E MCP Server] Default Location: ${config.location}`);
  console.error(`[E2E MCP Server] Auth configured: ${Boolean(config.apiKey && config.authToken)}`);

  await server.connect(transport);
  console.error('[E2E MCP Server] Connected to stdio transport and ready for requests.');
}
