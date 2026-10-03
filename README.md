# DELocalSoy.AR — Monorepo Track A (v7.1)

Relanzamiento de DELocalSoy.AR. Este repositorio es la **verdad técnica**: toda afirmación sobre el sistema debe estar respaldada por evidencia ejecutable.

## Estructura

- `apps/api` — API Express mínima
- `packages/db` — Prisma (PostgreSQL + PostGIS), cliente tipado
- `docs` — Gobernanza documental v7.1 y registro de evidencia

## Stack

- Monorepo: Turborepo + pnpm
- Base de datos: PostgreSQL + PostGIS (exclusiva, vía docker-compose)
- API: Express + TypeScript

## Primeros pasos

```bash
pnpm install
docker compose up -d
pnpm --filter @delocalsoy/db prisma:migrate
pnpm --filter @delocalsoy/api dev
```

## Sprint actual: CORE-001 ("verdad técnica")

Objetivo: producir las primeras evidencias ejecutables **EV-001 a EV-006** (ver `docs/EVIDENCIA.md`). No se agrega funcionalidad hasta completarlas.
