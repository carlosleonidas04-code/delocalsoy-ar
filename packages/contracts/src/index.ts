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

// ─── CORE-004 R5b (dominio activos, #87) ───

// Tipos de activo territorial propuestos por la ciudadanía.
export const ActivoTipoSchema = z.enum([
  "inmueble",
  "infraestructura",
  "servicio",
  "patrimonio",
  "otro",
]);

// Estados del flujo de moderación: propuesto → aprobado | rechazado.
export const ActivoEstadoSchema = z.enum(["propuesto", "aprobado", "rechazado"]);

// Alta ciudadana de un activo (R5b): el anti-PII de la API se aplica sobre
// título/descripción ANTES de persistir (ADR-020 cond. 1, Ley 25.326) — el
// contrato valida forma; la política de PII es de la API, no del schema.
export const ActivoAltaSchema = z.object({
  tipo: ActivoTipoSchema,
  titulo: z.string().trim().min(3, "El título debe tener al menos 3 caracteres").max(120),
  descripcion: z.string().trim().max(2000).optional(),
  nodo_key: SanJuanNodeSlugSchema,
  lat: z.number().min(-90, "lat fuera de rango").max(90, "lat fuera de rango"),
  lng: z.number().min(-180, "lng fuera de rango").max(180, "lng fuera de rango"),
});

// Cambio de estado por moderación (R5b): solo aprobado | rechazado.
export const ActivoEstadoCambioSchema = z.object({
  estado: z.enum(["aprobado", "rechazado"]),
  motivo: z.string().trim().max(500).optional(),
});

// ─── NODO-CAU R4 (#149): ficha de valoración comunitaria del espacio público ───

// Versión del instrumento: el checklist evoluciona con los talleres; cada
// respuesta queda registrada con la versión con la que fue relevada.
export const FichaVersionSchema = z.enum(["v1"]);

// Estados del testimonio revisable (ADR-036): la ficha nace 'testimonio';
// la moderación la corrobora o descarta. 'descartada' no se publica.
export const FichaValoracionEstadoSchema = z.enum(["testimonio", "corroborada", "descartada"]);

// Filtro de la lectura pública: nunca admite 'descartada'.
export const FichaEstadoPublicoFiltroSchema = z.enum(["corroborada", "testimonio"]);

// Quién validó una ficha corroborada: moderación individual o taller
// comunitario (instancia de validación colectiva — decisión ratificada #149).
export const FichaCorroboracionSchema = z.enum(["individual", "taller_comunitario"]);

// 7 dimensiones ratificadas (#149) — observables de diseño del ESPACIO,
// NUNCA personas ni organizaciones (ADR-036 + decisión R9: sin nombres).
export const FichaRespuestasV1Schema = z.object({
  usos_vitalidad: z.object({
    usos_detectados: z
      .array(z.enum(["recreo", "deporte", "reunion", "descanso", "feria", "cultura", "transito"]))
      .min(1, "Debe detectarse al menos un uso del espacio"),
    nivel_actividad: z.enum(["baja", "media", "alta"]),
    observaciones: z.string().trim().max(300).optional(),
  }),
  accesibilidad: z.object({
    rampa_acceso: z.enum(["si", "parcial", "no", "desconocido"]),
    estado_vereda: z.enum(["bueno", "regular", "malo", "desconocido"]),
    obstaculos: z.boolean(),
  }),
  sombra_arbolado: z.object({
    arbolado_presente: z.boolean(),
    sombra_horario_central: z.enum(["abundante", "parcial", "escasa", "nula", "desconocido"]),
    lectura_3_30_300: z.string().trim().max(200).optional(), // interpretación con método (R5), no dato oficial
  }),
  agua_xerojardin: z.object({
    riego: z.enum(["si", "no", "desconocido"]),
    perdidas_visibles: z.boolean(),
    especies_apto_clima: z.enum(["si", "no", "desconocido"]),
  }),
  // CPTED + género: observables del ESPACIO — nunca vigilancia de personas
  // ni etiquetas de "zona insegura" (ADR-036).
  seguridad_disenio: z.object({
    iluminacion: z.enum(["buena", "regular", "mala", "desconocido"]),
    visibilidad: z.enum(["buena", "regular", "mala", "desconocido"]),
    mantenimiento: z.enum(["bueno", "regular", "malo", "desconocido"]),
    destinos_activos_cercanos: z.boolean(),
  }),
  equipamiento: z.object({
    bancos: z.boolean(),
    juegos_infantiles: z.boolean(),
    canchas: z.boolean(),
    basureros: z.boolean(),
    bebedero: z.boolean(),
    otro: z.string().trim().max(120).optional(),
  }),
  custodia: z.object({
    custodia_presente: z.boolean(),
    tipo_acuerdo: z.enum(["vecinal", "escolar", "club", "otro", "ninguno"]), // anclado al espacio — sin nombres (decisión R9)
  }),
  notas: z.string().trim().max(500).optional(),
});

// Alta de ficha (R4): anclada a un feature de la capa public_space — la ficha
// no crea geometría propia; el espacio acredita la ubicación. Los campos de
// texto pasan el anti-PII de la API ANTES de persistir (ADR-027, Ley 25.326).
export const FichaValoracionAltaSchema = z.object({
  nodo_key: SanJuanNodeSlugSchema,
  feature_id: z.string().min(1),
  version: FichaVersionSchema,
  respuestas: FichaRespuestasV1Schema,
});

// Cambio de estado por moderación (R4): corroborar exige declarar quién
// corrobora (individual | taller_comunitario).
export const FichaValoracionEstadoCambioSchema = z
  .object({
    estado: z.enum(["corroborada", "descartada"]),
    corroboracion: FichaCorroboracionSchema.optional(),
    motivo: z.string().trim().max(500).optional(),
  })
  .refine((value) => value.estado === "descartada" || value.corroboracion !== undefined, {
    message: "corroboracion es requerida para corroborar una ficha",
    path: ["corroboracion"],
  });
