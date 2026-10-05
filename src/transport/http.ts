import express, { Request, Response } from 'express';
import cors from 'cors';
import http from 'http';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { E2EConfig } from '../config.js';
import { createE2EMcpServer } from '../server.js';

export function runHttpServer(config: E2EConfig): http.Server {
  const app = express();
  const { server, client } = createE2EMcpServer(config);
  const startTime = Date.now();

  app.use(cors());

  // Store active SSE sessions
  const sessions = new Map<string, SSEServerTransport>();

  // 1. Health check endpoint
  app.get('/health', async (_req: Request, res: Response) => {
    const cfg = client.getConfig();
    res.json({
      status: 'healthy',
      server: 'e2e-networks-mcp-server',
      version: '1.0.0',
      uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
      auth_configured: Boolean(cfg.apiKey && cfg.authToken),
      api_key_configured: Boolean(cfg.apiKey),
      auth_token_configured: Boolean(cfg.authToken),
      default_project_id: cfg.projectId ?? null,
      default_location: cfg.location,
      active_sse_sessions: sessions.size,
      endpoints: {
        sse: '/sse',
        messages: '/messages',
        health: '/health',
        test: '/api/test',
        dashboard: '/',
      },
    });
  });

  // 2. Connectivity test endpoint
  app.get('/api/test', async (_req: Request, res: Response) => {
    const result = await client.testConnection();
    res.status(result.ok ? 200 : 503).json(result);
  });

  // 3. SSE Stream Endpoint for MCP Clients
  app.get('/sse', async (req: Request, res: Response) => {
    console.log(`[E2E MCP Server] New SSE connection from ${req.ip}`);
    try {
      const transport = new SSEServerTransport('/messages', res);
      const sessionId = transport.sessionId;
      sessions.set(sessionId, transport);

      transport.onclose = () => {
        console.log(`[E2E MCP Server] SSE Session closed: ${sessionId}`);
        sessions.delete(sessionId);
      };

      await server.connect(transport);
      await transport.start();
      console.log(`[E2E MCP Server] SSE Session active: ${sessionId}`);
    } catch (err: any) {
      console.error('[E2E MCP Server] Error establishing SSE connection:', err);
      if (!res.headersSent) {
        res.status(500).send('Failed to initialize SSE stream');
      }
    }
  });

  // 4. Message Endpoint for MCP Clients
  app.post('/messages', async (req: Request, res: Response) => {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) {
      res.status(400).send('Missing sessionId query parameter');
      return;
    }

    const transport = sessions.get(sessionId);
    if (!transport) {
      res.status(404).send(`Session not found: ${sessionId}`);
      return;
    }

    try {
      await transport.handlePostMessage(req, res);
    } catch (err: any) {
      console.error(`[E2E MCP Server] Error handling post message for ${sessionId}:`, err);
      if (!res.headersSent) {
        res.status(500).send('Internal server error processing message');
      }
    }
  });

  // 5. Interactive Web Dashboard
  app.get('/', (_req: Request, res: Response) => {
    const cfg = client.getConfig();
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>E2E Networks MCP Server</title>
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --primary: #38bdf8;
      --primary-hover: #0ea5e9;
      --success: #10b981;
      --warning: #f59e0b;
      --border: #334155;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      margin: 0;
      padding: 2rem;
      line-height: 1.6;
    }
    .container {
      max-width: 1000px;
      margin: 0 auto;
    }
    header {
      border-bottom: 1px solid var(--border);
      padding-bottom: 1.5rem;
      margin-bottom: 2rem;
    }
    h1 {
      margin: 0 0 0.5rem 0;
      font-size: 2rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .badge {
      font-size: 0.85rem;
      font-weight: 600;
      padding: 0.25rem 0.6rem;
      border-radius: 9999px;
      background: #0284c7;
      color: white;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.9rem;
      padding: 0.35rem 0.8rem;
      border-radius: 0.375rem;
      font-weight: 500;
    }
    .status-ok { background: #064e3b; color: #6ee7b7; border: 1px solid #059669; }
    .status-warn { background: #451a03; color: #fcd34d; border: 1px solid #d97706; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 0.75rem;
      padding: 1.5rem;
    }
    .card h2 {
      margin-top: 0;
      font-size: 1.25rem;
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.5rem;
      color: var(--primary);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 0.5rem;
    }
    td {
      padding: 0.5rem 0;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    td:first-child {
      color: var(--text-muted);
      width: 45%;
    }
    td:last-child {
      font-family: monospace;
      font-weight: 600;
    }
    code, pre {
      background: #090d16;
      border: 1px solid var(--border);
      border-radius: 0.375rem;
      padding: 0.2rem 0.4rem;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.9rem;
    }
    pre {
      padding: 1rem;
      overflow-x: auto;
    }
    .tool-tag {
      display: inline-block;
      background: #1e3a5f;
      color: #93c5fd;
      border: 1px solid #2563eb;
      border-radius: 0.25rem;
      padding: 0.15rem 0.4rem;
      font-size: 0.8rem;
      margin: 0.2rem 0.2rem 0.2rem 0;
      font-family: monospace;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>
        ⚡ E2E Networks MCP Server
        <span class="badge">v1.0.0</span>
      </h1>
      <p style="color: var(--text-muted); margin: 0;">
        Model Context Protocol (MCP) abstraction layer between Claude and the E2E Networks Cloud & TIR AI Platform REST APIs.
      </p>
    </header>

    <div class="grid">
      <div class="card">
        <h2>Server Status</h2>
        <table>
          <tr>
            <td>Service Status</td>
            <td><span class="status-badge status-ok">● Online & Ready</span></td>
          </tr>
          <tr>
            <td>Transport</td>
            <td>HTTP / Server-Sent Events (SSE)</td>
          </tr>
          <tr>
            <td>SSE Endpoint</td>
            <td><code>/sse</code></td>
          </tr>
          <tr>
            <td>Messages Endpoint</td>
            <td><code>/messages</code></td>
          </tr>
          <tr>
            <td>Health Check</td>
            <td><a href="/health" style="color: var(--primary);">/health</a></td>
          </tr>
          <tr>
            <td>Active Sessions</td>
            <td>${sessions.size}</td>
          </tr>
        </table>
      </div>

      <div class="card">
        <h2>E2E Cloud Integration</h2>
        <table>
          <tr>
            <td>API Key</td>
            <td>${cfg.apiKey ? '●●●●●●●● (Configured)' : '<span style="color: #f87171;">Missing</span>'}</td>
          </tr>
          <tr>
            <td>Auth Token</td>
            <td>${cfg.authToken ? '●●●●●●●● (Configured)' : '<span style="color: #f87171;">Missing</span>'}</td>
          </tr>
          <tr>
            <td>Default Project ID</td>
            <td>${cfg.projectId ?? 'None (Default Account)'}</td>
          </tr>
          <tr>
            <td>Default Location</td>
            <td><code>${cfg.location}</code></td>
          </tr>
          <tr>
            <td>MyAccount Base URL</td>
            <td><code>${cfg.myaccountBaseUrl}</code></td>
          </tr>
          <tr>
            <td>TIR Base URL</td>
            <td><code>${cfg.tirBaseUrl}</code></td>
          </tr>
        </table>
      </div>
    </div>

    <div class="card" style="margin-bottom: 2rem;">
      <h2>Exposed MCP Tools for Claude</h2>
      <div style="margin-bottom: 1rem;">
        <strong>Compute & GPU:</strong><br>
        <span class="tool-tag">e2e_list_nodes</span>
        <span class="tool-tag">e2e_get_node</span>
        <span class="tool-tag">e2e_create_node</span>
        <span class="tool-tag">e2e_node_action</span>
        <span class="tool-tag">e2e_delete_node</span>
        <span class="tool-tag">e2e_list_plans</span>
        <span class="tool-tag">e2e_list_os_images</span>
        <span class="tool-tag">e2e_get_node_health</span>
      </div>
      <div style="margin-bottom: 1rem;">
        <strong>Storage (Block, Object, SFS):</strong><br>
        <span class="tool-tag">e2e_list_volumes</span>
        <span class="tool-tag">e2e_create_volume</span>
        <span class="tool-tag">e2e_attach_volume</span>
        <span class="tool-tag">e2e_detach_volume</span>
        <span class="tool-tag">e2e_delete_volume</span>
        <span class="tool-tag">e2e_list_buckets</span>
        <span class="tool-tag">e2e_create_bucket</span>
        <span class="tool-tag">e2e_delete_bucket</span>
        <span class="tool-tag">e2e_list_sfs</span>
      </div>
      <div style="margin-bottom: 1rem;">
        <strong>Networking & Security:</strong><br>
        <span class="tool-tag">e2e_list_vpcs</span>
        <span class="tool-tag">e2e_create_vpc</span>
        <span class="tool-tag">e2e_delete_vpc</span>
        <span class="tool-tag">e2e_list_reserved_ips</span>
        <span class="tool-tag">e2e_action_reserved_ip</span>
        <span class="tool-tag">e2e_list_security_groups</span>
        <span class="tool-tag">e2e_attach_security_group</span>
        <span class="tool-tag">e2e_detach_security_group</span>
        <span class="tool-tag">e2e_list_load_balancers</span>
      </div>
      <div style="margin-bottom: 1rem;">
        <strong>Databases (DBaaS):</strong><br>
        <span class="tool-tag">e2e_list_databases</span>
        <span class="tool-tag">e2e_get_database</span>
        <span class="tool-tag">e2e_create_database</span>
        <span class="tool-tag">e2e_database_action</span>
        <span class="tool-tag">e2e_list_database_plans</span>
      </div>
      <div style="margin-bottom: 1rem;">
        <strong>Managed Kubernetes:</strong><br>
        <span class="tool-tag">e2e_list_k8s_clusters</span>
        <span class="tool-tag">e2e_get_k8s_cluster</span>
        <span class="tool-tag">e2e_list_k8s_node_pools</span>
      </div>
      <div style="margin-bottom: 1rem;">
        <strong>TIR (AI / ML & GPU Cloud):</strong><br>
        <span class="tool-tag">e2e_tir_list_notebooks</span>
        <span class="tool-tag">e2e_tir_create_notebook</span>
        <span class="tool-tag">e2e_tir_notebook_action</span>
        <span class="tool-tag">e2e_tir_list_gpu_skus</span>
        <span class="tool-tag">e2e_tir_list_model_endpoints</span>
        <span class="tool-tag">e2e_tir_list_datasets</span>
        <span class="tool-tag">e2e_tir_list_training_clusters</span>
      </div>
      <div>
        <strong>Platform & Universal REST:</strong><br>
        <span class="tool-tag">e2e_list_projects</span>
        <span class="tool-tag">e2e_get_billing_summary</span>
        <span class="tool-tag">e2e_test_connection</span>
        <span class="tool-tag" style="background: #3b1d5c; border-color: #9333ea; color: #d8b4fe;">e2e_raw_request</span> (invokes ANY of the 450+ E2E REST endpoints)
      </div>
    </div>

    <div class="card">
      <h2>Claude Configuration</h2>
      <p>To connect Claude Desktop via SSE, add this to your <code>claude_desktop_config.json</code>:</p>
      <pre><code>{
  "mcpServers": {
    "e2e-cloud": {
      "url": "http://localhost:${config.port}/sse"
    }
  }
}</code></pre>
      <p>Or to run locally via Stdio (direct command):</p>
      <pre><code>{
  "mcpServers": {
    "e2e-cloud": {
      "command": "node",
      "args": ["${process.cwd()}/dist/index.js"],
      "env": {
        "E2E_API_KEY": "YOUR_API_KEY",
        "E2E_AUTH_TOKEN": "YOUR_AUTH_TOKEN",
        "E2E_PROJECT_ID": "YOUR_PROJECT_ID",
        "E2E_LOCATION": "DEL-1"
      }
    }
  }
}</code></pre>
    </div>
  </div>
</body>
</html>`;
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  });

  const httpServer = app.listen(config.port, config.host, () => {
    console.log(`[E2E MCP Server] HTTP/SSE Server running on http://${config.host}:${config.port}`);
    console.log(`[E2E MCP Server] SSE Endpoint: http://${config.host}:${config.port}/sse`);
    console.log(`[E2E MCP Server] Health Endpoint: http://${config.host}:${config.port}/health`);
    console.log(`[E2E MCP Server] Web Dashboard: http://${config.host}:${config.port}/`);
  });

  return httpServer;
}
