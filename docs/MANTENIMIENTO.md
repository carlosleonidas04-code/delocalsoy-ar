# Mantenimiento — reglas de proceso de la plataforma

Estado del documento: ratificado por directiva de la DH (R9) del 2026-10-26 (paquete M0 de la hoja de mejoras de supervisión y mantenimiento). Las reglas nuevas (4–8) son reversibles: cualquier ajuste se registra por PR con traza.

## 1. Regla de cola de merge

1. **Máximo ~5 PRs abiertos con CI sano.** Superar el umbral dos semanas seguidas se reporta en la auditoría mensual.
2. **Apilar PRs solo mientras CI esté caído** (patrón del bloqueo de spending 2026-10-15 → ~2026-11-01). Al volver CI: vaciar la cascada antes de abrir frentes nuevos.
3. **La cascada vigente vive en §3** y se actualiza en el mismo PR que agrega o cierra PRs dependientes.

## 2. Reglas de mantenimiento

Ya vigentes (invariantes existentes):

1. **R15** — nunca merge sin CI 100% verde.
2. **Regla documental R9** — todo PR que agrega rutas o cambia arquitectura actualiza openapi + `ARCHITECTURE_STATE_v7.1.md` + README en el mismo PR.
3. **Scope-Guard (ADR-034 §4.5)** — el diseño nunca toca `main.tsx` sin `mixto-r9`; PRs solo-estética restringidos a `apps/web/src/design/`, `styles.css`, `index.html`.

Nuevas (ratificadas 2026-10-26, reversibles):

4. **Límite de tamaño de archivo fuente**: un archivo de `src/` que supere ~1.500 líneas es deuda declarada y debe partirse por slices verticales antes de crecer más (caso emblemático: `apps/web/src/App.tsx`).
5. **Dominio nuevo = contrato completo en el mismo PR**: contracts Zod + openapi + suite E2E + regla documental. Un sello nuevo sin fila en `docs/MATRIZ_SELLOS.md` es deuda al cierre del PR.
6. **Lotes de agentes externos solo por rama + manifiesto**: entrega vía rama `agent-google/*` (o equivalente) con base SHA + árbol completo + manifiesto ruta+bytes+md5. El canal de pegado de chat queda desestimado para acreditación (3 rondas fallidas, no determinista).
7. **La cascada de merge vive en este documento**, no en la memoria de los agentes.
8. **Numeración EV**: antes de cualquier cascada de registros post-merge, la tabla `docs/EV_NUMERACION_F0C1.md` debe estar al día (cierre del conflicto F0-C1).

## 3. Cascadas (histórico) y cola actual

- **Cascada del bloqueo de spending (31 PRs, 2026-10-15 → 2026-11-01):** #219 → #220 (CORE-005, EV-055/056, cierra #206 6/6) → #224 → #229 → #227 → #216 → #217 → #218 → #230 (cierra #168) → #231 (cierra #170) → #225 → #232 → #234 (cierra #172) → #235 (AUD-09, cierra #104) → #236 (cierra #123) → #237 → #238 → #233 (serie contracts NCAP-R2) → #242 → #244 → #246 → #247 → #248 → #249 → #250 (MARKET-CAP MK-1) → #251 → #252 → #253 → #254 (MK-2) → #255 → #257 — **MERGEADA con CI verde tras la restauración de Actions (2026-11-01)**. El lockfile se regeneró en #354/#355 (frozen-lockfile; EV-066 re-anclada, ver `docs/EV_NUMERACION_F0C1.md`).
- **Cascada NODO-VIG-3 (épica #377, 2026-11-06):** VIG-010..014 → PRs #383/#385/#387/#389/#391 con EV-083..087 (registros #384/#386/#388/#390/#392) + fix post-módulo #393 (sin EV, precedente #298) — **MERGEADA; módulo COMPLETO; épica #377 cerrada por la DH**.
- **Cola actual (2026-11-06): 0 PRs abiertos con CI sano** — regla 1 satisfecha. Las cascadas nuevas se listan aquí PR a PR (regla 7).

## 4. Métricas de mantenimiento

| Métrica | Objetivo |
| --- | --- |
| PRs abiertos con CI sano | ≤ 5 |
| Archivo fuente más grande | < 1.500 líneas (exceso = deuda declarada) |
| Sellos con fila en `docs/MATRIZ_SELLOS.md` | 100% |
| Auditoría R12 | 1 informe mensual publicado |
| Ciclo issue → merge con CI sano | < 1 día |

## 5. Hoja de mejoras (resumen ejecutivo)

- **M0 (este paquete)**: regla de cola, tabla EV F0-C1, runbook, matriz de sellos.
- **M1 (días 1–30 post-restauración)**: cerrar contracts (#233) con gate de exports; gate `prisma migrate diff` en CI; AUD-08 + `/api/health/detailed` con `projection_lag`; logs JSON; backups Postgres; lockfile RESUELTO (#354/#355) + `pnpm audit` restante; limpieza de issues zombis.
- **M2 (30–90 días)**: entorno staging docker-compose; métricas + dashboard; partir `App.tsx` por slices; fusión canónica de `BaseConsolidadaPrototype` (decisión DH); columna `nodo_key` en `events_raw` (deuda ADR-030); gate WCAG AA automático.
- **M3 (90+)**: componentes RFC-027 (10 mínimos); Orval codegen; partición de `events_raw`; análisis AAIP; health-checks del catálogo de fuentes.
