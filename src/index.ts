#!/usr/bin/env node
import { loadConfig } from './config.js';
import { runStdioServer } from './transport/stdio.js';
import { runHttpServer } from './transport/http.js';

async function main() {
  const args = process.argv.slice(2);
  const config = loadConfig();

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
E2E Networks Cloud Model Context Protocol (MCP) Server

Usage:
  e2e-mcp [options]

Modes:
  --stdio              Run in Stdio transport mode (default for Claude Desktop / CLI)
  --http, --sse        Host as an HTTP & SSE server (default port 3000)

Options:
  --port <number>      HTTP port when running in HTTP mode (overrides PORT env)
  --host <string>      HTTP host (default: 0.0.0.0)
  --help, -h           Show this help message

Environment Variables:
  E2E_API_KEY          Your E2E Networks API Key (from MyAccount -> Security / API Tokens)
  E2E_AUTH_TOKEN       Your E2E Networks Auth/Bearer Token
  E2E_PROJECT_ID       Default Project ID to scope operations to
  E2E_LOCATION         Default Cloud location (e.g. DEL-1, NCR-1, default: DEL-1)
  PORT                 HTTP port for hosted mode (default: 3000)
`);
    process.exit(0);
  }

  // Parse custom port if provided
  const portIndex = args.indexOf('--port');
  if (portIndex !== -1 && args[portIndex + 1]) {
    config.port = parseInt(args[portIndex + 1], 10);
  }

  const hostIndex = args.indexOf('--host');
  if (hostIndex !== -1 && args[hostIndex + 1]) {
    config.host = args[hostIndex + 1];
  }

  const isHttp = args.includes('--http') || args.includes('--sse') || process.env.MCP_TRANSPORT === 'http';

  if (isHttp) {
    runHttpServer(config);
  } else {
    await runStdioServer(config);
  }
}

main().catch((err) => {
  console.error('[E2E MCP Server] Fatal error:', err);
  process.exit(1);
});
