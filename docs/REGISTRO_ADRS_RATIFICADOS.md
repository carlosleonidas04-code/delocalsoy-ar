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

## ADR-034 — Especialización colaborativa de `agent-google`: diseño visual como dominio propio ✅ RATIFICADO
- **Estado:** RATIFICADO por Dirección Humana (2026-10-08, aceptación mutua con actas en [#114](https://github.com/carlosleonidas04-code/delocalsoy-ar/issues/114) — refs #109, #87)
- **Contenido:** dominio propio del sistema de diseño (`apps/web/src/design/tokens.css`) + refinamiento visual/UX de `apps/web`; PRs solo-estética por el flujo ADR-033 (0 líneas de lógica/schemas/tests); liberada del frente funcional y de plazos del roadmap; la UI funcional de agent-vibe consume los tokens por defecto (acoplamiento por contrato visual, análogo a `@delocalsoy/contracts`).
- **Enmienda de scope de ADR-033:** no revoca ADR-033 (pull-only sin force push y flujo export → `agent-google/*` → PR → CI → merge siguen vigentes).
- **Conformidad técnica R12:** agent-vibe (esqueleto consumidor de tokens aterrizado; refs #114, #109)

## ADR-035 — Política de fuentes científicas y atribución verificable ✅ RATIFICADO
- **Estado:** RATIFICADO por Dirección Humana (2026-10-11, [#138](https://github.com/carlosleonidas04-code/delocalsoy-ar/issues/138#issuecomment-6113500869))
- **Contenido:** todo feature con `is_synthetic = false` declara fuente pública nombrada y verificable en `fuente_label` (sin eco de PII — Ley 25.326/ADR-027); estado `verified` solo por moderador|admin con referencia a la fuente; `community_validated` para relevo in-situ validado por la comunidad; la regla demo ("Ilustrativa · …", ninguna organización real en sintéticos) se mantiene. Fuentes candidatas Caucete: INPRES (sismicidad), Hidráulica provincial (riego/canales), salud pública provincial, INDEC.
- **Ratificación NODO-CAU conjunta (2026-10-11):** #137 (épica + matriz NC-R1..R5, [comment](https://github.com/carlosleonidas04-code/delocalsoy-ar/issues/137#issuecomment-6113486521)) y #140 (opción B: features Point v1, capa `hydrology` declarada LineString, [comment](https://github.com/carlosleonidas04-code/delocalsoy-ar/issues/140#issuecomment-6113504317)) ratificados el mismo día — confirmación textual de la DH registrada en la conversación del 2026-10-11 ("ya di ratificación a todo"), patrón de registro de #63.
- **Conformidad técnica R12:** agent-vibe (PR #143 `8a394b193dd543b4154b0111aeda97cffccd8d2f` — vocabulario v6 con la decisión aplicada; EV-037 en EVIDENCIA.md)

## ADR-036 — Ética de resiliencia y geolocalización sensible ✅ RATIFICADO
- **Estado:** RATIFICADO por Dirección Humana (2026-10-11, [#146](https://github.com/carlosleonidas04-code/delocalsoy-ar/issues/146#issuecomment-6113736944))
- **Origen:** documento de trabajo de la DH (2026-10-11) + issue #146 (NC-R8 de la épica NODO-CAU #137). Ratificación conjunta del mismo día: #145 (NC-R6 definición territorial, [comment](https://github.com/carlosleonidas04-code/delocalsoy-ar/issues/145#issuecomment-6113744236)) y #147 (NC-R7 catálogo de fuentes + contrato de procedencia, [comment](https://github.com/carlosleonidas04-code/delocalsoy-ar/issues/147#issuecomment-6113748047)).
- **Contenido:** regla central de resiliencia — hacer visible información útil sin convertir el mapa en etiqueta de riesgo para personas/barrios ni en falsa autoridad de emergencia (Ley 27.287: amenaza/exposición/vulnerabilidad/riesgo nunca se simplifican; sin estigmatización de barrios; nada publicado como oficial — rutas de evacuación, refugios, puntos de encuentro — sin confirmación vigente de la autoridad responsable, con organismo emisor, fecha, vigencia y tipo; ausencia de datos ≠ ausencia de peligro/necesidad; reportes comunitarios = testimonios revisables con estado `recibido/en_revision/corroborado/resuelto`, nunca clasificación automática de riesgo; incertidumbre y envejecimiento explícitos por fuente; puntajes/rankings documentados antes de publicar). Regla de geolocalización (Ley 25.326/AAIP): ubicación solo para finalidad explícita, informada y necesaria; ubicación precisa nunca requisito para consultar ni reportar (alternativas: aproximada, selección manual, no compartir); sin seguimiento continuo por defecto; minimización de precisión (tramo/intersección > domicilio exacto); separación identidad-geometría (el pseudónimo sha256 **no es anonimización**); publicación protegida (sin coordenadas exactas de hogares, personas asistidas, menores o recursos sensibles); visibilidad `restricted|generalized|public` con auditoría de accesos; retención limitada y eliminación; derechos de acceso/rectificación/supresión; terceros y menores reforzados; advertencias visibles (aproximado/agregado/reportado/validado/sintético + fecha); respuesta a incidentes (AAIP 47/2018). Contrato mínimo del reporte georreferenciado: finalidad · precisión solicitada vs publicada · permiso · visibilidad · estado de revisión · retención · trazabilidad.
- **Nota R15:** revisión de privacidad y daño **antes** de producción, con la DH y autoridad competente cuando aplique. Gobernanza de diseño, no dictamen legal.
- **Conformidad técnica R12:** pendiente — pruebas de aceptación NC-EV-10 con la implementación de NC-R4 (#139).

## ADR-037 — Google Maps como capa visual, nunca registro ✅ RATIFICADO
- **Estado:** RATIFICADO por Dirección Humana (2026-10-17, decisión de gobernanza — pedido formal trazado en #163)
- **Origen:** asignación del slot ADR-037 en la sesión de gobernanza del 2026-10-17 (desbloqueo recursivo de pendientes).
- **Contenido:** Google Maps Platform como capa EXCLUSIVA de visualización/UX, NUNCA fuente de registro. Los ToS de Google no permiten extraer ni persistir contenido cartográfico; el dato territorial canónico vive en PostGIS (events_raw) con procedencia IGN/BAHRA/INDEC/Georef. Nada de lo mostrado por Google acredita `verified` (ADR-035: acreditación solo por moderador|admin con fuente verificable). API keys server-side + degradación offline a mapa propio si el servicio no está disponible.
- **Precedente negativo:** RedTulum — la dependencia total de Google Maps destruye la soberanía de datos del proyecto (ADR-002: PostGIS exclusivo).
- **Conformidad técnica R12:** pendiente — se materializa con la integración de la capa visual (sin PR aún; deuda declarada).

## ADR-038 — Transparencia del ciclo de vida de los reportes ciudadanos ✅ RATIFICADO
- **Estado:** RATIFICADO por Dirección Humana (2026-10-15, [#206](https://github.com/carlosleonidas04-code/delocalsoy-ar/issues/206#issuecomment-6197008439))
- **Origen:** propuesta CORE-005 (#206, patrón FixMyStreet sobre la columna vertebral CORE-004 #87).
- **Contenido:** justificación pública obligatoria por cada transición de estado (mínimo 10 caracteres, anti-PII ADR-027 antes de sellar); matriz REPORTE_TRANSICIONES sellada en @delocalsoy/contracts (400 salto inválido / 409 sin transición); historial inmutable derivado 1:1 de los sellos reporte.estado_cambiado en events_raw (ADR-032: events_raw única fuente de verdad, sin tabla mutable); reportes descartado nunca públicos (404 en lectura pública, visible con justificación solo en /api/reportes/mios del reportero).
- **Conformidad técnica R12:** agent-vibe — PR #211 (R3 moderación con justificación, main @ cb1be25) + PR #213 (R4 historial público + /mios, main @ 1481095); acreditación EV-053/EV-054 en docs/EVIDENCIA.md.
- **Nota de registro:** volcado a este registro el 2026-10-17 (registro tardío, R15) tras el análisis heurístico-recursivo del 2026-10-15.

## ADR-039 — Duplicados sugeridos por proximidad: nunca fusión automática ✅ RATIFICADO
- **Estado:** RATIFICADO por Dirección Humana (2026-10-15, [#206](https://github.com/carlosleonidas04-code/delocalsoy-ar/issues/206#issuecomment-6197008439))
- **Origen:** propuesta CORE-005 R5 (#206).
- **Contenido:** el alta de reportes (201 y reintento idempotente 200) responde duplicados_sugeridos (+ duplicados_verificados): reportes abiertos reales del mismo nodo dentro del radio configurable REPORTES_DUPLICADOS_RADIO_M (default 100 m), LIMIT 5, con distancia_m; SQL crudo con doble filtro (caja pre-filtro que usa el índice GiST + ST_DWithin/ST_Distance cast a geography). NUNCA fusiona: no persiste, no sella, no muta (ADR-036: el reporte es un testimonio revisable). Verificación fail-open honesta: si la consulta falla tras el alta acreditada, duplicados_verificados: false (nunca 500 tras escritura comprometida; false no significa "sin duplicados", R15).
- **Conformidad técnica R12:** agent-vibe — PR #219 (R5 duplicados sugeridos; en cola de merge por bloqueo de Actions 2026-10-15 → ~2026-11-01, EV-055 a registrar post-merge).
- **Nota de registro:** volcado a este registro el 2026-10-17 (registro tardío, R15).
