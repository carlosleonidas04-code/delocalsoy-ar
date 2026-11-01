<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# Informe de nutrición — Nodo Capital, DELocalSoy.AR

**Alcance:** hallazgos verificados en esta pasada, con estado epistémico explícito. Varios puntos solicitados no pudieron confirmarse con fuente primaria en esta sesión y quedan como **◇ unknown, sin fuente**; no se completan por inferencia. La base de trabajo sigue siendo `main @ 77500be`; los hallazgos deben aterrizarse como filas independientes con URL, fecha y hash del snapshot.

______________________________________________________________________

## L1 — Padrón y directorio comercial

| Hallazgo | Dato | Fuente (nombre + URL) | Fecha del dato | Estado | Notas |
| :-- | :-- | :-- | :-- | :-- | :-- |
| Habilitación comercial municipal | La Municipalidad de Capital define la Habilitación Comercial, Industrial y de Servicios como autorización para funcionar en un local del Departamento Capital; es personal, indelegable e intransferible y tiene vigencia de 5 años, salvo excepciones de la ordenanza. | Municipalidad de Capital — [Habilitaciones](https://wwwold.municipiosanjuan.gob.ar/news-cyt/item/1740-habilitaciones) | 2022-02-02 | ✓ | La página menciona “la presente Ordenanza”, pero **no expone en el extracto su número**; el número exacto queda pendiente de verificación textual. |
| Canal digital provincial | Desde 2021, las habilitaciones industriales y comerciales se gestionan en línea; el sistema orienta sobre requisitos y certificados según municipio mediante una Ventanilla de Información. | Gobierno de San Juan — [Todas las habilitaciones industriales y comerciales se realizan online](https://sisanjuan.gob.ar/produccion-y-desarrollo-economico/2021-07-09/33385-a-partir-de-hoy-todas-las-habilitaciones-industriales-y-comerciales-se-realizan-on-line) | 2021-07-09 | ✓ | Útil como fuente de proceso, no como padrón público descargable. |
| Habilitación de alimentos | Existe trámite provincial de “Habilitación Provincial de Comercio de Alimentos”, aplicable a locales que vendan, expendan, almacenen o comercialicen alimentos. | Portal de Trámites San Juan — [Habilitación Provincial de Comercio de Alimentos](https://tramite.sanjuan.gob.ar/tramite/tag/habilitacion) | Página consultada 2025-12-01 | ✓ | Corresponde tratarlo como registro sectorial; no equivale al padrón general de comercios. |
| Dataset público de padrón de comercios | No se halló en esta pasada un dataset CKAN/API/CSV identificado como “padrón de comercios” o “habilitaciones comerciales” en el portal provincial. | Búsqueda sobre `datosabiertos.sanjuan.gob.ar`; sin resultado fuente primaria específica | 2026-10-15 | ◇ | No afirmar inexistencia definitiva: requiere sondeo directo del catálogo CKAN y pedido formal. |
| Campos del padrón municipal | Rubro, domicilio y estado son campos esperables de un padrón de habilitaciones, pero **no se verificó un documento oficial que los enumere**. | — | — | ◇ | No ingestar como esquema oficial sin fuente. |
| Nomenclador de rubros | No se halló un nomenclador público provincial o municipal de rubros de habilitación con códigos estables. | — | — | ◇ | Para REFES+CUE, exigir código/nomenclador antes de mapear rubros. |
| CNE 2020-2021, 2ª etapa | El INDEC documenta que el CNE 2020-2021 fue planificado en dos etapas; esta pasada no verificó publicación ni granularidad departamental de la 2ª etapa para Capital. | INDEC — [Censo Nacional Económico 2020-2021](https://censoeconomico.indec.gob.ar/wp-content/uploads/2022/10/cne_2020_2021_resultados_provisorios.pdf) | 2022-10 | ◐ | El PDF confirma la planificación bicapa; el estado operativo y desagregación quedan unknown. |
| Cuadro oficial CNE | INDEC publica una planilla XLS de cuadros de resultados provisorios del CNE 2020-2021. | INDEC — [Cuadros del CNE 2020-2021](https://www.indec.gob.ar/ftp/cuadros/economia/cne_2020_2021_resultados_provisorios.xls) | 2020-2021 | ✓ | Candidato a ingesta como snapshot; revisar hojas y claves territoriales antes del join. |
| RUPA / registros sectoriales con desagregación departamental | No se halló fuente primaria que confirme publicación de RUPA u otros registros sectoriales por departamento. | — | — | ◇ | Pedir formalmente a Provincia; no asumir equivalencia con padrón comercial. |


______________________________________________________________________

## L2 — Vitalidad del microcentro

| Hallazgo | Dato | Fuente (nombre + URL) | Fecha del dato | Estado | Notas |
| :-- | :-- | :-- | :-- | :-- | :-- |
| CCCA formal en microcentro | No se halló ordenanza, acta ni entidad oficial que documente un Centro Comercial a Cielo Abierto formal en el microcentro de Ciudad de San Juan. | — | — | ◇ | Mantener `ccca_microcentro: unknown`; no heredar el caso Chimbas. |
| Calles peatonales oficiales | No se halló norma municipal que declare peatonales calles específicas del microcentro. | — | — | ◇ | Requiere búsqueda en digesto/ordenanzas del Concejo Deliberante. |
| Vacancia / rotación de locales | No se halló estudio oficial, universitario o de cámara con metodología pública sobre vacancia en el microcentro. | — | — | ◇ | Si aparece prensa, cargar como ◐ con metodología declarada; no como dato oficial. |
| Cámara de Comercio de San Juan | No se verificó en esta pasada qué datasets o informes públicos publica la Cámara. | — | — | ◇ | Candidato a relevamiento directo institucional. |
| Ferias y registro de feriantes | Capital creó un Registro Único de Artesanos, manualistas, emprendedores, artistas y feriantes mediante **Despacho N° 325-26**, que reemplaza el sistema de la **Ordenanza N° 9194**. Prohíbe reventa de productos industrializados en ferias municipales y prevé credencial, nómina de participantes para eventos externos y seguro de responsabilidad civil. | Diario Huarpe — [Capital ordena sus ferias](https://www.diariohuarpe.com/nota/capital-crea-un-registro-unico-de-artesanos-para-ordenar-espacios-publicos-202691512120) | 2026-09-15 | ◐ | Prensa veraz, pero falta texto oficial del Despacho 325-26 y de la Ordenanza 9194 para estado ✓. |
| Programas de fomento al comercio local | No se hallaron programas vigentes con nombre, alcance y fuente oficial en esta pasada. | — | — | ◇ | No ingestar programas históricos sin vigencia documentada. |


______________________________________________________________________

## L3 — Inventario oficial de espacios públicos

| Hallazgo | Dato | Fuente (nombre + URL) | Fecha del dato | Estado | Notas |
| :-- | :-- | :-- | :-- | :-- | :-- |
| Servicio WMS UNIDE | UNIDE publica un servicio WMS en `https://unide.sanjuan.gob.ar/geoserver/wms`. | Gobierno de San Juan, UNIDE — [Geoservicios](https://web.sanjuan.gob.ar/unide/geoservicios/) | 2026-10-06 | ✓ | URL base confirmada; falta inspeccionar `GetCapabilities` para enumerar capas exactas. |
| Registro externo del WMS | IDERA registra el recurso como Web Map Service con URL `https://unide.sanjuan.gob.ar/geoserver/wms`. | IDERA — [Infraestructura de Datos Espaciales de San Juan](https://controlserviciosidera.iado-conicet.gob.ar/resource/660?lang=de) | 2026-10-14 | ✓ | Refuerza procedencia del endpoint; no sustituye la lectura de capacidades. |
| Límite técnico del WMS | Un trabajo académico describe UNIDE SJ como plataforma de geoservicios WMS para visualizar y consultar capas oficiales; aclara que WMS entrega mapas como imágenes y no permite descarga vectorial ni análisis directo. | UNSJ — [Trabajo Final Goria-Ortiz-Paroldi](http://huru.unsj.edu.ar/bitstream/handle/123456789/635/2025-Trabajo%20Final%20Goria-Ortiz-Paroldi.pdf?sequence=1&isAllowed=y) | 2025 | ◐ | Implicancia de arquitectura: WMS sirve para visualización/referencia; para ingesta vectorial se necesita WFS, API o pedido formal. |
| Inventario municipal de plazas/parques | No se halló inventario municipal descargable ni norma que apruebe un inventario de plazas, parques y paseos del departamento Capital. | — | — | ◇ | Mantener espacios del microcentro como ◐ hasta obtener fuente municipal. |
| Capas de espacios verdes / equipamiento | No se identificaron nombres exactos de capas WMS/WFS de espacios verdes o equipamiento urbano. | — | — | ◇ | Próximo paso técnico: `?service=WMS&request=GetCapabilities`. |
| Arbolado urbano | No se halló censo o inventario público de arbolado con especie, cantidad y estado. | — | — | ◇ | No simular atributos arbóreos. |
| Mobiliario y luminaria | No se hallaron datos públicos por plaza o barrio. | — | — | ◇ | Puede convertirse en capa de observación ciudadana, claramente separada de datos oficiales. |
| Programa de recuperación de espacios públicos | El PEC 2025 informa un plan integral de reparación y renovación de veredas con foco en corredores peatonales estratégicos, accesos a escuelas, centros de salud y espacios públicos relevantes. | Plan Estratégico de Capital — [Avance de Diagnóstico 2025](https://planestrategico.sanjuan.gob.ar/wp-content/uploads/2025/10/PEC-Avance-de-Diagnostico-2025.pdf) | 2025-10 | ✓ | Es diagnóstico/marco, no un programa con presupuesto publicado en el fragmento verificado. |


______________________________________________________________________

## L4 — Corredores, accesibilidad y movilidad

| Hallazgo | Dato | Fuente (nombre + URL) | Fecha del dato | Estado | Notas |
| :-- | :-- | :-- | :-- | :-- | :-- |
| Corredores peatonales en PEC 2025 | El PEC 2025 menciona “corredores peatonales estratégicos” dentro del plan integral de reparación y renovación de veredas. | Plan Estratégico de Capital — [Avance de Diagnóstico 2025](https://planestrategico.sanjuan.gob.ar/wp-content/uploads/2025/10/PEC-Avance-de-Diagnostico-2025.pdf) | 2025-10 | ✓ | No nombra ejes específicos en el extracto verificado; los corredores del repo siguen `boundary_status: provisional`. |
| Accesibilidad peatonal | El mismo documento vincula la renovación de veredas con accesos a escuelas, centros de salud y espacios públicos relevantes. | PEC 2025 — [Avance de Diagnóstico 2025](https://planestrategico.sanjuan.gob.ar/wp-content/uploads/2025/10/PEC-Avance-de-Diagnostico-2025.pdf) | 2025-10 | ✓ | No constituye inventario de rampas ni estado vereda por cuadra. |
| Rampas / sendas / estado de veredas | No se halló dataset ni programa con datos puntuales de rampas, sendas o estado de veredas del microcentro. | — | — | ◇ | Candidato prioritario a pedido formal municipal. |
| Plan de movilidad urbana | No se halló en esta pasada un plan vigente con alcance, red de ciclovías y sendas documentado por fuente oficial. | — | — | ◇ | No confundir con el PEC 2025. |
| Flujos peatonales | No se hallaron mediciones ni estimaciones públicas de afluencia peatonal en el microcentro. | — | — | ◇ | Cualquier métrica futura debe declarar método, fecha y cobertura. |
| Obras vigentes que afecten el microcentro | No se identificaron obras con plazo público que afecten específicamente el microcentro. | — | — | ◇ | Revisar portal de obras municipales y boletín oficial antes de cerrar el stage. |


______________________________________________________________________

## L5 — Marco normativo y ético

| Hallazgo | Dato | Fuente (nombre + URL) | Fecha del dato | Estado | Notas |
| :-- | :-- | :-- | :-- | :-- | :-- |
| Habilitación comercial municipal | La Municipalidad reconoce expresamente la Habilitación Comercial, Industrial y de Servicios, su vigencia quinquenal y su carácter personal/intransferible. | Municipalidad de Capital — [Habilitaciones](https://wwwold.municipiosanjuan.gob.ar/news-cyt/item/1740-habilitaciones) | 2022-02-02 | ✓ | Falta número/año exacto de la ordenanza en la fuente accesible. |
| Gastronomía y publicidad en vía pública | La **Ordenanza N° 9587** regula la actividad gastronómica en la vía pública en el Departamento Capital y contempla la colocación de carteles de publicidad en vía pública. | Municipalidad de Capital — [Ordenanza N° 9587](https://wwwold.municipiosanjuan.gob.ar/ordenanzas/ordenanzas-2009/9068-ord-9587/file) | 2009 | ✓ | Norma específica; no fusionar con habilitación de locales ni con ferias. |
| Ferias y mercados | La **Ordenanza N° 9194** regulaba el sistema previo de ferias; el **Despacho N° 325-26** crea un nuevo registro único de feriantes/artesanos y lo reemplaza. | Diario Huarpe — [Capital ordena sus ferias](https://www.diariohuarpe.com/nota/capital-crea-un-registro-unico-de-artesanos-para-ordenar-espacios-publicos-202691512120) | 2026-09-15 | ◐ | Números normativos precisos, pero texto oficial aún no verificado. |
| Acceso a la información pública provincial | San Juan **no adhirió** a la Ley Nacional 27.275 según reporte de prensa de 2025; también se registra que hubo proyectos de adhesión presentados en 2024. | Diario Huarpe — [San Juan continúa sin una Ley de Acceso a la Información Pública](https://www.diariohuarpe.com/nota/san-juan-sin-ley-de-acceso-a-la-informacion-publica-una-deuda-con-la-transparencia-20255306026); [Vuelven a presentar el proyecto](https://www.diariohuarpe.com/nota/volvieron-a-presentar-el-proyecto-de-acceso-a-la-informacion-publica-en-san-juan-202432822470) | 2025-05-30; 2024-03-29 | ◐ | Confirmar contra Boletín Oficial/digesto antes de afirmarlo jurídicamente en producción. |
| Procedimiento nacional aplicable a organismos nacionales | La Ley 27.275 permite solicitud escrita o electrónica, sin formalidad salvo identidad, identificación clara de la información y contacto; respuesta en 15 días hábiles, prorrogable por 15 más. | InfoLEG — [Ley 27.275](https://servicios.infoleg.gob.ar/infolegInternet/anexos/265000-269999/265949/norma.htm) | 2016 | ✓ | Aplica directamente a sujetos obligados nacionales; no resolver por sí sola pedidos a municipio/provincia sanjuanina. |
| Ley provincial de ambiente | La **Ley 513-L** de San Juan establece el marco para preservar y mejorar el ambiente y propiciar desarrollo sustentable; crea el Consejo Provincial del Ambiente y el Fondo Provincial del Ambiente. | Argentina.gob.ar — [Ley 513-L](https://www.argentina.gob.ar/normativa/provincial/ley-513-123456789-0abc-defg-315-0021jvorpyel/actualizacion) | 2014-11-19 | ✓ | Autoridad ambiental referida en fuentes oficiales posteriores: Secretaría de Estado de Ambiente y Desarrollo Sustentable. |
| Evaluación de impacto ambiental | La **Ley 6571** dispone que obras o actividades capaces de modificar el ambiente requieren Declaración de Impacto Ambiental emitida por la Subsecretaría de Política Ambiental. | Cámara de Diputados de San Juan — [Ley 6571](https://diputadossanjuan.gob.ar/cuerpo-legislativo/comisiones-y-representantes/consejo-provincial-del-ambiente-ley-n-513-l?view=article&id=2837:ley-n-6571&catid=124) | 2024-01-01 | ✓ | Relevante si el stage incorpora intervenciones o evaluaciones territoriales. |
| Adhesión ambiental nacional | La **Ley 927-L** adhiere a San Juan a la Ley Nacional 25.675, Política Ambiental Nacional, sin alterar jurisdicción local. | Gobierno de San Juan — [Ley 927-L](https://sisanjuan.gob.ar/legislacion-ambiental/2016-12-27/3456-ley-n-927-l) | 2016-12-27 | ✓ | Citar por separado de la Ley 513-L. |
| Protección de datos | No se halló ley provincial propia de protección de datos personales ni delegación provincial de la AAIP en esta pasada. | — | — | ◇ | Aplicar Ley 25.326 y Decreto 1558/2001 como marco nacional; minimizar PII por diseño. |
| Licencias de datos abiertos / UNIDE | No se halló el texto de licencia de reutilización de datasets de `datosabiertos.sanjuan.gob.ar` ni de capas UNIDE. | — | — | ◇ | Bloqueante para publicación de derivados; capturar licencia por dataset antes de ingesta. |
| Defensa del consumidor provincial | No se verificó en esta pasada la ley provincial de adhesión a la 24.240 ni qué publica la Dirección de Defensa al Consumidor. | — | — | ◇ | Mantener separado del marco nacional. |
| IGN / carta geométrica nacional | No se verificó el régimen exacto de uso y derivación cartográfica por terceros. | — | — | ◇ | Revisar condiciones de uso del IGN antes de publicar mapas derivados. |


______________________________________________________________________

## L6 — Economía de proximidad

| Hallazgo | Dato | Fuente (nombre + URL) | Fecha del dato | Estado | Notas |
| :-- | :-- | :-- | :-- | :-- | :-- |
| Mercado de Abasto | El Mercado de Abasto de Capital funciona de lunes a sábado, desde las 06:00 hasta las 13:00. | Municipalidad de Capital — [Feria Municipal y Mercado de Abasto](https://wwwold.municipiosanjuan.gob.ar/servicios/item/518-feria-y-mercado-de-abasto) | 2023-09-04 | ✓ | Verificar vigencia actual y reglamento antes de mostrar horario en UI. |
| Registro de feriantes | El nuevo registro único municipal de feriantes/artesanos, creado por Despacho N° 325-26, unifica padrones y establece reglas comunes para actividades en plazas, paseos y otros espacios públicos. | Diario Huarpe — [Capital ordena sus ferias](https://www.diariohuarpe.com/nota/capital-crea-un-registro-unico-de-artesanos-para-ordenar-espacios-publicos-202691512120) | 2026-09-15 | ◐ | Alta relevancia para “economía de proximidad”; pedir texto oficial y listado de ferias autorizadas. |
| Indicadores de comercio minorista | No se verificó en esta pasada una serie pública específica de comercio minorista provincial del IIEE o INDEC. | — | — | ◇ | Buscar serie EMAE/comercio por provincia y series IIEE con URL estable. |
| Programas de fomento a comercios de barrio | No se hallaron programas vigentes con operador, beneficio y vigencia documentados. | — | — | ◇ | No usar programas nacionales genéricos como si fueran locales. |
| Padrinazgo de plazas / coproducción espacio-comercio | No se relevó un precedente argentino con fuente en esta pasada. | — | — | ◇ | Cuando se incorpore, etiquetar estrictamente como `[HIPÓTESIS DE DISEÑO]`. |
| Presupuesto participativo en Capital | No se halló experiencia con nombre, edición y obras resultantes documentadas por fuente oficial. | — | — | ◇ | No inferir desde experiencias de otros municipios. |


______________________________________________________________________

## L7 — Adecuación jurídica provincial

| Hallazgo | Dato | Fuente (nombre + URL) | Fecha del dato | Estado | Notas |
| :-- | :-- | :-- | :-- | :-- | :-- |
| Ley ambiental general | **Ley 513-L** es la ley general ambiental provincial; prevé Plan de Política y Gestión Ambiental, Consejo Provincial del Ambiente y Fondo Provincial del Ambiente. | Argentina.gob.ar — [Ley 513-L](https://www.argentina.gob.ar/normativa/provincial/ley-513-123456789-0abc-defg-315-0021jvorpyel/actualizacion) | 2014-11-19 | ✓ | La Secretaría de Estado de Ambiente y Desarrollo Sustentable aparece como autoridad competente en documentación oficial posterior. |
| Autoridad ambiental | La Secretaría de Estado de Ambiente y Desarrollo Sustentable es autoridad de aplicación de la Ley 8238 y organismo ambiental competente en fuentes oficiales. | Cámara de Diputados de San Juan — [Ley 8238](https://diputadossanjuan.gob.ar/cuerpo-legislativo/comisiones-y-representantes/organo-coordinador-provincial-ley-n-989-e?view=article&id=467:ley-n-8238&catid=107); Gobierno de San Juan — [Secretaría de Ambiente](https://tramite.sanjuan.gov.ar/index.php/tramite/org/430) | Página consultada 2025-10-21 | ✓ | Para pedidos ambientales/territoriales, dirigir solicitudes a este organismo. |
| Acceso a información | No hay adhesión provincial confirmada a la Ley 27.275; la evidencia disponible es periodística y coincide en que la provincia no adhirió. | Diario Huarpe — [San Juan continúa sin una Ley de Acceso a la Información Pública](https://www.diariohuarpe.com/nota/san-juan-sin-ley-de-acceso-a-la-informacion-publica-una-deuda-con-la-transparencia-20255306026) | 2025-05-30 | ◐ | Para municipio y provincia, planificar pedido administrativo directo + fundamento en Constitución Provincial art. 27; no invocar automáticamente el procedimiento de la 27.275. |
| Datos personales | No se halló ley provincial propia ni delegación provincial de AAIP. | — | — | ◇ | La plataforma debe tratar la Ley 25.326 como techo nacional aplicable y aplicar minimización, agregación y anti-PII. |
| Licencias de reutilización | No se halló texto de licencia para datasets provinciales ni capas UNIDE. | — | — | ◇ | Antes de publicar derivados, capturar metadato de licencia por recurso; si no existe, solicitar autorización/términos formales. |
| IGN | No se verificó el marco de uso cartográfico de terceros. | — | — | ◇ | Revisar términos IGN y atribución antes de publicar cartografía derivada. |


______________________________________________________________________

## Resumen ejecutivo — 10 hallazgos más accionables

1. **WMS UNIDE confirmado:** `https://unide.sanjuan.gob.ar/geoserver/wms`, con registro IDERA. Ingestar endpoint y procedencia; inspeccionar `GetCapabilities` antes de mapear capas.[^1_1][^1_2]
2. **Cuadros CNE 2020-2021 descargables** en XLS oficial del INDEC; candidato inmediato a snapshot con claves territoriales.[^1_3]
3. **Habilitación comercial municipal documentada**, con vigencia de 5 años y carácter personal/intransferible; falta número de ordenanza.[^1_4]
4. **Ordenanza 9587** regula gastronomía y publicidad en vía pública en Capital; ingesta normativa separada por tema.[^1_5]
5. **Despacho 325-26 + Ordenanza 9194** estructuran el régimen de ferias y registro de feriantes; prioridad para obtener textos oficiales.[^1_6]
6. **PEC 2025 confirma corredores peatonales estratégicos y plan de veredas**, pero no nombra ejes específicos en el extracto verificado.[^1_7]
7. **Mercado de Abasto con horario oficial publicado**: lunes a sábado, 06:00–13:00; verificar vigencia antes de UI.[^1_8]
8. **Ley 513-L** es la base ambiental provincial; **Ley 6571** regula DIA; **Ley 927-L** adhiere a la Ley 25.675. Ingestar como tres normas separadas.[^1_9][^1_10][^1_11]
9. **No hay adhesión provincial confirmada a la Ley 27.275**: planificar pedidos formales directos a Municipio/Provincia, con fundamento constitucional provincial.[^1_12][^1_13]
10. **No hay padrón comercial descargable identificado**: primer pedido formal debe solicitar padrón/esquema de habilitaciones, nomenclador de rubros, formato, licencia y frecuencia de actualización.

______________________________________________________________________

## Lista explícita de unknowns

- Dataset público descargable del padrón de comercios provincial o municipal: **◇ unknown, sin fuente**.
- Campos oficiales del padrón municipal de habilitaciones: **◇ unknown, sin fuente**.
- Nomenclador codificado de rubros, provincial y municipal: **◇ unknown, sin fuente**.
- Estado y granularidad departamental de la 2ª etapa del CNE 2020-2021 para Capital: **◇ unknown, sin fuente**.
- RUPA y registros sectoriales con datos por departamento: **◇ unknown, sin fuente**.
- CCCA formal u asociación de comerciantes del microcentro: **◇ unknown, sin fuente**.
- Calles peatonales oficiales y norma declarativa: **◇ unknown, sin fuente**.
- Estudios de vacancia/rotación de locales: **◇ unknown, sin fuente**.
- Datos públicos de cámaras comerciales: **◇ unknown, sin fuente**.
- Programas vigentes de fomento al comercio local: **◇ unknown, sin fuente**.
- Inventario oficial municipal de plazas/parques/paseos: **◇ unknown, sin fuente**.
- Nombres exactos de capas UNIDE de espacios verdes/equipamiento: **◇ unknown, sin fuente**.
- Censo/inventario de arbolado urbano: **◇ unknown, sin fuente**.
- Datos públicos de mobiliario urbano y luminaria: **◇ unknown, sin fuente**.
- Rampas, sendas y estado de veredas por cuadra: **◇ unknown, sin fuente**.
- Plan de movilidad urbana vigente con ciclovías/sendas: **◇ unknown, sin fuente**.
- Flujos peatonales medidos o estimados: **◇ unknown, sin fuente**.
- Obras vigentes con plazo que afecten el microcentro: **◇ unknown, sin fuente**.
- Número y texto exacto de la ordenanza municipal de habilitación comercial: **◇ unknown, sin fuente**.
- Ley provincial de protección de datos personales y delegación AAIP: **◇ unknown, sin fuente**.
- Licencias de reutilización de datasets abiertos y capas UNIDE: **◇ unknown, sin fuente**.
- Ley provincial de adhesión a defensa del consumidor y publicaciones de la Dirección: **◇ unknown, sin fuente**.
- Marco IGN/carta geométrica para derivados cartográficos: **◇ unknown, sin fuente**.
- Indicadores series de comercio minorista provincial: **◇ unknown, sin fuente**.
- Programas vigentes de comercios de barrio: **◇ unknown, sin fuente**.
- Precedentes documentados de coproducción espacio público–comercio: **◇ unknown, sin fuente**.
- Presupuesto participativo o decisiones vecinales con obras resultantes en Capital: **◇ unknown, sin fuente**.

<span style="display:none">[^1_14][^1_15][^1_16][^1_17][^1_18][^1_19][^1_20][^1_21][^1_22][^1_23][^1_24][^1_25][^1_26][^1_27][^1_28][^1_29][^1_30][^1_31][^1_32][^1_33][^1_34][^1_35][^1_36][^1_37][^1_38][^1_39][^1_40][^1_41][^1_42][^1_43][^1_44][^1_45]</span>

<div align="center">⁂</div>

[^1_1]: https://web.sanjuan.gob.ar/unide/geoservicios/

[^1_2]: https://controlserviciosidera.iado-conicet.gob.ar/resource/660?lang=de

[^1_3]: https://www.indec.gob.ar/ftp/cuadros/economia/cne_2020_2021_resultados_provisorios.xls

[^1_4]: https://wwwold.municipiosanjuan.gob.ar/news-cyt/item/1740-habilitaciones

[^1_5]: https://wwwold.municipiosanjuan.gob.ar/ordenanzas/ordenanzas-2009/9068-ord-9587/file

[^1_6]: https://www.diariohuarpe.com/nota/capital-crea-un-registro-unico-de-artesanos-para-ordenar-espacios-publicos-202691512120

[^1_7]: https://planestrategico.sanjuan.gob.ar/wp-content/uploads/2025/10/PEC-Avance-de-Diagnostico-2025.pdf

[^1_8]: https://wwwold.municipiosanjuan.gob.ar/servicios/item/518-feria-y-mercado-de-abasto

[^1_9]: https://www.argentina.gob.ar/normativa/provincial/ley-513-123456789-0abc-defg-315-0021jvorpyel/actualizacion

[^1_10]: https://diputadossanjuan.gob.ar/cuerpo-legislativo/comisiones-y-representantes/consejo-provincial-del-ambiente-ley-n-513-l?view=article\&id=2837:ley-n-6571\&catid=124

[^1_11]: https://sisanjuan.gob.ar/legislacion-ambiental/2016-12-27/3456-ley-n-927-l

[^1_12]: https://www.diariohuarpe.com/nota/san-juan-sin-ley-de-acceso-a-la-informacion-publica-una-deuda-con-la-transparencia-20255306026

[^1_13]: https://www.diariohuarpe.com/nota/volvieron-a-presentar-el-proyecto-de-acceso-a-la-informacion-publica-en-san-juan-202432822470

[^1_14]: https://www.bcn.cl/leychile/navegar?idNorma=1218339

[^1_15]: https://sisanjuan.gob.ar/produccion-y-desarrollo-economico/2021-07-09/33385-a-partir-de-hoy-todas-las-habilitaciones-industriales-y-comerciales-se-realizan-on-line

[^1_16]: https://www.diariohuarpe.com/nota/capital-impulsa-ordenanza-para-habilitar-carros-pancheros-y-food-trucks-20254717560

[^1_17]: https://www.lexjuris.com/ordenanzas/San Juan/2025-26/OM-35-2025-2026.pdf

[^1_18]: https://planestrategico.sanjuan.gob.ar/?page_id=8

[^1_19]: https://planestrategico.sanjuan.gob.ar/wp-content/uploads/2026/04/PESJ_informe_actualizacion_2025.pdf

[^1_20]: https://planestrategico.sanjuan.gob.ar/?page_id=6

[^1_21]: https://tramite.sanjuan.gob.ar/tramite/cat/60

[^1_22]: https://tramite.sanjuan.gob.ar/tramite/tag/habilitacion

[^1_23]: https://municipiosanjuan.gob.ar/transparencia/plan-estrategico

[^1_24]: https://planestrategico.sanjuan.gob.ar/?page_id=1004

[^1_25]: https://servicios.infoleg.gob.ar/infolegInternet/anexos/265000-269999/265949/norma.htm

[^1_26]: https://www.colombiaenmapas.gov.co/colombia-mapas/consumo-servicios-wms

[^1_27]: https://www.argentina.gob.ar/noticias/acceso-la-informacion-publica-en-las-provincias

[^1_28]: https://www.argentina.gob.ar/justicia/derechofacil/leysimple/acceso-la-informacion-publica

[^1_29]: https://www.boletinoficial.gob.ar/pdf/aviso/primera/313139/20240902

[^1_30]: https://docs.pr.gov/files/prits/LeyTransparencia/Manual_de_Procedimiento_para_el_Requerimiento_de_Informacio%CC%81n_Pu%CC%81blica_bajo_la_Custodia_de_la_PRITS.pdf

[^1_31]: http://huru.unsj.edu.ar/bitstream/handle/123456789/635/2025-Trabajo Final Goria-Ortiz-Paroldi.pdf?sequence=1\&isAllowed=y

[^1_32]: https://campus.idera.gob.ar/pluginfile.php/699/mod_resource/content/0/Geoservicios_SIG_IDE-SAN%20JUAN.pdf

[^1_33]: https://www.nuevodiariosanjuan.com.ar/acceso-de-la-informacion-publica-un-derecho-postergado-en-san-juan/

[^1_34]: https://web.sanjuan.gob.ar/unide/inicio/

[^1_35]: https://www.dpn.gob.ar/transparencia.php

[^1_36]: https://diputadossanjuan.gob.ar/cuerpo-legislativo/comisiones-y-representantes/organo-coordinador-provincial-ley-n-989-e?view=article\&id=467:ley-n-8238\&catid=107

[^1_37]: https://www2.congreso.gob.pe/sicr/cendocbib/con5_uibd.nsf/8F2281875297C7F9052582EF00737306/\$FILE/San_juan_Ley_8130.pdf

[^1_38]: https://www.argentina.gob.ar/jefatura/turismo-y-ambiente/ambiente/articulacion-ambiental/derechos-de-acceso-por-provincia/san

[^1_39]: https://faolex.fao.org/docs/pdf/arg186939.pdf

[^1_40]: https://sisanjuan.gob.ar/legislacion-ambiental/2016-12-02/3177-ley-n-504-l

[^1_41]: https://www.argentina.gob.ar/normativa/provincial/ley-6634-123456789-0abc-defg-436-6000jvorpyel/actualizacion

[^1_42]: https://www.aytojaen.es/portal/RecursosWeb/DOCUMENTOS/1/0_855_1.pdf

[^1_43]: https://tramite.sanjuan.gov.ar/index.php/tramite/org/430

[^1_44]: https://asesorialetrada.sanjuan.gob.ar/cms/public/img/pdf/DIC-184-2024.pdf

[^1_45]: https://censoeconomico.indec.gob.ar/wp-content/uploads/2022/10/cne_2020_2021_resultados_provisorios.pdf


---

# Documento de trabajo — Nutrición del Nodo Capital

**Proyecto:** DELocalSoy.AR\
**Nodo:** Capital (San Juan, Argentina)\
**Repositorio:** `carlosleonidas04-code/delocalsoy-ar`\
**Base de trabajo:** `main @ 77500be`\
**Issue asociado:** \#215 — stage comercios × espacios públicos\
**Fecha del documento:** 2026-10-15\
**Destinatario:** equipo Vibe / `agent-vibe`\
**Origen:** investigación de nutrición verificada por Perplexity

Este documento define qué puede ingresarse ya, qué requiere verificación adicional y qué debe permanecer como `unknown` de primera clase. **Nada se simula, se infiere como oficial ni se completa para llenar vacíos.**

______________________________________________________________________

## 1. Propósito

Nutrir la primera ingesta real del Nodo Capital con fuentes trazables para el stage de diseño **«el espacio que cuida» × «economía de proximidad»**.

El corpus alimentará:

- El directorio y padrón comercial del nodo.
- El inventario de espacios públicos y equipamiento urbano.
- Los corredores, accesibilidad y centralidades del microcentro.
- La capa normativa y ética de la plataforma.
- Los pedidos formales de información pública necesarios para completar vacíos.

El principio rector es: **dato oficial ≠ prensa ≠ directorio comercial ≠ observación ciudadana**.

______________________________________________________________________

## 2. Reglas epistémicas obligatorias

Toda fila incorporada al corpus debe tener:


| Campo | Regla |
| :-- | :-- |
| `source_name` | Nombre institucional exacto de la fuente |
| `source_url` | URL directa y estable |
| `data_date` | Fecha del dato, no fecha de consulta |
| `retrieved_at` | Fecha de captura del snapshot |
| `epistemic_status` | `verified` / `provisional` / `unknown` |
| `source_type` | `official` / `press` / `commercial_directory` / `academic` / `citizen_observation` |
| `license` | Licencia de reutilización, si existe |
| `hash` | SHA-256 del snapshot descargado |
| `join_key` | Código o identificador estable; nunca nombre |

### Estados permitidos

| Estado | Significado | Regla de uso |
| :-- | :-- | :-- |
| `✓ verified` | Fuente oficial: gobierno, municipio, INDEC, norma publicada | Puede alimentar datos primarios |
| `◐ provisional` | Prensa, academia, directorio, fuente secundaria | Puede alimentar contexto o hipótesis; no como hecho oficial |
| `◇ unknown` | Sin fuente verificable | Debe permanecer visible como desconocido |

### Prohibiciones

- No unir registros por nombre de comercio, plaza, calle o institución.
- No publicar datos personales de comerciantes, feriantes o vecinos.
- No convertir prensa en fuente oficial sin respaldo normativo o institucional.
- No mezclar normas distintas en una misma ficha.
- No asumir vigencia de un programa, horario o norma sin fecha y fuente actual.
- No usar datos de WMS como si fueran descargas vectoriales sin confirmar WFS/API.

La protección de datos personales se rige por la **Ley Nacional 25.326** y su decreto reglamentario **1558/2001**. El diseño debe aplicar minimización, agregación y ausencia de identificadores personales en la capa pública.

______________________________________________________________________

## 3. Inventario inicial de fuentes accionables

### 3.1 Fuentes primarias confirmadas

| ID | Recurso | URL | Tipo | Estado | Uso previsto |
| :-- | :-- | :-- | :-- | :-- | :-- |
| `SRC-001` | PEC 2025 — Avance de Diagnóstico | [https://planestrategico.sanjuan.gob.ar/wp-content/uploads/2025/10/PEC-Avance-de-Diagnostico-2025.pdf](https://planestrategico.sanjuan.gob.ar/wp-content/uploads/2025/10/PEC-Avance-de-Diagnostico-2025.pdf) | Oficial | ✓ | Marco territorial, microcentro, corredores peatonales, veredas |
| `SRC-002` | CNE 2020-2021 — cuadros XLS | [https://www.indec.gob.ar/ftp/cuadros/economia/cne_2020_2021_resultados_provisorios.xls](https://www.indec.gob.ar/ftp/cuadros/economia/cne_2020_2021_resultados_provisorios.xls) | Oficial | ✓ | Contexto económico y empresarial provincial |
| `SRC-003` | CNE 2020-2021 — informe PDF | [https://censoeconomico.indec.gob.ar/wp-content/uploads/2022/10/cne_2020_2021_resultados_provisorios.pdf](https://censoeconomico.indec.gob.ar/wp-content/uploads/2022/10/cne_2020_2021_resultados_provisorios.pdf) | Oficial | ✓ | Metodología y confirmación de dos etapas |
| `SRC-004` | UNIDE — Geoservicios | [https://web.sanjuan.gob.ar/unide/geoservicios/](https://web.sanjuan.gob.ar/unide/geoservicios/) | Oficial | ✓ | Endpoint WMS y catálogo de geoservicios |
| `SRC-005` | UNIDE — WMS | [https://unide.sanjuan.gob.ar/geoserver/wms](https://unide.sanjuan.gob.ar/geoserver/wms) | Oficial | ✓ | Visualización cartográfica; requiere inspección de `GetCapabilities` |
| `SRC-006` | IDERA — registro del servicio | [https://controlserviciosidera.iado-conicet.gob.ar/resource/660?lang=de](https://controlserviciosidera.iado-conicet.gob.ar/resource/660?lang=de) | Oficial / estándar | ✓ | Procedencia del endpoint WMS |
| `SRC-007` | Municipalidad de Capital — Habilitaciones | [https://wwwold.municipiosanjuan.gob.ar/news-cyt/item/1740-habilitaciones](https://wwwold.municipiosanjuan.gob.ar/news-cyt/item/1740-habilitaciones) | Oficial | ✓ | Definición y vigencia de habilitación comercial |
| `SRC-008` | Ordenanza 9587 — gastronomía y publicidad en vía pública | [https://wwwold.municipiosanjuan.gob.ar/ordenanzas/ordenanzas-2009/9068-ord-9587/file](https://wwwold.municipiosanjuan.gob.ar/ordenanzas/ordenanzas-2009/9068-ord-9587/file) | Oficial | ✓ | Vía pública, gastronomía y publicidad |
| `SRC-009` | Municipalidad de Capital — Mercado de Abasto | [https://wwwold.municipiosanjuan.gob.ar/servicios/item/518-feria-y-mercado-de-abasto](https://wwwold.municipiosanjuan.gob.ar/servicios/item/518-feria-y-mercado-de-abasto) | Oficial | ✓ | Horario y existencia del Mercado de Abasto |
| `SRC-010` | Portal de Trámites — habilitación de alimentos | [https://tramite.sanjuan.gob.ar/tramite/tag/habilitacion](https://tramite.sanjuan.gob.ar/tramite/tag/habilitacion) | Oficial | ✓ | Registro sectorial alimenticio |
| `SRC-011` | Ley 513-L — ambiente | [https://www.argentina.gob.ar/normativa/provincial/ley-513-123456789-0abc-defg-315-0021jvorpyel/actualizacion](https://www.argentina.gob.ar/normativa/provincial/ley-513-123456789-0abc-defg-315-0021jvorpyel/actualizacion) | Oficial | ✓ | Marco ambiental provincial |
| `SRC-012` | Ley 6571 — impacto ambiental | [https://diputadossanjuan.gob.ar/cuerpo-legislativo/comisiones-y-representantes/consejo-provincial-del-ambiente-ley-n-513-l?view=article\&id=2837:ley-n-6571\&catid=124](https://diputadossanjuan.gob.ar/cuerpo-legislativo/comisiones-y-representantes/consejo-provincial-del-ambiente-ley-n-513-l?view=article&id=2837:ley-n-6571&catid=124) | Oficial | ✓ | Evaluación de impacto ambiental |
| `SRC-013` | Ley 927-L — adhesión Ley 25.675 | [https://sisanjuan.gob.ar/legislacion-ambiental/2016-12-27/3456-ley-n-927-l](https://sisanjuan.gob.ar/legislacion-ambiental/2016-12-27/3456-ley-n-927-l) | Oficial | ✓ | Adhesión ambiental nacional |
| `SRC-014` | Ley 8238 — autoridad ambiental | [https://diputadossanjuan.gob.ar/cuerpo-legislativo/comisiones-y-representantes/organo-coordinador-provincial-ley-n-989-e?view=article\&id=467:ley-n-8238\&catid=107](https://diputadossanjuan.gob.ar/cuerpo-legislativo/comisiones-y-representantes/organo-coordinador-provincial-ley-n-989-e?view=article&id=467:ley-n-8238&catid=107) | Oficial | ✓ | Autoridad de aplicación ambiental |
| `SRC-015` | Ley 27.275 — acceso a la información pública nacional | [https://servicios.infoleg.gob.ar/infolegInternet/anexos/265000-269999/265949/norma.htm](https://servicios.infoleg.gob.ar/infolegInternet/anexos/265000-269999/265949/norma.htm) | Oficial | ✓ | Marco nacional; no aplica automáticamente a Provincia/Municipio |

### 3.2 Fuentes provisionales de alta prioridad

| ID | Recurso | URL | Tipo | Estado | Pendiente |
| :-- | :-- | :-- | :-- | :-- | :-- |
| `SRC-016` | Diario Huarpe — registro único de feriantes | [https://www.diariohuarpe.com/nota/capital-crea-un-registro-unico-de-artesanos-para-ordenar-espacios-publicos-202691512120](https://www.diariohuarpe.com/nota/capital-crea-un-registro-unico-de-artesanos-para-ordenar-espacios-publicos-202691512120) | Prensa | ◐ | Obtener texto oficial del Despacho 325-26 y de la Ordenanza 9194 |
| `SRC-017` | Diario Huarpe — ausencia de ley provincial de acceso a la información | [https://www.diariohuarpe.com/nota/san-juan-sin-ley-de-acceso-a-la-informacion-publica-una-deuda-con-la-transparencia-20255306026](https://www.diariohuarpe.com/nota/san-juan-sin-ley-de-acceso-a-la-informacion-publica-una-deuda-con-la-transparencia-20255306026) | Prensa | ◐ | Confirmar en Boletín Oficial / digesto provincial |
| `SRC-018` | Diario Huarpe — proyecto de adhesión a Ley 27.275 | [https://www.diariohuarpe.com/nota/volvieron-a-presentar-el-proyecto-de-acceso-a-la-informacion-publica-en-san-juan-202432822470](https://www.diariohuarpe.com/nota/volvieron-a-presentar-el-proyecto-de-acceso-a-la-informacion-publica-en-san-juan-202432822470) | Prensa | ◐ | Verificar estado legislativo actual |
| `SRC-019` | UNSJ — trabajo sobre UNIDE | http://huru.unsj.edu.ar/bitstream/handle/123456789/635/2025-Trabajo Final Goria-Ortiz-Paroldi.pdf?sequence=1\&isAllowed=y | Académico | ◐ | Usar como contexto técnico, no como fuente institucional |


______________________________________________________________________

## 4. Hallazgos ingestables en primera pasada

### 4.1 Comercios

| Hallazgo | Dato verificable | Fuente | Estado | Acción Vibe |
| :-- | :-- | :-- | :-- | :-- |
| Habilitación comercial municipal | Autorización municipal para funcionar; personal, indelegable, intransferible; vigencia de 5 años salvo excepciones | `SRC-007` | ✓ | Crear entidad conceptual `commercial_license`; no ingestar comercios individuales |
| Gestión digital provincial | Habilitaciones industriales y comerciales gestionadas en línea desde 2021 | Gobierno de San Juan | ✓ | Registrar como canal oficial de trámite |
| Habilitación de alimentos | Existe trámite provincial para comercio de alimentos | `SRC-010` | ✓ | Crear categoría sectorial `food_commerce` |
| CNE 2020-2021 | Cuadros oficiales descargables en XLS | `SRC-002` | ✓ | Descargar, hashear y almacenar snapshot |
| Padrón comercial descargable | No identificado en esta pasada | — | ◇ | Crear ticket de sondeo CKAN + pedido formal |

### 4.2 Espacios públicos

| Hallazgo | Dato verificable | Fuente | Estado | Acción Vibe |
| :-- | :-- | :-- | :-- | :-- |
| Servicio WMS UNIDE | Endpoint WMS oficial disponible | `SRC-004`, `SRC-005` | ✓ | Registrar endpoint y procedencia |
| Registro IDERA | Servicio registrado como WMS | `SRC-006` | ✓ | Usar como evidencia de procedencia |
| Límite técnico WMS | WMS entrega imágenes, no vectores descargables | `SRC-019` | ◐ | No asumir ingesta vectorial directa |
| Corredores peatonales estratégicos | Mencionados en PEC 2025 dentro del plan de veredas | `SRC-001` | ✓ | Mantener `boundary_status: provisional` hasta obtener geometrías |
| Inventario municipal de plazas | No hallado | — | ◇ | Crear pedido formal municipal |

### 4.3 Normativa

| Norma | Alcance | Fuente | Estado | Acción Vibe |
| :-- | :-- | :-- | :-- | :-- |
| Ley provincial 104-A | Industria y comercio; inscripción y certificado web | Ya verificada previamente | ✓ | Mantener ficha normativa separada |
| Ley provincial 799-C | Compraventa de cosas usadas; registro digital | Ya verificada previamente | ✓ | Mantener ficha normativa separada |
| Ordenanza municipal 9587 | Gastronomía en vía pública y publicidad | `SRC-008` | ✓ | Ingestar como norma específica |
| Despacho 325-26 | Nuevo registro único de feriantes | `SRC-016` | ◐ | Buscar texto oficial antes de ingestar como vigente |
| Ordenanza municipal 9194 | Régimen previo de ferias | `SRC-016` | ◐ | Verificar texto y relación con Despacho 325-26 |
| Ley provincial 513-L | Marco ambiental general | `SRC-011` | ✓ | Ingestar como norma base ambiental |
| Ley provincial 6571 | Evaluación de impacto ambiental | `SRC-012` | ✓ | Ingestar como norma separada |
| Ley provincial 927-L | Adhesión a Ley Nacional 25.675 | `SRC-013` | ✓ | Ingestar como norma separada |
| Ley provincial 8238 | Autoridad ambiental | `SRC-014` | ✓ | Ingestar como norma de competencia institucional |


______________________________________________________________________

## 5. Unknowns de primera clase

Estos ítems **no deben ocultarse, inferirse ni completarse**. Deben aparecer en la plataforma con estado `◇ unknown, sin fuente`.

### Comercios

- Padrón público descargable de comercios, provincial o municipal.
- Campos oficiales del padrón municipal de habilitaciones.
- Nomenclador codificado de rubros comerciales.
- Estado y granularidad departamental de la 2ª etapa del CNE 2020-2021.
- RUPA y registros sectoriales con desagregación por departamento.
- Programas vigentes de fomento a comercios de barrio.


### Microcentro

- CCCA formal o asociación de comerciantes del microcentro.
- Calles peatonales oficiales y norma que las declara.
- Estudios de vacancia o rotación de locales.
- Datos públicos de cámaras comerciales.
- Programas vigentes de compra local, fidelización o marcas colectivas.


### Espacios públicos

- Inventario oficial municipal de plazas, parques y paseos.
- Nombres exactos de capas UNIDE de espacios verdes o equipamiento urbano.
- Censo o inventario de arbolado urbano.
- Datos públicos de mobiliario urbano y luminaria.
- Programas vigentes de recuperación de espacios públicos con presupuesto.


### Movilidad

- Rampas, sendas peatonales y estado de veredas por cuadra.
- Plan de movilidad urbana vigente con ciclovías y sendas.
- Mediciones o estimaciones públicas de flujo peatonal.
- Obras vigentes con plazo que afecten el microcentro.


### Marco jurídico y datos

- Número y texto exacto de la ordenanza municipal de habilitación comercial.
- Ley provincial de protección de datos personales o delegación provincial de AAIP.
- Licencias de reutilización de datasets de datos abiertos y capas UNIDE.
- Ley provincial de adhesión a defensa del consumidor.
- Marco IGN/carta geométrica nacional para derivados cartográficos.
- Indicadores públicos de comercio minorista provincial con serie estable.

______________________________________________________________________

## 6. Plan de trabajo para Vibe

### Bloque A — Ingesta mínima verificable

**Objetivo:** dejar cargados solo recursos con fuente primaria confirmada.

- [ ] Crear esquema de `data_source` con los campos de trazabilidad definidos.
- [ ] Ingestar `SRC-001` a `SRC-015` como fuentes primarias.
- [ ] Descargar y hashear PEC 2025, CNE XLS y CNE PDF.
- [ ] Registrar endpoint WMS de UNIDE sin asumir capas.
- [ ] Crear fichas normativas separadas para cada ley y ordenanza.
- [ ] Marcar todo dato no respaldado como `unknown`.

**Definition of Done:**

- Cada recurso tiene URL, fecha, hash, tipo de fuente y estado epistémico.
- Ninguna fila carece de procedencia.
- Ningún registro se une por nombre.
- No hay PII en la capa pública.


### Bloque B — Sondeo técnico de UNIDE

**Objetivo:** determinar si existen capas reutilizables para espacios públicos.

- [ ] Ejecutar `GetCapabilities` sobre `https://unide.sanjuan.gob.ar/geoserver/wms`.
- [ ] Enumerar capas relacionadas con:
    - Espacios verdes.
    - Equipamiento urbano.
    - Zonificación.
    - Límites administrativos.
    - Movilidad o red vial.
- [ ] Determinar si existe WFS, API REST o descarga vectorial.
- [ ] Capturar metadatos: nombre de capa, organismo emisor, formato, CRS, licencia y fecha de actualización.
- [ ] No publicar geometrías derivadas hasta confirmar licencia.

**Definition of Done:**

- Existe un inventario de capas con URL de `GetCapabilities`.
- Cada capa tiene estado `verified`, `provisional` o `unknown`.
- Queda documentado si la capa es visualizable solamente o descargable.


### Bloque C — Pedidos formales de información

**Objetivo:** convertir unknowns en solicitudes trazables.

Crear un expediente de pedido para cada bloque:

1. **Municipalidad de Capital — Comercio**
    - Padrón o listado de habilitaciones comerciales activas.
    - Esquema de campos.
    - Nomenclador de rubros.
    - Formato, licencia y frecuencia de actualización.
2. **Municipalidad de Capital — Espacios públicos**
    - Inventario de plazas, parques, paseos y espacios verdes.
    - Norma o documento que lo aprueba.
    - Datos de superficie, ubicación, estado y equipamiento.
3. **Municipalidad de Capital — Movilidad y accesibilidad**
    - Rampas, sendas peatonales y estado de veredas.
    - Plan de movilidad vigente.
    - Obras que afecten el microcentro.
4. **Provincia de San Juan — Datos abiertos y UNIDE**
    - Catálogo completo de datasets.
    - Licencias de reutilización.
    - Disponibilidad de WFS/API.
    - Registros sectoriales con desagregación departamental.

**Definition of Done:**

- Cada pedido tiene destinatario, fundamento normativo, datos solicitados, formato solicitado y fecha.
- Cada respuesta se registra como snapshot con hash.
- Si no hay respuesta, el ítem permanece `unknown`.


### Bloque D — Verificación normativa

**Objetivo:** elevar a `verified` las normas actualmente en `provisional`.

- [ ] Localizar texto oficial del Despacho 325-26.
- [ ] Localizar texto oficial de la Ordenanza 9194.
- [ ] Confirmar número y año de la ordenanza municipal de habilitación comercial.
- [ ] Confirmar si San Juan adhirió a la Ley 27.275.
- [ ] Verificar licencias de datos abiertos y UNIDE.
- [ ] Verificar régimen de uso del IGN para derivados cartográficos.

**Definition of Done:**

- Ninguna norma queda etiquetada como vigente sin texto o fuente oficial.
- Cada norma tiene número, año, ámbito, autoridad y URL.

______________________________________________________________________

## 7. Modelo mínimo de fila para ingesta

```json
{
  "node": "capital",
  "domain": "commerce | public_space | mobility | normative | economy",
  "refes": "REFES-XXXX",
  "cue": "CUE-XXXX",
  "name": "string",
  "epistemic_status": "verified | provisional | unknown",
  "source_type": "official | press | academic | commercial_directory | citizen_observation",
  "source_name": "string",
  "source_url": "string",
  "data_date": "YYYY-MM-DD",
  "retrieved_at": "YYYY-MM-DD",
  "license": "string | null",
  "snapshot_hash": "sha256",
  "join_key": "string",
  "pii": false,
  "notes": "string"
}
```

Reglas:

- `refes` y `cue` son claves internas; no se generan desde nombres.
- `pii` debe ser `false` en toda capa pública.
- `unknown` es un estado válido y no un error.
- Si cambia la fuente, se crea un nuevo snapshot; no se sobrescribe el anterior.

______________________________________________________________________

## 8. Riesgos y controles

| Riesgo | Control |
| :-- | :-- |
| Confundir WMS con datos vectoriales | Verificar WFS/API antes de ingesta geométrica |
| Publicar datos sin licencia | Bloquear publicación hasta capturar licencia |
| Mezclar prensa con dato oficial | Campo obligatorio `source_type` |
| Unir comercios por nombre | Exigir `join_key` |
| Exponer PII | Validación automática anti-PII y minimización |
| Asumir vigencia normativa | Exigir fecha y texto oficial |
| Inflar el directorio con datos no verificables | Mantener `unknown` visible |
| Perder trazabilidad | Snapshot inmutable + hash por fila |


______________________________________________________________________

## 9. Prioridad de ejecución

1. **Bloque A:** ingestar fuentes primarias y snapshots.
2. **Bloque B:** inspeccionar UNIDE y determinar capas reutilizables.
3. **Bloque C:** redactar y enviar pedidos formales.
4. **Bloque D:** verificar normas provisionales.
5. **Bloque E:** diseñar UI con estados honestos `✓ / ◐ / ◇`.
6. **Bloque F:** recién entonces, activar el stage visual del issue \#215.

______________________________________________________________________

## 10. Criterio de cierre

El bloque de nutrición del Nodo Capital puede considerarse cerrado cuando:

- Todas las fuentes primarias estén snapshotadas y hasheadas.
- Ninguna fila carezca de procedencia.
- Los unknowns estén explícitos y visibles.
- Los pedidos formales estén registrados.
- Las normas provisionales tengan un plan de verificación.
- La plataforma no presente como oficial ningún dato proveniente de prensa, directorio u observación ciudadana.

**Principio final:** el valor de DELocalSoy.AR no está en tener muchos datos, sino en distinguir con precisión qué se sabe, quién lo dice, cuándo lo dijo y qué sigue sin saberse.

<span style="display:none">[^2_1][^2_2][^2_3][^2_4][^2_5][^2_6]</span>

<div align="center">⁂</div>

[^2_1]: projects.delocalsoy_ar

[^2_2]: https://www.perplexity.ai/search/a709f38a-4b28-4eda-9e16-f936a1611e7d

[^2_3]: https://www.perplexity.ai/search/507cd1e8-1e03-43bb-87de-1ce409bb1883

[^2_4]: https://www.perplexity.ai/search/5fdf6a3b-4539-483b-986d-bc78339623e3

[^2_5]: https://www.perplexity.ai/search/97e2125f-6f6c-434b-bda3-7cd1e2a87d2e

[^2_6]: https://www.perplexity.ai/search/143e8911-f1ee-4d94-826d-e729aedeec91


---

# Comenzamos

Listo: el **Bloque A está inicializado** con tres artefactos trazables, listos para que Vibe los aterrice en `main @ 77500be` mediante rama y PR.

## Archivos generados

| Archivo | Contenido | SHA-256 |
| :-- | :-- | :-- |
| `docs/nodo-capital/NUTRICION-CAPITAL-TRABAJO.md` | Documento de trabajo, reglas epistémicas, fuentes, bloques A–D, unknowns y Definition of Done. | `88df30917fe59302a519728e38038e4b34586294be7b5ae1ecb3c40da41a943f` |
| `docs/nodo-capital/PEDIDOS-FORMALES-CAPITAL.md` | Cuatro pedidos formales: padrón comercial, espacios públicos, movilidad/accesibilidad y datos abiertos/UNIDE. | `04874ce50f965ff94e43a5ec1eeef9a40aab38e6780f42c2b5173ba6cb5488e9` |
| `data/sources/capital/sources.seed.json` | Semilla estructurada de 19 fuentes, con 15 verificadas, 4 provisionales y 25 unknowns explícitos. | `643d69dd22dc3ae2741d7569a0ff906021799eee1c80cde565397ce450f948ee` |

Los archivos están disponibles como entregables adjuntos: `PEDIDOS-FORMALES-CAPITAL.md` y `NUTRICION-CAPITAL-TRABAJO.md`.[^3_1]

## Instrucción para Vibe

```text
Tarea: NUT-CAP-001 — Inicializar nutrición del Nodo Capital

Base: main @ 77500be
Issue relacionado: #215

1. Crear rama:
   agent-vibe/nut-capital-bloque-a

2. Aterrizr:
   docs/nodo-capital/NUTRICION-CAPITAL-TRABAJO.md
   docs/nodo-capital/PEDIDOS-FORMALES-CAPITAL.md
   data/sources/capital/sources.seed.json

3. Validar:
   - JSON válido.
   - 15 fuentes verified.
   - 4 fuentes provisional.
   - 25 unknowns registrados.
   - Ninguna fuente sin URL.
   - Ninguna fila con PII.
   - Ningún join por nombre.

4. No ingestar todavía:
   - Geometrías derivadas de UNIDE.
   - Comercios individuales.
   - Normas sin texto oficial.
   - Programas sin vigencia confirmada.

5. Abrir PR con título:
   docs(capital): inicializar corpus de nutrición y pedidos formales

6. En la descripción del PR, incluir:
   - Hashes de los tres archivos.
   - Estado epistémico inicial.
   - Checklist del Bloque A.
   - Bloqueo explícito: licencias de UNIDE y datasets abiertos aún unknown.
```


## Siguiente paso inmediato

El siguiente movimiento es el **Bloque B**: inspección del `GetCapabilities` de UNIDE para determinar si existen capas de espacios verdes, equipamiento urbano, zonificación o límites administrativas, y si hay WFS/API reutilizable. Hasta que eso se verifique, UNIDE queda registrado como **fuente cartográfica oficial**, pero no como fuente de ingesta vectorial.[^3_2][^3_3]

<div align="center">⁂</div>

[^3_1]: https://www.bcn.cl/leychile/navegar?idNorma=1218339

[^3_2]: https://web.sanjuan.gob.ar/unide/geoservicios/

[^3_3]: https://controlserviciosidera.iado-conicet.gob.ar/resource/660?lang=de


---

# Bloque B — Sondeo técnico de UNIDE

**Resultado inicial:** el endpoint WMS de UNIDE está confirmado y monitoreado por IDERA, pero **no pudimos enumerar capas ni confirmar WFS** desde esta sesión: las solicitudes directas a `GetCapabilities` no devolvieron contenido. Por lo tanto, el inventario de capas queda **◇ unknown, sin fuente** por ahora.[^4_1][^4_2][^4_3]

## Estado verificado

| Ítem | Resultado | Fuente | Estado |
| :-- | :-- | :-- | :-- |
| Endpoint WMS | `https://unide.sanjuan.gob.ar/geoserver/wms` | UNIDE — [Geoservicios](https://web.sanjuan.gob.ar/unide/geoservicios/) | ✓ |
| Servicio registrado en IDERA | WMS “Infraestructura de Datos Espaciales de San Juan”, con disponibilidad reportada de 94,87% | IDERA — [Monitor de Geoservicios](https://controlserviciosidera.iado-conicet.gob.ar/resources?lang=es_BO&resource_type=OGC:WMS) | ✓ |
| Naturaleza institucional | UNIDE garantiza generación, acceso y distribución de información georreferenciada provincial | UNIDE — [Inicio](https://web.sanjuan.gob.ar/unide/) | ✓ |
| Enumeración de capas | No obtenida en esta pasada | — | ◇ |
| Existencia de WFS | No confirmada | — | ◇ |
| Capas de espacios verdes / equipamiento | No confirmadas | — | ◇ |
| Licencia de reutilización | No confirmada | — | ◇ |

La evidencia disponible confirma que UNIDE opera como infraestructura provincial de datos espaciales y que su servicio WMS está publicado y monitoreado; no confirma todavía qué capas específicas pueden reutilizarse ni bajo qué licencia.[^4_3][^4_4]

## Instrucción ejecutable para Vibe

Crear el archivo:

```text
docs/nodo-capital/BLOQUE-B-UNIDE-SONDEO.md
```

Con este contenido:

````markdown
# Bloque B — Sondeo técnico UNIDE

**Nodo:** Capital  
**Fecha:** 2026-10-15  
**Base:** main @ 77500be  
**Endpoint WMS:** https://unide.sanjuan.gob.ar/geoserver/wms  
**Estado inicial:** endpoint verificado; capas unknown.

## Objetivo

Determinar si UNIDE expone capas reutilizables de:

- Espacios verdes.
- Equipamiento urbano.
- Zonificación.
- Límites administrativos.
- Movilidad o red vial.

## Comandos de verificación

### 1. WMS GetCapabilities

```bash
curl -L -o unide_wms_capabilities.xml \
  "[https://unide.sanjuan.gob.ar/geoserver/wms?service=WMS&request=GetCapabilities&version=1.3.0](https://unide.sanjuan.gob.ar/geoserver/wms?service=WMS&request=GetCapabilities&version=1.3.0)"
````


### 2. WFS GetCapabilities

```bash
curl -L -o unide_wfs_capabilities.xml \
  "[https://unide.sanjuan.gob.ar/geoserver/wfs?service=WFS&request=GetCapabilities&version=2.0.0](https://unide.sanjuan.gob.ar/geoserver/wfs?service=WFS&request=GetCapabilities&version=2.0.0)"
```


### 3. Verificación de contenido

```bash
grep -i -E "verde|arbol|plaza|parque|equipamiento|zonificacion|limite|movilidad|ciclovia" \
  unide_wms_capabilities.xml
```

```bash
grep -i -E "FeatureType|Name|Title" unide_wfs_capabilities.xml
```


## Reglas de registro

- Guardar cada respuesta como snapshot inmutable.
- Calcular SHA-256 de cada archivo.
- Registrar fecha y hora de consulta.
- No inferir capas desde el nombre del dominio.
- No publicar derivados sin licencia confirmada.
- Si WFS no existe, registrar `wfs: unknown`.
- Si una capa existe pero no tiene licencia, registrar `license: unknown`.


## Salida esperada

`data/sources/capital/unide-layers.json`

```json
{
  "endpoint_wms": "[https://unide.sanjuan.gob.ar/geoserver/wms](https://unide.sanjuan.gob.ar/geoserver/wms)",
  "endpoint_wfs": "[https://unide.sanjuan.gob.ar/geoserver/wfs](https://unide.sanjuan.gob.ar/geoserver/wfs)",
  "wms_capabilities_hash": "sha256",
  "wfs_capabilities_hash": "sha256",
  "layers": [
    {
      "layer_name": "string",
      "title": "string",
      "domain": "public_space | mobility | territory | unknown",
      "epistemic_status": "verified | provisional | unknown",
      "crs": "string",
      "format": "WMS | WFS | unknown",
      "license": "string | null",
      "notes": "string"
    }
  ]
}
```


## Definition of Done

- [ ] `GetCapabilities` WMS descargado y hasheado.
- [ ] `GetCapabilities` WFS intentado y resultado registrado.
- [ ] Inventario de capas generado o `unknown` documentado.
- [ ] Licencias verificadas o marcadas `unknown`.
- [ ] Ninguna geometría publicada sin autorización/licencia.
- [ ] Resultado vinculado a `sources.seed.json`.

````

## Actualización del corpus

En `sources.seed.json`, agregar estos unknowns operativos:

```json
{
  "unide_wms_capabilities_retrieved": false,
  "unide_wfs_confirmed": false,
  "unide_layers_enumerated": false,
  "unide_license_confirmed": false
}
````

Y mantener estos estados:

```json
{
  "unide_endpoint_wms": "verified",
  "unide_wms_layer_inventory": "unknown",
  "unide_wfs": "unknown",
  "unide_license": "unknown"
}
```


## Criterio de avance

El Bloque B se cierra cuando Vibe obtenga y archive:

1. El XML de `GetCapabilities` WMS.
2. El resultado —positivo o negativo— del intento WFS.
3. Un inventario de capas con nombre, título, dominio, CRS, formato y licencia.
4. Los hashes de todos los snapshots.

Si WMS responde pero WFS no existe, la conclusión arquitectónica será: **UNIDE sirve para visualización y referencia cartográfica, no para ingesta vectorial directa**; en ese caso, los datos de espacios públicos requerirán pedido formal o fuente municipal descargable. La documentación de GeoServer confirma que WMS y WFS son servicios distintos: WMS publica mapas, mientras WFS expone objetos vectoriales.[^4_5]

<span style="display:none">[^4_10][^4_11][^4_12][^4_13][^4_14][^4_15][^4_6][^4_7][^4_8][^4_9]</span>

<div align="center">⁂</div>

[^4_1]: https://web.sanjuan.gob.ar/unide/geoservicios/

[^4_2]: https://controlserviciosidera.iado-conicet.gob.ar/resource/660?lang=de

[^4_3]: https://controlserviciosidera.iado-conicet.gob.ar/resources?lang=es_BO\&resource_type=OGC:WMS

[^4_4]: https://web.sanjuan.gob.ar/unide/

[^4_5]: https://docs.geoserver.org/main/en/user/configuration/virtual-services/

[^4_6]: https://docs.geoserver.org/main/en/user/webadmin/

[^4_7]: https://docs.geoserver.org/main/en/user/data/webadmin/layers/

[^4_8]: https://docs.geoserver.org/latest/en/user/webadmin/

[^4_9]: https://www.electivatgt.faud.unsj.edu.ar/index.php/material/enlaces-link/

[^4_10]: https://controlserviciosidera.iado-conicet.gob.ar/csv

[^4_11]: https://faud.unsj.edu.ar/descargas/Programa IDERA.pdf

[^4_12]: https://www.idera.gob.ar/images/stories/downloads/jornadas/XIII_SanJuan/Libro_Ponencias_XIII_IDERA_SanJuan_OK.pdf

[^4_13]: https://web.sanjuan.gob.ar/unide/2025/01/

[^4_14]: http://huru.unsj.edu.ar/bitstream/handle/123456789/635/2025-Trabajo Final Goria-Ortiz-Paroldi.pdf?sequence=1\&isAllowed=y

[^4_15]: https://web.sanjuan.gob.ar/unide/inicio/


---

# Bloque C — Pedidos formales inicializados

Quedaron redactadas **cuatro solicitudes formales listas para envío**, más un ledger de seguimiento estructurado. El principio es convertir los `unknown` en expedientes trazables: cada respuesta se archiva como snapshot con hash; mientras no haya respuesta, el dato permanece `unknown`.

## Solicitudes creadas

| ID | Destinatario | Tema | Objetivo |
| :-- | :-- | :-- | :-- |
| `SOL-CAP-001` | Municipalidad de Capital — Habilitaciones Comerciales | Padrón comercial | Obtener padrón anonimizado, esquema, nomenclador de rubros, agregados y licencia |
| `SOL-CAP-002` | Municipalidad de Capital — Espacios Verdes / Planeamiento | Espacios públicos | Obtener inventario oficial de plazas, parques, paseos, atributos y norma de respaldo |
| `SOL-CAP-003` | Municipalidad de Capital — Obras / Movilidad / Planeamiento | Accesibilidad y movilidad | Obtener rampas, veredas, movilidad, obras y flujo peatonal |
| `SOL-PROV-004` | Gobierno de San Juan — UNIDE / Datos Abiertos | Datos abiertos y geoservicios | Obtener catálogo, licencias, WFS/API, registros sectoriales y estado del CNE 2ª etapa |

## Artefactos generados

| Archivo | Contenido | SHA-256 |
| :-- | :-- | :-- |
| `docs/nodo-capital/SOLICITUDES-FORMALES-CAPITAL.md` | Texto completo de las cuatro solicitudes, destinatarios, asuntos y registro de seguimiento. | `ae28f44ed1555594ca5a514c9cf8cfac11d10c5dcf6d00b27a2e3257c7897fef` |
| `data/sources/capital/requests.tracking.json` | Ledger estructurado con estado `pending`, formatos solicitados y outputs esperados por pedido. | `1cf8f16fec619eb698b92c62843897df9677d55f312a764f64ab0ad9464b5318` |

El documento de solicitudes está disponible como entregable adjunto.

## Instrucción para Vibe

```text
Tarea: NUT-CAP-003 — Inicializar pedidos formales del Nodo Capital

Base: main @ 77500be
Issue relacionado: #215

1. Crear rama:
   agent-vibe/nut-capital-bloque-c

2. Aterrizr:
   docs/nodo-capital/SOLICITUDES-FORMALES-CAPITAL.md
   data/sources/capital/requests.tracking.json

3. Validar:
   - JSON válido.
   - Cuatro solicitudes registradas.
   - Todas con estado pending.
   - Ninguna solicitud solicita PII.
   - Todas solicitan licencia y formato.
   - Todas prevén respuesta como snapshot hasheado.

4. No enviar todavía desde el agente.
   El envío requiere decisión humana sobre canal y destinatario exacto.

5. Abrir PR:
   docs(capital): agregar solicitudes formales y ledger de seguimiento

6. En la descripción del PR:
   - Incluir hashes de ambos archivos.
   - Vincular con Bloque A y Bloque B.
   - Dejar explícito que las respuestas no existen aún.
```


## Reglas de seguimiento

- Cada respuesta debe guardarse en `data/sources/capital/responses/`.
- Nombre sugerido: `SOL-CAP-001_response_YYYY-MM-DD.ext`.
- Calcular SHA-256 y actualizar `response_hash`.
- Si la respuesta incluye un dataset, crear snapshot separado y no modificar el original.
- Si la respuesta es parcial, registrar qué quedó pendiente.
- Si no hay respuesta, no se cierra el pedido: se mantiene `pending` o pasa a `no_response`, nunca a `unknown` por silencio.


## Próximo bloque

El **Bloque D** corresponde a verificación normativa: localizar textos oficiales del Despacho 325-26, la Ordenanza 9194, la ordenanza de habilitación comercial, la situación de adhesión a la Ley 27.275, licencias de reutilización y el régimen IGN para derivados cartográficos.

---

# Bloque D — Verificación normativa: avance

El hallazgo principal es que el **Despacho N° 325-26** creó el **Registro Único Municipal de Artesanos y Emprendedores (RUMAE)**, reemplazando el régimen de la **Ordenanza N° 9194**. La coincidencia es fuerte entre cuatro medios, pero sigue siendo **◐ provisional** porque aún no tenemos el texto oficial.[^6_1][^6_2][^6_3]

## Matriz normativa actualizada

| ID | Norma / régimen | Identificador | Estado | Pendiente |
| :-- | :-- | :-- | :-- | :-- |
| `NORM-CAP-001` | RUMAE — ferias y feriantes | Despacho N° 325-26 | ◐ provisional | Texto oficial y fecha de promulgación |
| `NORM-CAP-002` | Régimen previo de ferias | Ordenanza N° 9194 | ◐ provisional, reemplazado según prensa | Texto oficial y confirmación de reemplazo |
| `NORM-CAP-003` | Habilitación comercial municipal | Número pendiente | ◐ provisional | Número, año y texto oficial |
| `NORM-CAP-004` | Gastronomía y publicidad en vía pública | Ordenanza N° 9587 | ✓ verified | Verificar modificatorias y vigencia |
| `NORM-CAP-005` | Acceso a la información pública provincial | Sin ley provincial identificada | ◐ provisional | Boletín Oficial / digesto |
| `NORM-CAP-006` | Protección de datos personales | Ley 25.326 + Decreto 1558/2001 | ✓ como marco nacional | Confirmar norma provincial o delegación AAIP |
| `NORM-CAP-007` | Licencias de datos abiertos y UNIDE | Sin identificador | ◇ unknown | Texto de licencia por recurso |
| `NORM-CAP-008` | Uso cartográfico IGN | Sin identificador | ◇ unknown | Términos de uso y atribución |

## Hallazgo reforzado: RUMAE

Las fuentes coinciden en que el RUMAE:

- Regula ferias municipales y eventos privados o comunitarios con puestos en vía pública.
- Exige inscripción y credencial vigente.
- Prohíbe la reventa de productos industrializados o adquiridos a terceros en ferias municipales.
- Define siete categorías: artesanos, manualistas, artistas callejeros o urbanos, emprendedores, feriantes gastronómicos, feriantes de entretenimiento y actividades emergentes.
- Establece un plazo de adecuación de 60 días desde la promulgación.
- Menciona el Paseo Artesanal, Paseo de las Palmeras, Plaza Laprida y Plaza Desamparados como espacios de ferias.

**Estado:** `◐ provisional`. No se ingesta como norma vigente hasta obtener el texto oficial del Despacho N° 325-26.[^6_2][^6_3][^6_1]

## Acceso a la información

La evidencia más reciente disponible, de agosto de 2026, indica que San Juan sigue sin adhesión a la Ley Nacional 27.275 y que legisladores oficialistas impulsaron nuevamente una ley provincial de acceso a la información pública. Esto refuerza la estrategia del Bloque C: pedidos administrativos directos, con fundamento en el art. 27 de la Constitución Provincial.[^6_4]

## Artefacto generado

| Archivo | Contenido | SHA-256 |
| :-- | :-- | :-- |
| `docs/nodo-capital/BLOQUE-D-VERIFICACION-NORMATIVA.md` | Matriz normativa, hallazgo RUMAE, tareas de verificación, reglas de ingesta y Definition of Done. | `f20608395f2ba0f843706c58aceec5f7f0078104e7bb2b3c7089658768d29fb3` |

El documento está disponible como entregable adjunto.

## Instrucción para Vibe

```text
Tarea: NUT-CAP-004 — Verificación normativa del Nodo Capital

Base: main @ 77500be
Issue relacionado: #215

1. Crear rama:
   agent-vibe/nut-capital-bloque-d

2. Aterrizr:
   docs/nodo-capital/BLOQUE-D-VERIFICACION-NORMATIVA.md

3. Actualizar:
   data/sources/capital/sources.seed.json

4. Cambios de estado:
   - SRC-016: mantener provisional.
   - Agregar NORM-CAP-001: Despacho 325-26, provisional.
   - Agregar NORM-CAP-002: Ordenanza 9194, provisional.
   - Agregar NORM-CAP-003: habilitación comercial, provisional.
   - Mantener NORM-CAP-004: Ordenanza 9587, verified.
   - Mantener NORM-CAP-005: acceso a información, provisional.

5. Validar:
   - Ninguna norma sin texto oficial marcada verified.
   - Ninguna norma fusionada con otra.
   - Toda fuente con URL.
   - Ningún dato con PII.

6. Abrir PR:
   docs(capital): matriz de verificación normativa y hallazgo RUMAE
```


## Criterio de cierre del Bloque D

El bloque queda cerrado cuando:

- El texto oficial del Despacho 325-26 esté archivado y hasheado.
- La relación entre Ordenanza 9194 y Despacho 325-26 esté confirmada por fuente oficial.
- La ordenanza de habilitación comercial tenga número, año y texto.
- Las licencias de datos abiertos y UNIDE estén verificadas o queden explícitamente `unknown`.
- El marco IGN esté revisado o quede explícitamente `unknown`.

<span style="display:none">[^6_10][^6_11][^6_12][^6_13][^6_14][^6_15][^6_5][^6_6][^6_7][^6_8][^6_9]</span>

<div align="center">⁂</div>

[^6_1]: https://diariocolon.com.ar/?p=27515

[^6_2]: https://diariolaprovinciasj.com/politica/capital-lanzo-su-registro-municipal-de-artesanos-378399/

[^6_3]: https://www.telesoldiario.com/provinciales/capital-crea-el-registro-unico-municipal-de-artesanos-y-emprendedores

[^6_4]: https://www.diariohuarpe.com/nota/diputados-oficialistas-piden-por-una-ley-de-acceso-a-la-informacion-publica-20268186028

[^6_5]: https://diputadossanjuan.gob.ar/cuerpo-legislativo/orden-del-diaa/144-orden-del-dia-periodo-2022/10127-primera-sesion-ordinaria-23

[^6_6]: https://www.diariohuarpe.com/nota/como-preparar-la-documentacion-digital-para-solicitar-una-habilitacion-comercial-en-san-juan-202692715520

[^6_7]: https://wwwold.municipiosanjuan.gob.ar/ordenanzas/ordenanzas-2013-1/10549-ord-11050/file

[^6_8]: https://wwwold.municipiosanjuan.gob.ar/ordenanzas/ordenanzas-2020/12994-ord-13228/file

[^6_9]: https://restaurantargentina.com/blog/habilitacion-comercial-san-juan-2026/

[^6_10]: https://www.lexjuris.com/ordenanzas/San Juan/2021-22/OM-09-2021-2022.pdf

[^6_11]: https://servicios.infoleg.gob.ar/infolegInternet/anexos/265000-269999/265949/norma.htm

[^6_12]: https://www.diariohuarpe.com/nota/capital-crea-un-registro-unico-de-artesanos-para-ordenar-espacios-publicos-202691512120

[^6_13]: https://wwwold.municipiosanjuan.gob.ar/news-cyt/item/1740-habilitaciones

[^6_14]: https://wwwold.municipiosanjuan.gob.ar/ordenanzas/ordenanzas-2009/9068-ord-9587/file

[^6_15]: https://tramite.sanjuan.gob.ar/tramite/tag/habilitacion


---

# Bloque E — UI de estados epistémicos honestos

El Bloque E define cómo mostrar **✓ verificado**, **◐ provisional** y **◇ unknown** sin que la interfaz simule certeza. La regla central: un dato sin fuente no se oculta ni se rellena; se muestra como desconocido, con su pedido formal asociado cuando exista.

## Componentes mínimos

| Componente | Función | Regla |
| :-- | :-- | :-- |
| `EpistemicBadge` | Muestra ✓ / ◐ / ◇ junto a la entidad | Siempre visible; nunca solo por color |
| `SourceTrace` | Expone fuente, URL, fechas, licencia y hash | Obligatorio para datos no `unknown` |
| `UnknownField` | Muestra atributos sin dato | Texto: “Sin dato verificado” |
| `ProvisionalNotice` | Advierte fuente no oficial | Obligatorio para prensa, academia o directorios |
| `DataGapPanel` | Agrupa unknowns y pedidos formales | Muestra estado del pedido, no inventa dato |

## Contrato de datos

```ts
export type EpistemicStatus = 'verified' | 'provisional' | 'unknown';

export type SourceType =
  | 'official'
  | 'press'
  | 'academic'
  | 'commercial_directory'
  | 'citizen_observation';

export interface TerritorialRecord {
  id: string;
  node: 'capital';
  domain: 'commerce' | 'public_space' | 'mobility' | 'normative' | 'economy';
  refes?: string;
  cue?: string;
  name: string;
  epistemicStatus: EpistemicStatus;
  sourceType?: SourceType;
  sourceName?: string;
  sourceUrl?: string;
  dataDate?: string;
  retrievedAt?: string;
  license?: string | null;
  snapshotHash?: string;
  joinKey?: string;
  pii: false;
  notes?: string;
}
```

Reglas duras:

- `epistemicStatus` es obligatorio.
- `sourceUrl` es obligatorio si el estado no es `unknown`.
- `snapshotHash` es obligatorio para recursos descargados.
- `pii` permanece en `false` en toda capa pública.
- `joinKey` es obligatorio para relaciones entre entidades.


## Ejemplos de UI

### Espacio público provisional

```text
Plaza 25 de Mayo
◐ Información provisional
Fuente: directorio geográfico secundario
Fecha del dato: no declarada
Licencia: sin confirmar
```


### Norma provisional

```text
Despacho N° 325-26 — RUMAE
◐ Información provisional
Fuente: prensa local
Texto oficial: pendiente de localización
```


### Unknown con pedido formal

```text
Inventario oficial de plazas
◇ Sin fuente verificable
Pedido formal: SOL-CAP-002
Estado: pendiente
```


### Fuente oficial con límite declarado

```text
UNIDE — WMS
✓ Verificado por fuente oficial
Endpoint: https://unide.sanjuan.gob.ar/geoserver/wms
Capas: sin confirmar
Licencia: sin confirmar
```


## Reglas por dominio

- **Comercios:** no mostrar un comercio como verificado si solo proviene de directorio; no inferir rubro sin nomenclador; no exponer contactos personales.
- **Espacios públicos:** no mostrar superficie, arbolado, mobiliario ni luminaria sin fuente; las plazas de fuentes secundarias quedan `provisional`.
- **Movilidad:** los corredores del repo siguen `provisional`; no calcular flujo peatonal sin metodología publicada.
- **Normativa:** cada norma se muestra separada; el Despacho 325-26, la Ordenanza 9194, la Ordenanza 9587, la Ley 104-A y la Ley 799-C no se fusionan.


## Artefacto generado

| Archivo | Contenido | SHA-256 |
| :-- | :-- | :-- |
| `docs/nodo-capital/BLOQUE-E-UI-ESTADOS-EPISTEMICOS.md` | Especificación completa de componentes, contrato TypeScript, reglas por dominio, accesibilidad y Definition of Done. | `84ee237a3e360377b95acf52aceee172ac03043513a8af56dc8ec148e4ff1b7f` |

El documento está disponible como entregable adjunto.

## Instrucción para Vibe

```text
Tarea: NUT-CAP-005 — Implementar UI de estados epistémicos

Base: main @ 77500be
Issue relacionado: #215

1. Crear rama:
   agent-vibe/nut-capital-bloque-e

2. Aterrizr:
   docs/nodo-capital/BLOQUE-E-UI-ESTADOS-EPISTEMICOS.md

3. Implementar:
   - EpistemicBadge
   - SourceTrace
   - UnknownField
   - ProvisionalNotice
   - DataGapPanel
   - TerritorialRecord

4. Validar:
   - Ninguna entidad sin estado epistémico.
   - Ningún campo faltante mostrado como dato.
   - Ninguna fuente no oficial presentada como oficial.
   - Ninguna geometría publicada sin licencia.
   - Accesibilidad AA.
   - aria-label en badges.

5. Abrir PR:
   feat(capital): UI de estados epistémicos honestos
```


## Criterio de cierre

El Bloque E queda cerrado cuando ninguna pantalla del Nodo Capital pueda mostrar un dato sin estado epistémico, una ausencia como si fuera dato, o una fuente secundaria como si fuera oficial.

---

# Bloque F — Activación del stage Nodo Capital

El stage puede activarse **sin datos simulados**, con la doble lente del issue \#215: **“el espacio que cuida”** y **“economía de proximidad”**. Lo verificable se muestra como verificado; lo provisional se declara; lo desconocido queda visible y vinculado a su pedido formal.

## Estructura del stage

```text
Stage Nodo Capital
├── Lente A — El espacio que cuida
│   ├── Mapa de espacios públicos
│   ├── Panel de inventario y unknowns
│   ├── Capa de accesibilidad
│   └── Panel normativo ambiental
├── Lente B — Economía de proximidad
│   ├── Mapa de centralidades comerciales
│   ├── Panel de ferias y mercados
│   ├── Panel de economía local
│   └── Panel de programas y vacíos
└── Conector — Corredores y proximidad
    ├── Corredores provisionales
    ├── Accesibilidad peatonal
    └── Cruce espacio-comercio
```


## Qué se activa

| Módulo | Estado | Regla |
| :-- | :-- | :-- |
| Microcentro 7 × 6 cuadras | ✓ | Delimitación según PEC 2025 |
| Corredores peatonales estratégicos | ✓ como marco / ◐ geometría | Sin geometría oficial, permanecen provisionales |
| UNIDE WMS | ✓ | Endpoint oficial; capas aún sin confirmar |
| Mercado de Abasto | ✓ | Horario oficial 06:00–13:00, lunes a sábado |
| RUMAE / Despacho 325-26 | ◐ | Mostrar como provisional hasta texto oficial |
| Ferias mencionadas | ◐ | No presentar como autorizadas sin norma |
| Plazas de fuentes secundarias | ◐ | Con aviso de fuente no oficial |
| Padrón comercial | ◇ | Bloqueado hasta fuente y regla anti-PII |
| Arbolado, mobiliario, rampas | ◇ | Sin dato verificado |
| Capas UNIDE de espacios verdes | ◇ | Pendiente `GetCapabilities` y licencia |

## Estados de activación

| Estado | Significado | Acción UI |
| :-- | :-- | :-- |
| `active_verified` | Dato oficial con fuente | Mostrar con ✓ |
| `active_provisional` | Dato secundario o hipótesis | Mostrar con ◐ y aviso |
| `blocked_license` | Falta licencia | No publicar; explicar motivo |
| `blocked_pii` | Riesgo de datos personales | No publicar; explicar motivo |
| `unknown` | Sin fuente | Mostrar vacío verificado |
| `pending_request` | Pedido formal enviado | Mostrar ID y estado |

## Pantallas mínimas

1. **Mapa Nodo Capital:** base territorial, microcentro, espacios públicos, corredores provisionales y filtros por lente.
2. **Ficha de espacio público:** nombre, estado, fuente, atributos disponibles y unknowns.
3. **Ficha de economía de proximidad:** Mercado de Abasto, RUMAE, ferias, programas y vacíos.
4. **Panel de unknowns:** vacíos, pedido formal asociado y estado de respuesta.
5. **Panel normativo:** normas separadas, estado de verificación y texto oficial o pendencia.

## Artefacto generado

| Archivo | Contenido | SHA-256 |
| :-- | :-- | :-- |
| `docs/nodo-capital/BLOQUE-F-ACTIVACION-STAGE-CAPITAL.md` | Especificación de activación, doble lente, estados, pantallas y Definition of Done. | `e63a0b9351e111c36890d1e23de12f9b82032dda67dc4ed646bd3d0979b6c149` |

El documento está disponible como entregable adjunto.

## Instrucción para Vibe

```text
Tarea: NUT-CAP-006 — Activar stage Nodo Capital

Base: main @ 77500be
Issue relacionado: #215

1. Crear rama:
   agent-vibe/nut-capital-bloque-f

2. Aterrizr:
   docs/nodo-capital/BLOQUE-F-ACTIVACION-STAGE-CAPITAL.md

3. Implementar:
   - Stage con doble lente.
   - Mapa base del Nodo Capital.
   - Microcentro según PEC 2025.
   - Corredores provisionales.
   - Ficha de Mercado de Abasto.
   - Ficha provisional de RUMAE.
   - Panel de unknowns vinculado a SOL-CAP-001 a SOL-PROV-004.
   - Panel normativo con normas separadas.

4. Bloquear:
   - Comercios individuales.
   - Geometrías derivadas de UNIDE.
   - Ferias como autorizadas.
   - Indicadores de vitalidad sin metodología.

5. Abrir PR:
   feat(capital): activar stage de doble lente con estados epistémicos honestos
```


## Criterio de cierre

El Bloque F queda cerrado cuando el stage sea navegable, honesto y trazable: cada elemento visible declara si es oficial, provisional, desconocido, bloqueado por licencia o bloqueado por PII.

---

# Análisis recursivo y nutrición continua del Nodo Capital

La lectura recursiva muestra un nodo con **marco territorial sólido**, pero con **masa crítica de datos primarios aún incompleta**. El activo más prometedor es el RUMAE; el bloqueo más urgente son las licencias de reutilización; el riesgo principal es convertir hipótesis de diseño en hechos territoriales.

## Diagnóstico recursivo

| Capa | Estado | Lectura |
| :-- | :-- | :-- |
| Marco territorial | Sólido | PEC 2025 da base para microcentro y corredores |
| Geoespacial | Sólida, con límite | UNIDE WMS verificado; capas y licencias sin confirmar |
| Economía | Parcial | CNE aporta contexto, no padrón operativo |
| Comercios | Bloqueado | Falta padrón, nomenclador y regla anti-PII |
| Ferias | Promisorio | RUMAE es el primer puente espacio-comercio |
| Espacios públicos | Débil | Sin inventario municipal confirmado |
| Movilidad | Débil | Sin inventario de accesibilidad ni plan confirmado |
| Licencias | Bloqueante | Sin licencias no hay derivados publicables |

## Ciclo de nutrición continua

```text
Detectar → Clasificar fuente → Verificar → Snapshot + hash
→ Ingesta → Publicar con estado → Revisar vigencia → Actualizar o deprecar
```

Ningún dato ingresa sin fuente, fecha, estado epistémico, `join_key`, licencia conocida o marcada como desconocida, y snapshot hasheado cuando sea descargable.

## Seis frentes priorizados

1. **Licencias y derechos de reutilización** — destrabar publicación de derivados de datos abiertos, UNIDE e IGN.
2. **RUMAE y ferias** — convertir el hallazgo provisional en una capa operativa verificable.
3. **Inventario de espacios públicos** — pasar de plazas en fuentes secundarias a inventario oficial.
4. **Padrón comercial y nomenclador** — habilitar directorio sin PII y con códigos de rubro.
5. **Accesibilidad y movilidad** — sustentar la lente “el espacio que cuida” con evidencia.
6. **Observación ciudadana ética** — incorporar conocimiento local sin confundirlo con dato oficial.

## Esquemas mínimos

- `public_space`: plaza, parque, paseo, plaza seca o equipamiento; con `geometry_status` y `license_status`.
- `fair`: ferias con tipo, ubicación, horario, registro RUMAE y estado epistémico.
- `commerce`: actividad codificada, zona, estado y `pii: false`.
- `accessibility_feature`: rampa, senda, vereda o paso peatonal; con condición y estado de geometría.
- `citizen_observation`: observación separada del hecho verificado, con moderación y anti-PII.


## Cadencia

| Frecuencia | Actividad |
| :-- | :-- |
| Semanal | Revisar respuestas a pedidos y novedades UNIDE |
| Quincenal | Revisar Boletín Oficial, digesto y normas nuevas |
| Mensual | Revisar datasets abiertos, INDEC e indicadores |
| Mensual | Auditar snapshots, hashes y vigencias |
| Trimestral | Revisar licencias, normativa y programas |
| Por evento | Ferias, obras o cambios normativos |

## Artefacto generado

| Archivo | Contenido | SHA-256 |
| :-- | :-- | :-- |
| `docs/nodo-capital/PLAN-NUTRICION-CONTINUA-CAPITAL.md` | Análisis recursivo, ciclo de nutrición, seis frentes, esquemas mínimos, cadencia, tablero y riesgos. | `6afdf7c429a52759c2684978dc04fcabcac6eb221f2cba921f6f26783d7b4be4` |

El documento está disponible como entregable adjunto.

## Instrucción para Vibe

```text
Tarea: NUT-CAP-007 — Plan de nutrición continua del Nodo Capital

Base: main @ 77500be
Issue relacionado: #215

1. Crear rama:
   agent-vibe/nut-capital-plan-continuo

2. Aterrizr:
   docs/nodo-capital/PLAN-NUTRICION-CONTINUA-CAPITAL.md

3. Crear tablero inicial:
   - 15 fuentes verificadas.
   - 4 fuentes provisionales.
   - 25 unknowns activos.
   - 4 pedidos pendientes.
   - 0 licencias confirmadas.
   - 0 comercios ingestables.

4. Implementar esquemas:
   - public_space
   - fair
   - commerce
   - accessibility_feature
   - citizen_observation

5. Abrir PR:
   docs(capital): plan de nutrición continua y esquemas mínimos
```


## Criterio de avance

El Nodo Capital estará realmente nutrido cuando pueda responder, para cada elemento del stage, estas cinco preguntas:

1. ¿Qué es?
2. ¿Quién lo dice?
3. ¿Cuándo lo dijo?
4. ¿Bajo qué licencia puede usarse?
5. ¿Qué sigue sin saberse?

Mientras alguna respuesta falte, el sistema debe mostrar el vacío con honestidad, no llenarlo.

---

# Consolidación — Paquete ejecutable para Vibe

Continuamos con la **consolidación del paquete**: índice maestro, backlog `NUT-CAP-008` a `NUT-CAP-013` y un workflow de CI que valida JSON, estados epistémicos, URLs y anti-PII antes de fusionar cualquier PR de nutrición.[^10_1]

## Paquete documental consolidado

| Orden | Archivo | Bloque | Propósito |
| :-- | :-- | :-- | :-- |
| 1 | `docs/nodo-capital/NUTRICION-CAPITAL-TRABAJO.md` | A | Reglas, fuentes, unknowns y DoD |
| 2 | `docs/nodo-capital/PEDIDOS-FORMALES-CAPITAL.md` | C | Pedidos base |
| 3 | `docs/nodo-capital/SOLICITUDES-FORMALES-CAPITAL.md` | C | Solicitudes completas |
| 4 | `docs/nodo-capital/BLOQUE-B-UNIDE-SONDEO.md` | B | Sondeo UNIDE |
| 5 | `docs/nodo-capital/BLOQUE-D-VERIFICACION-NORMATIVA.md` | D | Matriz normativa y RUMAE |
| 6 | `docs/nodo-capital/BLOQUE-E-UI-ESTADOS-EPISTEMICOS.md` | E | UI honesta ✓ / ◐ / ◇ |
| 7 | `docs/nodo-capital/BLOQUE-F-ACTIVACION-STAGE-CAPITAL.md` | F | Activación del stage |
| 8 | `docs/nodo-capital/PLAN-NUTRICION-CONTINUA-CAPITAL.md` | Continuo | Ciclo, frentes y esquemas |
| 9 | `docs/nodo-capital/INDICE-MAESTRO-NUTRICION-CAPITAL.md` | Transversal | Índice, backlog y contrato de calidad |

## Archivos de datos y CI

| Archivo | Propósito | SHA-256 |
| :-- | :-- | :-- |
| `data/sources/capital/sources.seed.json` | 19 fuentes y 25 unknowns | `643d69dd22dc3ae2741d7569a0ff906021799eee1c80cde565397ce450f948ee` |
| `data/sources/capital/requests.tracking.json` | Ledger de 4 pedidos formales | `1cf8f16fec619eb698b92c62843897df9677d55f312a764f64ab0ad9464b5318` |
| `.github/workflows/validate-nutricion-capital.yml` | Validación automática del corpus | `f88ba43d61c817f23d8679fba91aac1432b546dc052c21f83da44dbb7c2244d4` |

El índice maestro y el workflow están disponibles como entregables adjuntos.[^10_1]

## Backlog consolidado

| ID | Tarea | Criterio de cierre |
| :-- | :-- | :-- |
| `NUT-CAP-008` | Consolidar paquete documental y datos | PR con índice, JSON válidos y hashes |
| `NUT-CAP-009` | Activar validaciones CI | CI falla ante JSON inválido, URL inválida, estado inválido o PII |
| `NUT-CAP-010` | Sondear UNIDE | `GetCapabilities` WMS/WFS archivados; capas y licencias declaradas |
| `NUT-CAP-011` | Enviar y seguir pedidos | Cuatro solicitudes enviadas, con acuse y ledger actualizado |
| `NUT-CAP-012` | Verificar normas | Textos oficiales del Despacho 325-26, Ordenanza 9194 y habilitación comercial |
| `NUT-CAP-013` | Activar stage controlado | Doble lente activa, unknowns visibles, comercios y geometrías bloqueadas si corresponde |

## Contrato de calidad para fusionar PRs

Un PR de nutrición solo puede fusionarse si:

- No introduce datos sin fuente.
- No introduce PII.
- No une entidades por nombre.
- No publica derivados sin licencia.
- No presenta prensa como fuente oficial.
- No oculta unknowns.
- Conserva snapshots inmutables.
- Actualiza índice y tablero.


## Instrucción final para Vibe

```text
Tarea: NUT-CAP-008 — Consolidar paquete de nutrición del Nodo Capital

Base: main @ 77500be
Issue relacionado: #215

1. Crear rama:
   agent-vibe/nut-capital-consolidacion

2. Aterrizr:
   docs/nodo-capital/*
   data/sources/capital/sources.seed.json
   data/sources/capital/requests.tracking.json
   .github/workflows/validate-nutricion-capital.yml

3. Validar:
   - JSON válidos.
   - 15 fuentes verified.
   - 4 fuentes provisional.
   - 25 unknowns.
   - 4 pedidos pending.
   - Ninguna PII.
   - CI verde.

4. Abrir PR:
   docs(capital): consolidar paquete de nutrición, CI y backlog

5. No fusionar hasta que:
   - El workflow pase.
   - El índice maestro esté completo.
   - El tablero refleje el estado real.
```

Con esto, el Nodo Capital queda con un **ciclo de nutrición institucionalizado**: corpus inicial, pedidos formales, validación automática, UI honesta, stage activable y plan continuo. El siguiente salto de valor no es agregar más documentos, sino ejecutar `NUT-CAP-010` y `NUT-CAP-011`: obtener capacidades reales de UNIDE y respuestas oficiales a los pedidos.

<div align="center">⁂</div>

[^10_1]: https://www.bcn.cl/leychile/navegar?idNorma=1218339


---

# Continuación — Cierre del paquete y siguiente ejecución

Completamos los dos artefactos que faltaban para que el paquete sea **autocontenido y auditable**: el documento ejecutable del Bloque B y el tablero inicial de nutrición. Con esto, Vibe tiene todo el material para aterrizar el corpus, validar con CI y comenzar la ejecución real.[^11_1]

## Artefactos nuevos

| Archivo | Contenido | SHA-256 |
| :-- | :-- | :-- |
| `docs/nodo-capital/BLOQUE-B-UNIDE-SONDEO.md` | Comandos, reglas, salida esperada y DoD para inspeccionar WMS/WFS de UNIDE. | `d1ddd55510936dd5338e76dc9e523581ec86e86db3806fa1bd5644d363253866` |
| `data/sources/capital/nutrition-dashboard.json` | Tablero inicial: métricas, estado de bloques y bloqueantes. | `68943a415194c491bb56b9b7132faad500d191cb6a30f03d9a7f3c5d7de7de3b` |

Ambos están disponibles como entregables adjuntos.[^11_1]

## Estado consolidado del nodo

```json
{
  "verified_sources": 15,
  "provisional_sources": 4,
  "active_unknowns": 25,
  "formal_requests": 4,
  "answered_requests": 0,
  "confirmed_licenses": 0,
  "ingestable_commerces": 0,
  "verified_public_spaces": 0,
  "verified_fairs": 0,
  "verified_corridors": 0
}
```


## Bloqueantes activos

1. `unide_capabilities_not_retrieved` — no se pudieron enumerar capas WMS/WFS.
2. `unide_license_unknown` — no hay licencia confirmada para capas.
3. `open_data_license_unknown` — no hay licencia confirmada para datasets abiertos.
4. `commercial_registry_not_available` — no hay padrón comercial público identificado.
5. `public_space_inventory_not_available` — no hay inventario municipal confirmado.
6. `accessibility_inventory_not_available` — no hay datos de rampas, veredas o movilidad.

## Orden de ejecución final para Vibe

```text
NUT-CAP-008 → Consolidar paquete documental y datos
NUT-CAP-009 → Activar CI de validación
NUT-CAP-010 → Ejecutar sondeo UNIDE
NUT-CAP-011 → Enviar y seguir pedidos formales
NUT-CAP-012 → Verificar normas provisionales
NUT-CAP-013 → Activar stage con estados honestos
```


## PR único recomendado

```text
Título:
docs(capital): consolidar corpus de nutrición, CI, tablero y backlog

Rama:
agent-vibe/nut-capital-consolidacion

Base:
main @ 77500be

Incluir:
docs/nodo-capital/NUTRICION-CAPITAL-TRABAJO.md
docs/nodo-capital/PEDIDOS-FORMALES-CAPITAL.md
docs/nodo-capital/SOLICITUDES-FORMALES-CAPITAL.md
docs/nodo-capital/BLOQUE-B-UNIDE-SONDEO.md
docs/nodo-capital/BLOQUE-D-VERIFICACION-NORMATIVA.md
docs/nodo-capital/BLOQUE-E-UI-ESTADOS-EPISTEMICOS.md
docs/nodo-capital/BLOQUE-F-ACTIVACION-STAGE-CAPITAL.md
docs/nodo-capital/PLAN-NUTRICION-CONTINUA-CAPITAL.md
docs/nodo-capital/INDICE-MAESTRO-NUTRICION-CAPITAL.md
data/sources/capital/sources.seed.json
data/sources/capital/requests.tracking.json
data/sources/capital/nutrition-dashboard.json
.github/workflows/validate-nutricion-capital.yml

Validaciones:
- JSON válidos.
- 15 fuentes verified.
- 4 fuentes provisional.
- 25 unknowns.
- 4 pedidos pending.
- CI verde.
- Ninguna PII.
- Ninguna geometría sin licencia.
```


## Próximo salto real

Después de fusionar este PR, el siguiente movimiento no es documental sino **operativo**:

1. Ejecutar `NUT-CAP-010`: obtener `GetCapabilities` de UNIDE desde un entorno con salida de red.
2. Ejecutar `NUT-CAP-011`: enviar las cuatro solicitudes formales y registrar acuses.
3. Actualizar `nutrition-dashboard.json` con resultados reales.
4. Solo entonces, habilitar capas, comercios o ferias en el stage según el estado epistémico obtenido.

<div align="center">⁂</div>

[^11_1]: https://www.bcn.cl/leychile/navegar?idNorma=1218339

