# NCAP-R2 — Activación territorial del Nodo Capital

**Nodo:** Capital · **Épica:** NODO-CAPITAL #152 · **Issue:** NCAP-R2 #154 · **Evidencia:** EV-048

Activación territorial del nodo Capital por directiva de la DH (2026-10-14:
subnodos primero, patrón VIG-001), sobre la estructura v0.1 ratificada
("RATIFICADO" en #154, 2026-10-13): los 2 distritos documentados en el
PEC Capital 2025/2026 (municipiosanjuan.gob.ar, vía documento fuente de la
DH #152) como hijos directos del nodo.

## Qué se acreditó

- Sin migración ni ruta nuevas: la tabla `subnodos` y la lectura pública
  `GET /api/nodos/capital/subnodos` (filtros `?type=` / `?parent=`) se
  reutilizan del VIG-001 (#171).
- Seed idempotente `packages/db/prisma/seed-subnodos-capital.sql`: 2 distritos
  con sellos `subnodo.creado` en `events_raw` (hash `seed-subnodo-<key>`,
  fuente `seed-ncap-r2`), encadenado a `db:seed`.
- Suite E2E `apps/api/src/subnodos-capital-rutas.test.ts` (contra Postgres/PostGIS
  real; sin base → skip honesto) + ajuste honesto de `subnodos-rutas.test.ts` y
  `showcase-demo.test.ts` al nuevo estado real.

## Matriz entidad ↔ boundary_status ↔ fuente (criterio de cierre de #154)

| Entidad | key | tipo | boundary_status | assignment_status | punto | fuente |
|---|---|---|---|---|---|---|
| Centro (distrito documentado PEC 2025) | `sj_capital_centro` | district | provisional | dh_directive | null (BAHRA/Georef a verificar) | PEC Capital 2025/2026 vía documento DH (#152), ratificación DH en #154 |
| Desamparados (distrito documentado PEC 2025) | `sj_capital_desamparados` | district | provisional | dh_directive | null (BAHRA/Georef a verificar) | ídem |

Toda la estructura nace `provisional` hasta el contraste UNIDE/Catastro
(ADR-035). Los puntos públicos quedan a verificar contra BAHRA/Georef:
sin punto verificado no se publica — lat/lng null honesto (R15), nunca
inventado.

## Lo que NO se siembra (regla de modelado central, #154)

Distrito oficial ≠ área funcional ≠ relación por corredor:

- **Áreas analíticas del Centro:** microcentro (PEC: Libertador–Córdoba–Alem–Rioja),
  macrocentro (provisional, método a definir), centro cívico (centralidad funcional).
- **Centralidades/hitos:** Plaza Salvador María del Carril + Basílica (plaza-desamparados),
  Facultad de Ingeniería UNSJ, Parque de Mayo — participan por relaciones
  `near` / `connects` SIN asignación distrital (red de corredores NCAP-R4 #156).
- **Subnodos futuros:** Concepción y Trinidad.

## Pendientes honestos

- Puntos BAHRA/Georef de los 2 distritos: a verificar.
- Límites provisionales hasta contraste UNIDE/Catastro (ADR-035).
- Serie contracts NCAP-R2: lotes 1–3 en rama `feat/ncap-r2-contratos-territoriales`;
  lote 4 a la espera del contenido de la DH (no se fabrica, R1/R15).
- ADR-037 (activación del nodo Capital): pendiente de RATIFICACIÓN de la DH en #152.

## Trazabilidad

- Decisiones: estructura v0.1 y nombres ratificados por la DH en #154
  ("RATIFICADO", 2026-10-13); orden de activación ratificado por la DH el
  2026-10-14 (activación territorial primero, luego serie contracts).
- Verificación: CI verde (build + test contra Postgres/PostGIS reales) en el
  PR de este sprint; E2E `subnodos-capital-rutas.test.ts` ejecuta el seed REAL.
- R9/R15: este documento + el código + las pruebas viven en el repo; nada
  de lo declarado aquí se publica sin fuente (Ley 25.326/ADR-036 sin PII).
