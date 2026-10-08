# Registro de evidencia ejecutable

> **Re-base epistémico** (Aterrizaje PR 4 — issue #23). Estado en `main` vs estado en staging.
> **R4:** una evidencia pasa a `ok` solo con salida de comando o run verificable, anclado por SHA.
> **R15:** staging propone, GitHub acredita — ninguna evidencia sin CI run en main se etiqueta `ok` en main antes del merge que la prueba.
> **Vigencia de esta tabla:** hasta el próximo push a main. Última revisión contra API GitHub: main @ `6441ca8` (2026-10-08).

## Scorecard

**CORE-001: 6/6** — completado el **2026-10-07**.

**CORE-002 (re-base epistémico v2): 6/6** — T1–T6 completados el **2026-10-07** vía PRs #69–#73 con delegación R8/R9 de la Dirección Humana registrada en #63 (registro textual del mensaje de delegación). Historia honesta: T1 guard R8 (#69) → T5 anti-PII (#70) → T4 contracts (#71) → T3 seed (#72) → T2 migración (#73). Bug latente del staging-only encontrado y corregido por la compuerta: el schema de `feat/core-002-schema @ 0d18f0f` nunca había pasado `prisma generate` (relación `categorias.capa` sin campo opuesto, P1012 — R15).

**Trilogía demo (#16/#17/#18): 3/3** — DEMO-1/2/3 completados el **2026-10-07** vía PRs #77/#78/#79 bajo la misma delegación R8/R9 (registrada en #16, #17 y #18). Nota de auditoría R15: los checkboxes pre-marcados de #17/#18 eran afirmaciones staging-only — des-marcados en DEMO-1 y re-ejecutados de verdad en #78/#79.

**CORE-003 (salto funcional, #83): 2/2** — R1/R2 (rutas del vocabulario + seed, PR #84 `e1d9512`) y R3 (`ApiDataSource` completo, PR #85 `cb197c4`) completados el **2026-10-07** bajo delegación R8/R9 registrada en #83. El demo en modo `api` consume ahora nodos/capas/categorías/features/reportes reales; única lectura vacía: `getEventos` (`events_raw` sin vínculo con nodos — deuda declarada en ADR-030).

**CORE-004 (columna vertebral, #87): 3/6 en curso** — sprint ratificado R9 el **2026-10-08**. R1 reconciliación documental completada (PR #88 `c7cfac1`): OpenAPI v7.7.0 documenta las 11 rutas vivas de `app.ts`, ARCHITECTURE_STATE/README al estado real, ADR-031/032/033 ratificados, regla documental permanente. R3 identidad por etapas completada (PR #90 `f87b2ea` + PR #91 `3861fa5`, ADR-031): guard H-01 de la auditoría T2 (la ingesta pública rechaza `system.*`) + JWT HS256 con roles `ciudadano/moderador/admin` y sesiones selladas sin PII. R4 asincronía completada (PR #93 `99cfe45` + PR #94 `6441ca8`, ADR-032): transporte Redis Streams — `POST /api/events` persiste en `events_raw` (única verdad) y publica referencia `{event_id, type, hash, occurred_at}` al stream `events:raw` (fail-open; health reporta `redis: ok|down`) — y worker idempotente con consumer group `core004-worker` que proyecta exactamente una vez a `event_projections`. Pendiente: R2 (cierre de residuos), R5 (dominio `activos`), R6 (flujo vertical en CI).

## Matriz de evidencia — main (CORE-001)

| Código | Título | Estado en **main** | Ancla main | Acreditación (salida real) |
|---|---|---|---|---|
| EV-001 | `docker compose up -d` levanta PostGIS sano | **ok** | `2482f63` | `postgis_version` → **3.4** (#1, 2026-10-07, Codespace) |
| EV-002 | `prisma migrate dev` aplica el schema sin errores | **ok** | `5c3a7a3` | DB desde cero: `0_init` + `20261006120000_territorios_geom_gist` aplicadas sin errores; tablas `events_raw`/`evidencias`/`territorios` creadas (#2; fix P12 vía PR #47) |
| EV-003 | `prisma generate` genera cliente tipado | **ok @ `ce2d736`** (2026-10-03, PR #7) | `ce2d736` | run [37098706368](https://github.com/carlosleonidas04-code/delocalsoy-ar/actions/runs/37098706368) |
| EV-004 | API `/health` responde 200 | **ok** | `5c3a7a3` | `{"status":"ok",...}` + `200`; `/api/health` → `mode:real`, `dataSource:postgres` (salto honesto desde `degraded/none`, R5) (#4). **Actualizado 2026-10-07 (riesgo #57, ADR-028):** la ruta legada `/health` fue retirada; el único health es `/api/health` (R5) — ver EV-025 |
| EV-005 | Insert duplicado en `events_raw` rechazado (idempotencia) | **ok** | `5c3a7a3` | POST doble idéntico: 1º `creado`, 2º `duplicado`, mismo id/hash — `UNIQUE(hash)`, original intacto (#5) |
| EV-006 | Build del monorepo compila | **ok @ `ce2d736`/`7c8e267`** (2026-10-03, PRs #7/#8) | `ce2d736` | run [37098706368](https://github.com/carlosleonidas04-code/delocalsoy-ar/actions/runs/37098706368); compuerta CI verde en cada merge posterior (#44 → #91) |

## Matriz de evidencia — main (CORE-002, sprint #12)

| Código | Título | Estado | Ancla main | Acreditación (salida real) |
|---|---|---|---|---|
| EV-019 | Guard R8: escrituras de territorios exigen `x-api-key` (401 sin cabecera; fail-closed sin env) | **ok** | `8bcca71` (PR #69) | `territorios-guard.test.ts` (5 tests sin DB: POST/PUT/DELETE → 401, GET público, key correcta pasa el guard) — job `test` CI |
| EV-020 | Schema CORE-002 como migración versionada (P12: reproducción desde cero limpia) | **ok** | `c6d8d96` (PR #73) | Job `test` en DB nueva: `db:deploy` aplica `0_init` → `territorios_geom_gist` → `core002_schema` sin prompts ni DROP; `core002-schema.test.ts` verifica 5 tablas + triggers geom + índices GiST + `ST_AsText(geom)` = POINT(lng lat) |
| EV-021 | Seed idempotente nodos San Juan (ADR-021) + verificación bbox | **ok** | `9a72ceb` (PR #72) | `seed-territorios.test.ts` (comando real `db:seed` ×2): 0 duplicados, `activo` preservado, `bbox=-70.0,-32.0,-66.5,-29.0` devuelve Capital/Caucete/Iglesia |
| EV-022 | Adopción total de `@delocalsoy/contracts` en territorios (fin del Zod duplicado) | **ok** | `0b16d6a` (PR #71) | `grep "z.object" apps/api/src/routes/territorios.ts` → 0 resultados; `contracts-territorio.test.ts` (5 tests sobre TerritorioSchema + BboxStringSchema) |
| EV-023 | Anti-PII server-side en `POST /api/events` (ADR-020 cond.1, Ley 25.326) | **ok** | `17a7ad9` (PR #70) | `events-anti-pii.test.ts`: DNI `20.123.456`, CUIT `20-12345678-4`, email, teléfono `+54 11 1234 5678` → **400** sin eco del valor en respuesta ni logs |
| EV-024 | Tests de dominio en CI: auth 401, seed, bbox, anti-PII | **ok** | `c6d8d96` | Suite completa en main (9 archivos): health, events-idempotencia, territorios-guard, events-anti-pii, contracts-territorio, seed-territorios, core002-schema, nodos-rutas — cada dominio con happy path + rechazo; job `test` con PostGIS real corre en cada PR/push (workflows v13) |

## Matriz de evidencia — main (remediación de riesgos, tracker #51)

| Código | Título | Estado | Ancla main | Acreditación (salida real) |
|---|---|---|---|---|
| EV-025 | Riesgo 6 (#57): retiro de `/health` legado + binding conservador HOST/allowedHosts (ADR-028) | **ok** | `4f0de16` (PR #75) | `health.test.ts`: `GET /health` → **404**, `/api/health` → **200** (regresión cubierta) — job `test` CI con PostGIS; verificación previa de consumidores (0 legítimos) registrada en #57; `server.ts` sin `HOST` bindea `127.0.0.1` (criterio: no escucha interfaces externas) |

## Matriz de evidencia — main (trilogía demo #16–#18)

| Código | Título | Estado | Ancla main | Acreditación (salida real) |
|---|---|---|---|---|
| EV-026 | DEMO-1 (#16): demo sintético v5.1 aislado en apps/web — ruta `/demo`, lazy import, banner de honestidad, fuera de la navegación principal | **ok** | `713fd36` (PR #77) | Build `tsc -b` + vite verde en CI (allowJs/checkJs para el .jsx); demo autodeclarado sintético (R5). Hallazgo R15 en camino: checkboxes pre-marcados de #17/#18 sin trabajo real — des-marcados |
| EV-027 | DEMO-2 (#17): contrato `DataSource` — UI del demo desacoplada del origen de datos; suite de tests web en CI | **ok** | `315c462` (PR #78) | `dataSource.contract.test.ts` (SyntheticDataSource + fixture FakeDataSource verifican el mismo contrato observable: integridad categoría→capa, claves únicas, `asset|problem`, copia defensiva); paso `pnpm --filter @delocalsoy/web test` agregado a `ci.yml`/`verify.yml` (v13); literales extraídos a `syntheticData.js` (.js fuera del typecheck estricto) |
| EV-028 | DEMO-3 (#18): `ApiDataSource` sobre `/api/*` (proxy 1:1) + selector `VITE_DATA_SOURCE` (ADR-029); modo api = solo datos reales, lo pendiente declarado vacío | **ok** | `3bd802c` (PR #79) | `apiDataSource.mapping.test.ts` (fetch mockeado, sin red): mapeo `{success,data,count}` de territorios y `{count,evidencias}` de evidencias al contrato; rechazo honesto de HTTP 500 y `success:false`; lecturas sin ruta en el backend → vacías (R15: no simular). Fix en camino detectado por la compuerta CI: TS2322 (`bannerStyle.position` fuera del JSX) — corregido antes del merge |

## Matriz de evidencia — main (CORE-003, salto funcional #83)

| Código | Título | Estado | Ancla main | Acreditación (salida real) |
|---|---|---|---|---|
| EV-029 | CORE-003 R1/R2 (#83): rutas de lectura del vocabulario CORE-002 + seed idempotente del vocabulario v5.1 (nodos con población INDEC 2022 y centro, capas, categorías, features de diseño con lat/lng reales, reportes demo) | **ok** | `e1d9512` (PR #84) | `nodos-rutas.test.ts` en CI con PostGIS real: `GET /api/nodos` → 3 nodos con población > 0 y centro; 404 honesto en key inexistente; catálogo capital completo (6 capas); integridad categoría→capa en los 3 nodos; features con lat/lng de San Juan y fuente "Ilustrativa · …"; `db:seed` re-ejecutado sin duplicados (idempotencia total) |
| EV-030 | CORE-003 R3 (#83): `ApiDataSource` completo — contrato `DataSource` servido 100% por el backend; demo en modo `api` con datos reales | **ok** | `cb197c4` (PR #85) | `apiDataSource.mapping.test.ts` (fetch mockeado, sin red): `getTerritorios` ← `GET /api/nodos` con población/foco/subtitle/centro reales (fin de los campos vacíos de #18); capas/categorías/features/reportes mapeados; proyección de presentación lat/lng→x/y verificada en (50, 50) y (0, 0) (ADR-030); `getEventos` declarado vacío (deuda explícita) |

## Matriz de evidencia — main (CORE-004, columna vertebral #87)

| Código | Título | Estado | Ancla main | Acreditación (salida real) |
|---|---|---|---|---|
| EV-031 | CORE-004 R1 (#87): reconciliación documental — `docs/api/openapi.json` **v7.7.0** documenta todas las rutas vivas de `app.ts` (11 paths, incluidas las 6 de `/api/nodos`); `ARCHITECTURE_STATE_v7.1.md` declara el sprint vigente real (CORE-004); README al estado real (apps/web, contracts, demo modo api); ADR-031/032/033 ratificados R9 en #87; regla documental permanente (todo PR con rutas/arquitectura actualiza OpenAPI + ARCHITECTURE_STATE + README) | **ok** | `c7cfac1` (PR #88) | Verificación 1:1 rutas `app.ts` @ `d70cbc6` = paths del spec (11/11). Compuerta CI del PR #88 verde: build×2 + test×2 `success` — incluye el test de contrato OpenAPI↔rutas (ningún path del spec responde 404) contra PostGIS real |
| EV-032 | CORE-004 R3 (#87): identidad por etapas (ADR-031) — guard H-01 (PR #90 `f87b2ea`): la ingesta pública `POST /api/events` rechaza `system.*` con 403 (el `mode` de `/api/health` no se falsifica); auth (PR #91 `3861fa5`): `POST /api/auth/register|login|me` con scrypt + JWT HS256 (`node:crypto`, 0 dependencias nuevas), roles `ciudadano/moderador/admin`, `requireJwt`/`requireRole` fail-closed (503 sin `JWT_SECRET` ≥16 chars); sellos `system.user_registered`/`system.user_session` sin email (Ley 25.326) | **ok** | `3861fa5` (PRs #90/#91) | `auth-rutas.test.ts` en CI con PostGIS real: 9 tests (registro/login/me, JWT y rol verificados, 403 rol insuficiente, 401 sin token) + guard H-01: evento `system.*` público → 403 y `mode` sin cambio; job `test` del PR #91 verde (build×2 + test×2 `success`). **Corrección 2026-10-08 (R5):** los roles reales de `auth.ts` son `ciudadano/moderador/admin`; la redacción original de esta fila (`gestor/auditor`) era errónea — ancla, tests y guard no cambian |
| EV-033 | CORE-004 R4 (#87): asincronía (ADR-032) — transporte (PR #93 `99cfe45`): `POST /api/events` persiste en `events_raw` (única fuente de verdad) y publica referencia `{event_id, type, hash, occurred_at}` al stream `events:raw` (fail-open: Redis caído no rompe la ingesta; `/api/health` reporta `redis: ok|down`); worker idempotente (PR #94 `6441ca8`): consumer group `core004-worker` con `XREADGROUP` + `XAUTOCLAIM` (recupera pendientes >1 s) + `XACK`, verifica `event_id`+`hash` contra `events_raw`, proyecta exactamente una vez a `event_projections` (única por `event_id`; P2002 = re-entrega tolerada), descarta huérfanas con ack, no ackea errores reales (vuelven por XAUTOCLAIM); cliente RESP compartido en `packages/redis` (`node:net`, 0 dependencias nuevas) | **ok** | `6441ca8` (PRs #93/#94) | `redis-transporte.test.ts` (5 tests: publish tras persistir, duplicado no re-publica, health `redis:ok`, sello de PATCH /mode al stream, fail-open con Redis caído) + `worker-consume.test.ts` (4 tests: exactamente-una-vez con `XPENDING` 0, re-entrega P2002 sin duplicar, recuperación `XAUTOCLAIM` de consumidor caído, huérfana descartada) contra PostGIS + Redis reales en CI — job `test` del PR #94 verde (build×2 + test×2 `success`) |

### Notas de auditoría CORE-002 (2026-10-07)

- **P15 (bug latente del staging-only)**: el schema de `feat/core-002-schema @ 0d18f0f` tenía la relación `categorias.capa` sin campo opuesto en `capas` (P1012). Nunca se ejecutó `prisma generate` sobre él. Detectado por la compuerta CI del PR #73 y corregido en el mismo PR — la "verdad técnica" trabajando: staging proponía, GitHub desacreditaba.
- **Merges del sprint**: autorizados por delegación R8/R9 de la Dirección Humana (mensaje textual registrado en #63, patrón de #23). Todos los PRs tuvieron CI verde (build + test con PostGIS) antes del merge.
- **Riesgo 6 (#57)**: ejecutado bajo la misma delegación (registrada en #57). Fix en camino del PR #75: el tipo `allowedHosts` de Vite admite `true | string[] | undefined`, no `false` — la compuerta CI lo detectó en el primer push y se corrigió antes del merge.
- **Deuda lockfile (resuelta 2026-10-07)**: regenerado y commiteado por la Dirección Humana (PR #81, `1a7b80d`); vitest actualizado a 4.1.11 por Dependabot con compuerta verde (PR #82, `8bbe4f1`).

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
# Hito: runs verify/ci en success sobre 43bb1ba..6441ca8
# (remediación riesgos #52-#59 + sprint CORE-002 + riesgo 6 #57 + trilogía
# demo #16/#17/#18 + CORE-003 salto funcional #83, 2026-10-07;
# CORE-004 R1 reconciliación documental + R3 identidad ADR-031
# (#88/#90/#91) + R4 asincronía ADR-032: transporte Redis Streams
# + worker idempotente (#93/#94), 2026-10-08)
```

---

*Registrado por agent-vibe el 2026-10-08, verificado contra API GitHub. R15: este documento registra estados; acredita solo lo anclado con SHA y salida real.*

*CORE-002: 6/6 acreditadas — evita el cierre de issue sin ancla (R15). Issues T1–T6 (#63–#68) cerrados por sus PRs.*

*Trilogía demo (#16/#17/#18): cerrada por sus PRs (#77 `713fd36` / #78 `315c462` / #79 `3bd802c`), con EV-026..EV-028 ancladas. Modo api del demo: solo datos reales; lo pendiente declarado vacío (R15).*

*CORE-003 (#83): cerrado — EV-029 (`e1d9512`) / EV-030 (`cb197c4`) ancladas; el contrato `DataSource` queda servido completo por el backend (`getEventos`: deuda declarada en ADR-030).*

*CORE-004 (#87): en curso — ratificado R9 el 2026-10-08; R1 completada (PR #88 `c7cfac1`, EV-031 anclada); R3 completada (PR #90 `f87b2ea` + PR #91 `3861fa5`, EV-032 anclada — identidad JWT/roles ADR-031 y cierre del hallazgo H-01 de la auditoría T2); R4 completada (PR #93 `99cfe45` + PR #94 `6441ca8`, EV-033 anclada — transporte Redis Streams + worker idempotente, ADR-032); ADR-031/032/033 ratificados; R2, R5, R6 pendientes.*