import readline from 'readline';
import {
  parseIniFile,
  writeIniFile,
  getE2ECredentialsPath,
  getE2EConfigPath,
  loadConfig,
} from '../config.js';
import { E2EClient } from '../client/e2e-client.js';

function askQuestion(rl: readline.Interface, query: string, defaultValue?: string): Promise<string> {
  const prompt = defaultValue ? `${query} [${defaultValue}]: ` : `${query}: `;
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim() || defaultValue || '');
    });
  });
}

export async function runConfigureCli(args: string[]): Promise<void> {
  console.log('\n⚙️  E2E Networks CLI Configuration (AWS-style Profiles)\n');

  // Parse CLI flags
  let profile = 'default';
  let apiKey = '';
  let authToken = '';
  let projectId = '';
  let location = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--profile' && args[i + 1]) {
      profile = args[i + 1];
      i++;
    } else if (args[i] === '--api-key' && args[i + 1]) {
      apiKey = args[i + 1];
      i++;
    } else if (args[i] === '--auth-token' && args[i + 1]) {
      authToken = args[i + 1];
      i++;
    } else if (args[i] === '--project-id' && args[i + 1]) {
      projectId = args[i + 1];
      i++;
    } else if (args[i] === '--location' && args[i + 1]) {
      location = args[i + 1];
      i++;
    }
  }

  const credentialsPath = getE2ECredentialsPath();
  const configPath = getE2EConfigPath();

  const credentialsAll = parseIniFile(credentialsPath);
  const configAll = parseIniFile(configPath);

  const existingCreds = credentialsAll[profile] || {};
  const existingConfig = configAll[profile] || {};

  // If running interactively and values weren't provided via flags, prompt for them
  const isInteractive = process.stdin.isTTY && !apiKey && !authToken;

  if (isInteractive) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    try {
      profile = await askQuestion(rl, 'E2E Profile Name', profile);
      const currKey = existingCreds['api_key'] || '';
      const maskedKey = currKey ? `****${currKey.slice(-4)}` : undefined;
      const inputKey = await askQuestion(rl, 'E2E API Key', maskedKey);
      apiKey = inputKey.startsWith('****') ? currKey : inputKey;

      const currToken = existingCreds['auth_token'] || '';
      const maskedToken = currToken ? `****${currToken.slice(-4)}` : undefined;
      const inputToken = await askQuestion(rl, 'E2E Auth Token (Bearer Token)', maskedToken);
      authToken = inputToken.startsWith('****') ? currToken : inputToken;

      projectId = await askQuestion(
        rl,
        'Default Project ID (optional: leave empty to query across all/default projects)',
        existingConfig['project_id'] || ''
      );

      location = await askQuestion(
        rl,
        'Default Region / Location (optional: leave empty to query across all locations)',
        existingConfig['location'] || ''
      );
    } finally {
      rl.close();
    }
  } else {
    // Non-interactive fallback: use provided flags or retain existing values
    apiKey = apiKey || existingCreds['api_key'] || '';
    authToken = authToken || existingCreds['auth_token'] || '';
    projectId = projectId || existingConfig['project_id'] || '';
    location = location || existingConfig['location'] || '';
  }

  // Update credentials
  if (!credentialsAll[profile]) {
    credentialsAll[profile] = {};
  }
  if (apiKey) credentialsAll[profile]['api_key'] = apiKey;
  if (authToken) credentialsAll[profile]['auth_token'] = authToken;

  // Update config
  if (!configAll[profile]) {
    configAll[profile] = {};
  }
  if (projectId) {
    configAll[profile]['project_id'] = projectId;
  } else {
    delete configAll[profile]['project_id'];
  }
  if (location) {
    configAll[profile]['location'] = location;
  } else {
    delete configAll[profile]['location'];
  }

  writeIniFile(credentialsPath, credentialsAll, false);
  writeIniFile(configPath, configAll, true);

  console.log(`\n✓ Configuration saved for profile: [${profile}]`);
  console.log(`  Credentials file: ${credentialsPath}`);
  console.log(`  Config file:      ${configPath}`);

  // Test connection
  if (apiKey && authToken) {
    console.log('\n🔍 Verifying connection with E2E Cloud REST API...');
    const testConfig = loadConfig(profile);
    const client = new E2EClient(testConfig);
    const result = await client.testConnection();

    if (result.ok) {
      console.log('✅ Connection test successful! Credentials are valid.');
    } else {
      console.log(`⚠️  Warning: ${result.message}`);
      console.log('   Please verify your API key and token in the E2E MyAccount portal.');
    }
  }

  console.log('\nYou can now use this profile in Claude Desktop or Cursor seamlessly!');
  console.log(`To register with Claude / Cursor run: node dist/index.js install --profile ${profile}\n`);
}
