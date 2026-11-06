-- ARTEFACTOS-ROLES AR1 (#400, épica #399): atributo de residencia (vecino)
-- + cuenta ligera visitante sobre usuarios.
--
-- Ley 25.326 / ADR-027: SIN domicilio jamás — la residencia es la CLAVE del
-- subnodo declarado y su timestamp de auto-declaración (R15: sin
-- verificación); el visitante guarda el subnodo de tránsito DECLARADO
-- (jamás geolocalizado) y su consentimiento granular.

ALTER TABLE "usuarios" ADD COLUMN "residencia_subnodo_key" TEXT,
ADD COLUMN "residencia_declarada_en" TIMESTAMP(3),
ADD COLUMN "transito_subnodo_key" TEXT,
ADD COLUMN "consentimiento" JSONB;
