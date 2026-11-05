# NCAP-R3 — Catálogo de fuentes espaciales del nodo Capital (#155)

> Sub-issue de la épica #152 (NODO-CAPITAL). Análogo de NODO-CAU R7 (#147),
> bajo ADR-035 (vigente). Decisión DH «cascada NODO-CAPITAL», ratificada
> 2026-11-05: orden R3 fuentes (#155) → R1 vocabulario (#153) → R5
> accesibilidad (#157) → frontend #163.

## Qué es

El registro de procedencia del nodo Capital: 9 fuentes nuevas en la tabla
global `fuentes` (catálogo 36 → 45), cada una con organismo, URL estable
cuando existe, tipo, estado honesto de disponibilidad (verificación
2026-11-05), cautela y fecha de consulta. El catálogo NO contiene datos
del territorio: nunca un feature real sin fuente citable (R15). Sin
cambios de rutas ni de openapi (v7.33.0) — la tabla `fuentes`, las rutas
`/api/fuentes` y el pipeline de ingestas se reutilizan (patrón
NODO-CAU R2 #138/#147 y NVIG-R5 #172).

## Tabla de fuentes (verificación 2026-11-05)

| Key | Organismo | Tipo | Estado | Uso previsto / cautela central |
|---|---|---|---|---|
| `pec_capital_2025` | CoPESJ — Plan Estratégico San Juan | documento | disponible | Antecedente territorial central: 4 distritos, microcentro = rectángulo 7×6 cuadras (Libertador N / Córdoba S / Alem O / Rioja E) que CONFIRMA el perímetro v0.1 del repo (#154) y área central 16×10 cuadras. Planificación ≠ límite legal vigente. |
| `pec_capital_2026` | Municipalidad de San Juan | documento | disponible | Documento final 2026 del PEC Capital. Las áreas analíticas (microcentro/macrocentro) NO son distritos administrativos (regla de modelado #154). |
| `catastro_capital` | Catastro San Juan | documento | requiere_solicitud | Contraste parcelario de límites: la estructura v0.1 de Capital es PROVISIONAL (`assignment_status dh_directive`) hasta el contraste con vectorial + licencia + fecha de corte. |
| `unsj_fi` | UNSJ — Facultad de Ingeniería | documento | disponible | Domicilio institucional (Av. Libertador Oeste 1109) ≠ punto georreferenciado verificado: el hito mantiene lat/lng NULL (R15). Historia de la Basílica para etiquetado con fuente, no geometría. |
| `redtulum_anillo` | Secretaría de Tránsito y Transporte (San Juan) | documento | no_disponible | Sin GTFS (solicitud en pie) no existe traza exacta del Anillo Céntrico: `cor_redtulum_centro` (#156) modela SOLO referencias entre hitos, nunca línea dibujada. App muerta post-Moovit. |
| `indec_cp2022` | INDEC | descarga | disponible | CNPHV 2022 resultados definitivos, población departamental. NO trasladable a subnodos (sj_capital_centro / sj_capital_desamparados) sin desagregación publicada (R15, #154). |
| `habilitacion_municipal_sj` | Municipalidad de San Juan | registro_web | requiere_solicitud | Trámite web ≠ padrón bulk: verificación individual por comercio (patrón MARKET-CAP MK-2). Complementa `fuente_siic_web` (SIIC provincial, Ley 104-A). |
| `repavimentacion_microcentro_2026` | Municipalidad de San Juan | documento | disponible | Plan 2026 (anuncio apertura de sesiones + nota Tiempo 25-03-2026): 14 tramos N-S + 4 periféricos + rampas de accesibilidad. Anuncio ≠ obra ejecutada: estado por tramo exige verificación municipal (R15). Insumo de NCAP-R5 (#157) y corredores v0.2 (#156). |
| `datos_abiertos_sj` | Gobierno de San Juan | api | disponible | Portal de datos abiertos: sondeo de datasets pendiente; cada dataset exige licencia, escala/precisión y fecha de corte antes de ingesta. Descubrimiento ≠ fuente primaria. |

Multinodo (ya registradas, sirven también al Capital): `ign`,
`indec_iiee` (radios censales), `bahra`, `georef`, `unide`, `idera`,
`catastro_sj`, `inpres`, `mapbiomas`.

## Método de cruce por código (nunca por nombre)

- Departamento Capital: **INDEC/Georef = 70028** (verificado contra fuentes
  públicas; coherente con Iglesia = 70049 del seed VIG).
- Subnodos: `sj_capital_centro` / `sj_capital_desamparados` por key del
  vocabulario — jamás por coincidencia de nombre.
- Habilitaciones comerciales: por identificador de habilitación (patrón
  MK-2), nunca por razón social.

## Regla de ingreso a PostGIS

Nada se importa sin: disponibilidad verificada, licencia,
escala/precisión y snapshot versionado — el pipeline de ingestas
(recibido → validado_tecnicamente → validado_territorialmente →
publicado, curaduría admin) es la única vía.

## Persistencia

- Seed idempotente `packages/db/prisma/seed-fuentes-capital.sql`
  (ON CONFLICT key DO NOTHING), encadenado a `db:seed` (14 → 15 SQL).
- Sellos `fuente.registrada` en `events_raw` por hash
  `seed-fuente-<key>`, payload `{key, organismo, source: 'seed-ncap-r3'}`
  sin PII.
- Suite E2E `apps/api/src/fuentes-capital-rutas.test.ts` (5 tests,
  Postgres/PostGIS real, skip honesto sin base) + suites
  `fuentes-procedencia-rutas.test.ts` y `fuentes-vig-rutas.test.ts`
  actualizadas (catálogo global 36 → 45).

## Criterio de cierre del issue #155

Tabla de fuentes con fecha/estado por fuente ✔ (9 fuentes con
verificación 2026-11-05 y estados honestos) + método de cruce por código
(nunca por nombre) ✔ (código INDEC 70028 y claves del vocabulario).
