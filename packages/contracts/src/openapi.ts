/**
 * packages/contracts/src/openapi.ts
 * -----------------------------------------------------------------------------
 * DELocalSoy.AR — Contratos OpenAPI 3.1 & Tipos de Intercambio Territorial
 * Serie Contracts NCAP-R2 · Interoperabilidad Federada
 * -----------------------------------------------------------------------------
 */

import { z } from 'zod';

export const ApiEndpointMetaSchema = z.object({
  path: z.string(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
  summary: z.string(),
  description: z.string().optional(),
  tags: z.array(z.string()),
  requiresAuth: z.boolean().default(false),
  scope: z.string().optional(),
});
export type ApiEndpointMeta = z.infer<typeof ApiEndpointMetaSchema>;

export const OpenApiManifestSchema = z.object({
  openapi: z.literal('3.1.0'),
  info: z.object({
    title: z.string(),
    version: z.string(),
    description: z.string(),
  }),
  servers: z.array(z.object({
    url: z.string(),
    description: z.string().optional(),
  })),
  paths: z.record(z.string(), z.record(z.string(), z.unknown())),
  security: z.array(z.record(z.string(), z.array(z.string()))).optional(),
});
export type OpenApiManifest = z.infer<typeof OpenApiManifestSchema>;
