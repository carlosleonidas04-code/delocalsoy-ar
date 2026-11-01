-- Seed MARKET-CAP MK-2 (#243, sub-epica #152): fuente del registro web SIIC
-- (ratificado DH seccion 7.4, traza #243). Certificado web SIIC = Licencia
-- Comercial (Ley 104-A). CAUTELA (ADR-035): verificacion individual por
-- consentimiento del propio comercio, NO padron bulk (Ley 27.275, pedido
-- formal abierto, no bloqueante) - nada de prensa llega a 'verified'.
-- Errata seccion 9.4 del design doc (MARKET-CAP-DISENO-MK2.md): el diseno
-- citaba el sello 'seed-fuente-creada' sin ingested_at; el patron verbatim
-- del repo (seed-fuentes-cau.sql, PR #216) es 'fuente.registrada' con
-- occurred_at + ingested_at - se sigue el patron del repo.
-- 8o SQL de db:seed en esta rama (el diseno decia 9o asumiendo un
-- seed-fuentes-vig.sql que NO vive en esta rama - errata declarada).
-- Idempotencia: ON CONFLICT (key) DO NOTHING; sello por hash unico.

INSERT INTO fuentes (id, key, organismo, nombre, url, tipo, licencia, estado, cautela, created_at, updated_at)
VALUES (
  gen_random_uuid()::text,
  'fuente_siic_web',
  'Ministerio de Industria y Comercio (San Juan)',
  'Registro web SIIC - certificado web (Ley 104-A)',
  'https://industriaycomercio.sanjuan.gob.ar',
  'registro_web',
  'publica',
  'disponible',
  'verificacion individual; NO padron bulk (ADR-035)',
  '2026-10-18T12:00:00Z',
  '2026-10-18T12:00:00Z'
) ON CONFLICT (key) DO NOTHING;

-- Sello fuente.registrada (patron verbatim seed-fuentes-cau.sql: events_raw
-- unica fuente de verdad; hash fijo 'seed-fuente-<key>' -> idempotencia).
INSERT INTO events_raw (id, type, payload, hash, occurred_at, ingested_at)
SELECT gen_random_uuid()::text, 'fuente.registrada',
       jsonb_build_object('key', f.key, 'organismo', f.organismo, 'source', 'seed-market-cap-mk2'),
       'seed-fuente-' || f.key, f.created_at, f.created_at
FROM fuentes f
WHERE f.key = 'fuente_siic_web'
ON CONFLICT (hash) DO NOTHING;
