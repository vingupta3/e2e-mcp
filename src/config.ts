import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Load .env if present in current working directory
dotenv.config();

export interface E2EConfig {
  profile: string;
  apiKey: string;
  authToken: string;
  projectId?: number;
  location?: string;
  myaccountBaseUrl: string;
  tirBaseUrl: string;
  port: number;
  host: string;
  credentialsPath?: string;
  configPath?: string;
}

export interface ProfileData {
  apiKey?: string;
  authToken?: string;
  projectId?: number;
  location?: string;
}

/**
 * Parses INI formatted files like ~/.aws/credentials or ~/.e2e/credentials
 */
export function parseIniFile(filePath: string): Record<string, Record<string, string>> {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const result: Record<string, Record<string, string>> = {};
    let currentSection = 'default';

    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) {
        continue;
      }

      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        let section = trimmed.slice(1, -1).trim();
        // Handle "[profile realbetter-account]" syntax like AWS config
        if (section.toLowerCase().startsWith('profile ')) {
          section = section.slice(8).trim();
        }
        currentSection = section;
        if (!result[currentSection]) {
          result[currentSection] = {};
        }
      } else {
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim().toLowerCase();
          const val = trimmed.slice(eqIdx + 1).trim();
          if (!result[currentSection]) {
            result[currentSection] = {};
          }
          result[currentSection][key] = val;
        }
      }
    }

    return result;
  } catch (err) {
    console.error(`[E2E MCP Server] Warning: Failed to parse INI file at ${filePath}:`, err);
    return {};
  }
}

/**
 * Writes INI formatted files like ~/.e2e/credentials or ~/.e2e/config
 */
export function writeIniFile(filePath: string, data: Record<string, Record<string, string>>, isConfig: boolean = false): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }

  let out = '';
  for (const [section, entries] of Object.entries(data)) {
    const sectionHeader = isConfig && section !== 'default' ? `profile ${section}` : section;
    out += `[${sectionHeader}]\n`;
    for (const [k, v] of Object.entries(entries)) {
      if (v !== undefined && v !== null && v !== '') {
        out += `${k} = ${v}\n`;
      }
    }
    out += '\n';
  }

  fs.writeFileSync(filePath, out, { mode: 0o600, encoding: 'utf-8' });
}

export function getE2EDir(): string {
  return path.join(os.homedir(), '.e2e');
}

export function getE2ECredentialsPath(): string {
  return path.join(getE2EDir(), 'credentials');
}

export function getE2EConfigPath(): string {
  return path.join(getE2EDir(), 'config');
}

/**
 * Loads configuration with precedence:
 * 1. CLI args (--profile)
 * 2. Environment variables (E2E_API_KEY, E2E_AUTH_TOKEN, etc.)
 * 3. Local .env file
 * 4. ~/.e2e/credentials and ~/.e2e/config profile (AWS style)
 * 5. System defaults
 */
export function loadConfig(profileOverride?: string): E2EConfig {
  // Determine active profile (CLI override > env > 'default')
  const profile = profileOverride || process.env.E2E_PROFILE || 'default';

  const credentialsPath = getE2ECredentialsPath();
  const configPath = getE2EConfigPath();

  const credentialsAll = parseIniFile(credentialsPath);
  const configAll = parseIniFile(configPath);

  const profileCreds = credentialsAll[profile] || credentialsAll['default'] || {};
  const profileConfig = configAll[profile] || configAll['default'] || {};

  // Resolve API Key: env > local .env > profile creds
  const apiKey =
    process.env.E2E_API_KEY ||
    profileCreds['api_key'] ||
    profileCreds['e2e_api_key'] ||
    profileCreds['apikey'] ||
    profileCreds['key'] ||
    '';

  // Resolve Auth Token: env > local .env > profile creds
  const authToken =
    process.env.E2E_AUTH_TOKEN ||
    profileCreds['auth_token'] ||
    profileCreds['e2e_auth_token'] ||
    profileCreds['token'] ||
    profileCreds['bearer_token'] ||
    '';

  // Resolve Project ID: env > profile config > profile creds
  const rawProjectId =
    process.env.E2E_PROJECT_ID ||
    profileConfig['project_id'] ||
    profileConfig['e2e_project_id'] ||
    profileCreds['project_id'];
  const projectId = rawProjectId && !isNaN(Number(rawProjectId)) ? Number(rawProjectId) : undefined;

  // Resolve Location: env > profile config > profile creds > undefined (optional)
  const location =
    process.env.E2E_LOCATION ||
    profileConfig['location'] ||
    profileConfig['region'] ||
    profileConfig['e2e_location'] ||
    profileCreds['location'] ||
    undefined;

  const myaccountBaseUrl = (
    process.env.E2E_MYACCOUNT_BASE_URL ||
    profileConfig['myaccount_base_url'] ||
    'https://api.e2enetworks.com/myaccount'
  ).replace(/\/$/, '');

  const tirBaseUrl = (
    process.env.E2E_TIR_BASE_URL ||
    profileConfig['tir_base_url'] ||
    'https://api.e2enetworks.com/myaccount/api/v1/gpu'
  ).replace(/\/$/, '');

  const port = parseInt(process.env.PORT || '3000', 10);
  const host = process.env.HOST || '0.0.0.0';

  return {
    profile,
    apiKey,
    authToken,
    projectId,
    location,
    myaccountBaseUrl,
    tirBaseUrl,
    port,
    host,
    credentialsPath,
    configPath,
  };
}
