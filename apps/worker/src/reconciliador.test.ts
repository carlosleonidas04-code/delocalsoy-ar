import { beforeAll, describe, expect, it, vi } from 'vitest';

// AUD-08 (#103, ADR-032) — reconciliador de transporte contra PostGIS +
// Redis REALES. En CI el job test levanta ambos servicios con DATABASE_URL
// y REDIS_URL fijas; sin base o sin Redis el suite se salta (R5: no se
// simula el transporte con mocks).
//
// El caso de la auditoría #103 es de DOS procesos: la API ingiere con
// Redis caído (fail-open ADR-032: persiste en events_raw sin publicar la
// referencia — acreditado en apps/api/src/reconciliador.test.ts) y el
// worker reconcilia DESPUÉS. Aquí se construye el estado EXACTO que deja
// esa caída: evento en events_raw SIN referencia en el stream. Nada
// simulado (R15): es el estado real que produce la caída.
//
// vitest corre los archivos del worker EN SECUENCIA (fileParallelism
// false en vitest.config.ts): este suite comparte el consumer group
// core004-worker con worker-consume.test.ts — las pasadas son
// deterministas solo sin archivos concurrentes sobre el mismo stream.

// Timeout de suite: el bootstrap del test 3 hace XGROUP SETID 0 a los 3
// grupos REALES (D2) y la re-entrega completa (~90 entradas, con
// recomputes KPI/RAG del dominio) se absorbe en los drenajes de los
// tests siguientes — el default de 5 s por test de vitest no alcanza.
vi.setConfig({ testTimeout: 300_000, hookTimeout: 300_000 });

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';
process.env.REDIS_URL = process.env.TEST_REDIS_URL ?? 'redis://localhost:6379';

const { prisma } = await import('@delocalsoy/db');
const { pingRedis, redisCommand, xaddEventReference } = await import('@delocalsoy/redis');
const { consumeOnce, ensureGroup, STREAM } = await import('./consume.js');
const { consumeKpisOnce } = await import('./kpi.js');
const { consumeRagOnce } = await import('./rag.js');
const { reconcileOnce, ensureReconcileBootstrap, setGroupToStart, BOOTSTRAP_TYPE } = await import('./reconcile.js');

const dbUp = await prisma
  .$queryRaw`SELECT 1`
  .then(() => true)
  .catch(() => false);
const redisUp = (await pingRedis()) === 'ok';

// Marcadores anti-PII-safe (ADR-027): corridas de dígitos de a lo sumo 4 —
// no matchean DNI/CUIT/CUIL ni teléfonos AR.
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
let seq = 0;
const marcador = () => 'aud08.' + stamp + '.' + String(++seq);

type EventoPublicado = { id: string; hash: string; type: string; occurred_at: Date };

// El estado EXACTO que deja Redis caído al ingerir (AUD-08 H2): persistido
// en events_raw (única verdad), referencia JAMÁS publicada al stream.
async function persistir(tipo: string, payload: Record<string, unknown>): Promise<EventoPublicado> {
  return prisma.events_raw.create({
    data: {
      type: tipo,
      payload,
      hash: 'aud08-hash-' + marcador(),
      occurred_at: new Date(),
    },
  });
}

// Cuántas referencias del evento viven en el stream (XRANGE completo).
async function referenciasDe(eventId: string): Promise<number> {
  const reply = await redisCommand(['XRANGE', STREAM, '-', '+']);
  const entries = (reply ?? []) as unknown as Array<[string, string[]]>;
  let n = 0;
  for (const e of entries) {
    if (Array.isArray(e) && Array.isArray(e[1]) && (e[1] as string[]).includes(eventId)) n += 1;
  }
  return n;
}

// Lag local — espejo exacto del cálculo de GET /api/health (D4):
// non-system vs non-system (H6).
async function lagLocal(): Promise<number> {
  const [eventsRawNoSystem, eventProjections] = await Promise.all([
    prisma.events_raw.count({ where: { NOT: { type: { startsWith: 'system.' } } } }),
    prisma.event_projections.count({ where: { NOT: { event_type: { startsWith: 'system.' } } } }),
  ]);
  return eventsRawNoSystem - eventProjections;
}

// Drena TODAS las entregas nuevas de un grupo (> en rondas) y devuelve los
// event_id entregados — para observar qué el grupo puede ver desde su
// posición actual (offset de nacimiento o tras SETID).
async function drenar(group: string, consumer: string): Promise<string[]> {
  const ids: string[] = [];
  for (let vuelta = 0; vuelta < 50; vuelta += 1) {
    const reply = await redisCommand(['XREADGROUP', 'GROUP', group, consumer, 'COUNT', '100', 'STREAMS', STREAM, '>']);
    const streams = (reply ?? []) as unknown as Array<[string, Array<[string, string[]]>]>;
    let entregadas = 0;
    for (const item of streams) {
      if (!Array.isArray(item)) continue;
      const entries = item[1];
      if (!Array.isArray(entries)) continue;
      for (const entry of entries) {
        if (!Array.isArray(entry)) continue;
        entregadas += 1;
        const fields = (entry[1] ?? []) as unknown as string[];
        for (let i = 0; i + 1 < fields.length; i += 2) {
          if (fields[i] === 'event_id') ids.push(String(fields[i + 1]));
        }
      }
    }
    if (entregadas === 0) break;
  }
  return ids;
}

// Drenaje en rondas: consumeOnce/consumeKpisOnce/consumeRagOnce procesan
// a lo sumo BATCH_COUNT (20) entradas nuevas + reclamos por pasada. Desde
// AUD-08 (D2) los grupos nacen en '0' y comparten la historia de las suites
// previas del job; además la reconciliación república los sellos del seed
// que nacieron sin referencia (hueco real del SQL directo) — una sola
// pasada NO garantiza drenar. Rondas hasta ack 0: nada queda pending.
async function consumirTodo(consumer: string): Promise<void> {
  for (let vuelta = 0; vuelta < 100; vuelta += 1) {
    const r = await consumeOnce(consumer);
    if (r.acked === 0) break;
  }
}
async function consumirKpisTodo(consumer: string): Promise<void> {
  for (let vuelta = 0; vuelta < 100; vuelta += 1) {
    const r = await consumeKpisOnce(consumer);
    if (r.acked === 0) break;
  }
}
async function consumirRagTodo(consumer: string): Promise<void> {
  for (let vuelta = 0; vuelta < 100; vuelta += 1) {
    const r = await consumeRagOnce(consumer);
    if (r.acked === 0) break;
  }
}

describe.skipIf(!dbUp || !redisUp)('AUD-08 (#103) — reconciliador del transporte (ADR-032, D1-D4)', () => {
  beforeAll(async () => {
    // Grupos reales del sistema — desde AUD-08 (D2) nacen en '0'.
    await ensureGroup();
  });

  it('caso de la auditoría: persistido sin referencia → 1 pasada → proyectado exactamente una vez', async () => {
    const event = await persistir('test.aud08.auditoria.' + marcador(), { etapa: 'redis-caido' });
    expect(await referenciasDe(event.id)).toBe(0); // el hueco es real
    const pasada = await reconcileOnce(null);
    expect(pasada.republished).toBeGreaterThanOrEqual(1);
    expect(await referenciasDe(event.id)).toBe(1);
    await consumirTodo('aud08-t1');
    expect(await prisma.event_projections.count({ where: { event_id: event.id } })).toBe(1);
  });

  it('hueco pre-grupo (D2): SETID 0 vuelve entregable lo nacido antes del grupo', async () => {
    const event = await persistir('test.aud08.pregrupo.' + marcador(), { etapa: 'pre-grupo' });
    await xaddEventReference(STREAM, {
      event_id: event.id,
      type: event.type,
      hash: event.hash,
      occurred_at: event.occurred_at.toISOString(),
    });
    const grupo = 'aud08-pregrupo';
    // Simular el mundo pre-AUD-08 en un grupo aislado: nace en '$' DESPUÉS
    // de la entrada (restos de corridas locales se destruyen primero).
    await redisCommand(['XGROUP', 'DESTROY', STREAM, grupo]).catch(() => undefined);
    await redisCommand(['XGROUP', 'CREATE', STREAM, grupo, '$']);
    const antes = await drenar(grupo, 'aud08-pre-1');
    expect(antes.includes(event.id)).toBe(false); // '$' no entrega la historia
    // El mecanismo del bootstrap (misma función que usa ensureReconcileBootstrap):
    await setGroupToStart(STREAM, grupo);
    const despues = await drenar(grupo, 'aud08-pre-1');
    expect(despues.includes(event.id)).toBe(true); // '0' la entrega
    await redisCommand(['XGROUP', 'DESTROY', STREAM, grupo]);
  });

  it('bootstrap de despliegue (D2/H8): sella el checkpoint UNA vez y no repite', async () => {
    const antes = await prisma.events_raw.count({ where: { type: BOOTSTRAP_TYPE } });
    const corrio = await ensureReconcileBootstrap();
    const trasPrimera = await prisma.events_raw.count({ where: { type: BOOTSTRAP_TYPE } });
    expect(trasPrimera).toBe(antes + (corrio ? 1 : 0));
    // Re-arranque: el checkpoint presente → sin SETID y sin sello nuevo.
    const repitio = await ensureReconcileBootstrap();
    expect(repitio).toBe(false);
    expect(await prisma.events_raw.count({ where: { type: BOOTSTRAP_TYPE } })).toBe(trasPrimera);
  });

  it('idempotencia: 2 pasadas → 0 re-publicaciones de lo reparado; proyección única', async () => {
    const eventos: EventoPublicado[] = [];
    for (let i = 0; i < 3; i += 1) {
      eventos.push(await persistir('test.aud08.idem.' + marcador(), { etapa: 'idempotencia' }));
    }
    const primera = await reconcileOnce(null);
    expect(primera.republished).toBeGreaterThanOrEqual(3);
    await consumirTodo('aud08-t4');
    const segunda = await reconcileOnce(null);
    expect(segunda.republished).toBe(0); // ya no hay faltantes
    await consumirTodo('aud08-t4');
    for (const ev of eventos) {
      expect(await referenciasDe(ev.id)).toBe(1); // XLEN creció UNA vez, no más
      expect(await prisma.event_projections.count({ where: { event_id: ev.id } })).toBe(1);
    }
  });

  it('lag (D4): drenado lag 0 → hueco lag 1 → tras reconciliar+consumir lag 0 (criterio #103)', async () => {
    // Línea de base honesta: reconciliar y consumir TODO hueco previo (p. ej.
    // el que deja la suite de la API con Redis caído) — el sistema drenado
    // cumple el criterio de éxito de la auditoría: lag 0.
    await reconcileOnce(null);
    await consumirTodo('aud08-t5-base');
    expect(await lagLocal()).toBe(0);
    const event = await persistir('test.aud08.lag.' + marcador(), { etapa: 'lag' });
    expect(await lagLocal()).toBe(1);
    await reconcileOnce(null);
    await consumirTodo('aud08-t5');
    expect(await lagLocal()).toBe(0);
  });

  it('los 3 grupos (D1): sello comercio.* con hueco → KPIs y RAG regenerados del dominio', async () => {
    const nodo = await prisma.nodos.findFirst({ where: { key: 'iglesia' } });
    expect(nodo).toBeTruthy(); // nodo del seed territorial (VIG-003/VIG-006)
    const event = await persistir('comercio.alta.aud08.' + marcador(), { nodo_key: 'iglesia' });
    // Borrar los derivados del nodo: si D1 funciona, el reproceso disparado
    // por la referencia reconciliada los regenera desde el dominio.
    await prisma.kpi_snapshots.deleteMany({ where: { nodo_key: 'iglesia' } });
    await prisma.rag_index.deleteMany({ where: { nodo_key: 'iglesia' } });
    const pasada = await reconcileOnce(null);
    expect(pasada.republished).toBeGreaterThanOrEqual(1);
    await consumirTodo('aud08-t6'); // event_projections (core004-worker)
    await consumirKpisTodo('aud08-t6-k'); // kpi_snapshots (vig003-kpi)
    await consumirRagTodo('aud08-t6-r'); // rag_index (vig006-rag-index)
    expect(await prisma.event_projections.count({ where: { event_id: event.id } })).toBe(1);
    // KPIs regenerados y el propio evento computado (eventos_por_tipo):
    expect(await prisma.kpi_snapshots.count({ where: { nodo_key: 'iglesia' } })).toBeGreaterThan(0);
    const eventosPorTipo = await prisma.kpi_snapshots.findUnique({
      where: { nodo_key_kpi_key: { nodo_key: 'iglesia', kpi_key: 'eventos_por_tipo' } },
    });
    const detalles = (eventosPorTipo?.detalles ?? {}) as Record<string, number>;
    expect(detalles[event.type]).toBeGreaterThanOrEqual(1);
    // Índice RAG regenerado (prosa autorizada: subnodo|activo|kpi):
    expect(await prisma.rag_index.count({ where: { nodo_key: 'iglesia' } })).toBeGreaterThan(0);
  });
});
