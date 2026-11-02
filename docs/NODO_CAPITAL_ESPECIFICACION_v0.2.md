# Especificación Canónica del Nodo Capital v0.1 (`delocalsoy_sj_capital`)

**Fecha de Consolidación:** 2026-10-13  
**Base Canónica:** `main @ 89c0bcc`  
**Épica de Referencia:** GitHub `#152` · **ADR Asociado:** `ADR-037`  
**Autoría y Supervisión:** Ecosistema Multi-Agente DELocalSoy.AR & Dirección Humana (`Carlos Leonidas`)  

---

## 1. Resumen Ejecutivo y Mandato Territorial

El presente documento consolida la especificación de arquitectura canónica para la activación y operación del **Nodo Capital (`delocalsoy_sj_capital`)** de la Provincia de San Juan en la plataforma DELocalSoy.AR.

### Principios Epistemológicos No Negociables
- **Regla R9 (Trazabilidad Extrema):** Todo dato publicado se vincula a su fuente primaria, método de captura y fecha.
- **Regla R15 (Honestidad de Verdad):** Se rechaza la equiparación entre dato publicado, observación comunitaria e inferencia algorítmica.
- **Provisionalidad Delimitativa:** Las geometrías analíticas de distritos, microcentros y corredores se conservan en estado `boundary_status: 'provisional' | 'source_based'` hasta su contraste definitivo con la Dirección de Geodesia y Catastro de la Provincia de San Juan y la  UNIDE.

---

## 2. Estructura Jerárquica y Escalas del Nodo Capital
delocalsoy_sj_capital (Nodo Departamental)
├── subnodo: sj_capital_centro (Subnodo Piloto San Juan Centro)
│ ├── area_analitica: sj_capital_microcentro (Perímetro Libertador–Córdoba–Alem–Rioja, PEC 2025)
│ ├── area_analitica: sj_capital_macrocentro (Área de estudio provisional)
│ └── centralidad: sj_capital_centro_civico_cultural (Centro Cívico, Teatro del Bicentenario, Plaza Bicentenario)
├── subnodo: sj_capital_desamparados (Subnodo Piloto Desamparados / Puyuta)
│ ├── centralidad: sj_desamparados_plaza (Plaza Salvador María del Carril y Basílica)
│ ├── centralidad: sj_el_palomar (Complejo Polideportivo El Palomar — UNSJ: Comedor y Natatorios)
│ └── hito_educativo: sj_facultad_ingenieria_unsj (Av. Libertador Gral. San Martín Oeste 1109)
└── subnodos_futuros: Concepción y Trinidad
---

## 3. Red de Ejes Viales y Corredores

| Identificador | Denominación | Orientación | Tramos y Régimen de Circulación |
| :--- | :--- | :--- | :--- |
| `axis_ignacio_de_la_roza` | Av. José Ignacio de la Roza (Av. Central) | Este–Oeste | Tramo Microcentro (mano única al este) ➔ Centro Cívico / Las Heras ➔ Continuidad metropolitana RP 12 hacia diques Los Caracoles y Punta Negra. |
| `axis_25_de_mayo` | Calle 25 de Mayo | Este–Oeste | Tramo Rawson–España (mano única este–oeste) ➔ Tramo España al Oeste (doble vía reportada) con acceso al Complejo El Palomar (1920 Oeste). |
| `axis_libertador_west` | Av. Libertador Gral. San Martín Oeste | Este–Oeste | Parque de Mayo ➔ Facultad de Ingeniería UNSJ (1109 Oeste) ➔ Casa de Gobierno / Comisaría 4ta ➔ Plaza Desamparados. |
| `axis_cordoba` | Av. Córdoba | Este–Oeste | Eje del Anillo Céntrico RedTulum (Rawson a España). |
| `axis_nuche` | Boulevard Víctor Nuche | Este–Oeste | Conector de Desamparados (Echeverría a San Miguel, doble mano según ordenanza 2023). |
| `axis_paula_albarracin` | Av. Paula Albarracín de Sarmiento | Norte–Sur | Eje institucional (Casa de Gobierno / Comisaría 4ta) y tramo límite departamental con Rivadavia al norte. |

---

## 4. Los 12 Bloques Canónicos de Arquitectura

### Bloque 1 — Vocabulario y Contratos Territoriales Base
- Entidades: `TerritorialEntity`, `TerritorialRelation`, `TerritorialCorridor`, `StreetAxisCandidate`.
- Clases de evidencia: `official_source`, `institutional_source`, `field_survey`, `community_report`, `derived`, `synthetic`.
- Estados de límite: `official`, `source_based`, `provisional`, `community_proposed`, `under_review`.

### Bloque 2 — Actores y Taxonomía Comercial (11 Categorías Activas)
- Taxonomía estricta de 11 categorías primarias:
  1. `food_drink` (Alimentación y bebidas)
  2. `retail` (Comercio y retail)
  3. `professional_services` (Servicios profesionales)
  4. `home_technical` (Hogar y servicios técnicos)
  5. `health_wellness` (Salud y bienestar)
  6. `education_training` (Educación y formación)
  7. `culture_leisure` (Cultura, arte y recreación)
  8. `local_production` (Producción y emprendimientos)
  9. `social_economy` (Economía social y solidaria)
  10. `spaces_rentals` (Espacios y alquileres)
  11. `institutions_organizations` (Instituciones y organizaciones)
- Atributos ortogonales: modalidad de atención (`service_mode`), pago, accesibilidad física, confianza.

### Bloque 3 — Búsqueda Espacial y Descubrimiento Territorial
- Filtrado multi-criterio por bounding box (`bbox`), radio de proximidad, subnodo, corredor y categorías.
- Restricción: perfiles sin coordenadas validadas solo se listan textualmente, nunca se inventan puntos en el mapa.

### Bloque 4 — Interacciones, Solicitudes y Reservas sin Pasarela
- Flujo directo persona ➔ actor local: consultas, solicitudes de presupuesto y reservas con confirmación manual.
- Política de privacidad: contacto por plataforma o directo según consentimiento explícito del actor.

### Bloque 5 — Confianza, Reseñas y Reputación Territorial
- Reseñas condicionadas a interacciones reales comprobables.
- Dimensiones de evaluación: calidad, comunicación, puntualidad, accesibilidad y relevancia territorial.
- Sellos de confianza auditados: contacto verificado, comercio verificado, producción local verificada.

### Bloque 6 — Panel Operativo del Comercio
- Autonomía para que comerciantes y cooperativas administren su presencia, ofertas, horarios y solicitudes sin dependencia de administradores centrales.

### Bloque 7 — Administración, Moderación y Gobernanza
- Cola de revisión estructurada: verificación de identidades, moderación de contenido y resolución de disputas.
- Decisiones fundamentadas en versiones públicas y fechadas de políticas institucionales.

### Bloque 8 — Dashboard de Desarrollo Económico Local
- Indicadores con denominador estricto y advertencia de cobertura.
- Prohibición expresa de scoreboards o porcentajes inflados sin muestra representativa.

### Bloque 9 — Banco de Potencialidades y Oportunidades (Vertical Activa)
- **10 Tipos Canónicos:**
  1. `human_capacity`
  2. `productive_capacity`
  3. `physical_asset`
  4. `institutional_asset`
  5. `cultural_asset`
  6. `detected_demand`
  7. `market_gap`
  8. `partnership_opportunity`
  9. `investment_opportunity`
  10. `policy_opportunity`
- **10 Estados Sellados:** `detected` ➔ `under_review` ➔ `validated` ➔ `prioritized` ➔ `in_development` ➔ `active` ➔ `implemented` (con estados laterales `paused`, `discarded`, `archived`).
- **Regla de Consentimiento:** ningún actor se vincula sin confirmación explícita previa (`consentConfirmed: true`).

### Bloque 10 — Participación, Deliberación y Decisiones Comunitarias
- Ciclo de iniciativa ciudadana: propuesta ➔ admisibilidad ➔ deliberación con argumentos ➔ priorización ➔ compromiso institucional y seguimiento de hitos.

### Bloque 11 — Inteligencia Territorial Ética y Asistente RAG
- Formato de respuesta tripartito inquebrantable:
  - **1. Dato Verificado:** cita estricta de fuentes registradas.
  - **2. Interpretación Contextual:** hipótesis cautelosa y no determinante.
  - **3. Sugerencia de Acción:** recomendación subordinada al criterio humano.

### Bloque 12 — Integración y Federación Inter-Nodo por Contratos
- Soberanía descentralizada: cada nodo conserva sus bases de datos y gobierna sus accesos mediante acuerdos bilaterales revocables con eventos firmados criptográficamente.

---

## 5. Trazabilidad en GitHub (Épica #152)

| Issue / PR | Título / Entregable | Estado |
| :--- | :--- | :--- |
| **#152** | Épica Paraguas: NODO-CAPITAL | Abierta con traza |
| **#153** | NCAP-R1: Vocabulario Territorial | Diseñado |
| **#154** | NCAP-R2: Definición Territorial y Perímetros | Diseñado |
| **#155** | NCAP-R3: Catálogo de Fuentes Espaciales | Diseñado |
| **#156** | NCAP-R4: Red de Corredores y Puntos Nodales | Diseñado |
| **#157** | NCAP-R5: Accesibilidad Peatonal y Dashboard | Diseñado |
| **#158 / PR #160** | NCAP-R6: Bloque 9 — Banco de Potencialidades | **Implementado** |
| **#159 / PR #161** | NCAP-R7: Consolidación Bloques 1–12 + ADR-037 | **Consolidado** |
