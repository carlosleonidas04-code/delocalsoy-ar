-- NODO-VIG Sprint VIG-001 (NVIG-R4 #171, épica #167): subnodos territoriales
-- del Valle de Iglesia (Opción B ratificada R9 2026-10-13 en #167). Jerarquía
-- distrito → paraje → subparaje (+ localidad INDEC) por parent_key →
-- subnodos.key; parajes de alta cordillera como hijos directos del nodo
-- (parent_key null). lat/lng nullable: solo punto público BAHRA/Georef —
-- null es honesto, no se inventa (R15, ADR-036). SIN columna geom (criterio
-- estructural #149/#167, patrón oportunidades de NCAP-R6).

-- CreateTable
CREATE TABLE "subnodos" (
    "id" TEXT NOT NULL,
    "nodo_key" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "parent_key" TEXT,
    "boundary_status" TEXT NOT NULL DEFAULT 'provisional',
    "assignment_status" TEXT NOT NULL,
    "zone" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "external_id" TEXT,
    "external_source" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subnodos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (identidad canónica de la entidad)
CREATE UNIQUE INDEX "subnodos_key_key" ON "subnodos"("key");

-- CreateIndex
CREATE INDEX "subnodos_nodo_key_idx" ON "subnodos"("nodo_key");
CREATE INDEX "subnodos_type_idx" ON "subnodos"("type");
CREATE INDEX "subnodos_parent_key_idx" ON "subnodos"("parent_key");

-- AddForeignKey (jerarquía: paraje → distrito / subparaje → paraje)
ALTER TABLE "subnodos" ADD CONSTRAINT "subnodos_parent_key_fkey" FOREIGN KEY ("parent_key") REFERENCES "subnodos"("key") ON DELETE SET NULL ON UPDATE CASCADE;
