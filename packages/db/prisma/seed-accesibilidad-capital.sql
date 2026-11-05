-- Seed NODO-CAPITAL NCAP-R5 (#157, épica #152): capa inicial de accesibilidad
-- peatonal del nodo Capital + insumos del dashboard público. Análogo de
-- seed-vocabulario-capital.sql (NCAP-R1 #153). Decisiones ratificadas por
-- la DH (2026-11-05, «cascada NODO-CAPITAL»):
-- (1) tramos de vereda ANCLADOS a la capa sidewalks (los tramos LineString
--     siguen en sidewalks — sin duplicar geometría); la categoría nueva
--     tramo_priorizado registra los 18 tramos del anuncio municipal de
--     repavimentación del microcentro 2026 (fuente
--     repavimentacion_microcentro_2026, NCAP-R3 #155): 14 N-S + 4
--     perimetrales, estado declared — ANUNCIO ≠ OBRA: el estado por tramo
--     exige verificación municipal (R15); coordenadas ilustrativas dentro
--     del rectángulo anunciado, is_synthetic=true — jamás coordenada oficial;
-- (2) observaciones de accesibilidad (capa accessibility, NCAP-R1 #153):
--     cada registro con fecha (observado_at), método (fuente_label) y
--     estado de revisión — 6 observaciones seed sintéticas que ejercen el
--     workflow: pending (ingresada), community_validated (revisada),
--     verified (corroborada) y disputed (disputada — estado nuevo R5);
-- (3) el dashboard (GET /api/nodos/:key/accesibilidad) publica conteos CON
--     cobertura y fecha, NUNCA puntajes globales (R5/ADR-036).
-- R15/ADR-035: TODO feature es sintético/ilustrativo hasta validación.
-- Idempotencia: ON CONFLICT DO NOTHING por (nodo_id,code) de categorías e
-- (id) de features; sellos en events_raw por hash único (patrón seed-*).

-- ─── Categoría nueva: tramo_priorizado (capa sidewalks) ───
INSERT INTO categorias (id, nodo_id, code, label, capa_id)
VALUES
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'capital'), 'tramo_priorizado', 'Tramo de vereda priorizado (repavimentación anunciada)', (SELECT id FROM capas WHERE key = 'sidewalks' AND nodo_id = (SELECT id FROM nodos WHERE key = 'capital')))
ON CONFLICT (nodo_id, code) DO NOTHING;

-- ─── 18 tramos declarados del anuncio (14 N-S + 4 perimetrales) ───
INSERT INTO features (id, nodo_id, capa_id, titulo, tipo, estado, fuente_label, observado_at, lat, lng, is_synthetic)
VALUES
  ('seed-f-tramo-01', (SELECT id FROM nodos WHERE key = 'capital'), (SELECT id FROM capas WHERE key = 'sidewalks' AND nodo_id = (SELECT id FROM nodos WHERE key = 'capital')), 'Tramo de vereda priorizado N-S 01 — repavimentación anunciada (microcentro)', 'problem', 'declared', 'Ilustrativa · anuncio de repavimentación microcentro 2026', '2026-11-05T12:00:00Z', -31.5352, -68.5348, true),
  ('seed-f-tramo-02', (SELECT id FROM nodos WHERE key = 'capital'), (SELECT id FROM capas WHERE key = 'sidewalks' AND nodo_id = (SELECT id FROM nodos WHERE key = 'capital')), 'Tramo de vereda priorizado N-S 02 — repavimentación anunciada (microcentro)', 'problem', 'declared', 'Ilustrativa · anuncio de repavimentación microcentro 2026', '2026-11-05T12:00:00Z', -31.5352, -68.5339, true),
  ('seed-f-tramo-03', (SELECT id FROM nodos WHERE key = 'capital'), (SELECT id FROM capas WHERE key = 'sidewalks' AND nodo_id = (SELECT id FROM nodos WHERE key = 'capital')), 'Tramo de vereda priorizado N-S 03 — repavimentación anunciada (microcentro)', 'problem', 'declared', 'Ilustrativa · anuncio de repavimentación microcentro 2026', '2026-11-05T12:00:00Z', -31.5352, -68.533, true),
  ('seed-f-tramo-04', (SELECT id FROM nodos WHERE key = 'capital'), (SELECT id FROM capas WHERE key = 'sidewalks' AND nodo_id = (SELECT id FROM nodos WHERE key = 'capital')), 'Tramo de vereda priorizado N-S 04 — repavimentación anunciada (microcentro)', 'problem', 'declared', 'Ilustrativa · anuncio de repavimentación microcentro 2026', '2026-11-05T12:00:00Z', -31.5352, -68.5321, true),
  ('seed-f-tramo-05', (SELECT id FROM nodos WHERE key = 'capital'), (SELECT id FROM capas WHERE key = 'sidewalks' AND nodo_id = (SELECT id FROM nodos WHERE key = 'capital')), 'Tramo de vereda priorizado N-S 05 — repavimentación anunciada (microcentro)', 'problem', 'declared', 'Ilustrativa · anuncio de repavimentación microcentro 2026', '2026-11-05T12:00:00Z', -31.5352, -68.5312, true),
  ('seed-f-tramo-06', (SELECT id FROM nodos WHERE key = 'capital'), (SELECT id FROM capas WHERE key = 'sidewalks' AND nodo_id = (SELECT id FROM nodos WHERE key = 'capital')), 'Tramo de vereda priorizado N-S 06 — repavimentación anunciada (microcentro)', 'problem', 'declared', 'Ilustrativa · anuncio de repavimentación microcentro 2026', '2026-11-05T12:00:00Z', -31.5352, -68.5303, true),
  ('seed-f-tramo-07', (SELECT id FROM nodos WHERE key = 'capital'), (SELECT id FROM capas WHERE key = 'sidewalks' AND nodo_id = (SELECT id FROM nodos WHERE key = 'capital')), 'Tramo de vereda priorizado N-S 07 — repavimentación anunciada (microcentro)', 'problem', 'declared', 'Ilustrativa · anuncio de repavimentación microcentro 2026', '2026-11-05T12:00:00Z', -31.5352, -68.5294, true),
  ('seed-f-tramo-08', (SELECT id FROM nodos WHERE key = 'capital'), (SELECT id FROM capas WHERE key = 'sidewalks' AND nodo_id = (SELECT id FROM nodos WHERE key = 'capital')), 'Tramo de vereda priorizado N-S 08 — repavimentación anunciada (microcentro)', 'problem', 'declared', 'Ilustrativa · anuncio de repavimentación microcentro 2026', '2026-11-05T12:00:00Z', -31.5363, -68.5348, true),
  ('seed-f-tramo-09', (SELECT id FROM nodos WHERE key = 'capital'), (SELECT id FROM capas WHERE key = 'sidewalks' AND nodo_id = (SELECT id FROM nodos WHERE key = 'capital')), 'Tramo de vereda priorizado N-S 09 — repavimentación anunciada (microcentro)', 'problem', 'declared', 'Ilustrativa · anuncio de repavimentación microcentro 2026', '2026-11-05T12:00:00Z', -31.5363, -68.5339, true),
  ('seed-f-tramo-10', (SELECT id FROM nodos WHERE key = 'capital'), (SELECT id FROM capas WHERE key = 'sidewalks' AND nodo_id = (SELECT id FROM nodos WHERE key = 'capital')), 'Tramo de vereda priorizado N-S 10 — repavimentación anunciada (microcentro)', 'problem', 'declared', 'Ilustrativa · anuncio de repavimentación microcentro 2026', '2026-11-05T12:00:00Z', -31.5363, -68.533, true),
  ('seed-f-tramo-11', (SELECT id FROM nodos WHERE key = 'capital'), (SELECT id FROM capas WHERE key = 'sidewalks' AND nodo_id = (SELECT id FROM nodos WHERE key = 'capital')), 'Tramo de vereda priorizado N-S 11 — repavimentación anunciada (microcentro)', 'problem', 'declared', 'Ilustrativa · anuncio de repavimentación microcentro 2026', '2026-11-05T12:00:00Z', -31.5363, -68.5321, true),
  ('seed-f-tramo-12', (SELECT id FROM nodos WHERE key = 'capital'), (SELECT id FROM capas WHERE key = 'sidewalks' AND nodo_id = (SELECT id FROM nodos WHERE key = 'capital')), 'Tramo de vereda priorizado N-S 12 — repavimentación anunciada (microcentro)', 'problem', 'declared', 'Ilustrativa · anuncio de repavimentación microcentro 2026', '2026-11-05T12:00:00Z', -31.5363, -68.5312, true),
  ('seed-f-tramo-13', (SELECT id FROM nodos WHERE key = 'capital'), (SELECT id FROM capas WHERE key = 'sidewalks' AND nodo_id = (SELECT id FROM nodos WHERE key = 'capital')), 'Tramo de vereda priorizado N-S 13 — repavimentación anunciada (microcentro)', 'problem', 'declared', 'Ilustrativa · anuncio de repavimentación microcentro 2026', '2026-11-05T12:00:00Z', -31.5363, -68.5303, true),
  ('seed-f-tramo-14', (SELECT id FROM nodos WHERE key = 'capital'), (SELECT id FROM capas WHERE key = 'sidewalks' AND nodo_id = (SELECT id FROM nodos WHERE key = 'capital')), 'Tramo de vereda priorizado N-S 14 — repavimentación anunciada (microcentro)', 'problem', 'declared', 'Ilustrativa · anuncio de repavimentación microcentro 2026', '2026-11-05T12:00:00Z', -31.5363, -68.5294, true),
  ('seed-f-tramo-p01', (SELECT id FROM nodos WHERE key = 'capital'), (SELECT id FROM capas WHERE key = 'sidewalks' AND nodo_id = (SELECT id FROM nodos WHERE key = 'capital')), 'Tramo de vereda priorizado perimetral 01 — repavimentación anunciada (microcentro)', 'problem', 'declared', 'Ilustrativa · anuncio de repavimentación microcentro 2026', '2026-11-05T12:00:00Z', -31.5335, -68.5362, true),
  ('seed-f-tramo-p02', (SELECT id FROM nodos WHERE key = 'capital'), (SELECT id FROM capas WHERE key = 'sidewalks' AND nodo_id = (SELECT id FROM nodos WHERE key = 'capital')), 'Tramo de vereda priorizado perimetral 02 — repavimentación anunciada (microcentro)', 'problem', 'declared', 'Ilustrativa · anuncio de repavimentación microcentro 2026', '2026-11-05T12:00:00Z', -31.5335, -68.529, true),
  ('seed-f-tramo-p03', (SELECT id FROM nodos WHERE key = 'capital'), (SELECT id FROM capas WHERE key = 'sidewalks' AND nodo_id = (SELECT id FROM nodos WHERE key = 'capital')), 'Tramo de vereda priorizado perimetral 03 — repavimentación anunciada (microcentro)', 'problem', 'declared', 'Ilustrativa · anuncio de repavimentación microcentro 2026', '2026-11-05T12:00:00Z', -31.5378, -68.5362, true),
  ('seed-f-tramo-p04', (SELECT id FROM nodos WHERE key = 'capital'), (SELECT id FROM capas WHERE key = 'sidewalks' AND nodo_id = (SELECT id FROM nodos WHERE key = 'capital')), 'Tramo de vereda priorizado perimetral 04 — repavimentación anunciada (microcentro)', 'problem', 'declared', 'Ilustrativa · anuncio de repavimentación microcentro 2026', '2026-11-05T12:00:00Z', -31.5378, -68.529, true)
ON CONFLICT (id) DO NOTHING;

-- ─── 6 observaciones de accesibilidad (workflow de revisión) ───
INSERT INTO features (id, nodo_id, capa_id, titulo, tipo, estado, fuente_label, observado_at, lat, lng, is_synthetic)
VALUES
  ('seed-f-acc-301', (SELECT id FROM nodos WHERE key = 'capital'), (SELECT id FROM capas WHERE key = 'accessibility' AND nodo_id = (SELECT id FROM nodos WHERE key = 'capital')), 'Falta rampa — esquina sin rebaje (acceso Centro Cívico)', 'problem', 'pending', 'Ilustrativa · relevamiento comunitario', '2026-11-05T12:00:00Z', -31.5397, -68.5371, true),
  ('seed-f-acc-302', (SELECT id FROM nodos WHERE key = 'capital'), (SELECT id FROM capas WHERE key = 'accessibility' AND nodo_id = (SELECT id FROM nodos WHERE key = 'capital')), 'Cruce peatonal sin semáforo — eje comercial Av. San Martín', 'problem', 'pending', 'Ilustrativa · relevamiento comunitario', '2026-11-05T12:00:00Z', -31.5341, -68.5218, true),
  ('seed-f-acc-303', (SELECT id FROM nodos WHERE key = 'capital'), (SELECT id FROM capas WHERE key = 'accessibility' AND nodo_id = (SELECT id FROM nodos WHERE key = 'capital')), 'Vereda obstruida — postes en la senda peatonal', 'problem', 'community_validated', 'Ilustrativa · relevamiento comunitario', '2026-11-05T12:00:00Z', -31.5312, -68.5263, true),
  ('seed-f-acc-304', (SELECT id FROM nodos WHERE key = 'capital'), (SELECT id FROM capas WHERE key = 'accessibility' AND nodo_id = (SELECT id FROM nodos WHERE key = 'capital')), 'Rampa con rebaje deteriorado — paso peatonal', 'problem', 'community_validated', 'Ilustrativa · relevamiento comunitario', '2026-11-05T12:00:00Z', -31.5362, -68.5329, true),
  ('seed-f-acc-305', (SELECT id FROM nodos WHERE key = 'capital'), (SELECT id FROM capas WHERE key = 'accessibility' AND nodo_id = (SELECT id FROM nodos WHERE key = 'capital')), 'Cruce peatonal con rampa y rebaje conforme — eje cívico', 'asset', 'verified', 'Ilustrativa · relevamiento comunitario', '2026-11-05T12:00:00Z', -31.5389, -68.5333, true),
  ('seed-f-acc-306', (SELECT id FROM nodos WHERE key = 'capital'), (SELECT id FROM capas WHERE key = 'accessibility' AND nodo_id = (SELECT id FROM nodos WHERE key = 'capital')), 'Obstáculo en disputa — veredón sin senda peatonal demarcada', 'problem', 'disputed', 'Ilustrativa · relevamiento comunitario', '2026-11-05T12:00:00Z', -31.5356, -68.5241, true)
ON CONFLICT (id) DO NOTHING;

-- ─── Sellos (events_raw única fuente de verdad, sin PII) ───
INSERT INTO events_raw (id, type, payload, hash, occurred_at, ingested_at)
SELECT gen_random_uuid()::text, 'accesibilidad.tramos_priorizados',
       jsonb_build_object('nodo_key', 'capital', 'total', 18, 'fuente_key', 'repavimentacion_microcentro_2026', 'cautela', 'anuncio != obra: estado por tramo exige verificacion municipal', 'source', 'seed-ncap-r5'),
       'seed-tramos-capital', '2026-11-05T12:00:00Z', '2026-11-05T12:00:00Z'
ON CONFLICT (hash) DO NOTHING;

INSERT INTO events_raw (id, type, payload, hash, occurred_at, ingested_at)
SELECT gen_random_uuid()::text, 'accesibilidad.observaciones_seed',
       jsonb_build_object('nodo_key', 'capital', 'total', 6, 'estados', jsonb_build_array('pending','pending','community_validated','community_validated','verified','disputed'), 'source', 'seed-ncap-r5'),
       'seed-acc-observaciones-capital', '2026-11-05T12:00:00Z', '2026-11-05T12:00:00Z'
ON CONFLICT (hash) DO NOTHING;
