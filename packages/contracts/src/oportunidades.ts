/**
 * packages/contracts/src/oportunidades.ts
 * -----------------------------------------------------------------------------
 * DELocalSoy.AR — Contratos de Oportunidades y Articulación Local
 * Serie Contracts NCAP-R2 · Economía Popular & Intercambio Comunitario
 * -----------------------------------------------------------------------------
 */

import { z } from 'zod';
import { EstadoHonestoNCAPSchema, CoordenadaWGS84Schema } from './nodoCapital.js';

export const TipoOportunidadSchema = z.enum([
  'DEMANDA_PRODUCTO_LOCAL',
  'OFERTA_EXCEDENTE_COSECHA',
  'COMPRA_COMUNITARIA_AGRUPADA',
  'TALLER_FORMACION_POPULAR',
  'CONVOCATORIA_FERIA_BARRIAL'
]);
export type TipoOportunidad = z.infer<typeof TipoOportunidadSchema>;

export const OportunidadTerritorialSchema = z.object({
  idOportunidad: z.string().uuid(),
  nodoId: z.string(),
  subnodoId: z.string().optional(),
  tipo: TipoOportunidadSchema,
  titulo: z.string().min(5).max(140),
  descripcion: z.string().max(2000),
  estadoHonesto: EstadoHonestoNCAPSchema,
  coordenada: CoordenadaWGS84Schema,
  contactoCanal: z.string(),
  fechaInicioIso: z.string().datetime(),
  fechaCierreIso: z.string().datetime().optional(),
  vigente: z.boolean().default(true),
});
export type OportunidadTerritorial = z.infer<typeof OportunidadTerritorialSchema>;
