-- Seed territorial ADR-021 (CORE-002 T3, #65): Capital, Caucete, Iglesia.
-- Idempotente: INSERT ... SELECT ... WHERE NOT EXISTS por (nombre, provincia).
-- No usa ON CONFLICT porque (nombre, provincia) no tiene unique constraint —
-- el guard de duplicados es el NOT EXISTS. Re-ejecutar preserva activo.
-- Coordenadas referenciales de cabecera departamental (ajustables por la
-- Dirección Humana: son datos de dominio, no de implementación).

INSERT INTO territorios (id, nombre, provincia, activo, geom)
SELECT gen_random_uuid()::text, 'Capital', 'San Juan', true,
       ST_SetSRID(ST_MakePoint(-68.5365, -31.5375), 4326)
WHERE NOT EXISTS (SELECT 1 FROM territorios WHERE nombre = 'Capital' AND provincia = 'San Juan');

INSERT INTO territorios (id, nombre, provincia, activo, geom)
SELECT gen_random_uuid()::text, 'Caucete', 'San Juan', true,
       ST_SetSRID(ST_MakePoint(-67.5061, -31.3864), 4326)
WHERE NOT EXISTS (SELECT 1 FROM territorios WHERE nombre = 'Caucete' AND provincia = 'San Juan');

INSERT INTO territorios (id, nombre, provincia, activo, geom)
SELECT gen_random_uuid()::text, 'Iglesia', 'San Juan', true,
       ST_SetSRID(ST_MakePoint(-69.1626, -29.6018), 4326)
WHERE NOT EXISTS (SELECT 1 FROM territorios WHERE nombre = 'Iglesia' AND provincia = 'San Juan');
