# Registro de decisiones (ADR ligero)

| ID | Decisión | Motivo | Estado |
|---|---|---|---|
| ADR-001 | Monorepo Turborepo + pnpm (Track A) | Escalabilidad por paquetes, pipelines cacheables | vigente |
| ADR-002 | PostgreSQL + PostGIS exclusivo | Requisito territorial del dominio | vigente |
| ADR-003 | Prisma con `cuid` + `@map()` snake_case | Portabilidad y convención de BD | vigente |
| ADR-004 | `events_raw` con hash único | Idempotencia de ingesta | vigente |
| ADR-005 | API Express mínima primero | No especular antes de CORE-001 | vigente |
| ADR-026 | Autenticación por etapas: API key por operación ahora (`TERRITORIOS_API_KEY`); JWT/RBAC solo cuando exista multi-usuario real | Evitar infraestructura especulativa (R15); reutilizar el guard R8 ya validado en `PATCH /api/health/mode` — CORE-002 T1 (#63) | propuesta ratificada (R9 en #63) |
| ADR-027 | Filtro anti-PII server-side en la ingesta de eventos (patrones AR: DNI/CUIT/CUIL, email, teléfono), rechazo genérico sin eco del valor | Ley 25.326 + ADR-020 cond. 1: la API reporta evidencia territorial, no es repositorio de datos personales — CORE-002 T5 (#67) | propuesta ratificada (R9) |
| ADR-028 | Retiro de la ruta legada `/health` (única salud: `/api/health`, R5) y binding conservador: `HOST` desde env con default `127.0.0.1`/`localhost`; `allowedHosts` solo declarado (Codespace detectado o `ALLOWED_HOSTS=true`) | Riesgo #57: sin consumidores legítimos tras #53/#61; `0.0.0.0` fijo y `allowedHosts: true` eran permisivos fuera de Codespace. Verificable en CI: `GET /health` → 404, `/api/health` → 200 | propuesta ratificada (R9 — delegación registrada en #57) |
