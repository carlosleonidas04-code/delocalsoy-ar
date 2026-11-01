# F0 — Verdad del Repositorio — DELocalSoy.AR

**Fecha:** 2026-10-16 · **Responsable:** agent-vibe · **Mandato:** DH (documento fuente "Diseño Base UX Multiplataforma", fase F0)
**Regla:** GitHub y CI acreditan; este informe solo registra (R9/R15). Nada de lo aquí declarado es capacidad: es estado observado con evidencia.

## 1. Estado de Git (verificado vía conector GitHub, 2026-10-16 ~03:00 UTC)

| Ítem | Valor observado | Evidencia |
|---|---|---|
| Verdad de `main` | `77500be` — "docs: registro EV-054 — CORE-005 R4 historial público + suscripción" (2026-10-15T18:28:15Z) | list_commits head de main |
| Último commit de capacidad en main | `1481095` — "CORE-005 R4: historial público y reportes propios del reportero (#213)" (2026-10-15T18:22:19Z) | list_commits |
| Divergencia local/remota | No aplica a este corte (trabajo 100% remoto vía API, sin clon local) | — |
| Ramas activas de trabajo | feat/ux-001-tokens-plataforma (diferido), feat/ux-002-input-manager (PR #224), agent-vibe/core005-r5-duplicados (#219), agent-vibe/core005-r6-flujo-vertical (#220), agent-vibe/nut-capital-consolidacion (#216), agent-vibe/unide-sondeo-nut-cap-010 (#217), agent-vibe/normativa-bloque-d-nut-cap-012 (#218) | list_branches |
| Rama de aterrizaje agent.google | feat/stage-canvas-maestro-vig — creada desde main @ 77500be, **esperando Lote 0 (manifiesto)**; sin pushes | verificación de este corte |
| Ramas agent-google | 3 ramas, sin actividad nueva ni PRs tras #214 | list_branches |
| Aterrizaje del Canvas Maestro | **NO aterrizó**: ningún archivo nuevo en main; la entrega VIG (7 archivos) vive solo en el entorno de agent.google | get_file_contents |
| Stash / cambios sin commit | Ninguno conocido vía API | — |

## 2. Estado de CI (verificado con evidencia cronológica)

| Workflow | Última ejecución verde | Estado actual |
|---|---|---|
| ci.yml, verify.yml, compuerta-r9.yml, scope-guard-lote-estetico.yml | PR #214 (2026-10-15 ~18:24): build 82 s, test 232 s, vertical 74 s, compuerta 8 s, scope 6 s, report **skipped** (patrón canónico de merge válido) | **CAÍDO a nivel cuenta desde ~2026-10-15 23:12** |

**Patrón objetivo:** TODOS los checks de los PRs #217, #218, #219, #220, #222, #224 fallan en ~2 s sin que arranque runner alguno. Los workflows no cambiaron entre #214 (verde) y #217 (rojo instantáneo). Diagnóstico: **límite de uso mensual de GitHub Actions agotado a nivel cuenta** (gasto, no contenido). Confirmación DH (2026-10-16): "Es límite mensual, esperará reinicio".

**Regla operativa:** NINGÚN merge hasta CI 100% verde (R15). Al restaurarse: re-run de jobs desde la UI de Actions o push trivial a la rama (evento synchronize). Registro del bloqueo: comentarios en PR #222 (6206948064).

## 3. Evidencias EV (numeración verificada)

| EV | Alcance | Estado real |
|---|---|---|
| EV-053 | CORE-005 R3 moderación transparente | **VERDE** (registro en main 0df3e5f, 2026-10-15T17:38Z) |
| EV-054 | CORE-005 R4 historial público + suscripción | **VERDE** (registro en main 77500be, 2026-10-15T18:28Z) |
| EV-055 / EV-056 | CORE-005 R5 (duplicados) / R6 (flujo vertical) | **RECLAMADAS**; PRs #219/#220 abiertos, bloqueados por CI caído |
| EV-057 | — | **LIBRE** (la propuesta previa para UX-001 quedó diferida); disponible para el próximo merge de capacidad acreditado |
| EV-038, EV-001..EV-054 | usadas | docs/EVIDENCIA.md es el registro canónico |

## 4. Capacidades: estado honesto

| Capacidad | Estado | Evidencia |
|---|---|---|
| Web build + test + vertical | ACREDITADA al 2026-10-15 18:24 | CI verde en #213/#214 |
| CORE-005 ciclo del reporte R1–R4 | ACREDITADO hasta R4 | EV-053/054 en main |
| CORE-005 R5 / R6 | EN CURSO, **no acreditado** | PRs #219/#220 sin CI |
| UX-001 tokens de plataforma | DIFERIDO por DH (ver §5) | PR #222 cerrado; rama preservada |
| UX-002 input/foco/accesibilidad | EN REVISIÓN, **no acreditado** (suite sin ejecutar) | PR #224 abierto, esperando CI |
| PWA / offline honesto | NO implementado (UX-003 ratificado por DH, pendiente) | — |
| Mapa con coordenadas reales | NO acreditado en este corte | sin CI que lo verifique |
| RAG /api/nodos/:key/ask | NO acreditado en este corte | reportado, no verificado |
| OpenAPI | v7.24.0, 38 paths (sin cambios en este corte) | contrato publicado |

## 5. Decisiones de gobernanza registradas este turno (2026-10-16)

| ID | Decisión | Dueño |
|---|---|---|
| F0-D1 | UX-001 **diferido** hasta convergencia del Canvas Maestro (ADR-034: tokens/estética = dominio agent.google). PR #222 cerrado sin fusión; rama preservada como expediente | DH |
| F0-D2 | UX-002 se mantiene **completo** (superset del recorte): contrato tipado + detección + navegación espacial; activación TV/vehículo solo vía data-platform (inerte por defecto) | DH |
| F0-D3 | F0 (este informe) + RFC-027 (contrato de colaboración) se producen juntos con evidencia real | DH |
| F0-D4 | CI bloqueado por límite mensual de Actions; merge solo con CI verde; TV y vehículo = hipótesis de canal, no compromisos de entrega | DH |
| F0-C1 | Conflicto abierto: numeración EV-055/056 vs orden real de merges al volver CI (CORE-005 R5/R6 reclaman; UX-002 podría reclamar EV-057) | agent-vibe + DH |

## 6. Conclusión

- **Verdad de main:** 77500be (2026-10-15 18:28Z), sin cambios desde entonces.
- **Bloqueo crítico:** CI caído a nivel cuenta (límite mensual). Todo merge de capacidad está en espera; nada se degrada por eso.
- **Lo que NO está acreditado:** CORE-005 R5/R6, UX-002, PWA, mapa real, RAG.
- **Fase siguiente habilitada:** F3 como contrato (RFC-027, propuesta en este mismo PR) + cierre de CORE-005 R5/R6 y UX-002 cuando CI se restablezca.
