import { createHash } from 'node:crypto';
import { prisma } from '@delocalsoy/db';
import { redisCommand, xaddEventReference } from '@delocalsoy/redis';
import { STREAM, GROUP } from './consume.js';
import { KPI_STREAM, KPI_GROUP } from './kpi.js';
import { RAG_STREAM, RAG_GROUP } from './rag.js';

/**
 * Reconciliador de transporte — AUD-08 (#103, ADR-032), diseño ratificado
 * D1-D4 (docs/AUD-08-RECONCILIADOR-DISENO.md).
 *
 * events_raw es la única fuente de verdad; el stream 'events:raw' es SOLO
 * transporte. Cuando el transporte pierde una referencia (ingesta con Redis
 * caído, entradas previas al consumer group), la proyección se atrasa pero
 * la verdad no se pierde. Este módulo cierra el ciclo: re-publica al stream
 * las referencias FALTANTES y los 3 consumer groups existentes
 * (core004-worker, vig003-kpi, vig006-rag-index) se reparan solos por su
 * idempotencia ya acreditada (P2002 «repeated»; KPIs/RAG re-computan con
 * upserts — hallazgo H3 del diseño).
 *
 * El reconciliador NO es consumer: no lee grupos ni proyecta — solo
 * re-publica. Cero dependencias nuevas (H5): reusa @delocalsoy/db y el
 * cliente RESP mínimo de @delocalsoy/redis (redisCommand acepta
 * XLEN/XRANGE/XGROUP SETID sin tocar el paquete).
 *
 * Cadencia (D3): pasada cada 60 s (RECONCILE_INTERVAL_MS) con ventana
 * deslizante 24 h (RECONCILE_WINDOW_MS) + pasada completa al arranque
 * (ventana null). Deuda declarada (diseño §9): si el stream crece, acotar
 * la pasada completa por checkpoint de occurred_at. XTRIM fuera de
 * alcance v1.
 */

export const BOOTSTRAP_TYPE = 'system.reconcile_bootstrap';

// Los 3 grupos que repara el bootstrap (D2) — el mismo stream, 3 proyecciones.
export const RECONCILE_GROUPS: Array<[string, string]> = [
  [STREAM, GROUP],
  [KPI_STREAM, KPI_GROUP],
  [RAG_STREAM, RAG_GROUP],
];

export type ReconcileResult = {
  scanned: number;
  republished: number;
  skipped: number;
  errors: number;
};

// XRANGE: [[id, [campo, valor, ...]], ...] | null → set(event_id).
async function streamEventIds(): Promise<Set<string>> {
  const out = new Set<string>();
  const reply = await redisCommand(['XRANGE', STREAM, '-', '+']);
  if (!Array.isArray(reply)) return out;
  for (const entry of reply as unknown as Array<[string, string[]]>) {
    if (!Array.isArray(entry) || !Array.isArray(entry[1])) continue;
    const fields = entry[1];
    for (let i = 0; i + 1 < fields.length; i += 2) {
      if (fields[i] === 'event_id' && typeof fields[i + 1] === 'string') {
        out.add(fields[i + 1]);
      }
    }
  }
  return out;
}

// Una pasada del reconciliador. windowMs null = pasada completa (arranque);
// con ventana, solo examina eventos ocurridos dentro de la ventana.
export async function reconcileOnce(windowMs: number | null): Promise<ReconcileResult> {
  const result: ReconcileResult = { scanned: 0, republished: 0, skipped: 0, errors: 0 };

  // 1. GATE barato (D1): XLEN vs count(events_raw). XLEN >= count ⇒ estado
  //    sano — las re-publicaciones solo suman y la API no duplica
  //    referencias (el duplicado por hash responde 200 sin xadd).
  let xlen = -1;
  try {
    xlen = Number(await redisCommand(['XLEN', STREAM]));
  } catch {
    // sin Redis: nada que reconciliar — se reintenta en la próxima pasada.
    return result;
  }
  const dbTotal = await prisma.events_raw.count();
  if (xlen >= dbTotal) {
    result.scanned = dbTotal;
    result.skipped = dbTotal;
    return result;
  }

  // 2. DIFF fino (solo si el gate detecta hueco): referencias del stream
  //    vs eventos persistidos (la ventana aplica al lado de la base).
  const streamIds = await streamEventIds();
  const cutoff = windowMs === null ? null : new Date(Date.now() - windowMs);
  const events = await prisma.events_raw.findMany({
    where: cutoff ? { occurred_at: { gte: cutoff } } : {},
    select: { id: true, type: true, hash: true, occurred_at: true },
  });

  // 3. RE-PUBLICAR los faltantes — mismos 4 campos que la API (R4a).
  for (const event of events) {
    result.scanned += 1;
    if (streamIds.has(event.id)) {
      result.skipped += 1;
      continue;
    }
    const added = await xaddEventReference(STREAM, {
      event_id: event.id,
      type: event.type,
      hash: event.hash,
      occurred_at: event.occurred_at.toISOString(),
    });
    if (added !== null) result.republished += 1;
    else result.errors += 1;
  }
  return result;
}

// Repara el offset de un grupo (D2): XGROUP SETID 0 — la historia completa
// vuelve a ser entregable; los consumers absorben el reproceso (H3).
export async function setGroupToStart(stream: string, group: string): Promise<void> {
  await redisCommand(['XGROUP', 'SETID', stream, group, '0']);
}

// Bootstrap de despliegue (D2 + H8): si NO existe el sello
// 'system.reconcile_bootstrap' en events_raw → SETID 0 a los 3 grupos +
// sello idempotente del checkpoint. Re-arranques ven el sello y no repiten.
// Devuelve true si ejecutó el bootstrap en ESTA llamada, false si ya estaba.
export async function ensureReconcileBootstrap(): Promise<boolean> {
  const existing = await prisma.events_raw.findFirst({ where: { type: BOOTSTRAP_TYPE } });
  if (existing) return false;

  for (const [stream, group] of RECONCILE_GROUPS) {
    try {
      await setGroupToStart(stream, group);
    } catch (err) {
      // Grupo ausente (orden de arranque alterado): ensureGroup(s) lo crea
      // en '0' — nada que reparar. Cualquier otro error escala.
      const message = err instanceof Error ? err.message : String(err);
      if (!message.includes('NOGROUP')) throw err;
    }
  }

  // Sello del checkpoint (R7: el sello ES el estado; hash idempotente — si
  // otra instancia selló primero, P2002 y esta llamada no cambió nada).
  const occurredAt = new Date();
  const payload = { actor: 'aud08-reconciliador', via: 'worker-bootstrap' };
  const hash = createHash('sha256')
    .update(BOOTSTRAP_TYPE + '|' + occurredAt.toISOString() + '|' + JSON.stringify(payload))
    .digest('hex');
  try {
    const sealed = await prisma.events_raw.create({
      data: { type: BOOTSTRAP_TYPE, payload, hash, occurred_at: occurredAt },
    });
    // El sello también pasa al transporte (fail-open) — mismo patrón que
    // PATCH /api/health/mode (H4): consume.ts lo proyecta una vez y
    // kpi/rag lo descartan (sin nodo_key). El lag público excluye
    // system.* de ambos lados (H6) — el sello no distorsiona la métrica.
    await xaddEventReference(STREAM, {
      event_id: sealed.id,
      type: sealed.type,
      hash: sealed.hash,
      occurred_at: sealed.occurred_at.toISOString(),
    });
  } catch (err) {
    if ((err as { code?: string } | null)?.code === 'P2002') return false;
    throw err;
  }
  return true;
}
