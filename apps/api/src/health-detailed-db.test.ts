import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// A1 (#290) con servicios reales (PostgreSQL/PostGIS + Redis): admin real
// via prisma.usuarios.update (patron fichas-valoracion), projection_lag = resta
// de counts non-system (definicion AUD-08 D4) y XINFO GROUPS contra Redis real.
// Los consumer groups los crea el worker (corre despues en CI): se aserta el
// SHAPE, nunca los nombres de grupos. Sin base el suite se salta (R5).
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';
process.env.JWT_SECRET = 'test-jwt-secret-a1-health-detailed-32-chars';

const { createApp } = await import('./app.js');
const prisma = (await import('./lib/prisma.js')).default;

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

const dbUp = await prisma
  .$queryRaw`SELECT 1`
  .then(() => true)
  .catch(() => false);

let server: any;
let base = '';

beforeAll(async () => {
  execSync('pnpm --filter @delocalsoy/db db:seed', { cwd: repoRoot, stdio: 'pipe' });
  server = createApp().listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = 'http://127.0.0.1:' + server.address().port;
}, 60000);

afterAll(async () => {
  await new Promise((resolve, reject) => {
    server.close((err: any) => {
      if (err) reject(err);
      else resolve(null);
    });
    if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
  });
});

describe.skipIf(!dbUp)('A1 /api/health/detailed con servicios reales (#290)', () => {
  it('admin real → 200: projection_lag = resta de counts, stream y consumer_groups honestos', async () => {
    const ts = Date.now();
    const email = 'a1-' + ts + '-admin@example.test';
    const jsonHeaders = { 'content-type': 'application/json' };
    const password = 'contrasena-muy-secreta-8+chars';
    const reg = await fetch(base + '/api/auth/register', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ email, password }),
    });
    expect(reg.status, 'register').toBe(201);
    await prisma.usuarios.update({ where: { email }, data: { rol: 'admin' } });
    const login = await fetch(base + '/api/auth/login', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ email, password }),
    });
    expect(login.status).toBe(200);
    const token = ((await login.json()) as any).data.token as string;

    const res = await fetch(base + '/api/health/detailed', { headers: { authorization: 'Bearer ' + token } });
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.db.connected).toBe(true);
    expect(typeof body.db.latency_ms).toBe('number');

    // projection_lag: la resta de los counts non-system (definicion AUD-08 D4).
    expect(body.projection_lag).not.toBeNull();
    const eventsRawNoSystem = await prisma.events_raw.count({ where: { NOT: [{ type: { startsWith: 'system.' } }] } });
    const projectionsNoSystem = await prisma.event_projections.count({ where: { NOT: [{ event_type: { startsWith: 'system.' } }] } });
    expect(body.projection_lag.events_raw_no_system).toBe(eventsRawNoSystem);
    expect(body.projection_lag.event_projections).toBe(projectionsNoSystem);
    expect(body.projection_lag.lag).toBe(eventsRawNoSystem - projectionsNoSystem);

    if (body.redis.ping === 'ok') {
      expect(body.redis.stream).toEqual({ name: 'events:raw', length: expect.any(Number) });
      expect(Array.isArray(body.redis.consumer_groups)).toBe(true);
      if (body.redis.consumer_groups.length > 0) {
        const g = body.redis.consumer_groups[0];
        expect(g).toHaveProperty('name');
        expect(g).toHaveProperty('pending');
        expect(g).toHaveProperty('lag');
      }
    } else {
      expect(body.redis.stream).toBeNull();
      expect(body.redis.consumer_groups).toBeNull();
    }
    expect(body.status === 'ok' || body.status === 'degraded').toBe(true);
  });
});
