/**
 * packages/contracts/src/directoryTaxonomy.ts
 * -----------------------------------------------------------------------------
 * DELocalSoy.AR — Taxonomía Canónica de Directorio Territorial
 * Serie Contracts NCAP-R2 · Comercios, Espacios Públicos y Productores
 * -----------------------------------------------------------------------------
 */

import { z } from 'zod';

export const RamaTaxonomicaSchema = z.enum([
  'ALIMENTOS_Y_BEBIDAS_LOCALES',
  'ARTESANIAS_Y_MANUFACTURA',
  'SERVICIOS_PROFESIONALES_Y_OFICIOS',
  'TURISMO_Y_PATRIMONIO',
  'ESPACIOS_PUBLICOS_Y_RECREACION',
  'SALUD_Y_BIENESTAR_COMUNITARIO',
  'EDUCACION_Y_CULTURA'
]);
export type RamaTaxonomica = z.infer<typeof RamaTaxonomicaSchema>;

export const CategoriaDirectorioItemSchema = z.object({
  idCategoria: z.string(),
  rama: RamaTaxonomicaSchema,
  nombre: z.string(),
  descripcion: z.string(),
  icono: z.string().optional(),
  permiteVentaDirecta: z.boolean().default(false),
  subcategorias: z.array(z.string()).default([]),
});
export type CategoriaDirectorioItem = z.infer<typeof CategoriaDirectorioItemSchema>;

export const TAXONOMIA_CANONICA_DELOCALSOY: CategoriaDirectorioItem[] = [
  {
    idCategoria: 'cat-almacen-barrial',
    rama: 'ALIMENTOS_Y_BEBIDAS_LOCALES',
    nombre: 'Almacén Barrial & Despensa de Proximidad',
    descripcion: 'Puntos de abastecimiento de alimentos secos, frescos y productos regionales en el barrio',
    icono: 'Store',
    permiteVentaDirecta: true,
    subcategorias: ['Almacén', 'Fiambrería', 'Verdulería de cercanía', 'Panadería artesanal']
  },
  {
    idCategoria: 'cat-gastronomia-regional',
    rama: 'ALIMENTOS_Y_BEBIDAS_LOCALES',
    nombre: 'Gastronomía Sanjuanina & Puntos de Encuentro',
    descripcion: 'Empanadas sanjuaninas, semitas caseras, dulces de membrillo y gastronomía tradicional',
    icono: 'Utensils',
    permiteVentaDirecta: true,
    subcategorias: ['Rotisería barrial', 'Comedor tradicional', 'Puesto de feria']
  },
  {
    idCategoria: 'cat-espacio-civico',
    rama: 'ESPACIOS_PUBLICOS_Y_RECREACION',
    nombre: 'Plazas, Parques y Ejes Peatonales',
    descripcion: 'Espacios de encuentro cívico, esparcimiento verde y articulación barrial',
    icono: 'Trees',
    permiteVentaDirecta: false,
    subcategorias: ['Plaza departamental', 'Parque urbano', 'Paseo peatonal', 'Corredor verde']
  },
  {
    idCategoria: 'cat-taller-oficio',
    rama: 'SERVICIOS_PROFESIONALES_Y_OFICIOS',
    nombre: 'Talleres de Oficios y Reparación',
    descripcion: 'Herrería, zapatería, carpintería, mecánica y oficios tradicionales sanjuaninos',
    icono: 'Wrench',
    permiteVentaDirecta: true,
    subcategorias: ['Reparación', 'Oficio tradicional', 'Taller mecánico']
  }
];

/* =============================================================================
 * SECCION CANON — RATIFICADA POR LA DH (2026-10-17, traza #243 issuecomment-6242652540)
 * =============================================================================
 * Canon de rubros del Mercado de Proximidad = 11 categorias del fixture
 * apps/web/src/data/capitalTerritoryData.ts (DIRECTORY_CATEGORIES_CATALOG, lote 3A,
 * acreditado en esta rama). Contenido transcrito VERBATIM del fixture (R1: nada
 * derivado). La TAXONOMIA_CANONICA_DELOCALSOY de 4 categorias de agent.google (arriba)
 * queda como subconjunto legado a armonizar via MAPEO_CATEGORIAS_AGENT_GOOGLE_A_CANON.
 * ============================================================================= */

/** Subcategoria de directorio — forma exacta del fixture lote 3A (tipos que consume
 *  apps/web/src/data/capitalTerritoryData.ts desde '@delocalsoy/contracts'). */
export const DirectorySubcategorySchema = z.object({
  code: z.string(),
  name: z.string(),
  description: z.string(),
  isActive: z.boolean(),
  requiredAttributes: z.array(z.string()),
  optionalAttributes: z.array(z.string()),
  synonyms: z.array(z.string()),
}).strict();
export type DirectorySubcategory = z.infer<typeof DirectorySubcategorySchema>;

export const DirectoryCategorySchema = z.object({
  code: z.string(),
  name: z.string(),
  description: z.string(),
  isActive: z.boolean(),
  subcategories: z.array(DirectorySubcategorySchema),
}).strict();
export type DirectoryCategory = z.infer<typeof DirectoryCategorySchema>;

/** CANON RATIFICADO DH: 11 categorias (verbatim del fixture lote 3A). */
export const TAXONOMIA_DIRECTORIO_CANONICA: DirectoryCategory[] = [
  {
    code: 'food_drink',
    name: 'Alimentación y bebidas',
    description: 'Comercios de proximidad, panaderías, cafeterías, viandas y gastronomía local.',
    isActive: true,
    subcategories: [
      { code: 'food_drink.grocery', name: 'Almacén y despensa', description: 'Alimentos y artículos cotidianos', isActive: true, requiredAttributes: ['service_mode', 'coverage_area'], optionalAttributes: ['payment_methods'], synonyms: ['despensa', 'almacén', 'minimercado'] },
      { code: 'food_drink.cafe', name: 'Cafetería', description: 'Café de especialidad, infusiones y desayunos', isActive: true, requiredAttributes: ['service_mode', 'schedule'], optionalAttributes: ['accessibility', 'payment_methods'], synonyms: ['café', 'coffee shop'] },
      { code: 'food_drink.restaurant', name: 'Restaurante y bistró', description: 'Gastronomía para consumo en el local o retiro', isActive: true, requiredAttributes: ['service_mode', 'schedule'], optionalAttributes: ['accessibility'], synonyms: ['restaurante', 'comedor'] },
    ],
  },
  {
    code: 'retail',
    name: 'Comercio y retail',
    description: 'Librerías, indumentaria, ferreterías y artículos para el hogar.',
    isActive: true,
    subcategories: [
      { code: 'retail.books', name: 'Librería y papelería', description: 'Libros, apuntes universitarios y material de estudio', isActive: true, requiredAttributes: ['service_mode'], optionalAttributes: ['payment_methods'], synonyms: ['librería', 'fotocopias'] },
    ],
  },
  {
    code: 'professional_services',
    name: 'Servicios profesionales',
    description: 'Estudios de arquitectura, ingeniería, diseño, abogacía y contabilidad.',
    isActive: true,
    subcategories: [
      { code: 'professional_services.engineering', name: 'Ingeniería y cálculo estructural', description: 'Proyectos de ingeniería civil, eléctrica y química', isActive: true, requiredAttributes: ['service_mode'], optionalAttributes: ['audience'], synonyms: ['estudio técnico', 'ingenieros'] },
    ],
  },
  {
    code: 'home_technical',
    name: 'Hogar y servicios técnicos',
    description: 'Electricistas, plomeros, refrigeración, mantenimiento y carpintería.',
    isActive: true,
    subcategories: [
      { code: 'home_technical.electrician', name: 'Electricidad residencial e industrial', description: 'Instalaciones, tableros y mantenimiento eléctrico', isActive: true, requiredAttributes: ['service_mode', 'coverage_area'], optionalAttributes: ['schedule'], synonyms: ['electricista', 'técnico matriculado'] },
    ],
  },
  {
    code: 'health_wellness',
    name: 'Salud y bienestar',
    description: 'Kinesiología, nutrición, psicología, ópticas y actividad física.',
    isActive: true,
    subcategories: [
      { code: 'health_wellness.physio', name: 'Kinesiología y rehabilitación', description: 'Rehabilitación postural y deportiva', isActive: true, requiredAttributes: ['service_mode', 'schedule'], optionalAttributes: ['accessibility'], synonyms: ['kinesiólogo', 'fisioterapia'] },
    ],
  },
  {
    code: 'education_training',
    name: 'Educación y formación',
    description: 'Academias de idiomas, tutorías, talleres artísticos y centros universitarios.',
    isActive: true,
    subcategories: [
      { code: 'education_training.university', name: 'Centros universitarios e institutos', description: 'Facultades, secretarías y centros de investigación', isActive: true, requiredAttributes: ['service_mode'], optionalAttributes: ['audience', 'accessibility'], synonyms: ['universidad', 'facultad'] },
    ],
  },
  {
    code: 'culture_leisure',
    name: 'Cultura, arte y recreación',
    description: 'Teatros, museos, salas de ensayo, galerías y centros comunitarios.',
    isActive: true,
    subcategories: [
      { code: 'culture_leisure.theater', name: 'Teatros y auditorios', description: 'Espacios de artes escénicas y acústicas', isActive: true, requiredAttributes: ['service_mode', 'schedule'], optionalAttributes: ['accessibility'], synonyms: ['teatro', 'auditorio'] },
    ],
  },
  {
    code: 'local_production',
    name: 'Producción y emprendimientos',
    description: 'Artesanías, cerámica, elaboración de conservas, software y manufactura.',
    isActive: true,
    subcategories: [
      { code: 'local_production.crafts', name: 'Artesanías y cerámica cuyana', description: 'Piezas artesanales hechas en San Juan', isActive: true, requiredAttributes: ['local_origin', 'service_mode'], optionalAttributes: ['trust_level'], synonyms: ['artesanía', 'cerámica'] },
    ],
  },
  {
    code: 'social_economy',
    name: 'Economía social y solidaria',
    description: 'Cooperativas de trabajo, ferias populares, mutuales y reciclaje.',
    isActive: true,
    subcategories: [
      { code: 'social_economy.coop', name: 'Cooperativas de trabajo y servicios', description: 'Organizaciones democráticas de producción y servicios', isActive: true, requiredAttributes: ['service_mode'], optionalAttributes: ['trust_level'], synonyms: ['cooperativa', 'asociación'] },
    ],
  },
  {
    code: 'spaces_rentals',
    name: 'Espacios y alquileres',
    description: 'Salones para talleres, coworking, cocinas compartidas y depósitos.',
    isActive: true,
    subcategories: [
      { code: 'spaces_rentals.cowork', name: 'Salones y coworking comunitario', description: 'Puestos de trabajo y salas de reunión', isActive: true, requiredAttributes: ['service_mode', 'schedule'], optionalAttributes: ['accessibility'], synonyms: ['coworking', 'sala de reuniones'] },
    ],
  },
  {
    code: 'institutions_organizations',
    name: 'Instituciones y organizaciones',
    description: 'Municipios, uniones vecinales, clubes y bibliotecas populares.',
    isActive: true,
    subcategories: [
      { code: 'institutions_organizations.civic', name: 'Centros vecinales y cívicos', description: 'Articulación ciudadana barrial', isActive: true, requiredAttributes: ['service_mode'], optionalAttributes: ['accessibility'], synonyms: ['unión vecinal', 'centro comunitario'] },
    ],
  },
];

/** Mapping legado agent.google (4 categorias) -> canon ratificado (11).
 *  cat-espacio-civico NO tiene equivalente de rubro comercial: plazas/parques
 *  pertenecen al dominio features public_space, no al Mercado de Proximidad. */
export const MAPEO_CATEGORIAS_AGENT_GOOGLE_A_CANON: Record<string, string | null> = {
  'cat-almacen-barrial': 'food_drink',
  'cat-gastronomia-regional': 'food_drink',
  'cat-taller-oficio': 'home_technical',
  'cat-espacio-civico': null, // dominio public_space (features), no rubro comercial
};

/** Listing de directorio — forma exacta del fixture lote 3A (resuelve el import
 *  de DirectoryListing en capitalTerritoryData.ts). R15: los listings del fixture
 *  son demo con mezcla de instituciones reales sin etiqueta sintetica (hallazgo
 *  registrado en la traza del lote 3A); trustLevel del fixture NO acredita los
 *  estados honestos del repo (ADR-035). El contrato canonico del Mercado de
 *  Proximidad (ComercioFicha*, MARKET-CAP MK-1) vive aparte — este schema tipa el
 *  fixture/stage, no sustituye al canon. */
export const DirectoryListingSchema = z.object({
  id: z.string(),
  nodeId: z.string(),
  actorId: z.string(),
  displayName: z.string(),
  headline: z.string(),
  description: z.string(),
  primaryCategory: z.string(),
  subcategories: z.array(z.string()),
  tags: z.array(z.string()),
  address: z.object({
    street: z.string(),
    number: z.string(),
    neighborhood: z.string(),
    subnodeId: z.string(),
    city: z.string(),
    province: z.string(),
  }),
  location: z.object({ lat: z.number(), lng: z.number(), sourceId: z.string() }),
  serviceModes: z.array(z.string()),
  paymentMethods: z.array(z.string()),
  accessibility: z.array(z.string()),
  trustLevel: z.string(),
  status: z.string(),
  contactPolicy: z.string(),
  contact: z.object({ phone: z.string().optional(), email: z.string().optional(), website: z.string().optional() }).optional(),
  territorialContext: z.object({ subnodeId: z.string().optional(), corridorId: z.string().optional(), landmarkId: z.string().optional() }),
}).strict();
export type DirectoryListing = z.infer<typeof DirectoryListingSchema>;

/* =============================================================================
 * PUENTE LOCALOPPORTUNITY — DECISION DH 2026-10-17 (turno 20): alias puente
 * =============================================================================
 * El fixture apps/web/src/data/capitalTerritoryData.ts importa LocalOpportunity
 * desde '@delocalsoy/contracts'. El modulo oportunidades.js fue eliminado (decision
 * DH 2026-10-17: dominio Bloque 9 canonico unico = Oportunidad* inline en index.ts)
 * y con el el tipo original — el import quedaba roto. Decision DH (traza #243):
 * REPONER el tipo como ALIAS PUENTE que tipa el fixture/stage SIN duplicar el
 * dominio canonico. Los enums espejan los canonicos de index.ts (OportunidadTipoSchema,
 * OportunidadEstadoSchema, ActivoVisibilidadSchema) SIN importarlos: index.ts
 * re-exporta este modulo, importar de vuelta crearia circularidad. categoryCodes se
 * valida contra TAXONOMIA_DIRECTORIO_CANONICA (canon de 11 rubros ratificado, #243).
 * Deuda: cuando el stage migre a Oportunidad* canonicas, este puente se elimina.
 * ============================================================================= */

// Espejos de los enums canonicos de index.ts (ver nota de circularidad arriba).
export const LocalOpportunityTypeSchema = z.enum([
  'human_capacity',
  'productive_capacity',
  'physical_asset',
  'institutional_asset',
  'cultural_asset',
  'detected_demand',
  'market_gap',
  'partnership_opportunity',
  'investment_opportunity',
  'policy_opportunity',
]); // espejo de OportunidadTipoSchema (index.ts)

export const LocalOpportunityStatusSchema = z.enum([
  'detected',
  'under_review',
  'validated',
  'prioritized',
  'in_development',
  'active',
  'implemented',
  'paused',
  'discarded',
  'archived',
]); // espejo de OportunidadEstadoSchema (index.ts)

export const LocalOpportunityVisibilitySchema = z.enum(['public', 'generalized', 'restricted']); // espejo de ActivoVisibilidadSchema (ADR-036)

export const LocalOpportunityEvidenceTypeSchema = z.enum([
  'community_input',
  'survey',
  'platform_data',
  'field_observation',
  'institutional_document',
  'news_source',
  'statistical_source',
]); // espejo del evidence_type de OportunidadEvidenciaSchema (index.ts)

export const LocalOpportunityRoleSchema = z.enum([
  'proposer',
  'beneficiary',
  'provider',
  'partner',
  'validator',
  'supporter',
]); // espejo del role de OportunidadActorSchema (index.ts)

// Estado de validacion del fixture (mismo vocabulario que TerritorialEntity lote 3A).
export const LocalOpportunityValidationStatusSchema = z.enum([
  'corroborated',
  'reviewed',
  'under_review',
  'unreviewed',
]);

export const LocalOpportunityResourceStatusSchema = z.enum(['needed', 'identified', 'committed']);

/** Evidencia del fixture — forma exacta del lote 3A (id + fuente + fecha de captura). */
export const LocalOpportunityEvidenceSchema = z.object({
  id: z.string().min(1),
  sourceId: z.string().min(1),
  evidenceType: LocalOpportunityEvidenceTypeSchema,
  description: z.string().min(1),
  capturedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'capturedAt: YYYY-MM-DD'),
  validationStatus: LocalOpportunityValidationStatusSchema,
}).strict();

/** Actor del fixture — consentimiento obligatorio (Ley 25.326/ADR-027);
 *  contactInfo SOLO stage: nunca persiste ni se expone (relay de plataforma, MK-0). */
export const LocalOpportunityActorSchema = z.object({
  name: z.string().min(1),
  role: LocalOpportunityRoleSchema,
  consentConfirmed: z.boolean(),
  contactInfo: z.string().optional(),
}).strict();

export const LocalOpportunityResourceSchema = z.object({
  resourceType: z.string().min(1),
  description: z.string().min(1),
  status: LocalOpportunityResourceStatusSchema,
}).strict();

export const LocalOpportunityScoreSchema = z.object({
  territorialImpact: z.number().int().min(1).max(5),
  feasibility: z.number().int().min(1).max(5),
  urgency: z.number().int().min(1).max(5),
  totalScore: z.number().int().min(0).max(100),
}).strict();

const CODIGOS_CANON_RUBROS = new Set(TAXONOMIA_DIRECTORIO_CANONICA.map((c) => c.code));

/** ALIAS PUENTE (decision DH 2026-10-17): tipa CAPITAL_OPPORTUNITIES_SEEDS del
 *  fixture lote 3A (5 semillas). NO es contrato de API — el dominio canonico del
 *  Bloque 9 es Oportunidad* (index.ts, NCAP-R6 #158). categoryCodes valida contra
 *  el canon de 11 rubros ratificado (#243); la evidencia exige al menos 1 fuente
 *  (criterio minimo del Bloque 9). */
export const LocalOpportunitySchema = z.object({
  id: z.string().min(1),
  nodeId: z.string().min(1),
  type: LocalOpportunityTypeSchema,
  title: z.string().min(3),
  description: z.string().min(10),
  status: LocalOpportunityStatusSchema,
  territorialContext: z.object({
    subnodeId: z.string().optional(),
    corridorId: z.string().optional(),
    landmarkId: z.string().optional(),
    serviceAreaName: z.string().optional(),
  }),
  actors: z.array(LocalOpportunityActorSchema),
  evidence: z.array(LocalOpportunityEvidenceSchema).min(1, 'criterio Bloque 9: al menos una evidencia por oportunidad'),
  tags: z.array(z.string()),
  categoryCodes: z.array(z.string()).refine((codes) => codes.every((code) => CODIGOS_CANON_RUBROS.has(code)), {
    message: 'categoryCodes debe usar codigos del canon de 11 rubros ratificado (#243)',
  }),
  impactHypothesis: z.string().min(1),
  requiredResources: z.array(LocalOpportunityResourceSchema),
  visibility: LocalOpportunityVisibilitySchema,
  createdAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'createdAt: YYYY-MM-DD'),
  updatedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'updatedAt: YYYY-MM-DD'),
  createdBy: z.string().min(1),
  lastReviewedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'lastReviewedAt: YYYY-MM-DD'),
  score: LocalOpportunityScoreSchema,
}).strict();
export type LocalOpportunity = z.infer<typeof LocalOpportunitySchema>;
