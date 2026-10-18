# MARKET-CAP — Diseño técnico MK-2 (confianza: habilitación SIIC + historial público)

> **Propuesta técnica ejecutable — SIN RATIFICAR (R9).** Continúa la serie MARKET-CAP: MK-0 (PR #244) y MK-1 completo (#246 contracts → #247 db → #248 API+E2E → #249 web → #250 docs) están en cola esperando CI verde (~01-11-2026, R15). Este documento ancla MK-2 contra **el MK-1 REAL aterrizado** (verificación en vivo 2026-10-18 sobre `apps/api/src/routes/comercios.ts` del PR #248 y `packages/contracts/src/comercios.ts` del PR #246). NADA IMPLEMENTADO; las 5 decisiones del §7 esperan a la DH. Issue: #243 (sub-issue de la épica #152). Canvas de referencia: `marketplace-nodo-capital`.

---

## 1. Contraste contra el MK-1 real (R4/R12) — qué ya existe, qué falta

1. **Titularidad YA está implementada en MK-1** (no se duplica): reclamo ciudadano → `reclamada`, verificación moderador|admin → `verificada`, identificador hasheado ANTES de persistir (PII por diseño, Ley 25.326), 409 si ya está reclamada/verificada, `reclamado_por_hash` en la ficha habilita la edición (PATCH `/:id` con 403 sin eco para el no-titular). MK-2 NO toca este flujo.
2. **Moderación YA está implementada**: matriz `COMERCIO_TRANSICIONES` sellada en contracts, ADR-038 (justificación ≥ 10), anti-PII sobre la justificación, rollback sin sello.
3. **Cinco sellos `comercio.*` viven ya en `events_raw`**: `comercio.ingestado`, `comercio.estado_cambiado`, `comercio.titularidad_reclamada`, `comercio.titularidad_verificada`, `comercio.atributos_editados` (extensión mínima documentada del MK-0 §2.4). El historial público F-3 se deriva de ellos — cero sellos nuevos salvo el del §4.
4. **FALTA el camino de actualización de la habilitación post-alta**: `ComercioAltaSchema` acepta `habilitacion` con el refine ADR-035, pero `PATCH /:id` solo edita `atributos`. Sin ese camino, una ficha nacida `sin_dato` no puede llegar nunca a `verificada`. MK-2 lo agrega (§2).
5. **FALTA el historial público (F-3)**: el patrón ya existe verbatim en `reportes.ts` (CORE-005 R4: `GET /:id/historial` — transiciones 1:1 de sellos, nunca tabla mutable, 404 sin eco para no publicables, lista vacía honesta R15). MK-2 lo replica para comercios (§3).
6. **`fuente_key` exige catálogo**: `ComercioHabilitacionSchema.fuente_key` referencia `fuentes.key` (ADR-035), pero aún no existe la fuente del registro web SIIC (certificado web ≡ Licencia Comercial, Ley 104-A). Propuesta de seed en §2.3.
7. **Estados independientes**: el estado de la ficha (`activos.estado`) y el estado epistémico de la habilitación (`comercio_ficha.habilitacion.estado`) son ciclos distintos — un comercio `aprobado` puede vivir honestamente con habilitación `sin_dato` (R15) y viceversa. MK-2 no los acopla.

## 2. Habilitación SIIC individual (Ley 104-A — certificado web ≡ Licencia Comercial)

### 2.1 Flujo

El titular verificado (o moderador|admin) presenta la evidencia primaria del certificado web SIIC; el refine ADR-035 del `ComercioHabilitacionSchema` (ya vivo en contracts, #246) exige para `verificada`: `tipo` + `numero` + `fuente_key` + `url` + `fecha_verificacion`; para `silencio_positivo`: `fecha_presentacion` (ley ventanilla única 02-07-2026). El alta ya valida la forma — MK-2 agrega el **camino de actualización** con sello y rollback. Sin padrón bulk (Ley 27.275, pedido formal abierto, no bloqueante): verificación individual por consentimiento del propio comercio (patrón Bloque 9).

### 2.2 `PATCH /api/comercios/:id/habilitacion` (superficie nueva)

| Rol | Comportamiento |
|---|---|
| titular verificado (JWT) | carga/actualiza la habilitación de su ficha; consentimiento del propio comercio implícito (Ley 25.326); sello con rollback |
| moderador\|admin (JWT) | idem, para corrección de moderación |
| resto | 403 sin eco (mismo criterio de `PATCH /:id`: no se revela si existe reclamo ni de quién) |

Reglas: contrato `ComercioHabilitacionCambioSchema` (§2.4, justificación pública ≥ 10 ADR-038 — decisión DH §7.3); anti-PII sobre la justificación antes de sellar; sello `comercio.habilitacion_actualizada` (§4) con rollback si falla (R4/R15); 404 sin eco para ficha inexistente/no publicable; el estado anterior viaja en el sello — de ahí deriva el historial.

### 2.3 Seed de fuente: `fuente_siic_web`

Entrada en el seed de fuentes del PR #216 (catálogo público ADR-035): organismo municipal, URL del registro web, tipo oficial, estado verificado 2026-10-18, **cautela**: la verificación individual NO es padrón bulk — nada de prensa llega a `verified` (ADR-035). Decisión DH §7.4.

### 2.4 Contrato propuesto (verbatim-ready para MK-2)

```ts
export const ComercioHabilitacionCambioSchema = z.object({
  habilitacion: ComercioHabilitacionSchema, // refine ADR-035 ya vivo en contracts (#246)
  justificacion: z.string().min(10, 'ADR-038: justificación pública obligatoria'), // anti-PII en la ruta
}).strict();
```

## 3. Historial público F-3 (`GET /api/comercios/:id/historial`)

Derivado 1:1 de los sellos `comercio.*` en `events_raw` (única fuente de verdad, ADR-032 — el historial es inmutable porque el registro es append-only; NUNCA una tabla mutable), en orden `occurred_at` asc. Patrón verbatim `reportes.ts` R4 (EV-054).

**Lista blanca por sello — `identificador_hash` jamás (Ley 25.326):**

| Sello | Se expone |
|---|---|
| `comercio.ingestado` | fecha del alta (primera entrada del ciclo) |
| `comercio.estado_cambiado` | `estado_anterior`, `estado_nuevo`, `justificacion`, `moderador_hash`, `occurred_at` |
| `comercio.habilitacion_actualizada` (nuevo, §4) | `estado_anterior`, `estado_nuevo`, `fuente_key`, `justificacion`, `actualizado_por_hash`, `occurred_at` |
| `comercio.titularidad_reclamada` | solo `metodo` + fecha (SIN `identificador_hash`, SIN `reclamado_por_hash` — decisión DH §7.2) |
| `comercio.titularidad_verificada` | `metodo`, `verificado_por_hash`, fecha |
| `comercio.atributos_editados` | solo fecha + `titular_hash` (pseudónimo) |

Comportamiento: 404 sin eco si la ficha no existe o no es publicable (`rechazado`/`restricted` — ADR-036); ficha sin transiciones → lista vacía honesta (R15); contrato de salida `ComercioHistorialSchema` en contracts.

## 4. Sello nuevo (extensión mínima documentada del MK-0 §2.4)

| Sello | Payload (sin PII) | Dispara |
|---|---|---|
| `comercio.habilitacion_actualizada` | `{comercio_id, estado_anterior, estado_nuevo, fuente_key, justificacion, actualizado_por_hash}` | historial público F-3 + KPIs (MK-3) |

## 5. Suite E2E MK-2 (8 tests, contra PostGIS/Redis reales — scaffolding verbatim `comercios-rutas.test.ts` #248)

1. PATCH habilitación por titular verificado con evidencia completa → 200 + ficha actualizada + sello en `events_raw`.
2. Refine ADR-035: `verificada` sin evidencia primaria completa → 400; `silencio_positivo` sin `fecha_presentacion` → 400.
3. Ciudadano no titular → 403 sin eco; moderador → 200.
4. Rollback: el sello falla → la ficha no cambia (R4/R15).
5. `GET /:id/historial` 1:1 con los sellos en orden asc; ficha recién creada → transiciones vacías (R15).
6. Historial de ficha `rechazada`/`restricted` → 404 sin eco.
7. El historial JAMÁS expone `identificador_hash` ni `reclamado_por_hash` (assert sobre la salida).
8. Justificación con PII → 400 sin eco, sin sello, sin persistencia (ADR-020 cond. 1).

## 6. Frontend MK-2 (contrato DataSource ADR-029)

- `ApiDataSource.getComercioHistorial(id)` + paridad `SyntheticDataSource` SIEMPRE etiquetada `[SINTÉTICO]` (R15).
- `ComerciosPanel`: bitácora F-3 con `HonestBadge`/`SourceChip` (inventario mínimo F0) y la habilitación con sus 5 estados epistémicos.
- Integración funcional agent-vibe; estética agent.google (ADR-034, tokens `--honest-*`).

## 7. Decisiones DH abiertas (R9 — antes de implementar MK-2)

1. **Quién carga la habilitación**: (a) solo moderador|admin; (b) titular verificado + moderador|admin **(recomendado: el consentimiento es del propio comercio, Ley 25.326)**; (c) titular con verificación posterior del moderador.
2. **Alcance del historial público**: (a) solo `estado_cambiado` (patrón reportes estricto); (b) ciclo completo — alta + estados + habilitación + titularidad + ediciones **(recomendado: la confianza ES el producto de MK-2; `desistida` aparece como transición sin hash del reclamante)**.
3. **Justificación pública ADR-038 para cambios de habilitación**: (a) sí, siempre ≥ 10 **(recomendado: es un cambio epistémico público)**; (b) solo al pasar a `verificada`.
4. **Seed `fuente_siic_web`** en el catálogo de fuentes (ADR-035): (a) sí, con cautela de verificación individual **(recomendado)**; (b) diferir al PR de implementación.
5. **`titularidad.desistida`** (estado previsto en MK-0 §2.2, sin camino en MK-1): (a) MK-2 agrega la acción desistir del reclamante en `POST /:id/titular` **(recomendado: cierra el ciclo honesto)**; (b) queda para MK-4.

## 8. Plan de ejecución MK-2 (tras el merge de MK-1, CI verde)

Rama `feat/market-cap-mk2-confianza` (base = main post-cascada, con #246–#250 mergeados):
1. contracts: `ComercioHabilitacionCambioSchema` + `ComercioHistorialSchema` (+ acción desistir si se ratifica §7.5) — export en `index.ts`.
2. Ruta `comercios.ts`: `PATCH /:id/habilitacion` + `GET /:id/historial` (+ desistir) montadas.
3. Catálogo de fuentes: `fuente_siic_web` (si se ratifica §7.4).
4. Suite E2E §5 (8 tests).
5. Frontend §6.
6. Regla documental R9 en el mismo PR: openapi v7.26.0 (+2 rutas), ARCHITECTURE_STATE, README.
7. EV a numerar según tabla F0-C1 al volver CI.

---

*[agent: vibe] — 2026-10-18 — diseño técnico MK-2. Propuesta SIN RATIFICAR (R9): las 5 decisiones del §7 esperan a la DH. Sin merge sin CI verde (R15). Refs: #243 · #152 · MK-0 (PR #244) · MK-1 (#246–#250).*
