# MARKET-CAP — Diseño técnico MK-0 (MARKET-CAP-1)

> **Propuesta técnica ejecutable.** Las 4 decisiones centrales fueron ratificadas por la DH (2026-10-17, traza en #243): Opción A (extender dominios vivos), v1 sin pagos, v1 sin estrellas, contacto relay sin exponer PII. Este documento ancla el diseño contra el **esquema real de main @ `77500be`** (verificación en vivo 2026-10-17: `packages/db/prisma/schema.prisma` 28.274 chars, `directoryTaxonomy.ts` de la rama `feat/ncap-r2-contratos-territoriales`). Sin merge sin CI verde (R15); CI caído hasta ~01-11-2026. Documento de diseño — NADA IMPLEMENTADO.

Issue: #243 (sub-issue de la épica #152). Canvas de referencia: `marketplace-nodo-capital`.

---

## 1. Contraste contra el repo real (R4/R12) — hallazgos que moldean el diseño

1. **`activos` ya resuelve la mitad de la ficha**: estado (`propuesto|aprobado|rechazado|archivado`), `visibilidad` (ADR-036), `consentimiento` granular (Json), `procedencia` (Json, ADR-035), `created_by_hash` (pseudónimo), `hash` idempotencia, `subnodo_key`, `is_synthetic`, geom Point NULL-safe. → **`comercio_ficha` NUNCA duplica estos campos**: contiene solo el dominio específico del mercado (patrón `activos_patrimonio` / `activos_operativa`: ficha 1:1 minimalista).
2. **Frontera de habilitación**: `activos_operativa.habilitacion` (Json, HabilitacionSchema de 4 atributos) YA existe para prestadores turísticos (contexto Ley 2400-T, VIG-005). → Regla de dominio: `operativa.habilitacion` = habilitación del prestador turístico; `comercio_ficha.habilitacion` = **habilitación comercial** (municipal / Ley 104-A / silencio positivo ley 02-07-2026). Regímenes legales distintos, fuentes distintas — comentario en ambos schemas para evitar doble dominio (lección #161).
3. **`productos` (VIG-005, 1:N) es la tabla de ofertas**: slug único por activo, nombre, categoria libre, temporada_meses, estado con moderación, procedencia, pseudónimo. → Las ofertas del marketplace **reutilizan `productos`**; MK-3 agrega columnas opcionales (`precio`, `vigencia_desde`, `vigencia_hasta`) por extensión (patrón VIG-002), nunca tabla paralela.
4. **Divergencia de catálogo de rubros (decisión DH)**: `directoryTaxonomy.ts` (rama #233) declara `TAXONOMIA_CANONICA` con **4 categorías** (`cat-almacen-barrial`, `cat-gastronomia-regional`, `cat-espacio-civico`, `cat-taller-oficio`) sobre 7 ramas taxonómicas; el fixture del lote 3A (`capitalTerritoryData.ts`) declara **11 categorías**. → El diseño asume: **rubro = join por `idCategoria` (código)**, catálogo extensible; los 4 códigos vivos son semilla válida; agregar categorías no rompe nada (código desconocido degrada a `unknown` honesto en facetas, R15).
5. **`rag_index.source_type`** hoy es enum `subnodo|activo|kpi` → el índice RAG de mercado (F-9) requiere extender `RagSourceTypeSchema` con `comercio` (MK-3, contrato vivo R9).
6. **`kpi_snapshots`** PK compuesta `(nodo_key, kpi_key)` → los KPIs del mercado son **claves nuevas, cero migración**: solo ampliar el recompute del consumidor `vig003-kpi` (patrón VIG-003).
7. **`usuarios.rol`** hoy: `ciudadano|moderador|admin` → el reclamo de titularidad NO crea rol nuevo en v1: se modela como estado `titularidad` en la ficha con verificación por moderador|admin. (El rol `comerciante` de la tabla de rate limits pertenece a la lógica live-ws del lote-2, no a `usuarios` — documentado para no confundir dominios.)
8. **Orden de integración con la serie contracts NCAP-R2**: el `index.ts` de main (inline, 76 bindings) está siendo extendido por PR #233 (en cola). El módulo `comercios.ts` de contracts entra en **MK-1 después de que #233 mergee** — evitar tocar `index.ts` desde MK-0 para no crear superficie de conflicto en la cascada.

---

## 2. Modelo de datos (verbatim-ready para MK-1)

### 2.1 `comercio_ficha` (nueva tabla, 1:1 con `activos`)

```prisma
// ─── MARKET-CAP MK-1 (#243): ficha de mercado del comercio ───
/// Ficha de mercado 1:1 con activos (patrón activos_patrimonio/activos_operativa,
/// Opción A ratificada por la DH 2026-10-17): SOLO el dominio específico del
/// mercado. Estado, visibilidad, consentimiento, procedencia, pseudónimo y
/// geometría viven en `activos` (no se duplican — lección #161). SIN PII de
/// contacto en v1 (decisión DH: relay por plataforma, Ley 25.326 minimización).
/// Frontera de dominio: la habilitación COMERCIAL vive aquí; la habilitación
/// del prestador turístico (Ley 2400-T) vive en activos_operativa.habilitacion.
model comercio_ficha {
  activo_id    String   @id @map("activo_id")
  rubro_id     String   @map("rubro_id") // join por código → directoryTaxonomy.idCategoria (ADR-035)
  rubro_rama   String?  @map("rubro_rama") // RamaTaxonomica — desnormalización de facetas
  atributos    Json     @map("atributos") // ComercioAtributosSchema (delivery, pagos, accesibilidad, venta_directa)
  habilitacion Json     @map("habilitacion") // ComercioHabilitacionSchema (estados epistémicos)
  titularidad  Json     @map("titularidad") // ComercioTitularidadSchema (reclamo/verificación — sin PII)
  created_at   DateTime @default(now()) @map("created_at")
  updated_at   DateTime @updatedAt @map("updated_at")

  activo activos @relation(fields: [activo_id], references: [id], onDelete: Cascade)

  @@index([rubro_id])
  @@map("comercio_ficha")
}
```

Reglas de la tabla:
- La ficha SOLO existe si el activo es `tipo: local | prestador` (validado en la ruta, create anidado atómico — patrón VIG-002).
- **Cero columnas de contacto en v1**: relay por plataforma; el contacto directo con consentimiento es decisión MK-4 (backend de bandejas).
- SIN geom: hereda del activo (criterio estructural #149/#158).

### 2.2 Estados (matriz sellada en contracts, patrón CORE-005 R1)

**Ficha** — reutiliza los estados de `activos` (no crea enum nuevo): `propuesto → aprobado | rechazado` (+ `archivado`; `rechazado` nunca público). Matriz `COMERCIO_TRANSICIONES`:
`propuesto→aprobado`, `propuesto→rechazado`, `aprobado→rechazado`, `aprobado→archivado`, `rechazado→propuesto` (revisión), `archivado→propuesto`. Todo cambio con justificación pública ≥10 chars (ADR-038).

**Habilitación** (epistémico, independiente del estado de ficha — vive en `habilitacion` Json):
`verificada | en_tramite | silencio_positivo | unknown | sin_dato`
- `verificada` exige (refine Zod): `numero` + `tipo` (`municipal | provincial_104a`) + `fuente_key` + `url` + `fecha_verificacion` — evidencia primaria, ADR-035. Nunca por prensa ni por Google (ADR-037).
- `silencio_positivo` exige `fecha_presentacion` (30 días hábiles desde la ley 02-07-2026) y es estado legal verificable con fuente normativa (número de ley: pedido formal PED-CAP abierto).
- `sin_dato` ≠ clandestino (caso Parque de Mayo): microcopia honesta con camino al Registro Único Municipal de Artesanos.

**Titularidad** (vive en `titularidad` Json):
`sin_reclamo → reclamada → verificada` (+ `desistida`). Método de verificación v1: `expediente | cuit` — presentado por el titular, verificado por moderador|admin (el número vive como hash en el sello, jamás en claro — Ley 25.326). Sello `comercio.titularidad_verificada` con `verificado_por_hash`. Solo titularidad `verificada` habilita la edición por el titular (operativa, ofertas).

### 2.3 Contratos Zod (propuesta verbatim para MK-1 — `packages/contracts/src/comercios.ts`)

```ts
export const ComercioHabilitacionEstadoSchema = z.enum([
  'verificada', 'en_tramite', 'silencio_positivo', 'unknown', 'sin_dato'
]);

export const ComercioHabilitacionSchema = z.object({
  estado: ComercioHabilitacionEstadoSchema,
  tipo: z.enum(['municipal', 'provincial_104a']).optional(),
  numero: z.string().max(60).optional(), // expediente/número de habilitación
  fuente_key: z.string().regex(/^[a-z0-9_]+$/).optional(), // → fuentes.key
  url: z.string().url().optional(),
  fecha_verificacion: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  fecha_presentacion: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // silencio positivo
}).superRefine((h, ctx) => {
  if (h.estado === 'verificada') {
    // ADR-035: verificada SOLO con evidencia primaria completa
    for (const campo of ['tipo', 'numero', 'fuente_key', 'url', 'fecha_verificacion'] as const) {
      if (!h[campo]) ctx.addIssue({ code: 'custom', message: 'ADR-035: habilitacion verificada exige evidencia primaria completa', path: [campo] });
    }
  }
  if (h.estado === 'silencio_positivo' && !h.fecha_presentacion) {
    ctx.addIssue({ code: 'custom', message: 'silencio_positivo exige fecha_presentacion (ley 02-07-2026)', path: ['fecha_presentacion'] });
  }
});

export const ComercioAtributosSchema = z.object({
  venta_directa: z.boolean().default(false),
  delivery: z.boolean().default(false),
  pagos: z.array(z.enum(['efectivo', 'qr', 'debito', 'credito'])).default([]),
  accesibilidad: z.enum(['verificada', 'declarada', 'unknown']).default('unknown'),
  feria_espacio_publico: z.string().regex(/^[a-z0-9_]+$/).optional(), // → feature public_space
}).strict();

export const ComercioTitularidadSchema = z.object({
  estado: z.enum(['sin_reclamo', 'reclamada', 'verificada', 'desistida']).default('sin_reclamo'),
  metodo: z.enum(['expediente', 'cuit']).optional(),
  verificado_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// Alta: crea activo (tipo local|prestador) + ficha en una transacción atómica.
// El consentimiento granular viaja en activos.consentimiento (VIG-002) — NO se duplica.
export const ComercioAltaSchema = z.object({
  nodo_key: z.enum(['capital', 'caucete', 'iglesia']), // multinodo desde día 1 (principio 5)
  subnodo_key: z.string().regex(/^[a-z0-9_]+$/).optional(),
  titulo: z.string().min(3).max(120),
  descripcion: z.string().max(2000).optional(), // anti-PII en la ruta antes de persistir
  rubro_id: z.string().regex(/^cat-[a-z0-9-]+$/), // join por código, nunca por nombre
  tipo: z.enum(['local', 'prestador']),
  lat: z.number().min(-90).max(90).optional(), // R15: punto propio solo con fuente
  lng: z.number().min(-180).max(180).optional(),
  atributos: ComercioAtributosSchema.default({ venta_directa: false, delivery: false, pagos: [], accesibilidad: 'unknown' }),
  habilitacion: ComercioHabilitacionSchema.default({ estado: 'sin_dato' }),
});

export const COMERCIO_TRANSICIONES: Record<string, string[]> = {
  propuesto: ['aprobado', 'rechazado'],
  aprobado: ['rechazado', 'archivado'],
  rechazado: ['propuesto'],
  archivado: ['propuesto'],
};

export const ComercioEstadoCambioSchema = z.object({
  estado: z.enum(['propuesto', 'aprobado', 'rechazado', 'archivado']),
  justificacion: z.string().min(10, 'ADR-038: justificación pública obligatoria'), // anti-PII en la ruta
});

export const ComercioReclamoTitularSchema = z.object({
  metodo: z.enum(['expediente', 'cuit']),
  identificador: z.string().min(4).max(60), // se persiste SOLO como hash (Ley 25.326)
  declaracion_consentimiento: z.literal(true), // nunca pre-marcado (ADR-027)
});

export const ComercioFichaPublicaSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  rubro: z.object({ id: z.string(), rama: z.string().nullable(), label: z.string().nullable() }),
  estado: z.string(),
  habilitacion: ComercioHabilitacionSchema,
  titularidad: ComercioTitularidadSchema,
  atributos: ComercioAtributosSchema,
  subnodo_key: z.string().nullable(),
  // fuente epistémica del sello visible (4 estados honestos — UI F-3)
  estado_epistemico: z.enum(['verified', 'community_validated', 'pending', 'synthetic_demo']),
});
```

Nota de vocabulario: `estado_epistemico` mapea la ficha a los 4 estados honestos de UI: habilitación `verificada` ⇒ `verified`; titularidad `verificada` sin habilitación primaria ⇒ `community_validated`; `propuesto` ⇒ `pending`; `is_synthetic` ⇒ `synthetic_demo` (R15, tokens `--honest-*`).

### 2.4 Sellos (`events_raw`, append-only + hash idempotente + rollback)

| Sello | Payload (sin PII) | Dispara |
|---|---|---|
| `comercio.ingestado` | `{comercio_id, nodo_key, subnodo_key, rubro_id}` | proyección worker + KPIs + RAG (MK-3) |
| `comercio.estado_cambiado` | `{comercio_id, estado_anterior, estado_nuevo, justificacion, moderador_hash}` | historial público 1:1 (ADR-038) |
| `comercio.titularidad_verificada` | `{comercio_id, metodo, verificado_por_hash}` | habilita edición del titular |
| `oferta.*` | reutiliza `producto.propuesto` / `producto.estado_cambiado` (VIG-005) | — |

### 2.5 Superficie API (regla documental R9 en el mismo PR de MK-1)

| Endpoint | Rol | Comportamiento |
|---|---|---|
| `POST /api/comercios` | ciudadano (JWT) | create anidado atómico activo+ficha (patrón VIG-002), estado `propuesto`, sello + rollback, anti-PII, 404 nodo / 400 rubro código inválido (join por código) |
| `GET /api/comercios` | público | solo `aprobado` + `public`; facetas `?rubro= &subnodo= &habilitacion= &nodo= &bbox=`; restricted excluido (ADR-036) |
| `GET /api/comercios/:id` | público | ficha + operativa + productos publicados + estados honestos; `rechazado`/`restricted` → 404 sin eco |
| `PATCH /api/comercios/:id/estado` | moderador\|admin | justificación ≥10 (ADR-038), 400 salto inválido / 409 sin transición (patrón CORE-005 R3) |
| `POST /api/comercios/:id/titular` | ciudadano (JWT) | reclamo → `reclamada`; verificación → `verificada` (moderador\|admin) |
| `PATCH /api/comercios/:id` | titular verificado | atributos + operativa con sello; 403 si no titular |

### 2.6 KPIs del mercado (claves nuevas en `kpi_snapshots` — patrón VIG-003, cero migración)

`comercios_por_estado` · `comercios_por_rubro` · `comercios_habilitacion_verificada_pct` (null honesto con 0 comercios, R15) · `ofertas_activas` · `comercios_por_subnodo` · `titularidad_verificada_pct`. Recompute idempotente del consumidor `vig003-kpi` ampliado; restricted excluido (ADR-036).

### 2.7 Suite E2E `comercios-rutas.test.ts` (MK-1, contra PostGIS/Redis reales)

1. POST crea activo+ficha atómico (201, `propuesto`, sello `comercio.ingestado` en `events_raw`).
2. Idempotencia por hash del alta.
3. GET público excluye `propuestos`, `rechazados` y `restricted`.
4. Facetas rubro/subnodo/habilitación/nodo.
5. PATCH moderador: justificación ausente → 400; vacía/corta → 400 ADR-038; salto inválido → 400; sin transición → 409 (patrón R3).
6. Historial público 1:1 con sellos `comercio.estado_cambiado`.
7. Reclamo de titularidad → verificada → PATCH por titular OK; no-titular → 403.
8. Refine ADR-035: habilitación `verificada` sin evidencia primaria completa → 400.
9. Anti-PII: descripción/justificación con email/teléfono se sanitiza antes de persistir.
10. Rubro código desconocido → degrada a `unknown` honesto en facetas (R15), no rompe la lectura.
11. 404 nodo inexistente; 404 sin eco en ficha `rechazada`.
12. Re-seed idempotente (seed siembra **0 comercios** — patrón VIG-005 "solo se publica lo verificado"; la paridad demo vive en `SyntheticDataSource` marcada `[SINTÉTICO]`).

---

## 3. Frontend MK-1 (contrato DataSource ADR-029)

- `ApiDataSource` extiende `listComercios(filtros)` / `getComercio(id)` contra `/api/comercios`; `SyntheticDataSource` con paridad SIEMPRE etiquetada sintética (R15).
- Vista `ComerciosPanel`: fichas con `HonestBadge`/`SourceChip`/`TerritorialCard` (inventario mínimo F0), facetas F-1, mapa F-2, alta F-4.
- Convergencia stage #215/#237: los componentes Lente B (`stageCapital215Data.ts`, `StageCapital215Dashboard.tsx` — rama #238) migran a consumir estos contratos cuando integren.
- Formularios con `react-hook-form` + `zodResolver` sobre `ComercioAltaSchema` (FE-3 — decisión de dependencia DH pendiente).

---

## 4. Nutrición y normativa (ya verificadas — ver turno 16, traza #215 issuecomment-6242463156)

Ley 104-A + SIIC (verificación individual) · ley ventanilla única 02-07-2026 (silencio positivo) · Ley 799-C (usados) · Registro Único Municipal de Artesanos · CCCA 2022 · vacancia microcentro (Colegio Corredores 16-05-2026) · RedTulum · PEC final 2026 (cap. 4.2 p. 140 sin extraer). Normativa transversal: Ley 25.326 (PII), 27.275 (padrones vía acceso a la información), CCyC honor (sin estrellas v1), 11.723 (contenido de terceros), 24.240 (solo MK-5). Regla propuesta: el PR de MK-1 declara las normas aplicables del dominio (extensión del marco normativo ya registrado).

---

## 5. Decisiones DH (ratificadas 2026-10-17 vía pregunta directa, traza #243)

1. **Rubros canon — RATIFICADO: 11 categorías del fixture lote 3A como canon**. `directoryTaxonomy.ts` (rama #233, 4 categorías) queda como subconjunto a armonizar: la serie contracts extiende `TAXONOMIA_CANONICA` con las 11 categorías del fixture `capitalTerritoryData.ts` (mismo repo, contenido acreditado — nada se deriva nuevo, R1). El join por código extensible se mantiene; código desconocido degrada a `unknown` honesto (R15).
2. **Multinodo — RATIFICADO desde el día 1** (`nodo_key`-scoped: capital primero, caucete/iglesia reutilizan sin cambios).
3. **Dependencias FE** (react-hook-form + zodResolver; mapa FE-1; facetas FE-2) — **ABIERTA**, encadenada a las 8 decisiones de #163.
4. **Nombre público — RATIFICADO: «Mercado de Proximidad»** (vocabulario UI con agent.google sobre tokens `--honest-*`).
5. **Seed — RATIFICADO: 0 comercios sembrados** (patrón VIG-005 "solo se publica lo verificado"); la demo sintética solo en `SyntheticDataSource`.

## 6. Plan de ejecución MK-1 (tras la cascada de merges, CI verde)

Rama `feat/market-cap-mk1-directorio` (base = main post-cascada, con #233 mergeado):
1. contracts `comercios.ts` + export en `index.ts` (después de #233).
2. Prisma `comercio_ficha` + migración versionada (sin geom — cero SQL de triggers).
3. Ruta `comercios.ts` montada en `/api/comercios` (app.ts).
4. Suite E2E §2.7.
5. Frontend: `ComerciosPanel` + DataSource + App.tsx (integración funcional agent-vibe; estética agent.google).
6. Regla documental R9: openapi (+`/api/comercios*`), ARCHITECTURE_STATE (fila Marketplace), README.
7. EV a numerar según tabla F0-C1 al volver CI.

---

*[agent: vibe] — 2026-10-17 — diseño técnico MK-0. Ratificado en sus 4 decisiones centrales (traza #243). Sin merge sin CI verde (R15).*
