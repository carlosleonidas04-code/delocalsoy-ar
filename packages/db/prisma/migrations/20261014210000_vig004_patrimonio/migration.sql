-- VIG-004 (NVIG-R6 #173, épica #167): ficha patrimonial protegida.
-- Tabla 1:1 con activos (activo_id UNIQUE, ON DELETE CASCADE): la
-- declaratoria, la conservación, el punto público de acceso y las reglas son
-- registro publicable; `sensible` (geometría/datos internos de custodia)
-- NUNCA sale por las lecturas públicas (ADR-036) — solo su estado honesto
-- sensible_status ('sin_relevamiento' = R15: no existe coordenada precisa en
-- nuestras fuentes). SIN columna geom: el punto de acceso es un par de
-- floats con fuente (criterio estructural #149/#167, patrón subnodos).

-- CreateTable
CREATE TABLE "activos_patrimonio" (
    "id" TEXT NOT NULL,
    "activo_id" TEXT NOT NULL,
    "proteccion_nivel" TEXT NOT NULL,
    "proteccion_norma" TEXT NOT NULL,
    "conservacion_estado" TEXT,
    "acceso_lat" DOUBLE PRECISION,
    "acceso_lng" DOUBLE PRECISION,
    "reglas_acceso" JSONB NOT NULL,
    "sensible" JSONB,
    "sensible_status" TEXT NOT NULL DEFAULT 'sin_relevamiento',
    "sensible_nota" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activos_patrimonio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "activos_patrimonio_activo_id_key" ON "activos_patrimonio"("activo_id");

-- AddForeignKey
ALTER TABLE "activos_patrimonio" ADD CONSTRAINT "activos_patrimonio_activo_id_fkey" FOREIGN KEY ("activo_id") REFERENCES "activos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
