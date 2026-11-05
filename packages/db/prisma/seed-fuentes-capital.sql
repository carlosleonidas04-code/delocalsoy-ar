-- Seed NODO-CAPITAL NCAP-R3 (#155, épica #152): catálogo de fuentes
-- espaciales y procedencia del nodo Capital. Extiende el catálogo global
-- ADR-035 (patrón NODO-CAU R2 #138/#147 y NVIG-R5 #172) con las fuentes que
-- el documento de la DH aporta para Capital (issue #155), cada una con
-- fecha de consulta, estado honesto de disponibilidad (verificación
-- 2026-11-05) y cautela. El catálogo NO contiene datos del territorio:
-- nunca un feature real sin fuente citable (R15). Multinodo: ign,
-- indec_iiee (radios censales), bahra, georef, unide, idera y
-- catastro_sj ya registrados sirven también al Capital. Método de cruce
-- por código, nunca por nombre (depto Capital INDEC/Georef = 70028).
-- Estados honestos: ninguna fuente se marca disponible sin verificación;
-- redtulum_anillo no_disponible (sin GTFS, app muerta post-Moovit).
-- Idempotencia: ON CONFLICT (key) DO NOTHING; sellos por hash único con
-- payload source 'seed-ncap-r3' (sin PII).

INSERT INTO fuentes (id, key, organismo, nombre, url, tipo, licencia, estado, cautela, created_at, updated_at)
VALUES
  (gen_random_uuid()::text, 'pec_capital_2025', 'CoPESJ — Plan Estratégico San Juan', 'PEC Capital — Avance de Diagnóstico 2025 (PDF)', 'https://planestrategico.sanjuan.gob.ar', 'documento', NULL, 'disponible', 'Antecedente territorial central: 4 distritos, microcentro = rectángulo 7×6 cuadras (Libertador N / Córdoba S / Alem O / Rioja E — confirma el perímetro v0.1 del repo, #154) y área central 16×10 cuadras. Documento de planificación ≠ límite legal vigente: boundary provisional hasta ordenanza sancionada.', '2026-11-05T12:00:00Z', '2026-11-05T12:00:00Z'),
  (gen_random_uuid()::text, 'pec_capital_2026', 'Municipalidad de San Juan', 'PEC Capital — documento final 2026', 'https://www.municipiosanjuan.gob.ar', 'documento', NULL, 'disponible', 'Documento final del PEC Capital: estructura de 4 distritos y áreas analíticas (microcentro/macrocentro) — las áreas analíticas NO son distritos administrativos (regla de modelado #154). Revisar fecha de corte al citar cada tramo o norma.', '2026-11-05T12:00:00Z', '2026-11-05T12:00:00Z'),
  (gen_random_uuid()::text, 'catastro_capital', 'Catastro San Juan', 'Consulta parcelaria y cartografía digital — departamento Capital', NULL, 'documento', NULL, 'requiere_solicitud', 'Consulta parcelaria y contraste de cartografía para límites de distritos: la estructura v0.1 de Capital es PROVISIONAL (assignment_status dh_directive, #154) hasta el contraste parcelario; el borde exacto exige el vectorial con licencia, escala y fecha de corte (ADR-035).', '2026-11-05T12:00:00Z', '2026-11-05T12:00:00Z'),
  (gen_random_uuid()::text, 'unsj_fi', 'UNSJ — Facultad de Ingeniería', 'Domicilio institucional (Av. Libertador Oeste 1109) e historia de la Basílica de Desamparados', NULL, 'documento', NULL, 'disponible', 'Domicilio institucional público ≠ punto georreferenciado verificado (R15): el hito hit_facultad_ingenieria mantiene lat/lng NULL hasta ingesta con geometría publicable. La historia de la Basílica sirve al etiquetado con fuente, no a la geometría (ADR-035).', '2026-11-05T12:00:00Z', '2026-11-05T12:00:00Z'),
  (gen_random_uuid()::text, 'redtulum_anillo', 'Secretaría de Tránsito y Transporte (San Juan)', 'RedTulum — Anillo Céntrico (Libertador–Rawson–Córdoba–España) y estaciones Córdoba/Mitre', NULL, 'documento', NULL, 'no_disponible', 'Sin GTFS (solicitud en pie) no existe traza exacta del Anillo: cor_redtulum_centro (NCAP-R4 #156) modela SOLO referencias entre hitos, nunca línea dibujada. App muerta post-Moovit — complementa la fuente redtulum ya registrada.', '2026-11-05T12:00:00Z', '2026-11-05T12:00:00Z'),
  (gen_random_uuid()::text, 'indec_cp2022', 'INDEC', 'CNPHV 2022 — resultados definitivos, departamento Capital', 'https://www.indec.gob.ar', 'descarga', NULL, 'disponible', 'Población departamental del Capital NO trasladable a subnodos (sj_capital_centro / sj_capital_desamparados) sin desagregación publicada (R15, #154). Cruce por código de departamento (Capital = 70028), nunca por nombre.', '2026-11-05T12:00:00Z', '2026-11-05T12:00:00Z'),
  (gen_random_uuid()::text, 'habilitacion_municipal_sj', 'Municipalidad de San Juan', 'Habilitación comercial municipal — trámite y consulta', 'https://www.municipiosanjuan.gob.ar', 'registro_web', NULL, 'requiere_solicitud', 'Trámite web ≠ padrón bulk: la verificación de habilitaciones es individual por comercio (patrón MARKET-CAP MK-2). Complementa la fuente fuente_siic_web (SIIC provincial, Ley 104-A) ya registrada; join por identificador de habilitación, nunca por nombre.', '2026-11-05T12:00:00Z', '2026-11-05T12:00:00Z'),
  (gen_random_uuid()::text, 'repavimentacion_microcentro_2026', 'Municipalidad de San Juan', 'Plan de repavimentación 2026 del microcentro (anuncio de apertura de sesiones + nota Tiempo 25-03-2026)', NULL, 'documento', NULL, 'disponible', 'Anuncio ≠ obra ejecutada: 14 tramos N-S + 4 periféricos + rampas de accesibilidad declarados; el estado por tramo exige verificación municipal antes de publicarse (R15). Insumo directo de NCAP-R5 (#157) y corredores v0.2 (#156).', '2026-11-05T12:00:00Z', '2026-11-05T12:00:00Z'),
  (gen_random_uuid()::text, 'datos_abiertos_sj', 'Gobierno de San Juan', 'Portal de datos abiertos provinciales', 'https://datosabiertos.sanjuan.gob.ar', 'api', NULL, 'disponible', 'Portal vivo con sondeo de datasets pendiente: cada dataset exige licencia, escala/precisión y fecha de corte verificadas ANTES de la ingesta (ADR-035). Descubrimiento ≠ fuente primaria de geometrías.', '2026-11-05T12:00:00Z', '2026-11-05T12:00:00Z')
ON CONFLICT (key) DO NOTHING;

-- Sellos fuente.registrada (patrón seed-cau-r2 / seed-vig-r5: events_raw única
-- fuente de verdad; hash fijo seed-fuente-<key> → idempotencia; payload source
-- 'seed-ncap-r3' distingue el origen del sello; sin PII).
INSERT INTO events_raw (id, type, payload, hash, occurred_at, ingested_at)
SELECT gen_random_uuid()::text, 'fuente.registrada',
       jsonb_build_object('key', f.key, 'organismo', f.organismo, 'source', 'seed-ncap-r3'),
       'seed-fuente-' || f.key, f.created_at, f.created_at
FROM fuentes f
WHERE f.key IN ('pec_capital_2025', 'pec_capital_2026', 'catastro_capital', 'unsj_fi', 'redtulum_anillo', 'indec_cp2022', 'habilitacion_municipal_sj', 'repavimentacion_microcentro_2026', 'datos_abiertos_sj')
ON CONFLICT (hash) DO NOTHING;
