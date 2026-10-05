import fs from 'fs';
import path from 'path';
import os from 'os';

export interface InstallOptions {
  profile?: string;
  target?: 'claude' | 'cursor' | 'all';
  mode?: 'stdio' | 'sse';
  port?: number;
}

export function getClaudeDesktopConfigPath(): string {
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
  } else if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'Claude', 'claude_desktop_config.json');
  } else {
    return path.join(os.homedir(), '.config', 'Claude', 'claude_desktop_config.json');
  }
}

export function getCursorConfigPath(): string {
  return path.join(os.homedir(), '.cursor', 'mcp.json');
}

function updateJsonConfig(
  filePath: string,
  serverName: string,
  serverConfig: any,
  appLabel: string
): boolean {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    let config: any = { mcpServers: {} };
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      try {
        config = JSON.parse(content);
        // Create backup
        const backupPath = `${filePath}.bak.${Date.now()}`;
        fs.writeFileSync(backupPath, content);
        console.log(`  ✓ Backup created at: ${backupPath}`);
      } catch (err) {
        console.error(`  ⚠️ Warning: Failed to parse existing ${appLabel} config at ${filePath}. Creating new backup.`);
      }
    }

    if (!config.mcpServers) {
      config.mcpServers = {};
    }

    config.mcpServers[serverName] = serverConfig;

    fs.writeFileSync(filePath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
    console.log(`  ✅ Successfully updated ${appLabel} configuration at: ${filePath}`);
    return true;
  } catch (err: any) {
    console.error(`  ❌ Failed to update ${appLabel} config at ${filePath}:`, err.message);
    return false;
  }
}

export async function runInstallCli(args: string[]): Promise<void> {
  console.log('\n🚀 Installing E2E Networks MCP Server for Claude & Cursor (AWS-style)\n');

  let profile = 'default';
  let target: 'claude' | 'cursor' | 'all' = 'all';
  let mode: 'stdio' | 'sse' = 'stdio';
  let port = 3000;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--profile' && args[i + 1]) {
      profile = args[i + 1];
      i++;
    } else if (args[i] === '--target' && args[i + 1]) {
      target = args[i + 1] as any;
      i++;
    } else if (args[i] === '--mode' && args[i + 1]) {
      mode = args[i + 1] as any;
      i++;
    } else if (args[i] === '--port' && args[i + 1]) {
      port = parseInt(args[i + 1], 10);
      i++;
    }
  }

  // Absolute path to the compiled entrypoint
  const serverPath = path.resolve(process.cwd(), 'dist', 'index.js');

  const serverArgs = [serverPath];
  if (profile && profile !== 'default') {
    serverArgs.push('--profile', profile);
  }

  const serverConfig =
    mode === 'sse'
      ? {
          url: `http://localhost:${port}/sse`,
        }
      : {
          command: 'node',
          args: serverArgs,
          env: {
            // Tell server which profile to use from ~/.e2e/credentials
            E2E_PROFILE: profile,
          },
        };

  if (target === 'claude' || target === 'all') {
    console.log(`Configuring Claude Desktop (profile: [${profile}], mode: ${mode})...`);
    const claudePath = getClaudeDesktopConfigPath();
    updateJsonConfig(claudePath, 'e2e-cloud', serverConfig, 'Claude Desktop');
  }

  if (target === 'cursor' || target === 'all') {
    console.log(`Configuring Cursor (profile: [${profile}], mode: ${mode})...`);
    const cursorPath = getCursorConfigPath();
    updateJsonConfig(cursorPath, 'e2e-cloud', serverConfig, 'Cursor');
  }

  console.log('\n🎉 Setup complete! Just like AWS, credentials are read automatically from ~/.e2e/credentials.');
  console.log('Restart Claude Desktop or Cursor to begin using all E2E Cloud tools seamlessly!\n');
}
