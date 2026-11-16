// ─── MVP-1 «Atlas Territorial» (RFC-020/021, #532, épica OBJE-CAMPUS #531) ───
//
// S1 — dominio curricular como CATÁLOGO con procedencia (ADR-082 propuesta,
// especificación docs/MVP1_ATLAS_TERRITORIAL_ESPECIFICACION_v0.1.md): sin
// inscripción, sin notas, sin evaluación personal — jamás un expediente de
// persona (Ley 25.326/ADR-027). La única fuente autorizada v1 es el corpus
// DLUI-IT (ECO-5): toda fila lleva fuente declarada + ingesta del pipeline
// de procedencia (NC-EV-09 — el dato no viaja suelto). Cobertura «X de N»
// honesta (DL-5); JAMÁS ranking entre nodos, cursos ni personas (ADR-036/R5).

import { z } from "zod";

// Ciclo de vida del curso en el catálogo (estados en inglés sobre columnas
// reales — corrección transversal #2 del contraste OBJE-000): declarado al
// alta, vigente cuando la DH lo ratifica, retirado sin borrado (append-only
// del catálogo, patrón ADR-038).
export const EstadoCursoSchema = z.enum(["declarado", "vigente", "retirado"]);
export type EstadoCurso = z.infer<typeof EstadoCursoSchema>;

// Clases de competencia del corpus (EFM — marco del corpus DLUI-IT, ECO-5).
export const TipoCompetenciaSchema = z.enum(["territorial", "tecnica", "comunitaria", "transversal"]);
export type TipoCompetencia = z.infer<typeof TipoCompetenciaSchema>;

// Trayectos formativos del corpus: núcleo (47 materias), optativa (103),
// taller territorial (práctica en el nodo — ancla practica.acreditada LIC-R3).
export const TipoTrackSchema = z.enum(["nucleo", "optativa", "taller_territorial"]);
export type TipoTrack = z.infer<typeof TipoTrackSchema>;

// Obligatoriedad declarada del paso de una ruta (del corpus, jamás inferida).
export const ObligatoriedadSchema = z.enum(["obligatorio", "recomendado", "electivo"]);
export type Obligatoriedad = z.infer<typeof ObligatoriedadSchema>;

// Peso del vínculo curso↔competencia: TEXTO cualitativo con método (ADR-035),
// jamás un puntaje numérico — anti-ranking por construcción (ADR-036/R5).
export const PesoDeclaradoSchema = z
  .string()
  .trim()
  .min(3, "peso_declarado: al menos 3 caracteres")
  .max(96, "peso_declarado: a lo sumo 96 caracteres")
  .refine((v) => /[a-záéíóúñü]/i.test(v), "peso_declarado: texto cualitativo con método, jamás un puntaje numérico (ADR-036)");
export type PesoDeclarado = z.infer<typeof PesoDeclaradoSchema>;

// Slug del vocabulario curricular (key de curso/competencia/track/perfil/ruta).
export const KeyCurricularSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9_]+$/, "key: slug del vocabulario curricular (^[a-z0-9_]+$)")
  .min(3)
  .max(96);
export type KeyCurricular = z.infer<typeof KeyCurricularSchema>;

// FUENTE OBLIGATORIA (patrón DL-13.1): sin fuente no hay fila curricular —
// el alta sin procedencia es inválida por construcción (R9/R15).
export const FuenteCurricularSchema = z.object({
  fuente_key: z
    .string()
    .trim()
    .regex(/^[a-z0-9_-]+$/, "fuente_key: slug de la fuente autorizada (p.ej. corpus_dului_it)")
    .min(3)
    .max(96),
  fuente_url: z.string().url().optional(),
  fecha_corte: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "fecha_corte: YYYY-MM-DD (fuente + fecha + certeza, regla 13)"),
});
export type FuenteCurricular = z.infer<typeof FuenteCurricularSchema>;

// Ingesta OBLIGATORIA del pipeline de procedencia (NC-EV-09): el id debe
// existir y su fuente_key coincidir con la declarada — se valida en la ruta
// (patrón salud R15 estricta, decisión DH 2026-10-15).
export const IngestaIdCurricularSchema = z
  .string()
  .trim()
  .min(10, "ingesta_id: id de la ingesta del pipeline de procedencia")
  .max(64);
export type IngestaIdCurricular = z.infer<typeof IngestaIdCurricularSchema>;

// ─── Altas del catálogo (escritura SOLO admin en la ruta — ADR-031) ───

// Alta de curso. titulo/descripcion pasan por la compuerta anti-PII de texto
// libre server-side (ADR-020 cond. 1) antes de persistir — Ley 25.326.
export const CursoAltaSchema = z.object({
  key: KeyCurricularSchema,
  titulo: z.string().trim().min(3, "titulo: al menos 3 caracteres").max(200, "titulo: a lo sumo 200 caracteres"),
  descripcion: z.string().trim().min(3).max(1000).optional(),
  track_key: KeyCurricularSchema,
  estado: EstadoCursoSchema.default("declarado"),
  fuente: FuenteCurricularSchema,
  ingesta_id: IngestaIdCurricularSchema,
});
export type CursoAlta = z.infer<typeof CursoAltaSchema>;

export const CompetenciaAltaSchema = z.object({
  key: KeyCurricularSchema,
  titulo: z.string().trim().min(3, "titulo: al menos 3 caracteres").max(200, "titulo: a lo sumo 200 caracteres"),
  descripcion: z.string().trim().min(3).max(1000).optional(),
  tipo: TipoCompetenciaSchema,
  fuente: FuenteCurricularSchema,
  ingesta_id: IngestaIdCurricularSchema,
});
export type CompetenciaAlta = z.infer<typeof CompetenciaAltaSchema>;

// orden: posición DECLARADA en el corpus (lectura del documento fuente),
// jamás una métrica de desempeño — anti-ranking (ADR-036).
export const TrackAltaSchema = z.object({
  key: KeyCurricularSchema,
  titulo: z.string().trim().min(3, "titulo: al menos 3 caracteres").max(200, "titulo: a lo sumo 200 caracteres"),
  descripcion: z.string().trim().min(3).max(1000).optional(),
  tipo: TipoTrackSchema,
  orden: z.number().int().min(0).max(999).optional(),
  fuente: FuenteCurricularSchema,
  ingesta_id: IngestaIdCurricularSchema,
});
export type TrackAlta = z.infer<typeof TrackAltaSchema>;

export const PerfilAltaSchema = z.object({
  key: KeyCurricularSchema,
  titulo: z.string().trim().min(3, "titulo: al menos 3 caracteres").max(200, "titulo: a lo sumo 200 caracteres"),
  descripcion: z.string().trim().min(3).max(1000).optional(),
  fuente: FuenteCurricularSchema,
  ingesta_id: IngestaIdCurricularSchema,
});
export type PerfilAlta = z.infer<typeof PerfilAltaSchema>;

// Ruta de aprendizaje: secuencia declarada con criterio de avance textual
// (método, ADR-035) — jamás un cálculo ni un puntaje de corte (ADR-036).
export const RutaAltaSchema = z.object({
  key: KeyCurricularSchema,
  titulo: z.string().trim().min(3, "titulo: al menos 3 caracteres").max(200, "titulo: a lo sumo 200 caracteres"),
  descripcion: z.string().trim().min(3).max(1000).optional(),
  perfil_key: KeyCurricularSchema.optional(),
  criterio_de_avance: z
    .string()
    .trim()
    .min(10, "criterio_de_avance: texto con método, al menos 10 caracteres")
    .max(500, "criterio_de_avance: a lo sumo 500 caracteres"),
  fuente: FuenteCurricularSchema,
  ingesta_id: IngestaIdCurricularSchema,
});
export type RutaAlta = z.infer<typeof RutaAltaSchema>;

// Vínculo de la matriz (trazabilidad bidireccional, ADR-083 propuesta):
// curso → competencias que aporta; competencia → cursos que la desarrollan.
// La procedencia la hereda de sus filas padre (no se duplica).
export const VinculoCursoCompetenciaSchema = z.object({
  course_key: KeyCurricularSchema,
  competency_key: KeyCurricularSchema,
  peso_declarado: PesoDeclaradoSchema,
});
export type VinculoCursoCompetencia = z.infer<typeof VinculoCursoCompetenciaSchema>;

export const PasoRutaAltaSchema = z.object({
  path_key: KeyCurricularSchema,
  course_key: KeyCurricularSchema,
  orden: z.number().int().min(1, "orden: posición 1-based dentro de la ruta").max(999),
  obligatoriedad: ObligatoriedadSchema,
});
export type PasoRutaAlta = z.infer<typeof PasoRutaAltaSchema>;

// ─── Respuestas públicas (lectura anónima — patrón nodos/salud/convenios) ───

// Estado honesto de cada bloque del Atlas (null ≠ 0, R15): publicado (con
// procedencia), sin_fuente_ingestada (el vacío se declara, no se estima) o
// en_custodia (cargado cuya ingesta aún no está publicada — NC-EV-09).
export const EstadoBloqueAtlasSchema = z.enum(["publicado", "sin_fuente_ingestada", "en_custodia"]);
export type EstadoBloqueAtlas = z.infer<typeof EstadoBloqueAtlasSchema>;

export const CursoVocabularioSchema = z.object({
  key: KeyCurricularSchema,
  titulo: z.string(),
  descripcion: z.string().nullable(),
  track_key: KeyCurricularSchema,
  estado: EstadoCursoSchema,
  fuente_key: z.string(),
  fecha_corte: z.string(),
});
export type CursoVocabulario = z.infer<typeof CursoVocabularioSchema>;

export const CompetenciaVocabularioSchema = z.object({
  key: KeyCurricularSchema,
  titulo: z.string(),
  descripcion: z.string().nullable(),
  tipo: TipoCompetenciaSchema,
  fuente_key: z.string(),
  fecha_corte: z.string(),
});
export type CompetenciaVocabulario = z.infer<typeof CompetenciaVocabularioSchema>;

export const VinculoMatrizSchema = z.object({
  course_key: KeyCurricularSchema,
  competency_key: KeyCurricularSchema,
  peso_declarado: z.string(),
});
export type VinculoMatriz = z.infer<typeof VinculoMatrizSchema>;

// Matriz de trazabilidad curricular (ADR-083 propuesta): los tres lados de
// la relación + cobertura «X de N» honesta (DL-5) — conteo CON trazabilidad,
// jamás un ranking de cursos (ADR-036).
export const MatrizCurricularResponseSchema = z.object({
  cursos: z.array(CursoVocabularioSchema),
  competencias: z.array(CompetenciaVocabularioSchema),
  vinculos: z.array(VinculoMatrizSchema),
  cobertura: z.object({
    cursos_con_competencias: z.number().int().min(0),
    total_cursos: z.number().int().min(0),
  }),
});
export type MatrizCurricularResponse = z.infer<typeof MatrizCurricularResponseSchema>;

// Bloque del Atlas por nodo (ADR-084 propuesta): composición solo-lectura de
// superficies públicas ya acreditadas — ningún bloque se fabrica: si la
// superficie fuente no tiene datos, se declara vacío honesto (R15).
export const BloqueAtlasSchema = z.object({
  bloque: z.string().trim().min(3).max(64),
  estado: EstadoBloqueAtlasSchema,
  detalle: z.string().trim().min(3).max(500).optional(),
});
export type BloqueAtlas = z.infer<typeof BloqueAtlasSchema>;

// nodo_key: vocabulario canónico de los 3 nodos (SanJuanNodeSlugSchema en
// index.ts — declarado local para evitar el ciclo de import del barrel).
export const NodoKeyAtlasSchema = z.enum(["capital", "caucete", "iglesia"]);
export type NodoKeyAtlas = z.infer<typeof NodoKeyAtlasSchema>;

export const AtlasNodoResponseSchema = z.object({
  nodo_key: NodoKeyAtlasSchema,
  bloques: z.array(BloqueAtlasSchema),
});
export type AtlasNodoResponse = z.infer<typeof AtlasNodoResponseSchema>;

// ─── GET /api/curricular/rutas — vistas declaradas (ADR-083) ───

export const TrackVocabularioSchema = z.object({
  key: KeyCurricularSchema,
  titulo: z.string(),
  descripcion: z.string().nullable(),
  tipo: TipoTrackSchema,
  orden: z.number().int().min(0).max(999).nullable(),
  fuente_key: z.string(),
  fecha_corte: z.string(),
});
export type TrackVocabulario = z.infer<typeof TrackVocabularioSchema>;

export const PerfilVocabularioSchema = z.object({
  key: KeyCurricularSchema,
  titulo: z.string(),
  descripcion: z.string().nullable(),
  fuente_key: z.string(),
  fecha_corte: z.string(),
});
export type PerfilVocabulario = z.infer<typeof PerfilVocabularioSchema>;

export const RutaVocabularioSchema = z.object({
  key: KeyCurricularSchema,
  titulo: z.string(),
  descripcion: z.string().nullable(),
  perfil_key: KeyCurricularSchema.nullable(),
  criterio_de_avance: z.string(),
  fuente_key: z.string(),
  fecha_corte: z.string(),
  pasos: z.array(
    z.object({
      course_key: KeyCurricularSchema,
      orden: z.number().int().min(1).max(999),
      obligatoriedad: ObligatoriedadSchema,
    }),
  ),
});
export type RutaVocabulario = z.infer<typeof RutaVocabularioSchema>;

export const RutasCurricularesResponseSchema = z.object({
  tracks: z.array(TrackVocabularioSchema),
  perfiles: z.array(PerfilVocabularioSchema),
  rutas: z.array(RutaVocabularioSchema),
});
export type RutasCurricularesResponse = z.infer<typeof RutasCurricularesResponseSchema>;
