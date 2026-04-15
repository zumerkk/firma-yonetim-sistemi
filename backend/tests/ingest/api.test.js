const request = require('supertest');
const express = require('express');

// Smoke test: Auth middleware should protect endpoints
const ingestRoutes = require('../../routes/ingest');

describe('ingest api (smoke)', () => {
  test('preview requires auth', async () => {
    const app = express();
    app.use('/api/ingest', ingestRoutes);

    const res = await request(app).post('/api/ingest/preview');
    expect(res.statusCode).toBe(401);
  });

  test('commit requires auth', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/ingest', ingestRoutes);

    const res = await request(app).post('/api/ingest/commit').send({ ingestSessionId: 'dummy' });
    expect(res.statusCode).toBe(401);
  });
});

