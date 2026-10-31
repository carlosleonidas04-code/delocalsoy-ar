import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// A1 (#290): /api/health/detailed — guard admin fail-closed + estado
// parcial honesto. Sin base (puerto 9, patron health.test.ts): el guard NO
// necesita base (el JWT se firma local con signToken) y el endpoint responde
// 200 degraded con nulls declarados (R15). La suite con servicios reales
// vive en health-detailed-db.test.ts (skipIf !dbUp).
process.env.DATABASE_URL = 'postgresql://sinbase:sinbase@localhost:9/sinbase?schema=public';
process.env.SYSTEM_MODE = 'real';

const { createApp } = await import('./app.js');
const { signToken } = await import('./lib/auth.js');

let server: any;
let base = '';

beforeAll(async () => {
  server = createApp().listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = 'http://127.0.0.1:' + server.address().port;
});

afterAll(async () => {
  await new Promise((resolve, reject) => {
    server.close((err: any) => {
      if (err) reject(err);
      else resolve(null);
    });
    if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
  });
});

describe('A1 /api/health/detailed — guard admin y estado sin base (#290)', () => {
  it('sin JWT_SECRET la identidad queda cerrada → 503 fail-closed (R8)', async () => {
    delete process.env.JWT_SECRET;
    const res = await fetch(base + '/api/health/detailed');
    expect(res.status).toBe(503);
    await res.arrayBuffer();
  });

  it('con JWT_SECRET pero sin Bearer token → 401', async () => {
    process.env.JWT_SECRET = 'test-jwt-secret-a1-health-detailed-32-chars';
    const res = await fetch(base + '/api/health/detailed');
    expect(res.status).toBe(401);
    await res.arrayBuffer();
  });

  it('rol ciudadano → 403 (requiere admin, ADR-031)', async () => {
    const token = signToken({ id: 'a1-test-ciudadano', rol: 'ciudadano' });
    const res = await fetch(base + '/api/health/detailed', { headers: { authorization: 'Bearer ' + token } });
    expect(res.status).toBe(403);
    await res.arrayBuffer();
  });

  it('admin → 200 con estado parcial honesto: degraded, nulls declarados y shape del proceso', async () => {
    const token = signToken({ id: 'a1-test-admin', rol: 'admin' });
    const res = await fetch(base + '/api/health/detailed', { headers: { authorization: 'Bearer ' + token } });
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.status).toBe('degraded'); // sin base (puerto 9) → nunca ok silencioso
    expect(body.db.connected).toBe(false);
    expect(body.db.latency_ms).toBeNull();
    expect(['ok', 'down']).toContain(body.redis.ping);
    if (body.redis.ping === 'down') {
      expect(body.redis.stream).toBeNull();
      expect(body.redis.consumer_groups).toBeNull();
    } else {
      expect(body.redis.stream).toEqual({ name: 'events:raw', length: expect.any(Number) });
      expect(Array.isArray(body.redis.consumer_groups)).toBe(true);
    }
    expect(body.projection_lag).toBeNull(); // sin base: null honesto (R15)
    expect(typeof body.process.uptime_seconds).toBe('number');
    expect(typeof body.process.node_version).toBe('string');
    expect(typeof body.process.pid).toBe('number');
    expect(typeof body.process.memory_rss_mb).toBe('number');
  });
});
