# Demo territorial federado — v5.1 (correcciones de honestidad)

Archivo: `delocalsoy-demo-territorial-federado.jsx` (un solo componente React, sin dependencias salvo `react`).
Ubicación sugerida en el repo: `docs/demo/` (referencia visual). No forma parte del núcleo Track A.

## Qué es y qué no es
- Es una **ilustración de diseño con datos 100% sintéticos**. Ningún registro proviene de un relevamiento real.
- **No ejecuta inteligencia artificial.** El panel "Contrato ético (plantilla)" es texto fijo que muestra cómo se separarían Dato, Interpretación y Sugerencia.
- No usa PostGIS, Redis ni `events_raw` reales: los eventos viven en memoria del navegador.
- No cuenta como evidencia en `EVIDENCE_REGISTER.md`.

## Cambios respecto de la versión recibida (869 líneas)
1. Estados `Verificado / Pendiente / Validación comunitaria` ahora se rotulan "(ejemplo)".
2. Las fuentes ya no nombran organizaciones reales ("Cooperativa Agrícola", "Cámara de comercio"...): muestran "Ilustrativa · tipo de fuente".
3. Se renombraron dos registros que parecían instituciones reales (CIC y Unión Vecinal y Copa de Leche).
4. Panel ético: se eliminaron "spatial_cluster_analysis", "Confianza 0.74" y `context_hash` (no se calculaban).
5. Poblaciones alineadas con las diapositivas (INDEC 2022, redondeado): Capital 115.000, Caucete 44.000, Iglesia 8.800.
6. Capital se presenta como corredor Centro–Cívico–Desamparados dentro del departamento Capital (Desamparados es un distrito de Capital).
7. Caucete: foco "Educación, salud y comunidad" (coherente con el formulario).
8. El reporte creado ahora **aparece en el mapa** en la ubicación elegida, y su estado puede avanzar (simulado) con historial y evento `TerritorialReportStatusChanged`.
9. Se quitaron los botones inertes "Ver en mapa" y "Compartir".
10. Guía de presentación con dos modos: clip de video (0:30) y Pitch Day (≈4:55). El video completo admite 4:00 en total.
11. Bug original corregido: `node.color` no existía y los botones de reporte quedaban sin fondo.
12. Pie de página: "Ilustración de diseño, no es la plataforma en producción".

## Cómo correrlo (sin red en la sesión de revisión; verificado solo con análisis de sintaxis)
```bash
pnpm create vite demo --template react && cd demo
# copiar el .jsx a src/ e importarlo en main.jsx; el componente usa clases utilitarias de Tailwind
pnpm install && pnpm dev
```
Estado de verificación: **sintaxis JSX comprobada con `tsc`; no se ejecutó en un navegador.** Falta una corrida real antes de grabar.

## Regla para el video y el formulario
Decir "demo con datos sintéticos de diseño". No decir "plataforma funcionando", "IA", ni asociarlo con las metas del formulario.
