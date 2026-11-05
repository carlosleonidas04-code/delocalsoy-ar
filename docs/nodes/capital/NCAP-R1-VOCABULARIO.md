# NCAP-R1 — Vocabulario del nodo Capital (#153)

> Sprint NODO-CAPITAL R1 (#153, épica #152). Decisión DH «cascada NODO-CAPITAL» ratificada 2026-11-05:
> R3 fuentes (#155) → R1 vocabulario (#153) → R5 accesibilidad (#157) → frontend (#163).
> Base: main @ `cbe53e9` (NCAP-R3 + EV-078). Rama: `feat/ncap-r1-vocabulario-capital`.

## Decisiones de la DH (ratificadas)

1. **`accessibility` es una capa COMPLEMENTARIA de puntos** (rampas/cruces/obstáculos).
   Los tramos peatonales siguen en `sidewalks` (LineString): SIN duplicar geometría.
   El anclaje tramo↔vereda y los atributos fecha+método+estado de revisión llegan con R5 (#157).
2. **`landmarks` alineada al catálogo global `corredor_hitos`** (NCAP-R4 #156): cada feature
   lleva el key del hito en su id (`seed-f-<hito_key>`) — alineación estructural
   (`features` no tiene columna hito; el id ES el vínculo).
3. **Categorías alineadas a los dominios del documento**: movilidad (`accessibility`)
   y espacio público (`landmarks`). Ambiente ya cubierto por `trees` / `irrigation_channels`.

## Capas del nodo (8 = v5.1 + 2 nuevas)

| key | dominio | geometría | default_on | origen |
| --- | --- | --- | --- | --- |
| commerce | assets | Point | — | seed.sql (v5.1) |
| public_space | assets | Point | — | seed.sql (v5.1) |
| public_lighting | problems | Point | — | seed.sql (v5.1) |
| trees | assets | Point | — | seed.sql (v5.1) |
| sidewalks | problems | LineString | — | seed.sql (v5.1) |
| irrigation_channels | assets | LineString | — | seed.sql (v5.1) |
| **accessibility** | problems | **Point** | false | **NCAP-R1 (nueva)** |
| **landmarks** | assets | **Point** | true | **NCAP-R1 (nueva)** |

## Categorías nuevas (4 → total nodo 12)

| code | capa | dominio documento |
| --- | --- | --- |
| missing_ramp | accessibility | movilidad |
| obstructed_sidewalk | accessibility | movilidad |
| unsafe_crossing | accessibility | movilidad |
| damaged_landmark | landmarks | espacio público |

## Hitos del catálogo global (7 de R4 + 4 nuevos = 11)

| key | tipo | origen |
| --- | --- | --- |
| hit_teatro_plaza_bicentenario | edificio_publico | NCAP-R4 #156 |
| hit_centro_civico | edificio_publico | NCAP-R4 #156 |
| hit_parque_de_mayo | espacio_publico | NCAP-R4 #156 |
| hit_facultad_ingenieria | edificio_publico | NCAP-R4 #156 |
| hit_plaza_desamparados | plaza | NCAP-R4 #156 |
| hit_microcentro_pec | corredor | NCAP-R4 #156 |
| hit_macrocentro | corredor | NCAP-R4 #156 |
| **hit_plaza_25_de_mayo** | plaza | **NCAP-R1 (nuevo)** |
| **hit_catedral** | edificio_publico | **NCAP-R1 (nuevo)** |
| **hit_casa_natal_sarmiento** | edificio_publico | **NCAP-R1 (nuevo)** |
| **hit_basilica_desamparados** | edificio_publico | **NCAP-R1 (nuevo)** |

Todos los hitos nacen lat/lng NULL (R15: sin punto verificado no se publica).

## Features seed (13)

- **9 landmarks** (`seed-f-<hito_key>`, capa landmarks, tipo asset): plaza 25 de Mayo,
  Catedral, Casa Natal de Sarmiento, Centro Cívico, Teatro del Bicentenario, Parque de Mayo,
  FI UNSJ, Plaza Desamparados, Basílica de Desamparados. Coordenadas dentro de la
  envolvente del nodo (#154) pero ILUSTRATIVAS — jamás coordenada oficial del hito.
- **4 accessibility** (`seed-f-acc-201..204`, capa accessibility): 1 asset (rampa con rebaje)
  y 3 problems (falta rampa, vereda obstruida, cruce sin semáforo).

## Paridad syntheticData (criterio de cierre #153)

Convenciones 1:1 con el vocabulario sintético v5.1 (`apps/web/src/demo/syntheticData.js`):
`is_synthetic=true`, fuente «Ilustrativa · …», estado `synthetic_demo`. Los fixtures demo
están congelados (ADR-040, deprecados, no montados) y NO se extienden: el frontend (#163)
consumirá este vocabulario desde el API. Verificada por la suite E2E.

## Persistencia

- `packages/db/prisma/seed-vocabulario-capital.sql` (idempotente: ON CONFLICT DO NOTHING
  por (nodo_id,key) de capas, (nodo_id,code) de categorías, (key) de hitos, (id) de features).
- Sellos `events_raw` (única fuente de verdad): 2 `capa.registrada`
  (hash `seed-capa-capital-{accessibility,landmarks}`) + 4 `hito.registrado`
  (hash `seed-hito-<key>`), payload `source: seed-ncap-r1`, sin PII.
- `db:seed`: 15→16 SQL. Suite E2E nueva: `apps/api/src/vocabulario-capital-rutas.test.ts`
  (7 tests, patrón nodos-rutas: db:seed real + skip honesto sin base).

## Criterio de cierre #153

1. Seed verde en CI (db:seed + suite nueva + regresión: 8 capas / 12 categorías / 19 features / 11 hitos).
2. Paridad syntheticData por convenciones (arriba).
3. Vocabulario observable por `GET /api/nodos/capital/{capas,categorias,features}`.

## Sin cambios de superficie HTTP

El endpoint `GET /api/nodos/:key/*` ya sirve el vocabulario por datos: este sprint
NO toca rutas ni `openapi` (v7.33.0, 52 paths).
