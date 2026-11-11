-- LIC-DLUI LIC-R3 (#452, épica #448): práctica territorial acreditada.
-- Opción B ratificada por la DH: atributo sobre la cuenta ciudadana (patrón
-- AR1, sin rol RBAC nuevo) + columna relevamiento JSONB en reportes (patrón
-- VIG-011: sin la clave "relevamiento" del body, la fila legacy CORE-005
-- queda intacta). R15: SIN seed — sin resolución de la DH no hay practicante
-- acreditado (conteo 0 honesto); la acreditación se opera por
-- POST /api/practicas/acreditar (admin) con sello practica.acreditada.

-- Atributo de práctica sobre la cuenta ciudadana (LIC-03, patrón AR1).
ALTER TABLE "usuarios" ADD COLUMN "practica_acreditada" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "usuarios" ADD COLUMN "practica_acreditada_en" TIMESTAMP(3);
ALTER TABLE "usuarios" ADD COLUMN "practica_mandato_hash" TEXT;
ALTER TABLE "usuarios" ADD COLUMN "practica_referencia_externa" TEXT;

-- Relevamiento del practicante acreditado (canal v1 del protocolo LIC-R2).
ALTER TABLE "reportes" ADD COLUMN "relevamiento" JSONB;
