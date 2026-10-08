import { z } from "zod";

// Contrato federado de DELocalSoy.AR — fuente única de validación (riesgo #52:
// apps/api consume desde acá; se eliminan los schemas Zod locales duplicados).

export const SanJuanNodeSlugSchema = z.enum(["capital", "caucete", "iglesia"]);

export const RuntimeHealthModeSchema = z.enum(["real", "synthetic", "degraded"]);

// Paridad con routes/territorios.ts: el contrato valida los mismos rangos
// SRID=4326 y envolvente no vacía que el route, para que no haya deriva.
export const BboxStringSchema = z
  .string()
  .regex(/^-?\d+(\.\d+)?(,-?\d+(\.\d+)?){3}$/, "bbox debe tener el formato minLng,minLat,maxLng,maxLat")
  .refine((value) => {
    const [minLng, minLat, maxLng, maxLat] = value.split(",").map(Number);
    return (
      minLng >= -180 && maxLng <= 180 &&
      minLat >= -90 && maxLat <= 90 &&
      minLng < maxLng && minLat < maxLat
    );
  }, "coordenadas fuera de rango o envolvente vacía (SRID=4326)");

// Payload de territorio (CORE-002 T4, #66): antes duplicado en el route como
// schema Zod local. Fuente única desde acá.
export const TerritorioSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  provincia: z.string().min(1, "La provincia es obligatoria"),
  activo: z.boolean().optional().default(true),
});

export const EvidenceStatusSchema = z.enum([
  "Implementado",
  "Verificado",
  "Acreditado",
  "Staging-only",
  "Pendiente",
  "Reemplazado",
]);

// ─── CORE-004 R3 (ADR-031, #87): identidad por etapas ───

// Roles ratificados (ADR-031): ciudadano | moderador | admin.
export const RolSchema = z.enum(["ciudadano", "moderador", "admin"]);

// Registro: el email es el identificador de login (única PII persistida en
// 'usuarios'; los sellos system.user_* de events_raw nunca lo contienen — Ley 25.326).
export const UsuarioRegistroSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  display_name: z.string().trim().min(1).max(80).optional(),
});

export const UsuarioLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email inválido"),
  password: z.string().min(1, "La contraseña es requerida"),
});
