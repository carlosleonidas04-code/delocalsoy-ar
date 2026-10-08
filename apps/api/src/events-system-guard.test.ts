import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// H-01 (auditoría T2 Anthropic, 2026-10-07) como código — CORE-004 R3 (#87):
// la ingesta pública POST /api/events no puede sellar tipos 'system.*'.
// Sin ese guard, un evento 'system.mode_change' anónimo falsificaría el
// estado global que GET /api/health resuelve desde events_raw (R7),
// saltándose el guard R8 de PATCH /api/health/mode.
// Requiere Postgres/PostGIS real (job test de CI + db:deploy); sin base
// alcanzable el suite se salta (honesto, R5: no se simula).
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';

const { createApp } = await import('./app.js');
const { prisma } = await import('@delocalsoy/db');

const dbUp = await prisma
  .$queryRaw`SELECT 1`
  .then(() => true)
  .catch(() => false);

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

describe.skipIf(!dbUp)('ingesta pública: system.* es sellos del sistema, no ingesta (H-01, CORE-004 R3)', () => {
  it("POST 'system.mode_change' anónimo → 403 y no se persiste nada", async () => {
    const before = await prisma.events_raw.count({ where: { type: 'system.mode_change' } });

    const res = await fetch(base + '/api/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type: 'system.mode_change',
        payload: { from: 'degraded', to: 'real', spoof: 'h01' },
        occurred_at: '2026-10-08T12:00:00.000Z',
      }),
    });

    expect(res.status).toBe(403);
    const body: any = await res.json();
    expect(body.error).toMatch(/reservado/i);

    const after = await prisma.events_raw.count({ where: { type: 'system.mode_change' } });
    expect(after).toBe(before); // cero sellos falsos: el modo no se puede falsificar por acá
  });

  it("POST 'system.user_session' anónimo → 403 (sesiones solo via auth, CORE-004 R3)", async () => {
    const res = await fetch(base + '/api/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'system.user_session', payload: { usuario_id: 'spoof' } }),
    });
    expect(res.status).toBe(403);
  });

  it('la ingesta pública normal sigue funcionando (regresión del guard)', async () => {
    const evento = {
      type: 'test.events.system.guard',
      payload: { suite: 'vitest', hallazgo: 'H-01' },
      occurred_at: '2026-10-08T12:01:00.000Z',
    };
    const res = await fetch(base + '/api/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(evento),
    });
    expect([200, 201]).toContain(res.status);
    const body: any = await res.json();
    expect(['creado', 'duplicado']).toContain(body.status);
  });

  it('PATCH /api/health/mode sin x-api-key sigue cerrado (R8 intacto)', async () => {
    const res = await fetch(base + '/api/health/mode', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mode: 'synthetic' }),
    });
    expect(res.status).toBe(401);
  });
});
