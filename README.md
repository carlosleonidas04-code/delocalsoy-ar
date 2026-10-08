# DELocalSoy.AR — Monorepo (v7.1)

Relanzamiento de DELocalSoy.AR. Este repositorio es la **verdad técnica**: toda afirmación sobre el sistema debe estar respaldada por evidencia ejecutable anclada a SHA de `main` (R4/R15).

## Estructura

- `apps/api` — API Express: health honesto (R5), identidad JWT/RBAC (`/api/auth`, ADR-031), territorios bbox, vocabulario `/api/nodos`, evidencias, events idempotentes (anti-PII) con transporte Redis Streams fail-open (ADR-032)
- `apps/web` — Vite + React: demo federado sobre el contrato `DataSource` (`VITE_DATA_SOURCE=synthetic|api`)
- `packages/db` — Prisma (PostgreSQL + PostGIS): migraciones versionadas + seed idempotente
- `packages/contracts` — Schemas Zod compartidos (`@delocalsoy/contracts`)
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

Variables de entorno (nombres, nunca valores en el repo): `DATABASE_URL`, `TERRITORIOS_API_KEY`, `HEALTH_MODE_API_KEY`, `REDIS_URL` (transporte ADR-032), `JWT_SECRET` (>= 16 chars — identidad fail-closed sin ella), `BRANCH_PROTECTION` (honesto: `false` — sin regla de rama).

## Estado (main @ 52db812, 2026-10-08)

- **CORE-001** ("verdad técnica") — ✅ 6/6
- **CORE-002** (guard R8, schema v5.1, seed, contracts, anti-PII, tests) — ✅ 6/6
- **Trilogía demo** (#16/#17/#18) — ✅ 3/3 (contrato `DataSource`, ADR-029)
- **CORE-003** (rutas `/api/nodos` + `ApiDataSource` completo) — ✅ 2/2: el demo en modo `api` consume datos 100% reales (EV-029/EV-030)
- **CORE-004** (identidad JWT/RBAC, Redis Streams + worker, dominio `activos`) — ratificado R9 (#87), en ejecución: **R1 reconciliación documental ✅ (EV-031)**, **R3 identidad ✅ (registro/login/me + roles, sesiones selladas, H-01 cerrado)**, **R4a transporte Redis Streams ✅ (ADR-032, fail-open)**; pendiente R2, R4b worker, R5, R6

Ver `docs/EVIDENCIA.md` para la matriz de evidencia y `docs/api/openapi.json` para el contrato vivo. Gobernanza: `docs/GOBERNANZA.md` y `docs/HITUB.md`.
