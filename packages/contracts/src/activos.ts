/**
 * packages/contracts/src/activos.ts
 * -----------------------------------------------------------------------------
 * DELocalSoy.AR — Contratos de Activos Territoriales y Recursos Locales
 * Serie Contracts NCAP-R2 · SRID=4326 · Validación Epistémica
 * -----------------------------------------------------------------------------
 */

import { z } from 'zod';
import { EstadoHonestoNCAPSchema, CoordenadaWGS84Schema } from './nodoCapital.js';

export const CategoriaActivoSchema = z.enum([
  'ESPACIO_PUBLICO_CIVICO',
  'COMERCIO_PROXIMIDAD',
  'PRODUCTOR_AGROECOLOGICO',
  'INFRAESTRUCTURA_HIDRICA',
  'PATRIMONIO_HISTORICO_CULTURAL',
  'SERVICIOS_COMUNITARIOS',
  'PUNTO_INTERCAMBIO_LOCAL'
]);
export type CategoriaActivo = z.infer<typeof CategoriaActivoSchema>;

export const ActivoTerritorialSchema = z.object({
  idActivo: z.string().uuid(),
  nodoId: z.string().min(3),
  subnodoId: z.string().optional(),
  categoria: CategoriaActivoSchema,
  nombre: z.string().min(3).max(140),
  descripcion: z.string().max(2000),
  coordenada: CoordenadaWGS84Schema,
  direccionReferencial: z.string(),
  estadoHonesto: EstadoHonestoNCAPSchema,
  acreditacionR15: z.boolean().default(true),
  metadatos: z.record(z.string(), z.unknown()).default({}),
  creadoEnIso: z.string().datetime(),
  actualizadoEnIso: z.string().datetime(),
});
export type ActivoTerritorial = z.infer<typeof ActivoTerritorialSchema>;
