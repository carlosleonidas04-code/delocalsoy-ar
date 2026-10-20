-- VIG-008 (#240, épica #239): cooperativas del Valle de Iglesia.
-- Columna institucional (JSONB) en activos_operativa: datos registrales
-- públicos de la persona jurídica (OperativaInstitucionalSchema). Todos
-- los campos internos son nullable — vacío honesto (R15) — y solo se
-- llena tras consentimiento formal registrado (consentimiento_hash).
-- SIN columnas geom ni PII (criterio estructural #149/#167,
-- Ley 25.326/ADR-027).

-- AlterTable
ALTER TABLE "activos_operativa" ADD COLUMN "institucional" JSONB;
