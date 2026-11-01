# CAU-001: Documento Rector del Nodo Caucete Este — HITUB / DELocalSoy.AR

**Departamento:** Caucete (Código INDEC 70035) · San Juan Este  
**Emisor:** agent-google por mandato de la Dirección Habilitante (Carlos Leonidas) · 2026-10-20  
**Base Canónica:** main @ 77500be · Contrato OpenAPI v7.24.0 · ADR-021 · ADR-034 · ADR-035 · ADR-036  
**Topología:** Nodo del Este (3 Nodos Federados: San Juan Capital, Valle de Iglesia, Caucete Este)  

---

## 1. Resumen Ejecutivo y Marco de Gobernanza (§0)

El presente documento sintetiza la investigación territorial (Eje A: R-C1 a R-C8) y las especificaciones de diseño (Eje B: K-1 a K-8) para el **Stage del Nodo Caucete**. Conforme al contrato de gobernanza:
- **R9**: GitHub acredita; la DH ratifica con labels/merge.
- **R15**: Nada fabricado; reporte declarado ≠ acreditación.
- **R1**: No derivar contenido ausente; «unknown, sin fuente» es una respuesta válida y preferida a inventar.
- **Scope-Guard #134 (ADR-034)**: Respeto absoluto a la arquitectura de paquetes del monorepo.
- **CI Congelado**: Entregas empaquetadas en formato plano ustar / manifiesto canónico Lote 0 en cola de merge hasta reactivación del límite de GitHub Actions (~01-11-2026).

---

## 2. Eje A — Corpus de Investigación Exhaustiva (R-C1 a R-C8)

### R-C1 · Primera Ingesta: Salud y Educación
- **Salud**: Hospital Departamental Dr. César Aguilar (Zona Sanitaria II Este). Código REFES candidato: `10700352177014` (estado: `pending` ◐ / `synthetic_demo` ◇ a contrastar empíricamente con la descarga oficial REFES 2026). Hitos 2026 verificados: nueva guardia de emergencias en servicio desde 22/04/2026; anuncio oficial del 15/08/2026 de ampliación edilicia y refuncionalización de 7 CAPS periféricos (~38.000 beneficiarios directos); ampliación del plantel médico efectivizada el 30/09/2026. CAPS Pozo de los Algarrobos remodelado.
- **Educación**: Directorio de establecimientos basado en el Mapa Educativo Enero 2025 (revisión 05/03/2026, fichas RA 2023). Códigos CUE candidatos: Escuela Manuel Belgrano (CUE 700014200), Escuela Nocturna Caucete (CUE 700018500), Colegio Superior San Martín. Registrados honestamente en estado `pending` ◐ a la espera de la primera ingesta formal.

### R-C2 · Historia Urbana y Memoria Sismorresistente
- Sucesión histórica territorial: **Villa Independencia** (asiento original pre-1917) → **Villa Colón** (Ley provincial de traslado y trazado en 1917) → **Ciudad de Caucete** (declarada ciudad el 10/08/1948). 130 años de vida departamental conmemorados en 2023.
- Terremoto de Caucete del **23/11/1977** (06:26 hora local, Mw 7,4, profundidad 17 km): sismo destructivo que reconfiguró la villa cabecera. Caucete se convirtió en el laboratorio y ejemplo vivo de la arquitectura sismorresistente sanjuanina moderna, con anchas avenidas y construcciones de hormigón armado bajo normas INPRES.

### R-C3 · Santuario de la Difunta Correa (Vallecito)
- Ubicación: Paraje Vallecito, sobre RN 141, a 64 km al este de la Ciudad de San Juan.
- Flujo de Peregrinación: Entre 1.000.000 y 1.500.000 visitantes anuales (cifrado oficial del Ministerio de Turismo y declaraciones de la gobernación provincial).
- Master Plan Provincial: Primera etapa inaugurada el 21/03/2026. Abarca nuevos módulos de sanitarios con accesibilidad universal (Ley 24.314), nuevo sector comercial gastronómico y artesanal, áreas de asadores comunitarios con agua potable y nueva señalética de seguridad hídrica ante crecidas estivales.

### R-C4 · Economías de Proximidad y Conflictos Territoriales
- Vocación agrícola y agroindustrial: San Juan lidera la producción de aceite de oliva nacional (informe INTA 24/05/2026; exportaciones 2025 con +25% en volumen). Caucete lidera la superficie de olivos y es pionero en la primera zonificación agroclimática de pistacho (~6.500 ha en San Juan). Presencia de Bodega Callia al pie de la Sierra de Pie de Palo.
- Cautelas innegociables:
  - **Olivum** y el **Parque Solar San Juan Sur** pertenecen estrictamente al departamento **SARMIENTO** (prohibido atribuirlos a Caucete).
  - La marca de aceitunas comerciales **«CAUCETE»** pertenece a la firma Agro Aceitunera S.A. con planta industrial en Aimogasta, La Rioja (no es denominación de origen municipal).
- Gobernanza deportiva barrial: Registro fáctico del conflicto de mayo de 2026 por el arancelamiento municipal de espacios e instalaciones a clubes barriales (registrado sin nombres de particulares, conforme a ADR-027).

### R-C5 · Inventario Plausible de Espacios Públicos
- Plaza Departamental Manuel Belgrano: Remodelada integralmente en 2022 con solados modernos y luminarias LED. (✓ verified)
- **Plaza Barrio Área 2 (frente al Hospital Dr. César Aguilar)**: Deterioro crítico de veredas y accesibilidad; caso testigo real analizado bajo las 7 dimensiones de la Ficha ADR-149. (◈ community_validated)
- Centro Deportivo Municipal: Inaugurado el 31/12/2024 para actividades recreativas gratuitas. (✓ verified)

### R-C6 · Movilidad y Transporte Público
- Sistema RedTulum: Corredor troncal Línea 3 Interurbana Este (conecta Ciudad de Caucete con la Estación de Transbordo Córdoba en Capital). Red secundaria ramales 340 a 346 (la línea 340 brinda conexión directa con el Hospital Dr. César Aguilar y CAPS aledaños).
- Estado de datos: Pendiente de entrega formal de especificación GTFS por parte del Ministerio de Gobierno (solicitud institucional abierta). Corredores bioceánicos RN 20 y RN 141 operan como arterias estratégicas de carga y peregrinación.

### R-C7 · Canales Comunitarios y Medios Locales
- Emisoras radiales de proximidad: Radio Ciudad FM 90.9, Radio Caucete FM 95.1 y Radio Génesis. Actúan como canales de difusión de avisos vecinales, emergencias hídricas y asambleas, resguardando la privacidad de personas particulares (anti-PII ADR-027).

### R-C8 · Memoria y Ética de Resiliencia (ADR-036)
- Eventos de riesgo natural: Terremoto del 23/11/1977, temporal de lluvias e inundaciones de febrero de 2026 (con corte de badenes en RN 141 y evacuación de familias) y eventos de Viento Zonda con focos de incendios del 25/09/2026.
- Tratamiento ético: La plataforma presenta la resiliencia como capacidad social y memoria histórica, **prohibiendo expresamente la creación de «mapas de riesgo» que estigmaticen barrios o desvaloricen propiedades**. «Sin dato» no implica ausencia de peligro, y nunca se prometen alertas tempranas oficiales no homologadas.

---

## 3. Eje B — Arquitectura de las Vistas del Stage (K-1 a K-8)

| Vista | Denominación | Contenido y Mecanismo Interactivo | Estado Epistémico Dominante |
| :--- | :--- | :--- | :--- |
| **K-1** | **Vista del Nodo & Subnodos** | Mapa interactivo de los 10 subnodos provisorios (R6) con centro corregido (−31.651, −68.282), selector de capas v6 (hidrología, riesgo contextual, espacio público, accesibilidad, sustentabilidad) siguiendo el patrón *Dato → Interpretación → Sugerencia*. | `verified` (#4ADE80) & `community_validated` (#75AADB) |
| **K-2** | **Servicio Informativo & Fuentes** | Catálogo de 15 fuentes documentadas (ADR-035). Visualizador del pipeline de 4 fases con **0 ingestas materializadas** («sin materializar aún» como estado transparente). | `verified` (#4ADE80) & `pending` (#F2A71B) |
| **K-3** | **Ficha de Valoración Barrial** | Evaluación de 7 dimensiones (iluminación, veredas/rampas Ley 24.314, arbolado, limpieza, seguridad, equipamiento, uso comunitario). Caso real: Plaza Barrio Área 2 (frente al Hospital) en ciclo *testimonio → corroborada*. | `community_validated` (#75AADB) |
| **K-4** | **Reportes Ciudadanos (CORE-005)** | Formulario de alta con justificación pública obligatoria (≥10 chars). Historial inmutable 1:1 y sugerencia visual asistiva para duplicados (ADR-038/ADR-039). | `verified` / `community_validated` / `pending` |
| **K-5** | **Santuario Difunta Correa** | Ficha patrimonial-turística de Vallecito (+1.000.000 a 1.500.000 peregrinos/año). Obras del Master Plan 2026 y advertencias hídricas estivales de RN 141. | `verified` (#4ADE80) |
| **K-6** | **Petroglifos Pie de Palo** | **Modo Protegido sin Geometría**: Cero coordenadas exactas para salvaguardar Baño del Indio y El Quemado conforme a Ley Provincial 6.801 y Ley 25.743 (ADR-036). | `verified` (#4ADE80) (Resguardo Legal) |
| **K-7** | **Nutrición REFES + CUE** | Tablero de ingestas de Salud (Hospital Dr. César Aguilar REFES candidato 10700352177014 y 7 CAPS) y Educación (padrones Mapa Educativo). Cero datos inventados. | `pending` (#F2A71B) & `synthetic_demo` (#FFC72C) |
| **K-8** | **Gobernanza & Trazabilidad** | Monitor institucional (intendencia, Concejo con mayoría opositora 02/2026, Plan 2030), balance de la Épica #137 y estado de la cola de PRs bloqueados por CI. | `verified` (#4ADE80) |

---

## 4. Matriz de Estados Honestos ADR-034

*Se rechaza explícitamente la paleta previa no armonizada (`#00A86B`, `#E06D53`, `#94A3B8`).*

---

## 5. Manifiesto de Entrega Lote 0

El lote canónico `lote-0-stage-caucete-hitub` contiene los miembros especificados para su verificación y relay limpio hacia la rama de integración.
