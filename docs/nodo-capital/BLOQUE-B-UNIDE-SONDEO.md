# Bloque B — Sondeo técnico UNIDE

**Nodo:** Capital  
**Fecha:** 2026-10-15  
**Base:** main @ 77500be  
**Endpoint WMS:** https://unide.sanjuan.gob.ar/geoserver/wms  
**Estado inicial:** endpoint verificado; capas unknown.

## Objetivo

Determinar si UNIDE expone capas reutilizables de espacios verdes, equipamiento urbano, zonificación, límites administrativos y movilidad.

## Comandos

```bash
curl -L -o unide_wms_capabilities.xml \
  "https://unide.sanjuan.gob.ar/geoserver/wms?service=WMS&request=GetCapabilities&version=1.3.0"
```

```bash
curl -L -o unide_wfs_capabilities.xml \
  "https://unide.sanjuan.gob.ar/geoserver/wfs?service=WFS&request=GetCapabilities&version=2.0.0"
```

```bash
grep -i -E "verde|arbol|plaza|parque|equipamiento|zonificacion|limite|movilidad|ciclovia" unide_wms_capabilities.xml
```

## Reglas

- Guardar respuestas como snapshots inmutables.
- Calcular SHA-256.
- No inferir capas por nombre de dominio.
- No publicar derivados sin licencia.
- Si WFS no existe, registrar `wfs: unknown`.

## Salida esperada

`data/sources/capital/unide-layers.json`

```json
{
  "endpoint_wms": "https://unide.sanjuan.gob.ar/geoserver/wms",
  "endpoint_wfs": "https://unide.sanjuan.gob.ar/geoserver/wfs",
  "wms_capabilities_hash": "sha256",
  "wfs_capabilities_hash": "sha256",
  "layers": []
}
```

## Definition of Done

- [ ] GetCapabilities WMS descargado y hasheado.
- [ ] GetCapabilities WFS intentado y registrado.
- [ ] Inventario de capas o unknown documentado.
- [ ] Licencias verificadas o unknown.
- [ ] Ninguna geometría publicada sin licencia.
