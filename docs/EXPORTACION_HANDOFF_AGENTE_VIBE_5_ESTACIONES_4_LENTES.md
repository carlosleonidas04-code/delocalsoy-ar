# 📦 Paquete Oficial de Exportación y Handoff: `[agent: google]` → `[agent: vibe]`
## Consolidación de las 5 Estaciones de Inspección, las 4 Lentes Operativas en Vivo y la Compuerta Pre-`C5` de Integridad Referencial Prisma (19 Modelos)

- **Emisor:** `[agent: google]` (Google AI Studio — Especialista en Diseño Heurístico, Tokens `ADR-034` e Interfaz Territorial en Staging)
- **Receptor Primario:** `[agent: vibe]` (Agente de Repositorio, Arquitectura y Auditoría Cruzada `R12` en GitHub / Codespace)
- **Copia Sincronizada:** `[agent: anthropic]` (`RA1–RA5` · Red-Team sobre Digest) · `[agent: perplexity/synthesis]` (`RP1–RP8` · Matriz Evidencia–Relato) · `[agent: grok]` (`ADR-025`)
- **Autoridad de Dirección y Firma (`R1` / `R8` / `R9`):** `Carlos Leonidas <carlosleonidas04@gmail.com>`
- **Repositorio:** `https://github.com/carlosleonidas04-code/delocalsoy-ar`
- **Anclas Remotas Base Reconocidas:** `main @ 2766feb` (`PR #113 R5-UI` + `R5a/R5b CORE-004` + `EV-034`) · `main @ 1272e45` (`PR #115` `ADR-034` · `Issue #109` / `#114`) · `main @ d70cbc6` (`CORE-003`) · `main @ e3616b5` (`CORE-002`)
- **Rama de Aterrizaje Acordada (`R12` / `R15`):** `agent-google/estaciones-01-05-lentes-01-04` (estado epistémico inicial: `staging_proposed_pending_ci` → acreditación en `ci.yml` + `verify.yml` → `r9-ratificado` por la Dirección Humana)
- **Alcance Territorial Invariante (`ADR-021` / `ADR-027`):** Provincia de San Juan — **Capital (Distrito Centro y Distrito Desamparados)**, **Caucete** e **Iglesia** (`0` referencias fuera de alcance).
- **Estado Epistémico (`Regla R15` · `ADR-019`):** `staging_proposed_pending_ci` / `verificado-staging` (`accreditation_scope: "staging"` — *"Staging propone, GitHub acredita, la Dirección Humana decide"*).

---

## 1. Resumen Ejecutivo de lo Construido y Verificado en `[agent: google]`

En co-diseño paso a paso con la **Dirección Humana (`Carlos Leonidas`)**, se completó y compiló en `EXIT 0` (`@delocalsoy/api` + `@delocalsoy/web`) el ciclo completo de **5 Estaciones de Inspección Heurística** y **4 Lentes Operativas en Vivo** sobre el lienzo **Pizarra Andina (`#0B111E`)**:

| Dimensión Materializada | Identificador DOM / Ruta | Qué Resuelve en el Monorepo | Estado en Staging |
|---|---|---|---|
| **Estación 01 — Materialidad Mineral 60-30-10, Tipografía `2+1` & Identidad San Juan** | `data-testid="station-01-mineral-typography-workbench"` + `apps/web/src/design/tokens.css` | Fija **Pizarra Andina (`#0B111E`)** como tema canónico por defecto, aplica `Fraunces` + `Plus Jakarta Sans` + `JetBrains Mono (tabular-nums)` y los tokens de los 3 departamentos (`--node-capital-*`, `--node-caucete-*`, `--node-iglesia-*`). | ✅ `EXIT 0` |
| **Estación 02 & Lente I — Atlas & Cockpit «Coco-Baba» (`H-TER-01` / `H-TER-04`)** | `#lens-01-atlas-coco-baba-workbench` + `data-testid="station-02-coco-baba-workbench"` | Acopla las **4 vistas rescatadas del Demo Base** (`01. Matriz 7×3`, `02. Explorar Nodo (x,y)`, `03. Comparar Nodos`, `04. Flujo 5 Pasos & JSON`), el filtro por custodio tripartito y la proyección dual `(x, y)` ↔ `PostGIS SRID=4326`. | ✅ `EXIT 0` |
| **Estación 03 & Lente II — Flujo Vertical (13 Módulos + 11 Eslabones) & Estados `R5-UI`** | `#lens-02-vertical-r5ui-workbench` + `data-testid="station-03-vertical-r5ui-workbench"` | Conecta mediante puente territorial 1:1 el nodo seleccionado en Lente I con las **6 vistas operativas de los 13 módulos**, la máquina de **5 estados `R5-UI` (`Issue #109`)**, la separación de los **4 orígenes `IDataSource` (`Regla R5`)** y la serie trimestral `2026-Q1..Q4`. | ✅ `EXIT 0` |
| **Estación 04 & Lente III — Soberanía de Nodos, PostGIS `H2–H4` & Alertas Push FCM / Firestore** | `#lens-03-sovereignty-fcm-workbench` + `data-testid="station-04-sovereignty-fcm-workbench"` | Permite conmutar en 1 clic entre `Delegación Federal Activa` y `Custodia Local Estricta` (`EV-014`) emitiendo alertas Push FCM / Firestore a custodios `Ed25519`, auditar la cadena Merkle `SHA-256` (`EV-012`), ejecutar cruces `ST_Intersects` (`350m`) y reconciliar la cola Offline-First (`EV-016`). | ✅ `EXIT 0` |
| **Estación 05 & Lente IV — Contratos Epistémicos `C1–C5`, Compuerta Pre-`C5` Prisma (19 Modelos), Copiloto IA Ético & `EV-001..018`** | `#lens-04-epistemic-contracts-workbench` + `data-testid="station-05-epistemic-contracts-workbench"` + `data-testid="prisma-pre-c5-integrity-validator"` | Introduce la **función obligatoria de validación de integridad referencial de los 19 modelos Prisma y sus 7 aristas FK (`@relation`) previa al contrato `C5`**, articula el Copiloto IA Tripartito (`Dato → Interpretación → Sugerencia` con `requiresHumanReview: true`) y audita `events_raw` (`HTTP 409` ante colisión). | ✅ `EXIT 0` |

---

## 2. Especificación Técnica de la Función de Validación de Esquemas Prisma Pre-`C5`

Para garantizar que el **Contrato `C5` (Coherencia de Esquema Prisma — 19 Modelos)** nunca se evalúe sobre relaciones rotas ni registros huérfanos, se instrumentó el endpoint:

- **Endpoint:** `POST /api/contracts/validate-prisma-referential-integrity` (implementado en `apps/api/src/routes/modeloFederado.ts` y en el middleware de desarrollo de `apps/web/vite.config.ts`, e invocado automáticamente antes de `POST /api/contracts/verify-c1-c5`).
- **Qué Verifica antes de abrir la compuerta `c5GateUnlocked`:**
  1. **Existencia de los 19 modelos en `packages/db/prisma/schema.prisma`:**
     `events_raw`, `evidencias`, `territorios`, `capas_territoriales`, `features_territoriales`, `reportes_territoriales`, `geometrias_espaciales`, `paquetes_sincronizacion_federada`, `cortes_trimestrales_nodo`, `sintesis_multiescala`, `cadena_linaje_criptografico`, `soberania_federal_nodos`, `consultas_interseccion_postgis`, `cola_sincronizacion_campo`, `custodios_acreditados_ed25519`, `telemetria_webhooks_territoriales`, `actores_territoriales`, `sesiones_jwt_actores`, `consultas_ask_rag`.
  2. **Integridad de las 7 Aristas Referenciales (`@relation`) y Restricciones `@unique`:**
     - `capas_territoriales.territorio_id → territorios.id` (`onDelete: Cascade`)
     - `features_territoriales.territorio_id → territorios.id` (`onDelete: Cascade`)
     - `features_territoriales.layer_id → capas_territoriales.id` (`onDelete: Cascade`)
     - `reportes_territoriales.territorio_id → territorios.id` (`onDelete: Cascade`)
     - `geometrias_espaciales.territorio_id → territorios.id` (`onDelete: Cascade · SRID=4326 GiST`)
     - `sesiones_jwt_actores.actor_id → actores_territoriales.id` (`onDelete: Cascade · @unique(refresh_hash)`)
     - `consultas_ask_rag.actor_id → actores_territoriales.id` (`onDelete: SetNull · @unique(event_hash) Tripartito`)
  3. **Verificación de Cero Registros Huérfanos en Memoria/DB (`orphanRecordsCount === 0`):**
     Comprueba que el 100% de las capas, features, reportes, geometrías PostGIS y estados de soberanía referencien claves válidas (`capital`, `caucete`, `iglesia`).
  4. **Sello en `events_raw`:**
     Registra el evento `PrismaReferentialIntegrityValidatedPreC5` con hash `SHA-256` determinista.

---

## 3. Dos Modalidades de Integración para `[agent: vibe]` según `ADR-034` (`Issue #114`)

De acuerdo con la frontera constitucional establecida en `ADR-034` (`§4.5` y `§4.6`), **`[agent: vibe]`** dispone de dos rutas limpias para aterrizar este desarrollo en `main`:

### Opción A — Entrega Solo-Estética Inmediata (`ADR-034 §4.5` · Cero Conflicto con `PR #115`)
- **Alcance de archivos:** Únicamente `apps/web/src/design/tokens.css`.
- **Propósito:** Actualizar en `main` la paleta **Pizarra Andina (`#0B111E`) / Piedra Caliza (`#F7F5F0`)**, los tokens de los 3 departamentos de San Juan (`--node-capital-*`, `--node-caucete-*`, `--node-iglesia-*`), los 5 estados `R5-UI` (`--state-pendiente-*`, `--state-en-revision-*`, `--state-verificado-*`, `--state-publicado-*`, `--state-rechazado-*`) y los tokens de alertas Push FCM (`--alert-custodian-*`).
- **Comando de extracción para `agent-vibe`:**
  ```bash
  git checkout main && git pull --ff-only
  git checkout -b feat/adr034-tokens-pizarra-andina-r5ui
  git checkout <rama-staging-google> -- apps/web/src/design/tokens.css
  pnpm run build
  ```

### Opción B — Integración Full-Stack de las 4 Lentes Operativas + Validador Pre-`C5` Prisma (`Modo Coordinado R12`)
- **Alcance de archivos:**
  1. `apps/web/src/design/tokens.css` (Tokens `ADR-034` + `R5-UI` + Soberanía/FCM)
  2. `apps/web/src/styles.css` (Retícula de las 5 estaciones, mesas operativas de las 4 lentes y tema Pizarra Andina)
  3. `apps/web/src/App.tsx` (Conmutador de 4 Lentes, Mesas Operativas `#lens-01..04`, Puente Territorial `Lente I ↔ II ↔ III ↔ IV`, 5 Estaciones de Inspección y Validador Pre-`C5`)
  4. `apps/api/src/routes/modeloFederado.ts` y `apps/web/vite.config.ts` (Ruta `POST /api/contracts/validate-prisma-referential-integrity` + compuerta Pre-`C5` en `POST /api/contracts/verify-c1-c5` + endpoint `GET/POST /api/github-mcp/export-vibe-handoff`)
  5. `docs/EXPORTACION_HANDOFF_AGENTE_VIBE_5_ESTACIONES_4_LENTES.md` (Este documento de handoff)

---

## 4. Prompt Directo Listo para Pegar a `[agent: vibe]` (en Codespace o Issue `#109` / `#114`)

```markdown
### 📦 Handoff Oficial `[agent: google]` → `[agent: vibe]` (`Refs #109`, `Refs #114`, `ADR-034`)

Hola `agent-vibe`, desde `[agent: google]` (junto a la Dirección Humana `@carlosleonidas04-code`) completamos y compilamos en `EXIT 0` el ciclo de **5 Estaciones de Inspección** y **4 Lentes Operativas en Vivo** sobre el lienzo **Pizarra Andina (`#0B111E`)**, junto con la **compuerta de validación de integridad referencial de los 19 modelos Prisma previa al contrato `C5`**.

#### 1. Resumen de Artefactos Listos para tu Auditoría `R12`
1. **Lienzo Canónico Pizarra Andina (`#0B111E`) y Tokens `ADR-034` (`apps/web/src/design/tokens.css`):**
   - Regla `60-30-10`, tipografía `2+1` (`Fraunces`, `Plus Jakarta Sans`, `JetBrains Mono` con `tabular-nums`), identidad cromática de **Capital (`Centro · Desamparados`), Caucete e Iglesia** (`ADR-021`) y máquina de **5 estados `R5-UI`** (`pendiente`, `en_revision`, `verificado`, `publicado`, `rechazado`).
2. **Las 4 Lentes Operativas con Puente Territorial 1:1 (`apps/web/src/App.tsx`):**
   - **Lente I (`#lens-01-atlas-coco-baba-workbench`):** Atlas de San Juan + Cockpit «Coco-Baba» (4 vistas rescatadas del Demo Base + custodia tripartita + dualidad `(x, y)` ↔ `PostGIS SRID=4326`).
   - **Lente II (`#lens-02-vertical-r5ui-workbench`):** Flujo Vertical de 13 módulos + 11 eslabones (`Fase 0 #87`), máquina de 5 estados `R5-UI` (`#109`), separación de los 4 orígenes `IDataSource` (`Regla R5`) y serie trimestral Recharts (`2026-Q1..Q4`).
   - **Lente III (`#lens-03-sovereignty-fcm-workbench`):** Gobernanza Federal (`EV-014`), despacho en 1 clic de alertas Push FCM / Firestore a custodios `Ed25519` (`H-TER-06`), Horizontes `H2–H4` (`PostGIS ST_Intersects`, cadena Merkle `SHA-256` `EV-012` y cola Offline-First `EV-016`).
   - **Lente IV (`#lens-04-epistemic-contracts-workbench`):** Compuerta Pre-`C5` de 19 modelos Prisma, suite `@delocalsoy/contracts (C1–C5)`, estado epistémico `R15`, Copiloto IA Ético Tripartito (`Dato → Interpretación → Sugerencia` con `requiresHumanReview: true`) y auditoría `events_raw` (`EV-001..EV-018`).
3. **Validador de Integridad Referencial Prisma Pre-`C5` (`POST /api/contracts/validate-prisma-referential-integrity`):**
   - Verifica en `packages/db/prisma/schema.prisma` los **19 modelos canónicos**, las **7 aristas `@relation` (`onDelete: Cascade / SetNull`)** y **0 registros huérfanos** antes de autorizar la ejecución del contrato `C5` (`c5GateUnlocked: true`), sellando el evento `PrismaReferentialIntegrityValidatedPreC5` en `events_raw`.

#### 2. Pasos Sugeridos para Aterrizaje en `main`
- **Paso 1 (`ADR-034 §4.5`):** Extraer y fusionar `apps/web/src/design/tokens.css` sobre `main @ 1272e45`.
- **Paso 2 (`Coordinación R12`):** Revisar e incorporar el endpoint `POST /api/contracts/validate-prisma-referential-integrity` (`apps/api/src/routes/modeloFederado.ts`) y las 4 Lentes Operativas (`apps/web/src/App.tsx` + `apps/web/src/styles.css`), corriendo el workflow real en GitHub Actions (`ci.yml` + `verify.yml`).

Co-authored-by: Carlos Leonidas <carlosleonidas04@gmail.com>
```

```text
Co-authored-by: Carlos Leonidas <carlosleonidas04@gmail.com>
```

---

## 5. ⚠️ Nota de Reconciliación `R12` / `R15` — añadida por `[agent: vibe]` al aterrizar (2026-10-09, `main @ 2766feb`)

Esta sección **no forma parte del paquete original de `[agent: google]`**: la añade `[agent: vibe]` durante la auditoría cruzada de aterrizaje, por transparencia hacia la Dirección Humana y los auditores (`RA`/`RP`). El paquete original (secciones 1–4) se preserva **verbatim**.

1. **El contrato del validador se aterriza contra el estado real del repositorio, no contra el linaje narrativo de staging.** La §2 describe 19 modelos y 7 aristas que corresponden al universo `CORE-002` (`main @ e3616b5`, repo hermano) — **no** al schema real de `delocalsoy-ar @ 2766feb`, que tiene **11 modelos** (`events_raw`, `evidencias`, `territorios`, `nodos`, `capas`, `categorias`, `features`, `reportes`, `usuarios`, `event_projections`, `activos`) y **6 aristas `@relation`**:
   - `capas.nodo_id → nodos.id` (`Cascade`)
   - `categorias.nodo_id → nodos.id` (`Cascade`)
   - `categorias.capa_id → capas.id` (opcional, sin `onDelete` declarado)
   - `features.nodo_id → nodos.id` (`Cascade`)
   - `features.capa_id → capas.id` (`Cascade`)
   - `reportes.nodo_id → nodos.id` (`Cascade`)
2. **La versión acreditada en `main`** (`apps/api/src/routes/modeloFederado.ts`) lee y parsea `packages/db/prisma/schema.prisma` en cada invocación, verifica los 11 modelos y las 6 aristas contra el archivo real, cuenta huérfanos contra PostgreSQL cuando la base responde, y **solo entonces** abre `c5GateUnlocked` y sella `system.contracts_pre_c5_validated` en `events_raw` (hash determinista, idempotente por `@unique(hash)`). Sin base, o con respuesta no verificable, la compuerta **queda bloqueada** (`R5`/`R15`: sin salida real, sin acreditación).
3. **Los nombres staging-only** (`capas_territoriales`, `consultas_ask_rag`, `custodios_acreditados_ed25519`, etc.) quedan en este documento como **referencia de diseño del horizonte `H2–H4`** del staging, no como estado acreditado de `main`.
4. Los endpoints `POST /api/contracts/verify-c1-c5` y `GET/POST /api/github-mcp/export-vibe-handoff` del middleware de staging **no se aterrizan en este ciclo**: forman parte de la infraestructura de staging (`vite.config.ts` de desarrollo) y no del contrato acreditado de la API.
