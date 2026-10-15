-- CORE-005 R2 (#206): autoría pseudonimizada del reporte ciudadano.
-- created_by_hash = sha256(usuario_id) truncado (Ley 25.326, ADR-027):
-- acredita la autoría del reporte sin identificar al autor. Nullable:
-- los reportes sintéticos del seed del demo no tienen autor ciudadano.
ALTER TABLE "reportes" ADD COLUMN "created_by_hash" TEXT;
