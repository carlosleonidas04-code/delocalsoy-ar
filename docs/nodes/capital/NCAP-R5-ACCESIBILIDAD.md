# NCAP-R5 — Accesibilidad peatonal del nodo Capital (#157, épica #152)

Diseño de la capa inicial de accesibilidad peatonal del nodo Capital y de su
dashboard público. Eslabón de la «cascada NODO-CAPITAL» ratificada por la DH
el 2026-11-05: R3 fuentes (#155 ✓ EV-078) → R1 vocabulario (#153 ✓ EV-079) →
**R5 accesibilidad (#157, este PR)** → frontend #163.

## Decisiones ratificadas (DH 2026-11-05)

1. **Tramos anclados a `sidewalks`**: los 18 tramos del anuncio municipal de
   repavimentación del microcentro 2026 (fuente `repavimentacion_microcentro_2026`,
   registrada en NCAP-R3 #155) se modelan como features de la capa `sidewalks` con
   la categoría nueva `tramo_priorizado`. Sin geometría LineString propia en v1 —
   las coordenadas del feature son ilustrativas (`is_synthetic=true`), jamás
   catastro oficial (R15).
2. **`declared` = anuncio sin verificación**: los tramos nacen en estado
   `declared` — anuncio ≠ obra. El estado por tramo exige verificación municipal;
   el relevamiento real los moverá a `community_validated` | `verified`. El
   dashboard lo publica honesto: `con_relevamiento: 0` y la cautela visible.
3. **Observaciones con fecha/método/estado de revisión**: cada observación de
   accesibilidad (capa `accessibility`, NCAP-R1) lleva `observado_at` (fecha),
   `fuente_label` (método) y un estado del workflow: `pending` (ingresada),
   `community_validated` (revisada), `verified` (corroborada), `disputed`
   (disputada — estado nuevo de este sprint).
4. **Conteos con cobertura y fecha, jamás puntajes globales** (R5/ADR-036): el
   dashboard publica «0 de 18 tramos priorizados cuentan con relevamiento»,
   nunca «accesibilidad del Centro: 82%». Todo número lleva su fecha de corte.

## Vocabulario de estados de feature (R5)

| Estado | Significado | Uso en R5 |
| --- | --- | --- |
| `declared` | Anuncio sin verificación (nuevo) | 18 tramos del anuncio de repavimentación |
| `disputed` | Observación en disputa (nuevo) | 1 observación seed |
| `pending` | Ingresada, sin revisión | 2 observaciones seed |
| `community_validated` | Revisada por la comunidad | 2 observaciones seed |
| `verified` | Corroborada (verificación con método) | 1 observación seed (cruce conforme) |
| `synthetic_demo` | Ilustrativa del vocabulario R1 | 4 features accessibility + seeds previos |

## Los 18 tramos declarados (categoría `tramo_priorizado`, capa `sidewalks`)

Fuente: `repavimentacion_microcentro_2026` (anuncio municipal, NCAP-R3 #155).
Estado `declared` para todos; coordenadas ilustrativas dentro del rectángulo
anunciado; `observado_at` 2026-11-05.

| id | tipo | descripción |
| --- | --- | --- |
| `seed-f-tramo-01` … `seed-f-tramo-14` | N-S | 14 tramos norte-sur, grilla ilustrativa 7×2 del microcentro |
| `seed-f-tramo-p01` … `seed-f-tramo-p04` | perimetral | 4 tramos del perímetro del rectángulo anunciado |

Sello de procedencia: `events_raw` hash `seed-tramos-capital` (type
`accesibilidad.tramos_priorizados`, payload {nodo_key, total: 18, fuente_key,
cautela, source: seed-ncap-r5}) — sin PII.

## Las 6 observaciones seed (capa `accessibility`)

| id | título | estado |
| --- | --- | --- |
| `seed-f-acc-301` | Falta rampa — esquina sin rebaje (Centro Cívico) | pending |
| `seed-f-acc-302` | Cruce sin semáforo — eje comercial Av. San Martín | pending |
| `seed-f-acc-303` | Vereda obstruida — postes en la senda peatonal | community_validated |
| `seed-f-acc-304` | Rampa con rebaje deteriorado — paso peatonal | community_validated |
| `seed-f-acc-305` | Cruce con rampa y rebaje conforme — eje cívico | verified |
| `seed-f-acc-306` | Obstáculo en disputa — veredón sin senda demarcada | disputed |

Sello: `events_raw` hash `seed-acc-observaciones-capital` (type
`accesibilidad.observaciones_seed`, payload {nodo_key, total: 6, estados[],
source: seed-ncap-r5}) — sin PII.

## Dashboard público `GET /api/nodos/:key/accesibilidad` (openapi v7.34.0)

Lectura pública anónima; 404 honesto para nodo inexistente. Cuatro grupos de
conteos, todos con fecha de corte:

1. **features_por_capa / features_por_fuente**: conteos del dominio movilidad
   (accessibility 10: 4 R1 + 6 R5; sidewalks 19: 18 tramos + 1 seed R1) con
   desglose por estado y por fuente.
2. **tramos_vereda**: `{priorizados: 18, con_relevamiento: 0, cobertura: «0 de
   18 tramos priorizados cuentan con relevamiento», fecha_corte, cautela` —
   el formato honesto de ADR-036: «82% de los tramos relevados cumple
   (cobertura: 14 de 120)», nunca un puntaje global del nodo.
3. **observaciones**: ingresadas/revisadas/corroboradas/disputadas/ilustrativas
   con fecha_corte.
4. **hitos**: catálogo global (11) con `con_ficha` (feature landmarks NCAP-R1
   1:1 por convención `seed-f-<hito_key>`, 9 con ficha) y `ultima_revision`
   (observado_at de la ficha; null honesto sin ficha).

Regla de la respuesta: `regla: 'Conteos con cobertura y fecha — jamás puntajes
globales (R5/ADR-036)'`. La suite E2E (accesibilidad-rutas.test.ts, 9 tests)
afirma que la respuesta NO contiene «porcentaje» ni «puntaje».

## Criterio de cierre del issue #157

- ✅ Capa de accesibilidad visible con procedencia: 18 tramos + 6 observaciones
  seed con fuente, fecha, estado y sellos `seed-ncap-r5` sin PII.
- ✅ Dashboard público con cobertura/fecha probado en CI: ruta montada, suite
  E2E 9 tests (shape, conteos por capa/fuente/estado, tramos, observaciones,
  hitos, 404, sellos, idempotencia del seed 17 SQL).
- ✅ Estados honestos documentados: `declared`/`disputed` en schema, doc y
  openapi; suite vocabulario actualizada (features capital 19→43, categorías
  12→13).

## Cautelas

- Anuncio ≠ obra (R15): la repavimentación anunciada no es vereda repavimentada;
  el dashboard no lo afirma — publica cobertura 0 de 18.
- Todo feature es sintético/ilustrativo (ADR-035/ADR-040): coordenadas dentro de
  la envolvente del nodo, jamás oficiales.
- Sin PII en `events_raw` (Ley 25.326, ADR-027): sellos solo con conteos y keys.
- El frontend #163 consumirá este dashboard del API (DataSource api real
  ADR-029); synthetic queda como degradación explícita.
