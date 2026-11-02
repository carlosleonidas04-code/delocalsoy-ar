# Sondeo UNIDE — Resultados (Bloque B, NUT-CAP-010)

**Proyecto:** DELocalSoy.AR | **Nodo:** Capital | **Ejecutor:** agent-vibe | **Fecha:** 2026-10-15
**Issue:** #215 — metodo segun BLOQUE-B-UNIDE-SONDEO.md; backlog NUT-CAP-010
**Datos estructurados:** data/sources/capital/unide-survey.json

## Resumen

Sondeo tecnico directo contra el endpoint WMS de UNIDE ejecutado conforme al Bloque B del paquete NUT-CAP-008. Resultado principal: **el servicio esta vivo y verificado, pero no publica capas de forma anonima, y WFS/WCS/WMTS rechazan el acceso anonimo con credenciales exigidas**. La conclusion accionable es que la obtencion de capas reutilizables depende de credenciales o de la entrega formal por parte del UNIDE (PED-CAP-004 / SOL-PROV-004).

## Sondas ejecutadas (2026-10-15, acceso anonimo)

| ID | Objetivo | Resultado | Estado |
|---|---|---|---|
| PRB-001 | WMS 1.3.0 GetCapabilities | HTTP 200, XML valido, GeoServer 2.11.1; el Capability NO publica capas (solo nodo raiz, 0 capas hijas) | verified |
| PRB-002 | WFS 2.0.0 GetCapabilities | HTTP 500: `InsufficientAuthenticationException: Cannot access WFS.GetCapabilities as anonymous` | verified |
| PRB-003 | WCS 2.0.1 GetCapabilities | HTTP 500: `InsufficientAuthenticationException: Cannot access WCS.GetCapabilities as anonymous` | verified |
| PRB-004 | WMTS (gwc) GetCapabilities | HTTP 500: `InsufficientAuthenticationException: Cannot access gwc.dispatch as anonymous` | verified |
| PRB-005 | Panel /geoserver/web/ | Accesible; declara WCS 1.0.0-2.0.1, WFS 1.0.0-2.0.0, WMS 1.1.1/1.3.0, TMS 1.0.0, WMS-C 1.1.1, WMTS 1.0.0; contacto: Alfredo Gomez (Director, UNIDE), unide@sanjuan.gov.ar, +54 264 4307463 | verified |
| PRB-006 | Catalogo oficial (SRC-004) | Solo publica la URL base del WMS; no enumera capas | verified |
| PRB-007 | Ficha IDERA (SRC-006) | Registro vigente; health-check OK 2026-10-15T14:11:38Z (0.47 s); no enumera capas | verified |
| PRB-008 | PDF campus IDERA | Recurso eliminado del campus: fuente documental no disponible | provisional |

## Consecuencias para el diseno

1. Los unknowns de capas (espacios verdes, equipamiento urbano, zonificacion, limites administrativos, movilidad/red vial) **permanecen unknown**: no se inventan nombres de capas (R1).
2. La ingesta vectorial es imposible hoy por via anonima; incluso la visualizacion por capa requiere nombres de capas que el propio GetCapabilities no publica.
3. El pedido formal PED-CAP-004 / SOL-PROV-004 se refuerza con evidencia verificable: pedir credenciales, disponibilidad de WFS/API y entrega formal de capas.
4. El hallazgo del trabajo academico (SRC-019) se confirma operativamente: WMS entrega imagenes y sin WFS/API accesible no hay via de descarga vectorial.

## Snapshot

- Archivo: `data/sources/capital/snapshots/unide-wms-getcapabilities-2026-10-15.xml`
- sha256: `34dc5b863f0083047acc51b71665a83985b55cd18a5deb7b3bca73bd954c38cf`
- Tamano: 32794 bytes (texto capturado)
- Caveat (R4): texto capturado via servicio de lectura del agente; puede no ser byte-exacto respecto de la respuesta original del servidor; el hash acredita exactamente lo capturado.

## Definition of Done del Bloque B

| Criterio (BLOQUE-B-UNIDE-SONDEO.md) | Estado |
|---|---|
| Inventario de capas con URL de GetCapabilities | Cumplido con resultado verificable: 0 capas anonimas |
| Cada capa con estado verified/provisional/unknown | No hay capas que etiquetar; nombres hipoteticos quedan unknown |
| Documentado si visualizable o descargable | Cumplido: ni lo uno ni lo otro sin credenciales |

## Gobernanza

- R15: este PR queda en cola de merge (GitHub Actions bloqueado hasta 2026-11-01 segun DH); nada se mergea sin CI verde.
- Ref #215 (no lo cierra). Registro de evidencia: EV-057 y siguientes segun orden de la cola.