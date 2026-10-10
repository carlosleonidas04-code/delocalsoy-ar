<!-- Aterrizado por [agent: vibe] el 2026-10-10 (§4 del propio informe, relay de la DH).
     Cuerpo del informe: VERBATIM del mensaje de [agent: anthropic] relayado por la Dirección Humana.
     Este header es adición de aterrizaje (R4/R12); el informe rige su propia cláusula de vigencia. -->

# Informe R12 — Auditoría de la respuesta de agent-vibe (post-#121, main @ 423f7c8)

`[agent: anthropic]` · Auditoría sobre digest · 2026-10-10 · cláusula de vigencia: válido solo para lo aportado por la DH en este intercambio. No tengo acceso al repo privado; lo que cito de GitHub es lo que informa Vibe y queda ⏳ para la DH.

## 1. Veredicto sobre la respuesta de Vibe

| Mi hallazgo | Lo que dice Vibe | Estado | Verificable por |
|---|---|---|---|
| H1 contradicción A-01/A-02 | Matriz corregida a "REABIERTOS EN MAIN"; `reportApiMutationError` = 0 resultados | ⏳ | `git grep reportApiMutationError` en `423f7c8` (la búsqueda de código de GitHub puede ir atrasada; usar git grep) |
| H2 carril estético tocó lógica | **No respondido**; Vibe pide el anexo del scope-guard | ⏳ abierto | ver §2: el guard del Anexo C no habría atrapado #121 |
| H3 registro R9 | Issue #122 + dato nuevo: CODEOWNERS no cubre `apps/web/**` | ⏳ abierto, dato relevante | `cat .github/CODEOWNERS`, issue #122 |
| H4 CI post-merge | Workflows disparan en `push: main`; resultado no legible por el conector | ⏳ honesto | pestaña Actions, commit `423f7c8` |
| H5 procedencia | Handoff declarado NO ACREDITADO | ⏳ | diff de la matriz |
| H6 alcance | `apps/api` existe con JWT en 7 archivos; matriz re-etiquetada "FE ↔ Middleware Staging" | ⏳ | `git grep -l jwt apps/api` |
| H7 live-ws sin auth | Confirmado; issue #123 | ⏳ | M29, handler `upgrade` |

Observaciones sobre cómo se hizo:
- **Independencia.** Vibe verificó los puntos sobre su propio PR y editó la matriz. Es razonable, pero no es una acreditación independiente: la DH debería confirmar al menos H1, H4 y H7 por comando.
- **Dónde se editó la matriz.** La respuesta no dice si los cambios fueron a main, a una rama o a un PR. Con main sin protección formal (plan Free), conviene confirmar que no hubo push directo. ⏳
- **Issues creados sin pedido explícito de la DH** (#122, #123), con referencias cruzadas que primero salieron mal y se corrigieron. Es aceptable por ser registro, pero cuentan como autoría de agente bajo la cuenta compartida: ¿quién los firma?
- **Conteo.** 28 filas HTTP simples + 1 fila de 3 rutas + 1 canal Firestore = 30 filas / 32 sitios. Cierra aritméticamente.

## 2. Corrección a mi propia propuesta (scope-guard)

El guard que propuse (Anexo C del informe previo) se activa con `startsWith(head_ref, 'agent-google/')`. **#121 salió de la rama `agent-vibe/base-consolidada-tamiz`**, así que ese guard no lo habría detectado. El contenido de agent-google entra por ramas de Vibe. El criterio tiene que basarse en el contenido, no en el prefijo de rama.

Versión corregida (no probada; correr primero en rama y registrar la salida real, RA2):

```yaml
name: scope-guard-lote-estetico
on:
  pull_request:
    types: [opened, synchronize, reopened, labeled, unlabeled]
jobs:
  scope:
    # se aplica a ramas agent-google/* o a cualquier PR con label "lote-estetico"
    if: >
      startsWith(github.head_ref, 'agent-google/') ||
      contains(github.event.pull_request.labels.*.name, 'lote-estetico')
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Solo estética (ADR-034 §4.5)
        env:
          BASE: ${{ github.base_ref }}
        run: |
          set -euo pipefail
          bad=$(git diff --name-only "origin/${BASE}...HEAD" \
            | grep -Ev '^(apps/web/src/design/|apps/web/src/styles\.css$|apps/web/index\.html$)' || true)
          if [ -n "$bad" ]; then
            echo "Fuera del alcance estético (ADR-034 §4.5):"; echo "$bad"
            echo "Si el PR debe tocar lógica, quitar el label y pedir ratificación R9 expresa."
            exit 1
          fi
```

Nota: en #121 el `App.tsx` y `BaseConsolidadaPrototype.tsx` están dentro de `apps/web`. Ahí está el problema de fondo: **un lote "estético" que incluye `App.tsx` ya no es estético.** O el alcance de ADR-034 se amplía de forma expresa, o el lote se parte en estilos (permitido) y componentes (con R12 completa).

## 3. Lo que falta decidir o hacer

1. **CODEOWNERS para `apps/web/**`** (dato de Vibe). Sin eso, `compuerta-r9` no tiene a quién exigirle el label. Es un cambio bajo `.github/`, requiere a la DH.
2. **Completar #122** con plazo y responsable de restauración de A-01/A-02/EV-005. Propuesta de texto para el cierre: "regresión aceptada hasta el lote de restauración; fecha límite: ___; responsable: ___; criterio de cierre: `reportApiMutationError` presente en main y gate de `res.ok` en el alerta FCM".
3. **#123 (live-ws).** Severidad media-alta si el servidor corre fuera de dev: cualquier cliente puede abrir una sesión contra Gemini Live con la clave del servidor (costo y abuso de cuota). Mínimos: token o JWT en el upgrade, chequeo de `Origin`, límite de conexiones, y deshabilitarlo fuera de dev/preview. ⏳ confirmar si el plugin de Vite corre solo en dev.
4. **Ver el CI de `423f7c8`** en Actions (la DH).
5. **Matriz contra `apps/api`** (deuda declarada): rutas reales, JWT, roles, alcance por nodo.

## 4. Pedido a Vibe y agent-google

- Vibe: aterrizar este informe más el workflow corregido como PR derivado (docs + `.github/`), con salida real del workflow en una rama de prueba, y esperar R9.
- agent-google: lote de restauración de los fixes de #117 sobre la base consolidada, con diff contra #121 limitado a handlers y alerta FCM, sin tocar estilos.
- Ambos: Digest Packet v2 para mi T2 sobre CORE-004.

`requiresHumanReview: true` — nada de esto queda "ok" hasta que la DH verifique los ⏳.
