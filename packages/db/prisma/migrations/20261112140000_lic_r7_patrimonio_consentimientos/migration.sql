-- LIC-DLUI LIC-R7 (#450, épica #448) — DL-12: consentimiento granular para
-- patrimonio cultural vivo y memoria oral. Extensión OPERATIVA del instrumento
-- de consentimiento VIG-009 (custodio_hash): el contrato existía en
-- packages/contracts (CustodiaConsentimientoSchema, VIG-009 R3) pero no tenía
-- aterrizaje — esta tabla lo aterriza extendido al dominio vivo.
--
-- El PORTADOR jamás se identifica (Ley 25.326/ADR-027): la fila acredita QUE
-- existe el consentimiento y para qué alcances, nunca QUIÉN lo otorgó. El
-- registrante institucional queda como custodio_hash sha32 (pseudónimo).
--
-- Nace VACÍA (R15, DL-12): 0 registros hasta consentimientos reales — la
-- plataforma prepara el instrumento, NO simula otorgamientos. Append-only en
-- los hechos: el retiro es una transición de estado sellada (vigente →
-- revocado), jamás un DELETE (patrón mediadores, ADR-038).

CREATE TABLE "patrimonio_consentimientos" (
    "id" TEXT NOT NULL,
    "activo_id" TEXT NOT NULL,
    "firmante_rol" TEXT NOT NULL,
    "alcances" JSONB NOT NULL,
    "vigencia_desde" TEXT NOT NULL,
    "vigencia_hasta" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'vigente',
    "revocado_en" TIMESTAMP(3),
    "motivo" TEXT,
    "created_by_hash" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patrimonio_consentimientos_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "patrimonio_consentimientos_hash_key" ON "patrimonio_consentimientos"("hash");
CREATE INDEX "patrimonio_consentimientos_activo_id_idx" ON "patrimonio_consentimientos"("activo_id");

ALTER TABLE "patrimonio_consentimientos" ADD CONSTRAINT "patrimonio_consentimientos_activo_id_fkey" FOREIGN KEY ("activo_id") REFERENCES "activos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
