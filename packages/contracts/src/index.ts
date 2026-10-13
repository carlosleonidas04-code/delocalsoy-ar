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

// ─── NODO-CAPITAL NCAP-R6 (#158): Bloque 9 — Banco de Potencialidades ───

// Tipos de oportunidad (Bloque 9 del documento de la DH): capacidades,
// recursos, demandas, vacíos y vínculos del desarrollo local.
export const OportunidadTipoSchema = z.enum([
  "human_capacity",
  "productive_capacity",
  "physical_asset",
  "institutional_asset",
  "cultural_asset",
  "detected_demand",
  "market_gap",
  "partnership_opportunity",
  "investment_opportunity",
  "policy_opportunity",
]);

// Ciclo de vida (Bloque 9): detected → under_review → validated → prioritized
// → in_development → active → implemented; paused/discarded/archived son
// estados laterales. La matriz de transiciones vive en la API (route), no aquí.
export const OportunidadEstadoSchema = z.enum([
  "detected",
  "under_review",
  "validated",
  "prioritized",
  "in_development",
  "active",
  "implemented",
  "paused",
  "discarded",
  "archived",
]);

// Filtro de la lectura pública: 'discarded' nunca es filtrable ni publicable.
export const OportunidadEstadoPublicoFiltroSchema = z.enum([
  "detected",
  "under_review",
  "validated",
  "prioritized",
  "in_development",
  "active",
  "implemented",
  "paused",
  "archived",
]);

// Evidencia obligatoria (criterio mínimo del Bloque 9: al menos una fuente o
// evidencia por oportunidad — una búsqueda sin resultados es solo una señal).
export const OportunidadEvidenciaSchema = z.object({
  evidence_type: z.enum([
    "community_input",
    "survey",
    "platform_data",
    "field_observation",
    "institutional_document",
    "news_source",
    "statistical_source",
  ]),
  descripcion: z.string().trim().min(3, "La evidencia requiere una descripción").max(1000),
  reference_url: z.string().trim().url("URL de referencia inválida").max(500).optional(),
});

// Actor con consentimiento (Ley 25.326): si se nombra a una persona u
// organización, el consentimiento debe estar confirmado — el anti-PII de la
// API revisa el nombre ANTES de persistir (ADR-020 cond. 1).
export const OportunidadActorSchema = z
  .object({
    role: z.enum(["proposer", "beneficiary", "provider", "partner", "validator", "supporter"]),
    name: z.string().trim().max(120).optional(),
    consent_confirmed: z.boolean(),
  })
  .refine((actor) => actor.name === undefined || actor.consent_confirmed === true, {
    message: "un actor nombrado exige consentimiento confirmado",
    path: ["consent_confirmed"],
  });

// Alta de oportunidad (NCAP-R6): contexto territorial por nodo + subnodo —
// SIN geometría propia (criterio estructural #149/#158: la oportunidad se
// acredita por territorio declarado, no por un punto inventado). Los campos de
// texto pasan el anti-PII de la API ANTES de persistir (ADR-027, Ley 25.326).
export const OportunidadAltaSchema = z.object({
  tipo: OportunidadTipoSchema,
  titulo: z.string().trim().min(3, "El título debe tener al menos 3 caracteres").max(120),
  descripcion: z.string().trim().min(10, "La descripción debe tener al menos 10 caracteres").max(2000),
  nodo_key: SanJuanNodeSlugSchema,
  subnodo_key: z
    .string()
    .trim()
    .regex(/^[a-z0-9_]+$/, "subnodo_key: slug en minúsculas y guiones bajos")
    .max(60)
    .optional(),
  evidencia: OportunidadEvidenciaSchema,
  actores: z.array(OportunidadActorSchema).max(10).optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(8).optional(),
});

// Cambio de estado por moderación (NCAP-R6): moderador|admin según la matriz
// de transiciones del ciclo de vida (ADR-031).
export const OportunidadEstadoCambioSchema = z.object({
  estado: OportunidadEstadoSchema,
  motivo: z.string().trim().max(500).optional(),
});

// ─── NODO-VIG VIG-001 (NVIG-R4 #171, épica #167): subnodos territoriales ───

// Jerarquía territorial de 3 niveles del nodo Valle de Iglesia (Opción B
// ratificada R9 2026-10-13 en #167): distrito → paraje → subparaje, más la
// localidad INDEC como subnodo de distrito. Los parajes que no dependen de un
// distrito (alta cordillera) cuelgan directamente del nodo (parent null).
export const SubnodoTipoSchema = z.enum(["district", "paraje", "subparaje", "locality"]);

// Procedencia de la asignación a distrito (estados honestos del nodo):
// dh_directive = decisión ratificada por la Dirección Humana;
// nearest_district_provisional = cercanía computada sobre punto público
// BAHRA/Georef (segundo lote de travesía: unverified);
// unverified = pendiente de decisión de la DH.
export const SubnodoAssignmentStatusSchema = z.enum([
  "dh_directive",
  "nearest_district_provisional",
  "unverified",
]);

// Zona territorial del subnodo (franja del valle, no una capa del vocabulario).
export const SubnodoZoneSchema = z.enum(["valle", "travesia", "alta_cordillera"]);

// Geometría honesta: provisional hasta contraste oficial; unverified = sin fuente.
export const SubnodoBoundaryStatusSchema = z.enum(["provisional", "unverified"]);

// Filtros de la lectura pública GET /api/nodos/:key/subnodos.
// parent='none' = hijos directos del nodo (parent_key IS NULL) — p.ej. los
// parajes de alta cordillera que no pertenecen a ningún distrito.
export const SubnodoFiltroSchema = z.object({
  type: SubnodoTipoSchema.optional(),
  parent: z
    .string()
    .trim()
    .regex(/^(none|[a-z0-9_]+)$/, "parent: clave del subnodo padre o 'none'")
    .max(60)
    .optional(),
});
