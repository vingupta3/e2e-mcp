#!/usr/bin/env node
import { loadConfig } from './config.js';
import { runStdioServer } from './transport/stdio.js';
import { runHttpServer } from './transport/http.js';
import { runConfigureCli } from './cli/configure.js';
import { runInstallCli } from './cli/install.js';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  // Route subcommands
  if (command === 'configure') {
    await runConfigureCli(args.slice(1));
    return;
  }

  if (command === 'install') {
    await runInstallCli(args.slice(1));
    return;
  }

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
E2E Networks Cloud Model Context Protocol (MCP) Server (AWS-style integration)

Usage:
  e2e-mcp [command] [options]

Commands:
  configure            Interactive/flag configuration wizard (saves to ~/.e2e/credentials)
  install              Auto-configure Claude Desktop and Cursor config files

Modes:
  --stdio              Run in Stdio transport mode (default for Claude Desktop & Cursor)
  --http, --sse        Host as an HTTP & SSE server (default port 3000)

Options:
  --profile <name>     Specify configuration profile (default: "default")
  --port <number>      HTTP port when running in HTTP mode (overrides PORT env)
  --host <string>      HTTP host (default: 0.0.0.0)
  --help, -h           Show this help message

AWS-Style Profile Resolution:
  1. CLI parameters / tool arguments
  2. Environment variables (E2E_API_KEY, E2E_AUTH_TOKEN)
  3. Local .env file
  4. ~/.e2e/credentials and ~/.e2e/config profiles ([default], [realbetter-account], etc.)

Examples:
  # Configure credentials like "aws configure":
  npx e2e-mcp configure --profile realbetter-account

  # Install into Claude Desktop and Cursor automatically:
  npx e2e-mcp install --profile realbetter-account

  # Run standard stdio server:
  npx e2e-mcp --profile realbetter-account
`);
    process.exit(0);
  }

  // Extract --profile if specified
  let profile: string | undefined;
  const profileIndex = args.indexOf('--profile');
  if (profileIndex !== -1 && args[profileIndex + 1]) {
    profile = args[profileIndex + 1];
  }

  const config = loadConfig(profile);

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
