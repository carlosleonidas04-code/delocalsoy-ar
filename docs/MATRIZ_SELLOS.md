# Matriz de sellos — sello → efecto

Propósito (mejora C5 de la hoja de mantenimiento): hacer explícito el contrato de qué sello emite cada dominio y qué consumidor lo procesa. Estado v0.2 (revisión M0 2026-11-06: estados post-cascada + sellos de las cascadas NODO-CAPITAL y NODO-VIG-3; las filas tardías marcan deuda de la regla 5 saldada). La validación automática contra el código está implementada: apps/api/src/matriz-sellos.test.ts (C5, #412) verifica en CI que el doc, el espejo del cliente web y los sellos emitidos por la API no diverguen — la regla 5 con diente.

## Consumidores

| Consumer group | Efecto |
| --- | --- |
| `core004-worker` | Proyección exactly-once de cada evento en `event_projections`. |
| `vig003-kpi` | Recompute idempotente de KPIs del nodo (parsea `nodo_key` del payload del sello — deuda ADR-030). |
| `vig006-rag-index` | Recompute idempotente del índice RAG (subnodos + activos aprobados no `restricted` + fichas + KPIs; nunca sensible/PII, ADR-036). |

## Matriz

| Sello | Dominio | Origen acreditado | Estado |
| --- | --- | --- | --- |
| `subnodo.creado` | subnodos | VIG-001 (#175), Fase C (#198) | main |
| `activo.propuesto` | activos | CORE-004 R6 (#204, EV-035) | main |
| `activo.ingestado` | activos (seed VIG-002) | #179 | main |
| `activo.estado_cambiado` | activos (PATCH moderación) | CORE-004 R5b (#111, EV-034) | main — fila tardía (deuda regla 5 saldada por C5 #412) |
| `patrimonio.ingestado` | patrimonio (seed VIG-004) | #186 | main |
| `patrimonio.custodiado` | patrimonio (PATCH custodia) | #186 | main |
| `patrimonio.observado` | patrimonio_observaciones | VIG-009 (#253 → #301, EV-072) | main |
| `operativa.ingestado` | activos_operativa (seed VIG-005) | #189 | main |
| `producto.propuesto` | productos | #189 | main |
| `producto.estado_cambiado` | productos | #189 | main |
| `producto.atributos_editados` | productos (MK-3b, PATCH de oferta) | #426 (EV-095) | main |
| `oportunidad.propuesta` | oportunidades (Bloque 9) | #160 (EV-039) | main |
| `oportunidad.estado_cambiado` | oportunidades | #160 | main |
| `oportunidad.conexion_creada` | oportunidades (vínculos actores) | NCAP-R6-ext (#165) | main — fila tardía (deuda regla 5 saldada por C5 #412) |
| `oportunidad.evidencia_validada` | oportunidades (gate de evidencia) | NCAP-R6-ext (#165, ADR-035) | main — fila tardía (deuda regla 5 saldada por C5 #412) |
| `oportunidad.scoring_declarado` | oportunidades (niveles cualitativos) | NCAP-R6-ext (#165, ADR-035) | main — fila tardía (deuda regla 5 saldada por C5 #412) |
| `ficha_valoracion.propuesta` | fichas_valoracion | #196 (EV-038) | main |
| `ficha_valoracion.estado_cambiado` | fichas_valoracion | #196 (EV-038) | main — fila tardía (deuda regla 5 saldada en esta revisión) |
| `reporte.recibido` | reportes | CORE-005 R2 (#209, EV-052) | main |
| `reporte.corroborado` | reportes | CORE-005 R4 (#219, EV-055) | main — fila tardía (deuda regla 5 saldada en esta revisión) |
| `reporte.estado_cambiado` | reportes | CORE-005 R3 (#211, EV-053) | main |
| `fuente.registrada` | fuentes (seed) | #200 (EV-049) | main |
| `ingesta.creada` | ingestas | #200 | main |
| `ingesta.estado_cambiado` | ingestas | #200 | main |
| `comercio.ingestado` | comercios (MK-1) | #248 → #300 (EV-070) | main |
| `comercio.estado_cambiado` | comercios | #248 → #300 | main |
| `comercio.titularidad_reclamada` | comercios | #248 → #300 | main |
| `comercio.titularidad_verificada` | comercios | #248 → #300 | main |
| `comercio.atributos_editados` | comercios | #248 → #300 | main |
| `comercio.habilitacion_actualizada` | comercios (MK-2) | #254 → #302 (EV-073) | main |
| `comercio.titularidad_desistida` | comercios (MK-2) | #254 → #302 | main |
| `capa.registrada` | capas (seed de vocabulario) | NCAP-R1 #369 (EV-079) · VIG-010 #383 (EV-083) | main |
| `corredor.creado` | corredores | NCAP-R4 #365 (EV-077) | main |
| `mediador.registrado` | mediadores (AMC) | VIG-011 #385 (EV-084) | main |
| `pedido.presentado` | pedidos | VIG-012 #387 (EV-085) | main |
| `pedido.respondido` | pedidos | VIG-012 #387 (EV-085) | main |
| `cluster.creado` | features (clusters AMC) | VIG-011 #378 (EV-084) | main — fila tardía (deuda regla 5 saldada por ARTEFACTOS-ROLES AR4 #403) |
| `residencia.declarada` | usuarios (AR1) | ARTEFACTOS-ROLES #400 (épica #399) | main |
| `visitante.registrado` | usuarios (AR1) | ARTEFACTOS-ROLES #400 (épica #399) | main |
| `comercio.relay_recibido` | comercios (MK-4 relay) | #427 (EV-098) | en cola |

## Regla

Todo PR que agrega un sello nuevo agrega su fila aquí **en el mismo PR** (regla 5 de `docs/MANTENIMIENTO.md`). El estado "en cola" se actualiza al merge. La columna de origen se mantiene anclada a PR/EV reales (R15: nada sin acreditación).
