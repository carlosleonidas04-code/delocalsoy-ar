# VIG-R1 — Vocabulario y estructura territorial del nodo Valle de Iglesia (v0.1)

**Nodo:** Valle de Iglesia · **Épica:** NODO-VIG #167 · **Issue:** NVIG-R1 #168
**Fuente de verdad operativa:** `packages/db/prisma/seed-subnodos.sql` (VIG-001 #171, en main)
+ `GET /api/nodos/iglesia/subnodos` + `apps/api/src/subnodos-rutas.test.ts`

> **Estado honesto (R15):** esta tabla v0.1 CONSOLIDA vocabulario ya ratificado
> por la Dirección Humana (lotes 1+2 del 2026-10-13, trazas de ratificación en
> #168 y #168 comment 6151285249) y acreditado en main por VIG-001. Este
> documento no agrega ni muta entidades: es la vista canónica que faltaba.
> Los puntos marcados **[PENDIENTE-DH]** requieren ratificación explícita
> antes de aplicarse.

## 1. Decisión de diseño central: Opción A vs Opción B

| Aspecto | Opción A — fuente (export DH, sección 2) | Opción B — repo (modelo vigente) |
| :-- | :-- | :-- |
| Jerarquía | Nueva `TerritorialEntity` con árbol `parentId` (`region` / `district` / `settlement`) | `nodos` (key `iglesia`, diseño federado ADR-021) → tabla `subnodos` con `parent_key` |
| Nodo padre | key `valle-de-iglesia`, tipo `region` | key `iglesia` (ya federado en `GET /api/showcase`) |
| Estado | Propuesta conceptual | **Vivo en main**: 52 entidades con seed idempotente, sellos `subnodo.creado` en `events_raw`, API pública y suite E2E |
| Riesgo | Duplicación de dominio y de vocabulario (R15) | Ninguno nuevo: extender el enum `type` cuando la DH lo ratifique |

**Recomendación: Opción B.** La evidencia operativa la resuelve: VIG-001 ya
implementa exactamente la Opción B con 52 entidades acreditadas, y la DH
ratificó ambos lotes con trazas en este mismo issue (#168). Un modelo
`TerritorialEntity` paralelo duplicaría dominio — la misma tensión ya
resuelta en #160 vs `oportunidades.ts`. Lo que la Opción A aporta de valor
(tipos reservados, seección 4) se incorpora como extensión futura del enum
`type` de `subnodos`, sin árbol nuevo.

## 2. Tipos y jerarquía operativos (VIG-001)

| `type` (repo, vivo) | Equivalente fuente | `zone` | Estado |
| :-- | :-- | :-- | :-- |
| `district` | `district` | `valle` | 6 entidades ratificadas (DH) |
| `locality` | `settlement` (reservado) | `valle` | 1 (Pismanta, Georef 70049050) |
| `paraje` | — (vocabulario propio) | `valle` / `travesia` / `alta_cordillera` | Ratificado por lotes (DH) |
| `subparaje` | — | `valle` | Hijo de paraje (ej. Malimán de Arriba) |

Atributos operativos por entidad: `boundary_status` (**provisional** en
todas — sin límite geometrado publicado, R15), `assignment_status`
(`dh_directive` o `nearest_district_provisional`), `lat`/`lng` (null
cuando no hay punto público — no se inventa), `external_id`/`external_source`
(BAHRA / Georef).

**Tipos reservados de la fuente** (`settlement`, `corridor`, `asset_area`):
propuesta de extensión futura del enum `type` — **[PENDIENTE-DH]**. Mapeo
sugerido si se ratifica: `settlement` ≈ `locality` (ya cubierto),
`corridor` ≈ zona `travesia` (función RN 150 / pasos), `asset_area` =
nuevo (áreas productivas/patrimoniales con geometría, requiere ADR-035 por
fuente).

## 3. Tabla de vocabulario v0.1 — distritos del valle (6)

Hijos directos del nodo `iglesia`; `boundary_status: provisional`;
sin punto publicado (`lat`/`lng` null, R15); ratificados por la DH
2026-10-13.

| key | nombre visible | type | parent | zone | assignment_status |
| :-- | :-- | :-- | :-- | :-- | :-- |
| `sj_iglesia_angualasto` | Angualasto | `district` | — (nodo `iglesia`) | `valle` | `dh_directive` |
| `sj_iglesia_bella_vista` | Bella Vista | `district` | — | `valle` | `dh_directive` |
| `sj_iglesia_las_flores` | Las Flores | `district` | — | `valle` | `dh_directive` |
| `sj_iglesia_rodeo` | Rodeo | `district` | — | `valle` | `dh_directive` |
| `sj_iglesia_tudcum` | Tudcum | `district` | — | `valle` | `dh_directive` |
| `sj_iglesia_villa_iglesia` | Villa Iglesia | `district` | — | `valle` | `dh_directive` |

## 4. Inventario del resto (46 entidades) — resumen por lote

| Grupo | Cantidad | Asignación | Fuente |
| :-- | --: | :-- | :-- |
| Localidad INDEC (Pismanta → las-flores) | 1 | `dh_directive` | Georef 70049050 |
| Parajes/subparajes de valle | 22 | `nearest_district_provisional` | BAHRA WFS (2026-10-13) |
| Pasos (Agua Negra → rodeo; Pascua Lama → hijo directo del nodo) | 2 | `dh_directive` | BAHRA |
| Parajes locales sin registro BAHRA (El Jarillal, Maipirinqui, Colola) | 3 | `dh_directive`, `lat`/`lng` null | — |
| Lote 2: travesía (El Arenal, Los Corrales → tudcum; Minas de Pinto → villa-iglesia) | 3 | `nearest_district_provisional` | BAHRA |
| Lote 2: alta cordillera no-paso, hijos directos del nodo | 15 | `dh_directive` | BAHRA |

Listado exhaustivo con coordenadas y `external_id`: `seed-subnodos.sql`
(fuente de verdad); este documento no la duplica fila a fila (R15).

## 5. Divergencias fuente ↔ repo

| Tema | Fuente (export sección 2) | Repo (vivo) | Estado |
| :-- | :-- | :-- | :-- |
| Key del nodo padre | `valle-de-iglesia` (`region`) | `iglesia` (ADR-021, federado) | Recomendación: mantener `iglesia` |
| Jerarquía | `TerritorialEntity` (Opción A) | `subnodos` (Opción B, VIG-001) | Recomendación: Opción B |
| Nombre visible de `sj_iglesia_villa_iglesia` | **Iglesia** | **Villa Iglesia** | **[PENDIENTE-DH]** — la fuente reserva "Iglesia" como visible; el seed ratificado usa "Villa Iglesia". Decidir cuál es el canónico (implica UPDATE del seed + sellos). |
| Tipos reservados | `settlement`, `corridor`, `asset_area` | `district`/`locality`/`paraje`/`subparaje` | **[PENDIENTE-DH]** — extensión futura del enum `type` |
| Nomenclaturas corregidas | Tudcum, Angualasto (no "Tutcún"/"Anguslasto") | Ortografías ya correctas en seed (además: Zonda, Maipirinqui, Colola ≠ Colo Colo) | Convergencia total ✔ |

## 6. Reglas vigentes (R9/R15/ADR)

- **R9:** el vocabulario operativo fue ratificado por la DH (trazas en #168);
  este documento lo consolida para consulta canónica. Las 2 decisiones
  abiertas requieren ratificación DH explícita en este issue.
- **R15:** sin punto publicado no se inventa coordenada; sin límite geometrado
  el `boundary_status` es `provisional` y se muestra como tal.
- **ADR-035:** toda fuente espacial con `source_id`, fecha, licencia, CRS y
  precisión (join por código, nunca por nombre — lección #147). ⚠️ Ingesta de
  `ramsac.ign.gob.ar` congelada (posible defacement 2026-10-11).
- **ADR-027:** el vocabulario territorial describe lugares, no personas.

## 7. Próximos pasos

1. **[PENDIENTE-DH]** Ratificar (o rechazar) la Opción B y el nombre visible
   canónico de Villa Iglesia → si cambia el label, PR de UPDATE del seed con
   sellos `subnodo.creado` idempotentes.
2. NVIG-R3 (#170): `VIG-000-ALCANCE.md` — este documento es su insumo de
   jerarquía (sección "Distritos y jerarquía").
3. NVIG-R5 (#172): catálogo de fuentes y procedencia (ADR-035, patrón Caucete #147).
