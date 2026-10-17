# VIG-008 — Cooperativas y organizaciones del Valle de Iglesia: diseño (v0.1)

Estado: **PROPUESTA RATIFICADA POR LA DH (R9, 2026-10-17)** — estructura de sprint, regla de consentimiento institucional primero y apertura del tablero ratificados por pregunta directa. ISSUE #240 (sub-issue de la épica #239). Este documento es el diseño de referencia; la implementación queda en cola detrás de la cascada de merges (CI caído desde 2026-10-15, reinicio ~2026-11-01).

## 0. Regla ratificada: consentimiento institucional primero

Ningún dato institucional enriquecido (CUIT, domicilio, cantidad de socios, federación, productos, fotos, contacto) se siembra hasta el consentimiento formal de la persona jurídica. Las 2 cooperativas ya viven como activos verificados del seed VIG-002 (matrículas INAES 28.777/659 y 11.463/170) y quedan como están, sin enriquecimiento, hasta consentimiento. Nombres de personas (presidentes, socias/os) JAMÁS se registran sin consentimiento individual (ADR-027 / Ley 25.326). Precedente: «organizaciones nominales después con consentimiento» (decisión NODO-CAU R1).

## 1. Hallazgos verificados en vivo (2026-10-17)

### 1.1 FECOAGRO Ltda. — Federación de Cooperativas Agropecuarias de San Juan

- Organización de segundo grado, fundada 18-12-1992; nuclea 25–28 cooperativas según la fuente (sitio propio: 25; INTA/rutacoop: 28–30), en los cinco valles de la provincia.
- Origen: proyecto «Sistemas Cooperativos Agropecuarios de San Juan» (INTA, AER San Martín) para revertir el éxodo rural tras la crisis vitivinícola de 1983 (primera cooperativa en Angaco, Padre Lona + técnicos INTA).
- Cadena de valor: semillas de hortalizas (referente de variedad en país/Latinoamérica), dulces y conservas, aromáticas, lácteos de cabra y oveja, y también trabajo textil; venta directa para que los excedentes queden en el lugar de producción.
- **Pro Huerta (INTA)**: proveedora durante ~30 años; «a fines de 2023 el gobierno nacional dio de baja ese programa, fue un golpe muy duro» (presidente de FECOAGRO, Expoagro). Iglesia aportaba un 20% de las semillas del programa → **market_gap documentado**: demanda y know-how intactos, canal nacional cortado.
- Apoyo a sus cooperativas: equipo interdisciplinario (salud, educación, contable, legal, seguridad e higiene, agrónomos); colaboración CONICET–UNSJ en mejoramiento genético.
- Fuentes: fecoagro.com.ar (página «Iglesia», «Buenas semillas», blog Pro Huerta), rutacoop.com.ar, expoagro.com.ar, cooperativas.com.ar (2020-2022), sisanjuan.gob.ar (INTA AER).

### 1.2 Cooperativas del departamento

| Cooperativa | Matrícula INAES / provincial | Constitución | Domicilio (fuente institucional) | Socios | Ingreso FECOAGRO | Estado plataforma |
| --- | --- | --- | --- | --- | --- | --- |
| Agropecuaria, Semillera, Agroindustrial «TUDCUM» Ltda. | 28.777 / 659 | 12-08-2004 | Calle Florida s/n, Tudcum (CP J5686) | 10 | 05-09-2005 | activo verificado en main (VIG-002) — sin enriquecimiento hasta consentimiento |
| Agropecuaria, Semillera, Forestal, Frutihortícola… «VALLES IGLESIANOS» Ltda. | 11.463 / 170 | 25-08-1987 | **El Jarillal s/n, Las Flores** | 31 | 18-12-1992 | activo verificado en main (VIG-002) — sin enriquecimiento hasta consentimiento |
| «BUENA ESPERANZA» (Angualasto) | sin verificar | — | — | — | — | candidato unverified (matrícula no encontrada en esta pasada) |
| A.P.R.I. (Asociación de Productores Rurales Iglesianos) | n/a (asociación civil) | — | — | — | — | candidato unverified |

- Dato territorial clave: el domicilio institucional de Valles Iglesianos es el **paraje El Jarillal** — el mismo que BAHRA no registra (bahra_status=not_found, asignado a Las Flores). La cooperativa es ancla económica del distrito al que pertenece Achango.
- Beneficiarias del programa RSE de riego por goteo (Barrick/Silver Wheaton, 2015, ~200 productores): Valles Iglesianos, Buena Esperanza, escuelas agrotécnicas, entre otros.
- Nota de divergencia menor: CUIT de TUDCUM 30-70971558-1 según ESSApp; el sitio FECOAGRO la lista «en trámite» → el CUIT no se siembra sin verificación primaria ni consentimiento.
- Fuentes: fecoagro.com.ar/iglesia/, essapp.coop, tiempodesanjuan.com (27-04-2015).

### 1.3 Marco normativo

- Nacional: Ley 20.337 (régimen de cooperativas), INAES (matrícula nacional). Reordenamiento nacional en curso (sumarios a cientos de cooperativas, cancelaciones puntuales): ninguna de las dos iglesianas aparece en las cancelaciones publicadas, pero el estado INAES directo queda **unverified hasta consulta formal**.
- Provincial: Dirección Provincial de Cooperativas = Órgano Local Competente; registro provincial obligatorio para cooperativas con matrícula nacional (trámite oficial publicado en tramite.sanjuan.gob.ar, d/97). La provincia reconoció a 206 cooperativas el 17-07-2026 con apoyo administrativo explícito.
- Turístico: Ley 2400-T — Registro de Prestadores de Servicios Turísticos obligatorio (sanciones por no inscripción); convocatorias provinciales activas (última verificada 2024); padrón desagregado por municipio sigue sin encontrarse (pedido ya en pie, #174 / PR #234).

### 1.4 Mujeres de Montaña (actualización del estado registrado)

- Presentación oficial en la Casa de San Juan (Buenos Aires) el 29-09-2026, tras la FIT 2026: 12 emprendedoras iglesianas en El Colorado, Las Flores, Tudcum y Rodeo; gastronomía, tejidos, agroturismo, alojamiento. Fuente oficial: sisanjuan.gob.ar.
- Nació del programa «Mujeres en Red» de Relaciones Comunitarias de la minera Vicuña (5 años), con asistencia de SIRIRI (turismo sostenible); lanzamiento en el Nodo de Pismanta con Parques Nacionales San Guillermo, Ministerio provincial, Municipio, Veladero, Vicuña, cámaras.
- Incorpora pasaporte turístico con sellos, descuentos y premios. Emprendimientos citados con nombre público en prensa: Arco Iris/Tableta Iglesiana, Atelier Las Flores, «Más que un Objeto» (tejidos con lana, llama y algodón teñidos con plantas autóctonas), «Mis Dos Estrellas» (tercera generación de teleras), El Viejo Carretón.
- Estado en la plataforma: los 12 emprendimientos siguen **candidate_provider / unverified, sin PII y sin consentimientos**; instrument_status=not_found se mantiene (no hay convenio publicado); la existencia de la ruta quedó acreditada por fuente oficial.

## 2. Diseño

### 2.1 Consentimiento de persona jurídica (nuevo matiz de ADR-027)

ConsentimientoOrganizacionSchema: organización (key del activo o candidata), rol del firmante dentro del consejo/administración, alcance granular por campo (publicación de ficha / productos / fotos / contacto / datos institucionales), vigencia con fecha, revocación. Precedentes en el repo: ActivoConsentimiento (VIG-002), consentimiento granular de actores del Bloque 9, ficha de tejedora (corpus VIG).

### 2.2 Ficha institucional (Opción A: extender dominio existente)

Bloque JSON opcional `institucional` en `activos_operativa` (patrón VIG-005, sin tablas nuevas): matricula_nacional, matricula_provincial, cuit, fecha_constitucion, socios_activos_count, federacion_key, domicilio_publicado. Cero PII. **Solo se llena tras consentimiento institucional** (regla ratificada).

### 2.3 Flujo consentimiento → enriquecimiento

1. Contacto formal con la cooperativa (pedido de la DH o gestión comunitaria) → 2. consentimiento firmado con alcance → 3. seed/ingesta de los datos institucionales verificados (§1.2) con procedencia → 4. sello `activo.consentido` (o extensión del sello vigente) → 5. publicación según alcance. Hasta el paso 2, nada nominal nuevo se publica.

### 2.4 Activos candidatos (sin siembra nominal sin consentimiento)

Buena Esperanza (Angualasto) y A.P.R.I. se presentan como **categoría/rol en el territorio** (activos unverified o menciones en KPIs/oportunidades como roles), nunca como ficha nominal pública sin consentimiento.

### 2.5 Fuentes nuevas del catálogo (patrón PR #234)

fecoagro.com.ar (página Iglesia), trámite oficial Dirección Provincial de Cooperativas (tramite.sanjuan.gob.ar d/97), convocatoria Ley 2400-T 2024 (sisanjuan.gob.ar), presentación Mujeres de Montaña (sisanjuan.gob.ar 29-09-2026). Estados: disponible / requiere_solicitud según corresponda.

### 2.6 Oportunidades Bloque 9 (evidencia obligatoria, actores como rol)

- `market_gap`: canal Pro Huerta discontinuado a fines de 2023 — demanda de semillas y know-how intactos, canal nacional cortado; oportunidad de circuitos cortos y comerciales provinciales. Evidencia: Expoagro/FECOAGRO.
- `partnership_opportunity`: cooperación técnica federación–INTA–CONICET/UNSJ citada por fuentes periodísticas; actores referidos como ROL (federación de cooperativas / instituto nacional / universidad) hasta consentimiento.
- Regla: ningún actor nominal (organización o persona) sin consentimiento.

### 2.7 Pedidos formales (patrón PED-)

Estado INAES directo de matrículas 28.777, 11.463 y Buena Esperanza; padrón Ley 2400-T desagregado de Iglesia (ya en pie); registro provincial (Dirección Provincial de Cooperativas) de las 2 cooperativas.

## 3. Qué NO hacer (regresión)

No publicar presidentes/socios por nombre; no inventar productos (hoy 0 publicados); no etiquetar cooperativas como prestadores habilitados sin padrón; no fabricar estado INAES; no sembrar datos enriquecidos sin consentimiento institucional; no convertir a FECOAGRO en fuente única (procedencia múltiple cuando exista).

## 4. EV

A numerar por la tabla F0-C1 al volver CI (no reclamar número). Criterio propuesto: CI verde con E2E del consentimiento institucional + seed post-consentimiento + merge.

---

[agent: vibe] — 2026-10-17 · Épica #239 · Issue #240 · CI caído, sin merge sin CI verde (R15).