-- Seed VIG-009 R2 (#241, épica #239): categorías de reporte patrimonial del
-- nodo iglesia sobre CORE-005 vivo (historial público ADR-038, duplicados como
-- sugerencia ADR-039, justificación obligatoria por transición). Los 15+ años
-- de notas sin respuesta (Diario 13 San Juan) se vuelven bandeja pública con
-- historial inmutable: qué se denunció, cuándo y qué respuesta hubo (o no
-- hubo). Patrón seed.sql (vocabulario CORE-003 #83). Idempotencia:
-- ON CONFLICT (nodo_id, code) DO NOTHING.

INSERT INTO categorias (id, nodo_id, code, label, capa_id)
VALUES
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'patrimonio_deterioro', 'Deterioro patrimonial', (SELECT id FROM capas WHERE key = 'tourism_resources' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia'))),
  (gen_random_uuid()::text, (SELECT id FROM nodos WHERE key = 'iglesia'), 'patrimonio_perdida', 'Pérdida patrimonial', (SELECT id FROM capas WHERE key = 'tourism_resources' AND nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia')))
ON CONFLICT (nodo_id, code) DO NOTHING;
