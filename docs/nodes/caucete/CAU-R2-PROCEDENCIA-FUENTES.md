# CAU-R2 — Catálogo de fuentes espaciales + procedencia por conjunto (NODO-CAU R2)

> Sprint NODO-CAU R2 (issues #138 y #147, épica #137 — ADR-035 fuentes científicas). Decisiones ratificadas por la DH 2026-10-15: (1) tabla global `fuentes` + seed del catálogo + lectura pública; (2) tabla `ingestas` con pipeline `recibido → validado_tecnicamente → validado_territorialmente → publicado` y alta admin; (3) solo admin publica (R15 estricta: quien publica es quien responde); (4) cierre de #138/#147 al acreditar NC-EV-03/NC-EV-09 con CI verde. Registro de evidencia: EV-049 (PR de registro posterior, patrón EV-048).

## Regla central (ADR-035)

Nunca un feature real sin fuente citable (R15). El catálogo es un **registro de procedencia**, no un registro de datos: cada fuente declara organismo, URL estable cuando existe, tipo de acceso, licencia y **cautela**. La ingesta de un conjunto externo declara su procedencia completa ANTES de entrar al sistema; la lectura pública solo expone lo publicado.

## Catálogo de fuentes (15, seed idempotente `seed-fuentes-cau.sql`)

| key | organismo | tipo | estado | cautela central |
|---|---|---|---|---|
| catastro_sj | Catastro San Juan | documento | disponible | Referencia de trabajo para digitalizar la propuesta de perímetro urbano; NO es límite legal vigente |
| ign | IGN (Instituto Geográfico Nacional) | wfs | disponible | WMS = visualización; WFS/descarga = análisis. Registrar capa, fecha, CRS y atribución en cada ingesta |
| unide | UNIDE (San Juan) | wms | requiere_credenciales | El WFS requiere autenticación — la vía correcta es solicitud formal con credenciales |
| indec_iiee | INDEC + IIEE San Juan | descarga | disponible | Escala censal: los radios censales no son barrios; no inferir a escala más fina que la publicada |
| bahra | BAHRA (IGN + INDEC + Mapa Educativo) | descarga | disponible | Base oficial de localidades con nombre unívoco y código único (cod_ase) |
| georef | Datos Argentina | api | disponible | Normalización de nombres/códigos; NO es fuente de geometrías |
| refes | MSAL — REFES | descarga | requiere_solicitud | Registro ≠ turnos/capacidad/horarios. Guardar id REFES (14 dígitos) y fecha de corte; join por código, nunca por nombre |
| mapa_educativo | MEN — Mapa Educativo Nacional | api | disponible | CUE + fecha de corte por actualización: registrar el corte del servicio |
| mapa_cuidado | MDS — Mapa Federal del Cuidado | descarga | requiere_solicitud | No completar con POI no verificados como inventario oficial |
| inpres | INPRES | documento | disponible | Contexto de peligro ≠ evaluación de vulnerabilidad por edificio; consultar a Protección Civil qué difundir (ADR-036) |
| faud_unsj | FAUD-UNSJ (Kurbán et al.) | documento | disponible | Evidencia cuantitativa local publicada (UTCI en Caucete); interpretación con método (R15/ADR-035) |
| hidraulica_sj | Hidráulica (Gobierno de San Juan) | documento | requiere_solicitud | La red vectorial de riego no está publicada — solicitud técnica en pie |
| mapbiomas | MapBiomas Argentina | descarga | disponible | Estadísticas departamentales de Caucete citables directamente (licencia CC BY-SA 4.0); contexto territorial, no calidad de agua automática |
| idera | IDERA | api | disponible | Catálogo de geoservicios para descubrimiento; NO es fuente primaria de geometrías |
| redtulum | Secretaría de Tránsito y Transporte (San Juan) | documento | no_disponible | App muerta post-Moovit (feb 2026); sin GTFS — solicitud en pie. No usar Google Maps como fuente |

Estados honestos verificados en vivo 2026-10-11 (trazas en #147): ninguna fuente se marca disponible sin verificación. Multinodo: IGN/INDEC/BAHRA/Georef sirven a los tres nodos. El seed es idempotente (ON CONFLICT DO NOTHING) y sella cada fuente en `events_raw` (`fuente.registrada`, hash `seed-fuente-<key>`, payload `{key, organismo, source}` sin PII).

## Contrato de procedencia (NC-EV-09, #138)

`IngestaAltaSchema` (contracts) es la compuerta: sin fecha de corte, escala/precisión o CRS la ingesta se rechaza (400). Campos: `fuente_key` del catálogo (404 si la clave no existe — la procedencia se ancla a un registro público verificable, no a una fuente libre), `capa_servicio`, `fecha_acceso` (YYYY-MM-DD), `fecha_corte` (YYYY-MM-DD o YYYY), `licencia?`, `crs_origen` y `crs_normalizado`, `escala_precision`, `external_id?` y `transformaciones?`. `FuenteLabelRealSchema` (ADR-035 regla 1): los labels de fuentes reales exigen el formato `Organismo · referencia` y rechazan los que empiezan con `Ilustrativa`.

## Pipeline de ingestas (#147)

`recibido → validado_tecnicamente → validado_territorialmente → publicado` — solo hacia adelante, solo admin (decisión DH 2026-10-15). Salto inválido → 400; mismo estado → 409. Cada transición sella `ingenta.estado_cambiado` en `events_raw` con rollback si el sello falla; el alta sella `ingenta.creada`. La lectura pública `GET /api/ingestas` solo expone lo publicado (el pipeline en curso queda para custodia, R15/ADR-036); `?nodo=` filtra por nodo. Anti-PII (ADR-020 cond. 1, Ley 25.326) sobre todo texto de autoría antes de persistir; autor = pseudónimo sha256(usuario_id) truncado; idempotencia por hash único del conjunto.

## Rutas

- `GET /api/fuentes` — catálogo público anónimo (15 fuentes con organismo, tipo, estado honesto y cautela).
- `GET /api/fuentes/:key` — ficha pública de una fuente (404 honesto).
- `POST /api/ingentas` — alta curada admin (NC-EV-09 + anti-PII + idempotencia + sello `ingenta.creada`).
- `GET /api/ingentas` — lectura pública de las publicadas (filtro `?nodo=`).
- `GET /api/ingentas/:id` — ficha pública de una publicada (en curso → 404 sin eco).
- `PATCH /api/ingentas/:id/estado` — avance del pipeline (admin; matriz de transiciones sellada).

## Criterio de cierre

#138 (ADR-035) y #147 (catálogo + procedencia) cierran con la acreditación de **NC-EV-03** (registro de procedencia operativo: catálogo público + ingesta curada + pipeline sellado) y **NC-EV-09** (el contrato rechaza la ingesta incompleta): suite E2E `apps/api/src/fuentes-procedencia-rutas.test.ts` (12 tests contra PostGIS/Redis reales, incluida la invariante ADR-035 regla 1 sobre `features` — nada real con label ilustrativo o sin `Organismo · referencia`) + CI verde en el PR del sprint. La evidencia se registra como EV-049 en `docs/EVIDENCIA.md` (PR de registro).
