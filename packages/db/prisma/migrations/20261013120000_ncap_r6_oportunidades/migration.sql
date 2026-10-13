-- NODO-CAPITAL NCAP-R6 (#158): Bloque 9 — Banco de Potencialidades.
-- Oportunidades de desarrollo local: capacidades, recursos, demandas, vacíos
-- y vínculos. Nace 'detected' con evidencia obligatoria; ciclo de vida por
-- matriz de transiciones en la API. SIN columna geom: el contexto territorial
-- se acredita por nodo_key + subnodo_key (criterio estructural #149/#158).
-- Autor = pseudónimo sha256(usuario_id) truncado — sin PII (Ley 25.326,
-- ADR-027). Actores con consentimiento confirmado si se nombran.
-- hash único → idempotencia del alta.

-- CreateTable
CREATE TABLE "oportunidades" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'detected',
    "nodo_key" TEXT NOT NULL,
    "subnodo_key" TEXT,
    "evidencia" JSONB NOT NULL,
    "actores" JSONB NOT NULL,
    "tags" JSONB NOT NULL,
    "created_by_hash" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oportunidades_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "oportunidades_nodo_key_idx" ON "oportunidades"("nodo_key");
CREATE INDEX "oportunidades_estado_idx" ON "oportunidades"("estado");

-- CreateIndex (idempotencia del alta)
CREATE UNIQUE INDEX "oportunidades_hash_key" ON "oportunidades"("hash");
