-- Aterrizaje PR 2 (issue #21): geometría puntal WGS84 + índice GiST
-- Requiere PostGIS habilitado (EV-001: imagen postgis/postgis).
ALTER TABLE "territorios" ADD COLUMN "geom" geometry(Point,4326);
CREATE INDEX "idx_territorios_geom_gist" ON "territorios" USING GIST ("geom");