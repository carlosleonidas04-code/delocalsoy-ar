-- Seed NODO-VIG VIG-001 (NVIG-R4 #171, épica #167): subnodos territoriales
-- del Valle de Iglesia. LOTES 1+2 ratificados por la Dirección Humana
-- (2026-10-13, trazas de ratificación en #168): LOTE 1 = 34 entidades = 6 distritos +
-- 1 localidad INDEC (Pismanta → las-flores) + 22 parajes/subparaje de valle
-- (asignación provisional por cercanía sobre BAHRA/Georef) + 2 pasos (Agua
-- Negra → rodeo por función RN 150; Pascua Lama → hijo directo del nodo,
-- alta cordillera) + 3 parajes locales sin registro BAHRA (El Jarillal,
-- Maipirinqui, Colola — lat/lng null: sin punto publicado no se inventa, R15).
-- Coordenadas: punto público BAHRA (WFS ign:bahra_paraje, CQL cod_depto='70049',
-- consulta 13-10-2026) y centroide Georef (localidad 70049050, misma fecha).
-- Ortografías canónicas ratificadas: Zonda (no "Sonda"), Maipirinqui (no
-- "Mayiringui"), Colola (rodeo) ≠ Colo Colo (paraje BAHRA A18).
-- SEGUNDO LOTE (18 entidades, ratificado por la DH 2026-10-13, traza en
-- #168 comment 6151285249): 3 de travesía con asignación por cercanía
-- (El Arenal → tudcum, Minas de Pinto → villa-iglesia, Los Corrales →
-- tudcum) + 15 de alta cordillera no-paso como hijos directos del nodo.
-- Coordenadas re-verificadas en vivo contra BAHRA WFS el 13-10-2026
-- (Fierro Nuevo A24: lng tomada del geometry del GeoJSON — su campo
-- long_gd trae carácter de control).
-- Idempotencia: ON CONFLICT (key) DO NOTHING; sellos por hash único.

INSERT INTO subnodos (id, nodo_key, key, label, type, parent_key, boundary_status, assignment_status, zone, lat, lng, external_id, external_source, created_at, updated_at)
VALUES
  -- Distritos ratificados (6) — hijos directos del nodo; sin punto publicado → lat/lng null (R15)
  (gen_random_uuid()::text, 'iglesia', 'sj_iglesia_angualasto', 'Angualasto', 'district', NULL, 'provisional', 'dh_directive', 'valle', NULL, NULL, NULL, NULL, '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z'),
  (gen_random_uuid()::text, 'iglesia', 'sj_iglesia_bella_vista', 'Bella Vista', 'district', NULL, 'provisional', 'dh_directive', 'valle', NULL, NULL, NULL, NULL, '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z'),
  (gen_random_uuid()::text, 'iglesia', 'sj_iglesia_las_flores', 'Las Flores', 'district', NULL, 'provisional', 'dh_directive', 'valle', NULL, NULL, NULL, NULL, '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z'),
  (gen_random_uuid()::text, 'iglesia', 'sj_iglesia_rodeo', 'Rodeo', 'district', NULL, 'provisional', 'dh_directive', 'valle', NULL, NULL, NULL, NULL, '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z'),
  (gen_random_uuid()::text, 'iglesia', 'sj_iglesia_tudcum', 'Tudcum', 'district', NULL, 'provisional', 'dh_directive', 'valle', NULL, NULL, NULL, NULL, '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z'),
  (gen_random_uuid()::text, 'iglesia', 'sj_iglesia_villa_iglesia', 'Villa Iglesia', 'district', NULL, 'provisional', 'dh_directive', 'valle', NULL, NULL, NULL, NULL, '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z'),
  -- Localidad INDEC (Georef) — ratificación DH: Pismanta pertenece a las-flores
  (gen_random_uuid()::text, 'iglesia', 'sj_iglesia_p_pismanta', 'Pismanta', 'locality', 'sj_iglesia_las_flores', 'provisional', 'dh_directive', 'valle', -30.2802254035094, -69.2279466704071, '70049050', 'georef', '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z'),
  -- Parajes de valle — asignación provisional por cercanía (punto público BAHRA)
  (gen_random_uuid()::text, 'iglesia', 'sj_iglesia_p_achango', 'Achango', 'paraje', 'sj_iglesia_las_flores', 'provisional', 'nearest_district_provisional', 'valle', -30.289139, -69.197880, '70049A00', 'bahra', '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z'),
  (gen_random_uuid()::text, 'iglesia', 'sj_iglesia_p_arrequintin', 'Arrequintín', 'paraje', 'sj_iglesia_villa_iglesia', 'provisional', 'nearest_district_provisional', 'valle', -30.389704, -69.589014, '70049A02', 'bahra', '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z'),
  (gen_random_uuid()::text, 'iglesia', 'sj_iglesia_p_barreal_blanco', 'Barreal Blanco', 'paraje', 'sj_iglesia_villa_iglesia', 'provisional', 'nearest_district_provisional', 'valle', -30.573767, -69.107008, '70049A04', 'bahra', '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z'),
  (gen_random_uuid()::text, 'iglesia', 'sj_iglesia_p_bauchaceta', 'Bauchaceta', 'paraje', 'sj_iglesia_villa_iglesia', 'provisional', 'nearest_district_provisional', 'valle', -30.510814, -69.460209, '70049A05', 'bahra', '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z'),
  (gen_random_uuid()::text, 'iglesia', 'sj_iglesia_p_buena_esperanza', 'Buena Esperanza', 'paraje', 'sj_iglesia_angualasto', 'provisional', 'nearest_district_provisional', 'valle', -30.050221, -69.162522, '70049A06', 'bahra', '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z'),
  (gen_random_uuid()::text, 'iglesia', 'sj_iglesia_p_campanario', 'Campanario', 'paraje', 'sj_iglesia_villa_iglesia', 'provisional', 'nearest_district_provisional', 'valle', -30.373192, -69.201039, '70049A11', 'bahra', '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z'),
  (gen_random_uuid()::text, 'iglesia', 'sj_iglesia_p_campo_de_chita', 'Campo de Chita', 'paraje', 'sj_iglesia_villa_iglesia', 'provisional', 'nearest_district_provisional', 'valle', -30.548847, -69.504479, '70049A12', 'bahra', '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z'),
  (gen_random_uuid()::text, 'iglesia', 'sj_iglesia_p_campo_pismanta', 'Campo Pismanta', 'paraje', 'sj_iglesia_villa_iglesia', 'provisional', 'nearest_district_provisional', 'valle', -30.436790, -69.449764, '70049A13', 'bahra', '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z'),
  (gen_random_uuid()::text, 'iglesia', 'sj_iglesia_p_carrizalito', 'Carrizalito', 'paraje', 'sj_iglesia_angualasto', 'provisional', 'nearest_district_provisional', 'valle', -29.804638, -69.158759, '70049A14', 'bahra', '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z'),
  (gen_random_uuid()::text, 'iglesia', 'sj_iglesia_p_cerro_coronel', 'Cerro Coronel', 'paraje', 'sj_iglesia_villa_iglesia', 'provisional', 'nearest_district_provisional', 'valle', -30.590342, -69.062815, '70049A15', 'bahra', '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z'),
  (gen_random_uuid()::text, 'iglesia', 'sj_iglesia_p_chinguillos', 'Chinguillos', 'paraje', 'sj_iglesia_angualasto', 'provisional', 'nearest_district_provisional', 'valle', -29.711928, -69.160275, '70049A16', 'bahra', '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z'),
  (gen_random_uuid()::text, 'iglesia', 'sj_iglesia_p_colanguil', 'Colangüil', 'paraje', 'sj_iglesia_angualasto', 'provisional', 'nearest_district_provisional', 'valle', -30.034352, -69.287106, '70049A17', 'bahra', '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z'),
  (gen_random_uuid()::text, 'iglesia', 'sj_iglesia_p_colo_colo', 'Colo Colo', 'paraje', 'sj_iglesia_villa_iglesia', 'provisional', 'nearest_district_provisional', 'valle', -30.661879, -69.526857, '70049A18', 'bahra', '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z'),
  (gen_random_uuid()::text, 'iglesia', 'sj_iglesia_p_dique_cuesta_del_viento', 'Dique Cuesta del Viento', 'paraje', 'sj_iglesia_rodeo', 'provisional', 'nearest_district_provisional', 'valle', -30.193388, -69.063441, '70049A19', 'bahra', '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z'),
  (gen_random_uuid()::text, 'iglesia', 'sj_iglesia_p_el_carrizal', 'El Carrizal', 'paraje', 'sj_iglesia_angualasto', 'provisional', 'nearest_district_provisional', 'valle', -30.011486, -69.064450, '70049A21', 'bahra', '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z'),
  (gen_random_uuid()::text, 'iglesia', 'sj_iglesia_p_el_llano', 'El Llano', 'paraje', 'sj_iglesia_las_flores', 'provisional', 'nearest_district_provisional', 'valle', -30.308361, -69.218975, '70049A23', 'bahra', '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z'),
  (gen_random_uuid()::text, 'iglesia', 'sj_iglesia_p_guardia_vieja', 'Guardia Vieja', 'paraje', 'sj_iglesia_villa_iglesia', 'provisional', 'nearest_district_provisional', 'valle', -30.392486, -69.571263, '70049A26', 'bahra', '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z'),
  (gen_random_uuid()::text, 'iglesia', 'sj_iglesia_p_la_chigua', 'La Chigua', 'paraje', 'sj_iglesia_angualasto', 'provisional', 'nearest_district_provisional', 'valle', -29.867582, -69.148817, '70049A29', 'bahra', '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z'),
  (gen_random_uuid()::text, 'iglesia', 'sj_iglesia_p_maliman', 'Malimán', 'paraje', 'sj_iglesia_angualasto', 'provisional', 'nearest_district_provisional', 'valle', -29.958562, -69.178966, '70049A32', 'bahra', '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z'),
  (gen_random_uuid()::text, 'iglesia', 'sj_iglesia_p_maliman_de_arriba', 'Malimán de Arriba', 'subparaje', 'sj_iglesia_p_maliman', 'provisional', 'nearest_district_provisional', 'valle', -29.934388, -69.169799, '70049A33', 'bahra', '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z'),
  (gen_random_uuid()::text, 'iglesia', 'sj_iglesia_p_tocota', 'Tocota', 'paraje', 'sj_iglesia_villa_iglesia', 'provisional', 'nearest_district_provisional', 'valle', -30.665342, -69.438530, '70049A40', 'bahra', '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z'),
  (gen_random_uuid()::text, 'iglesia', 'sj_iglesia_p_zonda', 'Zonda', 'paraje', 'sj_iglesia_villa_iglesia', 'provisional', 'nearest_district_provisional', 'valle', -30.392581, -69.210163, '70049A41', 'bahra', '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z'),
  -- Pasos (ratificación DH 2026-10-13: "cargar solo los pasos")
  (gen_random_uuid()::text, 'iglesia', 'sj_iglesia_p_paso_del_agua_negra', 'Paso del Agua Negra', 'paraje', 'sj_iglesia_rodeo', 'provisional', 'dh_directive', 'travesia', -30.195579, -69.821783, '70049A37', 'bahra', '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z'),
  (gen_random_uuid()::text, 'iglesia', 'sj_iglesia_p_paso_pascua_lama', 'Paso Pascua Lama', 'paraje', NULL, 'provisional', 'dh_directive', 'alta_cordillera', -29.328435, -69.998358, '70049A38', 'bahra', '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z'),
  -- Parajes locales sin registro BAHRA (ratificación DH; lat/lng null — R15)
  (gen_random_uuid()::text, 'iglesia', 'sj_iglesia_p_colola', 'Colola', 'paraje', 'sj_iglesia_rodeo', 'provisional', 'dh_directive', 'valle', NULL, NULL, NULL, NULL, '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z'),
  (gen_random_uuid()::text, 'iglesia', 'sj_iglesia_p_el_jarillal', 'El Jarillal', 'paraje', 'sj_iglesia_las_flores', 'provisional', 'dh_directive', 'valle', NULL, NULL, NULL, NULL, '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z'),
  (gen_random_uuid()::text, 'iglesia', 'sj_iglesia_p_maipirinqui', 'Maipirinqui', 'paraje', 'sj_iglesia_villa_iglesia', 'provisional', 'dh_directive', 'valle', NULL, NULL, NULL, NULL, '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z'),
  -- SEGUNDO LOTE (ratificado DH 2026-10-13): travesía por cercanía
  (gen_random_uuid()::text, 'iglesia', 'sj_iglesia_p_el_arenal', 'El Arenal', 'paraje', 'sj_iglesia_tudcum', 'provisional', 'nearest_district_provisional', 'travesia', -30.347623, -69.714796, '70049A20', 'bahra', '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z'),
  (gen_random_uuid()::text, 'iglesia', 'sj_iglesia_p_los_corrales', 'Los Corrales', 'paraje', 'sj_iglesia_tudcum', 'provisional', 'nearest_district_provisional', 'travesia', -30.271554, -69.793532, '70049A31', 'bahra', '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z'),
  (gen_random_uuid()::text, 'iglesia', 'sj_iglesia_p_minas_de_pinto', 'Minas de Pinto', 'paraje', 'sj_iglesia_villa_iglesia', 'provisional', 'nearest_district_provisional', 'travesia', -30.488978, -69.700176, '70049A36', 'bahra', '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z'),
  -- SEGUNDO LOTE: alta cordillera no-paso — hijos directos del nodo (estructura v0.2 ratificada)
  (gen_random_uuid()::text, 'iglesia', 'sj_iglesia_p_agua_del_godo', 'Agua del Godo', 'paraje', NULL, 'provisional', 'dh_directive', 'alta_cordillera', -29.243046, -69.353825, '70049A01', 'bahra', '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z'),
  (gen_random_uuid()::text, 'iglesia', 'sj_iglesia_p_banitos_de_chollay', 'Bañitos de Chollay', 'paraje', NULL, 'provisional', 'dh_directive', 'alta_cordillera', -29.197461, -69.693961, '70049A03', 'bahra', '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z'),
  (gen_random_uuid()::text, 'iglesia', 'sj_iglesia_p_campamento_la_brea', 'Campamento La Brea', 'paraje', NULL, 'provisional', 'dh_directive', 'alta_cordillera', -28.685662, -69.314200, '70049A07', 'bahra', '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z'),
  (gen_random_uuid()::text, 'iglesia', 'sj_iglesia_p_campamento_pircas', 'Campamento Pircas', 'paraje', NULL, 'provisional', 'dh_directive', 'alta_cordillera', -28.507386, -69.485152, '70049A08', 'bahra', '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z'),
  (gen_random_uuid()::text, 'iglesia', 'sj_iglesia_p_campamento_soberado', 'Campamento Soberado', 'paraje', NULL, 'provisional', 'dh_directive', 'alta_cordillera', -29.192086, -69.872730, '70049A09', 'bahra', '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z'),
  (gen_random_uuid()::text, 'iglesia', 'sj_iglesia_p_campamento_veladero', 'Campamento Veladero', 'paraje', NULL, 'provisional', 'dh_directive', 'alta_cordillera', -29.408789, -69.895021, '70049A10', 'bahra', '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z'),
  (gen_random_uuid()::text, 'iglesia', 'sj_iglesia_p_el_lavadero', 'El Lavadero', 'paraje', NULL, 'provisional', 'dh_directive', 'alta_cordillera', -29.579158, -69.293340, '70049A22', 'bahra', '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z'),
  (gen_random_uuid()::text, 'iglesia', 'sj_iglesia_p_fierro_nuevo', 'Fierro Nuevo', 'paraje', NULL, 'provisional', 'dh_directive', 'alta_cordillera', -29.450180, -69.473938, '70049A24', 'bahra', '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z'),
  (gen_random_uuid()::text, 'iglesia', 'sj_iglesia_p_fierro_viejo', 'Fierro Viejo', 'paraje', NULL, 'provisional', 'dh_directive', 'alta_cordillera', -29.446738, -69.415170, '70049A25', 'bahra', '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z'),
  (gen_random_uuid()::text, 'iglesia', 'sj_iglesia_p_junta_de_las_taguas', 'Junta de las Taguas', 'paraje', NULL, 'provisional', 'dh_directive', 'alta_cordillera', -29.341755, -69.595166, '70049A27', 'bahra', '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z'),
  (gen_random_uuid()::text, 'iglesia', 'sj_iglesia_p_junta_de_los_champones', 'Junta de los Champones', 'paraje', NULL, 'provisional', 'dh_directive', 'alta_cordillera', -29.809160, -69.677160, '70049A28', 'bahra', '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z'),
  (gen_random_uuid()::text, 'iglesia', 'sj_iglesia_p_llanos_de_san_guillermo', 'Llanos de San Guillermo', 'paraje', NULL, 'provisional', 'dh_directive', 'alta_cordillera', -29.401522, -69.261015, '70049A30', 'bahra', '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z'),
  (gen_random_uuid()::text, 'iglesia', 'sj_iglesia_p_mina_las_carachas', 'Mina Las Carachas', 'paraje', NULL, 'provisional', 'dh_directive', 'alta_cordillera', -28.804168, -69.436761, '70049A34', 'bahra', '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z'),
  (gen_random_uuid()::text, 'iglesia', 'sj_iglesia_p_mina_veladero', 'Mina Veladero', 'paraje', NULL, 'provisional', 'dh_directive', 'alta_cordillera', -29.353641, -69.942003, '70049A35', 'bahra', '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z'),
  (gen_random_uuid()::text, 'iglesia', 'sj_iglesia_p_quebrada_de_alcaparrosa', 'Quebrada de Alcaparrosa', 'paraje', NULL, 'provisional', 'dh_directive', 'alta_cordillera', -29.492355, -69.199622, '70049A39', 'bahra', '2026-10-13T12:00:00Z', '2026-10-13T12:00:00Z')

ON CONFLICT (key) DO NOTHING;

-- Sellos subnodo.creado (patrón del dominio: type + payload + hash; events_raw
-- única fuente de verdad). hash fijo 'seed-subnodo-<key>' → idempotencia.
INSERT INTO events_raw (id, type, payload, hash, occurred_at, ingested_at)
SELECT gen_random_uuid()::text, 'subnodo.creado',
       jsonb_build_object('nodo_key', s.nodo_key, 'key', s.key, 'type', s.type,
                          'parent_key', s.parent_key, 'source', 'seed-vig-001'),
       'seed-subnodo-' || s.key, s.created_at, s.created_at
FROM subnodos s
WHERE s.nodo_key = 'iglesia'
ON CONFLICT (hash) DO NOTHING;
