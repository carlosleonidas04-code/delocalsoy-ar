/**
 * packages/contracts/src/comercios.ts
 * -----------------------------------------------------------------------------
 * DELocalSoy.AR — Contratos del Mercado de Proximidad (MARKET-CAP MK-1)
 * Issue #243 (sub-epica #152) - Diseno MK-0 ratificado 5/5 decisiones (2026-10-17)
 * -----------------------------------------------------------------------------
 * Fuente unica de validacion del dominio comercial: alta de comercios,
 * habilitacion comercial (municipal / Ley 104-A / silencio positivo ley
 * 02-07-2026), titularidad verificada y ficha publica. La ficha 1:1 vive en la
 * tabla comercio_ficha (MK-1, Prisma) y SOLO contiene dominio especifico:
 * estado, visibilidad, consentimiento, procedencia y pseudonimo viven en
 * `activos` (no se duplican -leccion #161). SIN PII de contacto en v1 (decision
 * DH: relay por plataforma - MK-4 evaluara bandejas). Frontera de dominio: la
 * habilitacion COMERCIAL vive aqui; la del prestador turistico (Ley 2400-T)
 * vive en activos_operativa.habilitacion (VIG-005).
 *
 * Nota de circularidad: ComercioNodoKeySchema espeja SanJuanNodeSlugSchema
 * (index.ts) sin importarlo - index.ts re-exporta este modulo. Unificar si los
 * contratos se reorganizan en modulos sin indice-cascara (deuda documentada).
 */

import { z } from 'zod';

// Espejo de SanJuanNodeSlugSchema (index.ts) - ver nota de circularidad arriba.
// Multinodo desde dia 1 (decision DH ratificada 2026-10-17, traza #243).
export const ComercioNodoKeySchema = z.enum(['capital', 'caucete', 'iglesia']);

// ─── Habilitacion comercial (epistemica - ADR-035) ───

// Estados honestos de la habilitacion: 'verificada' SOLO con evidencia primaria
// completa (refine abajo); 'silencio_positivo' es estado legal verificable con
// fuente normativa (ley 02-07-2026, 30 dias habiles); 'sin_dato' != clandestino
// (microcopia honesta con camino al Registro Unico Municipal de Artesanos, R15).
export const ComercioHabilitacionEstadoSchema = z.enum([
  'verificada', 'en_tramite', 'silencio_positivo', 'unknown', 'sin_dato'
]);

export const ComercioHabilitacionSchema = z.object({
  estado: ComercioHabilitacionEstadoSchema,
  tipo: z.enum(['municipal', 'provincial_104a']).optional(),
  numero: z.string().max(60).optional(), // expediente/numero de habilitacion
  fuente_key: z.string().regex(/^[a-z0-9_]+$/).optional(), // -> fuentes.key
  url: z.string().url().optional(),
  fecha_verificacion: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  fecha_presentacion: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // silencio positivo
}).superRefine((h, ctx) => {
  if (h.estado === 'verificada') {
    // ADR-035: verificada SOLO con evidencia primaria completa
    for (const campo of ['tipo', 'numero', 'fuente_key', 'url', 'fecha_verificacion'] as const) {
      if (!h[campo]) ctx.addIssue({ code: 'custom', message: 'ADR-035: habilitacion verificada exige evidencia primaria completa', path: [campo] });
    }
  }
  if (h.estado === 'silencio_positivo' && !h.fecha_presentacion) {
    ctx.addIssue({ code: 'custom', message: 'silencio_positivo exige fecha_presentacion (ley 02-07-2026)', path: ['fecha_presentacion'] });
  }
});
export type ComercioHabilitacion = z.infer<typeof ComercioHabilitacionSchema>;

// ─── Atributos del comercio ───

export const ComercioAtributosSchema = z.object({
  venta_directa: z.boolean().default(false),
  delivery: z.boolean().default(false),
  pagos: z.array(z.enum(['efectivo', 'qr', 'debito', 'credito'])).default([]),
  accesibilidad: z.enum(['verificada', 'declarada', 'unknown']).default('unknown'),
  feria_espacio_publico: z.string().regex(/^[a-z0-9_]+$/).optional(), // -> feature public_space
}).strict();
export type ComercioAtributos = z.infer<typeof ComercioAtributosSchema>;

// ─── Titularidad (reclamo verificado - sin PII en claro) ───

// sin_reclamo -> reclamada -> verificada (+ desistida). El identificador
// (expediente/cuit) se persiste SOLO como hash en el sello (Ley 25.326).
// Solo titularidad 'verificada' habilita la edicion por el titular.
export const ComercioTitularidadSchema = z.object({
  estado: z.enum(['sin_reclamo', 'reclamada', 'verificada', 'desistida']).default('sin_reclamo'),
  metodo: z.enum(['expediente', 'cuit']).optional(),
  verificado_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
export type ComercioTitularidad = z.infer<typeof ComercioTitularidadSchema>;

// ─── Alta: activo (local|prestador) + ficha en transaccion atomica ───

// Alta: crea activo (tipo local|prestador) + ficha en una transaccion atomica.
// El consentimiento granular viaja en activos.consentimiento (VIG-002) - NO se
// duplica. Los campos de texto pasan el anti-PII de la API ANTES de persistir
// (ADR-020 cond. 1 - el contrato valida forma; la politica de PII es de la API).
// rubro_id: join por codigo, nunca por nombre - acepta el canon de 11 rubros
// (TAXONOMIA_DIRECTORIO_CANONICA: food_drink, retail, ...) y los codigos legados
// cat-* (TAXONOMIA_CANONICA_DELOCALSOY). Hallazgo del contraste: el regex
// verbatim del MK-0 (solo cat-*) excluia el canon ratificado el mismo dia -
// ampliacion documentada en la traza del PR y en #243.
export const ComercioAltaSchema = z.object({
  nodo_key: ComercioNodoKeySchema, // multinodo desde dia 1 (principio 5)
  subnodo_key: z.string().regex(/^[a-z0-9_]+$/).optional(),
  titulo: z.string().min(3).max(120),
  descripcion: z.string().max(2000).optional(), // anti-PII en la ruta antes de persistir
  rubro_id: z.string().regex(/^[a-z][a-z0-9_-]*(\.[a-z0-9_-]+)?$/, 'rubro_id: codigo del canon (food_drink) o legado (cat-*)'),
  tipo: z.enum(['local', 'prestador']),
  lat: z.number().min(-90).max(90).optional(), // R15: punto propio solo con fuente
  lng: z.number().min(-180).max(180).optional(),
  atributos: ComercioAtributosSchema.default({ venta_directa: false, delivery: false, pagos: [], accesibilidad: 'unknown' }),
  habilitacion: ComercioHabilitacionSchema.default({ estado: 'sin_dato' }),
});
export type ComercioAlta = z.infer<typeof ComercioAltaSchema>;

// ─── Moderacion y ciclo de vida (matriz sellada - patron CORE-005 R1) ───

// La ficha reutiliza los estados de activos (no crea enum nuevo):
// propuesto -> aprobado | rechazado (+ archivado; rechazado nunca publico).
export const COMERCIO_TRANSICIONES: Record<string, string[]> = {
  propuesto: ['aprobado', 'rechazado'],
  aprobado: ['rechazado', 'archivado'],
  rechazado: ['propuesto'],
  archivado: ['propuesto'],
};

export const ComercioEstadoCambioSchema = z.object({
  estado: z.enum(['propuesto', 'aprobado', 'rechazado', 'archivado']),
  justificacion: z.string().min(10, 'ADR-038: justificacion publica obligatoria'), // anti-PII en la ruta
});
export type ComercioEstadoCambio = z.infer<typeof ComercioEstadoCambioSchema>;

// ─── Reclamo de titularidad (ciudadano -> verificacion moderador|admin) ───

export const ComercioReclamoTitularSchema = z.object({
  metodo: z.enum(['expediente', 'cuit']),
  identificador: z.string().min(4).max(60), // se persiste SOLO como hash (Ley 25.326)
  declaracion_consentimiento: z.literal(true), // nunca pre-marcado (ADR-027)
});
export type ComercioReclamoTitular = z.infer<typeof ComercioReclamoTitularSchema>;

// ─── Ficha publica (lectura GET /api/comercios/:id) ───

// estado_epistemico mapea la ficha a los 4 estados honestos de UI:
// habilitacion 'verificada' => verified; titularidad 'verificada' sin
// habilitacion primaria => community_validated; 'propuesto' => pending;
// is_synthetic => synthetic_demo (R15, tokens --honest-*, ADR-034).
export const ComercioFichaPublicaSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  rubro: z.object({ id: z.string(), rama: z.string().nullable(), label: z.string().nullable() }),
  estado: z.string(),
  habilitacion: ComercioHabilitacionSchema,
  titularidad: ComercioTitularidadSchema,
  atributos: ComercioAtributosSchema,
  subnodo_key: z.string().nullable(),
  // fuente epistemica del sello visible (4 estados honestos - UI F-3)
  estado_epistemico: z.enum(['verified', 'community_validated', 'pending', 'synthetic_demo']),
});
export type ComercioFichaPublica = z.infer<typeof ComercioFichaPublicaSchema>;
