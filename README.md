# DELocalSoy.AR — Monorepo (v7.1)

Relanzamiento de DELocalSoy.AR. Este repositorio es la **verdad técnica**: toda afirmación sobre el sistema debe estar respaldada por evidencia ejecutable anclada a SHA de `main` (R4/R15).

## Estructura

- `apps/api` — API Express: health honesto (R5), identidad JWT/RBAC (`/api/auth`, ADR-031), territorios bbox, vocabulario `/api/nodos`, jerarquía territorial del Valle de Iglesia (`/api/nodos/:key/subnodos` — VIG-001 #171: distritos, parajes y subparajes con punto público BAHRA/Georef), KPIs materializados del nodo (`/api/nodos/:key/kpis` — VIG-003 #182: set honesto v1 de 9 KPIs agregados sin PII, lectura pública anónima), activos territoriales con escritura ciudadana (`/api/activos` — R5b: POST autenticado con pseudónimo sin PII, moderación, GET público con bbox PostGIS), oportunidades de desarrollo local (`/api/oportunidades` — NCAP-R6 #158, Bloque 9 Banco de Potencialidades: registro ciudadano con evidencia obligatoria y pseudónimo sin PII, ciclo de vida con matriz de transiciones sellada en events_raw, moderación moderador|admin, lectura pública sin 'discarded'), evidencias, events idempotentes (anti-PII) con transporte Redis Streams fail-open (ADR-032)
- `apps/worker` — worker del stream `events:raw` (ADR-032): consumer group idempotente que proyecta `events_raw` → `event_projections` (R4b) y consumidor `vig003-kpi` que re-computa desde el dominio los KPIs del nodo (`kpi_snapshots`, VIG-003 #182)
- `apps/web` — Vite + React: demo federado sobre el contrato `DataSource` (`VITE_DATA_SOURCE=synthetic|api`); capa ciudadana de activos (R5-UI, #109): formulario de alta validado con `@delocalsoy/contracts` (mismo schema que el backend), capa propia en el mapa, sesión login/registro en memoria — preview sintético honesto y modo `api` real
- `packages/db` — Prisma (PostgreSQL + PostGIS): migraciones versionadas + seed idempotente
- `packages/contracts` — Schemas Zod compartidos (`@delocalsoy/contracts`)
- `packages/redis` — cliente RESP mínimo (node:net — cero dependencias): transporte Redis Streams compartido API/worker (ADR-032)
- `docs` — Gobernanza v7.1, EVIDENCIA (EV-xxx), DECISIONES (ADRs), OpenAPI del contrato vivo

## Stack

- Monorepo: Turborepo + pnpm
- Base de datos: PostgreSQL + PostGIS (exclusiva, vía docker-compose)
- Transporte: Redis Streams (stream `events:raw`, ADR-032) — `events_raw` sigue siendo la única verdad
- API: Express + TypeScript ESM · CI: GitHub Actions con PostGIS real (build + test en cada PR)

## Primeros pasos

```bash
pnpm install
docker compose up -d          # PostGIS + Redis
pnpm --filter @delocalsoy/db run generate
pnpm --filter @delocalsoy/db run deploy   # migraciones no interactivas
pnpm --filter @delocalsoy/db run seed     # vocabulario idempotente
pnpm --filter @delocalsoy/api run dev
# demo con datos 100% reales:
VITE_DATA_SOURCE=api pnpm --filter @delocalsoy/web run dev   # → /demo
```

Variables de entorno (nombres, nunca valores en el repo): `DATABASE_URL`, `TERRITORIOS_API_KEY`, `HEALTH_MODE_API_KEY`, `REDIS_URL` (transporte ADR-032), `JWT_SECRET` (>= 16 chars — identidad fail-closed sin ella), `BRANCH_PROTECTION` (honesto: `false` — sin regla de rama). Identidad (opcionales, R5a): `RATE_LIMIT_MAX` (default 5) y `RATE_LIMIT_WINDOW_SEG` (default 300) — 429 con `Retry-After` en `/api/auth/{register,login}` (#101). Worker (opcionales): `WORKER_INTERVAL_MS` (default 5000) y `WORKER_STOP_AFTER_PASSES` (0 = infinito).

## Estado (main @ a64685d, 2026-10-08)

- **CORE-001** ("verdad técnica") — ✅ 6/6
- **CORE-002** (guard R8, schema v5.1, seed, contracts, anti-PII, tests) — ✅ 6/6
- **Trilogía demo** (#16/#17/#18) — ✅ 3/3 (contrato `DataSource`, ADR-029)
- **CORE-003** (rutas `/api/nodos` + `ApiDataSource` completo) — ✅ 2/2: el demo en modo `api` consume datos 100% reales (EV-029/EV-030)
- **CORE-004** (identidad JWT/RBAC, Redis Streams + worker, dominio `activos`) — ratificado R9 (#87), en ejecución: **R1 reconciliación documental ✅ (EV-031)**, **R3 identidad ✅ (registro/login/me + roles, sesiones selladas, H-01 cerrado)**, **R4 Redis Streams ✅ completo (R4a publish fail-open + R4b worker idempotente — ADR-032)**, **R2 cierre de residuos ✅ (EV-036 — #51/#56 cerrados, ramas saneadas)**, **R5a endurecimiento de identidad ✅ (auditoría #99–#102: anti-enumeración por timing en login, rate limiting 429, 5xx sanitizados sin mensajes internos, `/me` con manejo de errores)**, **R5b dominio `activos` ✅ (POST ciudadano con pseudónimo sha256 sin PII + sello en events_raw + moderación moderador|admin + GET público anónimo con bbox PostGIS)**, **R5-UI capa ciudadana ✅ (formulario de alta validado con `@delocalsoy/contracts` + capa de activos en el mapa del demo + sesión login/registro en memoria — preview sintético honesto y modo `api` real, #109)**; pendiente R6 (flujo vertical completo en CI)
- **NODO-CAU (épica #137, 2026-10-11)** — activación en profundidad del nodo caucete: salud, educación, resiliencia comunitaria y sustentabilidad. **R1 vocabulario v6 completada (PR #143, EV-037 — ADR-035 y #140-B ratificados R9 2026-10-11)**: capas `hydrology`, `seismic_risk`, `public_space`, `accessibility` y `sustainability` + 10 categorías; decisión #140 aplicada como opción B (features Point v1) y ADR-035 propuesto (#138)
- **NODO-CAPITAL (épica #152, 2026-10-13)** — activación del nodo Capital: subnodos Centro y Desamparados, áreas funcionales (microcentro/macrocentro/centro cívico — NO administrativas), red de corredores v0.1 como hipótesis de diseño. **R6 Banco de Potencialidades (Bloque 9) en este PR**: dominio `oportunidades` — POST ciudadano autenticado (evidencia obligatoria, consentimiento de actores nombrados, pseudónimo sha256 sin PII, idempotencia por hash, sello en events_raw con rollback), PATCH de moderación con matriz de transiciones del ciclo de vida, GET público anónimo ('discarded' nunca se publica). Sub-issues: #153–#159; propuesta ADR-037 (activación del nodo Capital) pendiente de RATIFICACIÓN de la DH en #152
- **NODO-VIG (épica #167, 2026-10-13)** — activación del nodo Valle de Iglesia: 6 distritos ratificados (Villa Iglesia, Las Flores, Tudcum, Rodeo, Angualasto, Bella Vista) y parajes con identidad propia. **VIG-001 base territorial (lotes 1+2)**: tabla `subnodos` (jerarquía distrito → paraje → subparaje + localidad INDEC, self-relation `parent_key`), seed idempotente de los lotes 1+2 ratificados por la DH (52 entidades en dos lotes: 6 distritos, Pismanta → las-flores, 22 parajes/subparaje de valle, 2 pasos, 3 parajes locales, 3 de travesía por cercanía y 15 de alta cordillera como hijos directos del nodo — coordenadas BAHRA/Georef verificadas, null cuando no hay punto publicado), `GET /api/nodos/:key/subnodos` con filtros `?type=`/`?parent=` y sellos `subnodo.creado` en `events_raw`. **VIG-002 activos multimodales en este PR**: extensión del dominio `activos` (Opción A ratificada por la DH: tipos `local|prestador|experiencia|observacion`, `subnodo_key` validado contra `subnodos`, clasificaciones N1→N3 en `activos_clasificaciones` con fuente obligatoria, procedencia ADR-035, consentimiento granular Ley 25.326, visibilidad ADR-036 con `restricted` excluido de la lectura pública, estado `archivado`) + semilla verificada de 6 activos del Valle de Iglesia (Capilla de Achango, Molino de Bella Vista, Yacimiento Angualasto, cooperativas Fecoagro Tudcum y Valles Iglesianos, Dique Cuesta del Viento) + suite E2E `activos-vig002.test.ts`. **VIG-003 KPIs del nodo en este PR**: consumidor `vig003-kpi` del worker sobre `events:raw` (re-compute idempotente desde el dominio, nunca incrementos) → tabla `kpi_snapshots` (upsert por `nodo_key`+`kpi_key`), set honesto v1 de 9 KPIs agregados sin PII (Ley 25.326, `restricted` excluida — ADR-036, cobertura v1 null honesto R15), `GET /api/nodos/:key/kpis` público anónimo (404 nodo inexistente, count 0 honesto) + suites E2E `vig003-kpis.test.ts` y `kpi-consumer.test.ts`. Sub-issues: #168–#174

Ver `docs/EVIDENCIA.md` para la matriz de evidencia y `docs/api/openapi.json` para el contrato vivo. Gobernanza: `docs/GOBERNANZA.md` y `docs/HITUB.md`.
