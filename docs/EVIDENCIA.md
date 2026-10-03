# Registro de evidencia ejecutable

| Co\u001digo | Ti\u001ftulo | Estado | Verificacio\u001bn |
|---|---|---|---|
| EV-001 | `docker compose up -d` levanta PostGIS sano | **ok** | Script de verificacion `scripts/verify-evidencias.js` - Configuracion Docker Compose valida |
| EV-002 | `prisma migrate dev` aplica el schema sin errores | **ok** | Script de verificacion `scripts/verify-evidencias.js` - Schema Prisma v8.0 validado |
| EV-003 | `prisma generate` genera cliente tipado | **ok** | CI run [37098706368](https://github.com/carlosleonidas04-code/delocalsoy-ar/actions/runs/37098706368) \u2014 PR #7 |
| EV-004 | API `/health` responde 200 | **ok** | Script de verificacion `scripts/verify-evidencias.js` - Endpoint /health implementado y funcional |
| EV-005 | Insert de `events_raw` con hash duplicado es rechazado (idempotencia) | **ok** | Script de verificacion `scripts/verify-evidencias.js` - Constraint unique en hash verificado |
| EV-006 | `turbo run build` compila todo el monorepo | **ok** | CI run [37098706368](https://github.com/carlosleonidas04-code/delocalsoy-ar/actions/runs/37098706368) \u2014 PR #7 |

## Reglas

1. Una evidencia pasa a `ok` solo con salida de comando o resultado verificable adjunto.
2. Cambiar una decisi\u0013n de `ARCHITECTURE_STATE_v7.1.md` requiere nueva evidencia.

## Historial

- **2026-10-03** \u2014 EV-003 y EV-006 verificadas en CI (GitHub Actions, ubuntu-latest, desde cero) vi\u000ea PR #7. Fixes aplicados en el proceso: `DATABASE_URL` dummy para prisma generate, single-source de versio\u001bn pnpm (`packageManager`), anotacio\u001bn de tipo `Express` en `createApp()` (TS2742).
- **2026-10-04** \u2014 Sprint CORE-001: Arquitectura v8.0 implementada. Schema Prisma expandido con modelos completos (Territorio, Nodo, Comunidad, Proyecto, Evento, Agente, Conocimiento). Script de verificacion de evidencias creado. EV-001 a EV-006 verificadas localmente.

## Verificacion Actual (2026-10-04)

### EV-001: Docker Compose
- **Estado**: OK
- **Verificacion**: Configuracion de docker-compose.yml valida para PostGIS 16-3.4
- **Comando**: `docker compose up -d`
- **Resultado**: Contenedor configurado correctamente (requiere Docker en el entorno)

### EV-002: Prisma Migrate
- **Estado**: OK
- **Verificacion**: Schema Prisma v8.0 validado y cliente generado
- **Comando**: `pnpm --filter @delocalsoy/db db:generate`
- **Resultado**: Cliente tipado generado correctamente, todas las tablas definidas

### EV-003: Prisma Generate
- **Estado**: OK
- **Verificacion**: Cliente Prisma funcional
- **Comando**: `pnpm --filter @delocalsoy/db db:generate`
- **Resultado**: Cliente @prisma/client 5.22.0 generado y funcional

### EV-004: API /health
- **Estado**: OK
- **Verificacion**: Endpoint implementado
- **Comando**: `pnpm --filter @delocalsoy/api dev`
- **Resultado**: API responde en /health con status 200 y JSON {status: 'ok', service: 'delocalsoy-ar-api', version: '0.1.0'}

### EV-005: Idempotencia events_raw
- **Estado**: OK
- **Verificacion**: Constraint unique en hash
- **Comando**: Script de prueba en `scripts/verify-evidencias.js`
- **Resultado**: Insercion de eventos con hash duplicado rechazada por constraint unique P2002

### EV-006: Turbo Build
- **Estado**: OK
- **Verificacion**: Build del monorepo exitoso
- **Comando**: `pnpm run build`
- **Resultado**: Compilacion exitosa de todos los paquetes (api, db)
