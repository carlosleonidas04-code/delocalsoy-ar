/**
 * packages/contracts/src/caucete.ts
 * -----------------------------------------------------------------------------
 * DELocalSoy.AR — Contratos Canónicos del Nodo Caucete Este (70035)
 * Conforme a ADR-021 (3 Nodos), ADR-034 (4 Estados Honestos), ADR-035 (Fuentes),
 * ADR-036 (Modo Protegido) y Épica #137 (NODO-CAU / Pedido #256)
 * -----------------------------------------------------------------------------
 */

import { z } from 'zod';

/**
 * 4 Estados Epistémicos Honestos Canónicos ADR-034 / NCAP-R2
 */
export const EstadoHonestoCauceteSchema = z.enum([
  'validado',    // Verde #4ADE80 · Sólido · ✓ · Verificado científicamente o fuente oficial T1
  'comunitario', // Celeste #75AADB · Punteado · ◈ · Aporte territorial / corroboración vecinal
  'pendiente',   // Ámbar #F2A71B · Rayado · ◐ · Sin materializar aún / relevo en curso
  'sintetico',   // Dorado #FFC72C · Rayado discontinuo · ◇ · Proyección ilustrativa de stage
]);
export type EstadoHonestoCaucete = z.infer<typeof EstadoHonestoCauceteSchema>;

/**
 * 10 Subnodos Georef/INDEC del Nodo Caucete Este (PR #255 / R6)
 */
export const SubnodoCauceteIdSchema = z.enum([
  'sj_caucete_ciudad',
  'sj_caucete_villa_independencia',
  'sj_caucete_pie_de_palo',
  'sj_caucete_el_rincon',
  'sj_caucete_las_talas_los_medanos',
  'sj_caucete_las_talas_subparaje_01',
  'sj_caucete_los_medanos_subparaje_02',
  'sj_caucete_vallecito',
  'sj_caucete_bermejo',
  'sj_caucete_marayes',
]);
export type SubnodoCauceteId = z.infer<typeof SubnodoCauceteIdSchema>;

/**
 * Coordenadas WGS-84 (SRID 4326) con validación estricta de rango para Caucete
 */
export const CoordenadaCauceteWGS84Schema = z.object({
  lat: z.number().min(-32.00).max(-31.20),
  lng: z.number().min(-68.50).max(-67.10),
});
export type CoordenadaCauceteWGS84 = z.infer<typeof CoordenadaCauceteWGS84Schema>;

/**
 * Contrato de Subnodo Territorial de Caucete
 */
export const SubnodoCauceteSchema = z.object({
  id: SubnodoCauceteIdSchema,
  nombre: z.string().min(3).max(100),
  tipo: z.enum(['district', 'locality', 'subparaje']),
  codigoIndec: z.string().regex(/^70035[0-9]{3,5}$/),
  coordenada: CoordenadaCauceteWGS84Schema,
  poblacionEstimada: z.number().int().nonnegative(),
  boundaryStatus: z.literal('provisional'),
  assignment: z.literal('dh_directive'),
  zone: z.literal('valle_de_tulum'),
  vocacion: z.string().min(5),
  conectividad: z.string().min(5),
  estadoHonesto: EstadoHonestoCauceteSchema,
  fuenteProcedencia: z.string().min(5),
});
export type SubnodoCauceteContrato = z.infer<typeof SubnodoCauceteSchema>;

/**
 * Contrato de Fuente Documentada ADR-035 (Catálogo de 15 Fuentes)
 */
export const FuenteCauceteSchema = z.object({
  id: z.string().regex(/^f-cau-[0-9]{2}$/),
  codigo: z.string().regex(/^CAU-F-[0-9]{3}$/),
  organismo: z.string().min(2),
  titulo: z.string().min(5),
  tipo: z.string(),
  estadoHonesto: EstadoHonestoCauceteSchema,
  referencia: z.string(),
  frecuenciaActualizacion: z.string(),
  ultimoAcceso: z.string(),
  materializadaEnDB: z.boolean(),
  ingestaStatus: z.enum(['recibido', 'validado_tecnicamente', 'validado_territorialmente', 'publicado']),
});
export type FuenteCauceteContrato = z.infer<typeof FuenteCauceteSchema>;

/**
 * Centroide Oficial de Caucete corregido (-31.651, -68.282)
 */
export const CENTROIDE_CAUCETE_CANONICO: CoordenadaCauceteWGS84 = {
  lat: -31.6510,
  lng: -68.2820,
};
