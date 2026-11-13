// ─── LIC-DLUI LIC-R9 (#456, épica #448): DL-14 — cooperación y convenios ───
//
// Decisión DL-14 ratificada (issue #456): los convenios de cooperación son
// acto institucional — la escritura es SOLO admin (ADR-031) y la lectura es
// pública con cobertura «X de N» (DL-5). Contrapartes GENÉRICAS: organismos
// e instituciones, jamás personas (Ley 25.326/ADR-027). Estados honestos:
// el vacío sin_instrumento_encontrado se declara, no se maquilla (R15 —
// precedente not_found). UNSJ-fuera (decisión DH): el tipo universidad es
// genérico, sin contrapartes nombradas de la UNSJ.

import { z } from "zod";

// Ciclo de vida del convenio + estado honesto del vacío (R15): un convenio
// buscado y no encontrado se DECLARA con sin_instrumento_encontrado — el
// vacío informativo también se publica (patrón DL-13.4).
export const EstadoConvenioSchema = z.enum([
  "propuesto",
  "en_negociacion",
  "vigente",
  "vencido",
  "sin_instrumento_encontrado",
]);
export type EstadoConvenio = z.infer<typeof EstadoConvenioSchema>;

// Contraparte GENÉRICA (sin PII): el tipo es una categoría de organismo,
// jamás una persona física.
export const TipoContraparteSchema = z.enum([
  "nacional",
  "provincial",
  "municipal",
  "universidad",
  "organismo",
  "organizacion_social",
  "empresa",
  "otro",
]);
export type TipoContraparte = z.infer<typeof TipoContraparteSchema>;

// El NODO de origen es una clave del vocabulario (la ruta valida contra la
// tabla nodos — patrón salud/amenazas/comunicacion).
export const NodoKeyConvenioSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9_]+$/, "nodo_key: slug del vocabulario de nodos")
  .min(3)
  .max(64);

// FUENTE OBLIGATORIA (patrón DL-13.1): sin fuente no hay convenio declarado
// — el alta sin procedencia es inválida por construcción.
export const FuenteConvenioSchema = z.object({
  fuente_key: z
    .string()
    .trim()
    .regex(/^[a-z0-9_-]+$/, "fuente_key: slug de la fuente oficial (p.ej. municipio-caucete, inaes)")
    .min(3)
    .max(96),
  fuente_url: z.string().url().optional(),
  fecha_corte: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "fecha_corte: YYYY-MM-DD (fuente + fecha + certeza, regla 13)"),
});
export type FuenteConvenio = z.infer<typeof FuenteConvenioSchema>;

// ALTA — acto institucional, SOLO admin (ADR-031). Sin PII: la contraparte
// es un organismo, jamás una persona (compuerta anti-PII en la ruta).
export const ConvenioAltaSchema = z
  .object({
    nodo_key: NodoKeyConvenioSchema,
    contraparte: z.string().trim().min(3, "contraparte: al menos 3 caracteres").max(160),
    contraparte_tipo: TipoContraparteSchema,
    objeto: z.string().trim().min(8, "objeto: al menos 8 caracteres").max(300),
    estado: EstadoConvenioSchema.default("propuesto"),
  })
  .extend(FuenteConvenioSchema.shape);
export type ConvenioAlta = z.infer<typeof ConvenioAltaSchema>;

// LECTURA — shape público (sin PII por construcción: no hay campos de
// personas; el registrante institucional no se expone).
export const ConvenioSchema = z.object({
  id: z.string(),
  nodo_key: NodoKeyConvenioSchema,
  contraparte: z.string(),
  contraparte_tipo: TipoContraparteSchema,
  objeto: z.string(),
  estado: EstadoConvenioSchema,
  fuente: FuenteConvenioSchema,
  creado_en: z.string(),
});
export type Convenio = z.infer<typeof ConvenioSchema>;

// COBERTURA — «X de N» honesto, nace «0 de N» (DL-5), jamás ranking entre
// nodos (R5/ADR-036).
export const CoberturaConveniosSchema = z.object({
  dominio: z.string(),
  regla: z.string(),
  cautela: z.string(),
  nodos_con_convenios: z.number().int().min(0),
  nodos_totales: z.number().int().min(0),
  detalle: z.array(
    z.object({
      nodo_key: z.string(),
      convenios_declarados: z.number().int().min(0),
    })
  ),
  cobertura: z.string(),
});
export type CoberturaConvenios = z.infer<typeof CoberturaConveniosSchema>;
