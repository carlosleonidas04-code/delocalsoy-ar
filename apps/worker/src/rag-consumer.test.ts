import { beforeAll, describe, expect, it } from 'vitest';

// NODO-VIG VIG-006 (NVIG-R8 #188, épica #167): consumidor de indexación
// 'vig006-rag-index' contra PostGIS + Redis REALES. En CI el job test
// levanta ambos servicios con DATABASE_URL y REDIS_URL fijas; sin base o
// sin Redis el suite se salta (R5: no se simula el transporte ni la
// indexación con mocks). El evento NO es el dato — es el disparador: el
// consumidor RE-DERIVA el índice rag_index del nodo desde el dominio
// publicado (upsert idempotente por nodo_key+source_type+source_id +
// delete lógico). Las aserciones se derivan del dominio vivo, no de
// constantes. El índice solo contiene prosa autorizada: subnodo|activo|kpi|comercio (MK-3a F-9).
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';
process.env.REDIS_URL = process.env.TEST_REDIS_URL ?? 'redis://localhost:6379';

const { prisma } = await import('@delocalsoy/db');
const { pingRedis, redisCommand, xaddEventReference } = await import('@delocalsoy/redis');
const { consumeRagOnce, ensureRagGroup, RAG_GROUP, RAG_STREAM } = await import('./rag.js');

const dbUp = await prisma
  .$queryRaw`SELECT 1`
  .then(() => true)
  .catch(() => false);
const redisUp = (await pingRedis()) === 'ok';

// Marcadores anti-PII-safe (ADR-027): sin dígitos largos, sin identificadores
// personales — solo claves de prueba efímeras.
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
let seq = 0;
const marcador = () => 'vig006.' + stamp + '.' + String(++seq);

type EventoPublicado = { id: string; hash: string; type: string; occurred_at: Date };

// Lo mismo que hace la API (R4a): persistir en events_raw (única verdad) y
// publicar la REFERENCIA al stream (transporte).
async function publicarEvento(nodoKey: string | null): Promise<EventoPublicado> {
  const event = await prisma.events_raw.create({
    data: {
      type: 'test.vig006.rag.' + marcador(),
      payload: nodoKey ? { nodo_key: nodoKey } : { etapa: 'sin-nodo' },
      hash: 'vig006-hash-' + marcador(),
      occurred_at: new Date(),
    },
  });
  await xaddEventReference(RAG_STREAM, {
    event_id: event.id,
    type: event.type,
    hash: event.hash,
    occurred_at: event.occurred_at.toISOString(),
  });
  return event;
}

async function pendingCount(): Promise<number> {
  const reply = (await redisCommand(['XPENDING', RAG_STREAM, RAG_GROUP])) as unknown as Array<unknown>;
  return Array.isArray(reply) ? Number(reply[0]) : -1;
}

describe.skipIf(!dbUp || !redisUp)('VIG-006 (#188) — consumidor de indexación vig006-rag-index', () => {
  beforeAll(async () => {
    // Desde AUD-08 (D2) el grupo nace en '0': la historia previa SE entrega
    // y se absorbe idempotentemente (recompute con upsert) — cada test
    // sigue publicando y consumiendo lo suyo.
    await ensureRagGroup();
  });

  it('un evento del nodo dispara la indexación: rag_index consistente con el dominio', async () => {
    const event = await publicarEvento('iglesia');
    const result = await consumeRagOnce('r-test-1');
    expect(result.processed).toBeGreaterThanOrEqual(1);

    // El índice cubre al menos la estructura territorial y los activos
    // aprobados no restricted (los KPIs se suman cuando existen snapshots).
    const subnodos = await prisma.subnodos.count({ where: { nodo_key: 'iglesia' } });
    const activos = await prisma.activos.count({
      where: { nodo_key: 'iglesia', estado: 'aprobado', visibilidad: { not: 'restricted' } },
    });
    const indexados = await prisma.rag_index.count({ where: { nodo_key: 'iglesia' } });
    expect(subnodos).toBeGreaterThan(0);
    expect(indexados).toBeGreaterThanOrEqual(subnodos + activos);

    // Solo prosa autorizada: source_type ∈ {subnodo, activo, kpi} — el
    // propio evento de prueba JAMÁS ingresa al índice.
    const filas = await prisma.rag_index.findMany({
      where: { nodo_key: 'iglesia' },
      select: { source_type: true, texto: true },
    });
    for (const fila of filas) {
      expect(['subnodo', 'activo', 'kpi', 'comercio']).toContain(fila.source_type); // MK-3a (#426): F-9
      expect(String(fila.texto)).not.toContain(event.type);
    }

    expect(await pendingCount()).toBe(0);
  });

  it('la re-entrega de la misma referencia re-indexa SIN duplicar (upsert idempotente)', async () => {
    const event = await publicarEvento('iglesia');
    await consumeRagOnce('r-test-2');
    const antes = await prisma.rag_index.count({ where: { nodo_key: 'iglesia' } });

    // re-entrega manual de la MISMA referencia (p. ej. re-publicación):
    await xaddEventReference(RAG_STREAM, {
      event_id: event.id,
      type: event.type,
      hash: event.hash,
      occurred_at: event.occurred_at.toISOString(),
    });
    const result = await consumeRagOnce('r-test-2');
    expect(result.processed).toBeGreaterThanOrEqual(1);

    // upsert por (nodo_key, source_type, source_id): conteo estable.
    const despues = await prisma.rag_index.count({ where: { nodo_key: 'iglesia' } });
    expect(despues).toBe(antes);
    expect(await pendingCount()).toBe(0);
  });

  it('un evento SIN nodo_key en el payload se descarta con ack (no es indexable)', async () => {
    await publicarEvento(null);
    const result = await consumeRagOnce('r-test-3');
    expect(result.discarded).toBeGreaterThanOrEqual(1);
    expect(await pendingCount()).toBe(0);
  });

  it('la referencia huérfana (sin evento en events_raw) se descarta sin indexar', async () => {
    const orphanId = 'vig006-orphan-' + marcador();
    await xaddEventReference(RAG_STREAM, {
      event_id: orphanId,
      type: 'test.vig006.orphan',
      hash: 'vig006-orphan-hash-' + marcador(),
      occurred_at: new Date().toISOString(),
    });
    const result = await consumeRagOnce('r-test-4');
    expect(result.discarded).toBeGreaterThanOrEqual(1);
    expect(await pendingCount()).toBe(0);
  });

  it('un evento de nodo inexistente se descarta con ack (honesto, R15)', async () => {
    await publicarEvento('nodo-falso-vig006');
    const result = await consumeRagOnce('r-test-5');
    expect(result.discarded).toBeGreaterThanOrEqual(1);
    expect(await pendingCount()).toBe(0);
  });
});
