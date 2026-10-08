# ARCHITECTURE_STATE — v7.1 (reconciliado, CORE-004 R1+R3)

> Actualizado 2026-10-08 contra `main @ f87b2ea` (CORE-003 completado + CORE-004 R1 PR #88 `c7cfac1`, R3a PR #90 `f87b2ea`, R3b). **Regla documental (R9, #87):** todo PR que agrega rutas o cambia arquitectura actualiza OpenAPI + este documento + README en el mismo PR.

## Decisiones vigentes

| Área | Decisión |
|---|---|
| Monorepo | Turborepo + pnpm (Track A) |
| Base de datos | PostgreSQL + PostGIS, exclusiva del sistema (docker-compose) |
| ORM | Prisma; ids `cuid`; columnas `@map()` a snake_case; migraciones versionadas + `migrate deploy` no interactivo |
| Eventos | `events_raw` append-only con `hash` único → idempotencia; **única fuente de verdad**. `system.*` es territorio del sistema: la ingesta pública lo rechaza (403, H-01 cerrado en CORE-004 R3a) |
| API | Express + TypeScript ESM. Rutas vivas: `/api/auth/{register,login,me}`, `/api/health` (honesto R5), `/api/health/mode` (guard R8), `/api/territorios?bbox=`, `/api/nodos`, `/api/nodos/:key`, `/api/nodos/:key/{capas,categorias,features,reportes}`, `/api/evidencias`, `/api/events` (anti-PII ADR-027) |
| Web | Vite + React; contrato `DataSource` (ADR-029): `SyntheticDataSource` | `ApiDataSource` (ADR-030) elegido por `VITE_DATA_SOURCE` |
| Auth | **Identidad por etapas implementada (ADR-031, CORE-004 R3):** usuarios + JWT HS256 15 min + roles `ciudadano\|moderador\|admin`; contraseñas scrypt y HMAC con node:crypto nativo (**cero dependencias nuevas**); guards `requireJwt`/`requireRole` fail-closed sin `JWT_SECRET`; alta pública solo crea ciudadanos (promoción = operación de sistema con API key R8); sesiones selladas en `events_raw` sin PII (Ley 25.326) |
| Asincronía | Redis Streams como transporte + worker idempotente — ADR-032 (ratificado R9, CORE-004 R4); `events_raw` sigue como única fuente de verdad |
| Gobernanza | Toda afirmación requiere evidencia ejecutable anclada a SHA (R4/R15). Repo privado sin branch protection (decisión DH 2026-10-07): compuerta = disciplina + CI verde en cada PR |
| Ecosistema multi-agente | agent-vibe, Anthropic (ADR-022), Perplexity (ADR-023), Grok (ADR-025), Google AI Studio (ADR-033: cliente con preview visual, pull-only, sin force push, cambios vía rama + PR + CI) |

## Estado

- **Sprint vigente: CORE-004** (ratificado R9 en #87, 2026-10-08) — primera columna vertebral real: escritura ciudadana verificada de extremo a extremo (`ciudadano → web → POST /api/activos → events_raw → Redis Stream → worker → proyección PostGIS → visible`).
- **Acreditado en main @ f87b2ea:** CORE-001 6/6 · CORE-002 6/6 · trilogía demo 3/3 · CORE-003 2/2 (EV-029 `e1d9512` / EV-030 `cb197c4`) · **CORE-004 R1 completada (EV-031 `c7cfac1`)** y **R3 en aterrizaje (R3a `f87b2ea` + R3b)**.
- Contrato vivo: `docs/api/openapi.json` v7.8.0 documenta todas las rutas montadas en `app.ts`. El demo en modo `api` consume el vocabulario real del backend; `getEventos` declarado vacío (deuda ADR-030, se cierra con el worker de R4).
- Pendiente del sprint: R2 (cierre de residuos), R4 Redis Streams + worker (ADR-032), R5 dominio `activos` territorial, R6 flujo vertical completo en CI (PostGIS + Redis reales).
