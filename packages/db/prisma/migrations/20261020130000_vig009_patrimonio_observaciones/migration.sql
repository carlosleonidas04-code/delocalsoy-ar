-- VIG-009 R1 (#241, épica #239): observaciones de estado patrimonial — tabla
-- append-only de testimonios ciudadanos sobre activos con ficha patrimonial
-- (VIG-004). SIN updated_at: no se edita ni se borra (ADR-038).

CREATE TABLE "patrimonio_observaciones" (
    "id" TEXT NOT NULL,
    "activo_id" TEXT NOT NULL,
    "fecha_observacion" TEXT NOT NULL,
    "checklist" JSONB NOT NULL,
    "nota" TEXT,
    "evidencia" JSONB NOT NULL,
    "created_by_hash" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patrimonio_observaciones_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "patrimonio_observaciones_hash_key" ON "patrimonio_observaciones"("hash");
CREATE INDEX "patrimonio_observaciones_activo_id_idx" ON "patrimonio_observaciones"("activo_id");

ALTER TABLE "patrimonio_observaciones" ADD CONSTRAINT "patrimonio_observaciones_activo_id_fkey" FOREIGN KEY ("activo_id") REFERENCES "activos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
