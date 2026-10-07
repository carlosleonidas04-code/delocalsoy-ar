-- CORE-002 T2 (#64): vocabulario del demo territorial federado v5.1 como
-- migración versionada. Re-base de feat/core-002-schema @ 0d18f0f sobre el
-- sistema de migraciones (0_init + 20261006120000_territorios_geom_gist):
-- el SQL PostGIS manual (geom + triggers lat/lng + índices GiST) queda
-- integrado acá — ya no es un paso fuera de banda. P12: reproducción desde
-- cero limpia (el job test aplica esto sobre una DB nueva en cada CI).

CREATE EXTENSION IF NOT EXISTS postgis;

-- CreateTable
CREATE TABLE "nodos" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "foco" TEXT NOT NULL,
    "centro_lat" DOUBLE PRECISION NOT NULL,
    "centro_lng" DOUBLE PRECISION NOT NULL,
    "poblacion" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "nodos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "capas" (
    "id" TEXT NOT NULL,
    "nodo_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "dominio" TEXT NOT NULL,
    "geometria" TEXT NOT NULL,
    "default_on" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "capas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "categorias" (
    "id" TEXT NOT NULL,
    "nodo_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "capa_id" TEXT,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "features" (
    "id" TEXT NOT NULL,
    "nodo_id" TEXT NOT NULL,
    "capa_id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "fuente_label" TEXT NOT NULL,
    "observado_at" TIMESTAMP(3) NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "is_synthetic" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "geom" geometry(Point, 4326),

    CONSTRAINT "features_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reportes" (
    "id" TEXT NOT NULL,
    "nodo_id" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'received',
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "is_synthetic" BOOLEAN NOT NULL DEFAULT true,
    "hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "geom" geometry(Point, 4326),

    CONSTRAINT "reportes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "nodos_key_key" ON "nodos"("key");
CREATE UNIQUE INDEX "capas_nodo_id_key" ON "capas"("nodo_id", "key");
CREATE UNIQUE INDEX "categorias_nodo_id_code" ON "categorias"("nodo_id", "code");
CREATE UNIQUE INDEX "reportes_hash_key" ON "reportes"("hash");

-- ForeignKey
ALTER TABLE "capas" ADD CONSTRAINT "capas_nodo_id_fkey" FOREIGN KEY ("nodo_id") REFERENCES "nodos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_nodo_id_fkey" FOREIGN KEY ("nodo_id") REFERENCES "nodos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_capa_id_fkey" FOREIGN KEY ("capa_id") REFERENCES "capas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "features" ADD CONSTRAINT "features_nodo_id_fkey" FOREIGN KEY ("nodo_id") REFERENCES "nodos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "features" ADD CONSTRAINT "features_capa_id_fkey" FOREIGN KEY ("capa_id") REFERENCES "capas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reportes" ADD CONSTRAINT "reportes_nodo_id_fkey" FOREIGN KEY ("nodo_id") REFERENCES "nodos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- PostGIS (del SQL manual 0d18f0f, ahora versionado): triggers que
-- sincronizan geom desde lat/lng en cada INSERT/UPDATE.
CREATE OR REPLACE FUNCTION reportes_set_geom() RETURNS trigger AS $$
BEGIN
  NEW.geom := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reportes_geom ON reportes;
CREATE TRIGGER trg_reportes_geom
  BEFORE INSERT OR UPDATE OF lat, lng
  ON reportes
  FOR EACH ROW EXECUTE FUNCTION reportes_set_geom();

CREATE OR REPLACE FUNCTION features_set_geom() RETURNS trigger AS $$
BEGIN
  NEW.geom := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_features_geom ON features;
CREATE TRIGGER trg_features_geom
  BEFORE INSERT OR UPDATE OF lat, lng
  ON features
  FOR EACH ROW EXECUTE FUNCTION features_set_geom();

-- Índices espaciales GiST
CREATE INDEX IF NOT EXISTS reportes_geom_idx ON reportes USING GIST (geom);
CREATE INDEX IF NOT EXISTS features_geom_idx ON features USING GIST (geom);
