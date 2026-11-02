import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    // Mismos mapeos que apps/worker/tsconfig.json (paths): la suite resuelve
    // los paquetes del workspace por su fuente TS, sin build previo.
    alias: {
      '@delocalsoy/db': r('../../packages/db/src/index.ts'),
      '@delocalsoy/redis': r('../../packages/redis/src/index.ts'),
    },
  },
  test: {
    // Aislamiento por archivo: la suite setea DATABASE_URL y REDIS_URL
    // ANTES de importar el worker (registro de módulos separado por archivo).
    isolate: true,
    // AUD-08 (#103): reconciliador.test.ts comparte el consumer group
    // core004-worker con worker-consume.test.ts sobre el MISMO stream — sin
    // paralelismo entre archivos, las pasadas son deterministas.
    fileParallelism: false,
    // AUD-08 (fix CI, corrida 5 da822f6): vitest ordena los archivos por
    // TAMAÑO descendente (sequence.sort por defecto), NO alfabético — los
    // comentarios de las suites asumían orden alfabético. Orden explícito
    // determinista (discovery, alfabético): kpi-consumer → rag-consumer →
    // reconciliador → worker-consume.
    sequence: {
      sort: false,
    },
    // AUD-08 (R4): el silenciamiento del log del SERVICIO PostGIS vive en
    // globalSetup — corre ANTES que cualquier archivo, sin depender del
    // orden. Los P2002 «repeated» esperados (idempotencia ADR-032) inundaban
    // el tail de 20000 chars del auto-report y la salida de vitest quedaba
    // FUERA (corridas ciegas). El ALTER ROLE del beforeAll de
    // kpi-consumer.test.ts llegaba tarde (vitest ordena por tamaño).
    globalSetup: './vitest.global-setup.ts',
  },
});
