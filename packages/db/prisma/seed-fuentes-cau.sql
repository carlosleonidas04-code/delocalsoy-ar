-- Seed NODO-CAU R2 (#138/#147): catálogo de fuentes espaciales. Registro de
-- PROCEDENCIA pública (ADR-035): cada fuente con su organismo, URL estable
-- cuando existe, tipo de acceso, licencia declarada, estado honesto de
-- disponibilidad (verificación en vivo 2026-10-11, trazas en #147) y CAUTELA
-- central del documento de la DH. El catálogo NO contiene datos del
-- territorio: nunca un feature real sin fuente citable (R15). Multinodo:
-- IGN/INDEC/BAHRA/Georef sirven a los tres nodos. Estados honestos: ninguna
-- fuente se marca disponible sin verificación; redtulum no_disponible (app
-- muerta post-Moovit). Idempotencia: ON CONFLICT (key) DO NOTHING; sellos
-- por hash único.

INSERT INTO fuentes (id, key, organismo, nombre, url, tipo, licencia, estado, cautela, created_at, updated_at)
VALUES
  (gen_random_uuid()::text, 'catastro_sj', 'Catastro San Juan', 'Caucete – Cabecera y Entorno (edición 2021, PDF)', NULL, 'documento', NULL, 'disponible', 'Referencia de trabajo para digitalizar la propuesta de perímetro urbano; NO es límite legal vigente. Priorizar conseguir el vectorial descargable.', '2026-10-15T12:00:00Z', '2026-10-15T12:00:00Z'),
  (gen_random_uuid()::text, 'ign', 'IGN (Instituto Geográfico Nacional)', 'WFS Argenmap / Centro de Descargas — capas SIG base', 'https://www.ign.gob.ar', 'wfs', NULL, 'disponible', 'WMS = visualización; WFS/descarga = análisis. Registrar capa, fecha, CRS y atribución en cada ingesta.', '2026-10-15T12:00:00Z', '2026-10-15T12:00:00Z'),
  (gen_random_uuid()::text, 'unide', 'UNIDE (San Juan)', 'Geoservidor provincial WMS/WFS', 'https://unide.sanjuan.gob.ar/geoserver/wms', 'wms', NULL, 'requiere_credenciales', 'WMS vivo con 0 capas anónimas; el WFS requiere autenticación (500 anónimo) — la vía correcta es solicitud formal con credenciales. Revisar metadatos y licencia antes de integrar.', '2026-10-15T12:00:00Z', '2026-10-15T12:00:00Z'),
  (gen_random_uuid()::text, 'indec_iiee', 'INDEC + IIEE San Juan', 'Radios censales CNPHV 2022', 'https://www.indec.gob.ar', 'descarga', NULL, 'disponible', 'Escala censal: los radios censales no son barrios; no inferir a escala más fina que la publicada.', '2026-10-15T12:00:00Z', '2026-10-15T12:00:00Z'),
  (gen_random_uuid()::text, 'bahra', 'BAHRA (IGN + INDEC + Mapa Educativo)', 'Base de Asentamientos Humanos de la República Argentina', 'https://www.bahra.gob.ar', 'descarga', NULL, 'disponible', 'Base oficial de localidades con nombre unívoco y código único (cod_ase); clave para el perímetro operativo propuesta→ratificado.', '2026-10-15T12:00:00Z', '2026-10-15T12:00:00Z'),
  (gen_random_uuid()::text, 'georef', 'Datos Argentina', 'API Georef — normalización de nombres y códigos', 'https://apis.datos.gob.ar/georef', 'api', NULL, 'disponible', 'Normalización de nombres/códigos de localidades y departamentos; NO es fuente de geometrías.', '2026-10-15T12:00:00Z', '2026-10-15T12:00:00Z'),
  (gen_random_uuid()::text, 'refes', 'MSAL — REFES', 'Registro Federal de Establecimientos de Salud (recurso REFES 2026)', 'https://datos.salud.gob.ar', 'descarga', NULL, 'requiere_solicitud', 'Registro ≠ turnos/capacidad/horarios/accesibilidad. Guardar id REFES (14 dígitos), fecha de corte y precisión; join por código, nunca por nombre.', '2026-10-15T12:00:00Z', '2026-10-15T12:00:00Z'),
  (gen_random_uuid()::text, 'mapa_educativo', 'MEN — Mapa Educativo Nacional', 'Establecimientos y oferta educativa activa (WFS + padrón)', 'https://www.argentina.gob.ar/educacion/mapaeducativo', 'api', NULL, 'disponible', 'CUE + fecha de corte por actualización (padrón nacional 6-1-2025 vs WFS 5-9-2023): registrar el corte del servicio.', '2026-10-15T12:00:00Z', '2026-10-15T12:00:00Z'),
  (gen_random_uuid()::text, 'mapa_cuidado', 'MDS — Mapa Federal del Cuidado', 'Puntos de cuidado de la República Argentina', 'https://www.argentina.gob.ar/desarrollosocial/mapafederaldelcuidado', 'descarga', NULL, 'requiere_solicitud', 'No completar con POI no verificados como inventario oficial.', '2026-10-15T12:00:00Z', '2026-10-15T12:00:00Z'),
  (gen_random_uuid()::text, 'inpres', 'INPRES', 'Zonificación sísmica + isosistas del terremoto de Caucete 23-11-1977', 'https://www.inpres.gob.ar', 'documento', NULL, 'disponible', 'Contexto de peligro ≠ evaluación de vulnerabilidad por edificio; microzonificación sísmica solo para Gran San Juan (CONICET), no Caucete. Consultar a Protección Civil qué difundir (ADR-036).', '2026-10-15T12:00:00Z', '2026-10-15T12:00:00Z'),
  (gen_random_uuid()::text, 'faud_unsj', 'FAUD-UNSJ (Kurbán et al.)', 'Estudio de verde urbano árido con UTCI en Caucete', NULL, 'documento', NULL, 'disponible', 'Evidencia cuantitativa local publicada (mejoras 0,3-9,3 °C UTCI): citable como respaldo científico sanjuanino; interpretación con método (R15/ADR-035).', '2026-10-15T12:00:00Z', '2026-10-15T12:00:00Z'),
  (gen_random_uuid()::text, 'hidraulica_sj', 'Hidráulica (Gobierno de San Juan)', 'Sistema de riego — Canal Norte sección Caucete', NULL, 'documento', NULL, 'requiere_solicitud', 'Sistema de riego documentado; la red vectorial no está publicada — solicitud técnica en pie.', '2026-10-15T12:00:00Z', '2026-10-15T12:00:00Z'),
  (gen_random_uuid()::text, 'mapbiomas', 'MapBiomas Argentina', 'Colección 3 — cobertura de suelo (18 clases, 1985-2025)', 'https://argentina.mapbiomas.org', 'descarga', 'CC BY-SA 4.0', 'disponible', 'Estadísticas departamentales de Caucete citables directamente; contexto y cambios territoriales, no calidad de agua automática.', '2026-10-15T12:00:00Z', '2026-10-15T12:00:00Z'),
  (gen_random_uuid()::text, 'idera', 'IDERA', 'Infraestructura de Datos Espaciales de la República Argentina', 'https://www.idera.gob.ar', 'api', NULL, 'disponible', 'Catálogo de geoservicios para descubrimiento; NO es fuente primaria de geometrías.', '2026-10-15T12:00:00Z', '2026-10-15T12:00:00Z'),
  (gen_random_uuid()::text, 'redtulum', 'Secretaría de Tránsito y Transporte (San Juan)', 'RedTulum — transporte público del Valle de Tulum', NULL, 'documento', NULL, 'no_disponible', 'App muerta post-Moovit (feb 2026); sin GTFS — solicitud en pie. No usar Google Maps como fuente.', '2026-10-15T12:00:00Z', '2026-10-15T12:00:00Z')
ON CONFLICT (key) DO NOTHING;

-- Sellos fuente.registrada (patrón seed: events_raw única fuente de verdad;
-- hash fijo 'seed-fuente-<key>' → idempotencia).
INSERT INTO events_raw (id, type, payload, hash, occurred_at, ingested_at)
SELECT gen_random_uuid()::text, 'fuente.registrada',
       jsonb_build_object('key', f.key, 'organismo', f.organismo, 'source', 'seed-cau-r2'),
       'seed-fuente-' || f.key, f.created_at, f.created_at
FROM fuentes f
ON CONFLICT (hash) DO NOTHING;
