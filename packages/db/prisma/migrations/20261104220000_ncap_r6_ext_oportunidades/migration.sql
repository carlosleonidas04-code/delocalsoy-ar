-- NODO-CAPITAL NCAP-R6-ext (#165): extensiones del dominio oportunidades —
-- aportes de diseño de la Sesión 5 corroborados en #163, sobre la base
-- canónica de #160 (no-go honrado: la versión en memoria fail-open no se
-- aterriza).
-- 1) scoring Json? — interpretación con método (ADR-035), null honesto.
-- 2) territorial_context Json? — vocabulario cor_* v0.1 (hipótesis
--    provisional #156), sin traza oficial.
-- 3) oportunidad_conexiones — vínculos oferta/demanda entre actores con
--    consentimiento explícito obligatorio (ADR-027, Ley 25.326): el contrato
--    Zod exige true — sin consentimiento no hay vínculo. hash único
--    → idempotencia del vínculo.

-- AlterTable
ALTER TABLE "oportunidades" ADD COLUMN "scoring" JSONB;
ALTER TABLE "oportunidades" ADD COLUMN "territorial_context" JSONB;

-- CreateTable
CREATE TABLE "oportunidad_conexiones" (
    "id" TEXT NOT NULL,
    "oportunidad_id" TEXT NOT NULL,
    "actor_origen" JSONB NOT NULL,
    "actor_destino" JSONB NOT NULL,
    "tipo_vinculo" TEXT NOT NULL,
    "consentimiento_confirmado" BOOLEAN NOT NULL,
    "created_by_hash" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oportunidad_conexiones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "oportunidad_conexiones_oportunidad_id_idx" ON "oportunidad_conexiones"("oportunidad_id");
CREATE UNIQUE INDEX "oportunidad_conexiones_hash_key" ON "oportunidad_conexiones"("hash");
