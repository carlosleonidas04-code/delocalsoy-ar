# HITUB — Hub de Transformación e Innovación Territorial

> **Estado:** manifiesto metodológico v1.0 — captura lo demostrado el 2026-10-03 y rige los sprints siguientes.

## Qué es

HITUB es la capa metodológica de DELocalSoy.AR: el punto de encuentro entre **territorio** (el dominio), **software** (este monorepo) y **metodología** (el ciclo de evidencia). No es un documento adicional — es la descripción del modo de trabajo que ya opera en este repositorio.

## El ciclo HITUB

```
   observar → obtener evidencia → transformar → verificar → registrar
      ↑                                                        │
      └────────────────────────────────────────────────────────┘
```

1. **Observar**: leer el estado real del sistema (CI, logs, issues) — nunca suponerlo.
2. **Obtener evidencia**: ante un fallo, exigir el dato exacto (log, salida de comando) antes de actuar. No se corrige a ciegas.
3. **Transformar**: aplicar el cambio mínimo, por rama + PR, con la plantilla del repo.
4. **Verificar**: el CI del PR es la prueba en entorno limpio. Verde = verdad; rojo = más evidencia.
5. **Registrar**: actualizar `docs/EVIDENCIA.md`, comentar y cerrar el issue. Lo no registrado no ocurrió.

## La sinergia IA ↔ GitHub

El estado compartido vive en GitHub, no en conversaciones privadas. Cualquier agente (Vibe, Copilot, u otro ecosistema de IA) o persona opera sobre lo mismo:

| Capa | Artefacto | Rol en el ciclo |
|---|---|---|
| Tareas | Issues (plantilla *Evidencia ejecutable*) | Unidad observable de trabajo |
| Cambios | Rama + PR (plantilla con EV referenciada) | Transformación auditable |
| Verdad | GitHub Actions (CI) | Verificador objetivo, entorno limpio |
| Memoria | `docs/` (EVIDENCIA, ADRs, ARCHITECTURE_STATE) | Registro que sobrevive a los chats |

## Demostración inicial (2026-10-03)

El ciclo se ejecutó completo para habilitar EV-003/EV-006 en CI, con tres fallos reales diagnosticados por evidencia exacta:

| Fallo | Evidencia | Fix | Resultado |
|---|---|---|---|
| pnpm: versión duplicada (action + `packageManager`) | Log del job #3 | Fuente única: `packageManager` | ✅ |
| TS2742: tipo inferido no portable en pnpm | Log del job #4 | Anotación `Express` en `createApp()` | ✅ |
| `prisma generate` sin `DATABASE_URL` en CI | Auditoría del schema | Env dummy a nivel de job | ✅ |

Resultado: CI verde ([run 37098706368](https://github.com/carlosleonidas04-code/delocalsoy-ar/actions/runs/37098706368)), 2/6 evidencias de CORE-001 cerradas por issues #3 y #6, registro sincronizado vía PR #8.

## Reglas HITUB

1. **La verdad es ejecutable**: lo que no corre, no existe.
2. **Nada a ciegas**: todo fix parte de un log o salida real.
3. **Nada directo a `main`**: todo cambio es un PR verificable.
4. **Nada sin registro**: toda verificación actualiza `docs/EVIDENCIA.md` y su issue.
5. **El hub es el repo**: la conversación propone; GitHub dispone.
