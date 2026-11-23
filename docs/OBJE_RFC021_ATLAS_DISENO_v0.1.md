# OBJE-RFC-021 — Atlas Territorial: diseño del detalle por nodo (v0.1)

> **DISEÑO — NO IMPLEMENTADO.** Este documento es el entregable docs-first (DL-10) del slice OBJE-RFC-021 (#588) de la épica OBJE-CAMPUS (#531). **La UI actual NO se toca en este PR**: el PR es docs-only (este archivo + registro EV-125). Si la DH ratifica el diseño, la implementación será un sub-slice posterior regido por los criterios de aceptación de §8.
>
> - **Origen:** RFC-021 del Documento Fundacional Integrado (contraste v0 del 13/11/2026, EV-112/PR #528); MVP-1 CONFIRMADO = RFC-020/021.
> - **Orden DH:** 2026-11-22 (descomposición ratificada de la épica #531 en sub-issues #573..#601).
> - **Diseño pre-PR (ECO-2):** #588#issuecomment-7089424401 (publicado ANTES de este PR).
> - **Sustrato verificado contra main @ `77e02e582130f9f7340ec4fa1d41d9721939b2c7`** (EV-124), regla R15: el diseño parte del estado REAL acreditado, no del deseado.

## 1. Por qué un re-contraste

El contraste v0 (EV-112) pedía para RFC-021 un re-contraste contra main vigente: MVP-1/EV-113 (PR #538, épica #532) aterrizó DESPUÉS del contraste. Este documento ES ese re-contraste, en clave de diseño: verifica el sustrato real y especifica el vacío que queda (el detalle de nodo) SIN crear superficies nuevas donde ya existen acreditadas.

## 2. Sustrato real verificado (main @ `77e02e58`)

Lectura del contenido real de los 3 archivos (R15):

- **`apps/api/src/routes/atlas.ts`** — `GET /api/atlas/:nodo` (ADR-084): 5 bloques — vocabulario (CORE-002), kpis (LIC-R1/EV-115), amenazas (LIC-R4/DL-9), convenios (LIC-R9/DL-14), curricular (MVP-1 S2, sello `curricular.curso_declarado`). Tres estados honestos por bloque: `publicado | sin_fuente_ingestada | en_custodia`. `400` si el nodo está fuera del vocabulario (capital | caucete | iglesia). Detalle server-side (AUD-06). El catálogo curricular nace en 0 honesto hasta la ingesta del corpus DLUI-IT (ECO-5, solo-DH).
- **`apps/web/src/lib/atlasTerritorial.ts`** — normalizador con orden canónico de bloques, `NODOS_ATLAS` (capital | caucete | iglesia), `METADATOS_BLOQUE` (título, descripción accesible, etiqueta textual por estado — WCAG 1.4.1), estados validados.
- **`apps/web/src/components/AtlasTerritorialPanel.tsx`** — panel solo-lectura montado en la sección 6i de `#lab` (M0, `App.tsx` sin tocar); consumo único vía `DataSource.getAtlasNodo` (ADR-040); selector de nodo; `loading` con `role="status"` y `error` con `role="alert"`; lista de bloques con descripción accesible + `sr-only` textual del estado.

## 3. Decisión central del diseño: ENLAZAR, no crear rutas

El RFC-021 pide diseño (wireframes y flujos), no backend. Por eso la decisión central es que **el detalle NO crea ni una sola ruta nueva**: cada bloque del detalle ENLAZA a la superficie ya acreditada que lo compone.

| Bloque del detalle | Enlace a (superficie acreditada) | Acreditación |
| --- | --- | --- |
| Vocabulario | `GET /api/nodos` (vocabulario público CORE-002) | EV-113 |
| KPIs | Observatorio por nodo `GET /api/nodos/:key/observatorio` + su panel | LIC-R1 / EV-115 |
| Amenazas | Ficha de ingesta y capas de amenaza | LIC-R4 / DL-9 + EV-106 |
| Convenios | `GET /api/convenios` | LIC-R9 / DL-14 + EV-111 |
| Curricular | Rutas de la matriz curricular | MVP-1 S2 + EV-113 |

Consecuencia directa, favorable a las compuertas: **cero rutas nuevas = cero cambio de openapi** (v7.54.0, 83 paths, queda intacta) y cero migración.

## 4. Flujos de usuario

- **F1 — Entrada y selección de nodo (existe; se ratifica tal cual):** selector con los 3 nodos del vocabulario; nodo fuera de vocabulario es imposible de elegir desde la UI y el servidor lo rechaza con 400 (defensa en profundidad R5).
- **F2 — Vista ampliada del bloque (nueva):** cada bloque es navegable mediante ENLACE TEXTUAL (no solo clicable visual, WCAG 1.4.1) hacia su superficie correspondiente (tabla §3). La vista ampliada no duplica datos: muestra el bloque con sus estados y conduce a la fuente.
- **F3 — Procedencia por bloque (nueva):** cada bloque declara FUENTE + FECHA DE CORTE + CUSTODIA, patrón de las fichas metodológicas: qué superficie lo emite, cuál fue el corte de datos y en qué estado de custodia está, con la tripleta de estados honesta.
- **F4 — Red caída y errores (consolidación):** los errores ya declarados en R5 se consolidan en copies únicas por causa (400 fuera de vocabulario / red / sin datos), mismas que ya usa el panel (`role="alert"`).

## 5. Estados honestos y principios (R15)

1. Tripleta `publicado | sin_fuente_ingestada | en_custodia` en cada bloque, en cada vista; `en_custodia` SIEMPRE declara el pipeline (fuente externa pendiente), jamás simula dato.
2. `null ≠ 0`: lo nulo se declara (» sin fuente ingesta aún»), jamás se muestra como cero (canon DL-13 / KPIs honestos```0 de N````).
3. El detalle SIEMPRE muestra procedencia (fuente + fecha de corte), canoa DL-13.
4. Los KPIs heredan la regla del observatorio: conteos «0 de N» honestos, sin ranking.

## 6. Wireframes textuales

### 6.1 Desktop (panel de detalle, sección 6i de #lab)

```
┌──────────────────────────────────────────────────────────────┐
│ 6i · ATLAS TERRITORIAL — Nodo: [ capital ▾ ]  (selector F1)   │
├──────────────────────────────────────────────────────────────┤
│ ① VOCABULARIO DEL NODO          [estado: publicado]          │
│    19 dominios · procedencia: core-002, corte 10/11/2026      │
│    → ENLACE: «Ver vocabulario público en CORE-002»            │
│ ② INDICADORES (KPIs)            [estado: publicado]          │
│    28 KPIs, conteos «0 de N» honestos · corte 22/11/2026      │
│    → ENLACE: «Ver observatorio (LIC-R1)»                      │
│ ③ AMENAZAS Y RESILIENCIA        [estado: sin_fuente_ingestada]│
│    » Sin fuente ingesta aún — no se muestra 0 (R15)           │
│    → ENLACE: «Ver ficha de ingesta (DL-9)»                    │
│ ④ CONVENIOS                     [estado: en_custodia]        │
│    » Procesamiento en custodia — declara pipeline, sin dato   │
│    → ENLACE: «Ver convenios (DL-14)»                          │
│ ⑤ OFERTA CURRICULAR             [estado: publicado]           │
│    0 cursos honesto hasta ECO-5 · corte del corpus: —         │
│    → ENLACE: «Ver matriz curricular (MVP-1 S2)»               │
└──────────────────────────────────────────────────────────────┘
   Flujos: F1 selector · F2 enlaces textuales · F3 procedencia
   impresa en cada bloque · F4 errores con role="alert".
```

### 6.2 Móvil (pizarra móvil, patrón pizarra #543)

```
┌───────────────────────────────┐
│ ATLAS — Nodo: [ capital ▾ ]   │  touch ≥ 44 px (token
├───────────────────────────────┤  --touch-target-min, EV-122)
│ ① Vocabulario   [publicado]   │
│   enlace textual → CORE-002   │
│ ② KPIs          [publicado]   │
│   enlace textual → observ.    │
│ ③ Amenazas [sin_fuente…]      │
│   enlace textual → DL-9       │
│ ④ Convenios   [en_custodia]   │
│   enlace textual → DL-14      │
│ ⑤ Curricular   [publicado]    │
│   enlace textual → MVP-1 S2   │
├───────────────────────────────┤
│ aria-live="polite" al cambiar │  F1 dispara región de
│ de nodo o de estado (R5)      │  estado, jamás solo color.
└───────────────────────────────┘
```

## 7. Compuertas transversales heredadas (sin excepción)

1. **WCAG 2.2 AA (ADR-061):** enlaces textuales 1.4.1, etiquetas textuales del estado (ya en el normalizador), focus visible, touch targets 44 px en móvil (SC 2.5.8, patrón EV-122).
2. **Anti-ranking:** la selección de nodo es NAVEGACIÓN (R5/ADR-036), jamás comparación entre nodos; no hay métricas cruzadas ni topes.
3. **k-anonimato (ADR-069):** todo agregado del detalle sigue el umbral de supresión del observatorio (compuerta del emisor, no del lector).
4. **Anti-PII (ADR-027 / Ley 25.326):** sin actores individuales; convenios ya contratados sin PII.
5. **Geo sensible (patrón Iglesia):** el atlas expone SOLO estados, conteos y enlaces; jamás geometrías de dominios sensibles (bloque HIDR-GRANDES, LIC-07).
6. **DataSource (ADR-040):** todo consumo de datos del detalle via `DataSource`, sin `fetch` directo.

## 8. Fuera de alcance de este slice (declarado)

- Geometrías de dominios sensibles (bloqueadas por LIC-07/ADR-084).
- Contenido curricular enriquecido vía RAG (ECO-5): requiere las ingesta del corpus DLUI-IT, pendiente solo-DH.
- Comparativas entre nodos y rankings (anti-ranking).
- Toda vía de escritura territorial (ADR-084): el detalle es solo-lectura.

## 9. Criterios de aceptación verificables (para la implementación futura, NO de este PR)

1. La UI del detalle expone los 5 bloques con su tripleta de estado del servidor y sus enlaces textuales de la tabla §3 — sin órdenes nuevas al API (0 rutas nuevas: la openapi sigue v7.54.0/83 paths en el diff).
2. Cada bloque muestra procedencia (fuente + fecha de corte + custodia) y `en_custodia` declara el pipeline con copy textual (no color solo).
3. F1 mantiene el selector de nodo con los 3 valores de `NODOS_ATLAS`; falla R5 con `role="alert"` si el API responde 400.
4. El cambio de vista de nodo dispara región `aria-live="polite"`; todos los botones/touchables del panel cumplen 44 px.
5. Suite `atlasTerritorial` conservada en verde y el normalizador sin cambios de firma (el detalle consume el mismo contrato de `GET /api/atlas/:nodo`).
6. Sin cambio de `App.tsx` (M0) y sin cambio de API: PR mixto prohibido; el sub-slice de implementación deviene frontend puro.

## 10. Trazabilidad

- Origen: RFC-021 (Documento Fundacional Integrado) → contraste v0 EV-112 (PR #528) → MVP-1 EV-113 (PR #538) → descomposición #573..#601 (orden DH 2026-11-22).
- Este doc: slice OBJE-RFC-021 #588, épica OBJE-CAMPUS #531. Diseño pre-PR: #588#issuecomment-7089424401.
- Registro de evidencia: **EV-125** (PR de registro ECO-2, docs-only, inmediatamente posterior a este).
- Evidencia del sustrato: EV-112 (`167ab220`), EV-113 (`fa6c7df7`), EV-115/LIC-R1 observatorio, EV-106/DL-9, EV-111/DL-14, EV-124 (conteo 36 RFCs: 7 mapeados · 19 parciales · 10 futuros).
