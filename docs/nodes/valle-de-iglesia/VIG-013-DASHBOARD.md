# VIG-013 — Dashboard público «Infraestructura y movilidad» (#382, épica #377)

> **Estado:** mergeado en `main` (VIG-013, registro EV-086). Doc de diseño del 4º sub-sprint del módulo NODO-VIG-3.
> **Regla rectora:** R5/ADR-036 — conteos CON cobertura y fecha SIEMPRE, jamás puntajes globales. R15 — anuncio ≠ obra; la comunidad corrobora, NUNCA verifica; preparar ≠ presentar; sin datos simulados.

## 1. Alcance

Dashboard público de lectura del nodo Iglesia que integra el módulo vial y de movilidad construido en VIG-010 (vocabulario vial), VIG-011 (AMC) y VIG-012 (pedidos formales a DPV). **Sin migración, sin tablas nuevas, sin escrituras**: una ruta de lectura pública anónima + la extensión del set de KPIs del patrón VIG-003 (patrón NCAP-R5 #157 — mismo diseño que el dashboard de accesibilidad del nodo Capital).

## 2. Ruta: `GET /api/nodos/:key/infraestructura-movilidad`

Lectura pública anónima; 404 honesto si el nodo no existe (R15). Respuesta `{success, data}` con seis secciones, todas con conteo + cobertura + fecha de corte + cautela:

### 2.1 `obras` (capa `obra_vial`, VIG-010)

- `total` y `por_estado` (declared / in_execution / completed — ciclo de obra honesto).
- `por_fuente` con desglose por `fuente_label` del catálogo ADR-035.
- `km_ejecucion`: **null honesto** — los km de los tramos no están estructurados en fuente verificada (null ≠ 0, R15); el desglose verificable son los tramos, no una cifra de prensa.
- `cautela`: anuncio ≠ obra (R15) — RN 150 y derivadores son anuncios/ejecuciones de prensa provincial; el estado por tramo exige verificación.

### 2.2 `puntos_criticos` (capa `punto_critico`, VIG-011)

- `total` y `por_estado` de revisión (community_validated ≠ verified — la comunidad corrobora, NUNCA verifica, R15).
- `criticos[]`: lista `{id, titulo, estado, observado_at}` — el título comunitario «N reportes de M vecinos» del AMC, **SIN lat/lng**: el dashboard cuenta, no dibuja (ADR-036).

### 2.3 `paradas_transporte` (capa `parada_transporte`, VIG-010)

- Nace **VACÍA** (R15): sin padrón verificado no se siembran paradas — `cobertura`: «X paradas registradas (sin padrón verificado — R15)».
- `fuente`: agregador de transporte (secundaria/provisional — ADR-035, sin GTFS/padrón de las líneas 600/601).

### 2.4 `cobertura_sos` (capa `cobertura_sos`, VIG-010)

- `red_por_estado`: red verificada del portal del Paso Agua Negra (seed `verified`).
- `brechas_declaradas[]`: 3 brechas por tramo **DECLARADAS** por el trabajo territorial (constantes del módulo `VIG013_BRECHAS_SOS`), cada una con estado `declarada` y fuente «documento vecinal interno (procedencia declarada, sin firmantes — ADR-027)»:
  1. RN 150 tramo Las Flores–Colola
  2. RN 150 tramo Rodeo–Jáchal
  3. RN 149 bajada Alto del Colorado–Villa Iglesia
- `cautela`: el portal oficial no publica cobertura por tramo como padrón (R15).

### 2.5 `pedidos_dpv` (tabla `pedidos`, VIG-012)

- Resumen del tablero de pedidos formales: `esperados_documento` (PEDIDOS_DPV_ESPERADOS = 15), `presentados`, `respondidos`, `cobertura` «X de 15 presentados · Y respondidos (corte …)», `fecha_corte` (UTC del día).
- `sin_respuesta` sigue siendo DERIVADO en lectura (VIG-012) — aquí solo se cuentan estados ALMACENADOS.

### 2.6 `kpis` (tabla `kpi_snapshots`, patrón VIG-003)

- Lee SOLO las 6 claves del set VIG-013 (`VIG013_KPI_KEYS` en contracts).
- Los materializa el consumidor `vig003-kpi` del worker con upsert idempotente: **sin corrida → 0 snapshots honestos** (R15) — el dashboard declara la nota, jamás simula valores.

## 3. Set v2 de KPIs (9 → 15 claves)

Mismo consumidor `vig003-kpi` y mismo contrato de honestidad del set v1 (VIG-003 #182): agregados sin PII (Ley 25.326), upsert por (nodo_key, kpi_key) que RE-DERIVA desde las tablas de dominio — jamás incrementos (R4/R15). `KPI_TEXTO` del RAG (VIG-006) extendido con prosa española para las 6 claves.

| KPI | valor | detalles |
|---|---|---|
| `pedidos_respondidos` | respondidos (estados ALMACENADOS) | `{presentados, respondidos_en_plazo, respondidos_tardio}` |
| `obras_km_ejecucion` | **null honesto** (km sin estructurar) | `{tramos_declared, tramos_in_execution, tramos_completed}` |
| `puntos_criticos_con_revision` | community_validated + verified | desglose por estado |
| `reportes_amc_por_dominio` | suma por dominio | desglose por dominio (AMC VIG-011, excluye sintéticos y descartados) |
| `reportes_amc_por_distrito` | suma por distrito | distrito DERIVADO del subnodo ancla por la cadena parent; `_sin_subnodo` si no declara ancla |
| `parajes_con_reporte` | parajes con ≥ 1 reporte | `{parajes_total, parajes_con_reporte}` — el paraje queda marcado al pasar por la cadena parent |

## 4. Contrato y pruebas

- `KpiKeySchema` extendido con las 6 claves + export `VIG013_KPI_KEYS` (`packages/contracts`).
- Suite E2E `apps/api/src/vig013-infraestructura-movilidad-rutas.test.ts` (7 tests): estructura del dashboard + 404, obras derivadas del dominio con km null, puntos críticos SIN geometría (ADR-036: el body no contiene `"lat"`/`"lng"`), paradas VACÍAS con cobertura declarada, brechas SOS constantes, resumen DPV contra la tabla `pedidos`, y bloque KPI (recompute 15 → lectura 15 → dashboard 6 consistentes).
- Aserciones DERIVADAS del dominio vivo (GET `/api/nodos/:key/features` y la tabla `pedidos`) para no contaminarse con escrituras de suites paralelas (lección VIG-011).
- Suites de conteo fijo actualizadas por el 9 → 15: `vig003-kpis.test.ts`, `showcase-demo.test.ts`, `kpi-consumer.test.ts` (worker).

## 5. Decisiones registradas

- **Sin worker nuevo**: el consumidor `vig003-kpi` ya materializa cualquier clave de `KPI_KEYS` — extender el set es solo agregar claves y derivaciones.
- **Brechas SOS como constantes del módulo**: son declaraciones del trabajo territorial (ADR-027), no features de una capa — si algún día se verifican contra padrón oficial, migran a la capa `cobertura_sos` con fuente ADR-035.
- **km null ≠ 0**: publicar 0 km ejecutados sería un dato falso; publicar un km de prensa sería un dato no verificable. null honesto + desglose por tramos.
- OpenAPI v7.36.0 → v7.37.0 (58 → 59 paths).

## 6. Trazas

- Issue #382 · épica #377 · patrón NCAP-R5 #157 · registro EV-086 en `docs/EVIDENCIA.md`.
- Predecesores: VIG-010 #381 (vocabulario vial), VIG-011 #378 (AMC), VIG-012 #379 (pedidos formales).
- Sub-sprint restante del módulo: VIG-014 #380 (frontend).
