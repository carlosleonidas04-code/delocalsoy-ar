// ─── LIC-DLUI LIC-R8 (#451, épica #448): DL-13 — comunicación pública honesta ───
//
// Canon DLUI-569 (LIC-08) como ley interna: la comunicación JAMÁS sustituye
// la evidencia. Sin fuente no hay aviso (fuente_key + fecha_corte + certeza
// a nivel contrato — el alta sin fuente es inválida por construcción); la
// plataforma traduce, jamás alerta (cita y enlaza la fuente oficial — SMN,
// Hidráulica, Vialidad, municipio — sin reemplazar el sistema de alerta
// operativa); caducidad honesta (el aviso de riesgo lleva caduca_en y el
// vencido se expone `caducado`, jamás borrado — ADR-038); anti-infodemia
// (certeza verificado|reportado|rumor_descartado — el desmentido se publica
// CON fuente: el vacío informativo también se comunica); sin PII (Ley
// 25.326/ADR-027: sin datos de personas en título ni cuerpo); cobertura
// «X de N» jamás ranking entre nodos (R5/ADR-036).

import { z } from "zod";

export const EstadoAvisoSchema = z.enum(["borrador", "publicado", "caducado"]);
export type EstadoAviso = z.infer<typeof EstadoAvisoSchema>;

export const CertezaAvisoSchema = z.enum(["verificado", "reportado", "rumor_descartado"]);
export type CertezaAviso = z.infer<typeof CertezaAvisoSchema>;

export const TipoAvisoSchema = z.enum([
  "riesgo_climatico",
  "aluvional",
  "vial",
  "servicio_publico",
  "comunitario",
  "desmentido",
]);
export type TipoAviso = z.infer<typeof TipoAvisoSchema>;

// El NODO de origen es una clave del vocabulario (la ruta valida contra la
// tabla nodos — patrón salud/amenazas).
export const NodoKeyAvisoSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9_]+$/, "nodo_key: slug del vocabulario de nodos")
  .min(3)
  .max(64);

// FUENTE OBLIGATORIA (DL-13.1): sin esto el alta entera es inválida — un
// aviso sin fuente no se publica, no existe.
export const FuenteAvisoSchema = z.object({
  fuente_key: z
    .string()
    .trim()
    .regex(/^[a-z0-9_-]+$/, "fuente_key: slug de la fuente oficial (p.ej. smn, hidraulica-sj, municipio-capital)")
    .min(3)
    .max(96),
  fuente_url: z.string().url().optional(),
  fecha_corte: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "fecha_corte: YYYY-MM-DD (fuente + fecha + certeza, regla 13)"),
  certeza: CertezaAvisoSchema,
});
export type FuenteAviso = z.infer<typeof FuenteAvisoSchema>;

// ALTA — solo admin (R15 estricta, patrón /api/salud/agregados). Los avisos
// de riesgo llevan caducidad honesta (DL-13.3) y un desmentido se publica
// con certeza rumor_descartado (DL-13.4).
export const AvisoAltaSchema = z
  .object({
    nodo_key: NodoKeyAvisoSchema,
    titulo: z.string().trim().min(8, "titulo: al menos 8 caracteres").max(180),
    cuerpo: z.string().trim().min(20, "cuerpo: al menos 20 caracteres").max(4000),
    tipo: TipoAvisoSchema,
    caduca_en: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "caduca_en: YYYY-MM-DD").optional(),
  })
  .extend(FuenteAvisoSchema.shape)
  .refine((a) => a.tipo === "comunitario" || !!a.caduca_en, {
    message: "los avisos de riesgo llevan fecha de caducidad honesta (DL-13.3)",
  })
  .refine((a) => a.tipo !== "desmentido" || a.certeza === "rumor_descartado", {
    message: "un desmentido se publica con certeza rumor_descartado (DL-13.4)",
  });
export type AvisoAlta = z.infer<typeof AvisoAltaSchema>;

// LECTURA — shape público (sin PII por construcción: no hay campos de
// personas). El estado `caducado` es COMPUTADO en lectura (caduca_en <
// hoy ⇒ caducado, sin escritura — honesto y sin cron).
export const AvisoSchema = z.object({
  id: z.string(),
  nodo_key: NodoKeyAvisoSchema,
  titulo: z.string(),
  cuerpo: z.string(),
  tipo: TipoAvisoSchema,
  estado: EstadoAvisoSchema,
  fuente: FuenteAvisoSchema,
  caduca_en: z.string().nullable(),
  creado_en: z.string(),
});
export type Aviso = z.infer<typeof AvisoSchema>;

// COBERTURA — «X de N» honesto, nace «0 de N» (DL-5), jamás ranking (DL-13.6).
export const CoberturaAvisosSchema = z.object({
  dominio: z.string(),
  regla: z.string(),
  cautela: z.string(),
  nodos_con_avisos: z.number().int().min(0),
  nodos_totales: z.number().int().min(0),
  detalle: z.array(
    z.object({
      nodo_key: z.string(),
      avisos_publicados: z.number().int().min(0),
    })
  ),
  cobertura: z.string(),
});
export type CoberturaAvisos = z.infer<typeof CoberturaAvisosSchema>;
