-- NODO-CAPITAL NCAP-R4 (#156): red de corredores v0.1 — grafo relacional:
-- corredor → segmentos (from/to tipados + modos) → hitos/subnodos vinculados.
-- SIN geometría en v0.1 (R15: la traza dibujada exige fuente verificada que
-- aún no existe — nada se presenta como traza oficial). Hitos SIN asignación
-- distrital (regla de modelado #154: participan por relaciones connects/near).
-- Fuentes por tramo (ADR-035): una relación sin fuente es una invención.
-- @@unique([corredor_id, secuencia]) → idempotencia del seed y continuidad
-- revisable (la API deriva ok|ruptura de la cadena por secuencia).

-- CreateTable
CREATE TABLE "corredores" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "nodo_key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "proposito" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'candidate',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "corredores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corredor_hitos" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "nodo_key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "notas" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "corredor_hitos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corredor_segmentos" (
    "id" TEXT NOT NULL,
    "corredor_id" TEXT NOT NULL,
    "secuencia" INTEGER NOT NULL,
    "from_tipo" TEXT NOT NULL,
    "from_key" TEXT NOT NULL,
    "to_tipo" TEXT NOT NULL,
    "to_key" TEXT NOT NULL,
    "modos" JSONB NOT NULL,
    "observaciones" JSONB,
    "observed_at" TIMESTAMP(3) NOT NULL,
    "fuentes" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "corredor_segmentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "corredores_key_key" ON "corredores"("key");
CREATE INDEX "corredores_nodo_key_idx" ON "corredores"("nodo_key");
CREATE UNIQUE INDEX "corredor_hitos_key_key" ON "corredor_hitos"("key");
CREATE INDEX "corredor_hitos_nodo_key_idx" ON "corredor_hitos"("nodo_key");
CREATE UNIQUE INDEX "corredor_segmentos_corredor_id_secuencia_key" ON "corredor_segmentos"("corredor_id", "secuencia");
CREATE INDEX "corredor_segmentos_corredor_id_idx" ON "corredor_segmentos"("corredor_id");

-- AddForeignKey
ALTER TABLE "corredor_segmentos" ADD CONSTRAINT "corredor_segmentos_corredor_id_fkey" FOREIGN KEY ("corredor_id") REFERENCES "corredores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
