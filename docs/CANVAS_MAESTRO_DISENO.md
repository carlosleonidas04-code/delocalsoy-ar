# Canvas Maestro de Diseño Territorial — DELocalSoy.AR

**Documento Rector:** `docs/CANVAS_MAESTRO_DISENO.md`  
**Acreditación:** Regla R15 (Acreditación Documentada y Empírica)  
**Versión:** 1.0.0-canonica  
**Framework:** React 18+ · Tailwind CSS · TypeScript · PostGIS SRID 4326  

---

## 1. Visión General del Canvas Maestro

El **Canvas Maestro de Diseño** es la interfaz central de auditoría visual, cartográfica, epistémica y criptográfica de DELocalSoy.AR. Articula los 3 nodos territoriales de la provincia de San Juan (Capital, Valle de Iglesia, Caucete) y garantiza la aplicación estricta del estándar ético de 4 señales independientes.

El Canvas Maestro está estructurado en **5 Pestañas Declaradas y Acreditadas**:

1. **Pestaña 1: Tokens & Patrones (P-01 a P-10)**
   - Catálogo vivo de los 43 tokens `--honest-*` (§3B).
   - Implementación y pruebas de los 10 patrones de diseño territorial.
   - Demostración de tipografía sin "pill boxes" cosméticos.

2. **Pestaña 2: Estados Epistémicos Honestos**
   - Validación empírica de los 4 estados: *Validado* (`#00A86B`), *Sintético* (`#FFC72C`), *Comunitario* (`#E06D53`), *Pendiente* (`#94A3B8`).
   - Verificación de contraste WCAG AA $\ge$ 4.5:1 con tipografía de alto contraste.
   - Despliegue simultáneo de 4 señales: color, geometría de borde, glifo y microcopia.

3. **Pestaña 3: Nodos Federados & Red Territorial**
   - Topología de los 3 nodos de la red San Juan (ADR-021).
   - Centroides WGS-84, subnodos y corredores de articulación inter-nodal.
   - Monitor de telemetría y estado de consenso federado.

4. **Pestaña 4: Cartografía Sensible (SRID 4326)**
   - Visualización de capas cartográficas vectoriales y cuencas hídricas.
   - Modos de privacidad territorial: `PUBLICO`, `COMUNITARIO_PROTEGIDO`, `RESERVADO_SENSIBLE`.
   - Protección contra extracción masiva de coordenadas de saberes ancestrales o recursos hídricos vulnerables.

5. **Pestaña 5: Trazabilidad Criptográfica & Registro R15**
   - Cadena de custodia con sumas de verificación SHA-256 por cada relevo.
   - Firmas Ed25519 acreditadas por asambleas o auditores técnicos.
   - Exportador transportable SIN TAR con límites $< 1.024.000$ Bytes.

## 2. Especificación de Componentes en `apps/web/src/components/canvas-maestro/`

| Componente | Archivo | Responsabilidad |
| :--- | :--- | :--- |
| **CanvasMaestroDiseno** | `CanvasMaestroDiseno.tsx` | Contenedor principal orquestador con selector de pestañas accesible y atajos de teclado |
| **TabTokensYPatrones** | `TabTokensYPatrones.tsx` | Explorador interactivo de los 43 tokens `--honest-*` y catálogo de patrones P-01 a P-10 |
| **TabEstadosHonestos** | `TabEstadosHonestos.tsx` | Simulador y contrastador WCAG AA de los 4 estados epistémicos con cálculo en vivo $\ge 4.5:1$ |
| **TabNodosFederados** | `NodosFederadosTab.tsx` | Topología de los 3 nodos provinciales ratificados (ADR-021) y métricas de consenso |
| **TabCartografiaSensible** | `TabCartografiaSensible.tsx` | Control de capas vectoriales WGS-84 (SRID 4326) y 3 niveles de privacidad territorial |
| **TabTrazabilidadCripto** | `TabTrazabilidadCripto.tsx` | Verificador de sumas de control SHA-256/MD5 y exportación directa de lotes sin compresión |

---

## 3. Conformidad Epistémica & Reglas de Acreditación (R1 a R15)

1. **Regla R1 (Inmutabilidad de Semántica):** Todo dato territorial mantiene su significado exacto en el tiempo; las mutaciones no justificadas son rechazadas en el gate de CI.
2. **Regla R12 (Estado Epistémico Honesto Obligatorio):** Todo relevo expone una de las cuatro señales:
   - `● Validado`: Fuentes primarias oficiales, aforos hidrológicos y catastro formal.
   - `◈ Comunitario`: Asambleas vecinales, juntas de regantes y acuerdos locales.
   - `✦ Sintético`: Proyecciones climáticas, modelos de deshielo o estimaciones censales.
   - `◐ Pendiente`: Datos secundarios o en proceso de verificación (nunca reportados como verificados).
3. **Regla R15 (Acreditación Empírica Comprobable):** Ninguna entrega se considera válida por mera declaración; requiere archivo materializado, suma criptográfica SHA-256 verificable y compatibilidad estricta con el monorepo.

---

## 4. Topología Provincial Ratificada (ADR-021)

La red federada DELocalSoy.AR se asienta sobre 3 nodos soberanos interconectados:
- **`nodo-capital-san-juan`:** Eje cívico, administrativo, universitario y comercial de la provincia.
- **`nodo-valle-de-iglesia`:** Eje cordillerano, cuencas andinas de deshielo, termalismo y agricultura agroecológica de altura.
- **`nodo-caucete-este`:** Oasis irrigado este, vitivinicultura patrimonial y corredor bioceánico.

*Cualquier módulo o vista que declare 5 nodos provinciales queda depreciado en favor de esta especificación canónica.*

---

<!-- Secciones 5-8 añadidas [agent: vibe] 2026-10-17 — PROPUESTA para ratificación DH (R9).
     Las secciones 1-4 son verbatim del agente google (lotes turnos 9-10). Nada de lo que
     sigue está acreditado por CI; el estado de cada ítem es el estado real del repositorio. -->

## 5. Erratas y Armonizaciones Canónicas [agent: vibe — propuesta]

Correcciones canónicas ratificadas por la DH que PREVALECEN sobre valores citados en las
secciones 1-4:

1. **Paleta epistémica (decisión DH 2026-10-17, traza PR #233):** los colores del §2 quedan
   reemplazados por el canon ADR-034/tokens.css:
   - `● Validado` → `#4ADE80` (original del agente: `#00A86B`)
   - `◈ Comunitario` → `#75AADB` celeste (original: `#E06D53`)
   - `◐ Pendiente` → `#F2A71B` ámbar (original: `#94A3B8`)
   - `✦ Sintético` → `#FFC72C` (sin cambio)
   Los valores originales quedan documentados en los comentarios del contrato
   (`HONEST_EPISTEMIC_STATES_PALETTE`, packages/contracts/src/index.ts, PR #233).
2. **Cuenta de tokens:** el §1 declara 43 tokens `--honest-*`; el archivo aterrizado
   `design/tokens-epistemicos.css` declara 54 (auditoría #163, comment 6238460615). La
   cuenta canónica se fija al armonizar ese archivo con `design/tokens.css` (ADR-034).
3. **Vocabulario de estados:** el repo opera con `verified | community_validated | pending |
   synthetic_demo` (servicio informativo, ADR-035) y la serie NCAP-R2 con `validado |
   comunitario | pendiente | sintetico` (equivalencia 1:1). La microcopia NUNCA declara
   `validado` sin fuente verificable (ADR-035).
4. **Subnodos del Capital:** conteo canónico ratificado = 6 (traza #154, comment
   6235922878): `sj_capital_centro` + `sj_capital_desamparados` (main, Fase C #198) +
   `capital-{centro-historico,desamparados,concepcion,trinidad}` (serie NCAP-R2). El mapeo
   entre ambas nomenclaturas es deuda declarada del PR #233.

## 6. Google Maps Platform — Capa Exclusiva de Visualización (ADR-037)

**ADR-037 ratificado por la DH (2026-10-17):** Google Maps Platform es capa EXCLUSIVA de
visualización/UX, NUNCA fuente de registro.

Reglas innegociables del ADR:
- Los ToS de Google no permiten extraer ni persistir contenido cartográfico; el dato
  territorial canónico vive en PostGIS (`events_raw`) con procedencia IGN/BAHRA/INDEC/Georef.
- Nada de lo mostrado por Google acredita `verified` (ADR-035).
- API keys server-side + degradación offline a mapa propio si el servicio no está disponible.
- Precedente negativo: RedTulum (la dependencia total de Google Maps destruye la soberanía
  de datos).

Estado honesto (R15): NINGUNA vista de Google Maps está implementada en el stage actual
(`canvas-maestro/` aterriza 6 tabs, ninguna de mapas externos). El reporte original del
agente declaraba una pestaña "Google Maps Platform & Innovación" con conmutador capa UX vs
registro soberano y simulador de degradación offline — NO aterrizó (declaración, no
acreditación). Los productos candidatos (Maps JavaScript API 2D re-estilizada, 3D Maps +
Photorealistic Tiles, Places API (New), Routes API, Street View, Aerial View) quedan como
PROPUESTA sujeta a este ADR y a su propio PR cuando se diseñen.

## 7. Roadmap Federado (P / C / K / V) — propuesta de 30 ítems [agent: vibe]

Ítems trazados a issues reales; estado de cada uno = estado del repositorio al 2026-10-17
(nada fabricado, R15):

**Plataforma (P)**
- P-1 UI CORE-005: reportes con historial público (ADR-038) y duplicados como sugerencia
  (ADR-039) — contratos y rutas en main (PRs #207-#214); UI pendiente.
- P-2 live-ws #123: gate Origin + Bearer + rate limits — PR #236 en cola de merge.
- P-3 ciclo R5-UI #109 (plazo vencido) — absorbido por este Canvas Maestro.
- P-4 Mapa federado v2 (3 nodos, corredores) — pendiente.
- P-5 Bloques 10-12 (participación, asistente territorial, federación) — especificación
  v0.1 en main (#161); implementación pendiente.
- P-6 Tokens v2 (fusión canónica de los 4 BaseConsolidadaPrototype) — condicionada al canal
  agent.google (#163).
- P-7 WCAG AA + reduced-motion como criterio de plataforma — UX-002 en cola (#224).
- P-8 PWA de relevamiento in-situ — UX-003 en cola (#227).
- P-9 Landing pública — pendiente (sin despliegue público; toda la acreditación es CI).
- P-10 Buscador federado sobre RAG VIG-006 — backend acreditado (EV-046); UI pendiente.

**Capital (C)**
- C-1 Vista del nodo Capital (subnodos, hitos, corredores provisionales) — #163 abierto;
  stage parcial en PR #238.
- C-2 UI Bloque 9 Banco de Potencialidades — backend en main (PR #160, EV-039); panel
  React en la rama NCAP-R2 (lote 2).
- C-3 Corredores `cor_*` vs ejes `axis_*` — divergencia registrada, decisión DH pendiente.
- C-4 Accesibilidad peatonal + dashboard (#157) — pendiente.
- C-5 Bloques 10/12 del Capital — pendiente.
- C-6 Serie contracts NCAP-R2 (#154) — PR #233 en cola; índice extendido + armonización de
  dominio 2026-10-17 (coordenada multi-nodo, subnodosCount 6/52/0, consentimiento ADR-027,
  oportunidades.js eliminado).

**Caucete (K)**
- K-1 Servicio informativo con fuentes publicadas (15 propias, 31 globales) — main (EV-050).
- K-2 Ficha de valoración 7 dimensiones — main (EV-038, PR #196).
- K-3 Ciclo de Cuidado mapear→validar→valorar→cuidar→construir — fases acreditadas; taller
  con docentes #139 abierto.
- K-4 Capas v6 patrón Dato–Interpretación–Sugerencia — main (EV-037).
- K-5 Geo sensible ADR-036 — main (PR #148).
- K-6 Primera ingesta real (REFES+CUE) — pipeline probado (EV-049); dataset pendiente.

**Valle de Iglesia (V)**
- V-1..V-8 (vista nodo, distrito, patrimonio modo protegido, Cuesta del Viento, producción,
  conectividad, participación, eventos) — backend COMPLETO (VIG-001..VIG-007, EV-040..EV-047);
  stage front: dashboard VIG aterrizado en PR #238; componentes restantes según §2.

## 8. Backlog & Gobernanza — estado real (R15) [agent: vibe]

- **Scope-Guard #134:** PRs `agent-google/*` solo-estética (`apps/web/src/design/`,
  `styles.css`, `index.html`); lógica o docs = `mixto-r9`. El stage del Canvas Maestro
  aterriza en ramas `agent-vibe/*` con CI roto declarado (PR #238).
- **Contrato R9/R15:** GitHub acredita, la DH ratifica; sin CI verde no hay merge.
- **CI:** GitHub Actions caído a nivel cuenta desde 2026-10-15 23:12Z (límite mensual;
  reinicio esperado ~2026-11-01; recordatorio programado task 4fb0a626).
- **Cola de merge:** 18 PRs abiertos, todos `r9-ratificado` (#216-#238). Cascada sugerida:
  #219 → #220 → #224 → #229 → #227 → #216 → #217 → #218 → #230 → #231 → #225 → #232 → #234 →
  #235 → #236 → #237 → #238 → #233.
- **Numeración EV F0-C1 (propuesta):** EV-055/056 CORE-005 (#219/#220), EV-057 NUT-CAP-008
  (#216), EV-058 sondeo UNIDE (#217), EV-059 normativa (#218), EV-060 UX-002 (#224),
  EV-061 UX-003 (#227), EV-062 UX-004 (#229), EV-063 NVIG-R1 (#230), EV-064 NVIG-R3 (#231),
  EV-065 NVIG-R5 (#234), EV-066 AUD-09 (#235), EV-067 live-ws (#236); #225/#232 sin EV
  (registros documentales); #233/#237/#238 al merge.
- **ADRs vivos:** 021 (3 nodos federados), 027 (anti-PII), 029 (DataSource), 034 (estética),
  035 (fuentes verificables), 036 (resiliencia/geo sensible), 037 (Google Maps capa visual),
  038 (transparencia de reportes), 039 (duplicados como sugerencia).
- **Deuda declarada:** lockfile pnpm desincronizado (lucide-react en #238, requiere
  `pnpm install` antes del merge); imports rotos del stage (#238); mapeo de nomenclaturas
  de subnodos del Capital (#233); evidencia materializada de Centro Histórico (#215).
