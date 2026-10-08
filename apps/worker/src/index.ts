import { prisma } from '@delocalsoy/db';
import { consumeOnce, ensureGroup } from './consume.js';

/**
 * Loop del worker — CORE-004 R4b (ADR-032, #87).
 *
 * Consume el stream 'events:raw' en pasadas periódicas. Ante un error real
 * de proyección NO ackea (la entrada queda pending y XAUTOCLAIM la recupera
 * en la próxima pasada); ante Redis caído reintenta tras el intervalo — el
 * transporte es fail-open en la API y tolerante a fallos aquí.
 *
 * Variables (nombres, nunca valores): WORKER_INTERVAL_MS (default 5000),
 * WORKER_STOP_AFTER_PASSES (0 = infinito; > 0 = N pasadas y salir).
 */

const INTERVAL_MS = Number(process.env.WORKER_INTERVAL_MS ?? 5000);
const STOP_AFTER_PASSES = Number(process.env.WORKER_STOP_AFTER_PASSES ?? 0);

let running = true;
process.on('SIGINT', () => { running = false; });
process.on('SIGTERM', () => { running = false; });

async function main(): Promise<void> {
  await ensureGroup();
  let passes = 0;
  while (running) {
    try {
      const result = await consumeOnce();
      passes += 1;
      const total = result.processed + result.repeated + result.discarded;
      if (total > 0 || result.errors > 0) {
        console.log('[worker] pasada %d: %o', passes, result);
      }
    } catch (err) {
      console.error('[worker] fallo en la pasada:', err instanceof Error ? err.message : String(err));
    }
    if (STOP_AFTER_PASSES > 0 && passes >= STOP_AFTER_PASSES) break;
    await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
  }
  try {
    await prisma.$disconnect();
  } catch {
    // ya desconectado
  }
}

void main();
