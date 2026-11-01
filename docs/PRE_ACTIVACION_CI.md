# PRE_ACTIVACION_CI — Pre-activacion de GitHub Actions (plan de arranque)

Estado: PROPUESTA RATIFICADA por directiva de la DH del 2026-10-28 (pre-activacion) · v0.1 · 1 doc + 2 workflows
Fecha: 2026-10-28 · main @ 77500be · CI caido desde 2026-10-15 (spending) · reinicio estimado ~2026-11-01 · cola: 32 PRs abiertos

## 0. Objetivo

Estar en condiciones de drenar la cola de 32 PRs el mismo dia que Actions vuelva, sin repetir el incendio de presupuesto que apago el CI el 2026-10-15. Este paquete prepara todo lo que SI se puede hacer sin CI corriendo, y fija por escrito lo que expresamente NO se va a hacer. Se apoya en el analisis exhaustivo de arquitectura y la hoja de mejoras de la DH (2026-10-26) y en M0, ya en cola (PR #260: regla de cola, tabla EV F0-C1, runbook, matriz de sellos).

## 1. Diagnostico — por que se quemo el presupuesto (evidencia en el repo)

1. **Doble suite por PR**: `ci.yml` (build + test + vertical + report) Y `verify.yml` (build + test + report) corren en cada PR. Evidencia: los check runs de cualquier PR de la cola (p.ej. #260, verificados hoy) muestran `build`, `test` y `report` DUPLICADOS. `verify.yml` es un subconjunto de `ci.yml` — doble factura, cero cobertura nueva.
2. **Sin timeout-minutes**: el default de GitHub son 360 min POR JOB. Un job colgado = 6 horas facturadas por cada ocurrencia.
3. **Sin cache de pnpm**: cada job reinstala dependencias desde cero (3 jobs con setup-node por PR, por re-run y por push a main).
4. **Sin concurrency**: pushes sucesivos a la misma rama acumulan runs obsoletos que corren igual.
5. **Multiplicador de cola**: 32 PRs abiertos y cada merge ademas dispara la suite completa sobre main (push). Un drenaje sin control = (32 re-runs + 32 push a main) x suite doble.

Estimacion declarada (R15: estimacion, no medicion): suite doble actual ~45-60 min de jobs por PR; drenaje ingenuo ~3.000+ min — exactamente el patron que apago el CI.

## 2. SI — cambios estructurales preparados en este paquete

### 2.1 `ci.yml` v17 — hardening de spending, semantica intacta

- `concurrency` con `cancel-in-progress: true` (un solo run vivo por ref; el obsoleto se cancela).
- `timeout-minutes` por job: build 15 / test 25 / vertical 30 / report 10.
- `cache: pnpm` en los 3 `setup-node` (install sin redescargar dependencias).
- Mismos pasos, mismos servicios (PostGIS + Redis), misma evidencia. Sin path filters (ver 3.1).
- Nota honesta: con cancel-in-progress, los runs obsoletos sobre main se cancelan — el arbol final queda verificado por el ultimo run; el verde pre-merge de cada PR es la compuerta (R15).

### 2.2 `verify.yml` — retiro del trigger automatico (solo `workflow_dispatch`)

- Duplicaba build+test+report de `ci.yml` en CADA PR. Queda solo manual, para referencia y rollback. Los jobs se preservan intactos (muertos, no borrados).
- **Accion DH requerida el dia 1**: quitar los checks de `verify` de los required status checks (Settings -> Branches) ANTES de drenar, o los merges quedan bloqueados esperando checks que ya nunca correra.

### 2.3 Validacion diferida y honesta

Los cambios de workflow NO son verificables hoy (CI caido) — declarado. El primer test real son los checks del propio PR de este paquete cuando Actions vuelva: en eventos `pull_request`, GitHub corre el workflow del merge del PR, es decir los workflows NUEVOS. Si fallan, se itera ahi mismo. Nada llego a main sin CI verde (R15).

### 2.4 Exencion de cascada

Este PR no compite por archivos con la cola (solo workflows + un doc nuevo): puede fusionarse fuera del orden de `docs/MANTENIMIENTO.md` seccion 3, inmediatamente despues de que su propio CI pase verde — de hecho CONVIENE que sea el primero, para que el resto del drenaje corra ya con la suite endurecida.

## 3. NO — lo que expresamente NO se hace (y por que)

1. **NO path filters en workflows con checks requeridos**: un check saltado no es un check verde — queda en estado expected y bloquea el merge; ademas un PR docs-only sin CI contradice R15 (la salida real acredita).
2. **NO `--frozen-lockfile` en CI todavia**: cambiar el install sin poder correr CI es apostar el drenaje a que el lockfile esta sincronizado. Propuesta M1 post-reactivacion (item lockfile+audit de la hoja).
3. **NO tocar `compuerta-r9.yml` ni `scope-guard-lote-estetico.yml`**: son gobernanza (AUD-02 opcion C) y codigo VERBATIM del auditor R12. Timeouts para ellos: propuesta post-reactivacion.
4. **NO re-run masivo el dia 1**: re-run failed checks sobre 32 PRs es el mismo incendio de nuevo. Solo el PR actual de la cascada (+su sucesor al avanzar).
5. **NO merges de nada mientras el CI siga caido** (R15) — incluidos este paquete y #260.
6. **NO cerrar issues zombis sin ratificacion DH** (R9): propuesta en 5.4, la DH decide.
7. **NO cambios de contratos/Prisma/rutas mientras el CI este caido**: inverificables, y un rojo bloquea la cascada entera.
8. **NO editar workflows directamente en main**: todo por PR — el juez no es editable por lo juzgado (mismo principio que CODEOWNERS en compuerta-r9).
9. **NO self-hosted runner en este paquete**: decision D2 abierta (brief en 5.3).
10. **NO nuevos PRs de features hasta drenar la cascada** (disciplina de cola, MANTENIMIENTO seccion 2): este paquete y M0 (#260) son la excepcion declarada, docs/chore-only.

## 4. Plan de arranque — dia 1 (Actions activo)

En orden estricto:

1. **DH (UI GitHub, Billing)**: confirmar minutos disponibles; alerta de uso al 50% y al 80%; spending limit si el plan lo permite.
2. **DH (UI GitHub, Settings -> Branches)**: quitar los checks de `verify` de los required status checks. Dejar los de ci (build/test/vertical), compuerta y scope.
3. **Re-run de checks del PR de ESTE paquete**: corre los workflows v17 — su primer test real. Iterar aqui si algo falla.
4. **Merge de este PR** (chore, exencion de cascada) -> main queda con workflows endurecidos.
5. **Merge de #260 (M0 docs)**.
6. **Cascada por `docs/MANTENIMIENTO.md` seccion 3, en lotes de ~5**: por cada PR -> Update branch (dispara checks con workflows nuevos sobre el arbol rebasado) -> esperar verde -> merge -> siguiente. NUNCA re-run all.
7. **Presupuesto por lote**: ~5 x (suite PR + suite push a main) x suite v17 (~20-25 min estimados por suite). Consultar el medidor de billing tras cada lote; si el uso pasa ~70% del mes, pausa y decision D2.
8. **Fin de cascada -> M1 de la hoja de mejoras** (contratos #233 con gate de exports, prisma migrate diff gate, AUD-08 /api/health/detailed, logs JSON, backups, lockfile+audit).

## 5. Decisiones y propuestas para la DH

### 5.1 Requerido en UI el dia 1
Quitar verify de required checks (4.2) — bloquea todo el drenaje si no se hace.

### 5.2 Alertas de billing (4.1)
Dos alertas (50% / 80% del presupuesto mensual) para que un mes pesado nunca mas termine en corte sorpresa de 15 dias.

### 5.3 D2 — resiliencia CI (decision abierta de la hoja)

- **Opcion A (recomendada ahora)**: budget fijo + hardening v17 + disciplina de lotes. Cero ops, costo predecible. Riesgo: otro corte a mitad de mes si el drenaje pesa — mitigado por v17 (estimacion: −50/−60% frente a la suite doble).
- **Opcion B**: self-hosted runner. Minutos ilimitados y servicios persistentes (caching mas agresivo), pero ops real (mantener, parchear, asegurar la maquina) y costo fijo del servidor.
- Recomendacion: A ahora; B solo si el uso sostenido post-drenaje supera ~70% del presupuesto mensual.

### 5.4 Higiene de issues zombis (ratificacion R9 pendiente — estado verificado hoy)

| # | titulo | estado hoy | accion propuesta |
|---|---|---|---|
| #137 | Propuesta NODO-CAU: activación en profundidad del nodo Ca... | ABIERTO | zombi segun hoja M1 — cerrar/archivar tras revision DH (R9) |
| #139 | NODO-CAU · NC-R4: cruce información pública ↔ relevamient... | ABIERTO | zombi segun hoja M1 — cerrar/archivar tras revision DH (R9) |
| #145 | NODO-CAU · NC-R6: definición territorial del nodo — Ciuda... | ABIERTO | zombi segun hoja M1 — cerrar/archivar tras revision DH (R9) |
| #146 | NODO-CAU · NC-R8: propuesta ADR-036 — ética de resilienci... | ABIERTO | zombi segun hoja M1 — cerrar/archivar tras revision DH (R9) |
| #150 | Pedido a agent-google (modo pull, sin plazo): documentaci... | ABIERTO | zombi segun hoja M1 — cerrar/archivar tras revision DH (R9) |
| #163 | Pedido a agent-google (modo pull, sin plazo): diseño del ... | ABIERTO | zombi segun hoja M1 — cerrar/archivar tras revision DH (R9) |
| #168 | NVIG-R1 — Vocabulario y estructura territorial del nodo V... | ABIERTO | zombi segun hoja M1 — cerrar/archivar tras revision DH (R9) |
| #170 | NVIG-R3 — Documento maestro VIG-000-ALCANCE (ratificación... | ABIERTO | zombi segun hoja M1 — cerrar/archivar tras revision DH (R9) |
| #172 | NVIG-R5 — Catálogo de fuentes y procedencia del Valle de ... | ABIERTO | zombi segun hoja M1 — cerrar/archivar tras revision DH (R9) |
| #221 | UX-001: tokens de plataforma multiplataforma + tipografia... | ABIERTO | zombi segun hoja M1 — cerrar/archivar tras revision DH (R9) |

### 5.5 Post-reactivacion (propuestas M1 — NO en este paquete)
`--frozen-lockfile` + audit en CI; timeouts para compuerta/scope; gate prisma migrate diff; AUD-08 + `/api/health/detailed` con projection_lag; logs JSON con request_id = hash del sello; backups Postgres (D3); limpieza de los zombis ratificados arriba.

## 6. Presupuesto (estimaciones declaradas — R15)

- Suite doble por PR (hoy): ~45-60 min de jobs (estimacion).
- Suite v17 por PR: ~20-25 min (estimacion): −2 jobs duplicados, −install desde cero, tope de cola por timeouts.
- Drenaje completo estimado: 32 PRs + 32 push a main ≈ 1.300-1.800 min con v17 y lotes, frente a ~3.000+ del drenaje ingenuo con la suite doble.
- Regla operativa: el medidor de billing se consulta tras cada lote (4.7).

## 7. Vinculos

- Analisis exhaustivo y hoja de mejoras: canvases de la DH (supervision/mantenimiento, 2026-10-26).
- M0 en cola: PR #260 (MANTENIMIENTO, EV_NUMERACION_F0C1, RUNBOOK, MATRIZ_SELLOS).
- Tabla EV: `docs/EV_NUMERACION_F0C1.md` (proximo libre EV-075). Este paquete no crea EV (docs/chore; patron documental #148).
- Gobernanza: R9/R15, compuerta-r9 (AUD-02 opcion C), ADR-034 seccion 4.5 (scope-guard).

[agent: vibe] — 2026-10-28 · CI caido, sin merge sin CI verde