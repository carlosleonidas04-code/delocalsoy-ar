# VIG-000 — Documento maestro de alcance del nodo Valle de Iglesia

**Nodo:** Valle de Iglesia · **Épica:** NODO-VIG #167 · **Issue:** NVIG-R3 #170 · **Docs:** VIG-001..VIG-007 (acreditados)

> **Estado: implementación VERIFICADA (actualización honesta del pedido original).**
> El issue #170 abrió este documento cuando el diseño estaba «conceptual
> avanzado, implementación no verificada». La realidad avanzó más rápido que el
> trámite: los sprints VIG-001..VIG-007 ya están acreditados en `main` con CI
> verde y evidencias EV-040..EV-047 (§8). Este documento consolida el diseño
> original del export de la DH con su aterrizaje verificado; no reabre decisiones
> ratificadas. Los pendientes se declaran tal como están (§9, R15).

## 1. Objetivo del nodo

Posicionar a Valle de Iglesia (departamento Iglesia, provincia de San Juan,
nodo `iglesia`) como **showcase multimodal** del modelo federado (ADR-021):
producción, turismo, patrimonio, ambiente y comunidad, con **estado REAL**
de la plataforma — nada maquetado (R15). Cada número público se deriva de las
tablas de dominio en el momento de la consulta, con trazabilidad por eventos
(R4) y sin PII en superficies públicas (ADR-027, Ley 25.326).

## 2. Distritos y jerarquía (según NVIG-R1)

- Estructura territorial: **distritos → parajes → subparajes**, más localidades
  INDEC. Jerarquía por `parent_key`; los subnodos no tienen geometría propia y
  declaran `boundary_status: provisional`.
- Aterrizaje: **52 entidades** cargadas (VIG-001, PRs #175/#177, EV-040/041,
  lotes ratificados por la DH 2026-10-13).
- **«Villa Iglesia» es la denominación canónica** ratificada por la DH en
  NVIG-R1 (#168); el seed queda igual, sin `UPDATE` (no se reescribe historia).
- Tipos reservados `settlement` / `corridor` / `asset_area` ratificados como
  **extensión futura** del enum `type` de subnodos.
- Referencia de vocabulario: `VIG-R1-VOCABULARIO.md` (PR #230, pendiente de
  merge — este documento no depende de su aprobación, solo la referencia).

## 3. Capitales y taxonomía (según NVIG-R2)

- Clasificación de activos por capital N1: **`productivo_rural` |
  `turistico` | `patrimonial` | `civico_social`**, con profundidad N1→N3
  (tabla `activos_clasificaciones`, VIG-002).
- Aterrizaje: **6 activos verificados** con clasificación completa
  (PR #179 → `b4c90d0`, EV-042).
- El filtrado público por N1 excluye siempre `restricted` (ADR-036, paso 5 de
  la demo final).

## 4. Modelo de datos (decisión de diseño)

Convención del repo: **snake_case en JSON, camelCase en TypeScript**.

| Tabla | Rol | Reglas clave |
|-------|-----|--------------|
| `nodos` | Nodo federado (ADR-021), key `iglesia` | Unidad de federación del showcase |
| `subnodos` | Jerarquía territorial | `parent_key`, sin geom propia, `boundary_status: provisional` |
| `activos` | Activos multimodales | `subnodo_key`, `visibilidad: public\|generalized\|restricted` (ADR-036), procedencia (ADR-035), consentimiento granular |
| `activos_clasificaciones` | Capital N1 (→N3) | `productivo_rural`, `turistico`, `patrimonial`, `civico_social` |
| `activos_patrimonio` | Ficha patrimonial 1:1 | `sensible` jamás público; `sensible_status: sin_relevamiento` cuando la geometría de custodia no existe en fuentes |
| `productos` | 1:N por activo | Nacen `propuesto`; solo se publica lo verificado |
| `activos_operativa` | Operativa 1:1 | Horario/temporada/seguridad verificados; `capacity_status: unknown` honesto |
| `kpi_snapshots` | KPIs por nodo | PK (`nodo_key`, `kpi_key`), upsert idempotente |
| `rag_index` | Índice de consulta | `tsvector` español + GIN; `restricted` jamás indexado |
| `fuentes` + `ingestas` | Procedencia | Join por código, no por nombre (ADR-035); `publicado` solo admin |
| `events_raw` | Registro append-only | Hash único por evento |

## 5. Eventos

- `events_raw` es **append-only** con hash único; sin escritura sin evento
  (rollback si el sello falla).
- Sellos de dominio: `subnodo.creado`, `patrimonio.custodiado`,
  `activo.propuesto`, `activo.estado_cambiado`, `producto.propuesto`,
  `producto.estado_cambiado`, `reporte.recibido`, `reporte.estado_cambiado`,
  `system.user_*`.
- Worker de proyecciones **exactly-once** (ADR-032).
- Consumidores declarados sobre el stream `events:raw`: `vig003-kpi`
  (snapshots derivables) y `vig006-rag-index` (índice de consulta).
- Identificación por `node_id` + `parent_node_id` en el plano de eventos.

## 6. Roles y permisos

- **ciudadano | moderador | admin** (ADR-031).
- Pseudónimo público: `sha256(usuario_id)` truncado — sin PII (ADR-027).
- Moderación: transiciones de estado (`activo`, `producto`, `reporte`)
  acreditadas con sello en `events_raw` (R4/R8).

## 7. Reglas éticas

1. **Geometría sensible separada de la pública**: el campo `sensible` de la ficha
   patrimonial jamás sale por la lectura pública; cuando la geometría interna de
   custodia no existe en fuentes se declara `sensible_status: sin_relevamiento`
   (VIG-004).
2. **ADR-036**: `restricted` excluido de los counts públicos de activos, operativa
   y productos. Excepción ratificada por la DH (VIG-004): la **ficha patrimonial**
   cuenta también para `restricted`, porque la declaratoria es registro público.
3. **Consentimiento granular**: habilitante, no decorativo. Con 0 consentimientos
   reales, la ficha de la tejedora queda diferida (Ley 25.326/ADR-027) —
   pendiente honesto, no vacío disimulado.
4. **Anti-PII**: ADR-027 + Ley 25.326 en todas las superficies públicas y KPIs.
5. **Procedencia**: ADR-035, join por código no por nombre; fuentes e ingestas
   con `publicado` visible solo para admin.
6. **RAG solo sobre contenido autorizado**: `POST /api/nodos/:key/ask` responde
   con plantillas del dominio, **sin LLM**, toda respuesta nace
   `human_review: pending` (VIG-006).
7. **Sin pagos ni marketplace** (alineado con el cierre Track A).

## 8. Sprints VIG-001..VIG-007 — diseño y aterrizaje verificado

| Sprint | Entregable | PR → commit | EV | Estado |
|--------|------------|-------------|-----|--------|
| VIG-001 | Subnodos: 52 entidades, jerarquía + localidades INDEC | #175/#177 → `efaef1c`/`ecb108f` | EV-040/041 | Acreditado (lotes ratificados DH 2026-10-13) |
| VIG-002 | Activos multimodales + clasificación N1→N3 | #179 → `b4c90d0` | EV-042 | Acreditado (6 activos verificados) |
| VIG-003 | KPIs honestos (9, sin PII) | #183 → `3ab78d5` | EV-043 | Acreditado (`cobertura_geometrica: null` R15, consumidor `vig003-kpi`) |
| VIG-004 | Patrimonio: 3 fichas con declaratoria | #186 → `179d4d12` | EV-044 | Acreditado (campo `sensible` nunca público) |
| VIG-005 | Producción y turismo | #189 → `ed05675` | EV-045 | Acreditado (0 productos: solo-verificado; `capacity_status: unknown`; dique Ley 826-G) |
| VIG-006 | RAG ético sin LLM | #191 → `a209887` | EV-046 | Acreditado (plantillas autorizadas, `human_review: pending`) |
| VIG-007 | Demo final federada | #194 → `c87191d` | EV-047 | Acreditado (`GET /api/showcase` + E2E) |

Detalle de las fichas patrimoniales (VIG-004): yacimiento de Angualasto
(Decreto 2.154/2009 + Ley 25.780/7.300), Capilla de Achango (Ley 24.790)
y Molino de Bella Vista (Ley 25.291). Operativa turística de referencia (VIG-005):
dique Cuesta del Viento, horario Ley 826-G (08:00-19:00), temporada
[3, 4, 9, 10], `capacity_status: unknown` honesto.

## 9. Alcance de la demo final y pendientes declarados

La demo final (VIG-007, `VIG-007-DEMO-FINAL.md`) es el **recorrido federado
Caucete → Capital → Valle de Iglesia** por `GET /api/showcase` (público
anónimo): 13 pasos, 4 escenarios (productivo, turístico, patrimonial, gestión y
auditoría), 10 criterios, vista `ShowcaseRecorridoPanel`. Los nodos sin snapshots
muestran **counts 0 honestos, nunca fabricados** (R15).

**Pendientes honestos al cierre de VIG-007** — ninguno se disimula:

- Patrimonio vivo: **0 consentimientos reales** (ficha de la tejedora diferida).
- Capacidad de prestadores: `unknown` (padrón Ley 2400-T no encontrado).
- Catálogo de productos: **0 publicados** — solo se publica lo verificado.
- Cobertura geométrica: `null` (sin métrica computada en v1, R15).
- Pismanta y 3 parajes **sin BAHRA**.

## Reglas de este documento (R9/R15)

- R9: GitHub acredita — cada afirmación de aterrizaje tiene su PR, commit y EV;
  las decisiones de diseño fueron ratificadas por la DH en los issues citados.
- R15: nada fabricado — el banner de estado dice lo que hay, no lo que el issue
  pedía al abrirse. Este documento se lee con el estado al 2026-10-16.
