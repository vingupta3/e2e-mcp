import http from 'http';
import assert from 'assert';
import { loadConfig } from '../src/config.js';
import { createE2EMcpServer } from '../src/server.js';
import { E2EClient, E2EClientError } from '../src/client/e2e-client.js';

async function runTests() {
  console.log('🧪 Starting E2E Networks MCP Server Tests...\n');

  // Test 1: Config loading
  console.log('Test 1: Configuration Loading');
  const config = loadConfig();
  assert.strictEqual(config.projectId, undefined); // optional by default to allow searching all projects
  assert.strictEqual(config.myaccountBaseUrl, 'https://api.e2enetworks.com/myaccount');
  assert.strictEqual(config.tirBaseUrl, 'https://api.e2enetworks.com/myaccount/api/v1/gpu');
  console.log('  ✓ Config loads profile correctly with configured or unconstrained parameters');

  // Test 2: Server initialization & tool registration
  console.log('\nTest 2: MCP Server Initialization & Tool Inventory');
  const { server, client } = createE2EMcpServer(config);
  assert.ok(server);
  assert.ok(client);
  console.log('  ✓ Server and client initialized successfully');

  // Test 3: Client handles missing credentials gracefully
  console.log('\nTest 3: Missing Credentials Validation');
  const emptyClient = new E2EClient({
    ...config,
    apiKey: '',
    authToken: '',
  });

  try {
    await emptyClient.request({
      method: 'GET',
      path: '/api/v1/nodes/',
    });
    assert.fail('Should have thrown an error for missing credentials');
  } catch (err: any) {
    assert.ok(err instanceof E2EClientError);
    assert.strictEqual(err.status, 401);
    assert.ok(err.message.includes('E2E Credentials missing'));
    console.log('  ✓ Correctly rejects unauthenticated requests with informative guidance');
  }

  // Test 4: Mock HTTP Server to test request formatting, headers, query params
  console.log('\nTest 4: Mock HTTP Integration & Protocol Verification');
  let lastReceivedUrl = '';
  let lastReceivedHeaders: any = {};
  let lastReceivedBody: any = null;

  const mockServer = http.createServer((req, res) => {
    lastReceivedUrl = req.url || '';
    lastReceivedHeaders = req.headers;

    let bodyData = '';
    req.on('data', chunk => { bodyData += chunk; });
    req.on('end', () => {
      try {
        lastReceivedBody = bodyData ? JSON.parse(bodyData) : null;
      } catch {
        lastReceivedBody = bodyData;
      }

      if (req.url?.includes('/api/v1/nodes/')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          code: 200,
          data: [
            { id: 101, name: 'web-prod-01', status: 'Running', plan: 'C3.8GB', ip_address: '103.120.178.10' }
          ]
        }));
      } else if (req.url?.includes('/notebooks/')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          code: 200,
          data: [
            { id: 201, name: 'h100-research-lab', status: 'running', sku: 'H100-SXM5-80GB' }
          ]
        }));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Resource not found' }));
      }
    });
  });

  await new Promise<void>((resolve) => mockServer.listen(0, '127.0.0.1', () => resolve()));
  const address = mockServer.address() as any;
  const mockPort = address.port;
  const mockBaseUrl = `http://127.0.0.1:${mockPort}`;

  const mockClient = new E2EClient({
    apiKey: 'test-api-key-12345',
    authToken: 'test-bearer-token-67890',
    projectId: 999,
    location: 'NCR-1',
    myaccountBaseUrl: mockBaseUrl,
    tirBaseUrl: mockBaseUrl,
    port: 3000,
    host: '0.0.0.0',
  });

  // Test 4a: GET Request to MyAccount API
  const myaccountRes = await mockClient.request({
    method: 'GET',
    path: '/api/v1/nodes/',
    service: 'myaccount',
  });

  assert.strictEqual(myaccountRes.status, 200);
  assert.strictEqual(myaccountRes.data[0].name, 'web-prod-01');
  assert.ok(lastReceivedUrl.includes('apikey=test-api-key-12345'), 'apikey query param included');
  assert.ok(lastReceivedUrl.includes('project_id=999'), 'project_id query param included');
  assert.ok(lastReceivedUrl.includes('location=Delhi'), 'location query param normalized to Delhi');
  assert.strictEqual(lastReceivedHeaders['authorization'], 'Bearer test-bearer-token-67890');
  console.log('  ✓ MyAccount request sent with correct apikey, project_id, normalized location, and Bearer token');

  // Test 4b: POST Request with JSON Body
  await mockClient.request({
    method: 'POST',
    path: '/api/v1/nodes/',
    body: {
      name: 'new-worker-01',
      plan: 'C3.8GB',
      image: 'Ubuntu-22.04'
    }
  });

  assert.strictEqual(lastReceivedBody.name, 'new-worker-01');
  assert.strictEqual(lastReceivedBody.plan, 'C3.8GB');
  console.log('  ✓ POST request body serialized and transmitted correctly');

  // Test 4c: TIR Service Request
  const tirRes = await mockClient.request({
    method: 'GET',
    path: '/notebooks/',
    service: 'tir',
  });

  assert.strictEqual(tirRes.status, 200);
  assert.strictEqual(tirRes.data[0].sku, 'H100-SXM5-80GB');
  console.log('  ✓ TIR platform request routed and executed correctly');

  // Test 4d: Multi-location aggregation when location is omitted
  const unconstrainedClient = new E2EClient({
    apiKey: 'test-api-key-12345',
    authToken: 'test-bearer-token-67890',
    myaccountBaseUrl: mockBaseUrl,
    tirBaseUrl: mockBaseUrl,
    port: 3000,
    host: '0.0.0.0',
  });

  const multiRes = await unconstrainedClient.requestAcrossLocations({
    method: 'GET',
    path: '/api/v1/nodes/',
  });

  assert.strictEqual(multiRes.status, 200);
  assert.ok(Array.isArray(multiRes.data), 'Aggregated data is an array');
  assert.ok(multiRes.data.length >= 2, 'Aggregated across Delhi and Mumbai');
  console.log('  ✓ requestAcrossLocations correctly queries all regions and aggregates responses');

  // Test 4e: Error Handling on 404
  try {
    await mockClient.request({
      method: 'GET',
      path: '/api/v1/nonexistent/',
    });
    assert.fail('Expected 404 error');
  } catch (err: any) {
    assert.strictEqual(err.status, 404);
    assert.ok(err.message.includes('Resource not found'));
    console.log('  ✓ API 404 error cleanly extracted and formatted');
  }

  mockServer.close();

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!\n');
}

runTests().catch(err => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
