# NC-R6 — Activación territorial del Nodo Caucete

**Nodo:** Caucete · **Épica:** NODO-CAU #137 · **Issue:** NC-R6 #145 · **Evidencia:** a numerar al volver CI (numeración EV abierta)

Activación territorial del nodo Caucete por directiva de la DH (2026-10-20),
sobre la decisión territorial de 3 escalas del 2026-10-11 (épica #137): la
ciudad Caucete como área operativa inicial, el departamento como referencia
estadística INDEC (población 2022: 44.047 hab — NO transferible a la ciudad)
y la zona este-oriental Valle de Tulum como referencia regional. Estructura
v0.1: la ciudad + las 9 localidades del departamento con centroide oficial
Georef, sembradas como subnodos de referencia estadística.

## Qué se acreditó

- Sin migración ni ruta nuevas: la tabla `subnodos` y la lectura pública
  `GET /api/nodos/caucete/subnodos` (filtros `?type=` / `?parent=`) se
  reutilizan del VIG-001 (#171) — mismo patrón que NCAP-R2 (#154).
- Seed idempotente `packages/db/prisma/seed-subnodos-caucete.sql`: 10
  entidades con sellos `subnodo.creado` en `events_raw` (hash
  `seed-subnodo-<key>`, fuente `seed-nc-r6`), encadenado a `db:seed`
  (8º SQL).
- Corrección del centro del nodo en `seed.sql`: -31.383, -68.281 →
  **-31.651, -68.282** (centroide de la localidad censal Caucete,
  Georef/INDEC; el punto anterior quedaba ~30 km al sur).
- Suite E2E `apps/api/src/subnodos-caucete-rutas.test.ts` (8 tests contra
  Postgres/PostGIS real; sin base → skip honesto) + ajuste honesto de
  `subnodos-rutas.test.ts` y `showcase-demo.test.ts` al nuevo estado real.

## Matriz entidad ↔ boundary_status ↔ fuente (estructura v0.1)

| Entidad | key | tipo | parent | boundary_status | assignment_status | punto | external_id Georef |
|---|---|---|---|---|---|---|---|
| Caucete (localidad censal, área operativa inicial) | `sj_caucete_ciudad` | district | null | provisional | dh_directive | centroide oficial (-31.6515, -68.2820) | 70035020 |
| Bermejo | `sj_caucete_bermejo` | locality | null | provisional | dh_directive | centroide oficial | 70035010 |
| El Rincón | `sj_caucete_el_rincon` | locality | null | provisional | dh_directive | centroide oficial | 70035030 |
| Las Talas - Los Médanos (localidad censal compuesta) | `sj_caucete_las_talas_los_medanos` | locality | null | provisional | dh_directive | centroide oficial | 70035040 |
| Pie de Palo | `sj_caucete_pie_de_palo` | locality | null | provisional | dh_directive | centroide oficial | 70035060 |
| Vallecito | `sj_caucete_vallecito` | locality | null | provisional | dh_directive | centroide oficial | 70035070 |
| Villa Independencia | `sj_caucete_villa_independencia` | locality | null | provisional | dh_directive | centroide oficial | 70035080 |
| Marayes | `sj_caucete_marayes` | locality | null | provisional | dh_directive | centroide oficial | 70035050 |
| Las Talas (entidad de la LC compuesta) | `sj_caucete_las_talas` | locality | `sj_caucete_las_talas_los_medanos` | provisional | dh_directive | centroide oficial | 7003504001 |
| Los Médanos (entidad de la LC compuesta) | `sj_caucete_los_medanos` | locality | `sj_caucete_las_talas_los_medanos` | provisional | dh_directive | centroide oficial | 7003504002 |

Fuente de los 10 centroides: Georef/INDEC (apis.datos.gob.ar, consultado
2026-10-20) — punto oficial público de dominio, no sensible (ADR-036). A
diferencia del NCAP-R2 (puntos BAHRA/Georef a verificar → lat/lng null
honesto, R15), acá el centroide de la localidad censal es el dato oficial
publicado por Georef y se publica.

Toda la estructura nace `provisional` (`boundary_status`) hasta la
ratificación municipal de límites (R15/ADR-035). La zona `valle_de_tulum` es
referencia regional de la escala 3 (este-oriental), mismo uso que
`gran_san_juan` en el Capital.

## Perímetro operativo

Estado: **propuesta**. Candidato v1 de perímetro operativo: la localidad
censal Caucete (el district sembrado). Referencia de trabajo para el
contraste: mapa «Caucete – Cabecera y Entorno» de Catastro San Juan
(edición 2021) — referencia de trabajo, NO límite legal. La ratificación del
perímetro es municipal y está pendiente (R15).

## Hallazgos documentados (sin mandato de cambio)

- Fila `territorios` de Caucete en `seed.sql` (-67.5061, -31.3864):
  coordenada referencial de cabecera desviada respecto del centroide
  departamental Georef (-67.5454, -31.5069). NO se toca en este PR (sin
  mandato); queda documentada para decisión de la DH.
- Población departamental INDEC 2022 (44.047 hab): referencia estadística
  del departamento, NO transferible a la ciudad Caucete (regla de las 3
  escalas).

## Pendientes honestos

- Ratificación municipal del perímetro operativo (candidato v1: localidad
  censal Caucete).
- Primera ingesta real REFES + CUE sobre la base territorial activada
  (ADR-035, NC-EV-09).
- Talleres comunitarios (#139) para el mapa de percepción (fuera de alcance
  v1, NC-R4).

## Trazabilidad

- Decisiones: estructura v0.1 (ciudad + 9 localidades Georef, zona
  `valle_de_tulum`) ratificada por la DH (2026-10-20); corrección del centro
  del nodo al centroide censal ratificada por la DH (2026-10-20).
- Verificación: CI de GitHub Actions caído (límite mensual, reinicio
  ~2026-11-01) — el PR queda en cola de merge; sin CI verde no hay merge.
  E2E `subnodos-caucete-rutas.test.ts` ejecuta el seed REAL contra
  Postgres/PostGIS.
- R9/R15: este documento + el código + las pruebas viven en el repo; nada
  de lo declarado aquí se publica sin fuente (Ley 25.326/ADR-036 sin PII).
