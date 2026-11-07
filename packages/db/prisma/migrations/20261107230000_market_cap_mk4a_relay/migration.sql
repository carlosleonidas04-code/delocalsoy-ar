-- MK-4a (#427, épica #422): relay del Mercado de Proximidad — canal único
-- de contacto sin PII (Ley 25.326): mensaje anti-PII por compuerta en la
-- ruta (ADR-020 cond. 1), remitente solo como pseudónimo (ADR-027),
-- idempotencia por hash (usuario + comercio + mensaje).
CREATE TABLE "comercio_relay" (
    "id" TEXT NOT NULL,
    "comercio_id" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "creado_por_hash" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "comercio_relay_pkey" PRIMARY KEY ("id")
);

-- Unique index on `hash` (Prisma @unique).
CREATE UNIQUE INDEX "comercio_relay_hash_key" ON "comercio_relay"("hash");

-- Index on `comercio_id, created_at` (@@index).
CREATE INDEX "comercio_relay_comercio_id_created_at_idx" ON "comercio_relay"("comercio_id", "created_at");

-- FK `comercio_id` -> activos.id (Cascade: borrar el activo arrastra el relay).
ALTER TABLE "comercio_relay" ADD CONSTRAINT "comercio_relay_comercio_id_fkey" FOREIGN KEY ("comercio_id") REFERENCES "activos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
