# NCAP-R4 — Red de corredores v0.1 (Nodo Capital)

> Estado: CANDIDATE — hipótesis de diseño de la Dirección Humana ratificada el
> 2026-11-04 (análisis recursivo-heurístico «NCAP-R4 (#156)»). Las trazas NO son
> oficiales: v0.1 modela RELACIONES verificables, jamás líneas dibujadas (R15).
> Todo nace provisional hasta fuente verificada (ADR-035).

Issue: #156 (sub-issue de la épica #152 NODO-CAPITAL).

## Qué es

Los corredores como **red modelada**: `corredor → segmentos (from/to tipados + modos) → hitos y subnodos vinculados`. Un grafo relacional con procedencia por tramo (ADR-035), no una capa cartográfica.

## Decisiones de diseño ratificadas por la DH (2026-11-04)

1. **Entidad nueva Prisma** — no features con metadato: `features` es Point-only y no puede albergar el grafo relacional; el precedente hydrology #140 (opción B) era para líneas cartográficas, un problema distinto. Vocabulario alineado a los contratos NCAP-R2 (`territorialModel`, PR #233): estados `candidate|mapped|validated|retired`, modos `walk|bike|bus|car|unknown`, relaciones `connects|near` (R1: reutilizar, no fabricar).
2. **Segmento tipado SIN geometría** — from/to con tipo `hito|subnodo` + key, secuencia para continuidad, modos, observaciones de superficie/cruces (testimonio de diseño, no catastro), `observed_at` y fuentes por tramo (ADR-035). Sin columna geom en v0.1: la línea dibujada exige fuente verificada que aún no existe.
3. **Solo lectura pública** — los corredores son hipótesis de diseño DH, no input ciudadano. Sin escritura ciudadana en v0.1.

## Regla de modelado (#154, NCAP-R2)

Distrito oficial ≠ área funcional ≠ relación por corredor. Los hitos y centralidades participan por relaciones `connects`/`near` **SIN asignación distrital**: ninguno se siembra como subnodo. `cor_centro_desamparados` RELACIONA los distritos Centro y Desamparados — jamás los reasigna.

## La red v0.1 (5 corredores, hipótesis DH)

| Corredor | Segmentos (from → to) | Modos | Fuentes por tramo |
|---|---|---|---|
| `cor_centro_civico` | `hit_teatro_plaza_bicentenario` → `hit_centro_civico` → `hit_parque_de_mayo` (2 segmentos) | walk, bus, car, bike | Decisión DH NCAP-R4 (#156), 2026-11-04 — hipótesis de diseño territorial |
| `cor_libertador_west` | `hit_parque_de_mayo` → `hit_facultad_ingenieria` → `hit_plaza_desamparados` (2 segmentos) | walk, bike, bus, car | Decisión DH NCAP-R4 (#156), 2026-11-04 — hipótesis de diseño territorial |
| `cor_centro_desamparados` | `sj_capital_centro` ↔ `sj_capital_desamparados` (1 segmento, endpoints subnodo) | walk, bike, bus, car | Decisión DH NCAP-R4 (#156), 2026-11-04 — hipótesis de diseño territorial |
| `cor_centro_micro_macro` | `hit_microcentro_pec` → `hit_macrocentro` (áreas analíticas #154, 1 segmento) | walk | Decisión DH NCAP-R4 (#156), 2026-11-04 — hipótesis de diseño territorial |
| `cor_redtulum_centro` | `hit_microcentro_pec` → `hit_centro_civico` (1 segmento — transporte público, solo referencias hasta la ingesta GTFS) | bus | Decisión DH NCAP-R4 (#156), 2026-11-04 — hipótesis de diseño territorial |

### Hitos del catálogo (7) — SIN asignación distrital, lat/lng NULL honestos (R15)

| Hito | Tipo | Nota |
|---|---|---|
| `hit_teatro_plaza_bicentenario` | edificio_publico | Complejo cultural del Bicentenario — punto a verificar (R15) |
| `hit_centro_civico` | edificio_publico | Sede administrativa provincial — punto a verificar (R15) |
| `hit_parque_de_mayo` | parque | Centralidad verde del eje universitario — punto a verificar (R15) |
| `hit_facultad_ingenieria` | institucion_educativa | Centralidad educativa del eje Libertador Oeste — punto a verificar (R15) |
| `hit_plaza_desamparados` | plaza | Plaza Salvador María del Carril / Basílica (#154) — punto a verificar (R15) |
| `hit_microcentro_pec` | area_analitica | Microcentro PEC (Libertador–Córdoba–Alem–Rioja, #154) — NO es distrito ni subnodo |
| `hit_macrocentro` | area_analitica | Macrocentro (método a definir, #154) — NO es distrito ni subnodo |

## Continuidad revisada (criterio de cierre #156)

La API deriva `ok|ruptura` de la cadena de segmentos por secuencia: ok si cada segmento retoma donde terminó el anterior; ruptura si se corta, con el detalle (después de qué secuencia, qué esperaba, qué encontró). Los 5 corredores del seed están encadenados → ok. La suite E2E verifica también el caso ruptura con un corredor sintético que se elimina al final.

## API (openapi v7.33.0)

- `GET /api/corredores` — catálogo público con key/label/proposito/status/segmentos_count/hitos_count/continuidad.
- `GET /api/corredores/{key}` — detalle con hitos resueltos, subnodos con label, segmentos ordenados con fuentes por tramo y rupturas detalladas. 404 honesto sin eco del valor (ADR-020).

## Persistencia y procedencia

- 3 modelos Prisma: `corredores` (key cor_* única), `corredor_hitos` (catálogo global del nodo), `corredor_segmentos` (@@unique(corredor_id, secuencia) → idempotencia del seed). Migración `20261105070000_ncap_r4_corredores`.
- Seed idempotente `seed-corredores-capital.sql` (ON CONFLICT DO NOTHING) con sellos `corredor.creado` en `events_raw` por hash `seed-corredor-<key>` (patrón seed-subnodo #154). Encadenado al final de `db:seed`.
- Contratos Zod en `@delocalsoy/contracts`: CorredorStatusSchema, CorredorModoSchema, CorredorEndpointSchema, CorredorFuenteSchema, CorredorSegmentoSchema, CorredorHitoSchema, CorredorAltaSchema, CorredorResumenSchema, CorredorDetalleSchema.
- Suite E2E `apps/api/src/corredores-r4-rutas.test.ts` (Postgres/PostGIS real, skip honesto sin base — R5).

## Criterio de cierre del issue #156

Red con segmentos ✔; hitos vinculados y evidencia por tramo ✔ (fuentes ADR-035 en cada segmento); continuidad revisada ✔ (ok|ruptura derivada de la cadena); sin trazas presentadas como oficiales ✔ (status `candidate`, sin geometría, hitos lat/lng NULL — R15).
