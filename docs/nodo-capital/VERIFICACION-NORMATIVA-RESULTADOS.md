# Verificacion normativa — Resultados (Bloque D, NUT-CAP-012)

**Proyecto:** DELocalSoy.AR | **Nodo:** Capital | **Ejecutor:** agent-vibe | **Fecha:** 2026-10-15
**Issue:** #215 — matriz base: BLOQUE-D-VERIFICACION-NORMATIVA.md (DH, preservado verbatim)
**Datos estructurados:** data/sources/capital/normativa.matriz.json

## Resumen de la pasada

Una de las cinco tareas de NUT-CAP-012 se completa: **terminos IGN revisados y verificados (NORM-CAP-008: unknown -> verified)**. Las cuatro restantes no obtienen texto oficial por via publica en esta pasada y permanecen en su estado epistemico anterior, con evidencia reforzada y pedidos formales de respaldo. Ninguna norma se eleva a verified sin su texto oficial (regla de ingesta del Bloque D).

## Matriz resultante

| ID | Norma | Estado | Resultado de la pasada |
|---|---|---|---|
| NORM-CAP-001 | RUMAE — Despacho 325-26 | provisional (sin cambio) | Texto oficial no localizado; 10+ medios coinciden; refuerza PED-CAP-001 |
| NORM-CAP-002 | Ordenanza 9194 | provisional (sin cambio) | Texto oficial no localizado; prensa la referencia como regimen previo reemplazado |
| NORM-CAP-003 | Habilitacion comercial | provisional (sin cambio) | Pagina oficial no expone el numero; sitio municipal bloquea relectura automatizada |
| NORM-CAP-004 | Ordenanza 9587 | verified (sin cambio) | Hallazgo: ordenanza de vehiculos gastronomicos aprobada 2025-04 sin numero publicado; norma conexa provisional |
| NORM-CAP-005 | Acceso a la informacion provincial | provisional (sin cambio) | Sin ley hallada; proyectos Sancassani (2026) con antecedente Tomas; via administrativa directa |
| NORM-CAP-006 | Datos personales | verified como marco nacional | Sin ley provincial propia; DNPDP sanciono a San Juan (evidencia de techo nacional); proyecto Cornejo sin ley |
| NORM-CAP-007 | Licencias datos abiertos / UNIDE | unknown (sin cambio) | Portal requiere JavaScript; API no legible sin JS; capas inaccesibles (PR #217) |
| **NORM-CAP-008** | **Uso cartografico IGN** | **unknown -> verified** | **Terminos y Condiciones oficiales leidos integramente** |

## NORM-CAP-008 — Terminos y Condiciones del IGN (verified)

Fuente oficial: https://www.ign.gob.ar/descargas/tyc3.html

Politica de licenciamiento de datos (7 condiciones):

1. Citar la fuente: "FUENTE: Instituto Geografico Nacional de la Republica Argentina".
2. Los datos descargados no deben alterarse.
3. No indicar, insinuar o sugerir patrocinio o aval del IGN.
4. Conservar los metadatos de fecha de actualizacion y condiciones de reutilizacion.
5. En productos derivados, mencionar la fecha de los datos originales del IGN.
6. Compartir los datos de manera libre y gratuita.
7. Uso comercial unicamente en obras derivadas donde la informacion sea insumo de un nuevo producto.

La reutilizacion autorizada incluye copia, difusion, modificacion, adaptacion, extraccion, reordenamiento y combinacion, sin desnaturalizar la informacion. Jurisdiccion: Tribunales Federales (CABA).

**Impacto de diseno:** la cartografia base del IGN es utilizable con atribucion y la publicacion de derivados no esta bloqueada (a diferencia de NORM-CAP-007).

## Hallazgos operativos de la pasada

1. **Ordenanza de vehiculos gastronomicos (2025-04, numero unknown):** el Concejo Deliberante de Capital aprobo la regulacion de carros pancheros/"vehiculos gastronomicos" en abril 2025. Sin numero ni texto oficial publicados en medios consultados. Se registra como norma conexa a NORM-CAP-004 sin presumir modificacion de la 9587.
2. **Sancion DNPDP a San Juan (prensa legal, provisional):** el organismo nacional de control sanciono al Ministerio de Salud de San Juan por filtracion de datos personales — evidencia de que el techo nacional 25.326 opera como marco vigente ante la ausencia de norma provincial propia.
3. **Portal de datos abiertos no legible sin JavaScript:** datosabiertos.sanjuan.gob.ar y su API no responden a lectura automatizada; las licencias siguen unknown y derivados bloqueados (NORM-CAP-007).
4. **Digesto provincial online:** existe digestosanjuan.gob.ar (Digesto Juridico de la provincia) — canal oficial para futuras verificaciones de leyes provinciales (no ordenanzas municipales).

## Regla de ingesta aplicada

| Situacion | Accion tomada |
|---|---|
| Texto oficial obtenido | NORM-CAP-008 -> verified con URL |
| Solo prensa | NORM-CAP-001/002 y hallazgo conexo 2025 -> provisional |
| Norma identificada sin texto | NORM-CAP-002/003 -> provisional + pedido formal |
| Sin norma identificable | NORM-CAP-007 -> unknown, derivados bloqueados |
| Licencia ausente | Publicacion de derivados bloqueada |

## Gobernanza

- R15: PR en cola de merge (Actions bloqueado hasta 2026-11-01); nada se mergea sin CI verde.
- Ref #215 (no lo cierra). Los textos oficiales faltantes dependen de los pedidos formales (PED-CAP-001, PED-CAP-004) y de la obtencion del digesto municipal.