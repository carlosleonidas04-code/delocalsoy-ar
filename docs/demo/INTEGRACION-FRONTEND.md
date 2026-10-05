# Plan de integración: Demo sintético → apps/web → backend

> Estado: **PLAN** (pendiente de ejecución). Este documento no registra evidencia; solo define el camino.
> Referencia: docs/demo/delocalsoy-demo-territorial-federado.jsx (v5.1) y docs/demo/DEMO-NOTES.md.

## Principios (heredados de la gobernanza)

- El demo es **referencia visual con datos 100% sintéticos**. No es núcleo Track A.
- Todo cambio va por PR, con CI verde. Sin push directo a main.
- Ningún dato sintético puede mezclarse con datos reales sin pasar por el contrato de adaptadores.

## Fase 0 — Precondición (bloqueante)

- [ ] EV-001 cerrada (#1) — PostGIS sano
- [ ] EV-002 cerrada (#2) — migración aplicada
- [ ] EV-004 cerrada (#4) — /health responde 200
- [ ] EV-005 cerrada (#5) — idempotencia verificada
- [ ] PR frontend (feat/frontend-web → main) revisado y mergeado

## Fase 1 — Aislar el demo en apps/web (sin tocar el núcleo)

Objetivo: el componente v5.1 corre dentro de apps/web sin depender del backend.

- [ ] Copiar `docs/demo/delocalsoy-demo-territorial-federado.jsx` → `apps/web/src/demo/DemoTerritorialFederado.tsx` (o .jsx con allowJs)
- [ ] Renombrar el componente a `DemoTerritorialFederado` y exportarlo nombrado
- [ ] Crear ruta `/demo` con lazy import + banner fijo: "Datos 100% sintéticos — referencia visual"
- [ ] NO registrar la ruta en la navegación principal del futuro frontend
- [ ] Verificar: `pnpm --filter @delocalsoy/web typecheck` y `build` en verde

Rama sugerida: `feat/demo-web-aislado`

## Fase 2 — Extraer la capa de datos (contrato de adaptadores)

Objetivo: separar la UI del origen de datos para que el mismo componente sirva con mock y con API real.

- [ ] Definir tipos del contrato: `Territorio`, `EventoTerritorial`, `Evidencia`, `Metrica` (alinear con schema de @delocalsoy/db)
- [ ] Crear interfaz `DataSource` con métodos equivalentes a los endpoints del API (p. ej. `getTerritorios()`, `getEventos(territorioId)`)
- [ ] Implementar `SyntheticDataSource`: encapsula los arrays hardcodeados del demo detrás del contrato
- [ ] Refactor del componente: consumir `DataSource` en vez de datos inline
- [ ] Tests: mismo contrato, dos implementaciones

Rama sugerida: `feat/demo-datasource-contract`

## Fase 3 — Conexión al backend real

Objetivo: reemplazar SyntheticDataSource por ApiDataSource sin cambiar la UI.

- [ ] Implementar `ApiDataSource` sobre `/api/*` vía el proxy Vite (`/api` → localhost:3000)
- [ ] Mapear respuestas del API (auth, territorios del sprint CORE-002) al contrato
- [ ] Feature flag o switch simple entre `synthetic` y `api` (env `VITE_DATA_SOURCE`)
- [ ] Validar con /health + endpoints reales
- [ ] El banner "datos sintéticos" solo aparece cuando `VITE_DATA_SOURCE=synthetic`

Rama sugerida: `feat/demo-api-datasource`

## Fase 4 — Evolución a frontend productivo

- [ ] El diseño validado del demo informa los componentes reales de apps/web
- [ ] El demo se mantiene solo como referencia bajo /demo o se archiva
- [ ] Actualizar docs/ARCHITECTURE_STATE y README según lo que realmente exista

## Criterio de éxito global

1. El demo corre aislado en /demo con banner de datos sintéticos.
2. La UI no sabe si consume mock o API (solo ve DataSource).
3. El pasaje a datos reales es un cambio de configuración, no de código de UI.
