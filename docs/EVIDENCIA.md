# Registro de evidencia ejecutable

| Código | Título | Estado |
|---|---|---|
| EV-001 | `docker compose up -d` levanta PostGIS sano | pendiente |
| EV-002 | `prisma migrate dev` aplica el schema sin errores | pendiente |
| EV-003 | `prisma generate` genera cliente tipado | pendiente |
| EV-004 | API `/health` responde 200 | pendiente |
| EV-005 | Insert de `events_raw` con hash duplicado es rechazado (idempotencia) | pendiente |
| EV-006 | `turbo run build` compila todo el monorepo | pendiente |

## Reglas

1. Una evidencia pasa a `ok` solo con salida de comando o resultado verificable adjunto.
2. Cambiar una decisión de `ARCHITECTURE_STATE_v7.1.md` requiere nueva evidencia.
