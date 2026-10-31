import { Router } from 'express';
import { prisma } from '@delocalsoy/db';
import { pingRedis, redisCommand, type RedisReply } from '@delocalsoy/redis';
import { requireJwt, requireRole } from '../lib/auth.js';

/**
 * GET /api/health/detailed — A1 observabilidad (#290, hoja M1, RUNBOOK seccion 6):
 * salud detallada por COMPONENTE para la DH/ops. Acceso admin (D1 ratificado,
 * ADR-031): expone internals operativos (lag por consumer group, XLEN del stream,
 * latencias, version de node) — el health publico honesto (R5) sigue siendo
 * GET /api/health; este lo complementa, nunca lo reemplaza.
 *
 * R15 (honesto): sin base o sin Redis responde 200 con el estado parcial REAL
 * de cada componente (nulls declarados, status degraded) — nunca un OK
 * silencioso y nunca un 503 que esconda que cayo.
 */

const router: Router = Router();

async function dbCheck(): Promise<{ connected: boolean; latency_ms: number | null }> {
  const start = process.hrtime.bigint();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { connected: true, latency_ms: Number(process.hrtime.bigint() - start) / 1e6 };
  } catch {
    return { connected: false, latency_ms: null };
  }
}

// XINFO GROUPS devuelve un array de arrays [clave, valor, clave, valor...] —
// se aplana a objetos por grupo. Solo lectura de metadatos (ADR-032).
function groupsFromReply(reply: RedisReply): Array<Record<string, unknown>> {
  if (!Array.isArray(reply)) return [];
  return reply.map((entry) => {
    const obj: Record<string, unknown> = {};
    if (Array.isArray(entry)) {
      for (let i = 0; i + 1 < entry.length; i += 2) {
        obj[String(entry[i])] = entry[i + 1];
      }
    }
    return obj;
  });
}

async function redisCheck(): Promise<{
  ping: 'ok' | 'down';
  latency_ms: number | null;
  stream: { name: string; length: number } | null;
  consumer_groups: Array<Record<string, unknown>> | null;
}> {
  const start = process.hrtime.bigint();
  const ping = await pingRedis();
  const latency_ms = ping === 'ok' ? Number(process.hrtime.bigint() - start) / 1e6 : null;
  if (ping === 'down') {
    return { ping, latency_ms, stream: null, consumer_groups: null };
  }
  let stream: { name: string; length: number } | null = null;
  try {
    const xlen = await redisCommand(['XLEN', 'events:raw']);
    stream = { name: 'events:raw', length: typeof xlen === 'number' ? xlen : Number(xlen ?? 0) };
  } catch {
    stream = null; // honesto: sin metadato antes que un numero inventado
  }
  let consumer_groups: Array<Record<string, unknown>> | null = null;
  try {
    const reply = await redisCommand(['XINFO', 'GROUPS', 'events:raw']);
    consumer_groups = groupsFromReply(reply);
  } catch {
    consumer_groups = null;
  }
  return { ping, latency_ms, stream, consumer_groups };
}

// D3 ratificado: lag de proyeccion non-system vs non-system — misma definicion
// que AUD-08 D4 (#285). Duplicacion transitoria hasta unificar post-cascada
// (deuda declarada en #290). Sin base: null honesto (R15).
async function projectionLag(): Promise<{
  events_raw_no_system: number;
  event_projections: number;
  lag: number;
} | null> {
  try {
    const eventsRawNoSystem = await prisma.events_raw.count({
      where: { NOT: [{ type: { startsWith: 'system.' } }] },
    });
    const eventProjectionsNoSystem = await prisma.event_projections.count({
      where: { NOT: [{ event_type: { startsWith: 'system.' } }] },
    });
    return {
      events_raw_no_system: eventsRawNoSystem,
      event_projections: eventProjectionsNoSystem,
      lag: eventsRawNoSystem - eventProjectionsNoSystem,
    };
  } catch {
    return null;
  }
}

router.get('/', requireJwt, requireRole('admin'), async (_req, res) => {
  const db = await dbCheck();
  const redis = await redisCheck();
  const lag = db.connected ? await projectionLag() : null;
  const status = db.connected && redis.ping === 'ok' ? 'ok' : 'degraded';
  res.json({
    status,
    service: 'delocalsoy-ar-api',
    version: '0.4.0',
    db,
    redis,
    projection_lag: lag,
    process: {
      uptime_seconds: Math.round(process.uptime()),
      node_version: process.version,
      pid: process.pid,
      memory_rss_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    },
    timestamp: new Date().toISOString(),
  });
});

export default router;
