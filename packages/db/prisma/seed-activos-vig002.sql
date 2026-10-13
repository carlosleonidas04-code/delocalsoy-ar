-- Seed NODO-VIG VIG-002 (NVIG-R2 #169, épica #167): 6 activos verificados
-- con procedencia trazable (ADR-035). Ratificado por la DH (2026-10-13, traza
-- #169 comment 6156260102): la semilla publica SOLO lo verificado — 0
-- prestadores Ley 2400-T (padrón no encontrado, tanda 3) y 0 emprendimientos
-- Mujeres de Montaña (candidate_provider unverified, sin consentimiento —
-- Ley 25.326). "Verificado" = estado 'aprobado' + procedencia con fuente
-- citable (ADR-035), nunca un sello extra. R15: sin punto verificado, lat/lng
-- NULL — el activo se acredita por subnodo (el Dique Cuesta del Viento lleva
-- el punto público del paraje BAHRA A19). Idempotente: ON CONFLICT (hash).

INSERT INTO activos (id, tipo, titulo, descripcion, estado, nodo_key, subnodo_key, lat, lng, visibilidad, procedencia, is_synthetic, created_by_hash, hash, created_at, updated_at)
VALUES
  ('seed-activo-achango', 'patrimonio', 'Capilla de Achango', 'Conjunto capilla y vivienda colonial; alfombras de más de 350 años; Monumento Histórico Nacional (Ley 24.790, 1997).', 'aprobado', 'iglesia', 'sj_iglesia_p_achango', NULL, NULL, 'public', '{"source_id":"ley-24790-1997","fuente":"Ley 24.790 (1997) - Monumento Histórico Nacional","fecha":"1997"}'::jsonb, false, 'seed-vig-002', 'seed-activo-capilla-achango', '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z'),
  ('seed-activo-molino-bella-vista', 'patrimonio', 'Molino de Bella Vista', 'Molino harinero colonial declarado Monumento Histórico Nacional por Ley 25.291 (2000), conjunto con el Molino Escobar (Jáchal).', 'aprobado', 'iglesia', 'sj_iglesia_bella_vista', NULL, NULL, 'public', '{"source_id":"ley-25291-2000","fuente":"Ley 25.291 (2000) - Monumento Histórico Nacional","fecha":"2000"}'::jsonb, false, 'seed-vig-002', 'seed-activo-molino-bella-vista', '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z'),
  ('seed-activo-yacimiento-angualasto', 'patrimonio', 'Yacimiento arqueológico Angualasto', 'Yacimiento arqueológico (viviendas, corrales, obras hidráulicas y tumbas) declarado Lugar Histórico Nacional por Decreto 2.154/2009 (art. 1: ~30°3 S 68°10 O).', 'aprobado', 'iglesia', 'sj_iglesia_angualasto', -30.05, -68.1667, 'public', '{"source_id":"decreto-2154-2009-art1","fuente":"Decreto 2.154/2009 (art. 1) - Lugar Histórico Nacional","fecha":"2009"}'::jsonb, false, 'seed-vig-002', 'seed-activo-yacimiento-angualasto', '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z'),
  ('seed-activo-fecoagro-tudcum', 'prestador', 'Cooperativa Fecoagro Tudcum', 'Cooperativa declarada (INAES matrícula 28.777/659), constituida el 2004-08-12, 10 socios.', 'aprobado', 'iglesia', 'sj_iglesia_tudcum', NULL, NULL, 'public', '{"source_id":"inaes-28777-659","fuente":"INAES 28.777/659 (declarada, constitución 2004-08-12) - tanda 3 Perplexity","fecha":"2004-08-12"}'::jsonb, false, 'seed-vig-002', 'seed-activo-fecoagro-tudcum', '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z'),
  ('seed-activo-coop-valles-iglesianos', 'prestador', 'Cooperativa Valles Iglesianos', 'Cooperativa declarada (INAES matrícula 11.463/170), constituida el 1987-08-25, 31 socios; sin subnodo hasta desagregación verificada.', 'aprobado', 'iglesia', NULL, NULL, NULL, 'public', '{"source_id":"inaes-11463-170","fuente":"INAES 11.463/170 (declarada, constitución 1987-08-25) - tanda 3 Perplexity","fecha":"1987-08-25"}'::jsonb, false, 'seed-vig-002', 'seed-activo-coop-valles-iglesianos', '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z'),
  ('seed-activo-dique-cuesta-del-viento', 'infraestructura', 'Dique Cuesta del Viento', 'Embalse sobre el río Jáchal, epicentro de windsurf y kitesurf (Ley 826-G: navegación 08:00-19:00; capacity_status unknown). El punto público del paraje BAHRA A19 acredita su ubicación; el activo no publica punto propio.', 'aprobado', 'iglesia', 'sj_iglesia_p_dique_cuesta_del_viento', NULL, NULL, 'public', '{"source_id":"bahra-a19-ley-826-g","fuente":"BAHRA paraje A19 + Ley 826-G (navegación)","fecha":"2026-10-13"}'::jsonb, false, 'seed-vig-002', 'seed-activo-dique-cuesta-del-viento', '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z')
ON CONFLICT (hash) DO NOTHING;

-- Clasificaciones N1→N3 (taxonomía VIG-000): una primaria por activo con
-- fuente citada (gobernanza). Idempotente por (activo_id, n1, n2, n3).

INSERT INTO activos_clasificaciones (id, activo_id, n1, n2, n3, is_primary, source)
SELECT gen_random_uuid()::text, a.id, 'patrimonial', 'patrimonio_colonial', 'capilla', true, 'Ley 24.790 (1997) - MHN'
FROM activos a WHERE a.hash = 'seed-activo-capilla-achango'
ON CONFLICT (activo_id, n1, n2, n3) DO NOTHING;

INSERT INTO activos_clasificaciones (id, activo_id, n1, n2, n3, is_primary, source)
SELECT gen_random_uuid()::text, a.id, 'patrimonial', 'patrimonio_industrial', 'molino_harinero', true, 'Ley 25.291 (2000) - MHN'
FROM activos a WHERE a.hash = 'seed-activo-molino-bella-vista'
ON CONFLICT (activo_id, n1, n2, n3) DO NOTHING;

INSERT INTO activos_clasificaciones (id, activo_id, n1, n2, n3, is_primary, source)
SELECT gen_random_uuid()::text, a.id, 'patrimonial', 'patrimonio_arqueologico', 'yacimiento', true, 'Decreto 2.154/2009 art. 1 - LHN'
FROM activos a WHERE a.hash = 'seed-activo-yacimiento-angualasto'
ON CONFLICT (activo_id, n1, n2, n3) DO NOTHING;

INSERT INTO activos_clasificaciones (id, activo_id, n1, n2, n3, is_primary, source)
SELECT gen_random_uuid()::text, a.id, 'productivo_rural', 'cooperativa', '', true, 'INAES 28.777/659 - declaración cooperativa'
FROM activos a WHERE a.hash = 'seed-activo-fecoagro-tudcum'
ON CONFLICT (activo_id, n1, n2, n3) DO NOTHING;

INSERT INTO activos_clasificaciones (id, activo_id, n1, n2, n3, is_primary, source)
SELECT gen_random_uuid()::text, a.id, 'productivo_rural', 'cooperativa', '', true, 'INAES 11.463/170 - declaración cooperativa'
FROM activos a WHERE a.hash = 'seed-activo-coop-valles-iglesianos'
ON CONFLICT (activo_id, n1, n2, n3) DO NOTHING;

INSERT INTO activos_clasificaciones (id, activo_id, n1, n2, n3, is_primary, source)
SELECT gen_random_uuid()::text, a.id, 'turistico', 'deportes_acuaticos', 'windsurf_kitesurf', true, 'Ley 826-G + BAHRA paraje A19'
FROM activos a WHERE a.hash = 'seed-activo-dique-cuesta-del-viento'
ON CONFLICT (activo_id, n1, n2, n3) DO NOTHING;

-- Sello activo.ingestado en events_raw (fuente de verdad): uno por activo de
-- la ingesta curada; payload sin PII (solo claves territoriales y procedencia);
-- hash idempotente = hash del activo.
INSERT INTO events_raw (id, type, payload, hash, occurred_at, ingested_at)
SELECT 'seedev-' || a.hash, 'activo.ingestado',
       jsonb_build_object('activo_id', a.id, 'tipo', a.tipo, 'nodo_key', a.nodo_key,
                         'subnodo_key', a.subnodo_key, 'estado', a.estado,
                         'source', 'seed-vig-002'),
       a.hash, '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z'
FROM activos a
WHERE a.hash LIKE 'seed-activo-%'
ON CONFLICT (hash) DO NOTHING;
