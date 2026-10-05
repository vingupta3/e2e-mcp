import { E2EConfig } from '../config.js';

export interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  service?: 'myaccount' | 'tir';
  queryParams?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  apiKey?: string;
  authToken?: string;
  projectId?: number;
  location?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export interface E2EResponse<T = any> {
  success: boolean;
  status: number;
  data: T;
  raw?: any;
  message?: string;
}

export class E2EClientError extends Error {
  public status: number;
  public details: any;

  constructor(message: string, status: number = 500, details?: any) {
    super(message);
    this.name = 'E2EClientError';
    this.status = status;
    this.details = details;
  }
}

export class E2EClient {
  private config: E2EConfig;

  constructor(config: E2EConfig) {
    this.config = config;
  }

  public updateConfig(newConfig: Partial<E2EConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public getConfig(): Readonly<E2EConfig> {
    return this.config;
  }

  public async request<T = any>(options: RequestOptions): Promise<E2EResponse<T>> {
    const {
      method,
      path,
      service = 'myaccount',
      queryParams = {},
      body,
      apiKey = this.config.apiKey,
      authToken = this.config.authToken,
      projectId = this.config.projectId,
      location = this.config.location,
      headers: customHeaders = {},
      timeoutMs = 30000,
    } = options;

    // Check credentials if not set
    if (!apiKey && !authToken) {
      throw new E2EClientError(
        'E2E Credentials missing: Both E2E_API_KEY and E2E_AUTH_TOKEN must be configured. ' +
        'Set them via environment variables or pass them as parameters. ' +
        'Generate them from the E2E MyAccount portal: https://myaccount.e2enetworks.com (Security / API Tokens).',
        401
      );
    }

    const baseUrl = service === 'tir' ? this.config.tirBaseUrl : this.config.myaccountBaseUrl;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`${baseUrl}${cleanPath}`);

    // Merge standard query parameters
    if (apiKey) {
      url.searchParams.set('apikey', apiKey);
    }
    if (projectId !== undefined) {
      url.searchParams.set('project_id', String(projectId));
    }
    if (location) {
      url.searchParams.set('location', location);
    }

    // Append custom query parameters
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }

    // Build headers
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...customHeaders,
    };

    if (authToken) {
      headers['Authorization'] = authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url.toString(), {
        method,
        headers,
        body: body && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const contentType = response.headers.get('content-type') || '';
      let responseData: any;

      if (contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        const text = await response.text();
        try {
          responseData = JSON.parse(text);
        } catch {
          responseData = text;
        }
      }

      if (!response.ok) {
        const errorMessage =
          (responseData && typeof responseData === 'object' && (responseData.message || responseData.error || responseData.detail || responseData.description)) ||
          `E2E API returned HTTP ${response.status}: ${response.statusText}`;

        throw new E2EClientError(
          `E2E API Error (${response.status}): ${errorMessage}`,
          response.status,
          responseData
        );
      }

      return {
        success: true,
        status: response.status,
        data: responseData?.data !== undefined ? responseData.data : responseData,
        raw: responseData,
        message: responseData?.message,
      };
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        throw new E2EClientError(`Request to E2E API timed out after ${timeoutMs}ms (${method} ${cleanPath})`, 408);
      }
      if (err instanceof E2EClientError) {
        throw err;
      }
      throw new E2EClientError(`Network or request error: ${err.message}`, 500, err);
    }
  }

  /**
   * Test API connectivity and credentials validity against E2E Cloud
   */
  public async testConnection(): Promise<{ ok: boolean; message: string; details?: any }> {
    try {
      if (!this.config.apiKey && !this.config.authToken) {
        return {
          ok: false,
          message: 'No credentials configured. Please set E2E_API_KEY and E2E_AUTH_TOKEN in environment or .env file.',
        };
      }

      // Try checking OS images or project details, which are lightweight read-only calls
      const res = await this.request({
        method: 'GET',
        path: '/api/v1/images/os-category/',
        service: 'myaccount',
        timeoutMs: 8000,
      });

      return {
        ok: true,
        message: 'Successfully connected and authenticated with E2E Networks Cloud REST API.',
        details: res.data,
      };
    } catch (error: any) {
      return {
        ok: false,
        message: `Connection failed: ${error.message}`,
        details: error.details,
      };
    }
  }
}
