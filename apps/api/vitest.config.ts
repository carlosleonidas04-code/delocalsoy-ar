import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    // Mismos mapeos que apps/api/tsconfig.json (paths): la suite resuelve
    // los paquetes del workspace por su fuente TS, sin build previo.
    alias: {
      '@delocalsoy/db': r('../../packages/db/src/index.ts'),
      '@delocalsoy/contracts': r('../../packages/contracts/src/index.ts'),
    },
  },
  test: {
    // Aislamiento por archivo: cada suite setea su propio DATABASE_URL
    // ANTES de importar la app (registro de módulos separado por archivo).
    isolate: true,
  },
});
