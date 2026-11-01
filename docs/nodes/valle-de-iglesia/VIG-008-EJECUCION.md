# VIG-008 — Cooperativas del Valle de Iglesia: ejecución y estado canónico (#240, épica #239)

> Ejecutado 2026-10-20 sobre la rama `feat/vig-008-cooperativas` (apilada sobre NVIG-R5 #172 / PR #234). CI de GitHub Actions caído hasta ~2026-11-01: sin merge sin CI verde (R15). Este documento registra lo ejecutado, lo bloqueado y las decisiones de la Dirección Humana. Sin cambios de API ni de openapi (v7.24.0 sin cambios).

## 1. Alcance y regla central

Cooperativas de primer grado del Valle de Iglesia — Cooperativa Agropecuaria Tudcum Limitada (matrícula INAES 28.777 / provincial 659, declaradas por FECOAGRO) y Cooperativa de Trabajo Valles Iglesianos Limitada (matrícula INAES 11.463 / provincial 170, miembro fundador de FECOAGRO) — más la organización comunitaria de Buena Esperanza (Angualasto).

**Regla no negociable (R3):** NINGÚN dato enriquecido (catálogo, contactos, productos, personas) se publica sin consentimiento institucional formal de cada organización (asamblea ratificada). Anti-PII estricto (ADR-027, Ley 25.326): cero nombres civiles; solo estructura de cargos del consejo de administración.

Vocabulario epistémico canónico del repo: `verified | community_validated | pending | synthetic_demo`. Las fichas del protocolo `R9-CANON-VIG-008` (aterrizadas verbatim en la rama `agent-vibe/vig-008-009-diseno-cooperativas-achango`, PR #242) usan `validado|comunitario|pendiente|sintetico` y declaran las matrículas INAES `validado`: la decisión DH 2026-10-18 las baja a `community_validated` hasta evidencia materializada (ADR-035). Las correcciones quedan documentadas; las fichas verbatim quedan intactas. Hallazgo R4/R12 registrado: el `hashEsperado` de la ficha Valles Iglesianos es exactamente el sha256 del array vacío serializado — placeholder fabricado; la claim de integridad criptográfica inmutable no está acreditada en ninguna de las dos fichas.

## 2. Estado por requisito (R1–R7)

| Req | Entregable | Estado | Acreditación |
|---|---|---|---|
| R1 | Contratos `ConsentimientoOrganizacion*` + `OperativaInstitucional*` en `@delocalsoy/contracts` | hecho | commit `9fa8108f` (sección VIG-008 append en `packages/contracts/src/index.ts`) |
| R2 | Columna `institucional Json?` en `activos_operativa`, NULL hasta consentimiento | hecho | commit `77d3c58d` (`schema.prisma` + migración `20261020120000_vig008_operativa_institucional`) |
| R3 | Datos enriquecidos de cooperativas (catálogo, contactos, productos) | BLOQUEADO por consentimiento | ningún dato persistido sin asamblea ratificada; sin seed de catálogo ni rutas de escritura |
| R4 | Organizaciones sin matrícula (Buena Esperanza, A.P.R.I.) | documentado `unverified`, SIN seed | solo mención documental; nada persistido |
| R5 | 4 fuentes institucionales al catálogo global ADR-035 (31→35) | hecho | commit `d118b69d` (seed `seed-fuentes-vig.sql`: fecoagro_web `disponible`, cooperativas_sj / ley_2400t_convocatoria_2024 / mujeres_de_montana_2026 `requiere_solicitud`; sellos `fuente.registrada` source `seed-vig-r5` 16→20) |
| R6 | 2 oportunidades institucionales del nodo (Bloque 9) + suites | hecho | commit `324593c6` (seed `seed-oportunidades-vig008.sql`, 9º SQL de `db:seed`) + commit `0dc9ca0` (suites fuentes 35/20 + nueva `oportunidades-vig008-rutas.test.ts`, 5 tests read-only) |
| R7 | Pedidos formales de evidencia | abierto | PED-VIG-008-001..003 (sección 4) |

## 3. Oportunidades seed (R6)

- `seed-oportunidad-vig008-pro-huerta` — `market_gap`: brecha post-cierre del programa ProHuerta (huertas familiares y semillas), evidencia `news_source`, actores `provider|beneficiary` sin nombre con `consent_confirmed=false`.
- `seed-oportunidad-vig008-extension` — `partnership_opportunity`: alianza FECOAGRO/INTA/UNSJ de extensión para el valle, evidencia `institutional_document`, actor `partner`.

Ambas nacen en estado `detected` (registro comunitario sujeto a revisión; `validación` es estado del registro, no del territorio). Tags sin PII. Sin precios ni intermediación: cero recaudación, cero comisiones.

## 4. Pedidos formales (R7)

| ID | Organismo | Pedido | Estado |
|---|---|---|---|
| PED-VIG-008-001 | INAES | Estado registral de vigencia de la matrícula 28.777 (Cooperativa Agropecuaria Tudcum Limitada) | pendiente de envío formal |
| PED-VIG-008-002 | INAES | Estado registral de vigencia de la matrícula 11.463 (Cooperativa de Trabajo Valles Iglesianos Limitada) | pendiente de envío formal |
| PED-VIG-008-003 | Gobierno de San Juan (Dirección Provincial de Cooperativas / registro Ley 2400-T) | Confirmación de matrículas provinciales 659/170 + padrón de prestadores Ley 2400-T (padrón no encontrado — sin datos) | pendiente de envío formal |

## 5. Desbloqueo por consentimiento

Al materializarse el consentimiento institucional (asamblea ratificada por cooperativa): (1) completar la columna `institucional` de `activos_operativa` vía custodia moderador|admin; (2) publicar catálogo de productos solo con consentimiento y certificación comunitaria activa (vacío honesto mientras tanto); (3) subir las matrículas de `community_validated` a `verified` con evidencia materializada (ADR-035). Hasta entonces: 0 productos publicados, 0 contactos directos, punto geoespacial NULL (ADR-036).
