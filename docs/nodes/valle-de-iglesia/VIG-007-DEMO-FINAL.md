# VIG-007 — Demo final del showcase: recorrido Caucete → Capital → Valle de Iglesia

**Nodo:** Valle de Iglesia · **Épica:** NODO-VIG #167 · **Issue:** NVIG-R9 #193 · **Evidencia:** EV-047

Demo final de la épica NODO-VIG: un recorrido federado por los tres nodos que
muestra el estado REAL de la plataforma — nada maquetado (R15). Cada número que
aparece se deriva de las tablas de dominio en el momento de la consulta, con las
exclusiones de siempre (ADR-036: `restricted` fuera de los counts públicos de
activos, operativa y productos; la ficha patrimonial cuenta también para
`restricted` porque la declaratoria es registro público — decisión DH VIG-004).

Decisiones ratificadas por la DH (2026-10-14, traza #193):

1. El entregable incluye, además del guion, una **vista web nueva**
   (`ShowcaseRecorridoPanel`) que consume la misma superficie federada.
2. La federación son los **3 nodos con estado REAL**: capital/caucete aún sin
   snapshots ni subnodos → counts 0 honestos, nunca fabricados (R15).
3. El guion son los **4 escenarios + 10 criterios mapeados al estado real**:
   lo verde se acredita y lo pendiente se declara como pendiente.
4. **EV-047 ratificada**: CI verde con el E2E del recorrido + merge del PR.

> **Actualización (2026-10-15, activación territorial NCAP-R2 #154, épica
> #152):** el nodo capital ya expone 2 distritos provisionales (Centro y
> Desamparados) en `GET /api/nodos/capital/subnodos`; el recorrido sigue
> derivando sus counts en vivo. Caucete sigue sin subnodos ni snapshots →
> counts 0 honestos. La decisión 2 se lee con el estado al cierre de
> VIG-007 (2026-10-14).

## Superficie federada

`GET /api/showcase` (público anónimo) — contrato `ShowcaseResponseSchema`
(fuente única en `@delocalsoy/contracts`): recorrido `[caucete, capital,
iglesia]`, resumen por nodo (subnodos, kpis, activos_aprobados,
fichas_patrimoniales, operativas, productos_aprobados, rag_fragmentos,
kpis_detalle) y este guion referenciado. Un nodo sin `kpi_snapshots` →
`kpis: 0` honesto. El 500 es sanitizado (AUD-06 #100).

La vista web (`ShowcaseRecorridoPanel`, lente `all` / `lens_atlas_coco_baba`)
consume esa misma ruta: los counts 0 se muestran como «sin materializar aún
(R15)», nunca como vacíos maquetados.

## Guion ejecutable (13 pasos)

| # | Paso | Ruta real | Qué acredita |
|---|------|-----------|--------------|
| 1 | Resumen de Caucete | `GET /api/showcase` | Nodo activo, sin subnodos ni snapshots → counts 0 honestos (R15) |
| 2 | Resumen de Capital | `GET /api/showcase` | Ídem Capital: estado real, nada fabricado |
| 3 | Resumen de Valle de Iglesia | `GET /api/showcase` | Counts reales del nodo: subnodos ≥ 52, 9 KPIs, 3 fichas, 3 operativas, índice RAG > 0 |
| 4 | Jerarquía territorial | `GET /api/nodos/iglesia/subnodos` | Distritos → parajes → subparajes + localidades INDEC (VIG-001) |
| 5 | Capital productivo rural | `GET /api/activos?nodo=iglesia&n1=productivo_rural` | Filtrado multimodal por N1 sin `restricted` (VIG-002, ADR-036) |
| 6 | Operativa turística del dique | `GET /api/operativa/{id del dique}` | Horario Ley 826-G (08:00-19:00), temporada [3, 4, 9, 10], `capacity_status: unknown` honesto (VIG-005) |
| 7 | Ficha patrimonial del yacimiento | `GET /api/patrimonio/{id Angualasto}` | Declaratoria Decreto 2.154/2009 + Ley 25.780/7.300 visible; `sensible` nunca (VIG-004) |
| 8 | Moderación | `PATCH /api/activos/{id}/estado` | Propuesta ciudadana → aprobación moderada con sello `activo.estado_cambiado` (R4/R8) |
| 9 | Recompute de KPIs | consumidor `vig003-kpi` | Snapshots derivables desde el dominio, upsert idempotente (VIG-003) |
| 10 | KPIs de gestión | `GET /api/nodos/iglesia/kpis` | Set honesto v1: 9 KPIs sin PII, `cobertura_geometrica: null` (R15) |
| 11 | Consulta productiva | `POST /api/nodos/iglesia/ask` | RAG full-text nativo español, plantilla autorizada sin LLM (VIG-006) |
| 12 | Consulta patrimonial | `POST /api/nodos/iglesia/ask` | Dato con fuente + `human_review: pending`; `restricted` jamás indexado |
| 13 | Trazabilidad y revisión | `events_raw` + `human_review` | Cada escritura acreditada por sello; toda respuesta ask nace pendiente de revisión humana |

## Escenarios (4)

### 1. Escenario productivo
Pasos 3-5, 11. El valle muestra su capital productivo rural con procedencia
trazable (ADR-035): activos N1 `productivo_rural` aprobados, cooperativas
agropecuarias y la producción como **vacío declarado** — 0 productos publicados
porque solo se publica lo verificado (decisión DH VIG-005). La consulta ask
responde con plantilla autorizada del dominio productivo, sin LLM.

### 2. Escenario turístico
Pasos 6, 11. La operativa del dique Cuesta del Viento publica horario
(Ley 826-G), temporada [3, 4, 9, 10] y seguridad con reglas verificadas
(guardavidas, VHF), pero capacidad `unknown` — el 90% de ocupación hotelera
de enero NO es aforo (R15). Las habilitaciones de prestadores quedan en sus
4 atributos separados, todos `unknown` («distinguido» ≠ «habilitado»).

### 3. Escenario patrimonial
Pasos 3, 7, 12. Tres fichas con declaratoria verificada: yacimiento de
Angualasto (Decreto 2.154/2009 + Ley 25.780/7.300), Capilla de Achango
(Ley 24.790, conservación crítica declarada) y Molino de Bella Vista
(Ley 25.291). La geometría interna de custodia no existe en nuestras fuentes
(`sensible_status: sin_relevamiento`) y jamás sale por la lectura pública.
El patrimonio vivo con personas nombradas exige consentimiento granular:
**0 consentimientos reales hoy** → la ficha de la tejedora queda diferida
(Ley 25.326/ADR-027) — estado pendiente honesto, no un vacío disimulado.

### 4. Escenario de gestión y auditoría
Pasos 1-2, 8-10, 13. Los moderadores acreditan cada transición con sello en
`events_raw` (rollback si el sello falla — sin escritura sin evento), los KPIs
del set honesto v1 (9, agregados sin PII, restricted excluido) son re-derivables
en cualquier momento y la auditoría lee el recorrido federado completo: los
nodos sin materializar aparecen con sus counts 0 honestos (caucete; capital
activó su base territorial después — NCAP-R2 #154: 2 distritos provisionales
— y el recorrido lo muestra en vivo).

## Criterios de aceptación (10) y estado real

| # | Criterio | Estado | Se verifica en |
|---|----------|--------|----------------|
| 1 | Recorrido federado de 3 nodos en orden con counts reales | ✅ Verde | `GET /api/showcase` + E2E showcase-demo |
| 2 | Jerarquía territorial completa de Valle de Iglesia | ✅ Verde (≥ 52 subnodos, VIG-001) | paso 4 |
| 3 | Filtrado por capital N1 sin `restricted` (ADR-036) | ✅ Verde | paso 5 |
| 4 | Operativa turística honesta: Ley 826-G + temporada + capacidad `unknown` | ✅ Verde | paso 6 |
| 5 | Ficha patrimonial pública con declaratoria, sin `sensible` | ✅ Verde | paso 7 |
| 6 | Patrimonio vivo con consentimiento granular | ⏳ Pendiente honesto: 0 consentimientos reales, ficha diferida (Ley 25.326) | — |
| 7 | Consulta ética con dato + fuente + plantilla sin LLM, `human_review: pending` | ✅ Verde (VIG-006) | pasos 11-12 |
| 8 | Toda transición moderada acreditada con sello (R4) | ✅ Verde | pasos 8-9, 13 |
| 9 | KPIs de gestión derivables, sin PII, cobertura `null` honesto | ✅ Verde (VIG-003) | paso 10 |
| 10 | Nodos sin snapshots → counts 0 honestos, nunca fabricados | ✅ Verde por diseño (R15) | pasos 1-2 |

Pendientes declarados del nodo al cierre de la épica: patrimonio vivo (0
consentimientos), capacidad de prestadores (`unknown`, padrón Ley 2400-T no
encontrado), catálogo de productos (0 publicados: solo lo verificado) y
cobertura geométrica (sin métrica computada en v1). Ninguno se disimula:
la plataforma los muestra tal como están.

## Ejecución automatizada

El guion se acredita en `apps/api/src/showcase-demo.test.ts` (E2E contra
PostgreSQL/PostGIS real en el job `test` de CI): recorrido y counts,
escenario productivo (operativa del dique), patrimonial (ficha Angualasto),
gestión (9 KPIs), RAG (ask sobre Angualasto) y trazabilidad (`events_raw`).
Requiere base real; sin base → skip honesto (patrón de los suites del repo).

## Reglas de la demo (R9/R15)

- R9: GitHub acredita — este documento, el código y el E2E viven en el repo;
  la DH ratificó las decisiones de diseño en el issue #193.
- R15: nada fabricado — un número sin fuente no se muestra; un nodo sin
  materializar muestra 0 y lo dice.
- Ley 25.326: sin PII en superficies públicas; el consentimiento es
  habilitante, no decorativo.
