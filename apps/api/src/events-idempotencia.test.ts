import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// EV-005 como código (riesgo #59): doble POST del mismo evento → duplicado
// idempotente con el mismo hash, original intacto. Requiere Postgres/PostGIS
// real (en CI, el job test levanta el servicio y aplica migraciones con
// db:deploy — riesgo #55). Sin base alcanzable el suite se salta (honesto,
// R5: no se simula idempotencia con el mock).
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
// El mount de events es /events en main actual y /api/events tras la
// unificación (#61): se resuelve por sondeo — manda el contrato, no la
// memoria del test.
let eventsPath = '';

beforeAll(async () => {
  server = createApp().listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = 'http://127.0.0.1:' + server.address().port;
  for (const p of ['/api/events', '/events']) {
    const res = await fetch(base + p, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    await res.arrayBuffer();
    if (res.status !== 404) {
      eventsPath = p;
      break;
    }
  }
  expect(eventsPath, 'ni /api/events ni /events están montados').toBeTruthy();
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

describe.skipIf(!dbUp)('POST events — idempotencia SHA-256 (EV-005, riesgo #59)', () => {
  // occurred_at fijo + payload estable → hash determinista: el test es
  // idempotente entre runs (re-ejecutar encuentra 'duplicado', no falla).
  const evento = {
    type: 'test.evidencia.idempotencia',
    payload: { suite: 'vitest', riesgo: 59 },
    occurred_at: '2026-10-07T12:00:00.000Z',
  };

  it('la primera ingesta crea (o es duplicado de un run previo — mismo hash)', async () => {
    const res = await fetch(base + eventsPath, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(evento),
    });
    expect([200, 201]).toContain(res.status);
    const body: any = await res.json();
    expect(['creado', 'duplicado']).toContain(body.status);
    expect(body.event.hash).toBeTruthy();
  });

  it('la re-ingesta idéntica responde duplicado con el mismo hash y no muta el original', async () => {
    const post = () =>
      fetch(base + eventsPath, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(evento),
      }).then(async (r) => ({ status: r.status, body: (await r.json()) as any }));

    const first = await post();
    const second = await post();

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.body.status).toBe('duplicado');
    expect(second.body.status).toBe('duplicado');
    expect(second.body.event.hash).toBe(first.body.event.hash);
    expect(second.body.event.id).toBe(first.body.event.id);
  });
});
