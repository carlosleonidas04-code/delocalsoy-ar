# ADRs — Registro de Ratificación Humana
# Fuente: issues #24, #29, #31, #32, #33, #34, #36 (ratificados R9 el 2026-10-05)
# Este archivo es un registro aditivo de acreditación; el cuerpo canónico de cada
# ADR sigue en docs/DECISIONES.md y sus issues de origen (R15: GitHub acredita).

## ADR-019 — R15: Staging propone, GitHub acredita ✅ RATIFICADO
- **Estado:** RATIFICADO por Dirección Humana (2026-10-05, issue #31)
- **Contenido:** R15 como invariante del ecosistema. Etiquetado dual
  "En Staging — Pendiente de PR/Merge" obligatorio en UI y reportes.
  Acreditación solo con issue/PR verificado en este repo.
- **Conformidad técnica R12:** agent-vibe (2026-10-05, #31)

## ADR-020 — Firestore como capa de sincronización offline-first ✅ RATIFICADO
- **Estado:** RATIFICADO por Dirección Humana (2026-10-05, issue #32)
- **Contenido:** Firestore NO es fuente de verdad canónica; precedencia de
  events_raw/PostGIS. Flujo de 3 estados:
  pendiente_outbox_local → espejado_firestore_sin_verificar → ingestado_events_raw.
- **Condiciones aceptadas:** (1) scrub anti-PII en servidor (Ley 25.326) con test
  de reglas; (2) desacople ADR-021 vía exists() de nodo.
- **Conformidad técnica R12:** agent-vibe (2026-10-05, #32)

## ADR-021 — Alcance territorial v1: federación de 3 nodos ✅ RATIFICADO
- **Estado:** RATIFICADO por Dirección Humana (2026-10-05, issue #33)
- **Contenido:** Capital, Caucete, Iglesia como alcance v1. Extensión abierta
  por datos (exists, no lista fija). Retirada de Lavalle.
- **Riesgo condicional (T2-audit):** Iglesia-primero requiere agente territorial
  real; si falta, swap con Caucete (decisión menor, sin ADR).
- **Conformidad técnica R12:** agent-vibe (2026-10-05, #33)

## ADR-022 — Adhesión de Anthropic (Claude) al ecosistema ✅ RATIFICADO
- **Estado:** RATIFICADO por Dirección Humana (2026-10-05, issue #34)
- **Contenido:** adhesión al ecosistema multi-agente bajo el método
  "Auditoría Sobre Digest" con reglas RA1–RA5 y sus dos ajustes.
- **Nota:** fila T2-R15-04 del informe original llegó truncada; texto completo
  pendiente de aporte de [agent: anthropic] para acreditación completa.
- **Conformidad técnica R12:** agent-vibe (correspondiente al registro, 2026-10-05)

## ADR-024 — Congelación de reglas y ADRs nuevos ✅ RATIFICADO CON EXCEPCIÓN
- **Estado:** RATIFICADO por Dirección Humana (2026-10-05, issue #36)
- **Contenido:** congelación de reglas y ADRs nuevos hasta acreditación EV 6/6,
  CON EXCEPCIÓN explícita de la remediación del red-team T2 (compuerta CI,
  identidad bot, protección de main, estados de acreditación). Se levanta a EV 6/6.
- **Numeración saneada:** ADR-022 = #34 (Anthropic), ADR-023 = adhesión Perplexity
  (staging, sin PR), ADR-024 = #36 (esta decisión).
- **Conformidad técnica R12:** agent-vibe (2026-10-05, #36)

## ADR-015 — AI Studio como cliente del contrato ✅ RATIFICADO (preexistente)
- **Estado:** RATIFICADO por Dirección Humana (2026-10-05, issue #24)
- **Contenido:** AI Studio como cliente del contrato del sistema (`@delocalsoy/contracts` + `docs/api/openapi.json`), no plataforma paralela.
- **Enmienda 2026-10-08 (AUD-10, #106):** la ruta `/api/contrato-sistema` nunca existió en `apps/api`. El contrato vigente es `@delocalsoy/contracts` (schemas Zod) + `docs/api/openapi.json` (v7.7.0). Ramas de staging: `agent-google/*` (identidad unificada con ADR-033).

## ADR-033 — Adhesión de Google AI Studio Build (`agent-google`) ✅ RATIFICADO
- **Estado:** RATIFICADO por Dirección Humana (2026-10-08, R9 en [#87](https://github.com/carlosleonidas04-code/delocalsoy-ar/issues/87#issuecomment-6059183834))
- **Contenido:** AI Studio Build como agente `agent-google`: diseño visual, staging con preview y prototipado UI. Sincronización pull-only desde GitHub, nunca force push; cambios vía export → rama `agent-google/*` → PR → CI → merge; secrets server-side. Ancla de rollback: `baseline/core003-d70cbc6`.
- **Enmienda 2026-10-08 (AUD-10, [#106](https://github.com/carlosleonidas04-code/delocalsoy-ar/issues/106)):** identidad unificada `agent-google` (antes `google-studio` / `agent-studio/*`), opción A ratificada R9 — conserva el historial #20–#28, #49, #50.

## HITUB v2.0 — Contrato Social Territorial y Multi-Agente ✅ RATIFICADO
- **Estado:** RATIFICADO por Dirección Humana (2026-10-05, issue #29)

---
*Registro generado por agent-vibe a partir de ratificaciones R9 verificadas en issues (2026-10-05). R15: este registro acredita la RATIFICACIÓN; la implementación técnica de cada ADR requiere sus propios PRs y EVs.*

| **9** | **`ADR-025`** | [`#40`](https://github.com/carlosleonidas04-code/delocalsoy-ar/issues/40) | **Adhesion de `[agent: grok]` (xAI) al Ecosistema Multi-Agentico (Post-Congelacion ADR-024):** Ratificado por Direccion Humana bajo R1-R15 (`#40#issuecomment-6031925646`) y levantada la congelacion ADR-024 (`#36` cerrado tras `6/6` en `main @ caa573b`). | Auditado post-congelacion | `ratified-issue` (`#40#issuecomment-6031925646`) -> `accepted-main` |
