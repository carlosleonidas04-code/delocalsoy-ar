-- NODO-CAU R4 (#149): ficha de valoración comunitaria del espacio público.
-- Testimonio revisable (ADR-036): testimonio → corroborada | descartada;
-- corroboracion = individual | taller_comunitario. Autor = pseudónimo
-- sha256(usuario_id) truncado — sin PII (Ley 25.326, ADR-027).
-- SIN columna geom: la ficha hereda la geometría del feature (capa public_space)
-- vía JOIN — el espacio ES el feature (decisión estructural #149).
-- hash único → idempotencia del alta.

-- CreateTable
CREATE TABLE "fichas_valoracion" (
    "id" TEXT NOT NULL,
    "nodo_key" TEXT NOT NULL,
    "feature_id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "respuestas" JSONB NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'testimonio',
    "corroboracion" TEXT,
    "created_by_hash" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fichas_valoracion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fichas_valoracion_nodo_key_idx" ON "fichas_valoracion"("nodo_key");
CREATE INDEX "fichas_valoracion_feature_id_idx" ON "fichas_valoracion"("feature_id");

-- CreateIndex (idempotencia del alta)
CREATE UNIQUE INDEX "fichas_valoracion_hash_key" ON "fichas_valoracion"("hash");
