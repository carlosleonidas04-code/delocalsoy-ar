/**
 * packages/contracts/src/modeloFederado.ts
 * -----------------------------------------------------------------------------
 * DELocalSoy.AR — Contratos de Federación Inter-Nodal y Consenso Territorial
 * Serie Contracts NCAP-R2 · ADR-021 / ADR-034 / ADR-036 · HITUB
 * -----------------------------------------------------------------------------
 */

import { z } from 'zod';
import { EstadoHonestoNCAPSchema } from './nodoCapital.js';

export const TransicionNodalSchema = z.object({
  idTransicion: z.string().uuid(),
  nodoOrigenId: z.string(),
  nodoDestinoId: z.string(),
  tipoEnlace: z.enum(['CORREDOR_BIOCEANICO', 'CUENCA_COMPARTIDA', 'RED_PRODUCTIVA', 'INTERCAMBIO_CULTURAL']),
  distanciaKm: z.number().positive(),
  tiempoEstimadoHoras: z.number().positive(),
  estadoHonesto: EstadoHonestoNCAPSchema,
  requisitoGobernanza: z.string().optional(),
});
export type TransicionNodal = z.infer<typeof TransicionNodalSchema>;

export const PaqueteSincronizacionFederadaSchema = z.object({
  idLote: z.string(),
  emisorNodoId: z.string(),
  timestamp: z.string().datetime(),
  versionProtocolo: z.literal('NCAP-R2'),
  hashBloqueSha256: z.string().length(64),
  totalElementos: z.number().int().nonnegative(),
  relevos: z.array(z.unknown()),
  evidencias: z.array(z.unknown()),
  firmaEd25519: z.string().min(32),
});
export type PaqueteSincronizacionFederada = z.infer<typeof PaqueteSincronizacionFederadaSchema>;
