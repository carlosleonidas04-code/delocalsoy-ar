# Registro de evidencia ejecutable

> **Re-base epistémico** (Aterrizaje PR 4 — issue #23). Estado en `main` vs estado en staging.
> **R4:** una evidencia pasa a `ok` solo con salida de comando o run verificable, anclado por SHA.
> **R15:** staging propone, GitHub acredita — ninguna evidencia sin CI run en main se etiqueta `ok` en main antes del merge que la prueba.
> **Vigencia de esta tabla:** hasta el próximo push a main. Última revisión contra API GitHub: main @ `5c3a7a3` (2026-10-07).

## Scorecard

**Acreditadas: 6/6** — Sprint CORE-001 ("verdad técnica") completo el **2026-10-07**.

Historia honesta: 2/6 (EV-003/EV-006 @ `ce2d736`, 03-10) → 3/6 (EV-001, 07-10) → 4/6 (EV-002 vía PR #47 → `5c3a7a3`) → 5/6 (EV-004) → **6/6 (EV-005)**, todas las nuevas con salida real pegada por la Dirección Humana en Codespace (R4/R15, registro en #23).

## Matriz de evidencia — main

| Código | Título | Estado en **main** | Ancla main | Acreditación (salida real) |
|---|---|---|---|---|
| EV-001 | `docker compose up -d` levanta PostGIS sano | **ok** | `2482f63` | `postgis_version` → **3.4** (#1, 2026-10-07, Codespace) |
| EV-002 | `prisma migrate dev` aplica el schema sin errores | **ok** | `5c3a7a3` | DB desde cero: `0_init` + `20261006120000_territorios_geom_gist` aplicadas sin errores; tablas `events_raw`/`evidencias`/`territorios` creadas (#2; fix P12 vía PR #47) |
| EV-003 | `prisma generate` genera cliente tipado | **ok @ `ce2d736`** (2026-10-03, PR #7) | `ce2d736` | run [37098706368](https://github.com/carlosleonidas04-code/delocalsoy-ar/actions/runs/37098706368) |
| EV-004 | API `/health` responde 200 | **ok** | `5c3a7a3` | `{"status":"ok",...}` + `200`; `/api/health` → `mode:real`, `dataSource:postgres` (salto honesto desde `degraded/none`, R5) (#4) |
| EV-005 | Insert duplicado en `events_raw` rechazado (idempotencia) | **ok** | `5c3a7a3` | POST doble idéntico: 1º `creado`, 2º `duplicado`, mismo id/hash — `UNIQUE(hash)`, original intacto (#5) |
| EV-006 | Build del monorepo compila | **ok @ `ce2d736`/`7c8e267`** (2026-10-03, PRs #7/#8) | `ce2d736` | run [37098706368](https://github.com/carlosleonidas04-code/delocalsoy-ar/actions/runs/37098706368); compuerta CI verde en cada merge posterior (#44 → #47) |

### Notas de auditoría (2026-10-07, registro completo en #23)

- **P12**: las tablas base nunca estaban versionadas — `migrations/` solo tenía la del geo. Fix: migración `0_init` (PR #47, squash → `5c3a7a3`). Reproducción desde cero ahora aplica limpia.
- **P13**: un cierre prematuro de EV-002 sin salida real fue detectado, revertido y re-acreditado con evidencia (R4).
- **P14**: syntax error en `0_init` (CONSTRAINT faltante en pkey de `territorios`) autodetectado por ejecución humana — fix `18cec243`.
- **Limitación operativa conocida**: `prisma migrate dev` interactivo propone `DROP INDEX idx_territorios_geom_gist` tras aplicar (Prisma no puede expresar índices GiST con `geom Unsupported`). En verificación interactiva, cancelar ese prompt; para verificación no interactiva usar `prisma migrate deploy`. Migraciones efímeras de diagnóstico nunca se commitearon.

### EV-007..EV-018 (staging v7.4 — sin aterrizar)

Catálogo completo vive en staging (18/18 verificadas en sandbox). Nada de esto acredita en main hasta que su PR correspondiente se abra y fusione con run verde:

- **EV-007/EV-008** — `firestore.rules` + PII: `evidencia-staging` (digest 57e88665 listo); **PR 3 no existe aún como rama real** (ver auditoría del 2026-10-06 en #23).
- **EV-009..EV-018** — suites `verify:*` y resto del aterrizaje v7.4: pendientes de PRs 3–6.

## Reglas

1. Una evidencia pasa a `ok` solo con salida de comando o resultado verificable adjunto.
2. Cambiar una decisión de `ARCHITECTURE_STATE_v7.1.md` requiere nueva evidencia.
3. Ninguna evidencia sin CI run en main se etiqueta como `ok` en main antes del merge de su PR (R15, ADR-019).
4. Toda fila `ok` lleva SHA ancla; sin SHA, la fila es `unbound` (lección del desempate EV-003/EV-006, #23).

## Prueba de desempate del hito actual (ejecutable)

```bash
gh run list --branch main --event push -L 3
# Hito: runs verify/ci en success sobre 2eb2ff2, 2482f63 y 5c3a7a3
# (pendiente de pegar por la Dirección Humana — hoja de ruta en #23)
```

---

*Registrado por agent-vibe el 2026-10-07, verificado contra API GitHub. R15: este documento registra estados; acredita solo lo anclado con SHA y salida real.*
