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

// Roles ratificados (ADR-031): ciudadano | moderador | admin. ARTEFACTOS-ROLES
// AR1 (#400, épica #399) agrega el rol REAL 'visitante': cuenta ligera de
// tránsito SOLO LECTURA en v0.2 — la API es la compuerta (403 real).
export const RolSchema = z.enum(["ciudadano", "visitante", "moderador", "admin"]);

// Registro: el email es el identificador de login (única PII persistida en
// 'usuarios'; los sellos system.user_* de events_raw nunca lo contienen — Ley 25.326).
export const UsuarioRegistroSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  display_name: z.string().trim().min(1).max(80).optional(),
});

// MARKET-CAP MK-1 fase 1 (#243, PR #246): dominio del Mercado de Proximidad —
// re-export del modulo comercios (conflict-neutral v2: zona prefijo común).
export * from './comercios.js';

export const UsuarioLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email inválido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

// ─── ARTEFACTOS-ROLES AR1 (#400, épica #399): residencia y visitante ───

// AR1 — decisión DH 2026-11-06: el vecino es un ATRIBUTO de residencia sobre
// la cuenta ciudadana, NO un rol. Solo la clave del subnodo real del
// vocabulario (la ruta la valida contra la tabla subnodos): sin domicilio
// jamás (Ley 25.326 / ADR-027), auto-declarada sin verificación (R15).
export const ResidenciaAltaSchema = z.object({
  subnodo_key: z
    .string()
    .trim()
    .regex(/^[a-z0-9_]+$/, "subnodo_key: clave del vocabulario (minúsculas, dígitos o _)")
    .min(3, "subnodo_key: al menos 3 caracteres")
    .max(60, "subnodo_key: a lo sumo 60 caracteres"),
});

// AR1 — consentimiento GRANULAR del visitante (ADR-027): literal true. Sin
// contacto_email true no hay cuenta visitante — nunca se pre-marca en el
// cliente y el rechazo es ANTES de persistir.
export const VisitanteConsentimientoSchema = z
  .object({ contacto_email: z.boolean() })
  .refine((c) => c.contacto_email === true, {
    message: "Consentimiento de contacto: se exige contacto_email true (ADR-027)",
  });

// AR1 — cuenta ligera visitante (rol real 'visitante', SOLO LECTURA v0.2):
// alias público (anti-PII en la ruta), subnodo de tránsito DECLARADO contra
// el vocabulario (jamás geolocalizado) y consentimiento granular literal.
export const VisitanteRegistroSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  alias: z
    .string()
    .trim()
    .min(3, "El alias público debe tener al menos 3 caracteres")
    .max(40, "El alias público debe tener a lo sumo 40 caracteres"),
  subnodo_transito_key: z
    .string()
    .trim()
    .min(3, "subnodo_transito_key: al menos 3 caracteres")
    .max(60, "subnodo_transito_key: a lo sumo 60 caracteres"),
  consentimiento: VisitanteConsentimientoSchema,
});

// ─── Serie Contracts NCAP-R2 (PR #233): índice extendido [agent: vibe] ───
// Decisión DH 2026-10-17: preservar TODOS los bindings inline de main (los consume
// apps/api) y AÑADIR los 11 módulos canónicos + constantes NCAP-R2 (agent.google;
// oportunidades.js eliminado por decisión DH 2026-10-17: dominio Bloque 9 canónico único).
// Colisiones de nombres verificadas: 0 (76 exports de main vs exports de los módulos).
// HONEST_EPISTEMIC_STATES_PALETTE armonizada al canon ADR-034 por decisión DH
// 2026-10-17: validado #4ADE80, comunitario #75AADB, pendiente #F2A71B, sintético #FFC72C
// (valores originales del agente: #00A86B / #E06D53 / #94A3B8 — ver traza del PR #233).
// 1. Re-exportaciones Modulares Canónicas (Lote 1 + Lote Complementario NCAP-R2)
export * from './nodoCapital.js';
export * from './ncap.js';
export * from './territorios.js';
export * from './evidencias.js';
export * from './health.js';
export * from './openapi.js';
export * from './plataformaTerritorial.js';
export * from './activos.js';
export * from './modeloFederado.js';
export * from './territorialModel.js';
export * from './directoryTaxonomy.js';
export * from './caucete.js';
// oportunidades.js ELIMINADO (decisión DH 2026-10-17, armonización de dominio #233):
// duplicaba el dominio Bloque 9 canónico (Oportunidad* inline, PR #160). El vocabulario
// de economía popular del agente queda documentado en la traza del PR como propuesta futura.

// 2. Definiciones Canónicas Inline y Compatibilidad ADR-021
export const PROTOCOLO_ACTUAL = 'NCAP-R2';
export const SRID_CANONICO = 4326;
export const VERSION_CONTRACTS = '0.6.0-ncap.r2';

/**
 * Constantes de Paleta de Estados Honestos (WCAG AA & 4 Señales Canónicas)
 */
export const HONEST_EPISTEMIC_STATES_PALETTE = {
  validado: {
    label: 'Acreditado / Terreno',
    colorHex: '#4ADE80',
    bgClass: 'bg-emerald-50 dark:bg-emerald-950/40',
    borderClass: 'border-emerald-500 border-solid',
    textClass: 'text-emerald-700 dark:text-emerald-300',
    glyph: '●',
    microcopy: 'Acreditado criptográficamente · R15',
    strokeWidth: 2,
    borderStyle: 'solid'
  },
  sintetico: {
    label: 'Sintético / Inferencia',
    colorHex: '#FFC72C',
    contrastColorHex: '#D97706',
    bgClass: 'bg-amber-50 dark:bg-amber-950/40',
    borderClass: 'border-amber-400 border-dashed',
    textClass: 'text-amber-800 dark:text-amber-300',
    glyph: '✦',
    microcopy: 'Inferencia heurística / Estimación',
    strokeWidth: 1.5,
    borderStyle: 'dashed'
  },
  comunitario: {
    label: 'Comunitario / Vecinal',
    colorHex: '#75AADB',
    bgClass: 'bg-orange-50 dark:bg-orange-950/40',
    borderClass: 'border-orange-500 border-dotted',
    textClass: 'text-orange-700 dark:text-orange-300',
    glyph: '◈',
    microcopy: 'Aporte territorial de asamblea',
    strokeWidth: 1.5,
    borderStyle: 'dotted'
  },
  pendiente: {
    label: 'Pendiente de Auditoría',
    colorHex: '#F2A71B',
    bgClass: 'bg-slate-50 dark:bg-slate-900/40',
    borderClass: 'border-slate-400 border-dashed',
    textClass: 'text-slate-700 dark:text-slate-300',
    glyph: '◐',
    microcopy: 'Relevo en curso · Acreditación R9',
    strokeWidth: 1,
    borderStyle: 'dashed'
  }
} as const;

/**
 * Los 3 Nodos Federados Canónicos de San Juan (ADR-021)
 *
 * subnodosCount con procedencia (armonización de divergencias #233, decisión DH
 * 2026-10-17): capital = 6 (vocabulario ratificado R9 2026-10-17, traza #154 comment
 * 6235922878: sj_capital_centro + sj_capital_desamparados en main + los 4 subnodos del
 * lote 4; mapeo de nomenclaturas RESUELTO: SUBNODOS_CAPITAL_REGISTRO en nodoCapital.ts, 6 entidades distintas, decisión DH 2026-10-17); iglesia = 52 (VIG-001
 * lotes 1+2 acreditados en main, EV-040/EV-041); caucete = 0 (R15 honesto: sin
 * subnodos sembrados en main).
 */
export const NODOS_FEDERADOS_REGISTRO = [
  {
    id: 'nodo-capital-san-juan',
    nombre: 'Nodo San Juan Capital',
    region: 'Valle de Tulum',
    lat: -31.5375,
    lng: -68.5252,
    descripcion: 'Centro cívico, administrativo, comercial y universitario de la provincia',
    subnodosCount: 6, // ratificado DH 2026-10-17 (traza #154 comment 6235922878)
    estadoHonesto: 'validado'
  },
  {
    id: 'nodo-valle-de-iglesia',
    nombre: 'Nodo Valle de Iglesia',
    region: 'Cordillera Central / Valles Andinos',
    lat: -30.3800,
    lng: -69.2000,
    descripcion: 'Agroecología de altura, cuenca del Río Blanco, termalismo Pismanta y patrimonio protegido',
    subnodosCount: 52, // main (VIG-001 lotes 1+2, EV-040/EV-041)
    estadoHonesto: 'validado'
  },
  {
    id: 'nodo-caucete-este',
    nombre: 'Nodo Caucete Este',
    region: 'Valle Este & Oasis Irrigado',
    lat: -31.6510,
    lng: -68.2810,
    descripcion: 'Vitivinicultura histórica, Santuario Difunta Correa y corredor biocéanico este',
    subnodosCount: 0, // R15: sin subnodos sembrados en main
    estadoHonesto: 'comunitario'
  }
] as const;

export type NodoFederadoRegistro = (typeof NODOS_FEDERADOS_REGISTRO)[number];

// ─── CORE-004 R5b (dominio activos, #87) ───

// Tipos de activo territorial: base R5b + kinds multimodales VIG-002 (NVIG-R2
// #169, épica #167 — ratificado por la DH 2026-10-13: extender el enum español).
export const ActivoTipoSchema = z.enum([
  "inmueble",
  "infraestructura",
  "servicio",
  "patrimonio",
  "local",
  "prestador",
  "experiencia",
  "observacion",
  "otro",
]);

// Estados del flujo de moderación: propuesto → aprobado | rechazado;
// archivado retira del catálogo vivo un activo aprobado/rechazado (VIG-002).
export const ActivoEstadoSchema = z.enum(["propuesto", "aprobado", "rechazado", "archivado"]);

// ─── NODO-VIG VIG-002 (NVIG-R2 #169, épica #167): activos multimodales ───

// Visibilidad del punto (ADR-036): public = punto público; generalized =
// precisión reducida; restricted = excluido de la lectura pública — la ficha
// sensible queda para custodia (VIG-004 profundiza el acceso custodial).
export const ActivoVisibilidadSchema = z.enum(["public", "generalized", "restricted"]);

// Capitales territoriales N1 ratificados (taxonomía 3 niveles del VIG-000).
export const ActivoCapitalN1Schema = z.enum([
  "productivo_rural",
  "turistico",
  "patrimonial",
  "civico_social",
]);

// Clasificación multimodal (N1 capital → N2 categoría → N3 subcategoría):
// toda clasificación declara su fuente (gobernanza VIG-000: "toda
// clasificación debe tener source, fecha y estado de revisión").
export const ActivoClasificacionSchema = z.object({
  n1: ActivoCapitalN1Schema,
  n2: z.string().trim().regex(/^[a-z0-9_]+$/, "n2: slug en minúsculas y guiones bajos").min(2).max(40),
  n3: z.string().trim().regex(/^[a-z0-9_]+$/, "n3: slug en minúsculas y guiones bajos").max(40).optional(),
  is_primary: z.boolean().optional().default(false),
  source: z.string().trim().min(3, "La clasificación exige fuente").max(120),
});

// Procedencia (ADR-035): un activo 'aprobado' solo es "verificado" si lleva
// fuente trazable. Ciudadano: opcional; ingesta curada: obligatoria (R15).
// La fecha admite año suelto (YYYY) cuando la fuente solo publica el año.
export const ActivoProcedenciaSchema = z.object({
  source_id: z.string().trim().min(3, "source_id requerido").max(80),
  fuente: z.string().trim().min(3, "fuente requerida").max(120),
  fecha: z.string().trim().regex(/^\d{4}(-\d{2}-\d{2})?$/, "fecha: YYYY-MM-DD o YYYY"),
  licencia: z.string().trim().max(80).optional(),
  url: z.string().trim().url("URL de referencia inválida").max(500).optional(),
});

// Consentimiento granular (patrimonio vivo, Ley 25.326/ADR-027): si un activo
// nombra a una persona, cada uso de su identidad es opt-in explícito.
export const ActivoConsentimientoSchema = z.object({
  nombre_publico: z.boolean(),
  contacto: z.boolean(),
  ubicacion_precisa: z.boolean(),
  foto: z.boolean(),
});

// Alta ciudadana de un activo (R5b): el anti-PII de la API se aplica sobre
// título/descripción ANTES de persistir (ADR-020 cond. 1, Ley 25.326) — el
// contrato valida forma; la política de PII es de la API, no del schema.
// VIG-002 (#169): contexto subnodo + clasificaciones multimodales + procedencia
// (ADR-035) + consentimiento granular — todos opcionales para el ciudadano.
export const ActivoAltaSchema = z
  .object({
    tipo: ActivoTipoSchema,
    titulo: z.string().trim().min(3, "El título debe tener al menos 3 caracteres").max(120),
    descripcion: z.string().trim().max(2000).optional(),
    nodo_key: SanJuanNodeSlugSchema,
    subnodo_key: z
      .string()
      .trim()
      .regex(/^[a-z0-9_]+$/, "subnodo_key: slug en minúsculas y guiones bajos")
      .max(60)
      .optional(),
    lat: z.number().min(-90, "lat fuera de rango").max(90, "lat fuera de rango"),
    lng: z.number().min(-180, "lng fuera de rango").max(180, "lng fuera de rango"),
    clasificaciones: z.array(ActivoClasificacionSchema).max(5).optional(),
    procedencia: ActivoProcedenciaSchema.optional(),
    consentimiento: ActivoConsentimientoSchema.optional(),
  })
  .refine(
    (alta) => {
      if (!alta.clasificaciones || alta.clasificaciones.length === 0) return true;
      const primarias = alta.clasificaciones.filter((c) => c.is_primary).length;
      return primarias === 1;
    },
    { message: "las clasificaciones exigen exactamente una primaria", path: ["clasificaciones"] }
  );

// Cambio de estado por moderación (R5b + VIG-002): aprobado | rechazado | archivado.
export const ActivoEstadoCambioSchema = z.object({
  estado: z.enum(["aprobado", "rechazado", "archivado"]),
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

// ─── NODO-CAPITAL NCAP-R6-ext (#165): extensiones del dominio oportunidades ───
// Aportes de diseño de la Sesión 5 (corroborados en #163) implementados como
// extensiones del dominio canónico de #160. No-go de #165 honrado: la
// versión en memoria con sellos fail-open NUNCA se aterriza.

// Gate de evidencia (refuerzo de R15 sobre la matriz de transiciones): la
// moderación corrobora o revisa la evidencia ANTES de que el ciclo avance a
// estados acreditados. 'pending' es el estado honesto de todo alta
// ciudadana — el autor nunca auto-corrobora su propia evidencia.
export const OportunidadEvidenciaValidationStatusSchema = z.enum([
  "pending",
  "corroborated",
  "reviewed",
]);

// Veredicto de moderación sobre la evidencia: solo corroborated|reviewed se
// setean a mano — 'pending' es el default del alta, no un veredicto.
export const OportunidadEvidenciaValidacionSchema = z.object({
  validationStatus: z.enum(["corroborated", "reviewed"]),
  motivo: z
    .string()
    .trim()
    .min(3, "El motivo de la validación requiere detalle")
    .max(500)
    .optional(),
});

// Paginación del listado público (limit/offset, #165): el total viaja en el
// header X-DELocalSoy-Total-Count — el body lista, el header cuenta.
export const OportunidadListadoQuerySchema = z.object({
  limit: z.number().int().min(1, "limit mínimo 1").max(100, "limit máximo 100").default(20),
  offset: z.number().int().min(0, "offset mínimo 0").default(0),
});

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
  // NCAP-R6-ext #165: veredicto de la moderación sobre ESTA evidencia. Sin
  // él, la evidencia es 'pending' — honesto: el autor nunca la auto-corrobora.
  validationStatus: OportunidadEvidenciaValidationStatusSchema.optional(),
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

// Conexiones entre actores de una oportunidad (vínculos oferta/demanda del
// Bloque 9, #165): consentimiento explícito OBLIGATORIO — el refine hace
// imposible el default(true) del material de diseño (ADR-027, Ley 25.326).
export const OportunidadConexionTipoSchema = z.enum(["oferta", "demanda", "colaboracion"]);
export const OportunidadConexionSchema = z
  .object({
    actor_origen: OportunidadActorSchema,
    actor_destino: OportunidadActorSchema,
    tipo_vinculo: OportunidadConexionTipoSchema,
    consentimiento_confirmado: z.boolean(),
  })
  .refine((conexion) => conexion.consentimiento_confirmado === true, {
    message: "la conexión exige consentimiento explícito confirmado (ADR-027, Ley 25.326)",
    path: ["consentimiento_confirmado"],
  });

// Scoring territorial (interpretación con método, ADR-035, #165): niveles
// cualitativos honestos + método y fuente declarados — NUNCA un "dato del
// territorio" ni un puntaje con precisión falsa.
export const OportunidadScoringNivelSchema = z.enum(["baja", "media", "alta"]);
export const OportunidadScoringSchema = z.object({
  territorial_impact: OportunidadScoringNivelSchema,
  feasibility: OportunidadScoringNivelSchema,
  urgency: OportunidadScoringNivelSchema,
  metodo: z
    .string()
    .trim()
    .min(10, "El scoring exige declarar el método de interpretación (ADR-035)")
    .max(500),
  fuente: z.string().trim().min(1).max(120).optional(),
});

// Contexto territorial enriquecido (#165): corridor_id alineado con el
// vocabulario cor_* v0.1 (hipótesis de diseño provisional, #156 — nunca traza
// oficial); landmark_id y service_area_name opcionales. Sin corredor
// declarado, null — no se inventa contexto.
export const OportunidadTerritorialContextSchema = z.object({
  corridor_id: z
    .string()
    .regex(/^cor_[a-z0-9_]+$/, "corridor_id: vocabulario cor_* v0.1 (p. ej. cor_centro_civico, #156)")
    .max(60),
  landmark_id: z.string().trim().min(1).max(80).optional(),
  service_area_name: z.string().trim().min(1).max(120).optional(),
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
  // NCAP-R6-ext #165: contexto territorial enriquecido opcional (cor_* v0.1,
  // hipótesis provisional #156) — null honesto, nunca contexto inventado.
  territorial_context: OportunidadTerritorialContextSchema.optional(),
});

// Cambio de estado por moderación (NCAP-R6): moderador|admin según la matriz
// de transiciones del ciclo de vida (ADR-031).
export const OportunidadEstadoCambioSchema = z.object({
  estado: OportunidadEstadoSchema,
  motivo: z.string().trim().max(500).optional(),
});

// ─── NODO-CAPITAL NCAP-R4 (#156): red de corredores v0.1 — grafo relacional ───
// Corredores como RED MODELADA (relaciones verificables), no líneas dibujadas:
// corredor → segmentos (from/to tipados + modos) → hitos y subnodos vinculados.
// SIN geometría en v0.1 (R15: la traza dibujada exige fuente verificada que aún
// no existe — nada se presenta como traza oficial). Vocabulario alineado a los
// contratos NCAP-R2 (territorialModel, PR #233): kinds corridor/network_segment/
// landmark, estados candidate|mapped|validated|retired, modos walk|bike|bus|car/
// unknown y relaciones connects/near (regla de modelado #154: los hitos
// participan por relación, jamás por asignación distrital).

// Estado del corredor (vocabulario territorialModel #233): v0.1 nace
// 'candidate' — hipótesis de diseño de la DH, nunca traza oficial (R15).
export const CorredorStatusSchema = z.enum(["candidate", "mapped", "validated", "retired"]);

// Modos de circulación del segmento (vocabulario territorialModel #233).
export const CorredorModoSchema = z.enum(["walk", "bike", "bus", "car", "unknown"]);

// Endpoint tipado del segmento: hito de la red o subnodo del nodo — union
// discriminada por 'tipo' para que from/to nunca sea un string libre.
export const CorredorEndpointTipoSchema = z.enum(["hito", "subnodo"]);
export const CorredorEndpointSchema = z.object({
  tipo: CorredorEndpointTipoSchema,
  key: z.string().trim().regex(/^[a-z0-9_]+$/, "key: slug en minúsculas y guiones bajos").max(60),
});

// Fuentes por tramo (ADR-035): cada segmento declara su evidencia — una
// relación sin fuente es una invención. La fecha admite año suelto (YYYY).
export const CorredorFuenteSchema = z.object({
  fuente: z.string().trim().min(3, "El segmento exige fuente citable").max(160),
  fecha: z.string().trim().regex(/^\d{4}(-\d{2}-\d{2})?$/, "fecha: YYYY-MM-DD o YYYY"),
  url: z.string().trim().url("URL inválida").max(500).optional(),
});

// Observaciones de superficie y cruces del tramo — testimonio de diseño,
// nunca catastro (R15).
export const CorredorObservacionesSchema = z.object({
  superficie: z.string().trim().max(200).optional(),
  cruces: z.string().trim().max(300).optional(),
});

// Segmento del corredor (v0.1, uso interno del seed/ingesta DH — la API
// pública es solo lectura): from/to tipados + secuencia para continuidad +
// modos + observaciones + observed_at + fuentes por tramo (ADR-035).
export const CorredorSegmentoSchema = z.object({
  secuencia: z.number().int().min(1),
  from: CorredorEndpointSchema,
  to: CorredorEndpointSchema,
  modos: z.array(CorredorModoSchema).min(1, "El segmento exige al menos un modo").max(5),
  observaciones: CorredorObservacionesSchema.optional(),
  observed_at: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "observed_at: YYYY-MM-DD"),
  fuentes: z.array(CorredorFuenteSchema).min(1, "El segmento exige fuente por tramo (ADR-035)").max(5),
});

// Hito nodal de la red (v0.1): punto de articulación — SIN asignación
// distrital (regla #154: participa por relaciones connects/near) y lat/lng
// opcionales NULL honestos: sin punto verificado no se publica (R15).
export const CorredorHitoTipoSchema = z.enum([
  "plaza",
  "parque",
  "edificio_publico",
  "nodo_transporte",
  "institucion_educativa",
  "area_analitica",
  "otro",
]);
export const CorredorHitoSchema = z.object({
  key: z.string().trim().regex(/^hit_[a-z0-9_]+$/, "key: prefijo hit_ + slug").max(60),
  label: z.string().trim().min(3).max(120),
  tipo: CorredorHitoTipoSchema,
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  notas: z.string().trim().max(300).optional(),
});

// Corredor completo (v0.1, uso interno del seed DH): key cor_* del
// vocabulario ratificado (#156) + hitos de la red + segmentos.
export const CorredorAltaSchema = z.object({
  key: z.string().trim().regex(/^cor_[a-z0-9_]+$/, "key: vocabulario cor_* v0.1 (#156)").max(60),
  label: z.string().trim().min(3).max(120),
  proposito: z.string().trim().min(10, "El corredor exige propósito declarado").max(500),
  status: CorredorStatusSchema,
  hitos: z.array(CorredorHitoSchema).max(20).optional(),
  segmentos: z.array(CorredorSegmentoSchema).min(1, "Un corredor exige al menos un segmento").max(20),
});

// Continuidad de la red (criterio de cierre #156): derivada de la cadena de
// segmentos por secuencia — ok si cada segmento retoma donde terminó el
// anterior; ruptura si el encadenamiento se corta (el detalle dice dónde).
export const CorredorContinuidadSchema = z.enum(["ok", "ruptura"]);

// Resumen público del corredor (GET /api/corredores).
export const CorredorResumenSchema = z.object({
  key: z.string(),
  label: z.string(),
  proposito: z.string(),
  status: CorredorStatusSchema,
  nodo_key: SanJuanNodeSlugSchema,
  segmentos_count: z.number().int().min(0),
  hitos_count: z.number().int().min(0),
  continuidad: CorredorContinuidadSchema,
});

// Detalle público (GET /api/corredores/:key): hitos y subnodos resueltos con
// label + segmentos ordenados + continuidad revisada con detalle de rupturas.
export const CorredorDetalleSchema = z.object({
  key: z.string(),
  label: z.string(),
  proposito: z.string(),
  status: CorredorStatusSchema,
  nodo_key: SanJuanNodeSlugSchema,
  hitos: z.array(CorredorHitoSchema),
  subnodos: z.array(z.object({ key: z.string(), label: z.string() })),
  segmentos: z.array(CorredorSegmentoSchema),
  continuidad: CorredorContinuidadSchema,
  rupturas: z.array(
    z.object({
      despues_de_secuencia: z.number().int(),
      esperaba: CorredorEndpointSchema,
      encontro: CorredorEndpointSchema,
    })
  ),
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

// ─── NODO-VIG VIG-003 (NVIG-R3 #182, épica #167): KPIs del nodo ───

// Set honesto v1 de KPIs por nodo (ratificado por la DH 2026-10-14, traza
// #182 comment 6158288630): SOLO agregados sin PII (Ley 25.326); la
// visibilidad `restricted` queda EXCLUIDA de todo cálculo (ADR-036). El
// consumidor vig003-kpi del worker re-computa desde el dominio (nunca
// incrementos: cada snapshot es derivable de las tablas fuente en cualquier
// momento) y lo materializa en kpi_snapshots por (nodo_key, kpi_key).
export const KpiKeySchema = z.enum([
  "subnodos_total",
  "subnodos_por_distrito",
  "subnodos_con_punto",
  "activos_por_estado",
  "activos_por_tipo",
  "activos_por_capital_n1",
  "activos_verificados",
  "eventos_por_tipo",
  "cobertura_geometrica",
  // NODO-VIG-3 VIG-013 (#382, épica #377) — set v2: KPIs del dashboard
  // «Infraestructura y movilidad», mismo canon de honestidad (agregados sin
  // PII, valor null = métrica sin computar, R15).
  "pedidos_respondidos",
  "obras_km_ejecucion",
  "puntos_criticos_con_revision",
  "reportes_amc_por_dominio",
  "reportes_amc_por_distrito",
  "parajes_con_reporte",
  // MARKET-CAP MK-3a (#426, épica #422 — plan v2 slice a ratificado por la
  // DH 2026-11-07; D2 ratificada 2026-10-30): set v2 del mercado — KPIs del
  // Mercado de Proximidad. Mismo canon de honestidad: agregados sin PII
  // (Ley 25.326), restricted excluido (ADR-036), pct null honesto con 0
  // comercios (R15).
  "comercios_por_estado",
  "comercios_por_rubro",
  "comercios_por_subnodo",
  "comercios_habilitacion_verificada_pct",
  "titularidad_verificada_pct",
  "ofertas_activas",
  // LIC-DLUI LIC-R1 (LIC-01 #457, épica #448): set del observatorio de
  // indicadores — 4 claves computables desde dominios vivos, mismo canon
  // de honestidad (agregados sin PII, Ley 25.326; sintéticos y
  // descartado excluidos, R15/ADR-038; re-derivado del dominio).
  "reportes_por_estado",
  "fuentes_ingestadas_por_nodo",
  "capas_con_metadatos",
  "cobertura_reportes_distrito",
  // LIC-DLUI LIC-R2 (LIC-02 #453, épica #448): accesibilidad — KPI del
  // relevamiento de los tramos del anuncio (NCAP-R5 #155). Conteo CON
  // cobertura («0 de 18»), SIN puntajes globales de accesibilidad ni de
  // personas (R5/ADR-036); mismo canon de honestidad (R15).
  "tramos_con_relevamiento",
]);

// Set VIG-013 (NODO-VIG-3 #382, épica #377): los 6 KPIs del dashboard público
// «Infraestructura y movilidad» (GET /api/nodos/{key}/infraestructura-movilidad)
// que la ruta lee de kpi_snapshots. Los materializa el consumidor vig003-kpi
// del worker (patrón VIG-003: upsert idempotente por nodo_key+kpi_key que
// RE-DERIVA desde las tablas de dominio — pedidos, features obra_vial/
// punto_critico/parada_transporte/cobertura_sos, reportes AMC, subnodos —,
// nunca incrementos). Sin corrida del worker → 0 snapshots honestos (R15).
export const VIG013_KPI_KEYS = [
  "pedidos_respondidos",
  "obras_km_ejecucion",
  "puntos_criticos_con_revision",
  "reportes_amc_por_dominio",
  "reportes_amc_por_distrito",
  "parajes_con_reporte",
] as const;

// ─── LIC-DLUI LIC-R1 (LIC-01 #457, épica #448): observatorio de indicadores ───

// Set LIC-01 (LIC-R1 #457): los 4 KPIs del observatorio público
// (GET /api/nodos/{key}/observatorio) que la ruta lee de kpi_snapshots.
// Los materializa el consumidor vig003-kpi (patrón VIG-003/MK-3a: upsert
// idempotente por nodo_key+kpi_key que RE-DERIVA desde los dominios
// vivos — reportes CORE-005, ingestas NODO-CAU R2 #147, capas por
// nodo —, nunca incrementos). Sin corrida del worker → 0 snapshots
// honestos (R15).
export const LIC01_KPI_KEYS = [
  "reportes_por_estado",
  "fuentes_ingestadas_por_nodo",
  "capas_con_metadatos",
  "cobertura_reportes_distrito",
] as const;

// ─── LIC-DLUI LIC-R2 (LIC-02 #453, épica #448): accesibilidad del anuncio ───

// Set LIC-02 (LIC-R2 #453): KPI del relevamiento de los tramos del anuncio
// de repavimentación del microcentro (NCAP-R5 #155 — 18 tramos declared).
// Lo materializa el consumidor vig003-kpi (patrón VIG-003/MK-3a): upsert
// idempotente por nodo_key+kpi_key que RE-DERIVA desde el dominio vivo
// (features capa sidewalks id seed-f-tramo-*), nunca incrementos. Nace
// honesto «0 de 18» (DL-5): sin relevamiento el 0 es REAL sobre los 18
// tramos del anuncio — la brecha es visible, jamás oculta. El relevamiento
// lo ejecutan practicantes (LIC-03) bajo el protocolo versionado LIC-R2
// (DL-4); la plataforma NUNCA computa puntajes de accesibilidad ni de
// personas (R5/ADR-036).
export const LIC02_KPI_KEYS = [
  "tramos_con_relevamiento",
] as const;

// Set del observatorio completo (LIC-01 + LIC-02): lo filtra la ruta
// GET /api/nodos/{key}/observatorio y valida la ficha metodológica.
export const OBSERVATORIO_KPI_KEYS = [
  ...LIC01_KPI_KEYS,
  ...LIC02_KPI_KEYS,
] as const;

// Ficha metodológica por clave (DL-1 ratificado por la DH 2026-11-10,
// #457): cada KPI publicado declara fórmula, fuente y cobertura — el
// observatorio nace honesto, no vacío de promesas. Documentación de
// datos inspirada en el Perfil de Metadatos IDERA v2.0.
export const FichaMetodologicaSchema = z
  .object({
    clave: z.enum(OBSERVATORIO_KPI_KEYS),
    nombre: z.string(),
    formula: z.string(),
    fuente: z.string(),
    cobertura: z.string(),
  })
  .strict();

export const FICHAS_METODOLOGICAS = [
  {
    clave: "reportes_por_estado",
    nombre: "Reportes ciudadanos por estado",
    formula:
      "COUNT(*) de reportes del nodo agrupado por estado (received | evaluating | in_progress | resolved), excluyendo sintéticos y descartados",
    fuente: "tabla reportes (CORE-005 R1 #206) — recompute vig003-kpi (LIC-R1 #457)",
    cobertura: "solo reportes ciudadanos reales del nodo; el estado descartado nunca se publica (ADR-038)",
  },
  {
    clave: "fuentes_ingestadas_por_nodo",
    nombre: "Fuentes ingestadas por el nodo",
    formula:
      "COUNT(DISTINCT fuente_key) sobre ingestas del nodo, con desglose {ingestas_total, ingestas_publicadas}",
    fuente:
      "tabla ingestas (NODO-CAU R2 #138/#147): pipeline de procedencia recibido → validado_tecnicamente → validado_territorialmente → publicado (ADR-035)",
    cobertura: "conjuntos con procedencia declarada; no incluye fuentes del catálogo sin ninguna ingesta en el nodo",
  },
  {
    clave: "capas_con_metadatos",
    nombre: "Capas con metadatos de procedencia",
    formula:
      "capas del nodo con ≥1 ingesta que las referencia (ingestas.capa_servicio = capas.key), sobre capas_total",
    fuente:
      "cruce capas × ingestas (NODO-CAU R2 #147): la capa cuenta con metadatos cuando existe ingesta con fuente, fechas, licencia y CRS declarados",
    cobertura: "«X de Y capas del nodo con procedencia declarada» — sin ingesta la capa queda sin metadatos (R15)",
  },
  {
    clave: "cobertura_reportes_distrito",
    nombre: "Cobertura de reportes por distrito",
    formula:
      "distritos del nodo con ≥1 reporte anclado (distrito derivado del subnodo ancla por la cadena parent), sobre distritos_total",
    fuente: "reportes.subnodo_key × jerarquía subnodos (VIG-001 #171) — recompute vig003-kpi (LIC-R1 #457)",
    cobertura:
      "reportes sin subnodo ancla no contribuyen a ningún distrito; parajes y subparajes aportan a su distrito por la cadena parent",
  },
  {
    clave: "tramos_con_relevamiento",
    nombre: "Tramos del anuncio con relevamiento de accesibilidad",
    formula:
      "tramos capa sidewalks (id seed-f-tramo-*) del nodo con estado community_validated | verified, sobre tramos_total del anuncio; desglose por estado del ciclo declared | in_execution | completed y de revisión community_validated | verified",
    fuente:
      "features capa sidewalks (NCAP-R5 #157) — anuncio repavimentacion_microcentro_2026 (NCAP-R3 #155); relevamiento por practicantes bajo el protocolo LIC-R2 (docs/nodes/capital/LIC-R2-PROTOCOLO-ACCESIBILIDAD.md)",
    cobertura:
      "nodo capital: 18 tramos del anuncio (14 norte-sur + 4 perimetrales); sin relevamiento → 0 de 18 honesto (DL-5) — jamás puntajes de accesibilidad ni de personas (R5/ADR-036)",
  },
] as const;

// Familias nuevas del temario (DL-1): declaradas `sin_fuente_ingestada`
// — null ≠ 0 (R15). El observatorio las publica como deuda de
// federación VISIBLE (INDEC/capas oficiales por federar vía ingestas,
// ADR-035), jamás como cero: sin fuente ingestada no hay métrica
// computable y no se fabrica.
export const FamiliaSinFuenteSchema = z
  .object({
    familia: z.string(),
    estado: z.literal("sin_fuente_ingestada"),
    valor: z.null(),
    cautela: z.string(),
  })
  .strict();

export const FAMILIAS_SIN_FUENTE_INGESTADA = [
  {
    familia: "segregación socioespacial",
    estado: "sin_fuente_ingestada",
    valor: null,
    cautela: "requiere censo/INDEC u observatorio oficial federado vía ingestas (ADR-035) — sin fuente no hay métrica",
  },
  {
    familia: "género y cuidados",
    estado: "sin_fuente_ingestada",
    valor: null,
    cautela: "requiere fuente oficial federada (p. ej. Mapa Federal del Cuidado) — sin ingesta no se computa",
  },
  {
    familia: "salud urbana",
    estado: "sin_fuente_ingestada",
    valor: null,
    cautela: "solo agregados oficiales federados; salud individual es dato sensible prohibido (Ley 25.326, LIC-R6 #449)",
  },
  {
    familia: "vivienda y hábitat",
    estado: "sin_fuente_ingestada",
    valor: null,
    cautela: "requiere fuente oficial federada (INDEC/catastro) — sin ingesta no hay línea de base",
  },
] as const;

// Valor honesto: número O null (cobertura_geometrica es null en v1 — sin
// métrica de cobertura computada; null ≠ 0, R15).
export const KpiValorSchema = z.union([z.number(), z.null()]);

// Detalles del KPI: desglose por clave (distrito, estado, tipo, N1 o tipo
// de evento) — siempre agregados numéricos, nunca datos personales.
export const KpiDetallesSchema = z.record(z.string(), z.number());

// Snapshot materializado de un KPI de un nodo (tabla kpi_snapshots,
// VIG-003): upsert idempotente por (nodo_key, kpi_key) — el recompute no
// acumula. computed_at acredita el momento del cálculo.
export const KpiSnapshotSchema = z.object({
  nodo_key: SanJuanNodeSlugSchema,
  kpi_key: KpiKeySchema,
  valor: KpiValorSchema,
  detalles: KpiDetallesSchema,
  computed_at: z.string().datetime(),
});

// ─── NODO-VIG VIG-004 (NVIG-R6 #173, épica #167): patrimonio protegido ───

// Nivel de protección patrimonial: la norma que ampara el activo — o la
// ausencia honesta de declaratoria (R15: sin_declaratoria ≠ sin valor).
export const PatrimonioProteccionNivelSchema = z.enum([
  "nacional_decreto",
  "nacional_ley",
  "provincial_ley",
  "municipal",
  "sin_declaratoria",
]);

// Estado honesto de la geometría interna de custodia: sin_relevamiento =
// NO existe coordenada precisa en nuestras fuentes (p.ej. el yacimiento de
// Angualasto solo acredita la coordenada aproximada y pública del decreto);
// relevado_restringido = existe relevamiento y queda bajo custodia.
export const PatrimonioSensibleStatusSchema = z.enum(["sin_relevamiento", "relevado_restringido"]);

// Regla de acceso publicable (horario, autorización, temporada) con fuente.
export const PatrimonioReglaSchema = z.object({
  regla: z.string().trim().min(3, "La regla requiere texto").max(200),
  fuente: z.string().trim().min(3, "La regla exige fuente citable").max(120),
});

// Custodia (PATCH moderador|admin, tabla activos_patrimonio): lo que el
// custodio administra. `sensible` (geometría/datos internos) NUNCA sale por
// la lectura pública — solo su estado honesto sensible_status. La transición
// de visibilidad del activo (ADR-036) es parte de la custodia: restricted lo
// excluye del mapa público, pero la ficha patrimonial (declaratoria, reglas,
// punto de acceso) sigue publicándose — la declaratoria es registro público
// (decisión DH ratificada 2026-10-14, traza #173 comment 6159546907).
export const PatrimonioCustodiaSchema = z.object({
  proteccion_nivel: PatrimonioProteccionNivelSchema.optional(),
  proteccion_norma: z.string().trim().min(3).max(240).optional(),
  conservacion_estado: z.string().trim().min(3).max(400).optional(),
  acceso_lat: z.number().min(-90).max(90).optional(),
  acceso_lng: z.number().min(-180).max(180).optional(),
  reglas_acceso: z.array(PatrimonioReglaSchema).max(10).optional(),
  sensible: z.record(z.string(), z.unknown()).optional(),
  sensible_status: PatrimonioSensibleStatusSchema.optional(),
  sensible_nota: z.string().trim().max(400).optional(),
  visibilidad: ActivoVisibilidadSchema.optional(),
});

// Ficha patrimonial pública (GET /api/patrimonio/:activoId): declaratoria +
// conservación + punto público de acceso + reglas + estado honesto de
// custodia. `sensible` ni `sensible_nota` jamás aparecen en la lectura
// pública (ADR-036: la nota de custodia queda para gestores).
export const PatrimonioFichaSchema = z.object({
  activo_id: z.string(),
  titulo: z.string(),
  tipo: ActivoTipoSchema,
  proteccion_nivel: PatrimonioProteccionNivelSchema,
  proteccion_norma: z.string(),
  conservacion_estado: z.string().nullable(),
  acceso_lat: z.number().nullable(),
  acceso_lng: z.number().nullable(),
  reglas_acceso: z.array(PatrimonioReglaSchema),
  sensible_status: PatrimonioSensibleStatusSchema,
  visibilidad: ActivoVisibilidadSchema,
});

// ─── NODO-VIG VIG-005 (NVIG-R7 #174, épica #167): producción y turismo ───

// Catálogo de productos del territorio (1:N con activos — Opción A ratificada
// por la DH 2026-10-14, traza #174 comment 6160361362). Alta ciudadana
// autenticada con moderación: nace 'propuesto'; 'archivado' retira del
// catálogo vivo sin borrar la historia (mismo ciclo honesto que activos).
export const ProductoEstadoSchema = z.enum(["propuesto", "aprobado", "rechazado", "archivado"]);

// Alta de producto (VIG-005): el slug es único por activo; la temporada se
// declara en meses 1-12 (array vacío = sin_dato honesto, R15); la procedencia
// es opcional para el ciudadano y obligatoria en la ingesta curada (ADR-035).
// El anti-PII de la API se aplica sobre el nombre ANTES de persistir.
export const ProductoAltaSchema = z.object({
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "slug: minúsculas, números y guiones")
    .min(2)
    .max(60),
  nombre: z.string().trim().min(3, "El nombre debe tener al menos 3 caracteres").max(120),
  categoria: z
    .string()
    .trim()
    .regex(/^[a-z0-9_]+$/, "categoria: slug en minúsculas y guiones bajos")
    .min(2)
    .max(40)
    .optional(),
  temporada_meses: z
    .array(z.number().int().min(1, "mes: 1-12").max(12, "mes: 1-12"))
    .max(12)
    .optional(),
  procedencia: ActivoProcedenciaSchema.optional(),
});

// Cambio de estado por moderación (patrón activos R5b): aprobado | rechazado |
// archivado; el motivo pasa el anti-PII de la API (sin eco del valor).
export const ProductoEstadoCambioSchema = z.object({
  estado: z.enum(["aprobado", "rechazado", "archivado"]),
  motivo: z.string().trim().max(500).optional(),
});

// ─── MARKET-CAP MK-3b (#426, sub-épica #152): ofertas del Mercado ───

// Precio en centavos AR ENTEROS — jamás float (D2 del diseño MK-3 ratificada
// por la DH 2026-10-30): el centavo es la unidad mínima de la moneda real.
// null = sin precio declarado (sin_dato honesto, R15) — distinto de 0.
export const ProductoPrecioCentavosSchema = z
  .number()
  .int("precio_centavos: entero — jamás float (MK-3 D2)")
  .min(1, "precio_centavos: mínimo 1 centavo — sin precio publicado se declara null, no 0")
  .max(100000000, "precio_centavos: máximo ARS 1.000.000,00");

// Fecha de vigencia YYYY-MM-DD (caducidad DECLARADA, no silenciosa — RFC-027):
// la oferta con ventana vencida sigue publicada con estado DERIVADO 'vencida'
// en la lectura — nunca desaparece en silencio.
export const ProductoFechaSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "vigencia: fecha YYYY-MM-DD");

// Edición de oferta (MK-3b, patrón PATCH habilitación MK-2 #254): titular
// verificado del comercio padre o moderador|admin — la API es la compuerta
// (403 real sin eco, Ley 25.326). Justificación pública >=10 (ADR-038).
// Al menos un campo editable: el PATCH vacío es un error de datos, no un
// no-op silencioso (R15). Todos los campos son opcionales (edición parcial);
// null limpia el campo declarado (sin precio / sin ventana de vigencia).
export const ProductoEdicionSchema = z
  .object({
    nombre: z.string().trim().min(3, "El nombre debe tener al menos 3 caracteres").max(120).optional(),
    categoria: z
      .string()
      .trim()
      .regex(/^[a-z0-9_]+$/, "categoria: slug en minúsculas y guiones bajos")
      .min(2)
      .max(40)
      .optional(),
    temporada_meses: z
      .array(z.number().int().min(1, "mes: 1-12").max(12, "mes: 1-12"))
      .max(12)
      .optional(),
    precio_centavos: ProductoPrecioCentavosSchema.nullable().optional(),
    vigencia_desde: ProductoFechaSchema.nullable().optional(),
    vigencia_hasta: ProductoFechaSchema.nullable().optional(),
    justificacion: z
      .string()
      .trim()
      .min(10, "ADR-038: el cambio exige justificación pública (mínimo 10 caracteres)")
      .max(500),
  })
  .strict()
  .superRefine((v, ctx) => {
    const campos = ["nombre", "categoria", "temporada_meses", "precio_centavos", "vigencia_desde", "vigencia_hasta"] as const;
    if (!campos.some((c) => v[c] !== undefined)) {
      ctx.addIssue({ code: "custom", message: "sin campos para editar — el PATCH vacío es un error de datos (R15)" });
      return;
    }
    if (
      v.vigencia_desde !== null && v.vigencia_desde !== undefined &&
      v.vigencia_hasta !== null && v.vigencia_hasta !== undefined &&
      v.vigencia_hasta < v.vigencia_desde
    ) {
      ctx.addIssue({ code: "custom", message: "vigencia_hasta no puede ser anterior a vigencia_desde" });
    }
  });

// Filtros del catálogo público de ofertas (GET /api/productos, MK-3b — decisión
// DH 2026-11-07: catálogo dentro de MK-3b mismo PR): todos opcionales. q es
// LIKE simple por nombre (decisión DH 2026-11-07) — la búsqueda semántica
// vive en el RAG territorial (VIG-006), no en el catálogo. nodo/subnodo/rubro
// se validan contra el vocabulario real en la ruta (reconciliación 404/400
// patrón MK-0 §2.5: el enum acredita la forma; la tabla acredita la existencia).
export const ProductoFiltroSchema = z.object({
  nodo: SanJuanNodeSlugSchema.optional(),
  subnodo: z
    .string()
    .trim()
    .regex(/^[a-z0-9_]+$/, "subnodo: slug en minúsculas y guiones bajos")
    .max(60)
    .optional(),
  rubro: z
    .string()
    .trim()
    .regex(/^[a-z][a-z0-9_-]*(\.[a-z0-9_-]+)?$/, "rubro: código del canon (food_drink) o legado (cat-*)")
    .max(60)
    .optional(),
  precio_max: z.coerce.number().int().min(1).max(100000000).optional(),
  vigente: z.enum(["true", "false"]).optional(),
  q: z.string().trim().min(2, "q: al menos 2 caracteres").max(60).optional(),
});

export type ProductoEdicion = z.infer<typeof ProductoEdicionSchema>;
export type ProductoFiltro = z.infer<typeof ProductoFiltroSchema>;

// Estado honesto de la capacidad (R15): unknown = sin aforo, plazas ni
// protocolo verificado en nuestras fuentes (Cuesta del Viento, tanda 3).
export const OperativaCapacityStatusSchema = z.enum(["aforo_verificado", "guia_oficial", "unknown"]);

// Habilitación de prestador (tanda 3 Perplexity): 4 atributos separados —
// "distinguido" ≠ "habilitado". Todos unknown en las cooperativas sembradas
// (padrón Ley 2400-T no encontrado); nunca se inventa una habilitación (R15).
export const HabilitacionEstadoSchema = z.enum(["verificado", "unknown", "no_encontrado"]);

export const HabilitacionSchema = z.object({
  municipal: HabilitacionEstadoSchema,
  provincial_2400_t: HabilitacionEstadoSchema,
  sello: HabilitacionEstadoSchema,
  verified_at: z
    .string()
    .trim()
    .regex(/^\d{4}(-\d{2}-\d{2})?$/, "verified_at: YYYY-MM-DD o YYYY")
    .nullable(),
});
// ─── NODO-VIG VIG-006 (NVIG-R8 #188, épica #167): RAG territorial ético ───

// Origen de los fragmentos del índice rag_index (recompute idempotente por
// (nodo_key, source_type, source_id) — patrón kpi_snapshots): SOLO contenido
// autorizado. Nunca ingiere: restricted (ADR-036), el campo `sensible` de
// custodia (VIG-004), consentimiento, PII ni huérfanas (Ley 25.326, R15).
export const RagSourceTypeSchema = z.enum(["subnodo", "activo", "kpi", "comercio"]); // MK-3a (#426): F-9 — la ficha pública del mercado es prosa autorizada

// Dominio interpretativo de la respuesta (plantillas autorizadas v1 sin LLM —
// decisión DH ratificada 2026-10-14: nada generado, sin plantilla → null
// honesto). territorial = fragmentos de estructura territorial o KPIs.
export const AskDominioSchema = z.enum([
  "patrimonial",
  "productivo_rural",
  "turistico",
  "territorial",
]);

// Fuente citable de un fragmento (ADR-035): la fecha es opcional cuando la
// fuente no la publica (p. ej. catálogos de referencia sin corte temporal).
export const AskFuenteSchema = z.object({
  fuente: z.string().trim().min(1, "fuente requerida").max(160),
  fecha: z.string().trim().max(20).optional(),
});

// Consulta territorial ética (POST /api/nodos/:key/ask, público anónimo —
// decisión DH ratificada 2026-10-14): longitud acotada como anti-abuso;
// filtros opcionales por subnodo (distrito/paraje) y capital N1.
export const AskPreguntaSchema = z.object({
  pregunta: z.string().trim().min(3, "La pregunta requiere al menos 3 caracteres").max(300),
  subnodo: z
    .string()
    .trim()
    .regex(/^[a-z0-9_]+$/, "subnodo: slug en minúsculas y guiones bajos")
    .max(60)
    .optional(),
  n1: ActivoCapitalN1Schema.optional(),
});

// Fragmento recuperado del índice: prosa autorizada + sus fuentes.
export const AskFragmentoSchema = z.object({
  source_type: RagSourceTypeSchema,
  source_id: z.string(),
  subnodo_key: z.string().nullable(),
  texto: z.string(),
  fuentes: z.array(AskFuenteSchema),
});

// Respuesta ética (Dato–Interpretación–Sugerencia, reglas §17 del VIG-000):
// el dato son hechos recuperados con fuente; la interpretación y la
// sugerencia son PLANTILLAS AUTORIZADAS del dominio dominante (nada
// generado) — o null honesto si ninguna aplica. confidence se DERIVA de la
// cobertura de fuentes (fragmentos con procedencia / total), nunca se
// declara a mano. Toda respuesta nace human_review: "pending" (revisión
// humana habilitada — Bloque 11 del VIG-000).
export const RespuestaAskSchema = z.object({
  nodo_key: SanJuanNodeSlugSchema,
  pregunta: z.string(),
  dato: z.array(AskFragmentoSchema),
  dominio: AskDominioSchema.nullable(),
  interpretacion: z.string().nullable(),
  sugerencia: z.string().nullable(),
  fuentes: z.array(AskFuenteSchema),
  confidence: z.number().min(0).max(1),
  recovered: z.number().int().min(0),
  human_review: z.literal("pending"),
});

// ─── NODO-VIG VIG-007 (NVIG-R9 #193, épica #167): demo final del showcase ───

// Recorrido federado de la demo final (fuente §Guion: Caucete → Capital →
// Valle de Iglesia). Lectura pública del estado REAL de cada nodo: los
// counts se derivan de las tablas de dominio con las exclusiones de siempre
// (ADR-036) y un nodo sin snapshots aún → kpis: 0 honesto, nunca fabricado
// (R15). El guion ejecutable (13 pasos, 4 escenarios, 10 criterios) vive en
// docs/nodes/valle-de-iglesia/VIG-007-DEMO-FINAL.md.
export const ShowcaseKpiDetalleSchema = z.object({
  kpi_key: KpiKeySchema,
  valor: KpiValorSchema,
  detalles: KpiDetallesSchema,
});

export const ShowcaseNodoResumenSchema = z.object({
  key: SanJuanNodeSlugSchema,
  nombre: z.string(),
  foco: z.string(),
  poblacion: z.number().int(),
  activo: z.boolean(),
  subnodos: z.number().int().min(0),
  kpis: z.number().int().min(0),
  activos_aprobados: z.number().int().min(0),
  fichas_patrimoniales: z.number().int().min(0),
  operativas: z.number().int().min(0),
  productos_aprobados: z.number().int().min(0),
  rag_fragmentos: z.number().int().min(0),
  kpis_detalle: z.array(ShowcaseKpiDetalleSchema),
});

export const ShowcaseGuionSchema = z.object({
  doc: z.string(),
  pasos: z.number().int().min(1),
});

export const ShowcaseResponseSchema = z.object({
  recorrido: z.array(SanJuanNodeSlugSchema),
  nodos: z.array(ShowcaseNodoResumenSchema),
  guion: ShowcaseGuionSchema,
});

// ─── NODO-CAU R2 (#138/#147): catálogo de fuentes espaciales + procedencia ───

// Tipo de acceso de la fuente espacial (catálogo #147): cómo se consume.
export const FuenteEspacialTipoSchema = z.enum(["wms", "wfs", "descarga", "documento", "api"]);

// Estado honesto de disponibilidad, verificado en vivo (trazas #147, 2026-10-11):
// disponible = verificado y consumible anónimo; requiere_credenciales = WFS/auth;
// requiere_solicitud = la vía correcta es una solicitud formal; no_disponible =
// servicio muerto o dataset retirado; deprecado = reemplazado por otra fuente.
export const FuenteEspacialEstadoSchema = z.enum([
  "disponible",
  "requiere_credenciales",
  "requiere_solicitud",
  "no_disponible",
  "deprecado",
]);

// Ficha del catálogo de fuentes espaciales (#147): cada fuente pública con su
// cautela central — el catálogo es registro de PROCEDENCIA, no de datos (R15:
// nunca un feature real sin fuente; la cautela declara los límites de uso).
export const FuenteEspacialSchema = z.object({
  key: z.string().trim().regex(/^[a-z0-9_]+$/, "key: slug en minúsculas y guiones bajos").max(60),
  organismo: z.string().trim().min(3, "organismo requerido").max(120),
  nombre: z.string().trim().min(3, "nombre requerido").max(160),
  url: z.string().trim().url("URL inválida").max(500).optional(),
  tipo: FuenteEspacialTipoSchema,
  licencia: z.string().trim().max(120).optional(),
  estado: FuenteEspacialEstadoSchema,
  cautela: z.string().trim().min(3, "la fuente exige cautela honesta").max(500),
});

// Pipeline de procedencia por conjunto (#147): recibido → validado_tecnicamente
// → validado_territorialmente → publicado. `publicado` solo por admin
// (decisión DH 2026-10-15: ingesta curada de datos reales — R15 estricta).
export const IngestaEstadoSchema = z.enum([
  "recibido",
  "validado_tecnicamente",
  "validado_territorialmente",
  "publicado",
]);

// Alta de una ingesta (contrato de procedencia por conjunto, #147): TODO dato
// externo entra por aquí declarando fuente del catálogo, capa/servicio, fechas
// de acceso y corte, licencia, CRS origen/normalizado, escala/precisión, id
// externo y transformaciones — el contrato rechaza la ingesta incompleta
// (NC-EV-09: sin fuente/fecha de corte/precisión no hay ingesta).
export const IngestaAltaSchema = z.object({
  source_id: z.string().trim().min(3, "source_id requerido").max(80),
  fuente_key: z
    .string()
    .trim()
    .regex(/^[a-z0-9_]+$/, "fuente_key: slug del catálogo de fuentes")
    .max(60),
  nodo_key: SanJuanNodeSlugSchema,
  capa_servicio: z.string().trim().min(3, "capa/servicio requerido (WMS/WFS/descarga)").max(120),
  fecha_acceso: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "fecha_acceso: YYYY-MM-DD"),
  fecha_corte: z.string().trim().regex(/^\d{4}(-\d{2}-\d{2})?$/, "fecha_corte: YYYY-MM-DD o YYYY"),
  licencia: z.string().trim().max(80).optional(),
  crs_origen: z.string().trim().min(4, "crs_origen requerido (p. ej. EPSG:4326)").max(40),
  crs_normalizado: z.string().trim().min(4, "crs_normalizado requerido (SRID=4326)").max(40),
  escala_precision: z.string().trim().min(3, "escala/precisión requerida (NC-EV-09)").max(120),
  external_id: z.string().trim().max(80).optional(),
  transformaciones: z.string().trim().max(1000).optional(),
});

// Avance del pipeline por admin (decisión DH 2026-10-15): solo hacia adelante en
// la cadena; el motivo pasa el anti-PII de la API (sin eco del valor).
export const IngestaEstadoCambioSchema = z.object({
  estado: IngestaEstadoSchema,
  motivo: z.string().trim().max(500).optional(),
});

// ADR-035 regla 1 (EV-NC-03): todo feature con is_synthetic = false declara fuente
// pública nombrada y verificable en fuente_label con el formato de atribución
// `Organismo · referencia` — `Ilustrativa · …` queda reservado a los datos
// sintéticos del demo. Este refine es la compuerta ejecutable del contrato.
export const FuenteLabelRealSchema = z
  .string()
  .trim()
  .min(3, "fuente_label requerido")
  .max(160)
  .refine((label) => !label.startsWith("Ilustrativa"), {
    message: "un feature real (is_synthetic = false) no puede declarar fuente ilustrativa (ADR-035)",
  })
  .refine((label) => label.includes(" · "), {
    message: "la atribución exige el formato `Organismo · referencia` (ADR-035)",
  });

// ─── CORE-005 R1 (#206): reportes ciudadanos — transparencia del ciclo de vida ───

// Ciclo de vida público del reporte ciudadano (patrón FixMyStreet, #87/#206):
// received → evaluating → in_progress → resolved; descartado es lateral
// terminal (nunca publicable). ADR-038 (ratificado en #206): CADA transición
// lleva justificación pública obligatoria — el estado es contrato de
// transparencia, no un label interno.
export const ReporteEstadoSchema = z.enum([
  "received",
  "evaluating",
  "in_progress",
  "resolved",
  "descartado",
]);

export type ReporteEstado = z.infer<typeof ReporteEstadoSchema>;

// Filtro de la lectura pública: descartado nunca es filtrable ni publicable
// (mismo criterio que OportunidadEstadoPublicoFiltroSchema).
export const ReporteEstadoPublicoFiltroSchema = z.enum([
  "received",
  "evaluating",
  "in_progress",
  "resolved",
]);

// Matriz de transiciones (ADR-038): compartida por API y web para que el
// ciclo acordado no derive entre extremos. resolved y descartado son
// terminales en v1 (sin reapertura); la validez del salto la decide la ruta
// contra esta matriz — la moderación no inventa caminos.
export const REPORTE_TRANSICIONES: Record<ReporteEstado, ReporteEstado[]> = {
  received: ["evaluating", "descartado"],
  evaluating: ["in_progress", "descartado"],
  in_progress: ["resolved", "descartado"],
  resolved: [],
  descartado: [],
};

// Alta ciudadana de un reporte (R2, #206): la categoría es un slug del
// vocabulario del nodo (tabla categorias — se valida contra el catálogo en
// la ruta, no aquí); la descripción es OBLIGATORIA porque el reporte ES su
// descripción, y pasa el anti-PII de la API ANTES de persistir (ADR-020
// cond. 1, Ley 25.326) — el contrato valida forma; la política de PII es de
// la API. lat/lng EXIGIDOS en el alta ciudadana: un reporte sin punto
// propio no es cartografiable (a diferencia de la ingesta curada de
// activos VIG-002, aquí no existe ficha sin punto).
export const ReporteAltaSchema = z.object({
  nodo_key: SanJuanNodeSlugSchema,
  categoria: z
    .string()
    .trim()
    .regex(/^[a-z0-9_]+$/, "categoria: slug del vocabulario del nodo, en minúsculas y guiones bajos")
    .min(2)
    .max(60),
  descripcion: z.string().trim().min(10, "La descripción debe tener al menos 10 caracteres").max(2000),
  lat: z.number().min(-90, "lat fuera de rango").max(90, "lat fuera de rango"),
  lng: z.number().min(-180, "lng fuera de rango").max(180, "lng fuera de rango"),
});

// Cambio de estado por moderación (R3, #206 — ADR-038): la justificación es
// OBLIGATORIA en cada transición (≥10 caracteres) — la ciudadanía ve POR QUÉ
// cambió el estado; la justificación pasa el anti-PII de la API ANTES de
// sellarse (sin eco del valor en el error).
export const ReporteEstadoCambioSchema = z.object({
  estado: ReporteEstadoSchema,
  justificacion: z
    .string()
    .trim()
    .min(10, "ADR-038: la transición exige justificación pública (mínimo 10 caracteres)")
    .max(500),
});

// Historial público del reporte (R4, #206): derivado de los sellos
// reporte.estado_cambiado de events_raw (única fuente de verdad, ADR-032) —
// nunca de una tabla mutable (ADR-038: el historial es inmutable porque
// deriva del registro append-only). moderador_hash = pseudónimo sha256
// truncado, sin PII (Ley 25.326/ADR-027).
export const ReporteHistorialEntrySchema = z.object({
  estado_anterior: ReporteEstadoSchema,
  estado_nuevo: ReporteEstadoSchema,
  justificacion: z.string(),
  moderador_hash: z.string(),
  occurred_at: z.string().datetime(),
});

export const ReporteHistorialSchema = z.object({
  reporte_id: z.string(),
  transiciones: z.array(ReporteHistorialEntrySchema),
});

// ─── NODO-VIG VIG-008 (#240, épica #239): cooperativas — consentimiento institucional ───

// Alcance granular del consentimiento institucional (persona jurídica):
// cada uso de la identidad de la organización es opt-in explícito — el
// catálogo y los contactos solo se publican tras asamblea ratificada.
export const ConsentimientoOrganizacionAlcanceSchema = z.object({
  ficha: z.boolean(),
  productos: z.boolean(),
  fotos: z.boolean(),
  contacto: z.boolean(),
});

// Consentimiento de organización (VIG-008 R3): lo firma un ROL institucional
// del consejo de administración — jamás un nombre civil (ADR-027, Ley
// 25.326). declaracion: z.literal(true) hace imposible el consentimiento
// pre-marcado: sin declaración explícita no hay alta ni enriquecimiento
// (regla VIG-008 ratificada: NINGÚN dato enriquecido se siembra sin
// consentimiento formal de la persona jurídica).
export const ConsentimientoOrganizacionSchema = z.object({
  organizacion_key: z
    .string()
    .trim()
    .regex(/^[a-z0-9_]+$/, "organizacion_key: slug en minúsculas y guiones bajos")
    .max(60),
  organizacion_tipo: z.enum([
    "cooperativa",
    "asociacion_civil",
    "federacion",
    "mutual",
    "otra",
  ]),
  firmante_rol: z.enum([
    "presidente_consejo",
    "vicepresidente_consejo",
    "secretario",
    "tesorero",
    "sindico",
    "representante_apoderado",
  ]),
  alcance: ConsentimientoOrganizacionAlcanceSchema,
  vigencia_desde: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "vigencia_desde: YYYY-MM-DD"),
  vigencia_hasta: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "vigencia_hasta: YYYY-MM-DD")
    .nullable(),
  declaracion: z.literal(true),
});

// Revocación del consentimiento institucional (VIG-008 R3): revocable en
// cualquier momento por la propia organización, con el mismo rol firmante;
// el motivo pasa el anti-PII de la API ANTES de sellarse (sin eco del valor).
export const ConsentimientoOrganizacionRevocacionSchema = z.object({
  organizacion_key: z
    .string()
    .trim()
    .regex(/^[a-z0-9_]+$/, "organizacion_key: slug en minúsculas y guiones bajos")
    .max(60),
  firmante_rol: z.enum([
    "presidente_consejo",
    "vicepresidente_consejo",
    "secretario",
    "tesorero",
    "sindico",
    "representante_apoderado",
  ]),
  motivo: z.string().trim().min(10, "La revocación exige motivo (mínimo 10 caracteres)").max(500),
});

// Operativa institucional (VIG-008 R2, columna `institucional` de
// activos_operativa): datos registrales públicos de la persona jurídica.
// TODOS los campos de dato son nullable — vacío honesto (R15): sin dato no
// se inventa; y `consentimiento_hash` es OBLIGATORIO: la ficha
// institucional solo se llena tras consentimiento formal registrado —
// sin él todo queda null. Cero PII: ni nombres de socios ni contactos
// directos (Ley 25.326/ADR-027).
export const OperativaInstitucionalSchema = z.object({
  matricula_nacional: z.string().trim().max(20).nullable(),
  matricula_provincial: z.string().trim().max(20).nullable(),
  cuit: z
    .string()
    .trim()
    .regex(/^\d{2}-\d{8}-\d$/, "cuit: formato XX-XXXXXXXX-X")
    .nullable(),
  fecha_constitucion: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "fecha_constitucion: YYYY-MM-DD")
    .nullable(),
  socios_activos_count: z.number().int().nonnegative().nullable(),
  federacion_key: z.string().trim().max(60).nullable(),
  domicilio_publicado: z.string().trim().max(200).nullable(),
  consentimiento_hash: z.string().length(32),
});

export type ConsentimientoOrganizacionAlcance = z.infer<typeof ConsentimientoOrganizacionAlcanceSchema>;
export type ConsentimientoOrganizacion = z.infer<typeof ConsentimientoOrganizacionSchema>;
export type ConsentimientoOrganizacionRevocacion = z.infer<typeof ConsentimientoOrganizacionRevocacionSchema>;
export type OperativaInstitucional = z.infer<typeof OperativaInstitucionalSchema>;

// ─── NODO-VIG VIG-009 (#241, épica #239): Achango — observaciones y custodia ───

// Checklist estructurado de la observación de estado patrimonial (VIG-009 R1):
// cinco dimensiones del conjunto. true = el observador reporta el síntoma;
// false = no lo observó — NO afirma "está sano": la observación es testimonio,
// jamás diagnóstico (R15, diseño #241).
export const PatrimonioObservacionChecklistSchema = z.object({
  grietas: z.boolean(),
  cornisas: z.boolean(),
  techos: z.boolean(),
  maderos: z.boolean(),
  muros: z.boolean(),
});

// Evidencia del testimonio (mismo canon epistémico que oportunidades, ADR-035):
// cada observación declara su fuente citable.
export const PatrimonioObservacionEvidenciaSchema = z.object({
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

// Alta de observación de estado patrimonial (VIG-009 R1): ciudadano autenticado;
// la fecha del testimonio es la del relevamiento, no la del alta en plataforma.
export const PatrimonioObservacionAltaSchema = z.object({
  fecha_observacion: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "fecha_observacion: YYYY-MM-DD"),
  checklist: PatrimonioObservacionChecklistSchema,
  nota: z.string().trim().max(2000).optional(),
  evidencia: PatrimonioObservacionEvidenciaSchema,
});

// Alcance granular del consentimiento de custodia (VIG-009 R3, patrón ficha de
// tejedora del corpus VIG): cada campo es opt-in explícito — publicar el ROL sí;
// nombre y contacto solo con consentimiento (Ley 25.326, ADR-027).
export const CustodiaConsentimientoAlcanceSchema = z.object({
  rol: z.boolean(),
  nombre: z.boolean(),
  contacto: z.boolean(),
});

// Consentimiento de custodia (VIG-009 R3): lo firma un ROL (guardián, cuidador
// o familiar autorizado) — jamás un nombre civil (ADR-027). declaracion:
// z.literal(true) hace imposible el consentimiento implícito; revocable en
// cualquier momento por el mismo rol firmante.
export const CustodiaConsentimientoSchema = z.object({
  firmante_rol: z.enum(["guardian", "cuidador", "familiar_autorizado"]),
  alcance: CustodiaConsentimientoAlcanceSchema,
  vigencia_desde: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "vigencia_desde: YYYY-MM-DD"),
  vigencia_hasta: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "vigencia_hasta: YYYY-MM-DD").nullable(),
  declaracion: z.literal(true),
});

// Revocación del consentimiento de custodia (VIG-009 R3): el motivo pasa el
// anti-PII de la API ANTES de sellarse (sin eco del valor).
export const CustodiaConsentimientoRevocacionSchema = z.object({
  firmante_rol: z.enum(["guardian", "cuidador", "familiar_autorizado"]),
  motivo: z.string().trim().max(500).optional(),
});

export type PatrimonioObservacionChecklist = z.infer<typeof PatrimonioObservacionChecklistSchema>;
export type PatrimonioObservacionEvidencia = z.infer<typeof PatrimonioObservacionEvidenciaSchema>;
export type PatrimonioObservacionAlta = z.infer<typeof PatrimonioObservacionAltaSchema>;
export type CustodiaConsentimientoAlcance = z.infer<typeof CustodiaConsentimientoAlcanceSchema>;
export type CustodiaConsentimiento = z.infer<typeof CustodiaConsentimientoSchema>;
export type CustodiaConsentimientoRevocacion = z.infer<typeof CustodiaConsentimientoRevocacionSchema>;

// ─── CORE-005 R5 (#206, ADR-039): duplicados sugeridos por proximidad ───

// Estados "abiertos" del reporte: los no terminales de la matriz R1 —
// resolved y descartado dejan de ser sugeribles como duplicados (la
// cercanía con un reporte cerrado ya no agrega señal de duplicado).
export const ReporteEstadoAbiertoSchema = z.enum([
  "received",
  "evaluating",
  "in_progress",
]);

// Sugerencia de duplicado en la respuesta del alta (R5, ADR-039): un
// reporte ABIERTO y REAL (is_synthetic = false — el demo nunca es
// duplicado de un reporte ciudadano) del mismo nodo dentro del radio de
// proximidad. Es una SUGERENCIA de lectura: el sistema NUNCA fusiona
// reportes automáticamente — la decisión de marcar duplicado es humana,
// con sello (ADR-039). El campo no persiste, no se sella y no muta nada.
export const ReporteDuplicadoSugeridoSchema = z.object({
  id: z.string(),
  categoria: z.string(),
  estado: ReporteEstadoAbiertoSchema,
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  distancia_m: z.number().nullable(),
  created_at: z.string().datetime(),
});

// ─── NODO-VIG-3 VIG-011 (#378, épica #377): AMC — mediación ciudadana ───
//
// La AMC (Agencia de Mediación Ciudadana) es la boca única de reporte
// territorial del nodo: un mismo contrato cubre los 3 canales que operan
// en paralelo desde el día 1 (web autenticada, planilla papel cargada por
// un mediador con aval comunitario, número único de WhatsApp de la
// asamblea SIN bot — R15: ingesta humana, sin automatización de conversa).
// 9 dominios ratificados por la DH con keyword oficial por dominio; la
// categoría N2 sigue perteneciendo al vocabulario real del nodo (VIG-010)
// — el contrato NO duplica taxonomía.

export const AmcDominioSchema = z.enum([
  "espacio_publico",
  "infraestructura_vial",
  "movilidad",
  "agua_saneamiento",
  "clima_ambiente",
  "conectividad",
  "servicios",
  "produccion_rural",
  "patrimonio",
]);
export type AmcDominio = z.infer<typeof AmcDominioSchema>;

// Keyword oficial del canal WhatsApp por dominio (p.ej. «BACHE RN150 km
// 12 frente a la escuela…»): la keyword abre el formulario de carga del
// mediador — no hay bot conversando con el vecino (R15).
export const AMC_KEYWORDS_POR_DOMINIO: Record<AmcDominio, string> = {
  espacio_publico: "PLAZA",
  infraestructura_vial: "BACHE",
  movilidad: "PARADA",
  agua_saneamiento: "AGUA",
  clima_ambiente: "CLIMA",
  conectividad: "SEÑALCEL",
  servicios: "SERVICIO",
  produccion_rural: "CAMINO",
  patrimonio: "PATRIMONIO",
};

// Categorías N2 por dominio — espejo EXACTO del vocabulario VIG-010 (#381)
// del nodo Iglesia (40 nuevas + damaged_road/damaged_heritage reutilizadas
// + patrimonio_deterioro/patrimonio_perdida de VIG-009). La coherencia
// dominio→categoría la valida la API contra esta tabla (400 si es ajena).
export const AMC_CATEGORIAS_POR_DOMINIO: Record<AmcDominio, string[]> = {
  espacio_publico: [
    "street_lighting", "sidewalk_condition", "plaza_furniture", "waste_dumping",
    "tree_damage", "stray_animals", "noise_dust_nuisance",
  ],
  infraestructura_vial: [
    "road_surface", "urban_surface", "road_shoulder", "road_signage",
    "road_barrier", "bridge_culvert", "work_zone_risk",
  ],
  movilidad: [
    "bus_stop_issue", "service_frequency", "school_health_transport",
    "pedestrian_crossing", "active_mobility_risk",
  ],
  agua_saneamiento: [
    "drinking_water_issue", "sewer_drainage", "irrigation_conflict",
  ],
  clima_ambiente: [
    "drought_scarcity", "snow_ice", "zonda_dust", "frost_hail",
    "flash_flood_risk", "fog_visibility", "urban_rural_pests",
  ],
  conectividad: [
    "cell_dead_zone", "internet_gap", "sos_coverage_gap",
  ],
  servicios: [
    "power_grid_issue", "health_access_issue", "school_facility_issue",
    "security_post_issue", "public_building_issue",
  ],
  produccion_rural: [
    "productive_access", "agro_practice_issue", "wildlife_corridor", "damaged_road",
  ],
  patrimonio: [
    "damaged_heritage", "patrimonio_deterioro", "patrimonio_perdida",
  ],
};

export const AmcCanalIngresoSchema = z.enum(["web", "papel", "whatsapp", "presencial"]);
export type AmcCanalIngreso = z.infer<typeof AmcCanalIngresoSchema>;

// Precisión declarada del punto: el vecino dice qué sabe (R15 — nunca se
// simula certeza GPS que no tiene). El cluster converge con lo declarado.
export const AmcPrecisionSchema = z.enum(["gps", "referencial", "aproximado"]);

// Consentimiento granular (ADR-027, Ley 25.326): guardar el alias comunitario
// es opt-in explícito; la devolución al vecino va por el canal de origen
// (web: su cuenta; papel/whatsapp: el mediador con aval). NUNCA se guarda
// el nombre de la planilla — solo el alias elegido.
export const ReporteAmcConsentimientoSchema = z.object({
  acepta_devolucion_contacto: z.boolean(),
  guarda_alias: z.boolean(),
});

// Alta AMC: ReporteAltaSchema (CORE-005) + el contexto de mediación. Sin
// "dominio" en el cuerpo, la API aplica el contrato legacy intacto —
// compatibilidad total del alta CORE-005 R2 (#206).
export const ReporteAmcAltaSchema = ReporteAltaSchema.extend({
  // Ancla territorial obligatoria: el reporte del AMC vive en un subnodo
  // real del Valle de Iglesia (jerarquía VIG-001), no en el nodo abstracto.
  subnodo_key: z
    .string()
    .trim()
    .regex(/^[a-z0-9_]+$/, "subnodo_key: slug del subnodo (VIG-001), minúsculas y guiones bajos")
    .min(4)
    .max(60),
  dominio: AmcDominioSchema,
  tipo: z
    .string()
    .trim()
    .regex(/^[a-z0-9_]+$/, "tipo N3: slug de la taxonomía VIG-000, minúsculas y guiones bajos")
    .max(40)
    .optional(),
  canal_ingreso: AmcCanalIngresoSchema,
  precision: AmcPrecisionSchema,
  riesgo_inmediato: z.boolean(),
  // Canal mediado (papel|whatsapp): quién con aval registró la carga.
  mediador_ref: z
    .string()
    .trim()
    .regex(/^[a-z0-9_]+$/, "mediador_ref: key del registro de mediadores (VIG-011)")
    .max(60)
    .optional(),
  // Alias comunitario del vecino (planilla/WhatsApp): NUNCA el nombre —
  // exige consentimiento granular guarda_alias (ADR-027, Ley 25.326).
  reportado_por: z
    .string()
    .trim()
    .min(2, "El alias comunitario requiere al menos 2 caracteres")
    .max(80)
    .optional(),
  consentimiento: ReporteAmcConsentimientoSchema.optional(),
  // Fecha del testimonio (carga diferida de planilla: puede ser anterior).
  observado_en: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "observado_en: fecha YYYY-MM-DD del testimonio")
    .optional(),
})
  .refine((a) => a.reportado_por === undefined || a.consentimiento?.guarda_alias === true, {
    message: "guardar el alias comunitario exige consentimiento granular guarda_alias=true (ADR-027, Ley 25.326)",
    path: ["consentimiento"],
  })
  .refine((a) => !(a.canal_ingreso === "papel" || a.canal_ingreso === "whatsapp") || a.mediador_ref !== undefined, {
    message: "el canal papel|whatsapp exige mediador_ref del registro con aval (ingesta humana sin bot, R15)",
    path: ["mediador_ref"],
  })
  .refine((a) => !(a.canal_ingreso === "papel" || a.canal_ingreso === "whatsapp") || a.reportado_por !== undefined, {
    message: "el canal papel|whatsapp exige el alias comunitario del vecino (reportado_por, sin PII)",
    path: ["reportado_por"],
  });

// Corroboración ciudadana (VIG-011): la comunidad corrobora, NUNCA verifica
// (R15 — la promoción a "verified" es solo técnica: organismo, estudio,
// inspección). Un reportante distinto = un peso.
export const ReporteCorroboracionSchema = z.object({
  precision: AmcPrecisionSchema.optional(),
  nota: z.string().trim().max(500).optional(),
});

// Registro de mediadores (VIG-011): aval comunitario, no gubernamental.
export const MediadorAvalSchema = z.enum(["asamblea", "comision_vecinal"]);

export const MediadorAltaSchema = z.object({
  nodo_key: SanJuanNodeSlugSchema,
  key: z
    .string()
    .trim()
    .regex(/^[a-z0-9_]+$/, "key: alias comunitario del mediador, minúsculas y guiones bajos")
    .min(4)
    .max(60),
  label: z.string().trim().min(3, "El rol comunitario visible requiere al menos 3 caracteres").max(120),
  aval: MediadorAvalSchema,
});

// ─── NODO-VIG-3 VIG-012 (#379, épica #377): pedidos formales ───
//
// La traducción al repo del libro de reclamos del plan vecinal: pedidos
// formales a Vialidad Provincial (DPV) y su seguimiento público. La tabla
// `pedidos` es la ÚNICA tabla nueva del módulo (decisión DH 2026-11-06) y
// NACE VACÍA (R15): los 15 pedidos de la nota formal a DPV (bloques A-E)
// son contenido DOCUMENTAL — fuente: documento vecinal interno,
// procedencia declarada, citado sin firmantes expuestos (ADR-027) —, NO
// filas precargadas. Preparar la nota ≠ presentarla (R15): cada pedido se
// registra a medida que se presenta, con fecha real y sello
// 'pedido.presentado'.

// Bloques temáticos de la nota formal a DPV (A-E, ratificados por la DH).
export const PedidoBloqueSchema = z.enum([
  "proyecto_ejecutivo",
  "seguridad_derivadores",
  "datos_cargas",
  "red_provincial_emergencias",
  "seguimiento_vecinal",
]);
export type PedidoBloque = z.infer<typeof PedidoBloqueSchema>;

// Los 15 pedidos de la nota formal a DPV — constante DOCUMENTAL del
// tablero de cobertura: «X de 15 presentados · Y respondidos (fecha de
// corte)». NUNCA son filas: la cobertura se mide contra el documento, no
// contra un seed (R15).
export const PEDIDOS_DPV_ESPERADOS = 15;

// Ciclo de vida del pedido: presentado → respondido_en_plazo |
// respondido_tardio. sin_respuesta NO se transita ni se sella: se DERIVA
// honesto en lectura — presentado con plazo vencido y sin respuesta
// (R15: no existe el evento «no contestaron», existe la fecha vencida).
export const PedidoEstadoSchema = z.enum([
  "presentado",
  "respondido_en_plazo",
  "respondido_tardio",
  "sin_respuesta",
]);
export type PedidoEstado = z.infer<typeof PedidoEstadoSchema>;

// Alta de un pedido REALMENTE presentado (admin — acto institucional del
// nodo ante el organismo): fecha real de presentación (la ruta rechaza
// fechas futuras: preparar la nota ≠ presentarla, R15), plazo declarado de
// respuesta y evidencia opcional citando puntos críticos corroborados
// del AMC (features pc-* community_validated de VIG-011 — N reportes de
// M reportantes detrás, nunca un puntaje).
export const PedidoAltaSchema = z.object({
  nodo_key: SanJuanNodeSlugSchema,
  key: z
    .string()
    .trim()
    .regex(/^[a-z0-9_]+$/, "key: slug del pedido, minúsculas y guiones bajos")
    .min(4)
    .max(60),
  bloque: PedidoBloqueSchema,
  tema: z.string().trim().min(10, "El tema del pedido requiere al menos 10 caracteres").max(500),
  destinatario: z.string().trim().min(2, "El destinatario requiere al menos 2 caracteres").max(120),
  fecha_presentacion: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "fecha_presentacion: fecha real YYYY-MM-DD de la presentación"),
  plazo_dias: z.number().int().min(1, "El plazo de respuesta requiere al menos 1 día").max(365),
  evidencia_cluster_keys: z
    .array(
      z.string().regex(/^pc-/, "evidencia_cluster_keys: cluster keys pc-* del AMC (VIG-011)")
    )
    .max(10)
    .optional(),
});

// Registro de la respuesta del organismo (admin): fecha real (la ruta
// rechaza fechas futuras); el estado final lo DERIVA la ruta contra el
// plazo (respondido_en_plazo | respondido_tardio) — nunca se declara a mano.
export const PedidoRespuestaSchema = z.object({
  fecha_respuesta: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "fecha_respuesta: fecha real YYYY-MM-DD de la respuesta"),
  nota: z.string().trim().max(500).optional(),
});

// ─── ARTEFACTOS-ROLES AR4 (#403, épica #399): libro contable de sellos ───

// AR4 — lectura pública del libro contable (events_raw, ADR-032): el
// auditor consulta los sellos YA emitidos. Sin PII por construcción:
// la compuerta anti-PII vive en la ingesta (POST /api/events, ADR-020
// cond. 1, Ley 25.326) y el guard system.* (H-01) — esta lectura solo
// expone lo que ya pasó esa compuerta. El auditor NO muta: aquí no hay
// schema de escritura por diseño (spec A4 §4).
export const SellosQuerySchema = z.object({
  // Filtra por payload->nodo_key (el nodo vive en el payload del sello —
  // events_raw no tiene columna nodo, patrón reportes.ts).
  nodo: SanJuanNodeSlugSchema.optional(),
  type: z
    .string()
    .trim()
    .min(3, "type: al menos 3 caracteres")
    .max(120, "type: a lo sumo 120 caracteres")
    .optional(),
  // coerce: los query params llegan como strings.
  limit: z.coerce
    .number()
    .int()
    .min(1, "limit mínimo 1")
    .max(200, "limit máximo 200")
    .default(50),
  offset: z.coerce.number().int().min(0, "offset mínimo 0").default(0),
});

// Sello público del libro contable: tal como vive en events_raw —
// append-only, inmutable, id/hash/payload sin PII (Ley 25.326/ADR-027).
export const SelloPublicoSchema = z.object({
  id: z.string(),
  type: z.string(),
  hash: z.string(),
  occurred_at: z.string().datetime(),
  payload: z.record(z.string(), z.unknown()),
});

export type SellosQuery = z.infer<typeof SellosQuerySchema>;
export type SelloPublico = z.infer<typeof SelloPublicoSchema>;
