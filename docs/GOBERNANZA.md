# Gobernanza documental — DELocalSoy.AR (v7.1)

## Principios

1. **Verdad técnica sobre documento**: lo que no corre, no existe.
2. **Evidencia primero**: cada afirmación de estado cita una EV-xxx de `EVIDENCIA.md`.
3. **Un solo flujo**: GitHub es la única fuente; el repo es la verdad, no los chats.

## Flujo sinérgico IA ↔ GitHub

- Cada tarea relevante (sprint, evidencia, decisión) se registra como **issue** con plantilla.
- Todo cambio va por **rama + PR**; el PR referencia la evidencia que produce o consume.
- `main` está protegido: solo se fusiona con PR aprobado y CI verde.
- Los agentes de IA trabajan sobre issues y PRs (estado compartido legible por cualquier ecosistema), no sobre conversaciones privadas.

## Estructura de un issue de evidencia

```md
**EV:** EV-00X
**Comando/salida esperada:** ...
**Criterio de éxito:** ...
```
