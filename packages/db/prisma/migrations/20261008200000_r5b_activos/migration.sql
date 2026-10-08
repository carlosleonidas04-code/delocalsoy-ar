-- CORE-004 R5b (#87): dominio activos — escritura ciudadana verificada.
-- El ciudadano propone (estado 'propuesto'); la moderación del estado queda
-- en moderador|admin (PATCH /api/activos/:id/estado). created_by_hash es un
-- pseudónimo sha256(usuario_id) truncado: nunca PII en la tabla (Ley 25.326,
-- ADR-027). La columna geom + trigger lat/lng + índice GiST siguen el patrón
-- versionado de 20261007120000_core002_schema (Prisma no tipa geometry).

-- CreateTable
CREATE TABLE "activos" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'propuesto',
    "nodo_key" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "created_by_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "geom" geometry(Point, 4326),

    CONSTRAINT "activos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activos_estado_idx" ON "activos"("estado");
CREATE INDEX "activos_nodo_key_idx" ON "activos"("nodo_key");

-- PostGIS (patrón core002): trigger que sincroniza geom desde lat/lng.
CREATE OR REPLACE FUNCTION activos_set_geom() RETURNS trigger AS $$
BEGIN
  NEW.geom := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_activos_geom ON activos;
CREATE TRIGGER trg_activos_geom
  BEFORE INSERT OR UPDATE OF lat, lng
  ON activos
  FOR EACH ROW EXECUTE FUNCTION activos_set_geom();

-- Índice espacial GiST
CREATE INDEX IF NOT EXISTS activos_geom_idx ON activos USING GIST (geom);
