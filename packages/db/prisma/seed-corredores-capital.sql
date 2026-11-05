-- Seed NODO-CAPITAL NCAP-R4 (#156, épica #152): red de corredores v0.1
-- del nodo Capital. Corredores como RED MODELADA (grafo relacional:
-- corredor → segmentos from/to tipados → hitos/subnodos vinculados), no
-- líneas dibujadas. Decisiones de diseño ratificadas por la Dirección
-- Humana (2026-11-04, análisis recursivo-heurístico «NCAP-R4 (#156)»):
-- (1) entidad nueva Prisma — features es Point-only y no alberga el
-- grafo; (2) segmentos from/to tipados con secuencia, modos, observaciones
-- de superficie/cruces, observed_at y fuentes por tramo (ADR-035), SIN
-- geometría en v0.1; (3) solo lectura pública — los corredores son
-- hipótesis de diseño DH, no input ciudadano.
-- R15: los 5 corredores nacen 'candidate' — HIPÓTESIS, trazas NO
-- oficiales (vocabulario cor_* v0.1). Hitos SIN asignación distrital
-- (regla de modelado #154: participan por relaciones connects/near) y
-- lat/lng NULL honestos: sin punto verificado no se publica.
-- Idempotencia: ON CONFLICT (key)/(corredor_id, secuencia) DO NOTHING;
-- sellos en events_raw por hash único 'seed-corredor-<key>'.

INSERT INTO corredores (id, key, nodo_key, label, proposito, status, created_at, updated_at)
VALUES
  (gen_random_uuid()::text, 'cor_centro_civico', 'capital', 'Corredor Centro Cívico', 'Articular el eje cívico entre el Complejo del Bicentenario, el Centro Cívico y el Parque de Mayo como centralidad administrativa y cultural (hipótesis v0.1, #156)', 'candidate', '2026-11-04T12:00:00Z', '2026-11-04T12:00:00Z'),
  (gen_random_uuid()::text, 'cor_libertador_west', 'capital', 'Corredor Libertador Oeste', 'Enlazar el Parque de Mayo con la Facultad de Ingeniería (UNSJ) y la plaza de Desamparados sobre el eje de Av. Libertador Oeste (hipótesis v0.1, #156)', 'candidate', '2026-11-04T12:00:00Z', '2026-11-04T12:00:00Z'),
  (gen_random_uuid()::text, 'cor_centro_desamparados', 'capital', 'Corredor Centro–Desamparados', 'Relacionar el distrito Centro con el distrito Desamparados como continuum urbano del Gran San Juan (hipótesis v0.1, #156)', 'candidate', '2026-11-04T12:00:00Z', '2026-11-04T12:00:00Z'),
  (gen_random_uuid()::text, 'cor_centro_micro_macro', 'capital', 'Corredor micro/macrocentro', 'Modelar la transición entre el microcentro (área analítica PEC) y el macrocentro como gradiente de centralidad (hipótesis v0.1, #156)', 'candidate', '2026-11-04T12:00:00Z', '2026-11-04T12:00:00Z'),
  (gen_random_uuid()::text, 'cor_redtulum_centro', 'capital', 'Corredor Red Tulum–Centro', 'Referenciar el corredor de transporte público Red Tulum hacia el área central — solo referencias hasta la ingesta GTFS (hipótesis v0.1, #156)', 'candidate', '2026-11-04T12:00:00Z', '2026-11-04T12:00:00Z')
ON CONFLICT (key) DO NOTHING;

INSERT INTO corredor_hitos (id, key, nodo_key, label, tipo, lat, lng, notas, created_at)
VALUES
  (gen_random_uuid()::text, 'hit_teatro_plaza_bicentenario', 'capital', 'Teatro / Plaza del Bicentenario', 'edificio_publico', NULL, NULL, 'Complejo cultural del Bicentenario — hito v0.1 (#156), punto a verificar (R15)', '2026-11-04T12:00:00Z'),
  (gen_random_uuid()::text, 'hit_centro_civico', 'capital', 'Centro Cívico', 'edificio_publico', NULL, NULL, 'Sede administrativa provincial sobre el eje de Av. Libertador — hito v0.1 (#156), punto a verificar (R15)', '2026-11-04T12:00:00Z'),
  (gen_random_uuid()::text, 'hit_parque_de_mayo', 'capital', 'Parque de Mayo', 'parque', NULL, NULL, 'Centralidad verde del eje universitario — hito v0.1 (#156), punto a verificar (R15)', '2026-11-04T12:00:00Z'),
  (gen_random_uuid()::text, 'hit_facultad_ingenieria', 'capital', 'Facultad de Ingeniería (UNSJ)', 'institucion_educativa', NULL, NULL, 'Centralidad educativa del eje Libertador Oeste — hito v0.1 (#156), punto a verificar (R15)', '2026-11-04T12:00:00Z'),
  (gen_random_uuid()::text, 'hit_plaza_desamparados', 'capital', 'Plaza de Desamparados', 'plaza', NULL, NULL, 'Plaza Salvador María del Carril / Basílica de Desamparados — centralidad #154, hito v0.1 (#156), punto a verificar (R15)', '2026-11-04T12:00:00Z'),
  (gen_random_uuid()::text, 'hit_microcentro_pec', 'capital', 'Microcentro (área analítica PEC)', 'area_analitica', NULL, NULL, 'Área analítica microcentro PEC (Libertador–Córdoba–Alem–Rioja, #154) — NO es distrito ni subnodo (regla de modelado #154)', '2026-11-04T12:00:00Z'),
  (gen_random_uuid()::text, 'hit_macrocentro', 'capital', 'Macrocentro (área analítica)', 'area_analitica', NULL, NULL, 'Área analítica macrocentro (método a definir, #154) — NO es distrito ni subnodo (regla de modelado #154)', '2026-11-04T12:00:00Z')
ON CONFLICT (key) DO NOTHING;

-- Segmentos cor_centro_civico: Bicentenario → Centro Cívico → Parque de Mayo
INSERT INTO corredor_segmentos (id, corredor_id, secuencia, from_tipo, from_key, to_tipo, to_key, modos, observaciones, observed_at, fuentes, created_at)
SELECT gen_random_uuid()::text, c.id, 1, 'hito', 'hit_teatro_plaza_bicentenario', 'hito', 'hit_centro_civico',
       '["walk","bus","car"]'::jsonb,
       '{"superficie":"trama urbana consolidada sobre el eje cívico — observación de diseño v0.1, no catastro (R15)"}'::jsonb,
       '2026-11-04', '[{"fuente":"Decisión DH NCAP-R4 (#156), 2026-11-04 — hipótesis de diseño territorial ratificada por la Dirección Humana","fecha":"2026-11-04"}]'::jsonb, '2026-11-04T12:00:00Z'
FROM corredores c WHERE c.key = 'cor_centro_civico'
ON CONFLICT (corredor_id, secuencia) DO NOTHING;

INSERT INTO corredor_segmentos (id, corredor_id, secuencia, from_tipo, from_key, to_tipo, to_key, modos, observaciones, observed_at, fuentes, created_at)
SELECT gen_random_uuid()::text, c.id, 2, 'hito', 'hit_centro_civico', 'hito', 'hit_parque_de_mayo',
       '["walk","bike","bus","car"]'::jsonb,
       '{"cruces":"cruces semaforizados sobre Av. Libertador (referencia v0.1)"}'::jsonb,
       '2026-11-04', '[{"fuente":"Decisión DH NCAP-R4 (#156), 2026-11-04 — hipótesis de diseño territorial ratificada por la Dirección Humana","fecha":"2026-11-04"}]'::jsonb, '2026-11-04T12:00:00Z'
FROM corredores c WHERE c.key = 'cor_centro_civico'
ON CONFLICT (corredor_id, secuencia) DO NOTHING;

-- Segmentos cor_libertador_west: Parque de Mayo → F. Ingeniería → Plaza Desamparados
INSERT INTO corredor_segmentos (id, corredor_id, secuencia, from_tipo, from_key, to_tipo, to_key, modos, observaciones, observed_at, fuentes, created_at)
SELECT gen_random_uuid()::text, c.id, 1, 'hito', 'hit_parque_de_mayo', 'hito', 'hit_facultad_ingenieria',
       '["walk","bike","bus","car"]'::jsonb,
       '{"superficie":"eje de Av. Libertador Oeste con ciclovía referencial (v0.1)"}'::jsonb,
       '2026-11-04', '[{"fuente":"Decisión DH NCAP-R4 (#156), 2026-11-04 — hipótesis de diseño territorial ratificada por la Dirección Humana","fecha":"2026-11-04"}]'::jsonb, '2026-11-04T12:00:00Z'
FROM corredores c WHERE c.key = 'cor_libertador_west'
ON CONFLICT (corredor_id, secuencia) DO NOTHING;

INSERT INTO corredor_segmentos (id, corredor_id, secuencia, from_tipo, from_key, to_tipo, to_key, modos, observaciones, observed_at, fuentes, created_at)
SELECT gen_random_uuid()::text, c.id, 2, 'hito', 'hit_facultad_ingenieria', 'hito', 'hit_plaza_desamparados',
       '["walk","bike","bus","car"]'::jsonb,
       '{"cruces":"acceso a Desamparados por el eje oeste (referencia v0.1)"}'::jsonb,
       '2026-11-04', '[{"fuente":"Decisión DH NCAP-R4 (#156), 2026-11-04 — hipótesis de diseño territorial ratificada por la Dirección Humana","fecha":"2026-11-04"}]'::jsonb, '2026-11-04T12:00:00Z'
FROM corredores c WHERE c.key = 'cor_libertador_west'
ON CONFLICT (corredor_id, secuencia) DO NOTHING;

-- Segmento cor_centro_desamparados: distrito Centro ↔ distrito Desamparados
-- (relación por corredor entre subnodos — jamás reasignación distrital, #154)
INSERT INTO corredor_segmentos (id, corredor_id, secuencia, from_tipo, from_key, to_tipo, to_key, modos, observaciones, observed_at, fuentes, created_at)
SELECT gen_random_uuid()::text, c.id, 1, 'subnodo', 'sj_capital_centro', 'subnodo', 'sj_capital_desamparados',
       '["walk","bike","bus","car"]'::jsonb,
       '{"superficie":"continuum urbano entre distritos — relación por corredor, no asignación distrital (regla #154)"}'::jsonb,
       '2026-11-04', '[{"fuente":"Decisión DH NCAP-R4 (#156), 2026-11-04 — hipótesis de diseño territorial ratificada por la Dirección Humana","fecha":"2026-11-04"}]'::jsonb, '2026-11-04T12:00:00Z'
FROM corredores c WHERE c.key = 'cor_centro_desamparados'
ON CONFLICT (corredor_id, secuencia) DO NOTHING;

-- Segmento cor_centro_micro_macro: microcentro PEC → macrocentro (áreas analíticas)
INSERT INTO corredor_segmentos (id, corredor_id, secuencia, from_tipo, from_key, to_tipo, to_key, modos, observaciones, observed_at, fuentes, created_at)
SELECT gen_random_uuid()::text, c.id, 1, 'hito', 'hit_microcentro_pec', 'hito', 'hit_macrocentro',
       '["walk"]'::jsonb,
       '{"superficie":"gradiente de centralidad micro→macro (áreas analíticas #154, sin traza oficial)"}'::jsonb,
       '2026-11-04', '[{"fuente":"Decisión DH NCAP-R4 (#156), 2026-11-04 — hipótesis de diseño territorial ratificada por la Dirección Humana","fecha":"2026-11-04"}]'::jsonb, '2026-11-04T12:00:00Z'
FROM corredores c WHERE c.key = 'cor_centro_micro_macro'
ON CONFLICT (corredor_id, secuencia) DO NOTHING;

-- Segmento cor_redtulum_centro: transporte público hacia el área central
-- (solo referencias hasta la ingesta GTFS, #156)
INSERT INTO corredor_segmentos (id, corredor_id, secuencia, from_tipo, from_key, to_tipo, to_key, modos, observaciones, observed_at, fuentes, created_at)
SELECT gen_random_uuid()::text, c.id, 1, 'hito', 'hit_microcentro_pec', 'hito', 'hit_centro_civico',
       '["bus"]'::jsonb,
       '{"cruces":"corredor de transporte público Red Tulum hacia el área central — solo referencias hasta la ingesta GTFS (#156)"}'::jsonb,
       '2026-11-04', '[{"fuente":"Decisión DH NCAP-R4 (#156), 2026-11-04 — hipótesis de diseño territorial ratificada por la Dirección Humana","fecha":"2026-11-04"}]'::jsonb, '2026-11-04T12:00:00Z'
FROM corredores c WHERE c.key = 'cor_redtulum_centro'
ON CONFLICT (corredor_id, secuencia) DO NOTHING;

-- Sellos corredor.creado (patrón seed-subnodo #154: events_raw única fuente
-- de verdad; hash fijo 'seed-corredor-<key>' → idempotencia).
INSERT INTO events_raw (id, type, payload, hash, occurred_at, ingested_at)
SELECT gen_random_uuid()::text, 'corredor.creado',
       jsonb_build_object('nodo_key', c.nodo_key, 'key', c.key, 'label', c.label,
                          'status', c.status,
                          'segmentos_count', (SELECT count(*)::int FROM corredor_segmentos s WHERE s.corredor_id = c.id),
                          'source', 'seed-ncap-r4'),
       'seed-corredor-' || c.key, c.created_at, c.created_at
FROM corredores c
WHERE c.nodo_key = 'capital'
ON CONFLICT (hash) DO NOTHING;
