# Registro de evidencia ejecutable

> **Re-base epistémico** (Aterrizaje PR 4 — issue #23). Estado en `main` vs estado en staging.
> **R4:** una evidencia pasa a `ok` solo con salida de comando o run verificable, anclado por SHA.
> **R15:** staging propone, GitHub acredita — ninguna evidencia sin CI run en main se etiqueta `ok` en main antes del merge que la prueba.
> **Vigencia de esta tabla:** hasta el próximo push a main. Última revisión contra API GitHub: main @ `c6d8d96` (2026-10-07).

## Scorecard

**CORE-001: 6/6** — completado el **2026-10-07**.

**CORE-002 (re-base epistémico v2): 6/6** — T1–T6 completados el **2026-10-07** vía PRs #69–#73 con delegación R8/R9 de la Dirección Humana registrada en #63 (registro textual del mensaje de delegación). Historia honesta: T1 guard R8 (#69) → T5 anti-PII (#70) → T4 contracts (#71) → T3 seed (#72) → T2 migración (#73). Bug latente del staging-only encontrado y corregido por la compuerta: el schema de `feat/core-002-schema @ 0d18f0f` nunca había pasado `prisma generate` (relación `categorias.capa` sin campo opuesto, P1012 — R15).

## Matriz de evidencia — main (CORE-001)

| Código | Título | Estado en **main** | Ancla main | Acreditación (salida real) |
|---|---|---|---|---|
| EV-001 | `docker compose up -d` levanta PostGIS sano | **ok** | `2482f63` | `postgis_version` → **3.4** (#1, 2026-10-07, Codespace) |
| EV-002 | `prisma migrate dev` aplica el schema sin errores | **ok** | `5c3a7a3` | DB desde cero: `0_init` + `20261006120000_territorios_geom_gist` aplicadas sin errores; tablas `events_raw`/`evidencias`/`territorios` creadas (#2; fix P12 vía PR #47) |
| EV-003 | `prisma generate` genera cliente tipado | **ok @ `ce2d736`** (2026-10-03, PR #7) | `ce2d736` | run [37098706368](https://github.com/carlosleonidas04-code/delocalsoy-ar/actions/runs/37098706368) |
| EV-004 | API `/health` responde 200 | **ok** | `5c3a7a3` | `{"status":"ok",...}` + `200`; `/api/health` → `mode:real`, `dataSource:postgres` (salto honesto desde `degraded/none`, R5) (#4) |
| EV-005 | Insert duplicado en `events_raw` rechazado (idempotencia) | **ok** | `5c3a7a3` | POST doble idéntico: 1º `creado`, 2º `duplicado`, mismo id/hash — `UNIQUE(hash)`, original intacto (#5) |
| EV-006 | Build del monorepo compila | **ok @ `ce2d736`/`7c8e267`** (2026-10-03, PRs #7/#8) | `ce2d736` | run [37098706368](https://github.com/carlosleonidas04-code/delocalsoy-ar/actions/runs/37098706368); compuerta CI verde en cada merge posterior (#44 → #73) |

## Matriz de evidencia — main (CORE-002, sprint #12)

| Código | Título | Estado | Ancla main | Acreditación (salida real) |
|---|---|---|---|---|
| EV-019 | Guard R8: escrituras de territorios exigen `x-api-key` (401 sin cabecera; fail-closed sin env) | **ok** | `8bcca71` (PR #69) | `territorios-guard.test.ts` (5 tests sin DB: POST/PUT/DELETE → 401, GET público, key correcta pasa el guard) — job `test` CI |
| EV-020 | Schema CORE-002 como migración versionada (P12: reproducción desde cero limpia) | **ok** | `c6d8d96` (PR #73) | Job `test` en DB nueva: `db:deploy` aplica `0_init` → `territorios_geom_gist` → `core002_schema` sin prompts ni DROP; `core002-schema.test.ts` verifica 5 tablas + triggers geom + índices GiST + `ST_AsText(geom)` = POINT(lng lat) |
| EV-021 | Seed idempotente nodos San Juan (ADR-021) + verificación bbox | **ok** | `9a72ceb` (PR #72) | `seed-territorios.test.ts` (comando real `db:seed` ×2): 0 duplicados, `activo` preservado, `bbox=-70.0,-32.0,-66.5,-29.0` devuelve Capital/Caucete/Iglesia |
| EV-022 | Adopción total de `@delocalsoy/contracts` en territorios (fin del Zod duplicado) | **ok** | `0b16d6a` (PR #71) | `grep "z.object" apps/api/src/routes/territorios.ts` → 0 resultados; `contracts-territorio.test.ts` (5 tests sobre TerritorioSchema + BboxStringSchema) |
| EV-023 | Anti-PII server-side en `POST /api/events` (ADR-020 cond.1, Ley 25.326) | **ok** | `17a7ad9` (PR #70) | `events-anti-pii.test.ts`: DNI `20.123.456`, CUIT `20-12345678-4`, email, teléfono `+54 11 1234 5678` → **400** sin eco del valor en respuesta ni logs |
| EV-024 | Tests de dominio en CI: auth 401, seed, bbox, anti-PII | **ok** | `c6d8d96` | Suite completa en main (8 archivos): health, events-idempotencia, territorios-guard, events-anti-pii, contracts-territorio, seed-territorios, core002-schema — cada dominio con happy path + rechazo; job `test` con PostGIS real corre en cada PR/push (workflows v12, PR #62) |

### Notas de auditoría CORE-002 (2026-10-07)

- **P15 (bug latente del staging-only)**: el schema de `feat/core-002-schema @ 0d18f0f` tenía la relación `categorias.capa` sin campo opuesto en `capas` (P1012). Nunca se ejecutó `prisma generate` sobre él. Detectado por la compuerta CI del PR #73 y corregido en el mismo PR — la "verdad técnica" trabajando: staging proponía, GitHub desacreditaba.
- **Merges del sprint**: autorizados por delegación R8/R9 de la Dirección Humana (mensaje textual registrado en #63, patrón de #23). Todos los PRs tuvieron CI verde (build + test con PostGIS) antes del merge.
- **Deuda restante**: lockfile de pnpm pendiente de regenerar localmente (`pnpm install` + commit) tras la incorporación de vitest y contracts al workspace de apps/api — CI usa `--no-frozen-lockfile` mientras tanto.

### Notas de auditoría CORE-001 (2026-10-07, registro completo en #23)

- **P12**: las tablas base nunca estaban versionadas — `migrations/` solo tenía la del geo. Fix: migración `0_init` (PR #47, squash → `5c3a7a3`). Reproducción desde cero ahora aplica limpia.
- **P13**: un cierre prematuro de EV-002 sin salida real fue detectado, revertido y re-acreditado con evidencia (R4).
- **P14**: syntax error en `0_init` (CONSTRAINT faltante en pkey de `territorios`) autodetectado por ejecución humana — fix `18cec243`.
- **Limitación operativa conocida**: `prisma migrate dev` interactivo propone `DROP INDEX idx_territorios_geom_gist` tras aplicar (Prisma no puede expresar índices GiST con `geom Unsupported`). En verificación interactiva, cancelar ese prompt; para verificación no interactiva usar `prisma migrate deploy`. Migraciones efímeras de diagnóstico nunca se commitearon.

### EV-007..EV-018 (staging v7.4 — sin aterrizar)

Catálogo completo vive en staging (18/18 verificadas en sandbox). Nada de esto acredita en main hasta que su PR correspondiente se abra y fusione con run verde:

- **EV-007/EV-008** — `firestore.rules` + PII: `evidencia-staging` (digest 57e88665 listo); **PR 3 no existe aún como rama real** (ver auditoría del 2026-10-06 en #23).
- **EV-009..EV-018** — suites `verify:*` y resto del aterrizaje v7.4: pendientes de PRs 3–6.

## Reglas

1. Una evidencia pasa a `ok` solo con salida de comando o resultado verificable adjunto.
2. Cambiar una decisión de `ARCHITECTURE_STATE_v7.1.md` requiere nueva evidencia.
3. Ninguna evidencia sin CI run en main se etiqueta como `ok` en main antes del merge de su PR (R15, ADR-019).
4. Toda fila `ok` lleva SHA ancla; sin SHA, la fila es `unbound` (lección del desempate EV-003/EV-006, #23).

## Prueba de desempate del hito actual (ejecutable)

```bash
gh run list --branch main --event push -L 5
# Hito: runs verify/ci en success sobre 43bb1ba..c6d8d96
# (remediación riesgos #52-#59 + sprint CORE-002 completo, 2026-10-07)
```

---

*Registrado por agent-vibe el 2026-10-07, verificado contra API GitHub. R15: este documento registra estados; acredita solo lo anclado con SHA y salida real.*

*CORE-002: 6/6 acreditadas — evita el cierre de issue sin ancla (R15). Issues T1–T6 (#63–#68) cerrados por sus PRs.*
