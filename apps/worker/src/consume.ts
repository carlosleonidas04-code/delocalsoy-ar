import { prisma } from '@delocalsoy/db';
import { redisCommand, type RedisReply } from '@delocalsoy/redis';

/**
 * Consumo del stream 'events:raw' — CORE-004 R4b (ADR-032, #87).
 *
 * events_raw es la única fuente de verdad; este módulo consume las
 * REFERENCIAS publicadas por la API (R4a) y proyecta cada evento a
 * event_projections EXACTAMENTE UNA VEZ:
 *  - consumer group: XREADGROUP entrega cada entrada a un solo consumidor;
 *  - idempotencia: event_id único en event_projections (P2002 = ya proyectado);
 *  - recuperación: XAUTOCLAIM reclama entradas de consumidores caídos
 *    (leídas sin ack) tras el mínimo de inactividad;
 *  - descartes honestos: referencia huérfana o hash que no coincide con
 *    events_raw se ackea sin proyectar (no entorpece el stream);
 *  - error real: SIN ack — la entrada queda pending y vuelve por XAUTOCLAIM.
 *
 * Cero dependencias nuevas (criterio R3b/R4a): reusa @delocalsoy/db y el
 * cliente RESP mínimo de @delocalsoy/redis.
 */

export const STREAM = 'events:raw';
export const GROUP = 'core004-worker';
export const CONSUMER_DEFAULT = 'worker-1';

const BATCH_COUNT = 20;
const MIN_IDLE_MS = 1000;

export type ConsumeResult = {
  processed: number;
  repeated: number;
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

// Crea el grupo si no existe (BUSYGROUP = ya existe: re-arranque normal).
export async function ensureGroup(): Promise<void> {
  try {
    await redisCommand(['XGROUP', 'CREATE', STREAM, GROUP, '$', 'MKSTREAM']);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.includes('BUSYGROUP')) throw err;
  }
}

async function ack(id: string): Promise<void> {
  await redisCommand(['XACK', STREAM, GROUP, id]);
}

async function processEntry(entry: StreamEntry, result: ConsumeResult): Promise<void> {
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

  try {
    await prisma.event_projections.create({
      data: {
        event_id: raw.id,
        event_type: raw.type,
        event_hash: raw.hash,
        projected_at: new Date(),
      },
    });
    result.processed += 1;
  } catch (err) {
    const code = (err as { code?: string } | null)?.code;
    if (code === 'P2002') {
      // event_id único: ya proyectado — exactamente una vez.
      result.repeated += 1;
    } else {
      // Error real: SIN ack. Queda pending y XAUTOCLAIM la recupera.
      result.errors += 1;
      throw err;
    }
  }
  await ack(id);
  result.acked += 1;
}

// Una pasada: reclama huérfanas pendientes y consume las entradas nuevas.
export async function consumeOnce(consumer: string = CONSUMER_DEFAULT): Promise<ConsumeResult> {
  await ensureGroup();
  const result: ConsumeResult = { processed: 0, repeated: 0, discarded: 0, acked: 0, errors: 0 };

  const claimed = await redisCommand([
    'XAUTOCLAIM', STREAM, GROUP, consumer, String(MIN_IDLE_MS), '0-0',
  ]);
  for (const entry of claimedEntries(claimed)) {
    await processEntry(entry, result);
  }

  const reply = await redisCommand([
    'XREADGROUP', 'GROUP', GROUP, consumer, 'COUNT', String(BATCH_COUNT), 'STREAMS', STREAM, '>',
  ]);
  for (const entry of readEntries(reply)) {
    await processEntry(entry, result);
  }

  return result;
}
