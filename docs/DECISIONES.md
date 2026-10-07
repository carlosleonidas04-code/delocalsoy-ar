# Registro de decisiones (ADR ligero)

| ID | Decisión | Motivo | Estado |
|---|---|---|---|
| ADR-001 | Monorepo Turborepo + pnpm (Track A) | Escalabilidad por paquetes, pipelines cacheables | vigente |
| ADR-002 | PostgreSQL + PostGIS exclusivo | Requisito territorial del dominio | vigente |
| ADR-003 | Prisma con `cuid` + `@map()` snake_case | Portabilidad y convención de BD | vigente |
| ADR-004 | `events_raw` con hash único | Idempotencia de ingesta | vigente |
| ADR-005 | API Express mínima primero | No especular antes de CORE-001 | vigente |
| ADR-026 | Autenticación por etapas: API key por operación ahora (`TERRITORIOS_API_KEY`); JWT/RBAC solo cuando exista multi-usuario real | Evitar infraestructura especulativa (R15); reutilizar el guard R8 ya validado en `PATCH /api/health/mode` — CORE-002 T1 (#63) | propuesta ratificada (R9 en #63) |
