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
]);

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
export const RagSourceTypeSchema = z.enum(["subnodo", "activo", "kpi"]);

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
