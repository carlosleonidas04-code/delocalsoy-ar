-- MARKET-CAP MK-1 (#243, sub-épica #152): ficha de mercado del comercio.
-- Tabla comercio_ficha (1:1 con activos — patrón activos_patrimonio/
-- activos_operativa, Opción A ratificada por la DH 2026-10-17): SOLO el
-- dominio específico del mercado (rubro, atributos, habilitación COMERCIAL,
-- titularidad). Estado, visibilidad, consentimiento, procedencia, pseudónimo
-- y geometría viven en activos (no se duplican — lección #161). SIN columnas
-- geom: no se duplica dominio espacial (criterio estructural #149/#167).

-- CreateTable
CREATE TABLE "comercio_ficha" (
    "activo_id" TEXT NOT NULL,
    "rubro_id" TEXT NOT NULL,
    "rubro_rama" TEXT,
    "atributos" JSONB NOT NULL,
    "habilitacion" JSONB NOT NULL,
    "titularidad" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comercio_ficha_pkey" PRIMARY KEY ("activo_id")
);

-- CreateIndex
CREATE INDEX "comercio_ficha_rubro_id_idx" ON "comercio_ficha"("rubro_id");

-- AddForeignKey
ALTER TABLE "comercio_ficha" ADD CONSTRAINT "comercio_ficha_activo_id_fkey" FOREIGN KEY ("activo_id") REFERENCES "activos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
