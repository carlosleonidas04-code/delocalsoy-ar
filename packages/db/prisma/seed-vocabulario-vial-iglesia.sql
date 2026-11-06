-- Seed NODO-VIG-3 VIG-010 (#381, épica #377): vocabulario vial y
-- territorial del nodo Iglesia — capas, categorías, features de obras
-- anunciadas y fuentes. Análogo de seed-vocabulario-capital.sql
-- (NCAP-R1 #153) y seed-accesibilidad-capital.sql (NCAP-R5 #157).
-- Decisiones ratificadas por la DH (2026-11-06, traza épica #377):
-- (1) capas v5.1 REUTILIZADAS del R1 Capital (public_space,
--     public_lighting, trees, sidewalks, irrigation_channels — sin
--     vocabulario paralelo) + 4 capas nuevas: obra_vial (anuncios y
--     ejecuciones), punto_critico (problems, default_on),
--     parada_transporte y cobertura_sos;
-- (2) 40 categorías N2 de los 9 dominios del AMC v0.3 (espacio público,
--     infraestructura vial, movilidad, agua y saneamiento, clima y
--     ambiente, conectividad, servicios, producción rural) — patrimonio
--     reutiliza damaged_heritage (turismo) y caminos rurales dañados
--     reutilizan damaged_road (rural_services);
-- (3) R15 anuncio ≠ obra: los tramos RN 150 y derivadores se siembran
--     estado declared / in_execution (estado nuevo: ciclo declarada →
--     in_execution → completed) con coordenadas ilustrativas
--     (is_synthetic=true — jamás coordenada oficial);
-- (4) la capa parada_transporte NACE VACÍA: sin padrón verificado de
--     paradas no se siembran features (R15);
-- (5) 4 fuentes al catálogo global ADR-035 (prensa de obras, portal
--     Paso Agua Negra, agregador transporte 600/601, documento vecinal)
--     — el documento vecinal es procedencia declarada sin firmantes
--     (ADR-027, anti-PII): sus pedidos NO se precargan como features.
-- Hallazgo documentado (fixtures congelados ADR-040): el seed demo
-- (CORE-003) menciona «olivícola»/«vid» en iglesia, en desajuste con el
-- perfil productivo semillas/hortalizas del nodo — NO se modifica aquí;
-- se registra en el doc de diseño VIG-010.
-- Idempotencia: ON CONFLICT DO NOTHING por (nodo_id,key) de capas,
-- (nodo_id,code) de categorías, (id) de features y (key) de fuentes;
-- sellos en events_raw por hash único (patrón seed-*).

-- ─── Capas nuevas del nodo Iglesia (5 v5.1 reutilizadas + 4 nuevas) ───
INSERT INTO capas (id, nodo_id, key, nombre, dominio, geometria, default_on)
VALUES
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'public_space', 'Espacio público', 'public_space', 'Point', true),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'public_lighting', 'Iluminación pública', 'problems', 'Point', false),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'trees', 'Arbolado', 'assets', 'Point', false),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'sidewalks', 'Veredas y rampas', 'problems', 'LineString', false),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'irrigation_channels', 'Acequias y canales', 'assets', 'LineString', false),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'obra_vial', 'Obras viales: anuncios y ejecuciones', 'assets', 'LineString', false),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'punto_critico', 'Puntos críticos del territorio', 'problems', 'Point', true),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'parada_transporte', 'Paradas de transporte público', 'community', 'Point', false),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'cobertura_sos', 'Cobertura SOS y conectividad de emergencia', 'health', 'Point', false)
ON CONFLICT (nodo_id, key) DO NOTHING;

-- ─── 40 categorías nuevas (9 dominios del AMC v0.3; 2 reutilizadas del
-- vocabulario demo: damaged_road → rural_services, damaged_heritage →
-- tourism_resources) ───
INSERT INTO categorias (id, nodo_id, code, label, capa_id)
VALUES
  -- Espacio público (7)
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'street_lighting', 'Iluminación pública insuficiente o apagada', (SELECT id FROM capas WHERE key = 'public_lighting' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'sidewalk_condition', 'Vereda dañada, intransitable o inexistente', (SELECT id FROM capas WHERE key = 'sidewalks' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'plaza_furniture', 'Plaza: mobiliario, juegos o equipamiento dañado', (SELECT id FROM capas WHERE key = 'public_space' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'waste_dumping', 'Microbasural o residuos abandonados', (SELECT id FROM capas WHERE key = 'public_space' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'tree_damage', 'Árbol caído, dañado o en riesgo', (SELECT id FROM capas WHERE key = 'trees' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'stray_animals', 'Animales sueltos en el casco urbano', (SELECT id FROM capas WHERE key = 'public_space' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'noise_dust_nuisance', 'Ruidos molestos, polvo u obra sin protocolo', (SELECT id FROM capas WHERE key = 'public_space' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia'))),
  -- Infraestructura vial (7)
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'road_surface', 'Calzada de ruta deteriorada (baches, hundimientos)', (SELECT id FROM capas WHERE key = 'punto_critico' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'urban_surface', 'Calle urbana deteriorada (baches, fisuras)', (SELECT id FROM capas WHERE key = 'punto_critico' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'road_shoulder', 'Banquina deteriorada o invadida', (SELECT id FROM capas WHERE key = 'punto_critico' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'road_signage', 'Señalización vial faltante o dañada', (SELECT id FROM capas WHERE key = 'punto_critico' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'road_barrier', 'Barrera o vallista faltante o dañado', (SELECT id FROM capas WHERE key = 'punto_critico' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'bridge_culvert', 'Puente, alcantarilla o badén dañado', (SELECT id FROM capas WHERE key = 'punto_critico' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'work_zone_risk', 'Obra vial sin señalización o con riesgo', (SELECT id FROM capas WHERE key = 'obra_vial' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia'))),
  -- Movilidad (5)
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'bus_stop_issue', 'Parada de colectivo inexistente o inadecuada', (SELECT id FROM capas WHERE key = 'parada_transporte' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'service_frequency', 'Frecuencia u horarios insuficientes', (SELECT id FROM capas WHERE key = 'parada_transporte' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'school_health_transport', 'Transporte escolar o de salud inseguro o insuficiente', (SELECT id FROM capas WHERE key = 'parada_transporte' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'pedestrian_crossing', 'Cruce peatonal inseguro o inexistente', (SELECT id FROM capas WHERE key = 'sidewalks' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'active_mobility_risk', 'Riesgo para bicicletas o movilidad activa', (SELECT id FROM capas WHERE key = 'punto_critico' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia'))),
  -- Agua y saneamiento (3)
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'drinking_water_issue', 'Agua potable: corte, calidad o presión', (SELECT id FROM capas WHERE key = 'punto_critico' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'sewer_drainage', 'Cloacas o drenaje: desborde o desagüe tapado', (SELECT id FROM capas WHERE key = 'punto_critico' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'irrigation_conflict', 'Acequia o canal: obstrucción, rotura o conflicto', (SELECT id FROM capas WHERE key = 'irrigation_channels' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia'))),
  -- Clima y ambiente (7)
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'drought_scarcity', 'Sequía y escasez hídrica', (SELECT id FROM capas WHERE key = 'punto_critico' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'snow_ice', 'Nieve o hielo en calzada', (SELECT id FROM capas WHERE key = 'punto_critico' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'zonda_dust', 'Viento zonda y polvo', (SELECT id FROM capas WHERE key = 'punto_critico' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'frost_hail', 'Heladas o granizo', (SELECT id FROM capas WHERE key = 'punto_critico' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'flash_flood_risk', 'Cauce o aluvión: riesgo de creciente', (SELECT id FROM capas WHERE key = 'punto_critico' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'fog_visibility', 'Niebla y visibilidad reducida', (SELECT id FROM capas WHERE key = 'punto_critico' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'urban_rural_pests', 'Plagas urbanas o rurales (insectos, roedores, vizcachas)', (SELECT id FROM capas WHERE key = 'punto_critico' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia'))),
  -- Conectividad (3)
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'cell_dead_zone', 'Zona sin señal celular', (SELECT id FROM capas WHERE key = 'cobertura_sos' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'internet_gap', 'Internet inexistente o deficiente', (SELECT id FROM capas WHERE key = 'cobertura_sos' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'sos_coverage_gap', 'Poste SOS o auxilio faltante o inoperativo', (SELECT id FROM capas WHERE key = 'cobertura_sos' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia'))),
  -- Servicios (5)
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'power_grid_issue', 'Energía eléctrica: tendido caído o corte (riesgo)', (SELECT id FROM capas WHERE key = 'punto_critico' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'health_access_issue', 'Acceso a salud insuficiente', (SELECT id FROM capas WHERE key = 'punto_critico' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'school_facility_issue', 'Escuela: edificio o servicio con problema', (SELECT id FROM capas WHERE key = 'punto_critico' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'security_post_issue', 'Seguridad: puesto o patrullaje insuficiente', (SELECT id FROM capas WHERE key = 'punto_critico' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'public_building_issue', 'Edificio público dañado o cerrado', (SELECT id FROM capas WHERE key = 'punto_critico' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia'))),
  -- Producción rural (3)
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'productive_access', 'Acceso a producción bloqueado o dañado', (SELECT id FROM capas WHERE key = 'rural_services' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'agro_practice_issue', 'Práctica agropecuaria problemática', (SELECT id FROM capas WHERE key = 'productive_units' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'wildlife_corridor', 'Corredor de fauna o ataque de animales', (SELECT id FROM capas WHERE key = 'rural_services' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia')))
ON CONFLICT (nodo_id, code) DO NOTHING;

-- ─── Features seed (5): 4 obras viales + 1 red SOS. Coordenadas
-- ilustrativas (is_synthetic=true — jamás coordenada oficial); estado
-- honesto del ciclo de obra (R15: anuncio ≠ obra). La capa
-- parada_transporte NACE VACÍA (sin padrón verificado). ───
INSERT INTO features (id, nodo_id, capa_id, titulo, tipo, estado, fuente_label, observado_at, lat, lng, is_synthetic)
VALUES
  ('seed-f-vig010-rn150-las-flores-colola', (SELECT id FROM nodos WHERE key = 'iglesia'), (SELECT id FROM capas WHERE key = 'obra_vial' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia')), 'Obra RN 150 — repavimentación anunciada: Las Flores–Colola (22 km), primera etapa', 'asset', 'declared', 'Ilustrativa · anuncio de repavimentación RN 150 (prensa provincial 2–5/11/2026)', '2026-11-06T12:00:00Z', -30.30, -69.21, true),
  ('seed-f-vig010-rn150-colola-jachal', (SELECT id FROM nodos WHERE key = 'iglesia'), (SELECT id FROM capas WHERE key = 'obra_vial' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia')), 'Obra RN 150 — segunda etapa anunciada: Colola–Jáchal (60 km), ejecutor sin dato', 'asset', 'declared', 'Ilustrativa · anuncio de repavimentación RN 150 (prensa provincial 2–5/11/2026)', '2026-11-06T12:00:00Z', -30.10, -69.06, true),
  ('seed-f-vig010-derivador-ejecucion', (SELECT id FROM nodos WHERE key = 'iglesia'), (SELECT id FROM capas WHERE key = 'obra_vial' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia')), 'Derivadores RN 150 — obra declarada en ejecución (agregado, prensa provincial 2–3/11/2026)', 'asset', 'in_execution', 'Ilustrativa · derivadores declarados en ejecución (prensa provincial 2–3/11/2026)', '2026-11-06T12:00:00Z', -30.25, -69.15, true),
  ('seed-f-vig010-derivador-anunciados', (SELECT id FROM nodos WHERE key = 'iglesia'), (SELECT id FROM capas WHERE key = 'obra_vial' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia')), 'Derivadores RN 150 — 3 derivadores anunciados (agregado, prensa provincial 5/11/2026)', 'asset', 'declared', 'Ilustrativa · 3 derivadores anunciados (prensa provincial 5/11/2026)', '2026-11-06T12:00:00Z', -30.24, -69.16, true),
  ('seed-f-vig010-sos-agua-negra', (SELECT id FROM nodos WHERE key = 'iglesia'), (SELECT id FROM capas WHERE key = 'cobertura_sos' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia')), 'Red SOS y conectividad de emergencia — Paso Agua Negra (portal oficial, enero 2026)', 'asset', 'verified', 'Ilustrativa · portal oficial Paso Agua Negra (enero 2026)', '2026-01-15T12:00:00Z', -30.196, -69.822, true)
ON CONFLICT (id) DO NOTHING;

-- ─── 4 fuentes al catálogo global ADR-035 (estado honesto verificado
-- 2026-11-06; url NULL: sin URL estable verificada no se inventa) ───
INSERT INTO fuentes (id, key, organismo, nombre, url, tipo, licencia, estado, cautela, created_at, updated_at)
VALUES
  (gen_random_uuid()::text, 'prensa_obras_iglesia_2026_11', 'Gobierno de San Juan — prensa provincial', 'Notas de prensa provincial: anuncios de obra vial RN 150 y derivadores (2–5/11/2026)', NULL, 'documento', NULL, 'disponible', 'Anuncio ≠ obra ejecutada (R15): las notas anuncian repavimentación de RN 150 (tramo Las Flores–Colola 22 km y segunda etapa Colola–Jáchal 60 km) y derivadores; el estado y avance por tramo exigen verificación oficial (Vialidad/DNV) antes de publicarse como ejecutados.', '2026-11-06T12:00:00Z', '2026-11-06T12:00:00Z'),
  (gen_random_uuid()::text, 'portal_paso_agua_negra', 'Gobierno de San Juan — Portal Paso Agua Negra', 'Portal oficial del Paso Internacional Agua Negra — estado, conectividad y red SOS (enero 2026)', NULL, 'registro_web', NULL, 'disponible', 'Fuente institucional del paso internacional: la red SOS/conectividad de emergencia del corredor RN 150 es la citada por el portal (enero 2026); la cobertura por tramo NO está publicada como padrón georreferenciado — el punto del Paso es ilustrativo redondeado (R15), no coordenada oficial del despliegue.', '2026-11-06T12:00:00Z', '2026-11-06T12:00:00Z'),
  (gen_random_uuid()::text, 'agregador_transporte_600_601', 'Agregador de transporte interurbano — líneas 600/601 (San Juan–Iglesia)', 'Información secundaria de líneas 600/601 San Juan–Iglesia: recorrido y frecuencias', NULL, 'api', NULL, 'disponible', 'Fuente secundaria/provisional: el agregador NO publica GTFS ni padrón oficial de paradas; sin padrón verificado la capa parada_transporte nace vacía y ninguna parada se siembra (R15). A reemplazar por padrón oficial (DTP/empresa) al existir.', '2026-11-06T12:00:00Z', '2026-11-06T12:00:00Z'),
  (gen_random_uuid()::text, 'documento_vecinal_iglesia_2026_11', 'Vecinos autoconvocados de Iglesia — documento vecinal', 'Documento vecinal de infraestructura vial, comunicación y movilidad (11/2026)', NULL, 'documento', NULL, 'disponible', 'Procedencia declarada (ADR-035): documento elaborado por vecinos autoconvocados, sin firmantes identificables (ADR-027, anti-PII); los datos son testimonio vecinal etiquetado como tal (500 m de Tudcum entre cruce RN 150 y empalme camino Pismanta; 3 accidentes en 2 meses; hundimientos Las Flores–Pismanta) y los pedidos NO se precargan como features ni capas.', '2026-11-06T12:00:00Z', '2026-11-06T12:00:00Z')
ON CONFLICT (key) DO NOTHING;

-- ─── Sellos (events_raw única fuente de verdad, sin PII): 9 capas ───
INSERT INTO events_raw (id, type, payload, hash, occurred_at, ingested_at)
SELECT gen_random_uuid()::text, 'capa.registrada',
       jsonb_build_object('nodo_key', 'iglesia', 'key', 'public_space', 'dominio', 'public_space', 'geometria', 'Point', 'source', 'seed-vig-010'),
       'seed-capa-iglesia-public_space', '2026-11-06T12:00:00Z', '2026-11-06T12:00:00Z'
ON CONFLICT (hash) DO NOTHING;

INSERT INTO events_raw (id, type, payload, hash, occurred_at, ingested_at)
SELECT gen_random_uuid()::text, 'capa.registrada',
       jsonb_build_object('nodo_key', 'iglesia', 'key', 'public_lighting', 'dominio', 'problems', 'geometria', 'Point', 'source', 'seed-vig-010'),
       'seed-capa-iglesia-public_lighting', '2026-11-06T12:00:00Z', '2026-11-06T12:00:00Z'
ON CONFLICT (hash) DO NOTHING;

INSERT INTO events_raw (id, type, payload, hash, occurred_at, ingested_at)
SELECT gen_random_uuid()::text, 'capa.registrada',
       jsonb_build_object('nodo_key', 'iglesia', 'key', 'trees', 'dominio', 'assets', 'geometria', 'Point', 'source', 'seed-vig-010'),
       'seed-capa-iglesia-trees', '2026-11-06T12:00:00Z', '2026-11-06T12:00:00Z'
ON CONFLICT (hash) DO NOTHING;

INSERT INTO events_raw (id, type, payload, hash, occurred_at, ingested_at)
SELECT gen_random_uuid()::text, 'capa.registrada',
       jsonb_build_object('nodo_key', 'iglesia', 'key', 'sidewalks', 'dominio', 'problems', 'geometria', 'LineString', 'source', 'seed-vig-010'),
       'seed-capa-iglesia-sidewalks', '2026-11-06T12:00:00Z', '2026-11-06T12:00:00Z'
ON CONFLICT (hash) DO NOTHING;

INSERT INTO events_raw (id, type, payload, hash, occurred_at, ingested_at)
SELECT gen_random_uuid()::text, 'capa.registrada',
       jsonb_build_object('nodo_key', 'iglesia', 'key', 'irrigation_channels', 'dominio', 'assets', 'geometria', 'LineString', 'source', 'seed-vig-010'),
       'seed-capa-iglesia-irrigation_channels', '2026-11-06T12:00:00Z', '2026-11-06T12:00:00Z'
ON CONFLICT (hash) DO NOTHING;

INSERT INTO events_raw (id, type, payload, hash, occurred_at, ingested_at)
SELECT gen_random_uuid()::text, 'capa.registrada',
       jsonb_build_object('nodo_key', 'iglesia', 'key', 'obra_vial', 'dominio', 'assets', 'geometria', 'LineString', 'source', 'seed-vig-010'),
       'seed-capa-iglesia-obra_vial', '2026-11-06T12:00:00Z', '2026-11-06T12:00:00Z'
ON CONFLICT (hash) DO NOTHING;

INSERT INTO events_raw (id, type, payload, hash, occurred_at, ingested_at)
SELECT gen_random_uuid()::text, 'capa.registrada',
       jsonb_build_object('nodo_key', 'iglesia', 'key', 'punto_critico', 'dominio', 'problems', 'geometria', 'Point', 'source', 'seed-vig-010'),
       'seed-capa-iglesia-punto_critico', '2026-11-06T12:00:00Z', '2026-11-06T12:00:00Z'
ON CONFLICT (hash) DO NOTHING;

INSERT INTO events_raw (id, type, payload, hash, occurred_at, ingested_at)
SELECT gen_random_uuid()::text, 'capa.registrada',
       jsonb_build_object('nodo_key', 'iglesia', 'key', 'parada_transporte', 'dominio', 'community', 'geometria', 'Point', 'source', 'seed-vig-010'),
       'seed-capa-iglesia-parada_transporte', '2026-11-06T12:00:00Z', '2026-11-06T12:00:00Z'
ON CONFLICT (hash) DO NOTHING;

INSERT INTO events_raw (id, type, payload, hash, occurred_at, ingested_at)
SELECT gen_random_uuid()::text, 'capa.registrada',
       jsonb_build_object('nodo_key', 'iglesia', 'key', 'cobertura_sos', 'dominio', 'health', 'geometria', 'Point', 'source', 'seed-vig-010'),
       'seed-capa-iglesia-cobertura_sos', '2026-11-06T12:00:00Z', '2026-11-06T12:00:00Z'
ON CONFLICT (hash) DO NOTHING;

-- ─── Sellos fuente.registrada (4, patrón seed-fuentes-*): payload
-- {key, organismo, source}, sin PII ───
INSERT INTO events_raw (id, type, payload, hash, occurred_at, ingested_at)
SELECT gen_random_uuid()::text, 'fuente.registrada',
       jsonb_build_object('key', f.key, 'organismo', f.organismo, 'source', 'seed-vig-010'),
       'seed-fuente-' || f.key, f.created_at, f.created_at
FROM fuentes f
WHERE f.key IN ('prensa_obras_iglesia_2026_11', 'portal_paso_agua_negra', 'agregador_transporte_600_601', 'documento_vecinal_iglesia_2026_11')
ON CONFLICT (hash) DO NOTHING;
