/**
 * packages/contracts/src/evidencias.ts
 * -----------------------------------------------------------------------------
 * DELocalSoy.AR — Contratos de Evidencia Criptográfica y Auditoría Territorial
 * Serie Contracts NCAP-R2 · SHA-256 · Ed25519 · Regla R15 (Acreditación)
 * -----------------------------------------------------------------------------
 */

import { z } from 'zod';
import { EstadoHonestoNCAPSchema, CoordenadaWGS84Schema } from './nodoCapital.js';

export const NivelEvidenciaSchema = z.enum([
  'T1_OFICIAL_CIENTIFICA',
  'T2_REGISTRAL_CATASTRAL',
  'T3_COMUNITARIA_ASAMBLEA',
  'T4_TESTIMONIAL_TERRENO',
  'T5_INFERENCIA_MODELO'
]);
export type NivelEvidencia = z.infer<typeof NivelEvidenciaSchema>;

export const EvidenciaTerritorialSchema = z.object({
  idEvidencia: z.string().uuid(),
  idRelevo: z.string().uuid(),
  nodoId: z.string().min(3),
  subnodoId: z.string().optional(),
  nivel: NivelEvidenciaSchema,
  estadoHonesto: EstadoHonestoNCAPSchema,
  titulo: z.string().min(5).max(180),
  descripcion: z.string().max(2500),
  coordenada: CoordenadaWGS84Schema,
  marcaTemporalIso: z.string().datetime(),
  hashSha256Original: z.string().length(64),
  hashSha256Metadatos: z.string().length(64),
  firmantePubkeyEd25519: z.string().min(32).max(128).optional(),
  acreditadorRol: z.enum(['AUDITOR_TECNICO', 'REFERENTE_COMUNITARIO', 'INVESTIGADOR_UNSJ', 'OPERADOR_MUNICIPAL', 'SISTEMA_AGENTE']),
  urlEvidenciaSegura: z.string().url().optional(),
  acreditadaR15: z.boolean().default(true),
});
export type EvidenciaTerritorial = z.infer<typeof EvidenciaTerritorialSchema>;

export const ResumenEvidenciasNodoSchema = z.object({
  nodoId: z.string(),
  totalEvidencias: z.number().int().nonnegative(),
  porEstado: z.record(EstadoHonestoNCAPSchema, z.number().int()),
  porNivel: z.record(NivelEvidenciaSchema, z.number().int()),
  ultimaAuditoriaIso: z.string().datetime(),
  cadenaBloquesValida: z.boolean(),
});
export type ResumenEvidenciasNodo = z.infer<typeof ResumenEvidenciasNodoSchema>;
