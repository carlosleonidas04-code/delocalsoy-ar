import { z } from "zod";
export const SanJuanNodeSlugSchema = z.enum(["capital", "caucete", "iglesia"]);
export const RuntimeHealthModeSchema = z.enum(["real", "synthetic", "degraded"]);
export const BboxStringSchema = z.string().regex(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/);
export const EvidenceStatusSchema = z.enum(["Implementado", "Verificado", "Acreditado", "Staging-only", "Pendiente", "Reemplazado"]);
