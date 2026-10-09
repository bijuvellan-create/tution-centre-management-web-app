import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import app from '../src/app.js';

test('GET /api/health returns a JSON status payload', async () => {
  // 200 when the database is connected, 503 when it is not (degraded).
  const res = await request(app).get('/api/health');
  assert.ok([200, 503].includes(res.status));
  assert.ok(['ok', 'degraded'].includes(res.body.status));
  assert.ok(res.body.app);
  assert.ok(res.body.database);
  assert.equal(typeof res.body.uptimeSeconds, 'number');
});

test('unknown route returns a clean 404 JSON response', async () => {
  const res = await request(app).get('/api/does-not-exist').expect(404);

  assert.equal(res.body.success, false);
  assert.match(res.body.message, /Route not found/);
});
