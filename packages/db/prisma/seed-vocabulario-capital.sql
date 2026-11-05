-- Seed NODO-CAPITAL NCAP-R1 (#153, épica #152): vocabulario del nodo Capital
-- — capas, categorías y features seed. Análogo de NODO-CAU R1 (#141).
-- Decisiones ratificadas por la DH (2026-11-05, «cascada NODO-CAPITAL»):
-- (1) capa nueva accessibility COMPLEMENTARIA: rampas/cruces/obstáculos
--     como PUNTOS (la fecha+método+estado de revisión llegan con NCAP-R5
--     #157); los tramos peatonales siguen en sidewalks (LineString) —
--     SIN duplicar geometría: los tramos de R5 se anclarán a sidewalks;
-- (2) capa nueva landmarks con los hitos del documento de la DH, alineada
--     al catálogo global corredor_hitos (NCAP-R4 #156): cada feature lleva
--     el key del hito en su id (seed-f-<hito_key>) — alineación estructural;
-- (3) categorías de reporte alineadas a los dominios del documento:
--     movilidad (accessibility) y espacio público (landmarks).
-- R15/ADR-035: TODO feature es sintético/ilustrativo (is_synthetic=true,
-- fuente «Ilustrativa · …», estado synthetic_demo) hasta validación; ningún
-- nombre/delimitación barrial se presenta como oficial. Los 4 hitos NUEVOS
-- del catálogo global nacen lat/lng NULL (R15: sin punto verificado no se
-- publica) — el feature sintético es ilustrativo, jamás coordenada oficial.
-- Idempotencia: ON CONFLICT DO NOTHING por (nodo_id,key) de capas,
-- (nodo_id,code) de categorías, (key) de corredor_hitos e (id) de features;
-- sellos en events_raw por hash único (patrón seed-fuentes/seed-corredores).

-- ─── Capas nuevas del nodo Capital (v5.1 + 2) ───
INSERT INTO capas (id, nodo_id, key, nombre, dominio, geometria, default_on)
VALUES
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'capital'), 'accessibility', 'Accesibilidad peatonal: veredas, rampas y cruces', 'problems', 'Point', false),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'capital'), 'landmarks', 'Hitos y equipamientos', 'assets', 'Point', true)
ON CONFLICT (nodo_id, key) DO NOTHING;

-- ─── Categorías de reporte nuevas (movilidad + espacio público) ───
INSERT INTO categorias (id, nodo_id, code, label, capa_id)
VALUES
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'capital'), 'missing_ramp', 'Falta rampa de accesibilidad', (SELECT id FROM capas WHERE key = 'accessibility' AND nodo_id = (SELECT id FROM nodos WHERE key = 'capital'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'capital'), 'obstructed_sidewalk', 'Vereda obstruida o intransitable', (SELECT id FROM capas WHERE key = 'accessibility' AND nodo_id = (SELECT id FROM nodos WHERE key = 'capital'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'capital'), 'unsafe_crossing', 'Cruce peatonal inseguro', (SELECT id FROM capas WHERE key = 'accessibility' AND nodo_id = (SELECT id FROM nodos WHERE key = 'capital'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'capital'), 'damaged_landmark', 'Hito o equipamiento dañado', (SELECT id FROM capas WHERE key = 'landmarks' AND nodo_id = (SELECT id FROM nodos WHERE key = 'capital'))),
ON CONFLICT (nodo_id, code) DO NOTHING;

-- ─── 4 hitos nuevos del catálogo global (patrón NCAP-R4 #156) ───
INSERT INTO corredor_hitos (id, key, nodo_key, label, tipo, lat, lng, notas, created_at)
VALUES
  (gen_random_uuid()::text, 'hit_plaza_25_de_mayo', 'capital', 'Plaza 25 de Mayo', 'plaza', NULL, NULL, 'Núcleo fundacional del microcentro — hito NCAP-R1 (#153), punto a verificar (R15)', '2026-11-05T12:00:00Z'),
  (gen_random_uuid()::text, 'hit_catedral', 'capital', 'Catedral de San Juan', 'edificio_publico', NULL, NULL, 'Catedral metropolitana sobre el eje fundacional — hito NCAP-R1 (#153), punto a verificar (R15)', '2026-11-05T12:00:00Z'),
  (gen_random_uuid()::text, 'hit_casa_natal_sarmiento', 'capital', 'Casa Natal de Sarmiento', 'edificio_publico', NULL, NULL, 'Museo histórico — casa natal de Domingo F. Sarmiento — hito NCAP-R1 (#153), punto a verificar (R15)', '2026-11-05T12:00:00Z'),
  (gen_random_uuid()::text, 'hit_basilica_desamparados', 'capital', 'Basílica de Desamparados', 'edificio_publico', NULL, NULL, 'Basílica junto a la plaza Salvador María del Carril (hit_plaza_desamparados) — hito NCAP-R1 (#153), punto a verificar (R15)', '2026-11-05T12:00:00Z'),
ON CONFLICT (key) DO NOTHING;

-- ─── Features seed (13): 9 hitos (landmarks) + 4 accesibilidad ───
-- id fija = idempotencia. Los hitos llevan su key en el id (seed-f-<hito_key>).
INSERT INTO features (id, nodo_id, capa_id, titulo, tipo, estado, fuente_label, observado_at, lat, lng, is_synthetic)
VALUES
  ('seed-f-hit_plaza_25_de_mayo', (SELECT id FROM nodos WHERE key = 'capital'), (SELECT id FROM capas WHERE key = 'landmarks' AND nodo_id = (SELECT id FROM nodos WHERE key = 'capital')), 'Plaza 25 de Mayo — núcleo fundacional', 'asset', 'synthetic_demo', 'Ilustrativa · catálogo de hitos v0.1', '2026-11-05T12:00:00Z', -31.538, -68.5365, true),
  ('seed-f-hit_catedral', (SELECT id FROM nodos WHERE key = 'capital'), (SELECT id FROM capas WHERE key = 'landmarks' AND nodo_id = (SELECT id FROM nodos WHERE key = 'capital')), 'Catedral de San Juan — eje fundacional', 'asset', 'synthetic_demo', 'Ilustrativa · catálogo de hitos v0.1', '2026-11-05T12:00:00Z', -31.5383, -68.5352, true),
  ('seed-f-hit_casa_natal_sarmiento', (SELECT id FROM nodos WHERE key = 'capital'), (SELECT id FROM capas WHERE key = 'landmarks' AND nodo_id = (SELECT id FROM nodos WHERE key = 'capital')), 'Casa Natal de Domingo F. Sarmiento', 'asset', 'synthetic_demo', 'Ilustrativa · catálogo de hitos v0.1', '2026-11-05T12:00:00Z', -31.533, -68.534, true),
  ('seed-f-hit_centro_civico', (SELECT id FROM nodos WHERE key = 'capital'), (SELECT id FROM capas WHERE key = 'landmarks' AND nodo_id = (SELECT id FROM nodos WHERE key = 'capital')), 'Centro Cívico provincial', 'asset', 'synthetic_demo', 'Ilustrativa · catálogo de hitos v0.1', '2026-11-05T12:00:00Z', -31.541, -68.538, true),
  ('seed-f-hit_teatro_plaza_bicentenario', (SELECT id FROM nodos WHERE key = 'capital'), (SELECT id FROM capas WHERE key = 'landmarks' AND nodo_id = (SELECT id FROM nodos WHERE key = 'capital')), 'Teatro del Bicentenario', 'asset', 'synthetic_demo', 'Ilustrativa · catálogo de hitos v0.1', '2026-11-05T12:00:00Z', -31.542, -68.535, true),
  ('seed-f-hit_parque_de_mayo', (SELECT id FROM nodos WHERE key = 'capital'), (SELECT id FROM capas WHERE key = 'landmarks' AND nodo_id = (SELECT id FROM nodos WHERE key = 'capital')), 'Parque de Mayo', 'asset', 'synthetic_demo', 'Ilustrativa · catálogo de hitos v0.1', '2026-11-05T12:00:00Z', -31.544, -68.539, true),
  ('seed-f-hit_facultad_ingenieria', (SELECT id FROM nodos WHERE key = 'capital'), (SELECT id FROM capas WHERE key = 'landmarks' AND nodo_id = (SELECT id FROM nodos WHERE key = 'capital')), 'Facultad de Ingeniería (UNSJ)', 'asset', 'synthetic_demo', 'Ilustrativa · catálogo de hitos v0.1', '2026-11-05T12:00:00Z', -31.529, -68.548, true),
  ('seed-f-hit_plaza_desamparados', (SELECT id FROM nodos WHERE key = 'capital'), (SELECT id FROM capas WHERE key = 'landmarks' AND nodo_id = (SELECT id FROM nodos WHERE key = 'capital')), 'Plaza Salvador María del Carril (Desamparados)', 'asset', 'synthetic_demo', 'Ilustrativa · catálogo de hitos v0.1', '2026-11-05T12:00:00Z', -31.529, -68.554, true),
  ('seed-f-hit_basilica_desamparados', (SELECT id FROM nodos WHERE key = 'capital'), (SELECT id FROM capas WHERE key = 'landmarks' AND nodo_id = (SELECT id FROM nodos WHERE key = 'capital')), 'Basílica de Desamparados', 'asset', 'synthetic_demo', 'Ilustrativa · catálogo de hitos v0.1', '2026-11-05T12:00:00Z', -31.5294, -68.5562, true),
  ('seed-f-acc-201', (SELECT id FROM nodos WHERE key = 'capital'), (SELECT id FROM capas WHERE key = 'accessibility' AND nodo_id = (SELECT id FROM nodos WHERE key = 'capital')), 'Cruce peatonal con rampa y rebaje — eje cívico', 'asset', 'synthetic_demo', 'Ilustrativa · relevamiento comunitario', '2026-11-05T12:00:00Z', -31.539, -68.533, true),
  ('seed-f-acc-202', (SELECT id FROM nodos WHERE key = 'capital'), (SELECT id FROM capas WHERE key = 'accessibility' AND nodo_id = (SELECT id FROM nodos WHERE key = 'capital')), 'Falta rampa — esquina sin rebaje (corredor peatonal)', 'problem', 'synthetic_demo', 'Ilustrativa · relevamiento comunitario', '2026-11-05T12:00:00Z', -31.535, -68.521, true),
  ('seed-f-acc-203', (SELECT id FROM nodos WHERE key = 'capital'), (SELECT id FROM capas WHERE key = 'accessibility' AND nodo_id = (SELECT id FROM nodos WHERE key = 'capital')), 'Vereda obstruida — postes en la senda peatonal', 'problem', 'synthetic_demo', 'Ilustrativa · relevamiento comunitario', '2026-11-05T12:00:00Z', -31.531, -68.526, true),
  ('seed-f-acc-204', (SELECT id FROM nodos WHERE key = 'capital'), (SELECT id FROM capas WHERE key = 'accessibility' AND nodo_id = (SELECT id FROM nodos WHERE key = 'capital')), 'Cruce peatonal sin semáforo — acceso al Parque de Mayo', 'problem', 'synthetic_demo', 'Ilustrativa · relevamiento comunitario', '2026-11-05T12:00:00Z', -31.532, -68.544, true),
ON CONFLICT (id) DO NOTHING;

-- ─── Sellos (patrón seed-fuentes/seed-corredores: events_raw única fuente de verdad) ───
INSERT INTO events_raw (id, type, payload, hash, occurred_at, ingested_at)
SELECT gen_random_uuid()::text, 'capa.registrada',
       jsonb_build_object('nodo_key', 'capital', 'key', 'accessibility', 'dominio', 'problems', 'geometria', 'Point', 'source', 'seed-ncap-r1'),
       'seed-capa-capital-accessibility', '2026-11-05T12:00:00Z', '2026-11-05T12:00:00Z'
ON CONFLICT (hash) DO NOTHING;

INSERT INTO events_raw (id, type, payload, hash, occurred_at, ingested_at)
SELECT gen_random_uuid()::text, 'capa.registrada',
       jsonb_build_object('nodo_key', 'capital', 'key', 'landmarks', 'dominio', 'assets', 'geometria', 'Point', 'source', 'seed-ncap-r1'),
       'seed-capa-capital-landmarks', '2026-11-05T12:00:00Z', '2026-11-05T12:00:00Z'
ON CONFLICT (hash) DO NOTHING;

INSERT INTO events_raw (id, type, payload, hash, occurred_at, ingested_at)
SELECT gen_random_uuid()::text, 'hito.registrado',
       jsonb_build_object('nodo_key', h.nodo_key, 'key', h.key, 'label', h.label, 'tipo', h.tipo, 'source', 'seed-ncap-r1'),
       'seed-hito-' || h.key, '2026-11-05T12:00:00Z', '2026-11-05T12:00:00Z'
FROM corredor_hitos h
WHERE h.key IN ('hit_plaza_25_de_mayo', 'hit_catedral', 'hit_casa_natal_sarmiento', 'hit_basilica_desamparados')
ON CONFLICT (hash) DO NOTHING;
