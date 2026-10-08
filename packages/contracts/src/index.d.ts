import type { z } from "zod";

// Espejo de tipos de src/index.ts para consumidores que resuelven por "main"
// (mismo patrón que packages/db). La fuente de verdad es el .ts.

export declare const SanJuanNodeSlugSchema: z.ZodEnum<["capital", "caucete", "iglesia"]>;
export declare const RuntimeHealthModeSchema: z.ZodEnum<["real", "synthetic", "degraded"]>;
export declare const BboxStringSchema: z.ZodType<string, z.ZodTypeDef, string>;
export declare const TerritorioSchema: z.ZodObject<{
  nombre: z.ZodString;
  provincia: z.ZodString;
  activo: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}>;
export declare const EvidenceStatusSchema: z.ZodEnum<[
  "Implementado",
  "Verificado",
  "Acreditado",
  "Staging-only",
  "Pendiente",
  "Reemplazado"
]>;
export declare const RolSchema: z.ZodEnum<["ciudadano", "moderador", "admin"]>;
export declare const UsuarioRegistroSchema: z.ZodObject<{
  email: z.ZodString;
  password: z.ZodString;
  display_name: z.ZodOptional<z.ZodString>;
}>;
export declare const UsuarioLoginSchema: z.ZodObject<{
  email: z.ZodString;
  password: z.ZodString;
}>;

// ─── CORE-004 R5b (dominio activos, #87): espejo de src/index.ts ───

export declare const ActivoTipoSchema: z.ZodEnum<[
  "inmueble",
  "infraestructura",
  "servicio",
  "patrimonio",
  "otro"
]>;
export declare const ActivoEstadoSchema: z.ZodEnum<["propuesto", "aprobado", "rechazado"]>;
export declare const ActivoAltaSchema: z.ZodObject<{
  tipo: z.ZodEnum<["inmueble", "infraestructura", "servicio", "patrimonio", "otro"]>;
  titulo: z.ZodString;
  descripcion: z.ZodOptional<z.ZodString>;
  nodo_key: z.ZodEnum<["capital", "caucete", "iglesia"]>;
  lat: z.ZodNumber;
  lng: z.ZodNumber;
}>;
export declare const ActivoEstadoCambioSchema: z.ZodObject<{
  estado: z.ZodEnum<["aprobado", "rechazado"]>;
  motivo: z.ZodOptional<z.ZodString>;
}>;
