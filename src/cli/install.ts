import fs from 'fs';
import path from 'path';
import os from 'os';

export interface InstallOptions {
  profile?: string;
  target?: 'claude' | 'cursor' | 'antigravity' | 'codex' | 'claude-code' | 'claudecode' | 'all';
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

export function getAntigravityConfigPath(): string {
  return path.join(os.homedir(), '.gemini', 'config', 'mcp_config.json');
}

export function getAntigravityIdeConfigPath(): string {
  return path.join(os.homedir(), '.gemini', 'antigravity-ide', 'mcp_config.json');
}

export function getCodexConfigPath(): string {
  return path.join(os.homedir(), '.codex', 'config.toml');
}

export function getClaudeCodeConfigPath(): string {
  return path.join(os.homedir(), '.claude.json');
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

function updateCodexTomlConfig(
  filePath: string,
  serverName: string,
  serverPath: string,
  profile: string
): boolean {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`  ℹ️ Codex config file not found at ${filePath}, skipping.`);
      return false;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const backupPath = `${filePath}.bak.${Date.now()}`;
    fs.writeFileSync(backupPath, content);
    console.log(`  ✓ Backup created at: ${backupPath}`);

    const serverSection = `[mcp_servers.${serverName}]`;
    const tomlBlock = `[mcp_servers.${serverName}]
command = "node"
args = [
    "${serverPath}",
    "--profile",
    "${profile}",
]

[mcp_servers.${serverName}.env]
E2E_PROFILE = "${profile}"
`;

    let newContent = content;

    // Check if [mcp_servers.e2e-cloud] already exists
    if (content.includes(serverSection)) {
      // Replace existing block
      const regex = new RegExp(`\\[mcp_servers\\.${serverName}\\][\\s\\S]*?(?=(\\n\\[|$))`, 'g');
      newContent = content.replace(regex, tomlBlock.trim());
    } else {
      // Find a suitable place to insert (before [shell_environment_policy] or at end)
      const insertMarker = '[shell_environment_policy';
      if (content.includes(insertMarker)) {
        newContent = content.replace(insertMarker, `${tomlBlock}\n${insertMarker}`);
      } else {
        newContent = `${content.trim()}\n\n${tomlBlock}`;
      }
    }

    fs.writeFileSync(filePath, newContent, 'utf-8');
    console.log(`  ✅ Successfully updated Codex configuration at: ${filePath}`);
    return true;
  } catch (err: any) {
    console.error(`  ❌ Failed to update Codex config at ${filePath}:`, err.message);
    return false;
  }
}

export async function runInstallCli(args: string[]): Promise<void> {
  console.log('\n🚀 Installing E2E Networks MCP Server for Claude, Cursor, Antigravity & Codex\n');

  let profile = 'rb-e2e-account';
  let target: 'claude' | 'cursor' | 'antigravity' | 'codex' | 'claude-code' | 'claudecode' | 'all' = 'all';
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
            E2E_PROFILE: profile,
          },
        };

  // 1. Claude Desktop
  if (target === 'claude' || target === 'all') {
    console.log(`\n[1/4] Configuring Claude Desktop (profile: [${profile}])...`);
    const claudePath = getClaudeDesktopConfigPath();
    updateJsonConfig(claudePath, 'e2e-cloud', serverConfig, 'Claude Desktop');
  }

  // 2. Cursor
  if (target === 'cursor' || target === 'all') {
    console.log(`\n[2/4] Configuring Cursor (profile: [${profile}])...`);
    const cursorPath = getCursorConfigPath();
    updateJsonConfig(cursorPath, 'e2e-cloud', serverConfig, 'Cursor');
  }

  // 3. Google Antigravity (CLI & IDE)
  if (target === 'antigravity' || target === 'all') {
    console.log(`\n[3/4] Configuring Google Antigravity (profile: [${profile}])...`);
    const antigravityPath = getAntigravityConfigPath();
    updateJsonConfig(antigravityPath, 'e2e-cloud', serverConfig, 'Google Antigravity CLI');

    const antigravityIdePath = getAntigravityIdeConfigPath();
    if (fs.existsSync(path.dirname(antigravityIdePath))) {
      updateJsonConfig(antigravityIdePath, 'e2e-cloud', serverConfig, 'Google Antigravity IDE');
    }
  }

  // 4. Codex
  if (target === 'codex' || target === 'all') {
    console.log(`\n[4/5] Configuring Codex (profile: [${profile}])...`);
    const codexPath = getCodexConfigPath();
    updateCodexTomlConfig(codexPath, 'e2e-cloud', serverPath, profile);
  }

  // 5. Claude Code CLI
  if (target === 'claude-code' || target === 'claudecode' || target === 'all') {
    console.log(`\n[5/5] Configuring Claude Code CLI (profile: [${profile}])...`);
    const claudeCodePath = getClaudeCodeConfigPath();
    if (fs.existsSync(claudeCodePath)) {
      updateJsonConfig(claudeCodePath, 'e2e-cloud', serverConfig, 'Claude Code CLI');
    }
  }

  console.log('\n🎉 Multi-assistant configuration complete!');
  console.log(`Active Profile: [${profile}]`);
  console.log('AWS profile remains untouched and active.');
  console.log('To update your E2E credentials anytime, run:');
  console.log(`  node dist/index.js configure --profile ${profile}\n`);
}
