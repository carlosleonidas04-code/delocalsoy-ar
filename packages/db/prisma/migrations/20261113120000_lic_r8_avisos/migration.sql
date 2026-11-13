-- LIC-DLUI LIC-R8 (#451, épica #448) — DL-13: comunicación pública honesta
-- (LIC-08, canon DLUI-569 como ley interna). Sin fuente no hay aviso
-- (DL-13.1); la plataforma traduce, jamás alerta; caducidad honesta (el
-- vencido se expone `caducado` COMPUTADO en lectura — jamás borrado,
-- ADR-038); anti-infodemia (certeza verificado|reportado|rumor_descartado);
-- sin PII (Ley 25.326/ADR-027).
--
-- Nace VACÍA (R15, DL-13): 0 avisos hasta comunicación real con fuente —
-- declarar la estructura NO es simular datos.

CREATE TABLE "avisos" (
    "id" TEXT NOT NULL,
    "nodo_key" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "cuerpo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'publicado',
    "fuente_key" TEXT NOT NULL,
    "fuente_url" TEXT,
    "fecha_corte" TEXT NOT NULL,
    "certeza" TEXT NOT NULL,
    "caduca_en" TEXT,
    "created_by_hash" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "avisos_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "avisos_hash_key" ON "avisos"("hash");
CREATE INDEX "avisos_nodo_key_estado_idx" ON "avisos"("nodo_key", "estado");
CREATE INDEX "avisos_tipo_idx" ON "avisos"("tipo");
