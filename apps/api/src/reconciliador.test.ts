import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// AUD-08 (#103, ADR-032) — mitad API del caso de la auditoría + superficie
// pública del lag (D4). Contra PostGIS + Redis REALES; sin base o sin
// Redis el suite se salta (R5). El caso completo de #103 es de DOS
// procesos: aquí la API ingiere con Redis inalcanzable (fail-open ADR-032:
// persiste en events_raw sin publicar; el 201 DECLARA stream:false — fix
// H2); la reparación del hueco la acredita el worker en
// apps/worker/src/reconciliador.test.ts.

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';
process.env.REDIS_URL = process.env.TEST_REDIS_URL ?? 'redis://localhost:6379';

const { createApp } = await import('./app.js');
const { prisma } = await import('@delocalsoy/db');
const { pingRedis, redisCommand } = await import('@delocalsoy/redis');

const dbUp = await prisma
  .$queryRaw`SELECT 1`
  .then(() => true)
  .catch(() => false);
const redisUp = (await pingRedis()) === 'ok';

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

// Marcadores anti-PII-safe (ADR-027): corridas de dígitos de a lo sumo 4.
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
let seq = 0;
const marcador = () => 'aud08api.' + stamp + '.' + String(++seq);

function postEvent(evento: unknown): Promise<{ status: number; body: any }> {
  return fetch(base + '/api/events', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(evento),
  }).then(async (res) => ({ status: res.status, body: (await res.json()) as any }));
}

// XRANGE del stream completo: entradas como pares [id, campos].
async function streamEntries(): Promise<Array<[string, string[]]>> {
  const reply = await redisCommand(['XRANGE', 'events:raw', '-', '+']);
  return reply as unknown as Array<[string, string[]]>;
}

describe.skipIf(!dbUp || !redisUp)('AUD-08 (#103) — mitad API: ingesta con Redis caído + lag público (D4)', () => {
  it('con Redis inalcanzable el POST persiste (fail-open) y DECLARA stream:false (H2)', async () => {
    const previa = process.env.REDIS_URL;
    process.env.REDIS_URL = 'redis://127.0.0.1:9'; // puerto cerrado — Redis caído
    let body: any = null;
    try {
      const r = await postEvent({ type: 'test.aud08.api.' + marcador(), payload: { etapa: 'redis-caido' } });
      expect(r.status).toBe(201);
      body = r.body;
    } finally {
      process.env.REDIS_URL = previa;
    }
    expect(body.stream).toBe(false); // declaración honesta: la referencia NO llegó
    expect(body.event.id).toBeTruthy();
    // la verdad ya estaba asegurada en events_raw ANTES de publicar:
    const persistido = await prisma.events_raw.findUnique({ where: { id: body.event.id } });
    expect(persistido).toBeTruthy();
    // y el hueco es real: tras restaurar Redis, la referencia NO está en el
    // stream — el reconciliador del worker la re-publicará (suite worker).
    const entries = await streamEntries();
    expect(entries.some((e) => Array.isArray(e[1]) && (e[1] as string[]).includes(body.event.id))).toBe(false);
  });

  it('con Redis vivo el 201 declara stream:true (la referencia llegó al stream)', async () => {
    const { status, body } = await postEvent({ type: 'test.aud08.vivo.' + marcador(), payload: { etapa: 'transporte' } });
    expect(status).toBe(201);
    expect(body.stream).toBe(true);
    const entries = await streamEntries();
    expect(entries.some((e) => Array.isArray(e[1]) && (e[1] as string[]).includes(body.event.id))).toBe(true);
  });

  it('GET /api/health expone projection_lag {events_raw_no_system, event_projections, lag} (D4)', async () => {
    const res = await fetch(base + '/api/health');
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.projection_lag).toBeTruthy();
    expect(typeof body.projection_lag.events_raw_no_system).toBe('number');
    expect(typeof body.projection_lag.event_projections).toBe('number');
    expect(typeof body.projection_lag.lag).toBe('number');
    expect(body.projection_lag.lag).toBe(
      body.projection_lag.events_raw_no_system - body.projection_lag.event_projections,
    );
  });
});
