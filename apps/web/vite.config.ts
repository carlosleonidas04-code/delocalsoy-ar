/**
 * DELocalSoy.AR — Config del dev server web — FE-DEUDA-03 #294 + MONTAR-1 #442.
 *
 * Refactor puro (FE-DEUDA-03): la config pesada (seeds del staging, middleware de la API de
 * horizonte 3, voz en tiempo real live-ws y sus puertas) se extrajo 1:1 a
 * apps/web/dev/ — stagingSeeds.ts, stagingMiddleware.ts, geminiLiveClient.ts,
 * liveWsServer.ts, liveWsGate.ts (este último con su suite liveWsGate.test.ts).
 *
 * MONTAR-1 (#442) — modo API REAL explícito: con VITE_REAL_API=1 en el .env de la
 * raíz (envDir "../../"), el middleware de staging NO se monta y /api/* se proxya
 * a API_URL (la API Express real, p. ej. http://127.0.0.1:3001 — el web ya ocupa
 * el 3000). SIN el flag el comportamiento queda byte-idéntico al anterior:
 * staging sintético declarado (R15: explícito, jamás por defecto; ADR-028: nada
 * se abre solo porque la opción exista).
 *
 * MISMO ORDEN de montaje que el original: live-ws primero, staging después.
 * Todas las puertas #236/M29 (origin, token fail-closed, límites por IP)
 * se conservan — ver dev/liveWsGate.ts y dev/liveWsGate.test.ts.
 */
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { montarLiveWs } from './dev/liveWsServer';
import { montarStaging } from './dev/stagingMiddleware';

export default defineConfig(({ mode }) => {
  // MONTAR-1 (#442): loadEnv lee el .env de la RAÍZ del monorepo (mismo contrato
  // que envDir "../../"). El OR con process.env mantiene válido el flujo shell
  // (set -a; source .env; set +a) de la guía del README.
  const env = loadEnv(mode, path.resolve(__dirname, '../..'), '');
  const realApi =
    env.VITE_REAL_API === '1' || process.env.VITE_REAL_API === '1';
  const apiTarget = (
    env.API_URL ||
    process.env.API_URL ||
    'http://127.0.0.1:3001'
  ).replace(/\/+$/, "");

  return {
    envDir: '../../',
    plugins: [
      react(),
      {
        name: 'delocalsoy-api-horizon3',
        configureServer(server) {
          montarLiveWs(server);
          // MONTAR-1 (#442): con la API real declarada el staging NO se monta —
          // la UI habla SIEMPRE por /api/* y el proxy decide el destino (R15).
          if (!realApi) {
            montarStaging(server);
          }
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
      // MONTAR-1 (#442): proxy hacia la API real — SOLO en modo explícito.
      proxy: realApi
        ? { '/api': { target: apiTarget, changeOrigin: false } }
        : undefined,
      allowedHosts:
        process.env.ALLOWED_HOSTS === 'true' || !!process.env.CODESPACE || process.env.HOST === '0.0.0.0'
          ? true
          : undefined,
    },
  };
});
