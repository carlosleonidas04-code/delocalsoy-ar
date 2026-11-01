# Documento de trabajo — Nutrición del Nodo Capital

**Proyecto:** DELocalSoy.AR  
**Nodo:** Capital (San Juan, Argentina)  
**Repositorio:** `carlosleonidas04-code/delocalsoy-ar`  
**Base:** `main @ 77500be`  
**Issue asociado:** #215  
**Fecha:** 2026-10-15  
**Responsable de aterrizaje:** `agent-vibe`  
**Origen:** investigación verificada por `agent-perplexity`

## 1. Objetivo

Incorporar la primera ingesta verificable de comercios, espacios públicos, movilidad y normativa del Nodo Capital.

Este documento define:

- Qué se ingesta en la primera pasada.
- Qué queda como `unknown` de primera clase.
- Qué pedidos formales deben iniciarse.
- Qué validaciones debe aplicar `agent-vibe`.

## 2. Reglas epistémicas

Toda fila debe incluir:

- `source_name`
- `source_url`
- `data_date`
- `retrieved_at`
- `epistemic_status`
- `source_type`
- `license`
- `snapshot_hash`
- `join_key`

Estados:

| Estado | Significado |
|---|---|
| `verified` | Fuente oficial |
| `provisional` | Prensa, academia, directorio o fuente secundaria |
| `unknown` | Sin fuente verificable |

Reglas:

1. No unir registros por nombre.
2. No publicar PII.
3. No convertir prensa en fuente oficial.
4. No mezclar normas distintas.
5. No asumir vigencia sin fecha y fuente.
6. No tratar WMS como descarga vectorial.
7. Todo snapshot debe ser inmutable y hasheado.

## 3. Fuentes primarias confirmadas

| ID | Recurso | URL | Estado |
|---|---|---|---|
| SRC-001 | PEC 2025 — Avance de Diagnóstico | https://planestrategico.sanjuan.gob.ar/wp-content/uploads/2025/10/PEC-Avance-de-Diagnostico-2025.pdf | verified |
| SRC-002 | CNE 2020-2021 — cuadros XLS | https://www.indec.gob.ar/ftp/cuadros/economia/cne_2020_2021_resultados_provisorios.xls | verified |
| SRC-003 | CNE 2020-2021 — informe PDF | https://censoeconomico.indec.gob.ar/wp-content/uploads/2022/10/cne_2020_2021_resultados_provisorios.pdf | verified |
| SRC-004 | UNIDE — Geoservicios | https://web.sanjuan.gob.ar/unide/geoservicios/ | verified |
| SRC-005 | UNIDE — WMS | https://unide.sanjuan.gob.ar/geoserver/wms | verified |
| SRC-006 | IDERA — registro WMS | https://controlserviciosidera.iado-conicet.gob.ar/resource/660?lang=de | verified |
| SRC-007 | Municipalidad de Capital — Habilitaciones | https://wwwold.municipiosanjuan.gob.ar/news-cyt/item/1740-habilitaciones | verified |
| SRC-008 | Ordenanza 9587 | https://wwwold.municipiosanjuan.gob.ar/ordenanzas/ordenanzas-2009/9068-ord-9587/file | verified |
| SRC-009 | Mercado de Abasto | https://wwwold.municipiosanjuan.gob.ar/servicios/item/518-feria-y-mercado-de-abasto | verified |
| SRC-010 | Trámites — habilitación de alimentos | https://tramite.sanjuan.gob.ar/tramite/tag/habilitacion | verified |
| SRC-011 | Ley 513-L | https://www.argentina.gob.ar/normativa/provincial/ley-513-123456789-0abc-defg-315-0021jvorpyel/actualizacion | verified |
| SRC-012 | Ley 6571 | https://diputadossanjuan.gob.ar/cuerpo-legislativo/comisiones-y-representantes/consejo-provincial-del-ambiente-ley-n-513-l?view=article&id=2837:ley-n-6571&catid=124 | verified |
| SRC-013 | Ley 927-L | https://sisanjuan.gob.ar/legislacion-ambiental/2016-12-27/3456-ley-n-927-l | verified |
| SRC-014 | Ley 8238 | https://diputadossanjuan.gob.ar/cuerpo-legislativo/comisiones-y-representantes/organo-coordinador-provincial-ley-n-989-e?view=article&id=467:ley-n-8238&catid=107 | verified |
| SRC-015 | Ley 27.275 | https://servicios.infoleg.gob.ar/infolegInternet/anexos/265000-269999/265949/norma.htm | verified |

## 4. Fuentes provisionales

| ID | Recurso | URL | Estado | Pendiente |
|---|---|---|---|---|
| SRC-016 | Diario Huarpe — registro único de feriantes | https://www.diariohuarpe.com/nota/capital-crea-un-registro-unico-de-artesanos-para-ordenar-espacios-publicos-202691512120 | provisional | Texto oficial del Despacho 325-26 y Ordenanza 9194 |
| SRC-017 | Diario Huarpe — acceso a la información | https://www.diariohuarpe.com/nota/san-juan-sin-ley-de-acceso-a-la-informacion-publica-una-deuda-con-la-transparencia-20255306026 | provisional | Confirmación en Boletín Oficial |
| SRC-018 | Diario Huarpe — proyecto de adhesión a Ley 27.275 | https://www.diariohuarpe.com/nota/volvieron-a-presentar-el-proyecto-de-acceso-a-la-informacion-publica-en-san-juan-202432822470 | provisional | Estado legislativo actual |
| SRC-019 | UNSJ — UNIDE | http://huru.unsj.edu.ar/bitstream/handle/123456789/635/2025-Trabajo%20Final%20Goria-Ortiz-Paroldi.pdf?sequence=1&isAllowed=y | provisional | Contexto técnico solamente |

## 5. Bloques de trabajo

### Bloque A — Ingesta mínima verificable

- [ ] Crear esquema `data_source`.
- [ ] Ingestar SRC-001 a SRC-015.
- [ ] Descargar y hashear PEC 2025, CNE XLS y CNE PDF.
- [ ] Registrar endpoint WMS de UNIDE.
- [ ] Crear fichas normativas separadas.
- [ ] Marcar vacíos como `unknown`.

### Bloque B — Sondeo UNIDE

- [ ] Ejecutar `GetCapabilities`.
- [ ] Enumerar capas de espacios verdes, equipamiento, zonificación y límites.
- [ ] Verificar existencia de WFS/API.
- [ ] Capturar licencia, CRS, formato y fecha.
- [ ] No publicar derivados sin licencia.

### Bloque C — Pedidos formales

- [ ] Pedido a Municipalidad de Capital: padrón comercial.
- [ ] Pedido a Municipalidad de Capital: inventario de espacios públicos.
- [ ] Pedido a Municipalidad de Capital: accesibilidad y movilidad.
- [ ] Pedido a Provincia: datasets, licencias, WFS/API y registros sectoriales.

### Bloque D — Verificación normativa

- [ ] Texto oficial del Despacho 325-26.
- [ ] Texto oficial de la Ordenanza 9194.
- [ ] Número y año de la ordenanza de habilitación comercial.
- [ ] Adhesión provincial a Ley 27.275.
- [ ] Licencias de datos abiertos y UNIDE.
- [ ] Régimen IGN para derivados cartográficos.

## 6. Unknowns de primera clase

- Padrón público descargable de comercios.
- Campos oficiales del padrón municipal.
- Nomenclador codificado de rubros.
- 2ª etapa del CNE 2020-2021 por departamento.
- RUPA y registros sectoriales departamentales.
- CCCA formal del microcentro.
- Calles peatonales oficiales.
- Vacancia y rotación de locales.
- Inventario oficial de plazas y parques.
- Capas exactas UNIDE de espacios verdes.
- Arbolado urbano.
- Mobiliario y luminaria.
- Rampas, sendas y estado de veredas.
- Plan de movilidad vigente.
- Flujos peatonales.
- Obras vigentes en microcentro.
- Ordenanza exacta de habilitación comercial.
- Ley provincial de datos personales.
- Licencias de reutilización.
- Defensa del consumidor provincial.
- Marco IGN.
- Indicadores de comercio minorista.
- Programas vigentes de comercios de barrio.
- Precedentes de coproducción espacio-comercio.
- Presupuesto participativo en Capital.

## 7. Modelo de fila

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

## 8. Definition of Done global

- [ ] Todas las fuentes primarias snapshotadas y hasheadas.
- [ ] Ninguna fila sin procedencia.
- [ ] Unknowns visibles.
- [ ] Pedidos formales registrados.
- [ ] Normas provisionales con plan de verificación.
- [ ] Ningún dato de prensa presentado como oficial.
- [ ] Ninguna geometría publicada sin licencia confirmada.
