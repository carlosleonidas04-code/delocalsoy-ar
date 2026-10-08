-- CORE-004 R4b (ADR-032, #87): proyección idempotente del worker del stream.
-- event_projections NO es fuente de verdad: events_raw manda; la proyección
-- es derivada y reconstruible. event_id único → el re-consumo de una
-- referencia del stream es idempotente (P2002 = ya proyectado).

CREATE TABLE "event_projections" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "event_hash" TEXT NOT NULL,
    "projected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_projections_pkey" PRIMARY KEY ("id")
);

-- Una proyección por evento: idempotencia del worker (exactamente una vez).
CREATE UNIQUE INDEX "event_projections_event_id_key" ON "event_projections"("event_id");
