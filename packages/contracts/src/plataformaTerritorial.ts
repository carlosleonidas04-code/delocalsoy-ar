/**
 * packages/contracts/src/plataformaTerritorial.ts
 * -----------------------------------------------------------------------------
 * DELocalSoy.AR — Contratos Canónicos de la Plataforma Territorial
 * Serie Contracts NCAP-R2 · HITUB · Gobernanza y Catálogo Multi-nodo (ADR-021)
 * -----------------------------------------------------------------------------
 */

import { z } from 'zod';
import { EstadoHonestoNCAPSchema, CoordenadaWGS84Schema } from './nodoCapital.js';

export const NodoIdCanónicoSchema = z.enum([
  'nodo-capital-san-juan',
  'nodo-valle-de-iglesia',
  'nodo-caucete-este'
]);
export type NodoIdCanónico = z.infer<typeof NodoIdCanónicoSchema>;

export const PlataformaConfigSchema = z.object({
  idPlataforma: z.literal('delocalsoy-ar'),
  nombre: z.string(),
  versionProtocolo: z.literal('NCAP-R2'),
  sridCanónico: z.literal(4326),
  nodosActivos: z.array(NodoIdCanónicoSchema),
  nodoPredeterminado: NodoIdCanónicoSchema,
  politicaPrivacidad: z.enum(['SOBERANIA_TERRITORIAL_ABIERTA', 'COMUNITARIA_CONSENTIDA']),
  auditoriaHashRaiz: z.string().length(64).optional(),
});
export type PlataformaConfig = z.infer<typeof PlataformaConfigSchema>;

export const InfoNodoFederadoSchema = z.object({
  nodoId: NodoIdCanónicoSchema,
  nombre: z.string(),
  lema: z.string(),
  centroide: CoordenadaWGS84Schema,
  estadoHonesto: EstadoHonestoNCAPSchema,
  cuencaOValle: z.string(),
  actividadesClave: z.array(z.string()),
  endpointsApi: z.object({
    health: z.string(),
    relevos: z.string(),
    catalogo: z.string(),
  }),
});
export type InfoNodoFederado = z.infer<typeof InfoNodoFederadoSchema>;
