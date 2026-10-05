import dotenv from 'dotenv';
import path from 'path';

// Load .env if present
dotenv.config();

export interface E2EConfig {
  apiKey: string;
  authToken: string;
  projectId?: number;
  location: string;
  myaccountBaseUrl: string;
  tirBaseUrl: string;
  port: number;
  host: string;
}

export function loadConfig(): E2EConfig {
  const apiKey = process.env.E2E_API_KEY || '';
  const authToken = process.env.E2E_AUTH_TOKEN || '';
  const projectIdRaw = process.env.E2E_PROJECT_ID;
  const projectId = projectIdRaw && !isNaN(Number(projectIdRaw)) ? Number(projectIdRaw) : undefined;
  const location = process.env.E2E_LOCATION || 'DEL-1';
  const myaccountBaseUrl = (process.env.E2E_MYACCOUNT_BASE_URL || 'https://api.e2enetworks.com/myaccount').replace(/\/$/, '');
  const tirBaseUrl = (process.env.E2E_TIR_BASE_URL || 'https://api.e2enetworks.com/myaccount/api/v1/gpu').replace(/\/$/, '');
  const port = parseInt(process.env.PORT || '3000', 10);
  const host = process.env.HOST || '0.0.0.0';

  return {
    apiKey,
    authToken,
    projectId,
    location,
    myaccountBaseUrl,
    tirBaseUrl,
    port,
    host,
  };
}
