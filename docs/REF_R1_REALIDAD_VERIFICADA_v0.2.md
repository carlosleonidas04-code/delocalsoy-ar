# REF-R1 — Realidad verificada v0.2 de la interfaz + criterios medibles (épica REF #633)

> **Estado: DISEÑO/AUDITORÍA — NO IMPLEMENTADO.** Slice REF-R1 (#634, épica #633 «Interfaz refundada»).
> Base: main @ `797e0cbc` (2026-11-27). Método HITUB: observar → obtener evidencia → verificar. Docs-only: este documento no toca producto.

## 1. Método y límites (honesto, R15)

- Auditoría estática mecánica: lectura completa de `apps/web/src/App.tsx`, `design/tokens.css`, A1–A4, `ArtefactosRoot.tsx`, `MiCuenta.tsx`, `components/TopBarHeader.tsx` y `lib/nodosRuta.ts`.
- Contrastes WCAG 2.2 calculados con la fórmula oficial (luminancia relativa, umbral 0.03928). Sin estimaciones (R15).
- **Límite declarado:** este entorno de trabajo no tiene navegador; la medición DOM a 390/360 px no se ejecuta acá. Queda definida como criterio scriptado de los slices de implementación (REF-R3+). Los conteos de «códigos visibles» por regex incluyen comentarios de código y no sustituyen una lectura DOM.

## 2. Contraste de color medido (WCAG 2.2)

### Tema oscuro (default)

| Par (token → superficie) | Ratio | Texto 4,5:1 | UI 3:1 |
|---|---|---|---|
| --color-text-primary #f5f1e8 → bg-canvas #0d0b08 | 17,44 | ✓ | ✓ |
| --color-text-secondary #b8afa0 → tarjeta #181410 | 8,44 | ✓ | ✓ |
| **--color-text-muted #7a7264 → canvas** | **4,14** | NO | ✓ |
| **--color-text-muted #7a7264 → tarjeta** | **3,85** | NO | ✓ |
| **--color-text-muted #7a7264 → elevado #1f1a14** | **3,63** | NO | ✓ |
| **--color-border-default #332c22 → canvas** | **1,43** | — | NO |
| **--color-border-default #332c22 → tarjeta** | **1,33** | — | NO |
| **--color-border-strong #4a4031 → canvas** | **1,94** | — | NO |
| **--color-border-strong #4a4031 → tarjeta** | **1,80** | — | NO |
| --color-accent-primary #ffc72c → canvas (y texto #0d0b08 sobre dorado) | 12,60 | ✓ | ✓ |
| --color-accent-secondary #75aadb → canvas | 7,98 | ✓ | ✓ |
| --node-caucete-text #75aadb → tarjeta | 7,44 | ✓ | ✓ |
| --node-iglesia-text #f2a71b → tarjeta | 9,00 | ✓ | ✓ |

### Tema claro (light, `:root[data-theme='light']`)

| Par (token → superficie) | Ratio | Texto 4,5:1 | UI 3:1 |
|---|---|---|---|
| --color-text-primary #181410 → canvas #f5f1e8 | 16,25 | ✓ | ✓ |
| --color-text-secondary #4a4031 → canvas claro | 9,00 | ✓ | ✓ |
| **--color-text-muted #7a7264 → canvas claro** | **4,22** | NO | ✓ |
| --color-text-muted #7a7264 → tarjeta blanca | 4,75 | ✓ | ✓ |
| **--color-border-default #d4c9b8 → blanco** | **1,63** | — | NO |
| **--color-border-strong #b8afa0 → canvas claro** | **1,93** | — | NO |
| **--color-accent-primary #d99b00 → canvas claro (como texto)** | **2,16** | NO | NO |
| **--color-accent-secondary #75aadb → canvas claro (como texto)** | **2,18** | NO | NO |

**Conclusión REF-R2:** los 4 pares marcados NO confirman el diagnóstico del lienzo de Claude y suman hallazgos de tema claro que el lienzo no tenía (muted 4,22; accent/celeste como texto). El tema claro no define tokens de nodo ni `--accion`/`--foco`.

## 3. Semántica de navegación (corrige al lienzo de Claude)

- **0** ocurrencias de `role="tab"`, `role="tablist"`, `role="tabpanel"`, `aria-controls`, `aria-selected` en A1 (y en los archivos auditados).
- La navegación interna del A1 (PROT-A1 R3, #420) es `<nav aria-label="vistas del artefacto A1"><ul><button>` con `aria-current="page"` en la activa, indicador `role="status" aria-live="polite"` («vista: …») y foco devuelto a la región. Targets de `var(--touch-target-min)` (32 usos en A1).
- **Las 9 vistas del A1** (VISTAS_A1, títulos ya humanizados): Inicio · Componentes y estado · Reportes · Territorio · Fichas de valoración · Banco de Potencialidades · Directorio y producción · KPIs · Asistente territorial.
- El problema real de IA: 9 vistas dentro de un panel + un producto-sin-`#lab` que es UN apilado único (~20 secciones: Hero, `#cartografia-entrada` mapa IT-R1, `#itinerario-nodo` IT-R5, hub territorial, H1–H4, stages 6g/6h, A1–A4, etc.). → lo disuelve REF-R3, no un parche de tabs.

## 4. Cobertura aria-live y touch targets (corrige al pase EV-122)

| Archivo | aria-live | role=status | role=alert | touch-target-min |
|---|---|---|---|---|
| A1VecinoCiudadano.tsx | 19 | 7 | 12 | 32 |
| A3GestorAdmin.tsx | 18 | 7 | 11 | 0 |
| A4AuditorDatosAbiertos.tsx | 9 | 0 | 9 | 0 |
| MiCuenta.tsx | 4 | 1 | 3 | 0 |
| A2Comerciante.tsx | **2** | 8 | 9 | **0** |
| ArtefactosRoot.tsx | 2 | 1 | 1 | 0 |
| **App.tsx (tronco de producto)** | **0** | 0 | 0 | 0 |

- El pase EV-122 (PIZ-R8) declaró 54 regiones: la medición actual confirma la desprolijidad en **A2 (2 regiones)** y el **tronco App.tsx (0)**: las secciones de producto fuera de A1–A4 no tienen región de estado.
- **A2 mantiene 3 botones fijados a 24 px** (líneas 804, 965, 1278: `minWidth/minHeight: 24px`) — cumple SC 2.5.8 AA (24 px) pero NO el estándar de 44 px del proyecto (EV-122). A3/A4/MiCuenta no usan el token: su objetivo táctil queda por auditar en su slice.

## 5. Lenguaje de producto (insumo REF-R4)

- Muestras verificadas de códigos/reglas en strings visibles: «null (sin datos — NO es 0, R15)» (A3), «Sin cablear aún (honesto, R15)» y «sin KPIs para {nodo} (honesto)» (A1/A3), rótulos «(calculado {computed_at})», copy de stage con «[STAGE · ILUSTRATIVO, R15]».
- Ocurrencias estáticas (incluyen comentarios; subconjunto visible a confirmar por DOM en REF-R4): PIZ-R ×16, EV- ×15, ADR- ×84, /api/ ×23 en los 8 archivos auditados. Hex a la vista en producto: 0 (los hex viven solo en tokens.css).

## 6. Anchos y viewport 390/360

- 0 anchos mínimos fijos mayores al viewport en el código auditado (el único minWidth numérico es el de 24 px de A2). 0 `gridTemplateColumns` fijos en los archivos auditados.
- Riesgo residual declarado: tablas (A4 usa `<table>` para sellos/cobertura) y las vistas del lienzo de Claude citadas por el PDF (428/415/375 px) — la verificación es DOM y entra como criterio de REF-R3+.

## 7. Criterios de aceptación medibles (rigen para REF-R2..R11)

Todo slice REF de UI declara en su diseño pre-PR y verifica antes del merge:
1. **Contraste:** pares nuevos ≥ 4,5:1 (texto) / ≥ 3:1 (UI), calculados con esta misma función sobre los valores finales.
2. **Región de estado:** toda sección que carga datos tiene región aria-live con su estado textual (patrón EV-122), incluidas las secciones del tronco cuando se refactoricen.
3. **Touch targets:** ≥ 44 px en botones/enlaces interactivos (`var(--touch-target-min)`); se corrigen los 24 px de A2 en su slice.
4. **Lenguaje:** 0 códigos internos (PIZ/EV/ADR/hex/rutas/reglas Rn) en strings visibles del producto.
5. **Viewport:** sin anchos intrínsecos que desborden 360 px (revisión estática + criterio DOM scriptado).
6. **Frontera:** openapi v7.54.0 (83 paths) intacta; App.tsx solo dentro del orden M0 concedido.

## 8. Registro

- Este doc entra por PR docs-only; su registro EV en `docs/EVIDENCIA.md` sigue el patrón de la casa (fila + vigencia) tras merge ratificado.