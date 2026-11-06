# RUNBOOK — operación de la plataforma

Estado: v0.1 (paquete M0). **Fuente de verdad:** si este runbook difiere del código o de los `package.json`, gana el código (R15) — corregir el runbook por PR. Los comandos corren en la terminal de la DH (el sandbox de los agentes no ejecuta node).

## 1. Prerrequisitos

- Node + pnpm; PostgreSQL con PostGIS; Redis.
- Variables de entorno mínimas: `DATABASE_URL`, `JWT_SECRET` (sin él, las rutas de escritura responden 503 — fail-closed, R15).
- Web: `VITE_DATA_SOURCE=synthetic|api` (ADR-029).
- Flags acreditadas: `REPORTES_DUPLICADOS_RADIO_M` (default 100 m); live-ws: `LIVE_WS_TOKEN`, `LIVE_WS_ALLOWED_ORIGINS`, `LIVE_WS_MAX_CLIENTS_PER_IP`, `LIVE_WS_MAX_FRAMES_PER_MIN`, `LIVE_WS_MAX_FRAME_BYTES` (superficie cerrada por defecto: sin token → 503).
- La lista completa de scripts/flags vive en los `package.json` de cada paquete y en los workflows (`.github/workflows/ci.yml`, `verify.yml`).

## 2. Instalación

`pnpm install --frozen-lockfile`. La deuda de lockfile por lucide-react (#238) quedó **RESUELTA**: lockfile regenerado y CI con frozen-lockfile desde los PRs #354/#355 (EV-066 re-anclada, ver `docs/EV_NUMERACION_F0C1.md`).

## 3. Base de datos

- **Migraciones**: las migraciones de `packages/db/prisma/` se aplican con el runner documentado en `packages/db/package.json`; en CI corren desde cero contra PostGIS real en cada corrida.
- **Seed**: `db:seed` — cadena idempotente de SQL (`ON CONFLICT DO NOTHING`). Re-ejecutar es seguro (acreditado por tests de idempotencia). Timeout: la cadena tarda — los tests usan ≥30 s.
- **Entorno limpio**: migrar desde cero + `db:seed` (es exactamente lo que hace CI).

## 4. Levantar servicios

- **API**: `apps/api/src/server.ts` (CI lo corre con tsx).
- **Worker**: `apps/worker/src/index.ts` (CI: `WORKER_INTERVAL_MS=500`). Tres consumer groups: `core004-worker`, `vig003-kpi`, `vig006-rag-index`.
- **Web**: dev server de Vite en puerto 3000; build con `tsc -b` estricto (un import sin uso en un test rompe el build — TS6133).

## 5. Flujo vertical E2E

`apps/api/scripts/flujo-vertical-e2e.ts` — 33 checks: registro → login → alta → sello en `events_raw` → publicación a Redis Streams → proyección exactly-once → lectura bbox → auditoría + ciclo completo de reportes (alta, duplicados sugeridos, moderación justificada, historial, `/mios`). Corre contra PostGIS/Redis reales con el worker vivo; es el mismo script del job `vertical` de CI.

## 6. Diagnóstico de eventos

- Estado del stream: `XINFO GROUPS events:raw` (lag por consumer group).
- Un evento no proyectado: verificar `event_projections` y los logs del worker.
- Deuda declarada: sin reconciliador de eventos previos al consumer group o con Redis caído (AUD-08, #103) y sin health detallado con `projection_lag` (mejora A1, hoja M1).

## 7. Backups

NO IMPLEMENTADO (v0.1). Política objetivo (mejora D3): backup diario de Postgres + simulacro de restauración documentado. `events_raw` es la única fuente de verdad — el backup de Postgres ES el backup de la plataforma.

## 8. CI caído / restauración de Actions

- **CI RESTAURADA el 2026-11-01** (bloqueo de spending 2026-10-15 → 2026-11-01 resuelto). La cascada de 31 PRs de `docs/MANTENIMIENTO.md` §3 se mergeó con CI verde tras la restauración.
- Protocolo ante un nuevo bloqueo: re-run de jobs desde la UI o push trivial por rama (evento synchronize); vaciar la cascada antes de abrir frentes nuevos (regla 2 de `docs/MANTENIMIENTO.md`).
- Diagnóstico: si los checks mueren en ~2–3 s sin arrancar runner, el bloqueo persiste — re-programar y NO forzar merges (R15).

## 9. Reglas de emergencia

Nunca merge sin CI verde (R15). Nunca simular datos (R15). La cascada de merge vive en `docs/MANTENIMIENTO.md` §3.
