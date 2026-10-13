# Registro de evidencia ejecutable

> **Re-base epistémico** (Aterrizaje PR 4 — issue #23). Estado en `main` vs estado en staging.
> **R4:** una evidencia pasa a `ok` solo con salida de comando o run verificable, anclado por SHA.
> **R15:** staging propone, GitHub acredita — ninguna evidencia sin CI run en main se etiqueta `ok` en main antes del merge que la prueba.
> **Vigencia de esta tabla:** hasta el próximo push a main. Última revisión contra API GitHub: main @ `efaef1cfc1c315e6ff49049621b278ebad43461b` (2026-10-13 — NODO-VIG VIG-001 via PR #175; incluye los merges NODO-CAPITAL #160/#161 del 2026-10-13 que no habían movido esta línea).

## Scorecard

**CORE-001: 6/6** — completado el **2026-10-07**.

**CORE-002 (re-base epistémico v2): 6/6** — T1–T6 completados el **2026-10-07** vía PRs #69–#73 con delegación R8/R9 de la Dirección Humana registrada en #63 (registro textual del mensaje de delegación). Historia honesta: T1 guard R8 (#69) → T5 anti-PII (#70) → T4 contracts (#71) → T3 seed (#72) → T2 migración (#73). Bug latente del staging-only encontrado y corregido por la compuerta: el schema de `feat/core-002-schema @ 0d18f0f` nunca había pasado `prisma generate` (relación `categorias.capa` sin campo opuesto, P1012 — R15).

**Trilogía demo (#16/#17/#18): 3/3** — DEMO-1/2/3 completados el **2026-10-07** vía PRs #77/#78/#79 bajo la misma delegación R8/R9 (registrada en #16, #17 y #18). Nota de auditoría R15: los checkboxes pre-marcados de #17/#18 eran afirmaciones staging-only — des-marcados en DEMO-1 y re-ejecutados de verdad en #78/#79.

**CORE-003 (salto funcional, #83): 2/2** — R1/R2 (rutas del vocabulario + seed, PR #84 `e1d9512`) y R3 (`ApiDataSource` completo, PR #85 `cb197c4`) completados el **2026-10-07** bajo delegación R8/R9 registrada en #83. El demo en modo `api` consume ahora nodos/capas/categorías/features/reportes reales; única lectura vacía: `getEventos` (`events_raw` sin vínculo con nodos — deuda declarada en ADR-030).

**CORE-004 (columna vertebral, #87): 5/6 en curso** — sprint ratificado R9 el **2026-10-08**. R1 reconciliación documental completada (PR #88 `c7cfac1`): OpenAPI v7.7.0 documenta las 11 rutas vivas de `app.ts`, ARCHITECTURE_STATE/README al estado real, ADR-031/032/033 ratificados, regla documental permanente. R3 identidad por etapas completada (PR #90 `f87b2ea` + PR #91 `3861fa5`, ADR-031): guard H-01 de la auditoría T2 (la ingesta pública rechaza `system.*`) + JWT HS256 con roles `ciudadano/moderador/admin` y sesiones selladas sin PII. R4 asincronía completada (PR #93 `99cfe45` + PR #94 `6441ca8`, ADR-032): transporte Redis Streams — `POST /api/events` persiste en `events_raw` (única verdad) y publica referencia `{event_id, type, hash, occurred_at}` al stream `events:raw` (fail-open; health reporta `redis: ok|down`) — y worker idempotente con consumer group `core004-worker` que proyecta exactamente una vez a `event_projections`. R2 cierre de residuos completada (PR #105 `c048cc5`, EV-036): #51/#56 cerrados con verificación ejecutable y ramas saneadas. R5 dominio `activos` completado: R5a endurecimiento de identidad (PR #110 `cae25c4` — auditoría agent-perplexity #99–#102: anti-enumeración por timing en login, rate limiting 429 por IP+hash(email), 5xx sanitizados, `/me` con manejo de errores) + R5b dominio (PR #111 `a64685d`, EV-034): escritura ciudadana verificada con pseudónimo sha256 truncado sin PII (Ley 25.326), anti-PII compartido, sellos `activo.*` en `events_raw` con rollback, moderación `moderador|admin` y lectura pública bbox. Pendiente: R6 (flujo vertical en CI).

**NODO-CAU (épica #137): R1/5 completada — en curso** — activación en profundidad del nodo caucete ratificada R9 el **2026-10-11** (comentarios de la DH en #137/#138/#140 + confirmación textual registrada). R1 vocabulario v6 aterrizada (PR #143 `8a394b193dd543b4154b0111aeda97cffccd8d2f`, EV-037): 5 capas nuevas (`hydrology`, `seismic_risk`, `public_space`, `accessibility`, `sustainability`), 10 categorías, features de diseño y paridad synthetic. ADR-035 ratificado (#138). Pendientes: R2 fuentes científicas, R4 cruce público↔in-situ, R5 servicio informativo.

**NODO-CAPITAL (épica #152): en curso** — NCAP-R6 Banco de Potencialidades mergeado el **2026-10-13** (PR #160 → main @ `c0e3e58`) y NCAP-R7 especificación canónica (PR #161 → main @ `bbffbaf`). **Deuda documental declarada (R15):** el registro de EV-039 (Bloque 9) quedó omitido en esos merges — pendiente de su PR de registro; la serie contracts NCAP-R2 avanza en rama `feat/ncap-r2-contratos-territoriales` (lotes 1–4, PR único al final, #154).

**NODO-VIG (épica #167): VIG-001 completada** — base territorial del Valle de Iglesia ratificada R9 el **2026-10-13** (declaración de la DH "ratificaciones hechas" + merge) y mergeada (PR #175 → main @ `efaef1c`, EV-040): tabla `subnodos` con jerarquía distrito → paraje → subparaje + localidad INDEC, seed idempotente del primer lote ratificado por la DH (34 entidades; 18 del segundo lote diferidas por decisión DH). Etiqueta pública "Villa Iglesia" ratificada por la DH (2026-10-13). Pendientes: VIG-002..VIG-007, segundo lote de parajes.

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
| EV-036 | CORE-004 R2 (#87): cierre de residuos — #56 (higiene de ramas) y #51 (plan de remediación post-CORE-001) cerrados con verificación ejecutable; prune de 5 ramas de PRs mergeados (#71/#89/#92/#94/#95) con pre-chequeo tip = `headRefOid` del PR (cero trabajo no aterrizado); `baseline/core003-d70cbc6` conservada como ancla de rollback (ADR-033); prevención: `delete_branch_on_merge=true` (auditoría AUD-03 #98) | **ok** | `45e60f5` | `gh api repos/carlosleonidas04-code/delocalsoy-ar/branches --jq '.[].name'` → `baseline/core003-d70cbc6`, `main`; `gh api repos/carlosleonidas04-code/delocalsoy-ar --jq .delete_branch_on_merge` → `true`; #52–#59 y #51 → `CLOSED` (registro en #98, #56, #51) |
| EV-034 | CORE-004 R5 (#87): dominio `activos` — escritura ciudadana verificada (R5b, PR #111 `a64685d`; sobre la base endurecida de R5a, PR #110 `cae25c4`, auditoría #99–#102): `POST /api/activos` autenticado (`requireJwt`) crea el activo en estado `propuesto` con autor pseudonimizado `created_by_hash` = sha256(usuario_id) truncado (sin PII — Ley 25.326, ADR-027); anti-PII compartido (`lib/anti-pii.ts`) sobre título/descripción ANTES de persistir (ADR-020 cond. 1, sin eco del valor); sello `activo.propuesto` en `events_raw` con rollback del activo si el sello falla (R4/R15) + referencia al stream `events:raw` (ADR-032, fail-open); `GET /api/activos` público y anónimo con `?bbox=` PostGIS (ST_Intersects sobre índice GiST) y filtros `?estado=`/`?nodo=`; `PATCH /api/activos/:id/estado` moderación `moderador|admin` con sello `activo.estado_cambiado` y rollback; migración `20261008200000_r5b_activos` (trigger geom lat/lng + índice GiST, patrón core002); contratos `ActivoTipoSchema`/`ActivoEstadoSchema`/`ActivoAltaSchema`/`ActivoEstadoCambioSchema` en `@delocalsoy/contracts` | **ok** | `a64685d` (PR #111) | `activos-rutas.test.ts` (7 tests contra PostGIS+Redis reales, job `test` del PR #111 verde — build×2 + test×2 + compuerta `success`): 401 sin sesión; 201 `propuesto` con pseudónimo `^[0-9a-f]{32}$` + sello `activo.propuesto` en `events_raw` sin email ni PII; anti-PII → 400 sin eco del valor; GET bbox anónimo incluye San Juan y excluye Buenos Aires (recorte espacial real, geometry GeoJSON `Point`); moderación 403 ciudadano → 200 moderador con sello `activo.estado_cambiado` → 409 repetido; lat 999 → 400 (contrato Zod). Migración aplicada desde cero en CI (`migrate deploy` sin prompts sobre DB nueva) |

## Matriz de evidencia — main (NODO-CAU R1, épica #137)

| Código | Título | Estado | Ancla main | Acreditación (salida real) |
|---|---|---|---|---|
| EV-037 | NODO-CAU R1 (#141, épica #137): vocabulario v6 del nodo caucete — capas `hydrology`/`seismic_risk`/`public_space`/`accessibility`/`sustainability` (10 capas totales del nodo) + 10 categorías + features de diseño `seed-f-cau-201..205` + reporte demo `flood_risk`; paridad `syntheticData.js`; decisión #140 opción B ratificada (`hydrology` declarada `LineString`, features Point v1); ADR-035 ratificado | **ok** | `8a394b193dd543b4154b0111aeda97cffccd8d2f` (PR #143) | Job `test` del PR #143 verde (runs 38173461713/38173461718: build×2 + test×2 + scope + compuerta `success`): `nodos-rutas.test.ts` con PostGIS real — `db:seed` re-ejecutado sin duplicados (idempotencia total con las filas v6) e integridad categoría→capa verificada en los 3 nodos con las categorías nuevas. Verificación de conteo por `GET /api/nodos/caucete/capas` (10 capas) ejecutable contra despliegue — no reclamada sin salida (R5) |

## Matriz de evidencia — main (NODO-VIG VIG-001, épica #167)

| Código | Título | Estado | Ancla main | Acreditación (salida real) |
|---|---|---|---|---|
| EV-040 | NODO-VIG VIG-001 (#171, épica #167): base territorial del Valle de Iglesia — tabla `subnodos` (jerarquía distrito → paraje → subparaje + localidad INDEC, self-relation `parent_key` → `subnodos.key`, sin geometría propia — criterio estructural #149/#167, patrón `oportunidades`); migración `20261013180000_vig001_subnodos`; seed idempotente `seed-subnodos.sql` del primer lote ratificado por la DH (34 entidades: 6 distritos, Pismanta → las-flores con centroide Georef 70049050, 22 parajes/subparaje de valle con `nearest_district_provisional`, Paso del Agua Negra → rodeo y Paso Pascua Lama → nodo, 3 locales sin BAHRA con lat/lng null — R15/ADR-036); `GET /api/nodos/:key/subnodos` con filtros `?type=`/`?parent=` (`none` = hijos directos del nodo); sellos `subnodo.creado` en `events_raw` (hash `seed-subnodo-<key>`, payload sin PII); contratos `Subnodo*` en `@delocalsoy/contracts`; OpenAPI v7.13.0 + ARCHITECTURE_STATE + README en el mismo PR (regla documental R9) | **ok** | `efaef1c` (PR #175) | Job `test` del PR #175 verde (runs [38436411325](https://github.com/carlosleonidas04-code/delocalsoy-ar/actions/runs/38436411325) / [38436411002](https://github.com/carlosleonidas04-code/delocalsoy-ar/actions/runs/38436411002): build×2 + test×2 + scope + compuerta `success`): `subnodos-rutas.test.ts` contra PostGIS/Redis reales con `db:deploy` desde cero — 34 entidades (segundo lote ausente por diseño), 6 distritos parent null y lat/lng null, Pismanta `external_id=70049050` (georef), subparaje Malimán de Arriba → Malimán (A33), rodeo con Dique Cuesta del Viento (A19) + Paso del Agua Negra (A37, `dh_directive`) + Colola (sin punto publicado), `parent=none` = 7 con Paso Pascua Lama (A38, `alta_cordillera`), 22 provisionales con punto BAHRA, 404 nodo inexistente / 400 filtros inválidos, `capital`/`caucete` → count 0 honesto, idempotencia del seed re-ejecutado (sin duplicar filas ni sellos), 34 sellos `subnodo.creado` con payload sin PII |

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
# Hito: runs verify/ci en success sobre 43bb1ba..a64685d
# (remediación riesgos #52-#59 + sprint CORE-002 + riesgo 6 #57 + trilogía
# demo #16/#17/#18 + CORE-003 salto funcional #83, 2026-10-07;
# CORE-004 R1 reconciliación documental + R3 identidad ADR-031
# (#88/#90/#91) + R4 asincronía ADR-032: transporte Redis Streams
# + worker idempotencia (#93/#94) + R2 cierre de residuos (#105, EV-036)
# + R5 dominio activos: endurecimiento #99-#102 (#110) + escritura
# ciudadana verificada (#111, EV-034), 2026-10-08)
```

---

*Registrado por agent-vibe el 2026-10-08, verificado contra API GitHub. R15: este documento registra estados; acredita solo lo anclado con SHA y salida real.*

*CORE-002: 6/6 acreditadas — evita el cierre de issue sin ancla (R15). Issues T1–T6 (#63–#68) cerrados por sus PRs.*

*Trilogía demo (#16/#17/#18): cerrada por sus PRs (#77 `713fd36` / #78 `315c462` / #79 `3bd802c`), con EV-026..EV-028 ancladas. Modo api del demo: solo datos reales; lo pendiente declarado vacío (R15).*

*CORE-003 (#83): cerrado — EV-029 (`e1d9512`) / EV-030 (`cb197c4`) ancladas; el contrato `DataSource` queda servido completo por el backend (`getEventos`: deuda declarada en ADR-030).*

*CORE-004 (#87): en curso — ratificado R9 el 2026-10-08; R1 completada (PR #88 `c7cfac1`, EV-031 anclada); R3 completada (PR #90 `f87b2ea` + PR #91 `3861fa5`, EV-032 anclada — identidad JWT/roles ADR-031 y cierre del hallazgo H-01 de la auditoría T2); R4 completada (PR #93 `99cfe45` + PR #94 `6441ca8`, EV-033 anclada — transporte Redis Streams + worker idempotente, ADR-032); R2 completada (EV-036 anclada a `45e60f5` — #56 y #51 cerrados con verificación ejecutable, ramas saneadas; auditoría AUD-01/AUD-03 #96/#98); R5 completada (R5a PR #110 `cae25c4` + R5b PR #111 `a64685d`, EV-034 anclada — dominio `activos`: escritura ciudadana verificada con pseudónimo sha256 sin PII, moderación y lectura bbox); ADR-031/032/033 ratificados; R6 pendiente.*

*NODO-VIG (#167): VIG-001 cerrada — EV-040 anclada a `efaef1c` (PR #175, CI 100% verde, squash). Ratificación DH 2026-10-13 ("ratificaciones hechas"); #171 cerrado por merge. Etiqueta pública "Villa Iglesia" ratificada por la DH el mismo día.*
