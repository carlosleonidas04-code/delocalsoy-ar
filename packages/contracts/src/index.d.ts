import type { z } from "zod";

// Espejo de tipos de src/index.ts para consumidores que resuelven por "main"
// (mismo patrón que packages/db). La fuente de verdad es el .ts.

export declare const SanJuanNodeSlugSchema: z.ZodEnum<["capital", "caucete", "iglesia"]>;
export declare const RuntimeHealthModeSchema: z.ZodEnum<["real", "synthetic", "degraded"]>;
export declare const BboxStringSchema: z.ZodType<string, z.ZodTypeDef, string>;
export declare const EvidenceStatusSchema: z.ZodEnum<[
  "Implementado",
  "Verificado",
  "Acreditado",
  "Staging-only",
  "Pendiente",
  "Reemplazado"
]>;
