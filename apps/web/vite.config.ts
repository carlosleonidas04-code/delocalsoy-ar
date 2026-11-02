/**
 * DELocalSoy.AR — Config del dev server web — FE-DEUDA-03 #294.
 *
 * Refactor puro: la config pesada (seeds del staging, middleware de la API de
 * horizonte 3, voz en tiempo real live-ws y sus puertas) se extrajo 1:1 a
 * apps/web/dev/ — stagingSeeds.ts, stagingMiddleware.ts, geminiLiveClient.ts,
 * liveWsServer.ts, liveWsGate.ts (este último con su suite liveWsGate.test.ts).
 * Este archivo queda como pura config (criterio #294: < 10 KB).
 *
 * MISMO ORDEN de montaje que el original: live-ws primero, staging después.
 * Todas las puertas #236/M29 (origin, token fail-closed, límites por IP)
 * se conservan — ver dev/liveWsGate.ts y dev/liveWsGate.test.ts.
 */
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { montarLiveWs } from './dev/liveWsServer';
import { montarStaging } from './dev/stagingMiddleware';

export default defineConfig({
  envDir: '../../',
  plugins: [
    react(),
    {
      name: 'delocalsoy-api-horizon3',
      configureServer(server) {
        montarLiveWs(server);
        montarStaging(server);
      },
    },
  ],
  resolve: {
    alias: {
      '@delocalsoy/contracts': path.resolve(__dirname, '../../packages/contracts/src/index.ts'),
      '@delocalsoy/domain': path.resolve(__dirname, '../../packages/domain/src/index.ts'),
      '@delocalsoy/events': path.resolve(__dirname, '../../packages/events/src/index.ts'),
    },
  },
  server: {
    // Riesgo #57 (ADR-028, ratificado en main): binding conservador por defecto.
    // 0.0.0.0 + allowedHosts solo si el entorno lo declara explícitamente
    // (AI Studio/Codespace: HOST=0.0.0.0 + ALLOWED_HOSTS=true en el .env del monorepo).
    host: process.env.HOST ?? 'localhost',
    port: 3000,
    allowedHosts:
      process.env.ALLOWED_HOSTS === 'true' || !!process.env.CODESPACE || process.env.HOST === '0.0.0.0'
        ? true
        : undefined,
  },
});
