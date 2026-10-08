import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// CORE-004 R4a (ADR-032, #87): transporte Redis Streams contra Redis REAL.
// En CI, el job test levanta PostGIS + Redis (workflows v14) con DATABASE_URL
// y REDIS_URL fijas. Sin base o sin Redis alcanzables el suite se salta
// (R5: no se simula el transporte con un mock).
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

// Marcadores anti-PII-safe (ADR-027): corridas de dígitos de a lo sumo 4 —
// no matchean DNI/CUIT/CUIL ni teléfonos AR.
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
let seq = 0;
const marcador = () => 'r4a.' + stamp + '.' + String(++seq);

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

describe.skipIf(!dbUp || !redisUp)('R4a — transporte Redis Streams (ADR-032, #87)', () => {
  it('POST /api/events persiste y publica la REFERENCIA al stream events:raw', async () => {
    const type = 'test.r4a.publish.' + marcador();
    const { status, body } = await postEvent({ type: type, payload: { etapa: 'transporte' } });
    expect([200, 201]).toContain(status);
    expect(body.event.hash).toBeTruthy();

    const entries = await streamEntries();
    const entry = entries.find((e) => Array.isArray(e[1]) && e[1].includes(body.event.hash));
    expect(entry, 'la referencia del evento debe estar en el stream').toBeTruthy();
    const fields = entry![1];
    const idx = fields.indexOf('event_id');
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(fields[idx + 1]).toBe(body.event.id);
    const tIdx = fields.indexOf('type');
    expect(fields[tIdx + 1]).toBe(body.event.type);
  });

  it('la re-ingesta duplicada NO re-publica al stream (idempotencia de transporte)', async () => {
    const evento = {
      type: 'test.r4a.dup.' + marcador(),
      payload: { etapa: 'r4a' },
      occurred_at: '2026-10-08T15:30:00.000Z',
    };
    const first = await postEvent(evento);
    expect([200, 201]).toContain(first.status);
    const second = await postEvent(evento);
    expect(second.status).toBe(200);
    expect(second.body.status).toBe('duplicado');

    const entries = await streamEntries();
    const matches = entries.filter((e) => Array.isArray(e[1]) && e[1].includes(second.body.event.hash));
    expect(matches.length).toBe(1);
  });

  it('GET /api/health reporta redis ok con transporte vivo (R5 honesto)', async () => {
    const res = await fetch(base + '/api/health');
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.redis).toBe('ok');
  });

  it('PATCH /api/health/mode sella y publica el sello al stream (fail-open)', async () => {
    process.env.HEALTH_MODE_API_KEY = 'test-key-r4a';
    const patch = (mode: string) =>
      fetch(base + '/api/health/mode', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', 'x-api-key': 'test-key-r4a' },
        body: JSON.stringify({ mode: mode }),
      }).then(async (res) => ({ status: res.status, body: (await res.json()) as any }));

    const sellado = await patch('synthetic');
    expect(sellado.status).toBe(200);
    expect(sellado.body.status).toBe('sellado');
    expect(sellado.body.sealedAt).toBeTruthy();

    const entries = await streamEntries();
    const entry = entries.find((e) => {
      const fields = Array.isArray(e[1]) ? e[1] : [];
      return fields.includes('system.mode_change') && fields.includes(sellado.body.sealedAt);
    });
    expect(entry, 'el sello de mode debe llegar al stream').toBeTruthy();

    // cleanup honesto: volver al modo real (también sella y publica).
    const back = await patch('real');
    expect(back.status).toBe(200);
    delete process.env.HEALTH_MODE_API_KEY;
  });

  it('fail-open (ADR-032): sin Redis alcanzable el POST sigue 201 y health reporta down', async () => {
    const previa = process.env.REDIS_URL;
    process.env.REDIS_URL = 'redis://127.0.0.1:9'; // puerto cerrado
    try {
      const { status } = await postEvent({ type: 'test.r4a.failopen.' + marcador(), payload: { etapa: 'r4a' } });
      expect(status).toBe(201);
      const res = await fetch(base + '/api/health');
      const body: any = await res.json();
      expect(body.redis).toBe('down');
    } finally {
      process.env.REDIS_URL = previa;
    }
  });
});
