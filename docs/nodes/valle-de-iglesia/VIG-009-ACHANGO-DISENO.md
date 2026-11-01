# VIG-009 — Achango: sistema de apoyo (v0.1)

Estado: **PROPUESTA RATIFICADA POR LA DH (R9, 2026-10-17)** — alcance v1 COMPLETO ratificado: observaciones de estado patrimonial + instrumento de consentimiento de custodia + oportunidades Bloque 9 + vista showcase honesta. ISSUE #241 (sub-issue de la épica #239). Implementación en cola detrás de la cascada (CI caído desde 2026-10-15, reinicio ~2026-11-01).

## 0. Definición honesta del rol de la plataforma (regla innegociable)

DELocalSoy.AR **no recauda fondos, no canaliza dinero, no hace promesas de restauración**. El rescate que puede aportar es un sistema de apoyo basado en **información honesta, visibilidad estructurada y trazabilidad inmutable**: estado real público y verificable, necesidades y alianzas posibles registradas con evidencia, y cada gestión (nota, convocatoria, taller) dejando traza pública. El resto es de las personas y las instituciones — la plataforma les da visibilidad y memoria.

## 1. Diagnóstico verificado en vivo (2026-10-17)

### 1.1 El paraje y su conjunto patrimonial

- Paraje Achango (BAHRA A23, ~3,7 km de Las Flores): subnodo sj_iglesia_p_achango ya vivo en main (VIG-001).
- Conjunto MHN **Ley 24.790 (1997)**: capilla + caserío + cementerio + corrales; ficha patrimonial ya viva (VIG-004, PR #186). Punto público de la capilla autorizado por diseño (no es geometría sensible: la ficha arqueológica vulnerable va restringida aparte, p.ej. Bauchaceta).
- Datación (divergencias documentadas, NO se promedian): oratorio más antiguo ~1739 (documento de 1899 acredita el pedido formal de construcción de la capilla); prensa cita jesuitas 1630–1655 y «edificio actual 1787».
- Fuentes: es.wikipedia.org (Capilla de Achango), argentina.gob.ar (CNM, «Iglesia de Achango y su entorno»), sanjuanalmundo.com, canal13sanjuan.com, modoviajeok.com.ar (25-01-2026), sisanjuan.gob.ar (10-05-2022).

### 1.2 Estado de conservación — crítico (◐ testimonio periodístico 2026)

- Cornisas arruinadas, techos y maderos cediendo, riesgo de colapso latente; conserva ~90% de la estructura original; muros traseros de tapial/adobe hasta 1,10 m.
- **Estimación de restauración ~50 millones de pesos según el cuidador del sitio** (modoviajeok, 01-2026) — testimonio, NO presupuesto oficial.
- «Hace más de 15 años que venimos presentando notas en Nación, Provincia y Municipio, pero no hemos conseguido los fondos para una restauración como corresponde» — grietas importantes en varias esquinas (Diario 13 San Juan).
- El muro derecho debió ser reconstruido totalmente tras años de apuntalamiento, con el mismo material original (San Juan al Mundo).
- PEDL Iglesia 2018: restauración de las capillas de Achango y Santo Domingo figura como «Proyecto» (Informe de Avance 2024) — sin ejecución acreditada.

### 1.3 Población y custodia

- Hecho demográfico publicable con fuente: **un único habitante permanente** (80 años, 25 años solo, riega y limpia la capilla a diario según prensa) y una **familia guardiana con relevo generacional** (guardián oficial + tataranieto que vive en el paraje El Llano).
- Regla dura (ADR-027 / Ley 25.326): **ningún nombre propio se registra sin consentimiento expreso**; en la plataforma la custodia es un ROL.

### 1.4 Patrimonio vivo — el nudo de Achango

- Alfombras de nudo que tapizan el piso de tierra, algunas >350 años; telar de suelo; tintes nativos: algarrobo, jarilla, ruibarbo, cochinilla, minerales de la precordillera.
- **Proyecto de conservación 2022 verificado**: Ministerio de Turismo y Cultura (Mercado Artesanal Tradicional Luisa Escudero) + Municipio de Iglesia + maestras teleras = **ofrenda de jergones** para la festividad de la Virgen del Carmen (16 de julio), rescatando la costumbre de tapizar el piso; los tejidos antiguos desvaídos «serán conservados como piezas patrimoniales por el equipo que trabaja en el proyecto de restauración de la capilla». Nombres de maestras en prensa: no se registran sin consentimiento.
- Oficio textil iglesiano en riesgo de extinción (registrado 04-2026); hoy la gran minería vuelve a mirar los telares de Tudcum (pedido de ponchos corporativos de lana). Conexión directa con VIG-008: la cooperativa del distrito (Valles Iglesianos, domicilio El Jarillal) opera a 3,7 km del paraje.

### 1.5 Turismo y valorización en curso

- Capilla candidata a la ruta del Pasaporte Sanmartiniano (mención del guardián en prensa); el paraje integra una nueva ruta turística de sitios históricos vinculados a San Martín y fue locación de la película «Martina Chapanay, mujer de mil batallas».
- Festividad de la Virgen del Carmen: 16 de julio.
- La «cámara secreta» bajo el campanil (construcción sellada sin puertas ni ventanas): dato folklórico/jornalístico — NUNCA publicado como hecho ni especulado; relevamientos del sitio van restringidos (ADR-036).

### 1.6 Mapa de actores para el rescate (vías verificables, todas ◐ hasta gestión formal)

| Vía | Estado | Nota |
| --- | --- | --- |
| CNM / Secretaría de Cultura de la Nación (superintendencia MHN, Ley 12.665) | ◐ | 15+ años de notas sin fondos según el guardián; convocatorias federales existentes suelen pedir propiedad federal (no aplica directo a bien privado) |
| Provincia — PEDL Iglesia + Min. Turismo y Cultura | ◐ | «Proyecto» en Informe de Avance 2024; el equipo del proyecto 2022 de jergones incluyó a la dirección de Patrimonio |
| Municipio de Iglesia | ◐ | Co-gestor del proyecto de tejido 2022; direcciones de Turismo y Cultura activas |
| RSE minera (Veladero, Vicuña) | ◐ | Precedentes verificados: riego por goteo (Barrick/Silver Wheaton 2015), Mujeres en Red (Vicuña, 5 años) |
| FECOAGRO y cooperativas | ◐ | Ancla económica local; la federación nació para frenar el éxodo rural — exactamente el problema de Achango |
| Fundaciones / articulación público-privada | ◐ | Mecenazgo CABA no aplica territorialmente; sí fundaciones y convenios (precedente: archivo CNM con Fundación Santander + ASIMPPAC) |

## 2. Arquitectura del sistema (6 capas, alcance v1 ratificado COMPLETO)

### Capa 1 — Ficha patrimonial canónica (ya viva)

activos_patrimonio Capilla de Achango (Ley 24.790, PR #186). Extensión: **observaciones de estado** como sellos append-only (`patrimonio.observado` ciudadano, `patrimonio.custodiado` moderador — el segundo ya existe en VIG-004); checklist estructurado (grietas / cornisas / techos / maderos / muros); cada observación es testimonio con evidencia y fecha, nunca diagnóstico; `estado_conservacion` global NUNCA se publica como verificado sin informe técnico oficial (hoy: ◐).

### Capa 2 — Reportes ciudadanos con categoría patrimonial

CORE-005 ya vive en main (reportes con historial público ADR-038, duplicados como sugerencia ADR-039, justificación obligatoria por transición). Alta de categorías patrimoniales al vocabulario del nodo iglesia (`patrimonio_deterioro`, `patrimonio_perdida`) → los 15 años de notas sin respuesta se vuelven una **bandeja pública con historial inmutable**: qué se denunció, cuándo y qué respuesta hubo (o no hubo). El «sin dato» sigue siendo «sin dato» (R15).

### Capa 3 — Custodia con consentimiento granular

Ficha de custodio (patrón de la ficha de tejedora del corpus VIG): rol guardián/cuidador como **ROL, no como nombre**; consentimiento granular por campo (publicar rol sí, nombre no, contacto no), revocable (Ley 25.326/ADR-027). El dominio ya tiene `custodio_hash` (sello `patrimonio.custodiado`, VIG-004) — falta el instrumento de consentimiento y la ficha pública derivada.

### Capa 4 — Oportunidades Bloque 9 (el corazón del rescate)

Achango como primer caso completo del Banco de Potencialidades del nodo iglesia, con evidencia obligatoria, consentimiento de actores y estados honestos:

- `physical_asset`: conjunto MHN (Ley 24.790) con estado documentado (◐).
- `cultural_asset`: nudo de Achango, alfombras >350 años, telar de suelo, tintes nativos, ofrenda anual de jergones.
- `institutional_asset`: familia guardiana (como rol), comunidad de Las Flores, cooperativa del distrito (Valles Iglesianos, domicilio El Jarillal — ver VIG-008: datos enriquecidos solo tras consentimiento).
- `detected_demand`: restauración urgente (testimonio ~50M ARS, no presupuesto), mantenimiento, señalización; agua/energía/conectividad del paraje = **unknown sin relevamiento — no se inventan**.
- `market_gap`: turismo patrimonial sin prestador formal en el corredor Pismanta–Las Flores; demanda textil con oficio en riesgo de extinción.
- `partnership_opportunity`: CNM + Provincia (PEDL/Min. Turismo y Cultura) + Municipio + RSE minera (precedentes verificados) + cooperativas/FECOAGRO + UNSJ/CONICET.
- `investment_opportunity`: restauración del conjunto (candado epistémico: estimación testimonial, no presupuesto oficial).
- `policy_opportunity`: PEDL, Pasaporte Sanmartiniano, Leyes 6.801/7.911 (marco provincial ya verificado).

### Capa 5 — Patrimonio vivo y producción textil

Ficha de tejedora con consentimiento informado granular (diseño ya existente; 0 consentimientos hoy); piezas textiles (alfombras históricas) como activos culturales con visibilidad `restricted` ADR-036 (fotos y publicación solo con consentimiento; jamás inventario de piezas en riesgo). El sistema **presenta la demanda y la oferta sin intermediarlas** (sin marketplace, sin pagos, R15).

### Capa 6 — Vista showcase honesta

Vista «Achango» en el showcase del nodo (guion VIG-007 ya declara pendientes): regla Dato→Interpretación→Sugerencia; estado crítico = testimonio con fuente; custodia familiar = hecho público con fuente; necesidades básicas = unknown; llamado a la acción = enlaces a organismos competentes (CNM, municipio), NUNCA donativos.

## 3. Qué NO hace el sistema (regresión)

No recauda ni canaliza dinero; no publica nombres de personas sin consentimiento; no inventa necesidades, diagnósticos ni plazos; no especula sobre la cámara secreta ni publica su contenido; no promete restauración ni alertas oficiales; no publica geometría sensible más allá del punto público ya autorizado; no etiqueta «verificado» nada que no tenga procedencia (ADR-035).

## 4. EV

A numerar por la tabla F0-C1 al volver CI (no reclamar número). Criterio propuesto: CI verde con E2E observación→sello→oportunidad + ficha de custodia con consentimiento + showcase + merge.

---

[agent: vibe] — 2026-10-17 · Épica #239 · Issue #241 · CI caído, sin merge sin CI verde (R15).