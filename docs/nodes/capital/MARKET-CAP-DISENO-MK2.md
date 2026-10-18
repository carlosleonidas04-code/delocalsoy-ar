# MARKET-CAP — Diseño técnico MK-2 (confianza: habilitación SIIC + historial público)

> **Propuesta técnica ratificada por la DH (R9, 2026-10-18).** Continúa la serie MARKET-CAP: MK-0 (PR #244) y MK-1 completo (#246 contracts → #247 db → #248 API+E2E → #249 web → #250 docs) están en cola esperando CI verde (~01-11-2026, R15). Este documento ancla MK-2 contra **el MK-1 REAL aterrizado** (verificación en vivo 2026-10-18 sobre `apps/api/src/routes/comercios.ts` del PR #248 y `packages/contracts/src/comercios.ts` del PR #246). NADA IMPLEMENTADO; las 5 decisiones del §7 fueron RATIFICADAS por la DH el 2026-10-18 (pregunta directa, traza #243). Issue: #243 (sub-issue de la épica #152). Canvas de referencia: `marketplace-nodo-capital`.

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
| `comercio.titularidad_desistida` | `metodo` + fecha (SIN hash del reclamante) |
| `comercio.atributos_editados` | solo fecha + `titular_hash` (pseudónimo) |

Comportamiento: 404 sin eco si la ficha no existe o no es publicable (`rechazado`/`restricted` — ADR-036); ficha sin transiciones → lista vacía honesta (R15); contrato de salida `ComercioHistorialSchema` en contracts.

## 4. Sello nuevo (extensión mínima documentada del MK-0 §2.4)

| Sello | Payload (sin PII) | Dispara |
|---|---|---|
| `comercio.habilitacion_actualizada` | `{comercio_id, estado_anterior, estado_nuevo, fuente_key, justificacion, actualizado_por_hash}` | historial público F-3 + KPIs (MK-3) |
| `comercio.titularidad_desistida` | `{comercio_id, metodo, desistido_por_hash}` | historial público F-3 |

## 5. Suite E2E MK-2 (9 tests, contra PostGIS/Redis reales — scaffolding verbatim `comercios-rutas.test.ts` #248)

1. PATCH habilitación por titular verificado con evidencia completa → 200 + ficha actualizada + sello en `events_raw`.
2. Refine ADR-035: `verificada` sin evidencia primaria completa → 400; `silencio_positivo` sin `fecha_presentacion` → 400.
3. Ciudadano no titular → 403 sin eco; moderador → 200.
4. Rollback: el sello falla → la ficha no cambia (R4/R15).
5. `GET /:id/historial` 1:1 con los sellos en orden asc; ficha recién creada → exactamente 1 entrada (`comercio.ingestado`) — H6, errata corregida en §9.9.
6. Historial de ficha `rechazada`/`restricted` → 404 sin eco.
7. El historial JAMÁS expone `identificador_hash` ni `reclamado_por_hash` (assert sobre la salida).
8. Justificación con PII → 400 sin eco, sin sello, sin persistencia (ADR-020 cond. 1).
9. Desistir del reclamo por el reclamante → titularidad `desistida` + sello `comercio.titularidad_desistida`; un no-reclamante no puede desistir (403 sin eco).

## 6. Frontend MK-2 (contrato DataSource ADR-029)

- `ApiDataSource.getComercioHistorial(id)` + paridad `SyntheticDataSource` SIEMPRE etiquetada `[SINTÉTICO]` (R15).
- `ComerciosPanel`: bitácora F-3 con `HonestBadge`/`SourceChip` (inventario mínimo F0) y la habilitación con sus 5 estados epistémicos.
- Integración funcional agent-vibe; estética agent.google (ADR-034, tokens `--honest-*`).

## 7. Decisiones DH (RATIFICADAS 2026-10-18, R9 — pregunta directa, traza #243)

1. **Quién carga la habilitación — RATIFICADO (b): titular verificado + moderador|admin** (el consentimiento es del propio comercio, Ley 25.326).
2. **Alcance del historial público — RATIFICADO (b): ciclo completo** — alta + estados + habilitación + titularidad + ediciones; `desistida` aparece como transición sin hash del reclamante.
3. **Justificación pública ADR-038 para cambios de habilitación — RATIFICADO (a): sí, siempre ≥ 10** (es un cambio epistémico público).
4. **Seed `fuente_siic_web` — RATIFICADO (a): sí**, con cautela de verificación individual (no padrón bulk, ADR-035).
5. **`titularidad.desistida` — RATIFICADO (a): MK-2 agrega la acción desistir** del reclamante en `POST /:id/titular` (cierra el ciclo honesto; sello `comercio.titularidad_desistida`).

## 8. Plan de ejecución MK-2 (tras el merge de MK-1, CI verde)

Rama `feat/market-cap-mk2-confianza` (base = main post-cascada, con #246–#250 mergeados):
1. contracts: `ComercioHabilitacionCambioSchema` + `ComercioHistorialSchema` (+ acción desistir — ratificado §7.5) — export en `index.ts`.
2. Ruta `comercios.ts`: `PATCH /:id/habilitacion` + `GET /:id/historial` (+ desistir) montadas.
3. Catálogo de fuentes: `fuente_siic_web` (ratificado §7.4).
4. Suite E2E §5 (9 tests).
5. Frontend §6.
6. Regla documental R9 en el mismo PR: openapi v7.26.0 (+2 rutas), ARCHITECTURE_STATE, README.
7. EV a numerar según tabla F0-C1 al volver CI.

---

## 9. Diseño exhaustivo — material verbatim para la implementación

Esta sección cierra el ciclo de diseño: todo lo que sigue es material listo para copiar tal cual en la rama `feat/market-cap-mk2-confianza` cuando la cascada MK-1 (#246 → #250) haya mergeado con CI verde. JAMÁS se ejecuta nada de esto hoy: CI caído hasta ~01-11-2026 (tarea 4fb0a626) y sin CI verde no hay merge (R15). Cada bloque fue contrastado contra el MK-1 real aterrizado: `apps/api/src/routes/comercios.ts` (PR #248, head a34929f) y `packages/contracts/src/comercios.ts` (PR #246, commit cc8e57d). Los hallazgos H1–H6 de §9.1 anclan cada decisión; §9.9 deja constancia de las dos erratas corregidas in situ (5.5 y 8.4), la deuda menor, la reversibilidad y las trazas.

### 9.1 Hallazgos del contraste en vivo (H1–H6)

Contraste en vivo sobre el código real de MK-1 (no sobre el diseño previo de este documento):

- **H1 — `fichaPublica()` expone la titularidad COMPLETA.** El handler retorna `titularidad: ficha?.titularidad ?? { estado: 'sin_reclamo' }`, es decir, con `reclamado_por_hash` incluido cuando la ficha fue reclamada. El contrato público `ComercioFichaPublicaSchema` nunca declaró ese hash, pero la respuesta runtime lo arrastra (la ruta no valida salida). Para el historial público es inaceptable (decisión DH §7.2). Solución: `titularidadPublica()` + cambio de 1 línea en `fichaPublica()` (§9.3.4). `PATCH /:id` sigue leyendo la fila real de la base: la edición del titular no se pierde.
- **H2 — `desistida` ya vive en el enum.** `ComercioTitularidadSchema` ya enumera `('sin_reclamo', 'reclamada', 'verificada', 'desistida')` (#246, cc8e57d). El desistimiento NO extiende el enum: escribe `estado: 'desistida'` en la ficha y sella `comercio.titularidad_desistida`. El 409 del reclamo ciudadano solo cubre `reclamada|verificada`: una ficha `desistida` vuelve a ser reclamable (ciclo completo, decisión DH §7.2).
- **H3 — guard canónico 404 (R15/ADR-036).** `GET /:id` responde 404 si `!activo || !comercio_ficha || visibilidad === 'restricted' || estado fuera de ['propuesto','aprobado']`. `GET /:id/historial` reutiliza EXACTAMENTE ese guard: lo que no es visible tampoco tiene historial visible, y el 404 es indistinguible del de una ficha inexistente (§9.3.2).
- **H4 — 7 sellos con payloads distintos.** El historial deriva 1:1 de `events_raw` (append-only, ADR-032): 5 sellos vivos de MK-1 + 2 nuevos de MK-2 (`comercio.habilitacion_actualizada`, `comercio.titularidad_desistida`) = 7. Como cada sello expone campos distintos, la entrada del historial es un `discriminatedUnion` sobre `type` con 7 variantes `.strict()` (§9.2).
- **H5 — contadores y tipología de fuentes.** La suite `fuentes-vig-rutas` declara 31 tests y pasa a 32 (nuevo caso `tipo: registro_web`); `TIPOS` del catálogo hoy no incluye `registro_web`; el único toque posible a `index.ts` en todo MK-2 es el enum `tipo` de `FuenteSchema` (§9.2, nota). El filtro del nodo Caucete (`seed-cau-r2`) NO se toca.
- **H6 — toda ficha viva tiene al menos 1 sello.** El alta sella `comercio.ingestado` en la misma transacción; una ficha recién creada devuelve exactamente 1 entrada de historial, nunca 0. Errata del ítem 5.5 corregida arriba; la lista vacía honesta de §3 queda como caso defensivo, no como caso esperado.

### 9.2 Contratos verbatim (`packages/contracts/src/comercios.ts`)

Bloque completo para agregar al final del módulo. No requiere tocar `index.ts`: el `export *` de contracts ya exporta todo lo nuevo (ver H5 en §9.1: el único toque posible a `index.ts` sería el enum `tipo` de `FuenteSchema`, al agregar `registro_web`).

```ts
// MK-2: cambio de habilitación (justificación pública ADR-038)
export const ComercioHabilitacionCambioSchema = z.object({
  habilitacion: ComercioHabilitacionSchema, // refine ADR-035 ya vivo (#246)
  justificacion: z.string().min(10, 'ADR-038: justificación pública obligatoria'),
}).strict();
export type ComercioHabilitacionCambio = z.infer<typeof ComercioHabilitacionCambioSchema>;

// MK-2: desistimiento del reclamo (ratificado §7.5)
export const ComercioTitularidadDesistimientoSchema = z.object({
  accion: z.literal('desistir'),
  declaracion_consentimiento: z.literal(true), // nunca pre-marcado (ADR-027)
}).strict();
export type ComercioTitularidadDesistimiento = z.infer<typeof ComercioTitularidadDesistimientoSchema>;

// MK-2: titularidad pública (sin hash del reclamante, DH §7.2)
export const ComercioTitularidadPublicaSchema = z.object({
  estado: ComercioTitularidadSchema.shape.estado,
}).strict();
export type ComercioTitularidadPublica = z.infer<typeof ComercioTitularidadPublicaSchema>;

// MK-2: historial público F-3 (derivado de sellos, nunca tabla mutable)
export const COMERCIO_SELLOS_HISTORIAL = [
  'comercio.ingestado',
  'comercio.estado_cambiado',
  'comercio.titularidad_reclamada',
  'comercio.titularidad_verificada',
  'comercio.titularidad_desistida',
  'comercio.habilitacion_actualizada',
  'comercio.atributos_editados',
] as const;

export const ComercioHistorialEntradaSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('comercio.ingestado'), occurred_at: z.string() }).strict(),
  z.object({
    type: z.literal('comercio.estado_cambiado'),
    estado_anterior: z.string(),
    estado_nuevo: z.string(),
    justificacion: z.string(),
    moderador_hash: z.string(),
    occurred_at: z.string(),
  }).strict(),
  z.object({
    type: z.literal('comercio.titularidad_reclamada'),
    metodo: z.string(),
    occurred_at: z.string(), // SIN identificador_hash y SIN reclamado_por_hash (DH §7.2)
  }).strict(),
  z.object({
    type: z.literal('comercio.titularidad_verificada'),
    metodo: z.string(),
    verificado_por_hash: z.string(),
    occurred_at: z.string(),
  }).strict(),
  z.object({
    type: z.literal('comercio.titularidad_desistida'),
    metodo: z.string().nullable(),
    occurred_at: z.string(), // SIN desistido_por_hash en la salida pública
  }).strict(),
  z.object({
    type: z.literal('comercio.habilitacion_actualizada'),
    estado_anterior: z.string(),
    estado_nuevo: z.string(),
    fuente_key: z.string().nullable(),
    justificacion: z.string(),
    actualizado_por_hash: z.string(),
    occurred_at: z.string(),
  }).strict(),
  z.object({
    type: z.literal('comercio.atributos_editados'),
    titular_hash: z.string(),
    occurred_at: z.string(),
  }).strict(),
]);

export const ComercioHistorialSchema = z.array(ComercioHistorialEntradaSchema);
export type ComercioHistorialEntrada = z.infer<typeof ComercioHistorialEntradaSchema>;
export type ComercioHistorial = z.infer<typeof ComercioHistorialSchema>;
```

### 9.3 Rutas verbatim (`apps/api/src/routes/comercios.ts`)

Las piezas nuevas viven en el mismo módulo `comercios.ts`, junto a los handlers canónicos de MK-1 que NO se tocan (`POST /`, `GET /:id`, `PATCH /:id/estado`, `POST /:id/titular` salvo la rama desistir, `PATCH /:id`).

#### 9.3.1 `PATCH /:id/habilitacion` — cambio de habilitación (DH §7.1 y §7.3)

Titular verificado o moderador|admin (JWT); 403 sin eco para el resto (mismo criterio de `PATCH /:id`); justificación pública ≥ 10 con anti-PII (ADR-038, ADR-020 cond. 1); 409 por estado idéntico (deuda menor, §9.9); sello `comercio.habilitacion_actualizada` con rollback si falla (R4/R15).

```ts
// PATCH /api/comercios/:id/habilitacion — cambio de habilitación (DH §7.1
// y §7.3): titular verificado o moderador|admin; justificación pública
// ≥ 10 con anti-PII (ADR-038, ADR-020 cond. 1); sello + rollback (R4/R15).
router.patch('/:id/habilitacion', requireJwt, async (req: Request, res: Response) => {
  const id = req.params.id;
  const usuario = res.locals.usuario as { id: string; rol: string };

  let parsed: z.infer<typeof ComercioHabilitacionCambioSchema>;
  try {
    parsed = ComercioHabilitacionCambioSchema.parse(req.body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'datos inválidos', details: error.errors });
      return;
    }
    throw error;
  }

  // Anti-PII sobre la justificación pública ANTES de persistir (ADR-020).
  const pii = detectaPII(parsed.justificacion);
  if (pii) {
    res.status(400).json({
      error: 'payload rechazado: contiene datos personales identificables (' + pii + ') — ADR-020 cond. 1, Ley 25.326',
    });
    return;
  }

  try {
    const activo = await prisma.activos.findUnique({ where: { id }, include: { comercio_ficha: true } });
    if (!activo || !activo.comercio_ficha) {
      res.status(404).json({ success: false, error: 'comercio no encontrado' });
      return;
    }
    const ficha = activo.comercio_ficha as ComercioFichaRow;
    const titularidad = (ficha.titularidad ?? {}) as { estado?: string; reclamado_por_hash?: string };
    const esTitular = titularidad.estado === 'verificada' && titularidad.reclamado_por_hash === seudonimo(usuario.id);
    const esModeracion = usuario.rol === 'moderador' || usuario.rol === 'admin';
    if (!esTitular && !esModeracion) {
      res.status(403).json({ success: false, error: 'solo el titular verificado o moderación puede cambiar la habilitación' });
      return;
    }
    const anterior = ((ficha.habilitacion ?? {}) as { estado?: string }).estado ?? 'sin_dato';
    if (anterior === parsed.habilitacion.estado) {
      res.status(409).json({ success: false, error: 'la habilitación ya está en estado ' + anterior });
      return;
    }
    await prisma.comercio_ficha.update({
      where: { activo_id: id },
      data: { habilitacion: parsed.habilitacion as object },
    });
    try {
      await sellarEvento('comercio.habilitacion_actualizada', {
        comercio_id: id,
        estado_anterior: anterior,
        estado_nuevo: parsed.habilitacion.estado,
        fuente_key: parsed.habilitacion.fuente_key ?? null,
        justificacion: parsed.justificacion,
        actualizado_por_hash: seudonimo(usuario.id),
      });
    } catch (err) {
      // Rollback (R4/R15): sin sello no hay cambio acreditado.
      await prisma.comercio_ficha
        .update({ where: { activo_id: id }, data: { habilitacion: ficha.habilitacion as object } })
        .catch(() => undefined);
      console.error('[comercios] sellar cambio de habilitación:', err instanceof Error ? err.message : String(err));
      res.status(500).json({ success: false, error: 'fallo al sellar el cambio de habilitación' });
      return;
    }
    res.json({ success: true, data: { activo_id: id, habilitacion: parsed.habilitacion } });
  } catch (err) {
    console.error('[comercios] cambiar habilitación:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al cambiar la habilitación' });
  }
});
```

#### 9.3.2 `GET /:id/historial` — historial público F-3

Guard idéntico al de `GET /:id` (H3); consulta `events_raw` con `type IN` lista blanca + filtro por `payload.comercio_id`; orden `occurred_at` asc con `id` asc como desempate; `switch` con lista blanca: un sello futuro NO se expone por omisión (R15). La salida se valida con `ComercioHistorialSchema` antes de responder.

```ts
// GET /api/comercios/:id/historial — F-3: derivado 1:1 de los sellos en
// events_raw (ADR-032, append-only); guard idéntico al de GET /:id (H3).
router.get('/:id/historial', async (req: Request, res: Response) => {
  const id = req.params.id;
  try {
    const activo = await prisma.activos.findUnique({ where: { id }, include: { comercio_ficha: true } });
    if (
      !activo ||
      !activo.comercio_ficha ||
      activo.visibilidad === 'restricted' ||
      !['propuesto', 'aprobado'].includes(activo.estado)
    ) {
      res.status(404).json({ success: false, error: 'comercio no encontrado' });
      return;
    }
    const sellos = await prisma.events_raw.findMany({
      where: {
        type: { in: [...COMERCIO_SELLOS_HISTORIAL] },
        payload: { path: ['comercio_id'], equals: id },
      },
      orderBy: [{ occurred_at: 'asc' }, { id: 'asc' }],
    });
    const entries = sellos.flatMap((s) => {
      const p = s.payload as Record<string, unknown>;
      const occurred_at = s.occurred_at.toISOString();
      switch (s.type) {
        case 'comercio.ingestado':
          return [{ type: s.type, occurred_at }];
        case 'comercio.estado_cambiado':
          return [{ type: s.type, estado_anterior: p.estado_anterior, estado_nuevo: p.estado_nuevo, justificacion: p.justificacion, moderador_hash: p.moderador_hash, occurred_at }];
        case 'comercio.titularidad_reclamada':
          // SIN identificador_hash y SIN reclamado_por_hash (DH §7.2, H1).
          return [{ type: s.type, metodo: p.metodo, occurred_at }];
        case 'comercio.titularidad_verificada':
          return [{ type: s.type, metodo: p.metodo, verificado_por_hash: p.verificado_por_hash, occurred_at }];
        case 'comercio.titularidad_desistida':
          // SIN desistido_por_hash en la salida pública.
          return [{ type: s.type, metodo: p.metodo ?? null, occurred_at }];
        case 'comercio.habilitacion_actualizada':
          return [{ type: s.type, estado_anterior: p.estado_anterior, estado_nuevo: p.estado_nuevo, fuente_key: p.fuente_key ?? null, justificacion: p.justificacion, actualizado_por_hash: p.actualizado_por_hash, occurred_at }];
        case 'comercio.atributos_editados':
          return [{ type: s.type, titular_hash: p.titular_hash, occurred_at }];
        default:
          return []; // lista blanca: un sello futuro NO se expone por omisión (R15)
      }
    });
    res.json({ success: true, data: ComercioHistorialSchema.parse(entries) });
  } catch (err) {
    console.error('[comercios] historial:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al obtener el historial' });
  }
});
```

#### 9.3.3 Desistir dentro de `POST /:id/titular` (DH §7.5)

La acción desistir viaja dentro de `POST /:id/titular` para no abrir una ruta nueva: se inserta al inicio del bloque ciudadano (después del 404 de la ficha y de la lectura de `titularidad`, antes del parse del reclamo). Si el body parsea como desistimiento, se procesa y retorna; si no, el flujo del reclamo original sigue sin cambios.

```ts
    // Dentro del bloque ciudadano de POST /:id/titular, antes del reclamo:
    const desistimiento = ComercioTitularidadDesistimientoSchema.safeParse(req.body);
    if (desistimiento.success) {
      if (titularidad.estado !== 'reclamada' || titularidad.reclamado_por_hash !== seudonimo(usuario.id)) {
        res.status(403).json({ success: false, error: 'solo quién reclamó la titularidad puede desistir' });
        return;
      }
      const titularidadNueva = { estado: 'desistida', metodo: titularidad.metodo ?? null };
      await prisma.comercio_ficha.update({ where: { activo_id: id }, data: { titularidad: titularidadNueva as object } });
      try {
        await sellarEvento('comercio.titularidad_desistida', {
          comercio_id: id,
          metodo: titularidad.metodo ?? null,
          desistido_por_hash: seudonimo(usuario.id),
        });
      } catch (err) {
        await prisma.comercio_ficha
          .update({ where: { activo_id: id }, data: { titularidad: titularidad as object } })
          .catch(() => undefined);
        console.error('[comercios] sellar desistimiento:', err instanceof Error ? err.message : String(err));
        res.status(500).json({ success: false, error: 'fallo al sellar el desistimiento' });
        return;
      }
      res.json({ success: true, data: { activo_id: id, titularidad: { estado: 'desistida' } } }); // respuesta saneada (H1)
      return;
    }
```

La ficha pierde `reclamado_por_hash` al desistir (respuesta y ficha saneadas, H1): otro ciudadano puede volver a reclamar (ciclo completo, DH §7.2). El sello conserva `desistido_por_hash` (append-only, ADR-032) pero el historial público NO lo expone (§9.2, variante `titularidad_desistida`).

#### 9.3.4 `titularidadPublica()` + cambio de 1 línea en `fichaPublica()` (H1)

```ts
// Titularidad pública (H1): el hash del reclamante NO sale en ninguna
// salida pública. La edición del titular sigue funcionando porque
// PATCH /:id lee la fila real, no esta proyección.
function titularidadPublica(titularidad: Record<string, unknown>): { estado: string } {
  return { estado: (titularidad.estado as string) ?? 'sin_reclamo' };
}
```

El cambio de 1 línea en `fichaPublica()`:

```ts
    titularidad: titularidadPublica((ficha?.titularidad ?? {}) as Record<string, unknown>),
```

### 9.4 Seed de la fuente (`fuente_siic_web`, catálogo ADR-035)

Patrón verbatim de `seed-fuentes-cau.sql`: entrada idempotente en `fuentes` + sello `seed-fuente-creada` en `events_raw`. Es el 9º SQL de `db:seed` (se monta después de `seed-fuentes-cau.sql`). El certificado web SIIC equivale a la Licencia Comercial (Ley 104-A): certificado web ≡ Licencia Comercial. Cautela ratificada DH §7.4: verificación individual por consentimiento del propio comercio, NO padrón bulk (Ley 27.275, pedido formal abierto, no bloqueante).

```sql
-- seed-fuentes-market-cap.sql (patron verbatim de seed-fuentes-cau.sql)
INSERT INTO fuentes (id, key, organismo, nombre, url, tipo, licencia, estado, cautela, created_at, updated_at)
VALUES (
  gen_random_uuid()::text,
  'fuente_siic_web',
  'Ministerio de Industria y Comercio (San Juan)',
  'Registro web SIIC — certificado web (Ley 104-A)',
  'https://industriaycomercio.sanjuan.gob.ar',
  'registro_web',
  'publica',
  'disponible',
  'verificacion individual; NO padron bulk (ADR-035)',
  now(),
  now()
) ON CONFLICT (key) DO NOTHING;

INSERT INTO events_raw (id, type, payload, hash, occurred_at)
SELECT gen_random_uuid()::text, 'seed-fuente-creada',
       jsonb_build_object('key', f.key, 'organismo', f.organismo, 'source', 'seed-market-cap-mk2'),
       'seed-fuente-' || f.key, now()
FROM fuentes f
WHERE f.key = 'fuente_siic_web'
ON CONFLICT (hash) DO NOTHING;
```

Nota H5: `TIPOS`/`FuenteSchema` agregan `registro_web` en contracts (único toque posible a `index.ts` en todo MK-2); el filtro del nodo Caucete (`seed-cau-r2`) NO se toca; la suite `fuentes-vig-rutas` pasa de 31 a 32 tests (nuevo caso `tipo: registro_web`).

### 9.5 Suite E2E MK-2 (9 tests)

Scaffolding verbatim `comercios-rutas.test.ts` (#248): PostGIS y Redis reales, tokens `--honest-*` (ADR-034); ejecución solo al volver CI (R15).

1. Scaffolding MK-1: alta ciudadana + reclamo + verificación de moderación; luego `PATCH /:id/habilitacion` con evidencia primaria completa (`tipo`, `numero`, `fuente_key`, `url`, `fecha_verificacion`) por el titular verificado → 200; `GET /:id` refleja `habilitacion.estado: verificada`; sello `comercio.habilitacion_actualizada` en `events_raw` con `estado_anterior: sin_dato`.
2. Refine ADR-035: `verificada` sin evidencia primaria completa → 400; `silencio_positivo` sin `fecha_presentacion` → 400 (el refine ya vive en #246; el camino nuevo lo ejercita).
3. Ciudadano no titular → 403 sin eco; moderador → 200 (corrección de moderación).
4. Rollback: trigger efímero `BEFORE INSERT ON events_raw` que `RAISE` cuando `NEW.type = 'comercio.habilitacion_actualizada'` → el PATCH responde 500 y la ficha conserva la habilitación anterior (R4/R15).
5. `GET /:id/historial` de ficha recién creada → exactamente 1 entrada (`comercio.ingestado`, H6); tras reclamar + verificar + editar atributos → 4 entradas en orden `occurred_at` asc.
6. Historial de ficha `rechazada` o `restricted` → 404 idéntico al de una ficha inexistente (H3, ADR-036).
7. El historial JAMÁS expone `identificador_hash` ni `reclamado_por_hash`: assert sobre el JSON de respuesta completo (DH §7.2, H1).
8. Justificación con PII → 400 sin eco del valor, sin sello, sin persistencia (ADR-020 cond. 1).
9. Desistir por el reclamante → 200, titularidad `desistida`, sello `comercio.titularidad_desistida` con `desistido_por_hash`; un no-reclamante → 403 sin eco; la ficha desistida puede volver a reclamarse (ciclo completo, DH §7.2).

### 9.6 Regla documental R9: openapi v7.26.0

- `PATCH /api/comercios/{id}/habilitacion` + `GET /api/comercios/{id}/historial`: paths 42 → 44; operaciones bajo `/api/comercios` 6 → 8.
- `ARCHITECTURE_STATE_v7.1.md` → siguiente versión + `README` actualizados en el MISMO PR que la implementación (regla documental R9).
- Matriz de respuestas del openapi: 400 (parse/refine/anti-PII), 404 sin eco (H3), 403 sin eco, 409 mismo estado, 500 sanitizado (sin detalle interno); salida del historial validada por `ComercioHistorialSchema`.

### 9.7 Frontend (ADR-029)

- `ApiDataSource.getComercioHistorial(id)`: `fetch` GET; si `!ok` lanza `DataSourceHttpError` — JAMÁS devuelve `[]` como máscara de error (R15: error es error, lista vacía es dato honesto).
- Paridad `SyntheticDataSource`: historial sintético SIEMPRE etiquetado `[SINTÉTICO]` (R15).
- Cambio de tipo H1: la titularidad de la ficha pública pasa a `{ estado }` (`titularidadPublica`, §9.3.4); ajustar el tipo del panel y del mapper.
- `ComerciosPanel`: bitácora F-3 con `HonestBadge`/`SourceChip` y la habilitación con sus 5 estados epistémicos (integración funcional agent-vibe, estética agent.google ADR-034, tokens `--honest-*`).

### 9.8 Plan de ejecución (7 pasos, rama `feat/market-cap-mk2-confianza`)

1. `packages/contracts/src/comercios.ts`: bloque §9.2 al final del módulo + `registro_web` en el enum `tipo` de `FuenteSchema` (H5). `index.ts` queda cubierto por el `export *` existente.
2. `apps/api/src/routes/comercios.ts`: montar §9.3.1 y §9.3.2 (entre `GET /:id` y `PATCH /:id/estado`), rama desistir de §9.3.3 dentro de `POST /:id/titular`, y §9.3.4 (`titularidadPublica` + 1 línea en `fichaPublica`).
3. Seed §9.4: `seed-fuentes-market-cap.sql` como 9º SQL de `db:seed`, tras `seed-fuentes-cau.sql`.
4. Tests: suite E2E de §9.5 contra PostGIS/Redis reales (scaffolding #248).
5. Frontend §9.7: `ApiDataSource.getComercioHistorial` + paridad sintética + cambio de tipo H1.
6. Regla documental R9 en el mismo PR: openapi v7.26.0, `ARCHITECTURE_STATE`, `README` (§9.6).
7. EV a numerar según tabla F0-C1 al volver CI; PR con labels `market-cap-mk2` + `r9-ratificado`; merge SOLO tras la cascada MK-1 completa y CI verde (R15).

### 9.9 Erratas, deuda menor, reversibilidad y trazas

- **Errata 5.5 (corregida in situ arriba):** el ítem 5 de §5 describía un caso imposible; lo correcto: exactamente 1 entrada (`comercio.ingestado`, H6).
- **Errata 8.4 (corregida in situ arriba):** el paso 4 de §8 citaba «(8 tests)»; el conteo correcto de §5 es (9 tests) — el desistir del reclamo es el test 9.
- **Deuda menor:** el 409 por estado idéntico en `PATCH /:id/habilitacion` (§9.3.1) sigue el patrón de `PATCH /:id/estado` pero no figuraba en la tabla de §2.2; se documenta aquí como decisión de consistencia. Todo lo demás es aditivo.
- **Reversibilidad:** MK-2 es aditivo (2 rutas, 2 sellos, 1 seed, 1 fuente, 1 enum). Revertir = retirar el PR completo; los sellos de `events_raw` son append-only y quedan como historia (ADR-032): la reversión NO borra sellos, solo deja de exponerlos (la lista blanca es código).
- **Trazas DH:** propuesta issuecomment-6245130219 + ratificación 5/5 issuecomment-6245217228 (ambas en #243); este diseño vive en el PR #251 (docs-only).

---

*[agent: vibe] — 2026-10-18 — diseño técnico MK-2 (§1–§8 ratificados 5/5 + §9 exhaustivo verbatim-ready: contratos, rutas, seed SIIC, 9 tests E2E, openapi v7.26.0). Sin merge sin CI verde (R15). Refs: #243 · #152 · #251 · MK-0 (PR #244) · MK-1 (#246–#250).*
