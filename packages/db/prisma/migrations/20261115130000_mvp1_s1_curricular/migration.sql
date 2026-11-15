-- MVP-1 «Atlas Territorial» (RFC-020/021, #532, épica OBJE-CAMPUS #531) —
-- S1: dominio curricular como catálogo con procedencia (ADR-082 propuesta,
-- especificación docs/MVP1_ATLAS_TERRITORIAL_ESPECIFICACION_v0.1.md). Sin
-- inscripción, sin notas, sin persona (Ley 25.326/ADR-027); única fuente
-- autorizada v1: corpus DLUI-IT (ECO-5); procedencia por ingesta (NC-EV-09
-- — el dato no viaja suelto).
--
-- Nace VACÍA (R15): 0 filas hasta que la DH autorice la carga del corpus
-- DLUI-IT como ingesta declarada — declarar la estructura NO es simular
-- datos.

CREATE TABLE "tracks" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "tipo" TEXT NOT NULL,
    "orden" INTEGER,
    "fuente_key" TEXT NOT NULL,
    "fuente_url" TEXT,
    "fecha_corte" TEXT NOT NULL,
    "ingesta_id" TEXT NOT NULL,
    "created_by_hash" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tracks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "competencies" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "tipo" TEXT NOT NULL,
    "fuente_key" TEXT NOT NULL,
    "fuente_url" TEXT,
    "fecha_corte" TEXT NOT NULL,
    "ingesta_id" TEXT NOT NULL,
    "created_by_hash" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "competencies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "courses" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "track_key" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'declarado',
    "fuente_key" TEXT NOT NULL,
    "fuente_url" TEXT,
    "fecha_corte" TEXT NOT NULL,
    "ingesta_id" TEXT NOT NULL,
    "created_by_hash" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "perfiles" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "fuente_key" TEXT NOT NULL,
    "fuente_url" TEXT,
    "fecha_corte" TEXT NOT NULL,
    "ingesta_id" TEXT NOT NULL,
    "created_by_hash" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "perfiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "learning_paths" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "perfil_key" TEXT,
    "criterio_de_avance" TEXT NOT NULL,
    "fuente_key" TEXT NOT NULL,
    "fuente_url" TEXT,
    "fecha_corte" TEXT NOT NULL,
    "ingesta_id" TEXT NOT NULL,
    "created_by_hash" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_paths_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "course_competencies" (
    "id" TEXT NOT NULL,
    "course_key" TEXT NOT NULL,
    "competency_key" TEXT NOT NULL,
    "peso_declarado" TEXT NOT NULL,
    "created_by_hash" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_competencies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "learning_path_steps" (
    "id" TEXT NOT NULL,
    "path_key" TEXT NOT NULL,
    "course_key" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "obligatoriedad" TEXT NOT NULL,
    "created_by_hash" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_path_steps_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tracks_key_key" ON "tracks"("key");
CREATE UNIQUE INDEX "tracks_hash_key" ON "tracks"("hash");
CREATE INDEX "tracks_tipo_idx" ON "tracks"("tipo");
CREATE INDEX "tracks_ingesta_id_idx" ON "tracks"("ingesta_id");

CREATE UNIQUE INDEX "competencies_key_key" ON "competencies"("key");
CREATE UNIQUE INDEX "competencies_hash_key" ON "competencies"("hash");
CREATE INDEX "competencies_tipo_idx" ON "competencies"("tipo");
CREATE INDEX "competencies_ingesta_id_idx" ON "competencies"("ingesta_id");

CREATE UNIQUE INDEX "courses_key_key" ON "courses"("key");
CREATE UNIQUE INDEX "courses_hash_key" ON "courses"("hash");
CREATE INDEX "courses_track_key_idx" ON "courses"("track_key");
CREATE INDEX "courses_estado_idx" ON "courses"("estado");
CREATE INDEX "courses_ingesta_id_idx" ON "courses"("ingesta_id");

CREATE UNIQUE INDEX "perfiles_key_key" ON "perfiles"("key");
CREATE UNIQUE INDEX "perfiles_hash_key" ON "perfiles"("hash");
CREATE INDEX "perfiles_ingesta_id_idx" ON "perfiles"("ingesta_id");

CREATE UNIQUE INDEX "learning_paths_key_key" ON "learning_paths"("key");
CREATE UNIQUE INDEX "learning_paths_hash_key" ON "learning_paths"("hash");
CREATE INDEX "learning_paths_perfil_key_idx" ON "learning_paths"("perfil_key");
CREATE INDEX "learning_paths_ingesta_id_idx" ON "learning_paths"("ingesta_id");

CREATE UNIQUE INDEX "course_competencies_hash_key" ON "course_competencies"("hash");
CREATE INDEX "course_competencies_course_key_idx" ON "course_competencies"("course_key");
CREATE INDEX "course_competencies_competency_key_idx" ON "course_competencies"("competency_key");

CREATE UNIQUE INDEX "learning_path_steps_hash_key" ON "learning_path_steps"("hash");
CREATE INDEX "learning_path_steps_path_key_idx" ON "learning_path_steps"("path_key");
CREATE INDEX "learning_path_steps_course_key_idx" ON "learning_path_steps"("course_key");

-- Procedencia: las 5 tablas de contenido cuelgan de ingestas (el dato no
-- viaja suelto — NC-EV-09). Las tablas de vínculo heredan procedencia de
-- sus filas padre y cuelgan de ellas por key.

ALTER TABLE "tracks" ADD CONSTRAINT "tracks_ingesta_id_fkey" FOREIGN KEY ("ingesta_id") REFERENCES "ingestas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "competencies" ADD CONSTRAINT "competencies_ingesta_id_fkey" FOREIGN KEY ("ingesta_id") REFERENCES "ingestas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "courses" ADD CONSTRAINT "courses_ingesta_id_fkey" FOREIGN KEY ("ingesta_id") REFERENCES "ingestas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "perfiles" ADD CONSTRAINT "perfiles_ingesta_id_fkey" FOREIGN KEY ("ingesta_id") REFERENCES "ingestas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "learning_paths" ADD CONSTRAINT "learning_paths_ingesta_id_fkey" FOREIGN KEY ("ingesta_id") REFERENCES "ingestas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "learning_paths" ADD CONSTRAINT "learning_paths_perfil_key_fkey" FOREIGN KEY ("perfil_key") REFERENCES "perfiles"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "course_competencies" ADD CONSTRAINT "course_competencies_course_key_fkey" FOREIGN KEY ("course_key") REFERENCES "courses"("key") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "course_competencies" ADD CONSTRAINT "course_competencies_competency_key_fkey" FOREIGN KEY ("competency_key") REFERENCES "competencies"("key") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "learning_path_steps" ADD CONSTRAINT "learning_path_steps_path_key_fkey" FOREIGN KEY ("path_key") REFERENCES "learning_paths"("key") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "learning_path_steps" ADD CONSTRAINT "learning_path_steps_course_key_fkey" FOREIGN KEY ("course_key") REFERENCES "courses"("key") ON DELETE CASCADE ON UPDATE CASCADE;
