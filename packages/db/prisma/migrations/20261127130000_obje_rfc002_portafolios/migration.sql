-- OBJE-CAMPUS RFC-002 (#573, épica #531) — dominio de portafolios:
-- slice de MODELO (sin rutas) que cubre el único subdominio del RFC-002 que
-- MVP-1 (EV-113) no aterrizó. Anti-PII (Ley 25.326/ADR-027): el portafolio
-- pertenece a una cuenta; sin nombre civil ni contacto en columnas.
--
-- Nace VACÍA (R15): 0 filas, sin seed — declarar la estructura NO es
-- simular datos.

CREATE TABLE "portafolios" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'declarado',
    "visibilidad" TEXT NOT NULL DEFAULT 'privado',
    "hash" TEXT NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portafolios_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "portafolio_evidencias" (
    "id" TEXT NOT NULL,
    "portafolio_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "ref_tipo" TEXT NOT NULL,
    "ref_key" TEXT,
    "titulo" TEXT NOT NULL,
    "nota" TEXT,
    "procedencia" JSONB,
    "created_by_hash" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portafolio_evidencias_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "portafolios_usuario_id_slug_key" ON "portafolios"("usuario_id", "slug");
CREATE UNIQUE INDEX "portafolios_hash_key" ON "portafolios"("hash");
CREATE INDEX "portafolios_estado_idx" ON "portafolios"("estado");

CREATE UNIQUE INDEX "portafolio_evidencias_hash_key" ON "portafolio_evidencias"("hash");
CREATE INDEX "portafolio_evidencias_portafolio_id_idx" ON "portafolio_evidencias"("portafolio_id");

ALTER TABLE "portafolios" ADD CONSTRAINT "portafolios_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "portafolio_evidencias" ADD CONSTRAINT "portafolio_evidencias_portafolio_id_fkey" FOREIGN KEY ("portafolio_id") REFERENCES "portafolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
