-- Seed LIC-DLUI LIC-R4 (LIC-04 #455, épica #448): capas de amenaza sísmica
-- del vocabulario. DL-9 ratificado: las capas de amenaza nacen del
-- vocabulario (tabla capas) y su PUBLICACIÓN fluye por el pipeline de
-- ingestas (capa_servicio = capas.key — patrón fuentes/ingestas NODO-CAU
-- R2 #138/#147, EV-049), jamás por geometría de memoria (R15: la traza
-- federada INPRES llega por ingesta).
-- Regla ratificada metadatos-antes-de-capa: la capa nace 'declarada' con
-- ingesta null y SOLO la ingesta publicada (fuente INPRES, fecha de corte,
-- CRS, escala — NC-EV-09) la pasa a 'publicada' en la lectura derivada de
-- GET /api/amenazas (R15: null ≠ 0).
-- Ancla sísmica verificada: INPRES Zona 4 (provincia de San Juan) y norma
-- INPRES-CIRSOC 103 Parte I (2018). La fuente 'inpres' ya vive en el
-- catálogo global (seed-fuentes-cau.sql, NODO-CAU R2) — este seed NO la
-- duplica. Anti-puntaje (R5/ADR-036): la capa es amenaza de referencia,
-- NUNCA evaluación de vulnerabilidad por edificio (ADR-036) ni ranking de
-- riesgo entre nodos; la plataforma no es alerta operativa.
-- Coherencia del vocabulario: 'seismic_risk' ya existe en caucete
-- (CORE-003 #83, dominio health) — aquí se declara la misma capa para
-- capital e iglesia, misma clave y mismo dominio (canon de dominios del
-- schema, sin vocabulario paralelo).
-- Idempotencia: ON CONFLICT DO NOTHING por (nodo_id,key) de capas y hash
-- único de sellos (patrón seed-vocabulario-capital NCAP-R1 / seed-vocabulario-
-- vial-iglesia VIG-010: sello existente capa.registrada, sin fila nueva de
-- MATRIZ_SELLOS — regla 5 satisfecha por reutilización).

INSERT INTO capas (id, nodo_id, key, nombre, dominio, geometria, default_on)
VALUES
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'capital'), 'seismic_risk', 'Riesgo sísmico y puntos de encuentro', 'health', 'Point', false),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'seismic_risk', 'Riesgo sísmico y puntos de encuentro', 'health', 'Point', false)
ON CONFLICT (nodo_id, key) DO NOTHING;

-- ─── Sellos (patrón seed-fuentes/seed-corredores: events_raw única fuente de verdad) ───
INSERT INTO events_raw (id, type, payload, hash, occurred_at, ingested_at)
SELECT gen_random_uuid()::text, 'capa.registrada',
       jsonb_build_object('nodo_key', 'capital', 'key', 'seismic_risk', 'dominio', 'health', 'geometria', 'Point', 'source', 'seed-lic-r4'),
       'seed-capa-capital-seismic_risk', '2026-11-12T12:00:00Z', '2026-11-12T12:00:00Z'
ON CONFLICT (hash) DO NOTHING;

INSERT INTO events_raw (id, type, payload, hash, occurred_at, ingested_at)
SELECT gen_random_uuid()::text, 'capa.registrada',
       jsonb_build_object('nodo_key', 'iglesia', 'key', 'seismic_risk', 'dominio', 'health', 'geometria', 'Point', 'source', 'seed-lic-r4'),
       'seed-capa-iglesia-seismic_risk', '2026-11-12T12:00:00Z', '2026-11-12T12:00:00Z'
ON CONFLICT (hash) DO NOTHING;
