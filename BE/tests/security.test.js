const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../index');

test('health no expone credenciales y responde', async () => {
  const response = await request(app).get('/api/health');
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { status: 'ok', service: 'SistemaVision BE' });
});

test('rutas privadas requieren autenticación', async () => {
  const response = await request(app).get('/api/facturas');
  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
});
