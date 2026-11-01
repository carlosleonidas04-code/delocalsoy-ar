-- Seed NODO-VIG VIG-004 (NVIG-R6 #173, épica #167): fichas patrimoniales de
-- los 3 activos patrimonio sembrados en VIG-002. Solo hechos verificados
-- (tandas 1-3 de Perplexity, con fuente citable en cada campo). R15: el campo
-- `sensible` queda NULL con sensible_status='sin_relevamiento' — no existe
-- relevamiento de geometría interna en nuestras fuentes (la coordenada del
-- Decreto 2.154/2009 art. 1, ~30°3 S 68°10 O, es aproximada y pública, no un
-- relevamiento de custodia). Reglas de acceso vacías donde no hay regla
-- publicada verificada — nunca se inventa. La ficha de tejedora NO se siembra:
-- 0 consentimientos reales (Ley 25.326/ADR-027; decisión DH 2026-10-14, traza
-- #173 comment 6159546907). Idempotente: ON CONFLICT (activo_id) DO NOTHING.

INSERT INTO activos_patrimonio (id, activo_id, proteccion_nivel, proteccion_norma, conservacion_estado, acceso_lat, acceso_lng, reglas_acceso, sensible, sensible_status, sensible_nota, created_at, updated_at)
SELECT 'seed-patrimonio-yacimiento-angualasto', a.id, 'nacional_decreto',
  'Decreto 2.154/2009 (art. 1) - Lugar Histórico Nacional; Ley 7.300/2002 (declaratoria provincial, marco Ley 411-F)',
  'Conservación fase 1 oct-2023 a may-2024 (Municipio de Iglesia + Ministerio de Turismo y Cultura SJ + Desarrollos de Prospectos Mineros S.A.P.); tramo Qhapaq Ñan Angualasto-Colangüil documentado (CONICET) con atribución inca NO sostenida por ese estudio; fechados 14C de ocupación temprana NO verificados para Iglesia (todos Calingasta).',
  NULL, NULL, '[]'::jsonb, NULL, 'sin_relevamiento',
  'La coordenada del decreto (~30°3 S 68°10 O) es aproximada y de fuente pública; no existe relevamiento de geometría interna en fuentes verificadas.',
  '2026-10-14T12:00:00Z', '2026-10-14T12:00:00Z'
FROM activos a WHERE a.hash = 'seed-activo-yacimiento-angualasto'
ON CONFLICT (activo_id) DO NOTHING;

INSERT INTO activos_patrimonio (id, activo_id, proteccion_nivel, proteccion_norma, conservacion_estado, acceso_lat, acceso_lng, reglas_acceso, sensible, sensible_status, sensible_nota, created_at, updated_at)
SELECT 'seed-patrimonio-capilla-achango', a.id, 'nacional_ley',
  'Ley 24.790 (1997) - Monumento Histórico Nacional (conjunto capilla y vivienda)',
  'Estado crítico reportado 2026 (verificación tanda 1; confirmación técnica pedida en tanda 4); alfombras de más de 350 años.',
  NULL, NULL, '[]'::jsonb, NULL, 'sin_relevamiento',
  'Sin relevamiento de geometría interna en fuentes verificadas; la capilla acredita ubicación por el paraje BAHRA Achango.',
  '2026-10-14T12:00:00Z', '2026-10-14T12:00:00Z'
FROM activos a WHERE a.hash = 'seed-activo-capilla-achango'
ON CONFLICT (activo_id) DO NOTHING;

INSERT INTO activos_patrimonio (id, activo_id, proteccion_nivel, proteccion_norma, conservacion_estado, acceso_lat, acceso_lng, reglas_acceso, sensible, sensible_status, sensible_nota, created_at, updated_at)
SELECT 'seed-patrimonio-molino-bella-vista', a.id, 'nacional_ley',
  'Ley 25.291 (2000) - Monumento Histórico Nacional (conjunto Jáchal-Iglesia con el Molino Escobar, 1876)',
  NULL, NULL, NULL, '[]'::jsonb, NULL, 'sin_relevamiento',
  'Sin relevamiento de geometría interna en fuentes verificadas; el molino acredita ubicación por el distrito Bella Vista.',
  '2026-10-14T12:00:00Z', '2026-10-14T12:00:00Z'
FROM activos a WHERE a.hash = 'seed-activo-molino-bella-vista'
ON CONFLICT (activo_id) DO NOTHING;

-- Sellos patrimonio.ingestado en events_raw (fuente de verdad): uno por
-- ficha de la ingesta curada; payload sin PII (solo claves territoriales y
-- nivel de protección); hash idempotente = hash del activo + ':pat' (el hash
-- del activo ya sella activo.ingestado en VIG-002).
INSERT INTO events_raw (id, type, payload, hash, occurred_at, ingested_at)
SELECT 'seedev-pat-' || p.id, 'patrimonio.ingestado',
       jsonb_build_object('activo_id', a.id, 'nodo_key', a.nodo_key,
                          'subnodo_key', a.subnodo_key,
                          'proteccion_nivel', p.proteccion_nivel,
                          'sensible_status', p.sensible_status,
                          'source', 'seed-vig-004'),
       a.hash || ':pat', '2026-10-14T12:00:00Z', '2026-10-14T12:00:00Z'
FROM activos_patrimonio p
JOIN activos a ON a.id = p.activo_id
WHERE p.id LIKE 'seed-patrimonio-%'
ON CONFLICT (hash) DO NOTHING;
