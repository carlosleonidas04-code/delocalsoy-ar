# VIG-008 — Fichas cooperativas (R9-CANON-VIG-008): registro y verificación

**DELocalSoy.AR — Nodo Valle de Iglesia · Issue #240 · PR #242**
*[agent: vibe] — 2026-10-18 · CI caído, sin merge sin CI verde (R15)*

## 1. Origen y alcance

La Dirección Humana (DH) relayó 2 fichas cooperativas con protocolo `R9-CANON-VIG-008` (timestamp `2026-10-18T14:45:00.000Z`, emisor `NODO-VALLE-DE-IGLESIA-VIG`): `coop-tudcum` y `coop-valles-iglesianos`. Este documento registra su aterrizaje **verbatim** como documentación en `docs/nodes/valle-de-iglesia/fichas-cooperativas/` (decisión DH ratificada el 2026-10-18).

**SIN SEED.** La regla VIG-008 ratificada (#239, traza issuecomment-6239735283) se mantiene intacta: ningún dato enriquecido de cooperativas se siembra en la base sin consentimiento institucional formal de la persona jurídica. Ambas fichas declaran `consentimientoInstitucional: "pendiente"`. Las 2 cooperativas ya sembradas en VIG-002 (solo matrículas INAES como activos verificados) quedan sin cambios.

## 2. Consistencia con el corpus registrado

Verificación contra el corpus acreditado (tandas 1–3 de investigación, trazas #167–#174; VIG-002 PR #179; investigación VIG-008 del 2026-10-17):

| Campo | coop-tudcum | coop-valles-iglesianos | Corpus |
|---|---|---|---|
| Matrícula INAES | 28.777 | 11.463 | Coincide (declarado por FECOAGRO; INAES sin verificar) |
| Matrícula provincial | 659 | 170 | Dato explícito nuevo (Dirección Provincial de Cooperativas de San Juan) |
| Constitución | 12-08-2004 | 25-08-1987 | Coincide |
| Socios activos | 10 | 31 | Coincide |
| Domicilio publicado | Calle Florida s/n, Tudcum | Calle El Jarillal s/n, Las Flores | Coincide (postal público; sin punto geoespacial, ADR-036) |
| Federación | FECOAGRO (05-09-2005, acta N° 142) | FECOAGRO (18-12-1992, miembro fundador) | Coincide |
| Habilitación Ley 2400-T | padrón no encontrado | padrón no encontrado | Coincide |
| Productos publicados | 0 | 0 | Vacío honesto |

## 3. Hallazgos R4/R12 (verificación mecánica)

1. **Integridad criptográfica NO acreditada (crítico).** El `hashEsperado` de coop-valles-iglesianos (`4f53cda18c2baa0c...`) es exactamente `sha256("[]")` — un placeholder fabricado, no el hash del contenido. El de coop-tudcum (`a93b48f9...`) tampoco reproduce contra serializaciones candidatas (texto±NL, compacto, entidad, id, subconjuntos). La claim `integridadCriptografica.inmutable: true` queda registrada como declaración sin respaldo (R15). Las fichas se preservan verbatim; este hallazgo vive en este doc.
2. **Vocabulario epistémico divergente.** `validado|comunitario|pendiente|sintetico` es el vocabulario NCAP-R2 (`EstadoHonestoNCAPSchema`), no el canon del repo (`verified|community_validated|pending|synthetic_demo`).
3. **"sintetico" mal usado para unknown/vacío honesto.** El padrón 2400-T no encontrado y los 0 productos son unknown/vacío honesto, NO datos demo sintéticos. Mapeo canónico: unknown / vacío ≠ synthetic_demo.
4. **matriculaInaes "validado" vs corpus "INAES sin verificar".** El corpus registrado dice que los datos fueron declarados por FECOAGRO sin verificación materializada contra el padrón INAES (ADR-035).
5. **Schema referenciado inexistente.** `https://delocalsoy.ar/schemas/v1/ficha-cooperativa-r9.json` no existe en el repo.
6. **Positivo:** cero nombres civiles, solo roles institucionales (ADR-027 / Ley 25.326); datos 100% consistentes con el corpus; consentimiento explícitamente pendiente en ambas.

## 4. Estado canónico (decisiones DH ratificadas 2026-10-18)

- `matriculaInaes` / `matriculaProvincial`: **community_validated** (declarado por FECOAGRO; sin consulta materializada al padrón INAES) hasta evidencia materializada (ADR-035).
- `estadoVigenciaInaes`: **pending** (reordenamiento INAES 2024-2026).
- `habilitacionTuristica2400T` / `productosPublicadosCount`: **unknown / vacío honesto** — nunca synthetic_demo.
- Geolocalización: **NULL** hasta consentimiento (ADR-036).
- El JSON se preserva verbatim; este doc es la capa de verificación y mapeo canónico.

## 5. Desbloqueo del seed enriquecido (VIG-008)

El seed enriquecido se desbloquea únicamente con: (1) asamblea y consentimiento institucional formal de cada cooperativa; (2) consultas INAES materializadas (matrículas + vigencia); (3) padrón Ley 2400-T. Nada de esto es derivable por agent-vibe (R1/R15). Los pedidos formales están registrados en el diseño VIG-008 (PR #242).

