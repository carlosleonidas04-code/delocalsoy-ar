-- NODO-CAU R2 (#138/#147): catálogo de fuentes espaciales + procedencia por
-- conjunto. `fuentes` = registro público de fuentes (ADR-035); `ingestas` = pipeline
-- de procedencia recibido → validado_tecnicamente → validado_territorialmente
-- → publicado (solo admin, decisión DH 2026-10-15). SIN columnas geom: la
-- ingesta acredita procedencia; los datos viven en sus tablas de dominio
-- (criterio estructural #149).

-- CreateTable
CREATE TABLE "fuentes" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "organismo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "url" TEXT,
    "tipo" TEXT NOT NULL,
    "licencia" TEXT,
    "estado" TEXT NOT NULL,
    "cautela" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fuentes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (identidad canónica de la fuente)
CREATE UNIQUE INDEX "fuentes_key_key" ON "fuentes"("key");
CREATE INDEX "fuentes_organismo_idx" ON "fuentes"("organismo");
CREATE INDEX "fuentes_tipo_idx" ON "fuentes"("tipo");

-- CreateTable
CREATE TABLE "ingestas" (
    "id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "fuente_key" TEXT NOT NULL,
    "nodo_key" TEXT NOT NULL,
    "capa_servicio" TEXT NOT NULL,
    "fecha_acceso" TEXT NOT NULL,
    "fecha_corte" TEXT NOT NULL,
    "licencia" TEXT,
    "crs_origen" TEXT NOT NULL,
    "crs_normalizado" TEXT NOT NULL,
    "escala_precision" TEXT NOT NULL,
    "external_id" TEXT,
    "transformaciones" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'recibido',
    "created_by_hash" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingestas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (idempotencia del alta + identidad por conjunto)
CREATE UNIQUE INDEX "ingestas_hash_key" ON "ingestas"("hash");
CREATE UNIQUE INDEX "ingestas_fuente_key_source_id_key" ON "ingestas"("fuente_key", "source_id");
CREATE INDEX "ingestas_nodo_key_idx" ON "ingestas"("nodo_key");
CREATE INDEX "ingestas_estado_idx" ON "ingestas"("estado");
