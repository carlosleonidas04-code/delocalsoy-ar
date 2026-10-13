-- NODO-VIG VIG-002 (NVIG-R2 #169, épica #167): activos multimodales.
-- Opción A ratificada por la DH (2026-10-13): extender el dominio activos
-- existente, no duplicarlo (mismo criterio estructural que #160/#167).
-- - subnodo_key: contexto de distrito/paraje SIN FK dura (patrón oportunidades)
-- - visibilidad ADR-036: public | generalized | restricted
-- - procedencia ADR-035 (JSONB) + consentimiento granular (JSONB, Ley 25.326)
-- - is_synthetic + hash único (idempotencia de la ingesta curada seed-activo-*)
-- - lat/lng pasan a opcionales: sin punto verificado, geom es null (R15) —
--   el trigger se reemplaza por la versión NULL-safe.

-- AlterTable
ALTER TABLE "activos" ADD COLUMN "subnodo_key" TEXT;
ALTER TABLE "activos" ADD COLUMN "visibilidad" TEXT NOT NULL DEFAULT 'public';
ALTER TABLE "activos" ADD COLUMN "procedencia" JSONB;
ALTER TABLE "activos" ADD COLUMN "consentimiento" JSONB;
ALTER TABLE "activos" ADD COLUMN "is_synthetic" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "activos" ADD COLUMN "hash" TEXT;
ALTER TABLE "activos" ALTER COLUMN "lat" DROP NOT NULL;
ALTER TABLE "activos" ALTER COLUMN "lng" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "activos_hash_key" ON "activos"("hash");
CREATE INDEX "activos_subnodo_key_idx" ON "activos"("subnodo_key");

-- PostGIS: trigger NULL-safe (VIG-002) — sin punto verificado, geom es null;
-- nunca un punto inventado para un activo que se acredita por subnodo (R15).
CREATE OR REPLACE FUNCTION activos_set_geom() RETURNS trigger AS $$
BEGIN
  IF NEW.lat IS NULL OR NEW.lng IS NULL THEN
    NEW.geom := NULL;
  ELSE
    NEW.geom := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- CreateTable: taxonomía N1→N3 del VIG-000 (una primaria + secundarias,
-- fuente obligatoria por clasificación). FK dura al activo (Cascade).
CREATE TABLE "activos_clasificaciones" (
    "id" TEXT NOT NULL,
    "activo_id" TEXT NOT NULL,
    "n1" TEXT NOT NULL,
    "n2" TEXT NOT NULL,
    "n3" TEXT NOT NULL DEFAULT '',
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activos_clasificaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "activos_clasificaciones_activo_id_n1_n2_n3_key" ON "activos_clasificaciones"("activo_id", "n1", "n2", "n3");
CREATE INDEX "activos_clasificaciones_n1_idx" ON "activos_clasificaciones"("n1");

-- AddForeignKey
ALTER TABLE "activos_clasificaciones" ADD CONSTRAINT "activos_clasificaciones_activo_id_fkey" FOREIGN KEY ("activo_id") REFERENCES "activos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
