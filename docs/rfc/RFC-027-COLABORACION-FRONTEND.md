# RFC-027 — Colaboración Frontend — DELocalSoy.AR

**Estado:** PROPUESTA para ratificación DH (R9: sin ratificación no hay fusión)
**Fecha:** 2026-10-16 · **Responsables:** agent-vibe (canal, estados, accesibilidad, foco, PWA) · agent-google (identidad visual)
**Frase rectora** (reemplaza la "regla de oro" original): **agent.google define la capa visual; agent-vibe garantiza foco, accesibilidad, PWA y honestidad del estado. TV y vehículo son hipótesis de canal, no compromisos de entrega.**

## 1. Objetivo

Establecer una colaboración verificable para construir una experiencia territorial de alta calidad sin comprometer la honestidad epistémica, la accesibilidad ni la trazabilidad. Este RFC es un contrato, no un diseño de pantallas: primero se coteja el estado real, luego se ratifican tokens semánticos, estados honestos, accesibilidad y reglas de procedencia; recién después se producen componentes y flujos.

## 2. Roles

| Mesa | Responsable principal | Entrega | No decide |
|---|---|---|---|
| Epistémica | agent-vibe + DH | Contratos de estado, procedencia, permisos, vocabulario, reglas de honestidad | Estética final |
| Visual | agent.google | Tokens primitivos/semánticos, tipografía, composición, iconografía, motion, componentes visuales | Semántica del dato |
| Integración | agent-vibe + agent.google | Componentes implementados, accesibilidad, responsive, pruebas, CI | Nuevos alcances sin ratificación DH |

ADR-034 rige la separación diseño/lógica; el scope-guard-lote-estetico lo aplica en CI: lotes estéticos puros solo en `apps/web/src/design/`, `apps/web/src/styles.css` y `apps/web/index.html`; toda mezcla diseño+lógica exige label `mixto-r9` (fricción invertida: el permiso es lo excepcional).

## 3. Contrato de estados honestos

Los estados son API visual de componente, no clases sueltas:

- Epistémicos: `validated`, `community`, `pending`, `synthetic` — idénticos en todas las superficies; señales color·borde·glifo·microcopia ya definidas en tokens.css.
- Operativos: `loading`, `empty`, `partial`, `error`, `offline`, `forbidden`, `stale`.
- Cada componente territorial debe poder expresar ambos ejes (una ficha puede ser `validated` y `stale` a la vez).
- Ningún color es el único portador de significado (siempre glifo + microcopia).
- Divergencia abierta: `#4ade80` (validado, agent.google) vs `--honest-*` real de tokens.css. Regla de fusión: contrastar, validar AA, actualizar un ÚNICO token canónico. Mientras tanto, rigen los `--honest-*`.

## 4. Tokens compartidos

| Capa | Dueño | Regla |
|---|---|---|
| `primitive` | agent.google propone | agent-vibe revisa contraste/consistencia |
| `semantic` (honest-*, action, surface, feedback) | conjunto | ningún color de estado se cambia sin prueba de contraste + revisión semántica |
| `component` (card, map, report, kpi, rag-answer) | agent-vibe implementa | sobre el diseño de agent.google |
| `platform` (--platform-*, densidad, foco, safe-area) | agent-vibe | **diferido hasta convergencia** (decisión F0-D1); expediente listo en rama feat/ux-001-tokens-plataforma |

## 5. Inventario mínimo de componentes

`HonestBadge` · `SourceChip` · `TerritorialCard` (container queries) · `MapLayerPanel` · `ReportForm` · `RagAnswer` · `KpiTile` · `PermissionGate` · `EmptyState` · `OfflineBanner`.

Requisitos transversales: estados epistémico+operativo, procedencia visible, foco accesible, adaptación por contenedor (no por dispositivo).

## 6. Accesibilidad y responsive (WCAG 2.2 como criterio de aceptación, no mejora posterior)

- Foco visible con contraste ≥ 3:1 vs estado no enfocado; nunca suprimido ni oculto por headers/paneles/modales.
- Targets ≥ 24×24 CSS px; navegación completa por teclado en formularios, mapa, fichas y paneles.
- Contraste ≥ 4.5:1 en texto normal; errores de formulario asociados al campo, no en toast global.
- `prefers-reduced-motion` respetado; textos alternativos para capas, iconos y estados del mapa.
- `Escape`/`Backspace`/back de móvil resuelven a la misma acción `back` (contrato InputManager de UX-002).
- Responsive por container queries; breakpoints globales solo para layout de página.

## 7. Reglas de mapa y procedencia

- Sin geometría validada no se publica límite definitivo; nodos sin límite muestran advertencia.
- Datos sintéticos rotulados (ADR-029); procedencia visible (ADR-035); geo minimizada (ADR-036); anti-PII (ADR-027).
- Toda ficha, KPI, capa o respuesta RAG muestra fuente, fecha, confianza y revisión humana cuando corresponda.
- Degradación explícita: mapa propio SVG + banner "mapa simplificado — sin conexión"; nunca datos fabricados.
- Voz territorial: solo el RAG existente (/api/nodos/:key/ask, VIG-006); "no tengo datos verificados" es respuesta válida y prioritaria.

## 8. Criterios de aceptación por fase

- **F3 (sistema de diseño):** una ficha territorial se ve correcta en panel angosto, móvil y escritorio, mostrando fuente, certeza, estado operativo y acciones permitidas — sin datos fabricados ni pérdida de accesibilidad.
- **PWA/UX-003:** instalable (manifest + SW + HTTPS); cola diferida persistente real ("pendiente de sincronizar — N elementos en su dispositivo"); toast de éxito SOLO con sincronización real; gate de CI Lighthouse.
- **Reportes:** ningún reporte muestra éxito falso; estados recibido → en_evaluacion → en_gestion → resuelto.
- **RAG:** ninguna respuesta puede confundirse con dato oficial (Dato → Interpretación → Sugerencia con confianza y revisión visibles).

## 9. Prohibiciones y scope guards

- No diseñar TV, vehículo ni app nativa como entregables actuales (hipótesis de canal, backlog diferido con condición de entrada).
- No implementar tokens de plataforma antes de la convergencia visual si genera conflicto con agent.google (F0-D1).
- No presentar Marketplace, pagos, WhatsApp, WebSocket o app móvil como parte del frontend base.
- No usar mapas decorativos sin fuente ni estado; no ocultar datos sintéticos/parciales/desactualizados.
- No diseñar formularios que asuman conectividad permanente; no usar color como único canal de significado.
- Ninguna acción se habilita si el backend no la autoriza (permiso + recurso + nodo + estado; nunca solo el rol).

## 10. Plan de convergencia con Canvas Maestro

1. agent.google aterriza por lotes en feat/stage-canvas-maestro-vig (protocolo Lote 0 en #167): primero manifiesto, luego lotes.
2. Sus componentes (5 pestañas, NodeTransitionNavigator, dashboard VIG) se montan sobre nuestros contratos: input/foco (UX-002), estados honestos, accesibilidad y PWA.
3. Divergencias ya agendadas: color de "Validado" (#4ade80 vs --honest-*), los 4 BaseConsolidadaPrototype, docs/CANVAS_MAESTRO_DISENO.md en scope docs.
4. Expediente UX-001 reabrible tras convergencia: contraste #4ade80 → decisión DH → extensión de tokens --platform-* solo si agent.google no las cubre.
5. División que se mantiene: **ellos el estilo, nosotros la verdad del canal.**
