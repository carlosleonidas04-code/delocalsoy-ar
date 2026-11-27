// ─── OBJE-CAMPUS RFC-002 (#573, épica #531): dominio de portafolios ───
//
// Slice de MODELO (sin rutas): declara la estructura del subdominio de
// portafolios que faltaba en el contraste RFC-002 (parcial — re-contrastado
// contra main @ a9eadc39, 2026-11-27). El módulo de portafolio, evaluación y
// certificación es RFC-007 (#577) y RFC-022: sus rutas, sellos y compuertas
// de lectura NO viven aquí.
//
// Anti-PII (Ley 25.326/ADR-027): el portafolio pertenece a una CUENTA (FK
// usuario_id en el schema); jamás nombre civil, contacto ni documento en
// columnas. La exposición pública futura será pseudónima y con k-anonimato
// ≥5 compuertado en la lectura (ADR-069) — la visibilidad nace 'privado'
// (cerrado por defecto).
//
// Nace VACÍA (R15): declarar la estructura NO es simular datos.

import { z } from "zod";

// Ciclo de vida del portafolio (estados en inglés sobre columnas reales —
// corrección transversal #2 del contraste OBJE-000): declarado al alta,
// en_construccion mientras la cuenta agrega evidencias, publicado SOLO por
// decisión explícita de la cuenta, archivado sin borrado (patrón ADR-038).
export const EstadoPortafolioSchema = z.enum(["declarado", "en_construccion", "publicado", "archivado"]);
export type EstadoPortafolio = z.infer<typeof EstadoPortafolioSchema>;

// Visibilidad cerrada por defecto: privado al alta; nodo/publico son
// transiciones EXPLÍCITAS de la cuenta (la compuerta de k-anonimato ≥5 de
// ADR-069 vive en la lectura futura de RFC-007/022, no en el modelo).
export const VisibilidadPortafolioSchema = z.enum(["privado", "nodo", "publico"]);
export type VisibilidadPortafolio = z.infer<typeof VisibilidadPortafolioSchema>;

// Clases de evidencia que el portafolio puede acumular (anclas reales del
// repo: practica_acreditada LIC-R3, activos R5b, reportes CORE-005, fichas
// NODO-CAU; externo = fuera de la plataforma, con procedencia ADR-035).
export const TipoEvidenciaPortafolioSchema = z.enum([
  "practica_territorial",
  "activo",
  "reporte_resuelto",
  "ficha_valoracion",
  "externo",
]);
export type TipoEvidenciaPortafolio = z.infer<typeof TipoEvidenciaPortafolioSchema>;

// Superficie referida por la evidencia: la evidencia REFERENCIA, jamás
// copia (criterio estructural #149 — sin duplicar dominios ni geometría).
export const RefTipoEvidenciaPortafolioSchema = z.enum(["activo", "reporte", "ficha_valoracion", "externo"]);
export type RefTipoEvidenciaPortafolio = z.infer<typeof RefTipoEvidenciaPortafolioSchema>;

// Slug del portafolio (único por cuenta).
export const KeyPortafolioSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9_-]+$/, "slug: minúsculas, dígitos, _ o - (^[a-z0-9_-]+$)")
  .min(3, "slug: al menos 3 caracteres")
  .max(96, "slug: a lo sumo 96 caracteres");
export type KeyPortafolio = z.infer<typeof KeyPortafolioSchema>;

// Alta de portafolio (v1 estructura): el titular se deriva de la sesión
// autenticada en la ruta futura (RFC-007) — jamás viaja en el payload.
export const PortafolioAltaSchema = z.object({
  slug: KeyPortafolioSchema,
  titulo: z
    .string()
    .trim()
    .min(3, "titulo: al menos 3 caracteres")
    .max(120, "titulo: a lo sumo 120 caracteres"),
  descripcion: z.string().trim().max(500, "descripcion: a lo sumo 500 caracteres").optional(),
});
export type PortafolioAlta = z.infer<typeof PortafolioAltaSchema>;

// Procedencia de una evidencia externa (ADR-035): fuente declarada + ref +
// fecha de corte — jamás de memoria (R9). Regla 13: fuente + fecha.
export const ProcedenciaEvidenciaSchema = z.object({
  fuente_key: z
    .string()
    .trim()
    .regex(/^[a-z0-9_-]+$/, "fuente_key: slug de la fuente (p.ej. corpus_dului_it)")
    .min(3)
    .max(96),
  source_ref: z.string().trim().max(240, "source_ref: a lo sumo 240 caracteres").optional(),
  fecha_corte: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "fecha_corte: YYYY-MM-DD (regla 13)"),
});
export type ProcedenciaEvidencia = z.infer<typeof ProcedenciaEvidenciaSchema>;

// Alta de evidencia del portafolio: exige portafolio + tipo + ref + titulo.
// Para ref externo, la procedencia es de hecho obligatoria (la compuerta
// dura vive en la ruta futura de RFC-007/022).
export const EvidenciaPortafolioAltaSchema = z.object({
  portafolio_id: z.string().trim().min(10, "portafolio_id: id del portafolio"),
  tipo: TipoEvidenciaPortafolioSchema,
  ref_tipo: RefTipoEvidenciaPortafolioSchema,
  ref_key: z.string().trim().max(96, "ref_key: a lo sumo 96 caracteres").optional(),
  titulo: z
    .string()
    .trim()
    .min(3, "titulo: al menos 3 caracteres")
    .max(160, "titulo: a lo sumo 160 caracteres"),
  nota: z.string().trim().max(500, "nota: a lo sumo 500 caracteres").optional(),
  procedencia: ProcedenciaEvidenciaSchema.optional(),
});
export type EvidenciaPortafolioAlta = z.infer<typeof EvidenciaPortafolioAltaSchema>;

// Forma declarada de lectura futura (RFC-007/022): sin PII — el titular
// jamás se expone (solo el pseudónimo que la ruta futura compute).
export const PortafolioVocabularioSchema = z.object({
  slug: KeyPortafolioSchema,
  titulo: z.string(),
  descripcion: z.string().nullable(),
  estado: EstadoPortafolioSchema,
  visibilidad: VisibilidadPortafolioSchema,
});
export type PortafolioVocabulario = z.infer<typeof PortafolioVocabularioSchema>;
