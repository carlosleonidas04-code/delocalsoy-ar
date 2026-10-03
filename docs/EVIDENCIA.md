# Registro de evidencia ejecutable

| Código | Título | Estado | Verificación |
|---|---|---|---|
| EV-001 | `docker compose up -d` levanta PostGIS sano | pendiente | — |
| EV-002 | `prisma migrate dev` aplica el schema sin errores | pendiente | — |
| EV-003 | `prisma generate` genera cliente tipado | **ok** | CI run [37098706368](https://github.com/carlosleonidas04-code/delocalsoy-ar/actions/runs/37098706368) — PR #7 |
| EV-004 | API `/health` responde 200 | pendiente | — |
| EV-005 | Insert de `events_raw` con hash duplicado es rechazado (idempotencia) | pendiente | — |
| EV-006 | `turbo run build` compila todo el monorepo | **ok** | CI run [37098706368](https://github.com/carlosleonidas04-code/delocalsoy-ar/actions/runs/37098706368) — PR #7 |

## Reglas

1. Una evidencia pasa a `ok` solo con salida de comando o resultado verificable adjunto.
2. Cambiar una decisión de `ARCHITECTURE_STATE_v7.1.md` requiere nueva evidencia.

## Historial

- **2026-10-03** — EV-003 y EV-006 verificadas en CI (GitHub Actions, ubuntu-latest, desde cero) vía PR #7. Fixes aplicados en el proceso: `DATABASE_URL` dummy para prisma generate, single-source de versión pnpm (`packageManager`), anotación de tipo `Express` en `createApp()` (TS2742).
