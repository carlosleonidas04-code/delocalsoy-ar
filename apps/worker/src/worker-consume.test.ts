import { beforeAll, describe, expect, it } from 'vitest';

// CORE-004 R4b (ADR-032, #87): consumo del stream contra PostGIS + Redis
// REALES. En CI, el job test levanta ambos servicios (workflows v15) con
// DATABASE_URL y REDIS_URL fijas. Sin base o sin Redis el suite se salta
// (R5: no se simula el transporte ni la proyección con mocks).
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';
process.env.REDIS_URL = process.env.TEST_REDIS_URL ?? 'redis://localhost:6379';

const { prisma } = await import('@delocalsoy/db');
const { pingRedis, redisCommand, xaddEventReference } = await import('@delocalsoy/redis');
const { consumeOnce, ensureGroup, GROUP, STREAM } = await import('./consume.js');

const dbUp = await prisma
  .$queryRaw`SELECT 1`
  .then(() => true)
  .catch(() => false);
const redisUp = (await pingRedis()) === 'ok';

// Marcadores anti-PII-safe (ADR-027): corridas de dígitos de a lo sumo 4 —
// no matchean DNI/CUIT/CUIL ni teléfonos AR.
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
let seq = 0;
const marcador = () => 'r4b.' + stamp + '.' + String(++seq);

// Lo mismo que hace la ruta POST /api/events (R4a): persistir en events_raw
// (única verdad) y publicar la REFERENCIA al stream (transporte).
type EventoPublicado = { id: string; hash: string; type: string; occurred_at: Date };
async function persistirYPublicar(): Promise<EventoPublicado> {
  const event = await prisma.events_raw.create({
    data: {
      type: 'test.r4b.worker.' + marcador(),
      payload: { etapa: 'r4b' },
      hash: 'r4b-hash-' + marcador(),
      occurred_at: new Date(),
    },
  });
  await xaddEventReference(STREAM, {
    event_id: event.id,
    type: event.type,
    hash: event.hash,
    occurred_at: event.occurred_at.toISOString(),
  });
  return event;
}

async function pendingCount(): Promise<number> {
  const reply = (await redisCommand(['XPENDING', STREAM, GROUP])) as unknown as Array<unknown>;
  return Array.isArray(reply) ? Number(reply[0]) : -1;
}

describe.skipIf(!dbUp || !redisUp)('R4b — worker idempotente del stream (ADR-032, #87)', () => {
  beforeAll(async () => {
    // El grupo arranca en '$': las entradas previas (suite de la API) no se
    // entregan — cada test publica y consume lo suyo.
    await ensureGroup();
  });

  it('consume exactamente una vez: proyecta el evento y deja XPENDING en 0', async () => {
    const event = await persistirYPublicar();
    const result = await consumeOnce('w1');
    expect(result.processed).toBeGreaterThanOrEqual(1);

    const projection = await prisma.event_projections.findUnique({ where: { event_id: event.id } });
    expect(projection).toBeTruthy();
    expect(projection?.event_hash).toBe(event.hash);

    const total = await prisma.event_projections.count({ where: { event_id: event.id } });
    expect(total).toBe(1);
    expect(await pendingCount()).toBe(0);
  });

  it('la re-entrega de la misma referencia NO duplica la proyección (P2002)', async () => {
    const event = await persistirYPublicar();
    await consumeOnce('w2');
    // re-entrega manual de la MISMA referencia (p. ej. re-publicación):
    await xaddEventReference(STREAM, {
      event_id: event.id,
      type: event.type,
      hash: event.hash,
      occurred_at: event.occurred_at.toISOString(),
    });
    const result = await consumeOnce('w2');
    expect(result.repeated).toBeGreaterThanOrEqual(1);
    expect(result.processed).toBe(0);

    const total = await prisma.event_projections.count({ where: { event_id: event.id } });
    expect(total).toBe(1);
    expect(await pendingCount()).toBe(0);
  });

  it('XAUTOCLAIM recupera la entrada de un consumidor caído (leyó sin ack)', async () => {
    const event = await persistirYPublicar();
    // 'w-crashed' lee la entrada y NO ackea (simula una caída tras la entrega).
    await redisCommand(['XREADGROUP', 'GROUP', GROUP, 'w-crashed', 'COUNT', '10', 'STREAMS', STREAM, '>']);
    expect(await pendingCount()).toBe(1);

    // min-idle del XAUTOCLAIM = 1000 ms: esperar para que sea reclamable.
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const result = await consumeOnce('w-recovery');
    expect(result.processed).toBeGreaterThanOrEqual(1);
    const projection = await prisma.event_projections.findUnique({ where: { event_id: event.id } });
    expect(projection).toBeTruthy();
    expect(await pendingCount()).toBe(0);
  });

  it('la referencia huérfana (sin evento en events_raw) se descarta sin proyectar', async () => {
    const orphanId = 'r4b-orphan-' + marcador();
    await xaddEventReference(STREAM, {
      event_id: orphanId,
      type: 'test.r4b.orphan',
      hash: 'r4b-orphan-hash-' + marcador(),
      occurred_at: new Date().toISOString(),
    });
    const result = await consumeOnce('w3');
    expect(result.discarded).toBeGreaterThanOrEqual(1);

    const total = await prisma.event_projections.count({ where: { event_id: orphanId } });
    expect(total).toBe(0);
    expect(await pendingCount()).toBe(0);
  });
});
