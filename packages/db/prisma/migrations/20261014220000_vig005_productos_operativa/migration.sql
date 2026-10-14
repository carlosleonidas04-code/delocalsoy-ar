-- VIG-005 (NVIG-R7 #174, épica #167): producción y turismo.
-- Tabla productos (1:N con activos — alta ciudadana con moderación: nace
-- 'propuesto') y tabla activos_operativa (1:1: horario, temporada, capacidad
-- y seguridad — capacity_status 'unknown' honesto, R15). SIN columnas geom:
-- no se duplica dominio espacial (criterio estructural #149/#167).

-- CreateTable
CREATE TABLE "productos" (
    "id" TEXT NOT NULL,
    "activo_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT,
    "temporada_meses" JSONB NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'propuesto',
    "procedencia" JSONB,
    "created_by_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activos_operativa" (
    "activo_id" TEXT NOT NULL,
    "horario" TEXT,
    "temporada_meses" JSONB NOT NULL,
    "capacity_status" TEXT NOT NULL DEFAULT 'unknown',
    "capacidad_plazas" INTEGER,
    "seguridad" JSONB,
    "habilitacion" JSONB,
    "procedencia" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activos_operativa_pkey" PRIMARY KEY ("activo_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "productos_activo_id_slug_key" ON "productos"("activo_id", "slug");
CREATE INDEX "productos_estado_idx" ON "productos"("estado");

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_activo_id_fkey" FOREIGN KEY ("activo_id") REFERENCES "activos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activos_operativa" ADD CONSTRAINT "activos_operativa_activo_id_fkey" FOREIGN KEY ("activo_id") REFERENCES "activos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
