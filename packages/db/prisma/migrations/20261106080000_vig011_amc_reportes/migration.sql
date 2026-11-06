-- VIG-011 (#378, épica #377): AMC — mediación ciudadana del nodo Iglesia.
-- Extensión de "reportes" SIN tabla nueva (patrón VIG-002: la escritura
-- legacy CORE-005 queda intacta — sin "dominio" en el cuerpo, el alta no
-- cambia) + registro de mediadores con aval comunitario. R15: SIN seed —
-- la asamblea aún no ratificó mediadores (conteo 0 honesto); el registro
-- se opera por POST /api/mediadores (admin) con sello en events_raw.

-- AMC: contexto de mediación del reporte (VIG-011, #378).
ALTER TABLE "reportes" ADD COLUMN "subnodo_key" TEXT;
ALTER TABLE "reportes" ADD COLUMN "dominio" TEXT;
ALTER TABLE "reportes" ADD COLUMN "tipo" TEXT;
ALTER TABLE "reportes" ADD COLUMN "canal_ingreso" TEXT;
ALTER TABLE "reportes" ADD COLUMN "mediador_ref" TEXT;
ALTER TABLE "reportes" ADD COLUMN "reportado_por" TEXT;
ALTER TABLE "reportes" ADD COLUMN "consentimiento" JSONB;
ALTER TABLE "reportes" ADD COLUMN "precision" TEXT;
ALTER TABLE "reportes" ADD COLUMN "riesgo_inmediato" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "reportes" ADD COLUMN "observado_en" TIMESTAMP(3);
ALTER TABLE "reportes" ADD COLUMN "cluster_key" TEXT;

CREATE INDEX "reportes_dominio_idx" ON "reportes"("dominio");
CREATE INDEX "reportes_subnodo_key_idx" ON "reportes"("subnodo_key");
CREATE INDEX "reportes_cluster_key_idx" ON "reportes"("cluster_key");

-- Registro de mediadores del AMC (VIG-011): nace VACÍO (R15).
CREATE TABLE "mediadores" (
    "id" TEXT NOT NULL,
    "nodo_key" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "aval" TEXT NOT NULL,
    "aval_estado" TEXT NOT NULL DEFAULT 'vigente',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "mediadores_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mediadores_key_key" ON "mediadores"("key");
CREATE INDEX "mediadores_nodo_key_idx" ON "mediadores"("nodo_key");
