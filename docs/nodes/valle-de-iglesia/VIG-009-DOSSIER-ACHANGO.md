# VIG-009 — Dossier Achango MHN (R9-CANON-VIG-009): registro y verificación

**DELocalSoy.AR — Nodo Valle de Iglesia · Issue #241 · PR #242**
*[agent: vibe] — 2026-10-18 · CI caído, sin merge sin CI verde (R15)*

## 1. Origen y alcance

La DH relayó el dossier patrimonial de la Capilla de Achango con protocolo `R9-CANON-VIG-009` (timestamp `2026-10-18T14:45:00.000Z`, emisor `NODO-VALLE-DE-IGLESIA-VIG`). Este documento registra su aterrizaje **verbatim** como documentación (decisión DH 2026-10-18, mismo patrón que las fichas cooperativas VIG-008 de este PR).

**SIN SEED.** Ninguna observación patrimonial, punto geoespacial ni rol de custodia se siembra. El diseño VIG-009 ratificado (#241, PR #242) reutiliza: VIG-004 (patrimonio, modo protegido ADR-036), CORE-005 (reportes ciudadanos con historial público ADR-038), KPIs VIG-003 y oportunidades Bloque 9 con consentimiento de actores. El manifiesto de **cero recaudación** ya está ratificado: la plataforma no recauda dinero, no administra presupuestos ni reemplaza licitaciones públicas.

## 2. Consistencia con el corpus registrado

| Campo | Dossier | Corpus |
|---|---|---|
| Declaratoria | Ley Nacional N° 24.790 (1997), MHN | Coincide (registro público, verificado en tandas 1–2) |
| Sistema constructivo | Muros de adobe 1,10 m, cubierta de torta de barro con paja, viguería de álamo y algarrobo | Coincide (arquitectura adobe/tapia; muros 1,10 m; ~90% estructura original) |
| Cero recaudación | sinManejoDeFondos | Coincide con regla VIG-009 ratificada |
| Cámara secreta | No mencionada | Correcto: el diseño VIG-009 ordena nunca especular |

## 3. Hallazgos R4/R12 (verificación mecánica)

1. **hashIntegridadDossier (`sha256:d8a5712f…`) NO verificado.** Mismo patrón que las fichas VIG-008, donde el hash declarado resultó ser `sha256("[]")` (placeholder fabricado). La claim de integridad criptográfica no está acreditada; el dossier se preserva verbatim.
2. **puntoPublicoAutorizado (-30.2894, -69.1978):** verificado en vivo contra `packages/db/prisma/seed-subnodos.sql` (main) — coincide con el **punto público BAHRA del paraje Achango** (-30.289139, -69.197880, external_id `70049A00`) redondeado a 4 decimales. Es el punto del PARAJE, no un punto propio de la capilla: el seed VIG-002 deliberadamente NO asigna punto propio al activo Capilla de Achango (el único activo con punto es el yacimiento Angualasto). El dossier no cita fuente (ADR-035) y combina `modoProtegidoADR036: true` con coordenada publicada — tensión interna. Mapeo canónico: punto del paraje = disponible (BAHRA `70049A00`); punto propio de la capilla = pending hasta fuente/consentimiento.
3. **Fechados "~1739 documental vs 1630 tradición oral" SIN cita.** Regla del corpus: no inventar fechados de Iglesia (los 14C conocidos son de Calingasta). Mapeo canónico: pending hasta fuente materializada. Positivo: no promedia las fechas divergentes.
4. **Mandas patronales (Virgen del Carmen 16-07, Santa Bárbara 04-12) sin fuente institucional.** Fechas de calendario litúrgico plausibles; el patronazgo queda community_validated/pending, no verificado.
5. **Schema referenciado inexistente.** `https://delocalsoy.ar/schemas/v1/dossier-achango-r9.json` no existe en el repo.
6. **Positivo:** cero nombres civiles (ADR-027 / Ley 25.326); cero recaudación declarada; declaratoria MHN verificada; sistema constructivo consistente con el corpus.

## 4. Estado canónico (reglas ratificadas)

- Declaratoria Ley 24.790 (1997) MHN: **verified** (registro público).
- Punto: el del paraje es **disponible** (BAHRA `70049A00`, seed vivo); el punto propio de la capilla queda **pending** (ADR-035/036).
- Fechados y mandas patronales: **pending**.
- Observaciones patrimoniales: vía reportes CORE-005 (testimonio → corroborada, ADR-038), nunca alta directa. Custodio solo como ROL con `custodio_hash` (VIG-004).
- El JSON se preserva verbatim; este doc es la capa de verificación y mapeo canónico.

## 5. Contenido faltante del stage VIG-009

El stage reportado por agent.google (`AchangoApoyoPanel.tsx`, timeline de observaciones append-only, atlas botánico del nudo, mapa de 6 actores, exportador del dossier) **NO fue relayado ni incluido en el tar de 39 archivos** (lote-base-consolidada). Queda pedido por el canal de lotes.
