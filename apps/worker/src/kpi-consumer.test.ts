import { beforeAll, describe, expect, it } from 'vitest';

// NODO-VIG VIG-003 (NVIG-R3 #182, épica #167): consumidor de KPIs
// `vig003-kpi` contra PostGIS + Redis REALES. En CI el job test levanta ambos
// servicios con DATABASE_URL y REDIS_URL fijas; sin base o sin Redis el
// suite se salta (R5: no se simula el transporte ni el recompute con mocks).
// El evento NO es el dato — es el disparador: el consumidor re-computa el
// set de KPIs del nodo desde el dominio (idempotente por upsert). Las
// aserciones se derivan del dominio vivo, no de constantes.
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';
process.env.REDIS_URL = process.env.TEST_REDIS_URL ?? 'redis://localhost:6379';

const { prisma } = await import('@delocalsoy/db');
const { pingRedis, redisCommand, xaddEventReference } = await import('@delocalsoy/redis');
const { consumeKpisOnce, ensureKpiGroup, KPI_GROUP, KPI_STREAM } = await import('./kpi.js');

const dbUp = await prisma
  .$queryRaw`SELECT 1`
  .then(() => true)
  .catch(() => false);
const redisUp = (await pingRedis()) === 'ok';

// Marcadores anti-PII-safe (ADR-027): sin dígitos largos, sin identificadores
// personales — solo claves de prueba efímeras.
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
let seq = 0;
const marcador = () => 'vig003.' + stamp + '.' + String(++seq);

type EventoPublicado = { id: string; hash: string; type: string; occurred_at: Date };

// Lo mismo que hace la API (R4a): persistir en events_raw (única verdad) y
// publicar la REFERENCIA al stream (transporte).
async function publicarEvento(nodoKey: string | null): Promise<EventoPublicado> {
  const event = await prisma.events_raw.create({
    data: {
      type: 'test.vig003.kpi.' + marcador(),
      payload: nodoKey ? { nodo_key: nodoKey } : { etapa: 'sin-nodo' },
      hash: 'vig003-hash-' + marcador(),
      occurred_at: new Date(),
    },
  });
  await xaddEventReference(KPI_STREAM, {
    event_id: event.id,
    type: event.type,
    hash: event.hash,
    occurred_at: event.occurred_at.toISOString(),
  });
  return event;
}

async function pendingCount(): Promise<number> {
  const reply = (await redisCommand(['XPENDING', KPI_STREAM, KPI_GROUP])) as unknown as Array<unknown>;
  return Array.isArray(reply) ? Number(reply[0]) : -1;
}

function snapshot(nodoKey: string, kpiKey: string): Promise<any> {
  return prisma.kpi_snapshots.findUnique({
    where: { nodo_key_kpi_key: { nodo_key: nodoKey, kpi_key: kpiKey } },
  });
}

describe.skipIf(!dbUp || !redisUp)('VIG-003 (#182) — consumidor de KPIs vig003-kpi', () => {
  beforeAll(async () => {
    // Desde AUD-08 (D2) el grupo nace en '0': la historia previa SE entrega
    // y se absorbe idempotentemente (recompute con upsert) — cada test
    // sigue publicando y consumiendo lo suyo.
    await ensureKpiGroup();
    // AUD-08 (R4): los P2002 «repeated» son esperados (idempotencia
    // ADR-032), pero el servicio PostGIS de CI los loguea a stderr con
    // STATEMENT completo y esa sección inunda el tail de 20000 chars del
    // auto-report — la salida de vitest quedaba FUERA del comentario
    // (corridas 34cd6d4→da822f6: ciego ante el paso que falla). Silenciar
    // el LOG DEL SERVIDOR para esta corrida de CI: el cliente (Prisma)
    // sigue recibiendo cada P2002 y los tests siguen contando «repeated» —
    // no se oculta comportamiento, solo el ruido del contenedor. Defensa
    // SECUNDARIA: el silenciamiento primario vive en vitest.global-setup.ts
    // (ALTER SYSTEM + pg_reload_conf, corre ANTES que cualquier archivo) —
    // vitest ordena por TAMAÑO descendente, no alfabético: este archivo NO
    // corre primero y el ALTER ROLE solía llegar tarde (corrida da822f6).
    try {
      const filas = (await prisma.$queryRawUnsafe(
        'SELECT CURRENT_USER AS nombre'
      )) as Array<{ nombre: string }>;
      const usuario = filas[0]?.nombre;
      if (typeof usuario === 'string' && usuario.length > 0) {
        await prisma.$executeRawUnsafe(
          `ALTER ROLE "${usuario}" SET log_min_messages = 'fatal'`
        );
        await prisma.$executeRawUnsafe(
          `ALTER ROLE "${usuario}" SET log_min_error_statement = 'panic'`
        );
      }
    } catch {
      // best-effort (higiene del log en CI): sin superusuario local, el
      // ruido queda — no afecta la semántica de los tests.
    }
  });

  it('un evento del nodo dispara el recompute: snapshot consistente con el dominio', async () => {
    const event = await publicarEvento('iglesia');
    const result = await consumeKpisOnce('k-test-1');
    expect(result.processed).toBeGreaterThanOrEqual(1);

    const subnodosTotal = await prisma.subnodos.count({ where: { nodo_key: 'iglesia' } });
    const total = await snapshot('iglesia', 'subnodos_total');
    expect(total).toBeTruthy();
    expect(total?.valor).toBe(subnodosTotal);

    // eventos_por_tipo incluye al propio evento de prueba (payload nodo_key)
    const eventos = await snapshot('iglesia', 'eventos_por_tipo');
    const detalles = (eventos?.detalles ?? {}) as Record<string, number>;
    expect(detalles[event.type]).toBeGreaterThanOrEqual(1);

    expect(await pendingCount()).toBe(0);
  });

  it('la re-entrega de la misma referencia re-computa SIN duplicar (upsert idempotente)', async () => {
    const event = await publicarEvento('iglesia');
    await consumeKpisOnce('k-test-2');
    const antes = await snapshot('iglesia', 'subnodos_total');

    // re-entrega manual de la MISMA referencia (p. ej. re-publicación):
    await xaddEventReference(KPI_STREAM, {
      event_id: event.id,
      type: event.type,
      hash: event.hash,
      occurred_at: event.occurred_at.toISOString(),
    });
    const result = await consumeKpisOnce('k-test-2');
    expect(result.processed).toBeGreaterThanOrEqual(1);

    // upsert por (nodo_key, kpi_key): sin duplicados y valor estable.
    const filas = await prisma.kpi_snapshots.count({ where: { nodo_key: 'iglesia' } });
    expect(filas).toBe(25); // + 4 KPIs del observatorio (LIC-R1 #457) // set v1 (VIG-003) + set v2 (VIG-013) + set v2 mercado (MK-3a #426)
    const despues = await snapshot('iglesia', 'subnodos_total');
    expect(despues?.valor).toBe(antes?.valor);
    expect(await pendingCount()).toBe(0);
  });

  it('un evento SIN nodo_key en el payload se descarta con ack (no es un KPI)', async () => {
    await publicarEvento(null);
    const result = await consumeKpisOnce('k-test-3');
    expect(result.discarded).toBeGreaterThanOrEqual(1);
    expect(await pendingCount()).toBe(0);
  });

  it('la referencia huérfana (sin evento en events_raw) se descarta sin recomputar', async () => {
    const orphanId = 'vig003-orphan-' + marcador();
    await xaddEventReference(KPI_STREAM, {
      event_id: orphanId,
      type: 'test.vig003.orphan',
      hash: 'vig003-orphan-hash-' + marcador(),
      occurred_at: new Date().toISOString(),
    });
    const result = await consumeKpisOnce('k-test-4');
    expect(result.discarded).toBeGreaterThanOrEqual(1);
    expect(await pendingCount()).toBe(0);
  });

  it('un evento de nodo inexistente se descarta con ack (honesto, R15)', async () => {
    await publicarEvento('nodo-falso-vig003');
    const result = await consumeKpisOnce('k-test-5');
    expect(result.discarded).toBeGreaterThanOrEqual(1);
    expect(await pendingCount()).toBe(0);
  });
});

