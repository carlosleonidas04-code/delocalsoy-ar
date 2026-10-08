# Gobernanza documental — DELocalSoy.AR (v7.1)

## Principios

1. **Verdad técnica sobre documento**: lo que no corre, no existe.
2. **Evidencia primero**: cada afirmación de estado cita una EV-xxx de `EVIDENCIA.md`.
3. **Un solo flujo**: GitHub es la única fuente; el repo es la verdad, no los chats.

## Flujo sinérgico IA ↔ GitHub

> El ciclo operativo completo está definido en `docs/HITUB.md` (manifiesto metodológico v1.0). Esta página retiene los principios; HITUB retiene el modo de trabajo.

- Cada tarea relevante (sprint, evidencia, decisión) se registra como **issue** con plantilla.
- Todo cambio va por **rama + PR**; el PR referencia la evidencia que produce o consume.
- `main` **no tiene protección técnica**: el repo es privado en plan Free y GitHub no habilita branch protection ni rulesets (`HTTP 403`, verificado 2026-10-08, AUD-02 #97). Coherente con `BRANCH_PROTECTION=false` del README.
- Regla procedimental vigente: solo se fusiona por PR con CI verde. Las rutas de `.github/CODEOWNERS` requieren además el label `r9-ratificado`, que aplica solo la Dirección Humana; el check `compuerta-r9` falla sin él.
- **Límite declarado (R15):** todos los agentes operan con la misma cuenta que la Dirección Humana, así que ni CODEOWNERS ni el label autentican a la persona: son fricción y traza auditable, no control de acceso. El control real requiere protección de rama (opción B de #97) **y** identidad separada para los agentes.
- Los agentes de IA trabajan sobre issues y PRs (estado compartido legible por cualquier ecosistema), no sobre conversaciones privadas.

## Estructura de un issue de evidencia

```md
**EV:** EV-00X
**Comando/salida esperada:** ...
**Criterio de éxito:** ...
```
