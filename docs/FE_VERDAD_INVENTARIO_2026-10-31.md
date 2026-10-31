# FE_VERDAD — Inventario verificado del frontend de DELocalSoy.AR

> **Fecha:** 2026-10-31 · **Responsable:** agent-vibe · **Mandato:** DH «Solucionemos los problemas detectados» (hallazgos H1–H4 del inventario frontend).
> **Base:** `main @ 77500be` (2026-10-15). **Método:** R4 — toda afirmación de este documento está verificada contra el árbol real (GitHub API, blob SHA + tamaño); R15 — lo no acreditado se declara como tal.
> **Alcance:** registro de verdad, NO un ADR. Las decisiones que este inventario expone se derivan a la DH en #292 (opciones A/B/C), #293 y #294.

## 1. Stack — una sola formulación

Verificado en `apps/web/package.json`: **React 18.3.1 + Vite 6** (TypeScript). El handoff del 17-oct decía «Next/React» — impreciso. `ARCHITECTURE_STATE_v7.1.md` y `README.md` ya decían «Vite + React»: esa queda como la única formulación (R9: el mismo PR que constata no abre divergencia documental).

## 2. Inventario verificado (2026-10-31, tamaño en bytes del blob crudo)

| Elemento | Tamaño | Verificado |
| --- | --- | --- |
| `src/main.tsx` | 272 B | Punto de entrada mínimo; monta `App` |
| `src/App.tsx` | 301.951 B | Monolito: nodos, capas, paneles y navegación interna en un solo archivo (FE-DEUDA-02 → #293) |
| `src/components/` | 20 archivos | El mayor: `BaseConsolidadaPrototype` 177.234 B — VIVO (importado por `App.tsx`) |
| `src/demo/` | contrato ADR-029 | `ApiDataSource` 10.390 B; árbol SIN montar: `DemoTerritorialFederado.jsx` no tiene importadores fuera de sus propias suites |
| `src/lib/dataSource.ts` | 29.906 B | «Contrato Explícito de Origen de Datos» (header `[agent: google]`); selector `VITE_MOCK_API`; `ApiDataSource` 18.111 B. Consumido por `App.tsx` |
| `design/` | tokens + prototipo | `tokens.css` 9.424 B (ADR-034) + `BaseConsolidadaPrototype` 179.597 B — SIN importadores en main; el PR #238 (en cola) importa desde `design/` |
| `vite.config.ts` | 254.196 B | Middleware staging + live-ws en la config de build (FE-DEUDA-03 → #294) |
| Suites de test | 5 | Dentro del árbol `apps/web` |
| `.env.example` | — | Documenta AMBOS selectores: `VITE_DATA_SOURCE` y `VITE_MOCK_API` |

## 3. Divergencia estructural (FE-DEUDA-01 → #292)

**Doble contrato `DataSource`.** Coexisten dos árboles que implementan el mismo contrato de origen de datos:

1. `src/demo/` — el contrato **ratificado** (ADR-029, DEMO-3; selector `VITE_DATA_SOURCE`). Árbol SIN montar: `DemoTerritorialFederado.jsx` no tiene importadores fuera de sus propias suites.
2. `src/lib/dataSource.ts` — «Contrato Explícito de Origen de Datos» (header `[agent: google]`, selector `VITE_MOCK_API`). Es el contrato **consumido por la app montada**: `App.tsx` + middleware de `vite.config.ts` + toda la cola de frontend en curso (#249, #280, #275–#279).

`ARCHITECTURE_STATE_v7.1.md` describía solo el contrato ratificado. Esta brecha ya estaba: la fila era verdadera pero incompleta. No se corrige de facto: R13 — ningún agente deshace la decisión ratificada de otro sin ADR. Opciones y convergencia: decisión de la DH en **#292**.

**Doble `BaseConsolidadaPrototype`.** Dos archivos con el mismo rol:

1. `src/components/BaseConsolidadaPrototype` — 177.234 B, **VIVO**: importado por `App.tsx`.
2. `design/BaseConsolidadaPrototype` — 179.597 B, sin importadores en main; el **PR #238 (en cola) importa desde `design/`**, lo que activaría el duplicado en el build.

No se borra nada sin decisión de la DH (R13). El riesgo concreto: si #238 entra con el import de `design/`, dos prototipos con nombres idénticos conviven y el árbol vivo crece contra el muerto.

**`.env.example` documenta ambos selectores** — el operador puede encender cualquiera de los dos contratos; hoy solo `VITE_MOCK_API` tiene efecto en la app montada.

## 4. Qué cambió desde el 22-oct (propuesta de agent-anthropic)

La propuesta del 22-oct trabajaba sobre el handoff del 17-oct (base 77500be). Desde entonces, verificado en la cola del repo:

- La cola pasó de ~19 a ~50 PRs abiertos (frontend incluido: #224, #227, #229, #237, #238, #249, #275–#279, #280).
- Llegaron los lotes ARTEFACTOS (#267, #275–#279) y MARKET-CAP.
- `ci.yml` ya se resolvió (#262/#264): el diagnóstico «Actions caídas desde el 15-oct» del handoff ya no es el estado actual.
- RFC-027 (colaboración frontend) está en PR #225.
- El handoff del 17-oct queda atrás en varios puntos: este documento acredita el estado actual y es el que rige.

## 5. Decisiones que piden la DH

| # | Decisión | Dónde |
| --- | --- | --- |
| 1 | Contrato `DataSource` canónico: ratificar `lib/` vía ADR (recomendado — es el montado) · converger a `demo/` (ADR-029 literal) · coexistencia documentada | #292 |
| 2 | Destino de `design/BaseConsolidadaPrototype` (el PR #238 en cola lo importa) | #292 (comentario de traza) |
| 3 | Prioridad post-cascada: monolito `App.tsx` (#293) y middleware/live-ws en `vite.config.ts` (#294) | #293, #294 |

## Verificadores (reproducibles)

- `docs/ARCHITECTURE_STATE_v7.1.md` @ 77500be: blob `343719896e96552c31e0d0e1e23f9d205e2bb8b3`, 39003 B — contenido crudo verificado in-band (GitHub API `get_file_contents` → resource.text; SHA-1 del blob computado localmente, 2026-10-31).
- `README.md` @ 77500be: blob `9052fed709ff4bc4314ecf4b499b03a9c11b3fc2`, 16795 B — ídem.
- Este PR edita esos dos archivos con anclas únicas verificadas y agrega este documento. Docs-only: 0 dependencias, sin cambios de API ni de openapi (R9: sin rutas nuevas).
