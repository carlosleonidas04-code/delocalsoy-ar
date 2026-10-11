# 📦 Handoff Oficial Post-#134 (`main @ 1b3c8cd`): Respuesta Integral `[agent: google]` → `[agent: vibe]`

- **Emisor:** `[agent: google]` (Google AI Studio)
- **Receptor:** `[agent: vibe]` (Codespace / GitHub Repository Agent)
- **Dirección Humana (DH — Regla R9):** Carlos Leonidas (`carlosleonidas04@gmail.com`)
- **Corte de referencia:** `main @ 1b3c8cd` (merge del PR #134 — Scope-Guard Invertido activo)

---

## 1 · Cumplimiento Estricto del Scope-Guard Invertido (`#134 @ 1b3c8cd`)

Siguiendo la verificación de `[agent: vibe]` sobre el regex activo del Scope-Guard Invertido (`apps/web/src/design/**`, `apps/web/src/styles.css`, `apps/web/index.html`):

1. **Lote 1 — Estético (`agent-google/lote-estetico-base-consolidada`)**:
   - Contiene **únicamente 4 archivos dentro del alcance estético de `#134`** (Opción `a` verificada por `[agent: vibe]`):
     - `apps/web/index.html`
     - `apps/web/src/design/tokens.css`
     - `apps/web/src/styles.css`
     - `apps/web/src/design/BaseConsolidadaPrototype.tsx`
   - **Resultado en CI (#134)**: Pasa **Regla 1** (namespace `agent-google/*` solo toca rutas de diseño) y **Regla 2** (no mezcla diseño + lógica), **sin requerir `mixto-r9`**.

2. **Lote 2 — Lógica, Contratos y Seguridad (`agent-vibe/restauracion-a01-a02-core004`)**:
   - Contiene **18 archivos 100% fuera del regex estético** (cero archivos en `src/design/`, `styles.css` o `index.html`):
     - `apps/web/src/components/BaseConsolidadaPrototype.tsx` (sincronizado para que `App.tsx` compile en cualquier orden de merge entre Lote 1 y Lote 2)
     - `packages/contracts/src/modeloFederado.ts`
     - `packages/contracts/src/index.ts`
     - `packages/events/src/index.ts`
     - `apps/worker/src/index.ts`
     - `apps/api/src/middleware/jwtAuth.ts`
     - `apps/api/src/middleware/rateLimiter.ts`
     - `apps/api/src/routes/auth.routes.ts`
     - `apps/api/src/routes/events.ts`
     - `apps/api/src/routes/evidencias.ts`
     - `apps/api/src/routes/modeloFederado.ts`
     - `apps/api/src/routes/plataformaTerritorial.routes.ts` (sin el alias de testing `/worker/replay-test`, dejando solo `/worker/replay` y `/worker/reconcile-pel`)
     - `apps/api/src/routes/ask.routes.ts`
     - `apps/web/src/data/federatedModel.ts`
     - `apps/web/src/App.tsx`
     - `apps/web/vite.config.ts`
     - `docs/HANDOFF_BASE_CONSOLIDADA_AGENTE_VIBE.md`
     - `scripts/sincronizar-base-consolidada-agente-vibe.sh`
   - **Resultado en CI (#134)**: En rama `agent-vibe/*`, Reglas 1 y 2 pasan **sin requerir ningún label**.

---

## 2 · Detalle Técnico de los 8 Requerimientos Cerrados

1. **Issue #122 (`A-01`, `A-02`, `EV-005` en `apps/web/src/App.tsx`)**:
   - Helper `reportApiMutationError` activo en los 20 flujos de mutación (`!res.ok`).
   - `HTTP 409 Conflict` tratado explícitamente como duplicado idempotente (`EV-005`) con registro en `lastDataSourceError` (`new DataSourceHttpError({ status, endpoint, message })`).
   - Alerta FCM emitida **únicamente** tras confirmación `res.ok` del backend (`A-02`).
   - Cambio de modo de soberanía (`sovereigntyMode`) gobernado por la respuesta del servidor (`payload.sovereignty?.mode ?? payload.mode`) sin cálculo optimista `nextMode` en cliente (`A-01`).
2. **T2 de código de CORE-004 (Issue #87)**:
   - Reconciliador PEL (`reconcilePendingMessages` / `reconcilePendingEntries`) y cola DLQ (`territorial:events:dlq`) en `apps/worker/src/index.ts` y `packages/events/src/index.ts`.
   - Rate-limiter diferenciado por rol (`10 / 100 / 500 req/min` para `vecino` / `referente_municipal` / `auditor_ddhh`) en `apps/api/src/middleware/rateLimiter.ts`.
3. **Issues #103 / #104 (Redis Streams / Worker)**:
   - `XGROUP CREATE` inicializado en `'0'` (`startId = '0'`) para procesar eventos previos al alta del grupo consumidor.
   - Endpoint `POST /api/plataforma/worker/reconcile-pel` y `POST /api/plataforma/worker/replay` (eliminado el alias de prueba `/worker/replay-test`).
4. **R6 / EV-035**:
   - Invariantes de idempotencia y compilación verificados en `scripts/sincronizar-base-consolidada-agente-vibe.sh`.
5. **JWT — Alcance Territorial por Nodo (`apps/api/src/middleware/jwtAuth.ts`)**:
   - Claims `nodeKey?: string` y `allowedNodes?: string[]` en `TokenPayload`.
   - Middleware `requireNodeScope(resolveTargetNode)` aplicado en mutaciones territoriales (`403 NODE_SCOPE_FORBIDDEN` ante discrepancia de nodo).
6. **Assets Placeholder IA (M10 en `apps/web/vite.config.ts`)**:
   - Reemplazadas las rutas `/assets/images/asset_*.jpg` por data URIs SVG (`data:image/svg+xml;utf8,...`) con identidad visual `#0E1116` / `#FFC72C`.
7. **Issue #123 (`live-ws` en `apps/web/vite.config.ts`)**:
   - Guardia `validateLiveWsUpgrade(request)`: validación de `Origin` (`403 Forbidden`), exigencia de token/Bearer (`401 Unauthorized`) y límite de `45 frames/min` / `64 KB/frame` (`1008 Policy Violation`).
8. **A-07 (`ModeloFederadoPayload` en `@delocalsoy/contracts`)**:
   - Los 18 tipos del modelo federado residen canónicamente en `packages/contracts/src/modeloFederado.ts` y se reexportan desde `@delocalsoy/contracts`.
