-- Seed subnodos de Caucete (NODO-CAU R6, #145, épica #137).
-- 10 entidades con centroides oficiales Georef/INDEC (apis.datos.gob.ar, consultado
-- 2026-10-20): 1 district (localidad censal Caucete, área operativa inicial) + 9 locality
-- (localidades del departamento, referencia estadística). Las Talas y Los Médanos son
-- entidades de la localidad censal compuesta Las Talas - Los Médanos (parent_key).
-- Coordenadas: punto público de dominio, no sensible (ADR-036). boundary_status
-- provisional + assignment_status dh_directive (R15): ratificación municipal de límites
-- pendiente. Idempotencia: ON CONFLICT (key)/(hash) DO NOTHING — patrón de
-- seed-subnodos-capital.sql (NCAP-R2 #154).

INSERT INTO subnodos (id, nodo_key, key, label, type, parent_key, boundary_status, assignment_status, zone, lat, lng, external_id, external_source, created_at, updated_at)
VALUES
  (gen_random_uuid()::text, 'caucete', 'sj_caucete_ciudad', 'Caucete', 'district', NULL, 'provisional', 'dh_directive', 'valle_de_tulum', -31.6514806112797, -68.2819785105591, '70035020', 'georef', '2026-10-20T12:00:00Z', '2026-10-20T12:00:00Z'),
  (gen_random_uuid()::text, 'caucete', 'sj_caucete_bermejo', 'Bermejo', 'locality', NULL, 'provisional', 'dh_directive', 'valle_de_tulum', -31.5885052091725, -67.6569924992168, '70035010', 'georef', '2026-10-20T12:00:00Z', '2026-10-20T12:00:00Z'),
  (gen_random_uuid()::text, 'caucete', 'sj_caucete_el_rincon', 'El Rincón', 'locality', NULL, 'provisional', 'dh_directive', 'valle_de_tulum', -31.6701306073377, -68.3173058058923, '70035030', 'georef', '2026-10-20T12:00:00Z', '2026-10-20T12:00:00Z'),
  (gen_random_uuid()::text, 'caucete', 'sj_caucete_las_talas_los_medanos', 'Las Talas - Los Médanos', 'locality', NULL, 'provisional', 'dh_directive', 'valle_de_tulum', -31.5967860975466, -68.2751787875338, '70035040', 'georef', '2026-10-20T12:00:00Z', '2026-10-20T12:00:00Z'),
  (gen_random_uuid()::text, 'caucete', 'sj_caucete_pie_de_palo', 'Pie de Palo', 'locality', NULL, 'provisional', 'dh_directive', 'valle_de_tulum', -31.6612651782065, -68.2197001783797, '70035060', 'georef', '2026-10-20T12:00:00Z', '2026-10-20T12:00:00Z'),
  (gen_random_uuid()::text, 'caucete', 'sj_caucete_vallecito', 'Vallecito', 'locality', NULL, 'provisional', 'dh_directive', 'valle_de_tulum', -31.7346405190887, -67.9828706705004, '70035070', 'georef', '2026-10-20T12:00:00Z', '2026-10-20T12:00:00Z'),
  (gen_random_uuid()::text, 'caucete', 'sj_caucete_villa_independencia', 'Villa Independencia', 'locality', NULL, 'provisional', 'dh_directive', 'valle_de_tulum', -31.6245830193381, -68.3139254690866, '70035080', 'georef', '2026-10-20T12:00:00Z', '2026-10-20T12:00:00Z'),
  (gen_random_uuid()::text, 'caucete', 'sj_caucete_marayes', 'Marayes', 'locality', NULL, 'provisional', 'dh_directive', 'valle_de_tulum', -31.4634402549446, -67.3515068309781, '70035050', 'georef', '2026-10-20T12:00:00Z', '2026-10-20T12:00:00Z'),
  (gen_random_uuid()::text, 'caucete', 'sj_caucete_las_talas', 'Las Talas', 'locality', 'sj_caucete_las_talas_los_medanos', 'provisional', 'dh_directive', 'valle_de_tulum', -31.5970077276796, -68.2739247954768, '7003504001', 'georef', '2026-10-20T12:00:00Z', '2026-10-20T12:00:00Z'),
  (gen_random_uuid()::text, 'caucete', 'sj_caucete_los_medanos', 'Los Médanos', 'locality', 'sj_caucete_las_talas_los_medanos', 'provisional', 'dh_directive', 'valle_de_tulum', -31.6042330867573, -68.2696340382628, '7003504002', 'georef', '2026-10-20T12:00:00Z', '2026-10-20T12:00:00Z')
ON CONFLICT (key) DO NOTHING;

-- Sellos de trazabilidad en events_raw (misma mecánica que Capital):
INSERT INTO events_raw (id, type, payload, hash, occurred_at, ingested_at)
SELECT gen_random_uuid()::text, 'subnodo.creado',
       jsonb_build_object('nodo_key', s.nodo_key, 'key', s.key, 'type', s.type, 'parent_key', s.parent_key, 'source', 'seed-nc-r6'),
       'seed-subnodo-' || s.key, s.created_at, s.created_at
FROM subnodos s WHERE s.nodo_key = 'caucete'
ON CONFLICT (hash) DO NOTHING;
