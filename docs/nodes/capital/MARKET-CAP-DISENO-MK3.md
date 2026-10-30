# MARKET-CAP — Diseño técnico MK-3 (observabilidad del mercado: KPIs + RAG + ofertas con precio/vigencia)

> **Propuesta técnica ratificada por la DH (R9, 2026-10-30, pregunta directa — 4 decisiones D1–D4).** Continúa la serie MARKET-CAP: MK-0 (PR #244), MK-1 completo (#246–#250) y MK-2 completo (#254 → #280 → #281) están en cola esperando CI verde (~01-11-2026, R15). Este documento ancla MK-3 contra **lo REAL**: `main @ 77500be` (verificación en vivo 2026-10-30: `packages/db/src/kpi.ts` 7.063 B, `packages/db/src/rag.ts` 9.504 B, `packages/db/prisma/schema.prisma` 28.274 B, `apps/api/src/routes/productos.ts` 11.454 B, `apps/worker/src/{kpi,rag}.ts`) y contra los contratos de MK-1/MK-2 en ramas apiladas. NADA IMPLEMENTADO; las 4 decisiones del §8 fueron RATIFICADAS por la DH el 2026-10-30. Issue: #243 (sub-épica #152).

---

## 1. Contraste contra lo real (R4/R12) — hallazgos que moldean el diseño

1. **H1 — las claves KPI son `String` y el upsert es idempotente.** `kpi_snapshots.kpi_key` es String (no enum SQL) y `recomputeKpisForNode` hace upsert por `(nodo_key, kpi_key)` re-derivando desde el dominio, nunca incrementos. → Las 6 claves nuevas del mercado NO requieren migración: solo extender `KPI_KEYS` (packages/db) y `KpiKeySchema` (contracts), 9 → 15 claves.
2. **H2 — `valor` ya soporta el null honesto.** `kpi_snapshots.valor` es `Float?` y `cobertura_geometrica` ya se materializa como null (R15). → `comercios_habilitacion_verificada_pct` y `titularidad_verificada_pct` con 0 comercios se materializan como null sin tocar el esquema.
3. **H3 — el worker NO se toca.** Los consumidores `apps/worker/src/kpi.ts` (grupo `vig003-kpi`) y `apps/worker/src/rag.ts` (grupo `vig006-rag-index`) disparan el recompute por `payload.nodo_key` verificado contra `events_raw`. → MK-3 extiende SOLO `recomputeKpisForNode` y `recomputeRagIndexForNode` en `packages/db`: cero cambios en el worker, cero dependencias nuevas.
4. **H4 — los sellos `comercio.*` ya declaran `nodo_key`.** Los 7 sellos de MK-1+MK-2 (`ingestado`, `estado_cambiado`, `titularidad_reclamada|verificada|desistida`, `habilitacion_actualizada`, `atributos_editados`) llevan `nodo_key` en el payload. → Todo cambio del mercado ya dispara el recompute de KPIs y RAG del nodo: los disparadores son gratuitos.
5. **H5 — `rag_index.source_type` es String; el enum vive en dos lugares TS.** El enum real es `RagSourceTypeSchema` (contracts) + `RAG_SOURCE_TYPES` (packages/db/src/rag.ts), hoy `['subnodo','activo','kpi']`. → Extender con `'comercio'` son 2 toques TS, cero migración. La columna generada `search` (`to_tsvector('spanish', texto)` + GIN) indexa la prosa nueva sola.
6. **H6 — el delete lógico del RAG es por source_type.** `recomputeRagIndexForNode` borra fragmentos que dejaron de calificar con 3 `deleteMany` (subnodo, activo, kpi). → MK-3 agrega el 4º para `'comercio'`: un comercio que pasa a `restricted` o `rechazado` retira su fragmento.
7. **H7 — `productos` YA es la tabla de ofertas (VIG-005).** 1:N con activos, slug único por activo, `estado` propuesto→aprobado|rechazado|archivado con moderación, `procedencia` ADR-035, `created_by_hash` pseudónimo, anti-PII en la ruta. → Las ofertas del mercado REUTILIZAN `productos` (MK-0 §1.3): extensión con 3 columnas opcionales, NUNCA tabla paralela. 1 migración versionada.
8. **H8 — errata de disparo hallada en vivo: `producto.estado_cambiado` NO declara `nodo_key`.** Verificado en `routes/productos.ts` de main: `producto.propuesto` sí lo lleva (L135) pero el sello de cambio de estado no (L210). Hoy una aprobación de producto NO dispara recompute de KPIs del nodo (el consumer descarta sin `nodo_key`). → MK-3 lo corrige ADITIVAMENTE: el payload de `producto.estado_cambiado` agrega `nodo_key` + `subnodo_key` (el payload es código, no contrato público; los consumers ya leen `payload.nodo_key`).
9. **H9 — NO existe `PATCH` de producto.** La superficie VIG-005 es `POST /activos/:id/productos` + `PATCH /productos/:id/estado` (solo moderador|admin). → El titular verificado no puede corregir precio/vigencia: MK-3 agrega `PATCH /api/productos/:productoId` con el patrón MK-2 (403 sin eco, ADR-038, sello + rollback).

## 2. KPIs del mercado (6 claves nuevas — set v2 del mercado; DH D2)

Extensión de `recomputeKpisForNode`: `KPI_KEYS` pasa de 9 a 15. SOLO agregados sin PII (Ley 25.326); `restricted` excluido de TODO cálculo (ADR-036 — mismo WHERE que las 9 vivas). Join canónico: `activos a JOIN comercio_ficha f ON f.activo_id = a.id` (la ficha MK-1 es la frontera del dominio mercado).

| Clave | valor | detalles | Cálculo (re-derivado, nunca incremental) |
|---|---|---|---|
| `comercios_por_estado` | suma | `{estado: n}` | `GROUP BY a.estado` con `a.nodo_key = X AND a.visibilidad <> 'restricted'` |
| `comercios_por_rubro` | suma | `{rubro_id: n}` | `GROUP BY f.rubro_id` (rubro desconocido degrada a `unknown` honesto, R15) |
| `comercios_por_subnodo` | suma | `{subnodo_key: n}` | `GROUP BY a.subnodo_key` (null → `_sin_subnodo`, patrón `_sin_distrito` de kpi.ts) |
| `comercios_habilitacion_verificada_pct` | pct 0–100 \| **null** | `{verificadas, total}` | `habilitacion->>'estado' = 'verificada'`; **null honesto si total = 0 (R15, DH D2)** |
| `titularidad_verificada_pct` | pct 0–100 \| **null** | `{verificadas, total}` | `titularidad->>'estado' = 'verificada'`; idem null con 0 |
| `ofertas_activas` | count | `{}` | `productos p JOIN activos a JOIN comercio_ficha f`: `p.estado = 'aprobado'` AND visibilidad no restricted AND vigencia válida (sin vigencia = siempre activa; `vigencia_desde <= hoy <= vigencia_hasta`) |

Publicación gratuita: `GET /api/nodos/:key/kpis` (VIG-003) lee `kpi_snapshots` del nodo — las 6 claves nuevas quedan públicas SIN tocar la ruta.

## 3. RAG de comercios (F-9; DH D3 — ficha pública + atributos)

Extensión de `recomputeRagIndexForNode`: `RAG_SOURCE_TYPES`/`RagSourceTypeSchema` agregan `'comercio'`.

- **Guard de selección (idéntico al GET público de MK-1, H3 del MK-2):** `estado = 'aprobado' AND visibilidad <> 'restricted'`. Lo que no es visible tampoco se indexa.
- **Fragmento:** `source_type: 'comercio'`, `source_id: activo_id`, `subnodo_key`, prosa: título — comercio del nodo X (rubro, subnodo). Habilitación: <estado epistémico de los 5>. Atributos: venta directa / delivery / pagos / accesibilidad. + `descripcion` del activo si existe (ya sanitizada por anti-PII en el alta MK-1). **NUNCA**: contacto (no existe en v1 — relay por plataforma), `identificador_hash` ni `reclamado_por_hash` (Ley 25.326, DH MK-2 §7.2), consentimiento, restricted.
- **Fuentes ADR-035:** `[{fuente: 'Mercado de Proximidad — comercio_ficha (MK-1/MK-2)'}]` + si la habilitación es `verificada`, su `fuente_key` (trazabilidad SIIC).
- **KPIs nuevos en el RAG vía `source_type: 'kpi'`**: agregar las 6 entradas a `KPI_TEXTO` — el flujo vigente los indexa solo.
- **Delete lógico:** 4º `deleteMany` para `'comercio'` (H6).
- La consulta `POST /api/nodos/:key/ask` (VIG-006) recupera los fragmentos `comercio` sin tocar la ruta — el mercado entra al RAG territorial ético solo por existir.

## 4. Ofertas con precio/vigencia (DH D1 + D4)

### 4.1 Modelo (extensión de `productos`, patrón VIG-002 — NUNCA tabla paralela)

```prisma
  // ─── MARKET-CAP MK-3 (#243): oferta económica del producto ───
  precio_centavos Int?     @map("precio_centavos") // ARS en centavos, entero — JAMÁS float (DH D4); null = sin_dato (R15)
  vigencia_desde   String? @map("vigencia_desde")   // YYYY-MM-DD; null = sin vigencia declarada
  vigencia_hasta   String? @map("vigencia_hasta")   // YYYY-MM-DD; refine: hasta >= desde
```

1 migración versionada (3 columnas nullable — los productos existentes quedan intactos: null = sin_dato honesto, R15).

### 4.2 Contratos (contracts)

- `ProductoAltaSchema` += `precio_centavos: z.number().int().min(1).max(9_999_999).optional()` (≤ ARS 99.999,99 — techo declarativo, no ranking) + `vigencia_desde/vigencia_hasta` opcionales `YYYY-MM-DD` con refine `hasta >= desde`. Backward compatible (`.strict()` con opcionales).
- **Nuevo** `ProductoEdicionSchema`: campos opcionales (precio/vigencia) + `justificacion: z.string().min(10, 'ADR-038: justificación pública obligatoria')` — el precio es un atributo económico público: su cambio es un cambio epistémico público (mismo criterio ratificado MK-2 §7.3).
- `ProductoSchema` público += los 3 opcionales (salida validada).

### 4.3 Superficie API

- `POST /api/activos/:id/productos` (VIG-005, existente): acepta los campos opcionales — el alta NO cambia de firma.
- **Nueva** `PATCH /api/productos/:productoId` — titular verificado del activo (patrón MK-2: `titularidad.estado === 'verificada' && reclamado_por_hash === seudonimo(usuario.id)`) o moderador|admin; resto → **403 sin eco**; justificación ADR-038 con anti-PII; **409 si el payload no cambia nada** (deuda menor consistente con MK-2 §9.9); sello `producto.atributos_editados` con rollback si falla (R4/R15); activo `restricted` → 404 sin eco (ADR-036).
- `producto.estado_cambiado` += `nodo_key` + `subnodo_key` en el payload (H8 — corrección aditiva del disparo).
- **SIN comparativa de precios en v1 (DH D4):** ningún endpoint ordena ni agrega por precio. El precio es dato declarativo de la oferta, no un ranking — v1 no compite por precio (coherente con v1 sin pagos, MK-5 fase 2).

### 4.4 Sello nuevo (extensión mínima documentada)

| Sello | Payload (sin PII) | Dispara |
|---|---|---|
| `producto.atributos_editados` | `{producto_id, activo_id, nodo_key, subnodo_key, slug, precio_centavos_anterior, precio_centavos_nuevo, vigencia_cambiada, justificacion, editado_por_hash}` | recompute KPIs (`ofertas_activas`) + RAG del nodo |

## 5. Suite E2E MK-3 (10 tests, contra PostGIS/Redis reales — scaffolding verbatim `comercios-rutas.test.ts` #248 + `productos`)

1. Alta + aprobación de 2 comercios con habilitaciones/titularidades → `recomputeKpisForNode` escribe las 6 claves nuevas; `comercios_por_estado/por_rubro/por_subnodo` con desglose correcto.
2. Nodo con 0 comercios → ambos pct `null` (R15) y `ofertas_activas` 0.
3. `restricted` excluido de los 6 KPIs (ADR-036).
4. RAG: fragmento `comercio` con título, rubro, habilitación epistémica y los 4 atributos (DH D3); assert de tokens prohibidos (`identificador_hash`, `reclamado_por_hash`, email/teléfono) — JAMÁS en `texto` ni `fuentes`.
5. RAG delete lógico: comercio aprobado pasa a `restricted` → fragmento retirado.
6. `POST /api/nodos/:key/ask` recupera el fragmento `comercio` (participación F-9, sin tocar la ruta).
7. Alta de producto con `precio_centavos` 12345 + vigencia válida → 201; float/negativo → 400; `vigencia_hasta < vigencia_desde` → 400 (refine).
8. `PATCH /api/productos/:id` por titular verificado → 200 + sello `producto.atributos_editados`; no titular → 403 sin eco; sello forzado a fallar (trigger efímero) → rollback, precio anterior conservado (R4/R15).
9. Aprobación de producto (estado_cambiado CON `nodo_key`, H8) → el consumer `vig003-kpi` re-computa y `ofertas_activas` refleja la oferta — el disparo H8 queda acreditado E2E.
10. `GET /api/activos/:id/productos` expone precio/vigencia validados por `ProductoSchema` (null honesto para productos existentes).

## 6. Frontend

Sin UI nueva obligatoria en MK-3: los 6 KPIs se publican solos por `GET /api/nodos/:key/kpis` y los fragmentos `comercio` participan del `ask` sin tocar rutas. Tarjetas de KPIs del mercado en `ComerciosPanel` y el listado de ofertas con precio quedan como integración del artefacto A2 (R4 #273, desbloqueado tras merge de MK-1 por decisión DH 2026-10-29) — NADA de MK-3 depende de esa UI.

## 7. Regla documental R9 (mismo PR que la implementación)

- openapi: `PATCH /api/productos/{id}` (paths +1) con matriz 400 contrato/justificación < 10, 401, 403 sin eco, 404 sin eco, 409 sin cambios, 500 sanitizado, 503 fail-closed; la versión se asigna al momento de ejecución según el registro (v7.26.0 reservada VIG-009 #253, v7.27.0 tomada por MK-2 #281 → MK-3 docs toma la siguiente libre).
- `ARCHITECTURE_STATE_v7.1.md` + `README.md` actualizados en el MISMO PR.

## 8. Decisiones DH (RATIFICADAS 2026-10-30, pregunta directa — conversación DH, traza a registrar en #243)

1. **Alcance — RATIFICADO: completo** — KPIs del mercado + RAG de comercios (F-9) + ofertas con precio/vigencia (como MK-0 §2.6).
2. **Set de KPIs — RATIFICADO: las 6 claves tal cual** (`comercios_por_estado`, `por_rubro`, `por_subnodo`, `habilitacion_verificada_pct`, `titularidad_verificada_pct`, `ofertas_activas`), con pct **null honesto si 0 comercios (R15)**.
3. **RAG — RATIFICADO: ficha pública + atributos** (título, rubro, subnodo, estado epistémico de habilitación, venta_directa, delivery, pagos, accesibilidad).
4. **Precio — RATIFICADO: entero en centavos AR, opcional, sin comparativa de precios en v1.**

## 9. Plan de ejecución MK-3 (tras la cascada MK-1 → MK-2, CI verde — R15)

Rama `feat/market-cap-mk3-ofertas` (base = main post-cascada con #246–#250 y #254/#280/#281 mergeados):
1. contracts: `KPI_KEYS`+6 · `RagSourceTypeSchema`+'comercio' · `ProductoAltaSchema`/`ProductoSchema` extendidos · `ProductoEdicionSchema` nuevo.
2. db: migración `productos` +3 columnas · `kpi.ts` +6 computos · `rag.ts` +source_type comercio + delete lógico.
3. api: `PATCH /api/productos/:id` + `nodo_key` en `producto.estado_cambiado` (H8).
4. Suite E2E §5 (10 tests).
5. Regla documental R9 (§7).
6. EV a numerar según tabla F0-C1 (#260) al volver CI; PR con labels `market-cap-mk3` + `r9-ratificado`; merge SOLO tras MK-1+MK-2 y CI verde.

## 10. Erratas, reversibilidad y trazas

- **Errata H8 (hallada y corregida por este diseño):** `producto.estado_cambiado` no declaraba `nodo_key` — el recompute de KPIs no disparaba con aprobaciones de producto. Corrección aditiva en §4.3; acreditada E2E en el test 9.
- **Reversibilidad:** MK-3 es aditivo (6 KPIs, 1 source_type, 3 columnas, 1 ruta, 1 sello, 1 payload extendido). Revertir = retirar el PR; los sellos de `events_raw` son append-only y quedan como historia (ADR-032); los snapshots de claves retiradas dejan de re-escribirse (el upsert es por clave — claves huérfanas se limpian solo si algún día hace falta, documentado, no implementado).
- **Deuda menor:** el 409 de `PATCH /api/productos/:id` por payload sin cambios sigue el patrón de MK-2 §9.9 (consistencia, no figura en la superficie VIG-005 original).
- **Trazas DH:** ratificación D1–D4 en conversación directa con la DH 2026-10-30 (este documento); propuesta y ratificación a registrarse en #243.

---

*[agent: vibe] — 2026-10-30 — diseño técnico MK-3 (observabilidad: KPIs del mercado + RAG F-9 + ofertas con precio/vigencia). Ratificado 4/4 (D1–D4, pregunta directa). Contraste en vivo contra main @ 77500be (kpi.ts/rag.ts/schema.prisma/productos.ts) + MK-1/MK-2 en ramas. Sin merge sin CI verde (R15). Refs: #243 · #152 · MK-0 (#244) · MK-1 (#246–#250) · MK-2 (#254/#280/#281).*
