# VIG-011 — AMC: Agencia de Mediación Ciudadana del Valle de Iglesia

**Sprint:** VIG-011 (#378, épica #377 — módulo NODO-VIG-3 «vial y movilidad»).
**Rama:** `feat/vig-011-amc-reportes`. **Reglas:** R9 (GitHub acredita, la DH ratifica), R15 (anuncio ≠ obra; sin bot; sin simular datos), R5 (conteos con cobertura y fecha, jamás puntajes), ADR-027 / Ley 25.326 (pseudonimización, consentimiento granular, jamás nombre).

La AMC es la **boca única de reporte territorial** del nodo: un mismo contrato y una misma tabla (`reportes`, extendida SIN tabla nueva — patrón VIG-002) reciben los reportes de los tres canales. El ciudadano nunca necesita saber «a dónde va el reclamo»: la palabra clave del dominio abre el formulario y el sistema hace el resto.

## 1. Los 9 dominios y su palabra clave de WhatsApp

| Dominio | Keyword | Categorías N2 (vocabulario VIG-010 #381) |
| --- | --- | --- |
| espacio_publico | **PLAZA** | street_lighting, sidewalk_condition, plaza_furniture, waste_dumping, tree_damage, stray_animals, noise_dust_nuisance |
| infraestructura_vial | **BACHE** | road_surface, urban_surface, road_shoulder, road_signage, road_barrier, bridge_culvert, work_zone_risk |
| movilidad | **PARADA** | bus_stop_issue, service_frequency, school_health_transport, pedestrian_crossing, active_mobility_risk |
| agua_saneamiento | **AGUA** | drinking_water_issue, sewer_drainage, irrigation_conflict |
| clima_ambiente | **CLIMA** | drought_scarcity, snow_ice, zonda_dust, frost_hail, flash_flood_risk, fog_visibility, urban_rural_pests |
| conectividad | **SEÑALCEL** | cell_dead_zone, internet_gap, sos_coverage_gap |
| servicios | **SERVICIO** | power_grid_issue, health_access_issue, school_facility_issue, security_post_issue, public_building_issue |
| produccion_rural | **CAMINO** | productive_access, agro_practice_issue, wildlife_corridor, damaged_road |
| patrimonio | **PATRIMONIO** | damaged_heritage, patrimonio_deterioro, patrimonio_perdida |

La categoría pertenece al vocabulario REAL del nodo (52 categorías VIG-010/VIG-009/demo): la API rechaza (400) una categoría ajena al dominio declarado (`AMC_CATEGORIAS_POR_DOMINIO` en `packages/contracts` es el espejo exacto del seed).

## 2. Contratos (`packages/contracts/src/index.ts`)

- `ReporteAmcAltaSchema` = `ReporteAltaSchema` (CORE-005) + `subnodo_key` **obligatorio** (ancla territorial contra la jerarquía VIG-001), `dominio`, `tipo` N3 opcional, `canal_ingreso` (web|papel|whatsapp|presencial), `precision` (gps|referencial|aproximado — R15: el vecino declara qué sabe), `riesgo_inmediato`, `mediador_ref`, `reportado_por` (alias comunitario), `consentimiento` granular, `observado_en` (fecha del testimonio).
- Refinamientos: alias ⇒ `consentimiento.guarda_alias === true`; papel|whatsapp ⇒ `mediador_ref` del registro con aval; papel|whatsapp ⇒ alias comunitario del vecino.
- `ReporteCorroboracionSchema` {precision opcional, nota opcional}. `MediadorAltaSchema` {nodo_key, key slug, label, aval asamblea|comision_vecinal}.
- Sin `dominio` en el cuerpo, el alta legacy CORE-005 queda intacta (compatibilidad total).

## 3. Canales: los 3 en paralelo desde el día 1

1. **Web autenticada** (`/api/reportes`): el vecino con cuenta reporta directo; autor = pseudónimo sha256 (ADR-027).
2. **Planilla papel** (`canal_ingreso: papel`): formato oficial imprimible (sección 5); la carga un **mediador con aval** como carga diferida (`observado_en` = fecha del testimonio, no de la carga).
3. **WhatsApp — número único de la asamblea, SIN BOT (R15)**: el vecino envía «<KEYWORD> + lugar + qué pasa» al número único; la keyword (sección 1) abre el formulario de carga del mediador. **No hay automatización de conversa**: la ingesta es humana — un mediador con aval registra el mensaje como si fuera planilla (`canal_ingreso: whatsapp`). Sin bot que simule respuestas o estados (R15).

## 4. Mediadores con aval comunitario

- Registro `mediadores` (nueva tabla): alias público (slug) + rol visible + **aval** (`asamblea` | `comision_vecinal` — comunitario, no gubernamental).
- Alta SOLO admin (`POST /api/mediadores`, sello `mediador.registrado` sin PII con rollback); lectura pública de vigentes (`GET /api/mediadores?nodo=iglesia`).
- **Nace VACÍA (R15):** la asamblea aún no ratificó mediadores — conteo 0 honesto, ninguna fila se siembra. Sin mediador registrado no hay canal papel|whatsapp.
- Sin PII: no hay nombre ni contacto en la tabla. La **devolución al vecino va por el canal de origen**: web (su propia cuenta) o el mediador (papel/WhatsApp).

## 5. Planilla papel (formato oficial imprimible)

Campos: fecha del reclamo · paraje/subparaje (subnodo VIG-001) · dominio (1 de los 9) · categoría · qué pasa (descripción) · punto (GPS si lo hay / referencia «frente a…») · riesgo inmediato sí/no · **alias comunitario** (elegido por el vecino, para la devolución) · firma del vecino (queda en el papel, jamás en el sistema) · mediador que carga.

**La planilla pide el nombre para la devolución, pero el sistema registra SOLO el alias** (ADR-027, Ley 25.326): el nombre vive en el papel físico bajo custodia del mediador, nunca en la base ni en los sellos. Un alias con nombre/apellido o contacto es rechazado por el anti-PII (ADR-020).

## 6. Corroboración: un reportante distinto = un peso

- `POST /api/reportes/{id}/corroboracion` (vecino autenticado): sello `reporte.corroborado` con hash determinista del par (usuario, reporte) → re-corroborar es **idempotente** (200, sin nuevo peso).
- El autor no corrobora su propio reporte (400). Reporte cerrado (resolved|descartado) no admite corroboración (409).
- **La comunidad corrobora, NUNCA verifica (R15):** la promoción a `verified` es solo técnica (organismo, estudio, inspección). Los puntos comunitarios quedan `community_validated`.

## 7. Clusters: convergencia sin fusión

- Regla: **mismo dominio + misma categoría**, radio ~500 m (`AMC_CLUSTER_RADIO_M`), ventana 90 días (`AMC_CLUSTER_VENTANA_DIAS`) sobre `COALESCE(observado_en, created_at)` — la planilla diferida pesa por SU fecha.
- **Un reportante distinto = un peso:** web pesa por pseudónimo, papel/whatsapp por alias comunitario; el hash del mediador que carga NUNCA pesa por vecino. Las corroboraciones selladas suman peso.
- **2+ reportantes** → punto crítico `community_validated` en la capa `punto_critico` (VIG-010): título «N reportes de M vecinos», fecha de la última observación — **NUNCA un puntaje** (R5).
- Los reportes NUNCA se fusionan: el cluster es una lectura derivada (`cluster_key` en cada reporte); cada reclamo conserva su autor, su canal y su historial.
- **Caducidad: 12 meses** sin nueva corroboración → el punto queda solo con su fecha visible para moderación (no se borra: es registro).
- Sello `cluster.creado` SOLO en la creación del punto (una creación, un evento — R4); las re-derivaciones actualizan conteos sin sello nuevo.

## 8. Verificación y patrimonio

- `verified` es SOLO técnico (R15): exige organismo, estudio o inspección — nunca community_validated se presenta como verificado.
- Patrimonio (dominio PATRIMONIO): el reporte NO carga la ficha — enlaza al activo VIG-002; los activos con visibilidad `restricted` se ven en modo restringido (ADR-036) y la ficha sensible no expone `sensible`/ `sensible_nota`.

## 9. Evidencia y trazas

- Suite E2E: `apps/api/src/vig011-amc-rutas.test.ts` (7 tests: mediador/aval, alta web AMC, convergencia 2 vecinos, corroboración idempotente, papel por alias, ventana 90 días, validaciones 400).
- Sellos nuevos sin PII: `reporte.corroborado`, `cluster.creado`, `mediador.registrado` (`reporte.recibido` extendido con contexto AMC).
- Migración: `20261106080000_vig011_amc_reportes` (11 columnas en `reportes` + tabla `mediadores` + índices). OpenAPI v7.35.0 (55 paths).
