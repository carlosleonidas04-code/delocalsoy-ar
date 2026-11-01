/**
 * packages/contracts/src/territorios.ts
 * -----------------------------------------------------------------------------
 * DELocalSoy.AR — Contratos de Relevo y Zonificación Territorial
 * Serie Contracts NCAP-R2 · SRID=4326 · WGS84 · Validación Zod
 * -----------------------------------------------------------------------------
 */

import { z } from 'zod';
import { EstadoHonestoNCAPSchema, CoordenadaWGS84Schema } from './nodoCapital.js';

export const TipoTerritorioSchema = z.enum([
  'URBANO_CENTRAL',
  'PERIURBANO_PRODUCTIVO',
  'CUENCA_HIDRICA',
  'VALLE_ANDINO',
  'OASIS_IRRIGADO',
  'RESERVA_PATRIMONIAL'
]);
export type TipoTerritorio = z.infer<typeof TipoTerritorioSchema>;

export const PoligonoWGS84Schema = z.object({
  tipo: z.literal('Polygon'),
  coordenadas: z.array(z.array(z.tuple([z.number(), z.number()]))),
  srid: z.literal(4326).default(4326),
});
export type PoligonoWGS84 = z.infer<typeof PoligonoWGS84Schema>;

export const NodoTerritorialInfoSchema = z.object({
  idNodo: z.string().min(3),
  nombre: z.string().min(2),
  departamento: z.string(),
  provincia: z.string().default('San Juan'),
  pais: z.string().default('Argentina'),
  tipo: TipoTerritorioSchema,
  centroide: CoordenadaWGS84Schema,
  superficieKm2: z.number().positive(),
  poblacionCenso2022: z.number().nonnegative(),
  estadoHonesto: EstadoHonestoNCAPSchema,
  subnodos: z.array(z.string()).default([]),
  firmaSha256: z.string().length(64).optional(),
});
export type NodoTerritorialInfo = z.infer<typeof NodoTerritorialInfoSchema>;

export const ConsultaTerritorialFiltroSchema = z.object({
  provincia: z.string().optional(),
  departamento: z.string().optional(),
  tipo: TipoTerritorioSchema.optional(),
  estadoHonesto: EstadoHonestoNCAPSchema.optional(),
  limite: z.number().min(1).max(100).default(20),
});
export type ConsultaTerritorialFiltro = z.infer<typeof ConsultaTerritorialFiltroSchema>;
