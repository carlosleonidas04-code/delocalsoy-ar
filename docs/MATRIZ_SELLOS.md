# Matriz de sellos — sello → efecto

Propósito (mejora C5 de la hoja de mantenimiento): hacer explícito el contrato de qué sello emite cada dominio y qué consumidor lo procesa. Estado v0.1: compilada desde el historial acreditado (`docs/EVIDENCIA.md` y trazas de PR). La validación automática contra el código (test de matriz) es la mejora C5 y aún NO está implementada.

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
| `patrimonio.ingestado` | patrimonio (seed VIG-004) | #186 | main |
| `patrimonio.custodiado` | patrimonio (PATCH custodia) | #186 | main |
| `patrimonio.observado` | patrimonio_observaciones | VIG-009 (#253) | en cola |
| `operativa.ingestado` | activos_operativa (seed VIG-005) | #189 | main |
| `producto.propuesto` | productos | #189 | main |
| `producto.estado_cambiado` | productos | #189 | main |
| `oportunidad.propuesta` | oportunidades (Bloque 9) | #160 (EV-039) | main |
| `oportunidad.estado_cambiado` | oportunidades | #160 | main |
| `ficha_valoracion.propuesta` | fichas_valoracion | #196 (EV-038) | main |
| `reporte.recibido` | reportes | CORE-005 R2 (#209, EV-052) | main |
| `reporte.estado_cambiado` | reportes | CORE-005 R3 (#211, EV-053) | main |
| `fuente.registrada` | fuentes (seed) | #200 (EV-049) | main |
| `ingesta.creada` | ingestas | #200 | main |
| `ingesta.estado_cambiado` | ingestas | #200 | main |
| `comercio.ingestado` | comercios (MK-1) | #248 | en cola |
| `comercio.estado_cambiado` | comercios | #248 | en cola |
| `comercio.titularidad_reclamada` | comercios | #248 | en cola |
| `comercio.titularidad_verificada` | comercios | #248 | en cola |
| `comercio.atributos_editados` | comercios | #248 | en cola |
| `comercio.habilitacion_actualizada` | comercios (MK-2) | #254 | en cola |
| `comercio.titularidad_desistida` | comercios (MK-2) | #254 | en cola |

## Regla

Todo PR que agrega un sello nuevo agrega su fila aquí **en el mismo PR** (regla 5 de `docs/MANTENIMIENTO.md`). El estado "en cola" se actualiza al merge. La columna de origen se mantiene anclada a PR/EV reales (R15: nada sin acreditación).
