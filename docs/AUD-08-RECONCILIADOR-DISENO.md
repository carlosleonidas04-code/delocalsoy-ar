# AUD-08 — Diseño técnico del reconciliador del transporte (`events:raw`)

> **Auditoría de origen:** `agent-perplexity` contra `main @ 45e60f5` (2026-10-08), issue #103 — «worker no recupera eventos previos al grupo ni publicados con Redis caído (sin reconciliador)». **R15: el issue propone; este diseño tampoco acredita nada — NADA IMPLEMENTADO.** Ratificado por la DH 2026-10-30 (pregunta directa, 4 decisiones D1–D4, §7). Anclado contra **lo REAL** (`main @ 77500be`, verificación en vivo 2026-10-30: `apps/worker/src/consume.ts` 5.007 B · `apps/worker/src/kpi.ts` 5.504 B · `apps/worker/src/rag.ts` 5.729 B · `apps/api/src/routes/events.ts` 4.403 B · `apps/api/src/routes/health.ts` 5.681 B · `packages/db/src/{kpi,rag}.ts`).

---

## 1. Contraste contra lo real (R4/R12) — hallazgos que moldean el diseño

1. **H1 — los 3 grupos arrancan en `$`.** `ensureGroup`/`ensureKpiGroup`/`ensureRagGroup` hacen `XGROUP CREATE … '$' MKSTREAM` (verificado en los tres módulos del worker): los eventos publicados **antes** de crear el grupo nunca se entregan. La brecha NO es solo de `event_projections` (core004-worker): `vig003-kpi` (KPIs VIG-003) y `vig006-rag-index` (RAG VIG-006) comparten exactamente la misma pérdida.
2. **H2 — el fail-open protege la verdad, no la referencia.** `POST /api/events` persiste en `events_raw` ANTES del `xaddEventReference` (ADR-032 R4a). Con Redis caído, el evento queda en `events_raw` pero la referencia nunca llega al stream. **Deuda menor hallada:** en `main @ 77500be` el `xadd` está dentro del `try` general — su fallo responde 500 aunque el evento YA está persistido (el reintento del cliente responde 200 «duplicado» por hash único). La verdad queda a salvo; la UX miente el estado. Fix opcional declarado en §9; el reconciliador cubre el hueco con o sin él.
3. **H3 — los consumers ya son inmunes a re-entregas.** Cada uno verifica la referencia contra `events_raw` (`event_id` + `hash`), descarta huérfanas/alteradas con ack, y `event_projections` tiene `event_id` único (P2002 = ya proyectado, «repeated») mientras KPIs/RAG son upserts idempotentes por nodo. → **Re-publicar una referencia es siempre seguro**: el peor caso es un «repeated»/recompute idempotente. Esta propiedad es la que hace posible D1.
4. **H4 — `PATCH /api/health/mode` también publica referencias** (verificado: sella `system.mode_change` y hace `xadd` fail-open). Los huecos de transporte también afectan reacciones de modo.
5. **H5 — cero dependencias nuevas.** El cliente RESP mínimo (`@delocalsoy/redis`) es genérico: `redisCommand` acepta cualquier comando → `XLEN`/`XRANGE`/`XGROUP SETID` funcionan sin tocar el paquete. El reconciliador reusa `@delocalsoy/db` (prisma) y `redisCommand`.
6. **H6 — la métrica debe comparar dominios homogéneos.** El criterio de éxito de la auditoría es `count(events_raw no-system) = count(event_projections)`. `consume.ts` no filtra `system.*` al proyectar → el lag público se computa **non-system vs non-system** (§4); el test E2E acredita la homogeneidad (verificación in situ del contenido actual de `event_projections`).
7. **H7 — `/api/health` ya es público honesto (R5)** y ya expone `redis: ok|down` → añadir `projection_lag` es aditivo, sin nueva superficie de autenticación.
8. **H8 — checkpoint sin estado nuevo.** El patrón R7 del health (`system.*` sellado en `events_raw` ES el estado) resuelve el «¿ya hice el bootstrap SETID 0?» sin tabla nueva: un sello `system.reconcile_bootstrap` (idempotente por hash único) marca la primera pasada.

## 2. Diseño — reconciliador de transporte (DH D1)

**Un solo mecanismo repara los 3 grupos**: el reconciliador re-publica al stream las **referencias faltantes**; los consumer groups existentes hacen el resto con su idempotencia ya acreditada (H3). Nada de proyección directa ni caminos paralelos — un solo transporte, `events_raw` manda (ADR-032).

Módulo `apps/worker/src/reconcile.ts`, enganchado al mismo loop del worker:

```
export async function reconcileOnce(windowMs: number | null): Promise<ReconcileResult>
// 1. GATE barato: XLEN events:raw vs count(events_raw)
//    XLEN >= count → estado sano (las re-publicaciones solo suman; la API
//    no duplica referencias: el duplicado por hash responde 200 sin xadd) →
//    terminar la pasada (0 re-publicaciones).
// 2. DIFF fino (solo si el gate detecta hueco):
//    XRANGE events:raw - + → set(event_id)   [ventana: occurred_at >= now-windowMs]
//    SELECT id,type,hash,occurred_at FROM events_raw [ventana] →
//    faltantes = events_raw cuyo id ∉ set
// 3. RE-PUBLICAR: xaddEventReference por cada faltante (mismos 4 campos que
//    la API: event_id, type, hash, occurred_at) — los 3 grupos consumen solos.
// Resultado: {scanned, republished, skipped, errors} — logs honestos, sin HTTP.
```

- **Cadencia (DH D3):** pasada cada **60 s** (`RECONCILE_INTERVAL_MS`, default 60000) con **ventana deslizante 24 h** (`RECONCILE_WINDOW_MS`, default 86400000) + **pasada completa al arranque** (ventana `null` → XRANGE completo). El stream no se trimea hoy; XRANGE completo en arranque es barato al volumen actual — **deuda declarada** (§9): si el stream crece, acotar la pasada completa por checkpoint de `occurred_at`.
- El reconciliador **no es consumer**: no lee grupos ni proyecta — solo re-publica. Su fallo nunca corrompe (H3); sin Redis cae y reintenta en la próxima pasada.

## 3. Bootstrap de grupos (DH D2)

- **Grupos nuevos en `0`** (no `$`): los tres `XGROUP CREATE` pasan a `0` — la historia completa se entrega desde el primer arranque; reprocesar es seguro (H3).
- **Grupos existentes → `XGROUP SETID <group> 0` UNA VEZ al desplegar**, con checkpoint honesto H8: al arranque, si NO existe `system.reconcile_bootstrap` en `events_raw` → SETID 0 a los 3 grupos + sello del checkpoint (hash idempotente). Re-arranques posteriores ven el sello y no repiten. El reproceso completo es «un solo pago»: `event_projections` absorbe con P2002 «repeated» y KPIs/RAG re-computan idempotentemente.
- Orden de arranque: `ensureGroup(s)` → checkpoint-bootstrap (si corresponde) → pasada completa del reconciliador → loop.

## 4. Métrica `projection_lag` pública (DH D4)

`GET /api/health` (público, R5 — H7) agrega al JSON existente:

```
projection_lag: {
  events_raw_no_system: number,   // count(type NOT LIKE 'system.%')
  event_projections: number,      // count(event_projections de eventos non-system)
  lag: number                     // resta — 0 = criterio de éxito de la auditoría
} | null                          // null honesto si sin base (R15)
```

Comparación **non-system vs non-system** (H6). El lag se computa con 2 counts en la ruta (no lo sirve el worker). `lag = 0` tras reconciliar ES el criterio de éxito de #103, verificable en CI y en producción por cualquiera (honestidad operativa).

## 5. Suite E2E `reconciliador.test.ts` (6 tests, contra PostGIS/Redis reales)

1. **Caso de la auditoría (comando/salida esperada de #103):** con Redis detenido, `POST /api/events` persiste en `events_raw` → levantar Redis + worker → tras 1 pasada del reconciliador, el evento está en `event_projections` **exactamente una vez**.
2. **Hueco pre-grupo:** evento sellado antes de la creación del grupo → bootstrap SETID 0 (H8) → reproyectado.
3. **Idempotencia:** 2 pasadas seguidas del reconciliador → 0 duplicados (P2002 repeated; XLEN crece, counts no).
4. **Lag:** con hueco `lag > 0`; tras reconciliar `lag = 0` (criterio de éxito, en CI).
5. **Superficie pública:** `/api/health` expone `projection_lag` con los 3 campos; sin base → `null` honesto.
6. **Los 3 grupos (D1):** sello `comercio.*` publicado con Redis caído → tras reconciliador + consumers, `kpi_snapshots` y `rag_index` del nodo quedan actualizados (no solo `event_projections`).

## 6. Regla documental R9 (mismo PR que la implementación)

- openapi: sin paths nuevos; se amplía la respuesta 200 de `GET /api/health` con `projection_lag` — versión a asignar según registro al ejecutar (v7.26.0 VIG-009 #253 · v7.27.0 MK-2 #281 · MK-3 docs tomará la siguiente libre).
- `ARCHITECTURE_STATE_v7.1.md` (fila Eventos + bullet AUD-08) + `README.md` en el MISMO PR.

## 7. Decisiones DH (RATIFICADAS 2026-10-30, pregunta directa — conversación DH, traza en #103)

1. **D1 — Arquitectura: TRANSPORTE** — re-publicar referencias faltantes al stream; los 3 grupos (projections + KPIs + RAG) se reparan solos, idempotentemente. *(Sobre el fix de proyección propuesto originalmente en #103, que solo reparaba core004-worker.)*
2. **D2 — Bootstrap: grupos nuevos en `0` + `XGROUP SETID 0` para los 3 existentes al desplegar** — reproceso idempotente completo, un solo pago (checkpoint `system.reconcile_bootstrap`, H8).
3. **D3 — Cadencia: cada 60 s, ventana deslizante 24 h + pasada completa al arranque.**
4. **D4 — Métrica: `projection_lag` público en `/api/health`** con `{events_raw_no_system, event_projections, lag}` (R5), null honesto sin base.

## 8. Plan de ejecución (tras la cascada o como PR backend independiente en cola — como AUD-09 #235 y R12 #236)

Rama `feat/aud08-reconciliador` (base main): 1. `reconcile.ts` + wiring del loop y env de cadencia · 2. `XGROUP CREATE '0'` en los 3 módulos + checkpoint-bootstrap · 3. `projection_lag` en `/api/health` · 4. suite E2E §5 · 5. regla documental R9 (§6) · 6. EV a asignar por la DH al volver CI; PR con labels `auditoria` + `r9-ratificado`; merge SOLO con CI 100% verde (R15).

## 9. Erratas, deuda y reversibilidad

- **Deuda menor H2 (hallada en el contraste):** con Redis caído, `POST /api/events` responde 500 con el evento YA persistido (el `xadd` está dentro del `try` general). La verdad no se pierde (ADR-032) pero la UX miente. Fix opcional de 3 líneas en el mismo PR: `try/catch` propio alrededor del `xadd` → 201 honesto con `stream: false` declarado. Se propone como parte del PR de implementación.
- **Deuda declarada del diff:** XRANGE completo en arranque es O(len(stream)); si el stream crece, acotar por checkpoint de `occurred_at` (sello `system.reconcile_checkpoint` actualizado por pasada). No se implementa en v1.
- **`XTRIM`:** fuera de alcance v1; el stream conserva la historia de referencias (es transporte, no verdad — pero el reconciliador lo lee).
- **Reversibilidad:** todo es aditivo (1 módulo, 3 constantes de arranque, 1 campo JSON público, checkpoint sellado). Revertir = retirar el PR; los SETID ya aplicados no se deshacen pero el reproceso es inofensivo (H3); el checkpoint queda como historia append-only (ADR-032).

---

*[agent: vibe] — 2026-10-30 — diseño técnico AUD-08 (reconciliador de transporte de `events:raw`). Ratificado 4/4 (D1–D4, pregunta directa). Contraste en vivo contra main @ 77500be (consume/kpi/rag del worker, routes/events, routes/health). Sin merge sin CI verde (R15). Refs: #103 · ADR-032 · AUD-09 #104 (paralelo, ya en cola #235).*
