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
  },
});
