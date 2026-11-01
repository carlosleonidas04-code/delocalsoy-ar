-- NODO-VIG VIG-003 (NVIG-R3 #182, épica #167): KPIs del nodo.
-- Set honesto v1 ratificado por la DH (2026-10-14): snapshots materializados
-- por (nodo_key, kpi_key) — el recompute del consumidor vig003-kpi del worker
-- es un upsert idempotente que RE-DERIVA desde las tablas de dominio, nunca
-- incrementos. Agregados sin PII (Ley 25.326); la visibilidad restricted queda
-- excluida de todo cálculo (ADR-036); valor NULL = métrica sin computar
-- (cobertura v1, R15) — null honesto, nunca 0 inventado.

-- CreateTable
CREATE TABLE "kpi_snapshots" (
    "id" TEXT NOT NULL,
    "nodo_key" TEXT NOT NULL,
    "kpi_key" TEXT NOT NULL,
    "valor" DOUBLE PRECISION,
    "detalles" JSONB NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kpi_snapshots_pkey" PRIMARY KEY ("nodo_key", "kpi_key")
);

-- CreateIndex
CREATE UNIQUE INDEX "kpi_snapshots_id_key" ON "kpi_snapshots"("id");
