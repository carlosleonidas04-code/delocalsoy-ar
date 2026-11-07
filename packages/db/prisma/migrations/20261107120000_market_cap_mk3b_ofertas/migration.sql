-- MARKET-CAP MK-3b (#426, sub-épica #152): ofertas del Mercado de Proximidad.
-- Columnas OPCIONALES en productos — cero backfill (R15: lo ya publicado
-- queda sin precio y sin vigencia declarados, jamás se inventan). Sin índices
-- nuevos: el catálogo lee take 100 sobre el dominio vivo (patrón MK-1 §2.5).
-- precio_centavos INTEGER: centavos AR ENTEROS, jamás float (MK-3 D2
-- ratificada por la DH 2026-10-30). Vigencia TIMESTAMP(3): caducidad
-- DECLARADA, no silenciosa (RFC-027) — el estado vencido se DERIVA en
-- lectura, no se persiste.
ALTER TABLE "productos" ADD COLUMN "precio_centavos" INTEGER;
ALTER TABLE "productos" ADD COLUMN "vigencia_desde" TIMESTAMP(3);
ALTER TABLE "productos" ADD COLUMN "vigencia_hasta" TIMESTAMP(3);
