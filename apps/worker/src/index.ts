import { prisma } from '@delocalsoy/db';
import { consumeOnce, ensureGroup } from './consume.js';
import { consumeKpisOnce, ensureKpiGroup } from './kpi.js';
import { consumeRagOnce, ensureRagGroup } from './rag.js';
import { reconcileOnce, ensureReconcileBootstrap } from './reconcile.js';
import { logJson } from './logger.js';

/**
 * Loop del worker — CORE-004 R4b (ADR-032, #87) + VIG-003 (NVIG-R3 #182,
 * épica #167) + VIG-006 (NVIG-R8 #188): TRES proyecciones por consumer
 * group sobre el MISMO stream 'events:raw' — R4b (event_projections),
 * vig003-kpi (kpi_snapshots) y vig006-rag-index (rag_index).
 * Consume en pasadas periódicas. Ante un error real
 * de proyección NO ackea (la entrada queda pending y XAUTOCLAIM la recupera
 * en la próxima pasada); ante Redis caído reintenta tras el intervalo — el
 * transporte es fail-open en la API y tolerante a fallos aquí.
 *
 * Variables (nombres, nunca valores): WORKER_INTERVAL_MS (default 5000),
 * WORKER_STOP_AFTER_PASSES (0 = infinito; > 0 = N pasadas y salir),
 * RECONCILE_INTERVAL_MS (default 60000) y RECONCILE_WINDOW_MS (default
 * 86400000) — reconciliador de transporte AUD-08 (#103).
 */

const INTERVAL_MS = Number(process.env.WORKER_INTERVAL_MS ?? 5000);
const STOP_AFTER_PASSES = Number(process.env.WORKER_STOP_AFTER_PASSES ?? 0);

// AUD-08 (#103, D3): cadencia de la pasada periódica del reconciliador y
// ventana deslizante — la pasada de arranque es completa (ventana null).
const RECONCILE_INTERVAL_MS = Number(process.env.RECONCILE_INTERVAL_MS ?? 60000);
const RECONCILE_WINDOW_MS = Number(process.env.RECONCILE_WINDOW_MS ?? 86400000);

let running = true;
process.on('SIGINT', () => { running = false; });
process.on('SIGTERM', () => { running = false; });

async function main(): Promise<void> {
  await ensureGroup();
  await ensureKpiGroup();
  await ensureRagGroup();
  logJson('info', 'worker_arrancado', {
    interval_ms: INTERVAL_MS,
    stop_after_passes: STOP_AFTER_PASSES,
    groups: ['core004-worker', 'vig003-kpi', 'vig006-rag-index'],
  });

  // AUD-08 (D2/D3, #103): orden de arranque del reconciliador — bootstrap
  // de despliegue (SETID 0 UNA VEZ, checkpoint sellado) → pasada completa
  // (ventana null) → loop con pasada cada RECONCILE_INTERVAL_MS.
  try {
    const bootstrap = await ensureReconcileBootstrap();
    if (bootstrap) {
      logJson('info', 'reconciliador_bootstrap', { aplicado: true });
    }
  } catch (err) {
      logJson('error', 'reconciliador_bootstrap', { aplicado: false, error: err instanceof Error ? err.message : String(err) });
  }
  let lastReconcileAt = Date.now();
  try {
    const arranque = await reconcileOnce(null);
    if (arranque.republished > 0 || arranque.errors > 0) {
      logJson('info', 'reconciliada', { pass: 'arranque', ...arranque });
    }
  } catch (err) {
      logJson('error', 'reconciliada_fallo', { pass: 'arranque', error: err instanceof Error ? err.message : String(err) });
  }
  let passes = 0;
  while (running) {
    try {
      const result = await consumeOnce();
      passes += 1;
      const total = result.processed + result.repeated + result.discarded;
      if (total > 0 || result.errors > 0) {
        logJson('info', 'pasada', { pass: passes, group: 'core004-worker', ...result });
      }
    } catch (err) {
        logJson('error', 'pasada_fallo', { pass: passes + 1, group: 'core004-worker', error: err instanceof Error ? err.message : String(err) });
    }
    try {
      const kpis = await consumeKpisOnce();
      const kpiTotal = kpis.processed + kpis.discarded;
      if (kpiTotal > 0 || kpis.errors > 0) {
        logJson('info', 'pasada', { pass: passes, group: 'vig003-kpi', ...kpis });
      }
    } catch (err) {
        logJson('error', 'pasada_fallo', { pass: passes + 1, group: 'vig003-kpi', error: err instanceof Error ? err.message : String(err) });
    }
    try {
      const rag = await consumeRagOnce();
      const ragTotal = rag.processed + rag.discarded;
      if (ragTotal > 0 || rag.errors > 0) {
        logJson('info', 'pasada', { pass: passes, group: 'vig006-rag-index', ...rag });
      }
    } catch (err) {
        logJson('error', 'pasada_fallo', { pass: passes + 1, group: 'vig006-rag-index', error: err instanceof Error ? err.message : String(err) });
    }
    if (Date.now() - lastReconcileAt >= RECONCILE_INTERVAL_MS) {
      lastReconcileAt = Date.now();
      try {
        const reconciliado = await reconcileOnce(RECONCILE_WINDOW_MS);
        if (reconciliado.republished > 0 || reconciliado.errors > 0) {
          logJson('info', 'reconciliada', { pass: passes, ...reconciliado });
        }
      } catch (err) {
        logJson('error', 'reconciliada_fallo', { pass: passes, error: err instanceof Error ? err.message : String(err) });
      }
    }
    if (STOP_AFTER_PASSES > 0 && passes >= STOP_AFTER_PASSES) break;
    await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
  }
  logJson('info', 'worker_detenido', { passes });
  try {
    await prisma.$disconnect();
  } catch {
    // ya desconectado
  }
}

void main();
