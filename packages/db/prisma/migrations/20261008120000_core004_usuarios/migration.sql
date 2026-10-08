-- CORE-004 R3 (ADR-031, #87): usuarios con rol ciudadano | moderador | admin.
-- Contraseña: scrypt (node:crypto) — password_hash guarda 'scrypt$<salt>$<hash>',
-- nunca la clave. Sin PII más allá del email de login (Ley 25.326): los sellos
-- system.user_registered / system.user_session en events_raw llevan solo
-- {usuario_id, rol}.

CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'ciudadano',
    "display_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- Un email por usuario (login identifier único).
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");
