/**
 * packages/contracts/src/health.ts
 * -----------------------------------------------------------------------------
 * DELocalSoy.AR — Contratos de Salud del Sistema y Monitoreo de Nodos
 * Serie Contracts NCAP-R2 · Telemetría Segura · Uptime & Ping Federado
 * -----------------------------------------------------------------------------
 */

import { z } from 'zod';

export const HealthStatusSchema = z.enum([
  'OPERATIVO',
  'DEGRADADO',
  'MANTENIMIENTO',
  'SINCRONIZANDO',
  'ERROR_CRITICO'
]);
export type HealthStatus = z.infer<typeof HealthStatusSchema>;

export const ComponentHealthSchema = z.object({
  nombre: z.string(),
  estado: HealthStatusSchema,
  latenciaMs: z.number().nonnegative(),
  mensaje: z.string().optional(),
  ultimaVerificacion: z.string().datetime(),
});
export type ComponentHealth = z.infer<typeof ComponentHealthSchema>;

export const SystemHealthReportSchema = z.object({
  version: z.string(),
  protocolo: z.literal('NCAP-R2'),
  estadoGlobal: HealthStatusSchema,
  timestamp: z.string().datetime(),
  nodoId: z.string(),
  uptimeSegundos: z.number().nonnegative(),
  componentes: z.record(z.string(), ComponentHealthSchema),
  memoriaUsoMb: z.number().optional(),
  nodosFederadosAlcanzables: z.array(z.string()),
});
export type SystemHealthReport = z.infer<typeof SystemHealthReportSchema>;
