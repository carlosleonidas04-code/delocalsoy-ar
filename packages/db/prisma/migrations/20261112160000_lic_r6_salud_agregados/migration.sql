-- LIC-DLUI LIC-R6 (#449, épica #448) — DL-11: salud urbana federada. Tabla de
-- AGREGADOS oficiales por nodo: la salud individual es dato sensible PROHIBIDO
-- (Ley 25.326) — aquí NO se registra ninguna persona, caso ni evento
-- individual, solo conteos departamentales publicados por organismos oficiales
-- (REFES/DEIS) federados VÍA el pipeline de ingestas (patrón EV-049).
--
-- Cada agregado cita su ingesta del pipeline de procedencia (#147): fuente
-- del catálogo, fecha de corte y CRS quedan acreditados en la ingesta — el
-- agregado no viaja suelto (NC-EV-09). La lectura pública SOLO expone
-- agregados cuya ingesta esté 'publicado'; el pipeline en curso queda en
-- custodia (R15/ADR-036).
--
-- Nace VACÍA (R15, DL-11): 0 registros hasta ingestas reales — declarar la
-- estructura NO es simular datos. Mientras no exista fuente ingestado el
-- indicador queda visible como `sin_fuente_ingestada` con valor null
-- (R15: null ≠ 0 — la brecha es visible, jamás estimada).

CREATE TABLE "salud_agregados" (
    "id" TEXT NOT NULL,
    "nodo_key" TEXT NOT NULL,
    "indicador" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "fuente_key" TEXT NOT NULL,
    "ingesta_id" TEXT NOT NULL,
    "created_by_hash" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salud_agregados_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "salud_agregados_hash_key" ON "salud_agregados"("hash");
CREATE INDEX "salud_agregados_nodo_key_idx" ON "salud_agregados"("nodo_key");
CREATE INDEX "salud_agregados_indicador_idx" ON "salud_agregados"("indicador");
CREATE INDEX "salud_agregados_ingesta_id_idx" ON "salud_agregados"("ingesta_id");

ALTER TABLE "salud_agregados" ADD CONSTRAINT "salud_agregados_ingesta_id_fkey" FOREIGN KEY ("ingesta_id") REFERENCES "ingestas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
