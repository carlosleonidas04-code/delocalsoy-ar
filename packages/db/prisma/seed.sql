-- Seed territorial ADR-021 (CORE-002 T3, #65): Capital, Caucete, Iglesia.
-- Idempotente: INSERT ... SELECT ... WHERE NOT EXISTS por (nombre, provincia).
-- No usa ON CONFLICT porque (nombre, provincia) no tiene unique constraint —
-- el guard de duplicados es el NOT EXISTS. Re-ejecutar preserva activo.
-- Coordenadas referenciales de cabecera departamental (ajustables por la
-- Dirección Humana: son datos de dominio, no de implementación).
--
-- CORE-003 R2 (#83): vocabulario del demo federado (nodos/capas/categorias/
-- features/reportes), 1:1 con el vocabulario sintético v5.1 de
-- apps/web/src/demo/syntheticData.js. Idempotencia por claves únicas:
-- nodos(key), capas(nodo_id,key), categorias(nodo_id,code), reportes(hash),
-- features por id fija 'seed-f-*'. Features y reportes son datos de diseño:
-- is_synthetic = true y fuente "Ilustrativa · …" (regla de la demo: ninguna
-- fuente nombra una organización real). Poblaciones: INDEC 2022 redondeado.

INSERT INTO territorios (id, nombre, provincia, activo, geom)
SELECT gen_random_uuid()::text, 'Capital', 'San Juan', true,
       ST_SetSRID(ST_MakePoint(-68.5365, -31.5375), 4326)
WHERE NOT EXISTS (SELECT 1 FROM territorios WHERE nombre = 'Capital' AND provincia = 'San Juan');

INSERT INTO territorios (id, nombre, provincia, activo, geom)
SELECT gen_random_uuid()::text, 'Caucete', 'San Juan', true,
       ST_SetSRID(ST_MakePoint(-67.5061, -31.3864), 4326)
WHERE NOT EXISTS (SELECT 1 FROM territorios WHERE nombre = 'Caucete' AND provincia = 'San Juan');

INSERT INTO territorios (id, nombre, provincia, activo, geom)
SELECT gen_random_uuid()::text, 'Iglesia', 'San Juan', true,
       ST_SetSRID(ST_MakePoint(-69.1626, -29.6018), 4326)
WHERE NOT EXISTS (SELECT 1 FROM territorios WHERE nombre = 'Iglesia' AND provincia = 'San Juan');

-- ─── CORE-003 (#83): nodos federados del vocabulario v5.1 ───

INSERT INTO nodos (id, key, nombre, subtitle, foco, centro_lat, centro_lng, poblacion, activo)
VALUES
  (gen_random_uuid()::text, 'capital', 'Capital', 'Centro–Cívico–Desamparados', 'Comercio y espacio público', -31.537, -68.522, 115000, true),
  (gen_random_uuid()::text, 'caucete', 'Caucete', 'Departamento', 'Educación, salud y comunidad', -31.383, -68.281, 44000, true),
  (gen_random_uuid()::text, 'iglesia', 'Iglesia', 'Departamento', 'Producción y turismo', -31.206, -68.866, 8800, true)
ON CONFLICT (key) DO NOTHING;

-- ─── Capas por nodo (catálogo explícito, no inferible en frontend) ───

INSERT INTO capas (id, nodo_id, key, nombre, dominio, geometria, default_on)
VALUES
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'capital'), 'commerce', 'Comercio y servicios', 'assets', 'Point', true),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'capital'), 'public_space', 'Espacio público', 'public_space', 'Point', true),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'capital'), 'public_lighting', 'Iluminación pública', 'problems', 'Point', false),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'capital'), 'trees', 'Arbolado', 'assets', 'Point', false),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'capital'), 'sidewalks', 'Veredas y rampas', 'problems', 'LineString', false),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'capital'), 'irrigation_channels', 'Acequias y canales', 'assets', 'LineString', false),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'caucete'), 'health_facilities', 'Salud', 'health', 'Point', true),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'caucete'), 'education', 'Educación', 'community', 'Point', true),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'caucete'), 'community_spaces', 'Espacios y recursos comunitarios', 'community', 'Point', true),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'caucete'), 'resilience_points', 'Puntos de resiliencia', 'health', 'Point', false),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'caucete'), 'community_resources', 'Agua y recursos básicos', 'community', 'Point', false),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'productive_units', 'Producción y servicios (olivícola, semillas, frutos secos, frutales, hortalizas)', 'production', 'Point', true),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'rural_services', 'Caminos rurales y senderos', 'problems', 'LineString', true),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'tourism_resources', 'Turismo y patrimonio', 'tourism', 'Point', true)
ON CONFLICT (nodo_id, key) DO NOTHING;

-- ─── Categorías de reporte por nodo (vocabulario local v5.1) ───

INSERT INTO categorias (id, nodo_id, code, label, capa_id)
VALUES
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'capital'), 'insufficient_lighting', 'Iluminación insuficiente', (SELECT id FROM capas WHERE key = 'public_lighting' AND nodo_id = (SELECT id FROM nodos WHERE key = 'capital'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'capital'), 'broken_lamp', 'Luminaria averiada', (SELECT id FROM capas WHERE key = 'public_lighting' AND nodo_id = (SELECT id FROM nodos WHERE key = 'capital'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'capital'), 'dark_corridor', 'Corredor oscuro', (SELECT id FROM capas WHERE key = 'public_lighting' AND nodo_id = (SELECT id FROM nodos WHERE key = 'capital'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'capital'), 'damaged_sidewalk', 'Vereda dañada', (SELECT id FROM capas WHERE key = 'sidewalks' AND nodo_id = (SELECT id FROM nodos WHERE key = 'capital'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'capital'), 'at_risk_tree', 'Árbol en riesgo', (SELECT id FROM capas WHERE key = 'trees' AND nodo_id = (SELECT id FROM nodos WHERE key = 'capital'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'capital'), 'obstructed_channel', 'Acequia obstruida', (SELECT id FROM capas WHERE key = 'irrigation_channels' AND nodo_id = (SELECT id FROM nodos WHERE key = 'capital'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'capital'), 'inactive_business', 'Comercio sin actividad', (SELECT id FROM capas WHERE key = 'commerce' AND nodo_id = (SELECT id FROM nodos WHERE key = 'capital'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'capital'), 'damaged_public_furniture', 'Mobiliario público dañado', (SELECT id FROM capas WHERE key = 'public_space' AND nodo_id = (SELECT id FROM nodos WHERE key = 'capital'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'caucete'), 'no_transport', 'Sin transporte al centro de salud', (SELECT id FROM capas WHERE key = 'health_facilities' AND nodo_id = (SELECT id FROM nodos WHERE key = 'caucete'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'caucete'), 'long_distance', 'Distancia excesiva', (SELECT id FROM capas WHERE key = 'health_facilities' AND nodo_id = (SELECT id FROM nodos WHERE key = 'caucete'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'caucete'), 'blocked_road', 'Camino bloqueado', (SELECT id FROM capas WHERE key = 'resilience_points' AND nodo_id = (SELECT id FROM nodos WHERE key = 'caucete'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'caucete'), 'missing_meeting_point', 'Falta punto de encuentro', (SELECT id FROM capas WHERE key = 'resilience_points' AND nodo_id = (SELECT id FROM nodos WHERE key = 'caucete'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'caucete'), 'water_quality_issue', 'Problema de calidad de agua', (SELECT id FROM capas WHERE key = 'community_resources' AND nodo_id = (SELECT id FROM nodos WHERE key = 'caucete'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'caucete'), 'school_access_issue', 'Problema de acceso a escuela', (SELECT id FROM capas WHERE key = 'education' AND nodo_id = (SELECT id FROM nodos WHERE key = 'caucete'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'caucete'), 'closed_community_space', 'Espacio comunitario cerrado', (SELECT id FROM capas WHERE key = 'community_spaces' AND nodo_id = (SELECT id FROM nodos WHERE key = 'caucete'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'damaged_road', 'Camino rural dañado', (SELECT id FROM capas WHERE key = 'rural_services' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'blocked_trail', 'Sendero obstruido o dañado', (SELECT id FROM capas WHERE key = 'rural_services' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'water_shortage', 'Escasez de agua para producción', (SELECT id FROM capas WHERE key = 'productive_units' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'pest_outbreak', 'Plaga en cultivo', (SELECT id FROM capas WHERE key = 'productive_units' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'prod_semillas', 'Producción: Semillas (ajo/cebolla)', (SELECT id FROM capas WHERE key = 'productive_units' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'prod_frutos_secos', 'Producción: Frutos secos (nogales)', (SELECT id FROM capas WHERE key = 'productive_units' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'prod_frutales', 'Producción: Frutales', (SELECT id FROM capas WHERE key = 'productive_units' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'prod_hortalizas', 'Producción: Hortalizas', (SELECT id FROM capas WHERE key = 'productive_units' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'missing_signal', 'Señalización turística faltante', (SELECT id FROM capas WHERE key = 'tourism_resources' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'damaged_heritage', 'Patrimonio en riesgo', (SELECT id FROM capas WHERE key = 'tourism_resources' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia')))
ON CONFLICT (nodo_id, code) DO NOTHING;

-- ─── Features de diseño (lat/lng reales de San Juan; id fija = idempotencia) ───

INSERT INTO features (id, nodo_id, capa_id, titulo, tipo, estado, fuente_label, observado_at, lat, lng, is_synthetic)
VALUES
  ('seed-f-cap-101', (SELECT id FROM nodos WHERE key = 'capital'), (SELECT id FROM capas WHERE key = 'commerce' AND nodo_id = (SELECT id FROM nodos WHERE key = 'capital')), 'Galería comercial céntrica — 12 locales activos', 'asset', 'verified', 'Ilustrativa · registro sectorial', '2026-09-08T12:00:00Z', -31.532, -68.518, true),
  ('seed-f-cap-102', (SELECT id FROM nodos WHERE key = 'capital'), (SELECT id FROM capas WHERE key = 'public_space' AND nodo_id = (SELECT id FROM nodos WHERE key = 'capital')), 'Plaza 25 de Mayo — mobiliario en buen estado', 'asset', 'verified', 'Ilustrativa · inventario institucional', '2026-09-10T12:00:00Z', -31.538, -68.524, true),
  ('seed-f-cap-103', (SELECT id FROM nodos WHERE key = 'capital'), (SELECT id FROM capas WHERE key = 'public_lighting' AND nodo_id = (SELECT id FROM nodos WHERE key = 'capital')), 'Iluminación insuficiente en Av. San Martín', 'problem', 'community_validated', 'Ilustrativa · relevamiento comunitario', '2026-09-18T12:00:00Z', -31.535, -68.52, true),
  ('seed-f-cap-104', (SELECT id FROM nodos WHERE key = 'capital'), (SELECT id FROM capas WHERE key = 'public_lighting' AND nodo_id = (SELECT id FROM nodos WHERE key = 'capital')), 'Luminarias averiadas (3) — corredor peatonal', 'problem', 'pending', 'Ilustrativa · relevamiento comunitario', '2026-09-24T12:00:00Z', -31.54, -68.516, true),
  ('seed-f-cap-105', (SELECT id FROM nodos WHERE key = 'capital'), (SELECT id FROM capas WHERE key = 'sidewalks' AND nodo_id = (SELECT id FROM nodos WHERE key = 'capital')), 'Vereda dañada — baldosas rotas', 'problem', 'community_validated', 'Ilustrativa · relevamiento', '2026-09-19T12:00:00Z', -31.53, -68.527, true),
  ('seed-f-cap-106', (SELECT id FROM nodos WHERE key = 'capital'), (SELECT id FROM capas WHERE key = 'irrigation_channels' AND nodo_id = (SELECT id FROM nodos WHERE key = 'capital')), 'Acequia obstruida — sector norte', 'problem', 'synthetic_demo', 'Ilustrativa · institución local', '2026-10-01T12:00:00Z', -31.527, -68.521, true),
  ('seed-f-cau-101', (SELECT id FROM nodos WHERE key = 'caucete'), (SELECT id FROM capas WHERE key = 'education' AND nodo_id = (SELECT id FROM nodos WHERE key = 'caucete')), 'Escuela primaria con matrícula estable', 'asset', 'verified', 'Ilustrativa · inventario institucional', '2026-09-09T12:00:00Z', -31.38, -68.277, true),
  ('seed-f-cau-102', (SELECT id FROM nodos WHERE key = 'caucete'), (SELECT id FROM capas WHERE key = 'community_spaces' AND nodo_id = (SELECT id FROM nodos WHERE key = 'caucete')), 'Biblioteca popular municipal — horario reducido', 'asset', 'community_validated', 'Ilustrativa · relevamiento comunitario', '2026-09-18T12:00:00Z', -31.386, -68.284, true),
  ('seed-f-cau-103', (SELECT id FROM nodos WHERE key = 'caucete'), (SELECT id FROM capas WHERE key = 'health_facilities' AND nodo_id = (SELECT id FROM nodos WHERE key = 'caucete')), 'Sin transporte al centro de salud (sector oeste)', 'problem', 'community_validated', 'Ilustrativa · relevamiento comunitario', '2026-09-16T12:00:00Z', -31.376, -68.29, true),
  ('seed-f-cau-104', (SELECT id FROM nodos WHERE key = 'caucete'), (SELECT id FROM capas WHERE key = 'resilience_points' AND nodo_id = (SELECT id FROM nodos WHERE key = 'caucete')), 'Camino bloqueado tras tormenta', 'problem', 'community_validated', 'Ilustrativa · reporte vecinal', '2026-09-21T12:00:00Z', -31.39, -68.272, true),
  ('seed-f-cau-105', (SELECT id FROM nodos WHERE key = 'caucete'), (SELECT id FROM capas WHERE key = 'community_resources' AND nodo_id = (SELECT id FROM nodos WHERE key = 'caucete')), 'Acceso a agua comunitaria irregular', 'problem', 'community_validated', 'Ilustrativa · relevamiento comunitario', '2026-09-17T12:00:00Z', -31.372, -68.266, true),
  ('seed-f-igl-101', (SELECT id FROM nodos WHERE key = 'iglesia'), (SELECT id FROM capas WHERE key = 'productive_units' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia')), 'Producción de semillas — ajo y cebolla', 'asset', 'verified', 'Ilustrativa · productor', '2026-09-15T12:00:00Z', -31.202, -68.86, true),
  ('seed-f-igl-102', (SELECT id FROM nodos WHERE key = 'iglesia'), (SELECT id FROM capas WHERE key = 'productive_units' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia')), 'Viñal en producción — variedad autóctona', 'asset', 'verified', 'Ilustrativa · cooperativa', '2026-09-11T12:00:00Z', -31.21, -68.872, true),
  ('seed-f-igl-103', (SELECT id FROM nodos WHERE key = 'iglesia'), (SELECT id FROM capas WHERE key = 'productive_units' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia')), 'Plaga en cultivo de vid — sector sur', 'problem', 'pending', 'Ilustrativa · productor', '2026-09-22T12:00:00Z', -31.214, -68.862, true),
  ('seed-f-igl-104', (SELECT id FROM nodos WHERE key = 'iglesia'), (SELECT id FROM capas WHERE key = 'rural_services' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia')), 'Camino rural con erosión hídrica — tramo crítico', 'problem', 'community_validated', 'Ilustrativa · productor', '2026-09-20T12:00:00Z', -31.199, -68.88, true),
  ('seed-f-igl-105', (SELECT id FROM nodos WHERE key = 'iglesia'), (SELECT id FROM capas WHERE key = 'tourism_resources' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia')), 'Señalización turística faltante', 'problem', 'community_validated', 'Ilustrativa · relevamiento comunitario', '2026-09-18T12:00:00Z', -31.205, -68.855, true),
  ('seed-f-igl-106', (SELECT id FROM nodos WHERE key = 'iglesia'), (SELECT id FROM capas WHERE key = 'tourism_resources' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia')), 'Capilla histórica con visitas guiadas', 'asset', 'verified', 'Ilustrativa · inventario institucional', '2026-09-09T12:00:00Z', -31.208, -68.848, true)
ON CONFLICT (id) DO NOTHING;

-- ─── Reportes demo (hash fijo = idempotencia; flujo received → resolved) ───

INSERT INTO reportes (id, nodo_id, categoria, descripcion, estado, lat, lng, is_synthetic, hash, created_at, updated_at)
VALUES
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'capital'), 'insufficient_lighting', 'Corredor oscuro frente a plaza', 'received', -31.536, -68.523, true, 'seed-reporte-capital-1', '2026-10-01T12:00:00Z', '2026-10-01T12:00:00Z'),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'capital'), 'broken_lamp', 'Luminaria averiada en Galería céntrica', 'evaluating', -31.533, -68.519, true, 'seed-reporte-capital-2', '2026-10-01T12:00:00Z', '2026-10-01T12:00:00Z'),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'caucete'), 'blocked_road', 'Camino rural bloqueado tras tormenta', 'received', -31.381, -68.279, true, 'seed-reporte-caucete-1', '2026-10-01T12:00:00Z', '2026-10-01T12:00:00Z'),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'caucete'), 'long_distance', 'Distancia excesiva al centro de salud', 'evaluating', -31.377, -68.286, true, 'seed-reporte-caucete-2', '2026-10-01T12:00:00Z', '2026-10-01T12:00:00Z'),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'damaged_road', 'Camino de acceso a finca dañado', 'received', -31.204, -68.864, true, 'seed-reporte-iglesia-1', '2026-10-01T12:00:00Z', '2026-10-01T12:00:00Z'),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'pest_outbreak', 'Plaga detectada en cultivo de vid', 'in_progress', -31.209, -68.858, true, 'seed-reporte-iglesia-2', '2026-10-01T12:00:00Z', '2026-10-01T12:00:00Z')
ON CONFLICT (hash) DO NOTHING;
