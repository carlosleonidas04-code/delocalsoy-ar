-- LIC-DLUI LIC-R9 (#456, épica #448) — DL-14: cooperación y convenios
-- (LIC-09). El convenio es acto institucional: alta SOLO admin (ADR-031);
-- contrapartes genéricas, jamás personas (Ley 25.326/ADR-027); estados
-- honestos con sin_instrumento_encontrado (R15 — el vacío se declara).
--
-- Nace VACÍA (R15, DL-14): 0 convenios hasta actos institucionales reales —
-- declarar la estructura NO es simular datos.

CREATE TABLE "convenios" (
    "id" TEXT NOT NULL,
    "nodo_key" TEXT NOT NULL,
    "contraparte" TEXT NOT NULL,
    "contraparte_tipo" TEXT NOT NULL,
    "objeto" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'propuesto',
    "fuente_key" TEXT NOT NULL,
    "fuente_url" TEXT,
    "fecha_corte" TEXT NOT NULL,
    "created_by_hash" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "convenios_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "convenios_hash_key" ON "convenios"("hash");
CREATE INDEX "convenios_nodo_key_estado_idx" ON "convenios"("nodo_key", "estado");
CREATE INDEX "convenios_estado_idx" ON "convenios"("estado");
