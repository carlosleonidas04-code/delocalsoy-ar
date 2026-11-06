# VIG-014 — Frontend del módulo «Infraestructura y movilidad» (#380, épica #377)

> **Estado:** mergeado en `main` (VIG-014, registro EV-087). Doc de diseño del 5º y último sub-sprint del módulo NODO-VIG-3.
> **Regla rectora:** ADR-029 — acople por contrato `DataSource`; el contrato crece con métodos opcionales y ambas implementaciones convergen sin romperse. R5 — el error ES error, jamás `[]` silencioso. R15 — anuncio ≠ obra; la comunidad corrobora, NUNCA verifica; en synthetic la demo se declara, jamás se acredita.

## 1. Alcance

Frontend del módulo construido en VIG-010 (vocabulario vial), VIG-011 (AMC), VIG-012 (pedidos a DPV) y VIG-013 (dashboard). **Sin migración, sin tablas, sin cambios de API**: un panel web (`VialidadMovilidadPanel`, sección 6f de `App.tsx`), una lib de dominio (`apps/web/src/lib/vig014.ts`), la extensión del contrato `DataSource` con 7 métodos opcionales y una suite vitest. Patrón NCAP-FE #163 (mismo diseño que la vista del nodo Capital).

## 2. Panel `VialidadMovilidadPanel` — 5 pestañas

### 2.1 Dashboard

- `GET /api/nodos/iglesia/infraestructura-movilidad` (VIG-013): obras con **km null honesto** y cautela anuncio ≠ obra, puntos críticos con el título comunitario «N reportes de M vecinos» y SIN geometría publicada (ADR-036: el dashboard cuenta, no dibuja), paradas **VACÍAS** con cobertura declarada, brechas SOS declaradas (ADR-027) y KPIs con 0 honesto sin corrida del worker.
- `GET /api/pedidos?nodo=iglesia` (VIG-012): tablero «X de 15 presentados · Y respondidos (corte …)» con `estado_efectivo` DERIVADO en lectura (`sin_respuesta` nunca se almacena).

### 2.2 Mapa de capas

- `GET /api/nodos/iglesia/features`: scatter SVG proyectado por bbox (`calcularBboxVig` — con bbox de referencia del Valle DECLARADO ante 0 features), filtro por capa (`obra_vial` / `punto_critico` / `parada_transporte` / `cobertura_sos`).
- Cada feature sintética se etiqueta **«Ilustrativa»** (R15) — el mapa dibuja lo publicado por el nodo, jamás inventa geometría.

### 2.3 Reportar (formulario AMC, VIG-011)

- `POST /api/reportes` con sesión JWT (`sesion.ts` — patrón artefactos A1–A4; en synthetic NO hay sesión: la escritura es demo declarada, R15).
- Dominio → categoría del canon VIG-010 (`AMC_CATEGORIAS_POR_DOMINIO` copiada para visualización con comentario «si la API la extiende, esta copia se actualiza en el mismo PR» — la API valida SIEMPRE, el cliente solo anticipa rechazos obvios).
- Subnodo ancla real (VIG-001), precisión declarada `gps|referencial|aproximado` (R15 — nunca se simula certeza GPS), riesgo inmediato, canal de origen `web|papel|whatsapp|presencial`.
- Consentimiento granular (ADR-027, Ley 25.326): `guarda_alias` opt-in explícito; anonimato explícito por pseudónimo sha256 — en la planilla NUNCA va el nombre.
- Refines del Zod espejados en `validarReporteAmc`: (a) alias ⇒ `guarda_alias=true`; (b) papel|whatsapp ⇒ `mediador_ref`; (c) papel|whatsapp ⇒ `reportado_por`.
- La respuesta muestra `duplicados_sugeridos` (R5/ADR-039), el reintento idempotente (200 = una escritura, un evento — R4) y la **devolución por el canal de origen** (web: su cuenta; papel/whatsapp: el mediador con aval; presencial: asamblea).

### 2.4 Mis reportes (seguimiento)

- `GET /api/reportes/mios` (Bearer): ciclo de vida del propio reporte con cada transición sellada y su justificación pública (ADR-038) — la línea de tiempo ES la acreditación.
- `GET /api/reportes/:id/historial` (público) disponible como consulta de transparencia.
- 0 reportes propios es un dato honesto (R15) — el error es error, jamás `[]` (R5).

### 2.5 Planilla de papel (canal offline)

- Formato oficial v1 imprimible (`window.print()`): dominio, categoría, distrito/paraje, ubicación con precisión declarada, fecha del testimonio, alias con firma de consentimiento y firma del mediador con aval.
- **Modo offline diferido**: el mediador la carga después con `observado_en` (fecha real del testimonio) — el canal papel funciona sin conectividad.

## 3. Contrato `DataSource` (ADR-029)

7 métodos opcionales nuevos en la interfaz, implementados en `ApiDataSource` y con paridad en `SyntheticDataSource`:

| Método | Ruta | R5 |
|---|---|---|
| `listSubnodos(nodoKey)` | `GET /api/nodos/:key/subnodos` | data malformada → error 500 |
| `getInfraestructuraMovilidad(nodoKey)` | `GET /api/nodos/:key/infraestructura-movilidad` | objeto-check: un arreglo en data ES malformado |
| `getFeaturesMapa(nodoKey)` | `GET /api/nodos/:key/features` | data malformada → error 500 |
| `getPedidosTablero(nodoKey)` | `GET /api/pedidos?nodo=` | objeto-check |
| `createReporteAmc(input)` | `POST /api/reportes` (Bearer) | validación espejo → 422 anticipado; 201 creado / 200 idempotente |
| `listMisReportes(token)` | `GET /api/reportes/mios` (Bearer) | data malformada → error 500 |
| `getReporteHistorial(id)` | `GET /api/reportes/:id/historial` | objeto-check |

- **Paridad synthetic**: la demo declara SIEMPRE su origen — subnodos `[SINTÉTICO]`, dashboard con km null / paradas VACÍA / «0 de 15» / 0 KPIs, `createReporteAmc` con devolución demo declarada y nodo ajeno a `iglesia` → `DataSourceHttpError` 404 (sin fallback silencioso). En synthetic NO hay sesión JWT: las escrituras son demo, nunca acreditadas (R15).

## 4. Lib y suite

- `apps/web/src/lib/vig014.ts`: tipos + normalizadores de las formas reales de la API (km null se conserva null, 0 se conserva 0), copia citada del canon AMC, etiquetas en español, `validarReporteAmc` (espejo del Zod con los 3 refines) y `calcularBboxVig`.
- `apps/web/src/lib/vig014.test.ts` (vitest, patrón servicioInformativo): fixtures de las formas reales, validación de los 3 refines y la coherencia dominio→categoría, acople `ApiDataSource` con fetch spy (URLs correctas, Bearer del ciudadano, cuerpo sin token), 404 → `DataSourceHttpError` jamás `[]`, data malformada → error honesto, paridad `[SINTÉTICO]` y bbox del mapa.

## 5. Decisiones registradas

- **Copia citada del canon AMC**: el módulo web copia `AMC_CATEGORIAS_POR_DOMINIO` para visualización (patrón oportunidades.ts) — la coherencia dominio→categoría la valida SIEMPRE la API (400); la copia se actualiza en el mismo PR si el canon cambia.
- **La sesión es la de la plataforma** (`sesion.ts`): login JWT real, token SOLO en localStorage bajo `CLAVE_TOKEN_SESION` (anti-PII, Ley 25.326); en synthetic `quienSoy()` devuelve demo declarada y `puedeEscribir()` es false — el botón de envío queda deshabilitado con explicación (R15).
- **El mapa dibuja lo publicado; el dashboard cuenta**: ADR-036 no se contradice — `features` es la capa pública del nodo (CORE-002) y el scatter etiqueta cada feature sintética «Ilustrativa»; el dashboard VIG-013 sigue SIN publicar lat/lng de puntos críticos.
- **Frontend only**: OpenAPI queda v7.37.0 (59 paths) — el contrato de la API no cambia.

## 6. Trazas

- Issue #380 · épica #377 · patrón NCAP-FE #163 · registro EV-087 en `docs/EVIDENCIA.md`.
- Predecesores: VIG-010 #381 (vocabulario vial), VIG-011 #378 (AMC), VIG-012 #379 (pedidos formales), VIG-013 #382 (dashboard).
- **Con VIG-014 el módulo NODO-VIG-3 queda COMPLETO** (5 sub-sprints) — el cierre de la épica #377 queda elegible, decisión de la DH.
