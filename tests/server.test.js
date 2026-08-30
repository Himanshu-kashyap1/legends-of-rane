import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { createExpressApp } from '../src/server/app.js';

test('Express app initializes and responds to root and 404', async (t) => {
  const app = createExpressApp();
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  t.after(() => {
    server.close();
  });

  // Test GET /
  const rootRes = await fetch(`http://localhost:${port}/`);
  assert.strictEqual(rootRes.status, 200);
  const rootJson = await rootRes.json();
  assert.strictEqual(rootJson.status, 'online');
  assert.strictEqual(rootJson.name, 'Legends of Rane API');

  // Test GET /health
  const healthRes = await fetch(`http://localhost:${port}/health`);
  // Could be 200 or 503 depending on whether mongoose is connected in test environment
  assert.ok([200, 503].includes(healthRes.status));
  const healthJson = await healthRes.json();
  assert.ok(healthJson.timestamp);
  assert.ok(healthJson.database);

  // Test 404 on unknown api path
  const notFoundRes = await fetch(`http://localhost:${port}/api/unknown-route`);
  assert.strictEqual(notFoundRes.status, 404);
  const notFoundJson = await notFoundRes.json();
  assert.strictEqual(notFoundJson.error, 'Endpoint not found');
});
