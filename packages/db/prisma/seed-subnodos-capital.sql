-- Seed NODO-CAPITAL NCAP-R2 (activación territorial, #154, épica #152):
-- subnodos territoriales del nodo Capital. Estructura v0.1 ratificada
-- por la Dirección Humana ("RATIFICADO" en #154, 2026-10-13; directiva
-- 2026-10-14: activación territorial primero, patrón VIG-001): los 2
-- distritos documentados en el PEC 2025 — Centro y Desamparados — como
-- hijos directos del nodo. REGLA DE MODELADO (#154): distrito oficial ≠
-- área funcional ≠ relación por corredor — microcentro/macrocentro/
-- centro_cívico son ÁREAS ANALÍTICAS y las centralidades (Plaza Salvador
-- María del Carril/Basílica, Facultad de Ingeniería UNSJ, Parque de Mayo)
-- participan por relaciones near/connects SIN asignación distrital
-- (NCAP-R4): ninguna se siembra como subnodo. Todo nace provisional
-- hasta contraste UNIDE/Catastro (ADR-035). Puntos lat/lng NULL
-- honestos: los puntos BAHRA/Georef están A VERIFICAR para estas
-- entidades urbanas — sin punto verificado no se publica (R15).
-- Idempotencia: ON CONFLICT (key) DO NOTHING; sellos por hash único.

INSERT INTO subnodos (id, nodo_key, key, label, type, parent_key, boundary_status, assignment_status, zone, lat, lng, external_id, external_source, created_at, updated_at)
VALUES
  -- Distritos documentados en el PEC 2025 — hijos directos del nodo
  (gen_random_uuid()::text, 'capital', 'sj_capital_centro', 'Centro', 'district', NULL, 'provisional', 'dh_directive', 'gran_san_juan', NULL, NULL, NULL, NULL, '2026-10-15T12:00:00Z', '2026-10-15T12:00:00Z'),
  (gen_random_uuid()::text, 'capital', 'sj_capital_desamparados', 'Desamparados', 'district', NULL, 'provisional', 'dh_directive', 'gran_san_juan', NULL, NULL, NULL, NULL, '2026-10-15T12:00:00Z', '2026-10-15T12:00:00Z')
ON CONFLICT (key) DO NOTHING;

-- Sellos subnodo.creado (patrón VIG-001: events_raw única fuente de
-- verdad; hash fijo 'seed-subnodo-<key>' → idempotencia).
INSERT INTO events_raw (id, type, payload, hash, occurred_at, ingested_at)
SELECT gen_random_uuid()::text, 'subnodo.creado',
       jsonb_build_object('nodo_key', s.nodo_key, 'key', s.key, 'type', s.type,
                          'parent_key', s.parent_key, 'source', 'seed-ncap-r2'),
       'seed-subnodo-' || s.key, s.created_at, s.created_at
FROM subnodos s
WHERE s.nodo_key = 'capital'
ON CONFLICT (hash) DO NOTHING;
