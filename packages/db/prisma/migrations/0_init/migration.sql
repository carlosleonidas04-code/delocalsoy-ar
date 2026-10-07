-- P12: migración base que faltaba en el historial de main.
-- La carpeta migrations/ solo contenía 20261006120000_territorios_geom_gist,
-- por lo que toda reproducción desde cero (shadow DB, DB nueva) fallaba con P3006:
-- el ALTER TABLE sobre "territorios" no encontraba la tabla (creada históricamente
-- fuera del historial de migraciones).

-- Extensión PostGIS (EV-001): requerida antes de cualquier tipo geometry.
CREATE EXTENSION IF NOT EXISTS postgis;

-- CreateTable
CREATE TABLE "events_raw" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "hash" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "ingested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_raw_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidencias" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendiente',
    "result" JSONB,
    "verified_at" TIMESTAMP(3),

    CONSTRAINT "evidencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "territorios" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "provincia" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    "territorios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "events_raw_hash_key" ON "events_raw"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "evidencias_code_key" ON "evidencias"("code");

-- Nota: el campo "geom" de territorios NO está aquí: Prisma no tipa geometry.
-- Lo agrega la migración 20261006120000_territorios_geom_gist, que ahora sí
-- encuentra la tabla y la extensión presentes en ambas: DB dev y shadow DB.