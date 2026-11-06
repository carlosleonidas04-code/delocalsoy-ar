# VIG-012 — Pedidos formales del nodo Iglesia (#379, épica #377)

Fecha: 2026-11-06 · Rama: `feat/vig-012-pedidos-formales` · Issue: #379 · Épica: #377 · Anterior: VIG-011 AMC (#378, ya en main)

## Contexto

El plan vecinal del Valle de Iglesia define una nota formal a Vialidad
Provincial (DPV) con 15 pedidos organizados en cinco bloques temáticos
(A-E). Este sprint aterriza el **libro de reclamos**: la tabla que
registra cada pedido a medida que se presenta y su seguimiento público.

Los 15 pedidos de la nota son **contenido documental** — fuente: documento
vecinal interno, procedencia declarada, citado **sin firmantes expuestos**
(ADR-027). NO se traducen a filas: ninguna fila se siembra (R15).

## Decisiones ratificadas por la DH (2026-11-06)

- **Tabla única**: `pedidos` es la ÚNICA tabla nueva del módulo.
- **Sin semilla**: la tabla NACE VACÍA. El tablero arranca en «0 de 15
  presentados · 0 respondidos» — conteo 0 honesto (R15, patrón NCAP-R5).
- **Preparar la nota ≠ presentarla** (R15): nada se registra como
  presentado sin fecha real de presentación. La ruta rechaza fechas
  futuras (400).
- **Bloques temáticos A-E** de la nota (ratificados): proyecto_ejecutivo,
  seguridad_derivadores, datos_cargas, red_provincial_emergencias,
  seguimiento_vecinal.
- **ADR-027**: la nota/petitorio se cita sin firmantes expuestos; la
  autoría en la tabla es un pseudónimo sha256(usuario_id) truncado.

## Modelo de datos (`pedidos`)

- `key` — slug único del pedido (^[a-z0-9_]+$, 4-60).
- `nodo_key` — nodo federado (SanJuanNodeSlugSchema).
- `bloque` — bloque temático A-E (PedidoBloqueSchema).
- `tema` — tema público del pedido (anti-PII al crear, 10-500).
- `destinatario` — organismo destinatario (p. ej. DPV).
- `fecha_presentacion` — fecha REAL de presentación (no futura, R15).
- `plazo_dias` — plazo declarado de respuesta (1-365).
- `estado` — presentado | respondido_en_plazo | respondido_tardio.
- `respondido_en` / `nota_respuesta` — fecha y nota pública de la
  respuesta del organismo (nota anti-PII).
- `evidencia_cluster_keys` — hasta 10 clusters pc-* del AMC (VIG-011):
  cada uno debe existir como feature community_validated; el pedido
  cita puntos críticos corroborados por N reportes de M vecinos —
  nunca un puntaje (R5).
- `created_by_hash` — pseudónimo del admin que registra (ADR-027,
  Ley 25.326). `hash` — idempotencia del registro.

## Ciclo de vida

presentado → respondido_en_plazo | respondido_tardio

- El estado final de la respuesta lo **DERIVA** la ruta contra el plazo:
  en_plazo si llegó a más tardar el día `fecha_presentacion + plazo_dias`,
  tardío después. Nunca se declara a mano.
- **`sin_respuesta` NO se transita ni se sella**: se DERIVA honesto en
  lectura — presentado con plazo vencido y sin respuesta. No existe el
  evento «no contestaron»: existe la fecha vencida (R15).

## Rutas (OpenAPI v7.36.0, 55 → 58 paths)

- `POST /api/pedidos` — SOLO admin (acto institucional, ADR-031):
  PedidoAltaSchema (400 zod), fecha futura 400 (R15), anti-PII 400 sin
  eco, nodo real (defensivo), evidencia pc-* community_validated (400
  si no), idempotencia por hash (200 sin sello nuevo), key única (409),
  sello `pedido.presentado` SIN PII y SIN tema, rollback si falla.
- `POST /api/pedidos/{key}/respuesta` — SOLO admin: fecha no futura 400
  (R15), anti-PII en nota, estado DERIVADO contra el plazo, ya respondido
  409, sello `pedido.respondido` con rollback.
- `GET /api/pedidos?nodo=` — tablero público de cobertura/fecha:
  `esperados_documento` 15 (PEDIDOS_DPV_ESPERADOS), conteos por estado,
  `fecha_corte`, `cobertura` «X de 15 presentados · Y respondidos (corte
  …)», `fuente` con procedencia declarada (ADR-027) y el detalle por
  pedido con `estado_efectivo` derivado + evidencia ampliada (título
  «N reportes de M vecinos» del punto crítico o NULL honesto). NUNCA un
  puntaje global (R5/R15).
- `GET /api/pedidos/{key}` — seguimiento público: transiciones DERIVADAS
  de los sellos `pedido.presentado` / `pedido.respondido` (ADR-038 — la
  línea de tiempo es la acreditación).

## Sellos (events_raw, R4/R15)

- `pedido.presentado` — {pedido_id, key, nodo_key, bloque, destinatario,
  fecha_presentacion, plazo_dias, evidencia_cluster_keys}. SIN tema: el
  texto del pedido nunca va al evento (patrón VIG-011).
- `pedido.respondido` — {pedido_id, key, estado_nuevo, fecha_respuesta,
  plazo_dias}. SIN nota.
- `pedido.sin_respuesta` NO EXISTE como tipo de evento.
- Ambos con rollback si el sello falla: nunca una fila sin evento.

## Los 15 pedidos de la nota formal a DPV (documental, por bloques)

Se citan por bloque temático, no fila por fila (no se inventa contenido:
el detalle vive en el documento vecinal interno):

- **A. proyecto_ejecutivo** — proyecto ejecutivo del tramo del valle.
- **B. seguridad_derivadores** — seguridad vial y derivadores.
- **C. datos_cargas** — datos y cargas del tránsito real.
- **D. red_provincial_emergencias** — red provincial y emergencias.
- **E. seguimiento_vecinal** — seguimiento vecinal de las respuestas.

Cada pedido registrado puede citar los puntos críticos corroborados del
AMC (VIG-011) como evidencia: el dato comunitario detrás del reclamo.

## Criterio de cierre (#379)

Tabla `pedidos` + rutas de creación/lectura + sellos + tablero de
cobertura/fecha con conteo 0 honesto y procedencia declarada, probado en
CI (E2E): suite `apps/api/src/vig012-pedidos-rutas.test.ts` (7 tests) —
tablero vacío, alta admin con sello sin PII, idempotencia/409,
validaciones R15, evidencia AMC E2E, respuesta en plazo, vencido con
sin_respuesta derivado y nunca sellado.

## Estado

- Contratos: `packages/contracts/src/index.ts` (PedidoBloqueSchema,
  PEDIDOS_DPV_ESPERADOS, PedidoEstadoSchema, PedidoAltaSchema,
  PedidoRespuestaSchema).
- Migración: `packages/db/prisma/migrations/20261106100000_vig012_pedidos`
  (CREATE TABLE + 3 índices, SIN seed).
- OpenAPI: v7.36.0 (58 paths).
