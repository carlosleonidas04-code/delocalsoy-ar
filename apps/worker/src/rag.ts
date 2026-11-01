import { prisma, recomputeRagIndexForNode } from '@delocalsoy/db';
import { redisCommand } from '@delocalsoy/redis';

/**
 * Indexación RAG del stream 'events:raw' — NODO-VIG VIG-006 (NVIG-R8
 * #188, épica #167). Mismo patrón que kpi.ts (VIG-003) y consume.ts
 * (CORE-004 R4b, ADR-032) con su PROPIO consumer group: cada entrada se
 * entrega a un solo consumidor y se ackea SOLO tras indexar.
 *
 * Semántica: el evento NO es el dato — es el disparador. Para cada evento
 * verificado contra events_raw (event_id+hash) cuyo payload declara el
 * nodo_key de un nodo existente, se RE-DERIVA el índice RAG completo del
 * nodo desde el dominio publicado (recomputeRagIndexForNode — upsert
 * idempotente por nodo_key+source_type+source_id + delete lógico, nunca
 * acumulación). La re-entrega de una referencia no duplica nada:
 * re-indexar es seguro por diseño.
 *
 * Descartes honestos (ack sin indexar): referencia malformada, huérfana o
 * alterada (events_raw manda), evento sin nodo_key en el payload (p. ej.
 * sesiones auth) o de un nodo que no existe (R15). Error real: SIN ack —
 * la entrada queda pending y XAUTOCLAIM la recupera.
 *
 * Cero dependencias nuevas (criterio R3b/R4a): reusa @delocalsoy/db y el
 * cliente RESP mínimo de @delocalsoy/redis. La regla de contenido vive en
 * recomputeRagIndexForNode: el índice NUNCA ingiere restricted (ADR-036),
 * el campo sensible de custodia, consentimiento ni PII (Ley 25.326).
 */

export const RAG_STREAM = 'events:raw';
export const RAG_GROUP = 'vig006-rag-index';
export const RAG_CONSUMER_DEFAULT = 'rag-1';

const BATCH_COUNT = 20;
const MIN_IDLE_MS = 1000;

export type RagConsumeResult = {
  processed: number;
  discarded: number;
  acked: number;
  errors: number;
};

type StreamEntry = [string, string[]];

// XREADGROUP: [[stream, [[id, [campo, valor, ...]], ...]]] | null
function readEntries(reply: unknown): StreamEntry[] {
  const out: StreamEntry[] = [];
  if (!Array.isArray(reply)) return out;
  for (const item of reply) {
    if (!Array.isArray(item)) continue;
    const entries = item[1];
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      if (Array.isArray(entry) && typeof entry[0] === 'string' && Array.isArray(entry[1])) {
        out.push([entry[0], entry[1] as unknown as string[]]);
      }
    }
  }
  return out;
}

// XAUTOCLAIM: [cursor, [[id, [campo, valor, ...]], ...], [borradas]] | null
function claimedEntries(reply: unknown): StreamEntry[] {
  const out: StreamEntry[] = [];
  if (!Array.isArray(reply) || !Array.isArray(reply[1])) return out;
  for (const entry of reply[1]) {
    if (Array.isArray(entry) && typeof entry[0] === 'string' && Array.isArray(entry[1])) {
      out.push([entry[0], entry[1] as unknown as string[]]);
    }
  }
  return out;
}

function fieldsToMap(fields: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (let i = 0; i + 1 < fields.length; i += 2) {
    map[fields[i]] = fields[i + 1];
  }
  return map;
}

// Crea el grupo si no existe en '0' (AUD-08 D2, #103): la historia
// completa se entrega desde el primer arranque — reprocesar es seguro por la
// idempotencia de cada consumer. BUSYGROUP = ya existe: re-arranque normal.
export async function ensureRagGroup(): Promise<void> {
  try {
    await redisCommand(['XGROUP', 'CREATE', RAG_STREAM, RAG_GROUP, '0', 'MKSTREAM']);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.includes('BUSYGROUP')) throw err;
  }
}

async function ack(id: string): Promise<void> {
  await redisCommand(['XACK', RAG_STREAM, RAG_GROUP, id]);
}

async function processRagEntry(entry: StreamEntry, result: RagConsumeResult): Promise<void> {
  const [id, fields] = entry;
  const map = fieldsToMap(fields);
  const eventId = map.event_id;
  const hash = map.hash;

  if (!eventId || !hash) {
    // Referencia malformada: descartar con ack.
    result.discarded += 1;
    await ack(id);
    result.acked += 1;
    return;
  }

  const raw = await prisma.events_raw.findUnique({ where: { id: eventId } });
  if (!raw || raw.hash !== hash) {
    // Huérfana o alterada: events_raw manda — descartar con ack.
    result.discarded += 1;
    await ack(id);
    result.acked += 1;
    return;
  }

  const payload = (raw.payload ?? {}) as Record<string, unknown>;
  const nodoKey = payload.nodo_key;
  if (typeof nodoKey !== 'string' || nodoKey.length === 0) {
    // Sin territorio en el payload (p. ej. sesiones auth): no es indexable.
    result.discarded += 1;
    await ack(id);
    result.acked += 1;
    return;
  }

  const nodo = await prisma.nodos.findFirst({ where: { key: nodoKey } });
  if (!nodo) {
    // Nodo inexistente: honesto (R15) — no se indexa un nodo falso.
    result.discarded += 1;
    await ack(id);
    result.acked += 1;
    return;
  }

  try {
    await recomputeRagIndexForNode(nodoKey);
  } catch (err) {
    // Error real: SIN ack. Queda pending y XAUTOCLAIM la recupera.
    result.errors += 1;
    throw err;
  }
  result.processed += 1;
  await ack(id);
  result.acked += 1;
}

// Una pasada: reclama huérfanas pendientes y consume las entradas nuevas.
export async function consumeRagOnce(consumer: string = RAG_CONSUMER_DEFAULT): Promise<RagConsumeResult> {
  await ensureRagGroup();
  const result: RagConsumeResult = { processed: 0, discarded: 0, acked: 0, errors: 0 };

  const claimed = await redisCommand([
    'XAUTOCLAIM', RAG_STREAM, RAG_GROUP, consumer, String(MIN_IDLE_MS), '0-0',
  ]);
  for (const entry of claimedEntries(claimed)) {
    await processRagEntry(entry, result);
  }

  const reply = await redisCommand([
    'XREADGROUP', 'GROUP', RAG_GROUP, consumer, 'COUNT', String(BATCH_COUNT), 'STREAMS', RAG_STREAM, '>',
  ]);
  for (const entry of readEntries(reply)) {
    await processRagEntry(entry, result);
  }

  return result;
}
