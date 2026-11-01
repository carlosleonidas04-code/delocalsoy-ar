-- NODO-VIG VIG-006 (NVIG-R8 #188, épica #167): RAG territorial ético.
-- Índice materializado rag_index: fragmentos de prosa autorizada SOLO de
-- contenido publicado (subnodos, activos aprobados no restricted con fichas
-- públicas, KPIs agregados). Recompute idempotente por (nodo_key, source_type,
-- source_id) — patrón kpi_snapshots (VIG-003); nunca restricted ni sensible
-- ni PII (ADR-036, Ley 25.326, R15).

-- CreateTable
CREATE TABLE "rag_index" (
    "id" TEXT NOT NULL,
    "nodo_key" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "subnodo_key" TEXT,
    "texto" TEXT NOT NULL,
    "fuentes" JSONB NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rag_index_pkey" PRIMARY KEY ("nodo_key","source_type","source_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rag_index_id_key" ON "rag_index"("id");

-- Full-text nativo de PostgreSQL (decisión DH ratificada 2026-10-14: 0
-- dependencias nuevas): columna tsvector GENERADA en español + índice GIN.
-- Prisma no tipa tsvector — vive solo en la migración versionada.
ALTER TABLE "rag_index" ADD COLUMN "search" tsvector GENERATED ALWAYS AS (to_tsvector('spanish'::regconfig, coalesce("texto", ''))) STORED;
CREATE INDEX "rag_index_search_idx" ON "rag_index" USING GIN ("search");
