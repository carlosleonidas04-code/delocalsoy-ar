# ARCHITECTURE_STATE — v7.1

## Decisiones vigentes

| Área | Decisión |
|---|---|
| Monorepo | Turborepo + pnpm (Track A) |
| Base de datos | PostgreSQL + PostGIS, exclusiva del sistema (docker-compose) |
| ORM | Prisma; ids `cuid`; columnas `@map()` a snake_case |
| Eventos | `events_raw` append-only con `hash` único → idempotencia |
| API | Express mínima, TypeScript ESM |
| Gobernanza | Toda afirmación requiere evidencia ejecutable |

## Estado

- **Sprint vigente: CORE-001 ("verdad técnica")** — producir EV-001 a EV-006.
- Nada está verificado aún (ni el schema Prisma real). No se agrega funcionalidad hasta cerrar CORE-001.
