-- VIG-012 (#379, épica #377): pedidos formales del nodo Iglesia —
-- libro de reclamos del plan vecinal ante Vialidad Provincial (DPV).
-- ÚNICA tabla nueva del módulo (decisión DH 2026-11-06). R15: SIN seed —
-- la tabla NACE VACÍA (conteo 0 honesto): preparar la nota ≠ presentarla;
-- los 15 pedidos de la nota formal a DPV son contenido documental
-- (fuente: documento vecinal interno, sin firmantes expuestos — ADR-027),
-- NO filas precargadas. Cada pedido se registra a medida que se presenta,
-- con fecha real y sello 'pedido.presentado' (POST /api/pedidos, admin).

CREATE TABLE "pedidos" (
    "id" TEXT NOT NULL,
    "nodo_key" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "bloque" TEXT NOT NULL,
    "tema" TEXT NOT NULL,
    "destinatario" TEXT NOT NULL,
    "fecha_presentacion" TIMESTAMP(3) NOT NULL,
    "plazo_dias" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'presentado',
    "respondido_en" TIMESTAMP(3),
    "nota_respuesta" TEXT,
    "evidencia_cluster_keys" TEXT[] NOT NULL,
    "created_by_hash" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "pedidos_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pedidos_key_key" ON "pedidos"("key");
CREATE UNIQUE INDEX "pedidos_hash_key" ON "pedidos"("hash");
CREATE INDEX "pedidos_nodo_key_estado_idx" ON "pedidos"("nodo_key", "estado");
