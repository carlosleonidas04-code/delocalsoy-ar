# VIG-010 — Vocabulario vial del nodo Iglesia (#381)

> Sprint NODO-VIG-3 VIG-010 (#381, épica #377 — módulo de vialidad y movilidad del nodo
> Iglesia). Decisiones ratificadas por la DH 2026-11-06 (traza #377 comment 6676564545):
> 9 dominios de reporte ciudadano (AMC v0.3), subnodo_key obligatorio en el flujo de
> reportes (VIG-011), 4 capas nuevas ratificadas, numeración VIG-010..014 confirmada
> contra el tablero (#378–#382) y reglas de corroboración (un reportante distinto = un
> peso; cluster 500 m/90 días; caducidad 12 meses).
> Base: main @ `9f1bae9d` (NC-R4 #139; registro EV-082 aún pendiente). Rama: `feat/vig-010-vocabulario-vial`.

## Decisiones de la DH (ratificadas)

1. **Capas v5.1 REUTILIZADAS** del R1 Capital (`public_space`, `public_lighting`,
   `trees`, `sidewalks`, `irrigation_channels`) — sin vocabulario paralelo (lección
   axis_*/cor_*): los 9 dominios del AMC aterrizan sobre capas existentes siempre que
   la geometría lo permita.
2. **4 capas nuevas** ratificadas: `obra_vial` (anuncios y ejecuciones — ciclo
   declared → in_execution → completed, `in_execution` es estado nuevo documentado
   en el comentario de `features.estado`, sin migración), `punto_critico` (problems,
   `default_on` — la boca única del AMC converge aquí), `parada_transporte` (community —
   NACE VACÍA: sin padrón verificado no se siembran paradas, R15) y `cobertura_sos`
   (health — señal celular, internet y postes SOS).
3. **40 categorías N2 de los 9 dominios del AMC v0.3** + 2 reutilizadas (`damaged_road`
   → caminos rurales; `damaged_heritage` → patrimonio). El nodo queda con 52
   categorías (10 demo + 2 VIG-009 patrimonio + 40 nuevas). Cierra los vacíos pedidos por
   la DH: sequía y escasez, clima completo (zonda/polvo, nieve/hielo, niebla, plagas,
   heladas/granizo, cauces/aluvión), energía eléctrica (tendido caído = riesgo), calles
   urbanas explícitas (vs. ruta), animales sueltos, ruidos de obra, movilidad activa y
   raíces/arbolado-daño-vereda.
4. **R15 anuncio ≠ obra**: los tramos RN 150 (Las Flores–Colola 22 km; segunda etapa
   Colola–Jáchal 60 km, ejecutor sin dato) y los derivadores (1 agregado en ejecución +
   1 agregado con 3 anunciados) se siembran `declared` / `in_execution` con
   coordenadas ilustrativas (`is_synthetic=true`, fuente «Ilustrativa · …» — patrón
   NCAP-R5 #157). La red SOS del Paso Agua Negra queda `verified` (portal oficial,
   enero 2026; ancla ilustrativa redondeada al Paso Agua Negra, BAHRA Paso A37).

## Capas del nodo (12 = 3 demo + 5 v5.1 reutilizadas + 4 nuevas)

| key | dominio | geometría | default_on | origen |
| --- | --- | --- | --- | --- |
| productive_units | production | Point | true | demo CORE-003 |
| rural_services | problems | LineString | true | demo CORE-003 |
| tourism_resources | tourism | Point | true | demo CORE-003 |
| public_space | public_space | Point | true | v5.1 reutilizada |
| public_lighting | problems | Point | false | v5.1 reutilizada |
| trees | assets | Point | false | v5.1 reutilizada |
| sidewalks | problems | LineString | false | v5.1 reutilizada |
| irrigation_channels | assets | LineString | false | v5.1 reutilizada |
| obra_vial | assets | LineString | false | nueva VIG-010 |
| punto_critico | problems | Point | true | nueva VIG-010 |
| parada_transporte | community | Point | false | nueva VIG-010 |
| cobertura_sos | health | Point | false | nueva VIG-010 |

## Categorías (52 = 10 demo + 2 VIG-009 + 40 nuevas), mapeadas por dominio AMC

- **Espacio público (7):** street_lighting, sidewalk_condition, plaza_furniture,
  waste_dumping, tree_damage, stray_animals, noise_dust_nuisance →
  public_lighting / sidewalks / public_space / trees / public_space / public_space / public_space.
- **Infraestructura vial (7):** road_surface, urban_surface, road_shoulder,
  road_signage, road_barrier, bridge_culvert → punto_critico; work_zone_risk → obra_vial.
- **Movilidad (5):** bus_stop_issue, service_frequency, school_health_transport →
  parada_transporte; pedestrian_crossing → sidewalks; active_mobility_risk → punto_critico.
- **Agua y saneamiento (3):** drinking_water_issue, sewer_drainage → punto_critico;
  irrigation_conflict → irrigation_channels.
- **Clima y ambiente (7):** drought_scarcity, snow_ice, zonda_dust, frost_hail,
  flash_flood_risk, fog_visibility, urban_rural_pests → punto_critico.
- **Conectividad (3):** cell_dead_zone, internet_gap, sos_coverage_gap → cobertura_sos.
- **Servicios (5):** power_grid_issue, health_access_issue, school_facility_issue,
  security_post_issue, public_building_issue → punto_critico.
- **Producción rural (3):** productive_access, wildlife_corridor → rural_services;
  agro_practice_issue → productive_units.
- **Patrimonio y caminos rurales:** reutilizan damaged_heritage (tourism_resources)
  y damaged_road (rural_services) del vocabulario demo — sin duplicados. Más las 2 categorías de patrimonio de
   VIG-009 ya en main (patrimonio_deterioro y patrimonio_perdida, sobre
   tourism_resources): el nodo queda con 52 categorías (10 demo + 2 VIG-009 +
   40 nuevas).

## Features seed (5) — estado honesto del ciclo de obra (R15)

| id | capa | estado | fuente |
| --- | --- | --- | --- |
| seed-f-vig010-rn150-las-flores-colola | obra_vial | declared | prensa provincial 2–5/11/2026 |
| seed-f-vig010-rn150-colola-jachal | obra_vial | declared | prensa provincial 2–5/11/2026 |
| seed-f-vig010-derivador-ejecucion | obra_vial | in_execution | prensa provincial 2–3/11/2026 |
| seed-f-vig010-derivador-anunciados | obra_vial | declared | prensa provincial 5/11/2026 |
| seed-f-vig010-sos-agua-negra | cobertura_sos | verified | portal oficial, enero 2026 |

Todas ilustrativas (`is_synthetic=true`) con fuente_label «Ilustrativa · …» — jamás
coordenada oficial. La capa `parada_transporte` nace VACÍA (R15: sin padrón
verificado de paradas de las líneas 600/601 no se siembra nada).

## Fuentes (4) — catálogo global ADR-035: 45 → 49

| key | tipo | estado | cautela central |
| --- | --- | --- | --- |
| prensa_obras_iglesia_2026_11 | documento | disponible | Anuncio ≠ obra ejecutada (R15) |
| portal_paso_agua_negra | registro_web | disponible | cobertura por tramo NO publicada como padrón |
| agregador_transporte_600_601 | api | disponible | sin GTFS/padrón: parada_transporte nace vacía |
| documento_vecinal_iglesia_2026_11 | documento | disponible | procedencia declarada (ADR-035/027): testimonio vecinal, pedidos NO precargados |

## Hallazgo documentado (ADR-040)

El seed demo (CORE-003) menciona «olivícola» y «vid» en iglesia (categorías
prod_* y features seed-f-igl-102/103), en desajuste con el perfil productivo
semillas/hortalizas del nodo ratificado por la DH. NO se modifica en este sprint
(fixtures congelados ADR-040): queda registrado como hallazgo para un futuro
sprint de corrección con decisión expresa de la DH.

## Persistencia

- `packages/db/prisma/seed-vocabulario-vial-iglesia.sql` (idempotente: ON CONFLICT
  DO NOTHING por (nodo_id,key) de capas, (nodo_id,code) de categorías, (id) de
  features y (key) de fuentes).
- Sellos `events_raw` (única fuente de verdad): 9 `capa.registrada`
  (hash `seed-capa-iglesia-<key>`) + 4 `fuente.registrada` (hash
  `seed-fuente-<key>`), payload `source: seed-vig-010`, sin PII (ADR-027).
- `db:seed`: 17→18 SQL. Suite E2E nueva:
  `apps/api/src/vig010-vocabulario-vial-rutas.test.ts` (7 tests, patrón
  nodos-rutas: db:seed real + skip honesto sin base) + suites de fuentes
  actualizadas al catálogo de 49 (fuentes-vig-rutas, fuentes-capital-rutas y
  fuentes-procedencia-rutas con KEYS_IGLESIA).

## Criterio de cierre #381

1. Seed verde en CI (db:seed + suite nueva + regresión: 12 capas / 52 categorías /
   11 features de iglesia / catálogo de 49 fuentes sin duplicados).
2. Convenciones de honestidad intactas: todo feature ilustrativo hasta validación
   (patrón NCAP-R5 para obras anunciadas); ADR-035 regla 1 sin cambios.
3. Vocabulario observable por `GET /api/nodos/iglesia/{capas,categorias,features}`.

## Sin cambios de superficie HTTP

El endpoint `GET /api/nodos/:key/*` ya sirve el vocabulario por datos: este sprint
NO toca rutas ni `openapi` (v7.34.0, 53 paths).
