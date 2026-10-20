-- Seed VIG-008 R6 (#240, épica #239): 2 oportunidades del eje
-- cooperativas del Valle de Iglesia en el Bloque 9 (dominio #160,
-- patrón seed-fuentes-vig): estado detected (registro comunitario
-- sujeto a revisión), evidencia obligatoria con evidence_type
-- canónico, actores SIN nombre y consent_confirmed=false (ADR-027:
-- ningún actor se nombra sin consentimiento formal, VIG-008 R3),
-- created_by_hash 'seed-vig-008' = sello de origen, no un ciudadano.
-- Idempotencia: ON CONFLICT (hash) DO NOTHING.

INSERT INTO oportunidades (id, tipo, titulo, descripcion, estado, nodo_key, subnodo_key, evidencia, actores, tags, created_by_hash, hash, created_at, updated_at)
VALUES
  (gen_random_uuid()::text, 'market_gap', 'Canal de semillas del programa Pro Huerta discontinuado', 'El programa Pro Huerta (INTA) fue discontinuado hacia fines de 2023, dejando sin canal de abastecimiento de semillas a las huertas familiares del valle. FECOAGRO nació en 1983 del proyecto INTA AER San Martín y las cooperativas agropecuarias del departamento Iglesia (Tudcum y Valles Iglesianos) son las organizaciones naturales para cubrir esa brecha (brecha post-cierre, verificación 2026-10-17, #240).', 'detected', 'iglesia', NULL, '{"evidence_type":"news_source","descripcion":"Pro Huerta (INTA) discontinuado hacia fines de 2023; FECOAGRO nació en 1983 del proyecto INTA AER San Martín (verificación 2026-10-17, traza #240)."}'::jsonb, '[{"role":"provider","consent_confirmed":false},{"role":"beneficiary","consent_confirmed":false}]'::jsonb, '["pro_huerta","semillas","huertas_familiares","fecoagro"]'::jsonb, 'seed-vig-008', 'seed-oportunidad-vig008-pro-huerta', '2026-10-20T12:00:00Z', '2026-10-20T12:00:00Z'),
  (gen_random_uuid()::text, 'partnership_opportunity', 'Extensión y cooperación técnica para las cooperativas del valle', 'Las cooperativas del Valle de Iglesia (Tudcum y Valles Iglesianos, federadas en FECOAGRO) requieren acompañamiento de extensión y cooperación técnica: colaboración interdisciplinaria con vínculos universitarios nacionales y CONICET documentados en el corpus del nodo (verificación 2026-10-17, #240).', 'detected', 'iglesia', NULL, '{"evidence_type":"institutional_document","descripcion":"Colaboración interdisciplinaria con vínculos con la universidad nacional y CONICET documentados en el corpus del nodo (verificación 2026-10-17, traza #240)."}'::jsonb, '[{"role":"partner","consent_confirmed":false}]'::jsonb, '["extension_tecnica","cooperativas","fecoagro"]'::jsonb, 'seed-vig-008', 'seed-oportunidad-vig008-extension', '2026-10-20T12:00:00Z', '2026-10-20T12:00:00Z')
ON CONFLICT (hash) DO NOTHING;

-- Sellos oportunidad.propuesta (patrón seed-fuentes-vig: events_raw
-- única fuente de verdad; hash = hash de la oportunidad → idempotencia;
-- payload source 'seed-vig-008' distingue el origen; sin PII).
INSERT INTO events_raw (id, type, payload, hash, occurred_at, ingested_at)
SELECT gen_random_uuid()::text, 'oportunidad.propuesta',
       jsonb_build_object('oportunidad_id', o.id, 'tipo', o.tipo, 'nodo_key', o.nodo_key, 'subnodo_key', o.subnodo_key, 'estado', o.estado, 'created_by_hash', o.created_by_hash, 'source', 'seed-vig-008'),
       o.hash, o.created_at, o.created_at
FROM oportunidades o
WHERE o.hash IN ('seed-oportunidad-vig008-pro-huerta', 'seed-oportunidad-vig008-extension')
ON CONFLICT (hash) DO NOTHING;
