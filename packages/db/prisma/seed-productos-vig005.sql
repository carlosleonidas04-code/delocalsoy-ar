-- Seed NODO-VIG VIG-005 (NVIG-R7 #174, épica #167): operativa del Dique
-- Cuesta del Viento (horario y seguridad verificados, Ley 826-G) y
-- habilitación honesta de las cooperativas. Ratificado por la DH (2026-10-14,
-- traza #174 comment 6160361362): 0 productos en la semilla — solo se publica
-- lo verificado (la producción por distrito queda como vacío declarado).
-- capacity_status='unknown' (R15): Cuesta del Viento sin aforos/plazas/
-- protocolos verificados — el 90% de ocupación hotelera de enero NO es aforo.
-- Cooperativas: habilitación unknown en los 4 atributos separados (padrón
-- Ley 2400-T no encontrado, tanda 3; "distinguido" ≠ "habilitado").
-- Idempotente: ON CONFLICT (activo_id) DO NOTHING.

INSERT INTO activos_operativa (activo_id, horario, temporada_meses, capacity_status, capacidad_plazas, seguridad, habilitacion, procedencia, created_at, updated_at)
SELECT a.id,
  'Navegación 08:00-19:00 (Ley 826-G)',
  '[3,4,9,10]'::jsonb,
  'unknown',
  NULL,
  '{"reglas":"VHF canal 16; guardavidas 5+5 en operación 2-5 de abril de 2026; navegación 08:00-19:00 (Ley 826-G)","fuente":"Ley 826-G + verificación tanda 3 Perplexity (guardavidas operativo 2026-04)"}'::jsonb,
  NULL,
  '{"source_id":"ley-826-g-navegacion","fuente":"Ley 826-G (navegación 08:00-19:00) + tanda 3 Perplexity","fecha":"2026"}'::jsonb,
  '2026-10-14T12:00:00Z', '2026-10-14T12:00:00Z'
FROM activos a WHERE a.hash = 'seed-activo-dique-cuesta-del-viento'
ON CONFLICT (activo_id) DO NOTHING;

INSERT INTO activos_operativa (activo_id, horario, temporada_meses, capacity_status, capacidad_plazas, seguridad, habilitacion, procedencia, created_at, updated_at)
SELECT a.id, NULL, '[]'::jsonb, 'unknown', NULL, NULL,
  '{"municipal":"unknown","provincial_2400_t":"unknown","sello":"unknown","verified_at":null}'::jsonb,
  '{"source_id":"inaes-declaracion-habilitacion","fuente":"INAES (declaración cooperativa) — habilitación Ley 2400-T: padrón no encontrado (tanda 3 Perplexity)","fecha":"2026-10-14"}'::jsonb,
  '2026-10-14T12:00:00Z', '2026-10-14T12:00:00Z'
FROM activos a WHERE a.hash = 'seed-activo-fecoagro-tudcum'
ON CONFLICT (activo_id) DO NOTHING;

INSERT INTO activos_operativa (activo_id, horario, temporada_meses, capacity_status, capacidad_plazas, seguridad, habilitacion, procedencia, created_at, updated_at)
SELECT a.id, NULL, '[]'::jsonb, 'unknown', NULL, NULL,
  '{"municipal":"unknown","provincial_2400_t":"unknown","sello":"unknown","verified_at":null}'::jsonb,
  '{"source_id":"inaes-declaracion-habilitacion","fuente":"INAES (declaración cooperativa) — habilitación Ley 2400-T: padrón no encontrado (tanda 3 Perplexity)","fecha":"2026-10-14"}'::jsonb,
  '2026-10-14T12:00:00Z', '2026-10-14T12:00:00Z'
FROM activos a WHERE a.hash = 'seed-activo-coop-valles-iglesianos'
ON CONFLICT (activo_id) DO NOTHING;

-- Sello operativa.ingestado en events_raw (fuente de verdad): uno por
-- operativa de la ingesta curada; payload sin PII (solo claves territoriales
-- y estado honesto de capacidad); hash idempotente = hash del activo + ':op'
-- (el hash del activo ya sella activo.ingestado en VIG-002).
INSERT INTO events_raw (id, type, payload, hash, occurred_at, ingested_at)
SELECT 'seedev-op-' || a.hash, 'operativa.ingestado',
       jsonb_build_object('activo_id', a.id, 'nodo_key', a.nodo_key,
                          'subnodo_key', a.subnodo_key,
                          'capacity_status', o.capacity_status,
                          'source', 'seed-vig-005'),
       a.hash || ':op', '2026-10-14T12:00:00Z', '2026-10-14T12:00:00Z'
FROM activos_operativa o
JOIN activos a ON a.id = o.activo_id
WHERE a.hash IN ('seed-activo-dique-cuesta-del-viento', 'seed-activo-fecoagro-tudcum', 'seed-activo-coop-valles-iglesianos')
ON CONFLICT (hash) DO NOTHING;
