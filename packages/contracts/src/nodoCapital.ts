/**
 * packages/contracts/src/nodoCapital.ts
 * -----------------------------------------------------------------------------
 * DELocalSoy.AR — Contratos Canónicos del Nodo Capital (San Juan, Argentina)
 * Serie Contracts NCAP-R2 · SRID=4326 · 6 Subnodos (2 distritos PEC 2025 + 4 áreas funcionales) · 4 Estados Epistémicos Honestos
 * -----------------------------------------------------------------------------
 */

import { z } from 'zod';

/**
 * 4 Estados Epistémicos Honestos ADR-034 / NCAP-R2
 * 4 señales independientes: color, geometría de trazo, glifo y microcopia
 */
export const EstadoHonestoNCAPSchema = z.enum([
  'validado',    // Verde #4ADE80 · Sólido · ✓ · Verificado científicamente o fuente oficial T1-T2
  'comunitario', // Celeste #75AADB · Guiones · ⚑ · Aporte territorial de asamblea / relevo ciudadano
  'pendiente',   // Ámbar #FBBF24 · Rayado · ◐ · En proceso de auditoría / acreditación R9
  'sintetico',   // Dorado #FFC72C · Punteado · ◈ · Proyección heurística o inferencia de modelo
]);
export type EstadoHonestoNCAP = z.infer<typeof EstadoHonestoNCAPSchema>;

/**
 * Identificadores de los 4 Subnodos Canónicos de San Juan Capital
 */
export const SubnodoCapitalIdSchema = z.enum([
  'capital-centro-historico', // Plaza 25, Catedral, Eje Cívico Cultural
  'capital-desamparados',      // Parque de Mayo, UNSJ, Urquiza
  'capital-concepcion',        // Pueblo Viejo, Eje Norte Histórico
  'capital-trinidad',          // Eje Ferroviario Sur, Circunvalación
]);
export type SubnodoCapitalId = z.infer<typeof SubnodoCapitalIdSchema>;

/**
 * Coordenadas WGS-84 (SRID 4326) — envolvente provincial San Juan (multi-nodo ADR-021).
 * Decisión DH 2026-10-17 (armonización de divergencias #233): el rango base pasó de
 * Capital-only a la envolvente provincial 28°22'-32°38'S / 66°43'-70°38'O (compilación
 * geográfica provincial; provisional hasta contraste directo IGN) — antes las coordenadas
 * de Iglesia (-30.38/-69.20) y Caucete (-31.65/-68.28) fallaban la validación Zod.
 * Original del agente (documentado): lat -31.60..-31.45 / lng -68.60..-68.45.
 */
export const CoordenadaWGS84Schema = z.object({
  lat: z.number().min(-32.64).max(-28.36),
  lng: z.number().min(-70.64).max(-66.72),
});
export type CoordenadaWGS84 = z.infer<typeof CoordenadaWGS84Schema>;

/**
 * Envolvente estricta de San Juan Capital (uso Capital-only): conserva el rango
 * original del contrato para validación fina dentro del nodo Capital.
 */
export const CoordenadaCapitalSchema = z.object({
  lat: z.number().min(-31.60).max(-31.45),
  lng: z.number().min(-68.60).max(-68.45),
});
export type CoordenadaCapital = z.infer<typeof CoordenadaCapitalSchema>;

/**
 * Geometría PostGIS SRID 4326 en GeoJSON
 */
export const GeoJSONPointSchema = z.object({
  type: z.literal('Point'),
  // Envolvente provincial San Juan (decisión DH 2026-10-17, #233); original: Capital-only.
  coordinates: z.tuple([
    z.number().min(-70.64).max(-66.72), // Lng
    z.number().min(-32.64).max(-28.36), // Lat
  ]),
});

export const GeoJSONPolygonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))),
});

/**
 * Contrato de Indicador Territorial NCAP
 */
export const IndicadorCapitalSchema = z.object({
  codigo: z.string().regex(/^NCAP-IND-[0-9]{3}$/),
  nombre: z.string().min(3).max(120),
  valor: z.number(),
  unidad: z.string(),
  estadoHonesto: EstadoHonestoNCAPSchema,
  fuenteNombre: z.string(),
  fuenteTipo: z.enum(['OFICIAL_T1', 'CIENTIFICA_T2', 'ASAMBLEA_R9', 'INFERENCIA_H6']),
  hashVerificacionSha256: z.string().length(64),
  actualizadoEn: z.string().datetime(),
});
export type IndicadorCapital = z.infer<typeof IndicadorCapitalSchema>;

/**
 * Contrato del Subnodo de San Juan Capital
 */
export const SubnodoCapitalSchema = z.object({
  id: SubnodoCapitalIdSchema,
  nombre: z.string().min(4).max(80),
  descripcion: z.string(),
  centroide: CoordenadaWGS84Schema,
  geom: GeoJSONPolygonSchema.optional(),
  indicadores: z.array(IndicadorCapitalSchema),
  estadoEpistemicoPredominante: EstadoHonestoNCAPSchema,
  coberturaKm2: z.number().positive(),
  poblacionEstimada: z.number().int().nonnegative(),
});
export type SubnodoCapital = z.infer<typeof SubnodoCapitalSchema>;

/**
 * Acreditación con consentimiento (ADR-027, patrón OportunidadActor de main — decisión DH
 * 2026-10-17, armonización de divergencias #233): un relevo sensible NUNCA nombra a una
 * persona sin consentimiento confirmado (Ley 25.326). Rol con el mismo vocabulario que
 * acreditadorRol de evidencias.ts. Original del agente (documentado):
 * acreditadoPor: z.string().min(3) — string libre, sin consentimiento.
 */
export const AcreditadorConsentidoSchema = z
  .object({
    rol: z.enum(['AUDITOR_TECNICO', 'REFERENTE_COMUNITARIO', 'INVESTIGADOR_UNSJ', 'OPERADOR_MUNICIPAL', 'SISTEMA_AGENTE']),
    nombre: z.string().trim().min(3).max(120).optional(),
    consentimientoConfirmado: z.boolean(),
  })
  .refine((a) => a.nombre === undefined || a.consentimientoConfirmado === true, {
    message: 'un acreditador nombrado exige consentimiento confirmado (ADR-027)',
    path: ['consentimientoConfirmado'],
  });
export type AcreditadorConsentido = z.infer<typeof AcreditadorConsentidoSchema>;

/**
 * Contrato de Relevo Territorial Sensible NCAP-R2 (ADR-036)
 */
export const RelevoTerritorialNCAPR2Schema = z.object({
  idRelevo: z.string().uuid(),
  nodoId: z.literal('nodo-capital-san-juan'),
  subnodoId: SubnodoCapitalIdSchema,
  marcaTemporal: z.string().datetime(),
  coordenada: CoordenadaWGS84Schema,
  estadoHonesto: EstadoHonestoNCAPSchema,
  observaciones: z.string().max(2000),
  privacidadNivel: z.enum(['PUBLICO', 'COMUNITARIO_PROTEGIDO', 'RESERVADO_SENSIBLE']),
  firmaCriptograficaSha256: z.string().length(64),
  acreditadoPor: AcreditadorConsentidoSchema,
});
export type RelevoTerritorialNCAPR2 = z.infer<typeof RelevoTerritorialNCAPR2Schema>;

/**
 * Catálogo Canónico de los 4 Subnodos de San Juan Capital (Semilla NCAP-R2)
 */
export const SUBNODOS_CAPITAL_CANONICOS: Record<SubnodoCapitalId, {
  nombre: string;
  descripcion: string;
  centroide: CoordenadaWGS84;
  coberturaKm2: number;
  poblacionEstimada: number;
}> = {
  'capital-centro-historico': {
    nombre: 'Centro Histórico & Eje Cívico',
    descripcion: 'Núcleo fundacional, Plaza 25 de Mayo, Catedral, Eje Cívico Cultural y comercial',
    centroide: { lat: -31.5375, lng: -68.5252 },
    coberturaKm2: 4.8,
    poblacionEstimada: 38200,
  },
  'capital-desamparados': {
    nombre: 'Desamparados & Eje Universitario',
    descripcion: 'Polo educativo superior (UNSJ), Parque de Mayo, corredor Avenida Libertador Oeste',
    centroide: { lat: -31.5284, lng: -68.5489 },
    coberturaKm2: 7.2,
    poblacionEstimada: 42100,
  },
  'capital-concepcion': {
    nombre: 'Concepción & Pueblo Viejo',
    descripcion: 'Raíz histórica colonial, Eje Norte de San Juan, Matadero Tradicional y barrios residenciales',
    centroide: { lat: -31.5168, lng: -68.5310 },
    coberturaKm2: 5.6,
    poblacionEstimada: 29800,
  },
  'capital-trinidad': {
    nombre: 'Trinidad & Eje Sur Ferroviario',
    descripcion: 'Corredor sur de conectividad metropolitana, eje ex-ferroviario y articulación con Rawson',
    centroide: { lat: -31.5560, lng: -68.5280 },
    coberturaKm2: 6.4,
    poblacionEstimada: 34500,
  },
};

/**
 * Registro Canónico de los 6 Subnodos del Nodo Capital — mapeo de nomenclaturas
 * (decisión DH ratificada 2026-10-17: 6 ENTIDADES DISTINTAS; traza #154 comment
 * 6235922878; armonización de dominio #233). Coexisten dos familias:
 *
 * 1. Distritos oficiales del PEC 2025, sembrados en main (Fase C, PR #198 →
 *    main @ 6c851c6, seed-subnodos-capital.sql, assignment_status dh_directive):
 *    keys sj_capital_* con guiones bajos, compatibles con el regex subnodo_key
 *    ^[a-z0-9_]+$ que usan ActivoAlta/OportunidadAlta/AskPregunta.
 * 2. Áreas funcionales del lote 4 NCAP-R2 (agent.google, SubnodoCapitalIdSchema):
 *    ids capital-* con guiones — NO pasan el regex subnodo_key del repo; su clave
 *    de integración territorial es subnodoKey (sj_capital_*).
 *
 * R15: las 4 áreas funcionales viven SOLO en contratos (vocabulario ratificado);
 * NO están sembradas en la tabla subnodos de main — siembra futura a decisión DH
 * (patrón VIG-001, boundary_status provisional). El área "Desamparados & Eje
 * Universitario" toma subnodoKey sj_capital_eje_universitario para no colisionar
 * con el distrito oficial homónimo sj_capital_desamparados (entidades distintas).
 */
export type OrigenSubnodoCapital = 'distrito_pec_2025_main' | 'area_funcional_lote_4';

export const SUBNODOS_CAPITAL_REGISTRO: ReadonlyArray<{
  subnodoKey: string;                  // clave subnodo_key del repo (regex ^[a-z0-9_]+$)
  id: SubnodoCapitalId | null;         // id de contrato del lote 4 (null = distrito de main)
  label: string;
  origen: OrigenSubnodoCapital;
  traza: string;
}> = [
  { subnodoKey: 'sj_capital_centro', id: null, label: 'Centro (distrito PEC 2025)', origen: 'distrito_pec_2025_main', traza: 'Fase C #198 → main @ 6c851c6; vocabulario v0.1 ratificado #154 (2026-10-13)' },
  { subnodoKey: 'sj_capital_desamparados', id: null, label: 'Desamparados (distrito PEC 2025)', origen: 'distrito_pec_2025_main', traza: 'Fase C #198 → main @ 6c851c6; vocabulario v0.1 ratificado #154 (2026-10-13)' },
  { subnodoKey: 'sj_capital_centro_historico', id: 'capital-centro-historico', label: 'Centro Histórico & Eje Cívico', origen: 'area_funcional_lote_4', traza: 'lote 4 NCAP-R2; ratificado 2026-10-17 (6 entidades distintas)' },
  { subnodoKey: 'sj_capital_eje_universitario', id: 'capital-desamparados', label: 'Desamparados & Eje Universitario', origen: 'area_funcional_lote_4', traza: 'lote 4 NCAP-R2; ratificado 2026-10-17 (6 entidades distintas)' },
  { subnodoKey: 'sj_capital_concepcion', id: 'capital-concepcion', label: 'Concepción & Pueblo Viejo', origen: 'area_funcional_lote_4', traza: 'lote 4 NCAP-R2; ratificado 2026-10-17 (6 entidades distintas)' },
  { subnodoKey: 'sj_capital_trinidad', id: 'capital-trinidad', label: 'Trinidad & Eje Sur Ferroviario', origen: 'area_funcional_lote_4', traza: 'lote 4 NCAP-R2; ratificado 2026-10-17 (6 entidades distintas)' },
];

/** Resuelve el subnodoKey territorial (regex del repo) desde el id de contrato
 *  del lote 4 — puente entre SubnodoCapitalIdSchema y la API/DB del repo. */
export const SUBNODO_KEY_POR_ID: Record<SubnodoCapitalId, string> = {
  'capital-centro-historico': 'sj_capital_centro_historico',
  'capital-desamparados': 'sj_capital_eje_universitario',
  'capital-concepcion': 'sj_capital_concepcion',
  'capital-trinidad': 'sj_capital_trinidad',
};
