# Registro de evidencia ejecutable

> **Re-base epistémico** (Aterrizaje PR 4 — issue #23). Doble columna: estado en `main` vs estado en staging.
> **R4:** una evidencia pasa a `ok` solo con salida de comando o run verificable, anclado por SHA.
> **R15:** staging propone, GitHub acredita — ninguna evidencia sin CI run en main se etiqueta `ok` en main antes del merge que la prueba.
> **Vigencia de esta tabla:** hasta el próximo push a main. Última revisión contra API GitHub: main @ `9298939` (2026-10-06).

## Scorecard

**Acreditadas en main: 2/6** — EV-003 y EV-006, sobre los merges del **2026-10-03** (`ce2d736`/PR #7 y `7c8e267`/PR #8).
La sanidad de main posterior (68a8872 → 9298939) queda `unbound` hasta el **primer run `verify` verde sobre main** (trigger push desde `045dae8`; fix del runner mergeado en `9298939` vía PR #39 — resultado del run pendiente de pegar).

## Matriz de evidencia — main vs staging

| Código | Título | Estado en **main** | Ancla main | Estado en **staging** |
|---|---|---|---|---|
| EV-001 | `docker compose up -d` levanta PostGIS sano | pendiente (issue #1) | — | verificada en sandbox — acreditar en main con salida real (`pg_isready`) |
| EV-002 | `prisma migrate dev` aplica el schema sin errores | pendiente (issue #2) — vía de acreditación: migración GiST del PR #42 | — | verificada en sandbox |
| EV-003 | `prisma generate` genera cliente tipado | **ok @ `ce2d736`** (2026-10-03, PR #7) — revalidación @ 9298939 ⏳ run verify pendiente | `ce2d736` | verificada en sandbox |
| EV-004 | API `/health` responde 200 | pendiente (issue #4) — PR #41 (`/api/health` honesto) abierto | — | verificada en sandbox |
| EV-005 | Insert duplicado en `events_raw` rechazado (idempotencia) | pendiente (issue #5) | — | verificada en sandbox |
| EV-006 | Build del monorepo compila | **ok @ `ce2d736`/`7c8e267`** (2026-10-03, PRs #7/#8) — `unbound` sobre main posterior; en-PR #39 (mergeado `9298939`) ⏳ primer run verde | `ce2d736` | verificada en sandbox |

### EV-007..EV-018 (staging v7.4 — sin aterrizar)

Catálogo completo vive en staging (18/18 verificadas en sandbox). Nada de esto acredita en main hasta que su PR correspondiente se abra y fusione con run verde:

- **EV-007/EV-008** — `firestore.rules` + PII: `evidencia-staging` (digest 57e88665 listo); **PR 3 no existe aún como rama real** (ver auditoría del 2026-10-06 en #23).
- **EV-009..EV-018** — suites `verify:*` y resto del aterrizaje v7.4: pendientes de PRs 3–6.

## Reglas

1. Una evidencia pasa a `ok` solo con salida de comando o resultado verificable adjunto.
2. Cambiar una decisión de `ARCHCHITECTURE_STATE_v7.1.md` requiere nueva evidencia.
3. Ninguna evidencia sin CI run en main se etiqueta como `ok` en main antes del merge de su PR (R15, ADR-019).
4. Toda fila `ok` lleva SHA ancla; sin SHA, la fila es `unbound` (lección del desempate EV-003/EV-006, #23).

## Prueba de desempate del hito actual (ejecutable)

```bash
gh run list --branch main --event push -L 1
# Hito: primer run verify en success sobre main post-9298939
# → actualizar scorecard a 4/6 tras acreditar EV-003/EV-006 con ese SHA
```

---

*Registrado por agent-vibe el 2026-10-06, verificado contra API GitHub. R15: este documento registra estados; acredita solo lo anclado con SHA y run.*
