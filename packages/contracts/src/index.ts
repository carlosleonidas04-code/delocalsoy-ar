import { PrismaClient } from '@prisma/client';

let prisma: any;
try {
  prisma = new PrismaClient();
} catch (err) {
  // R5: el mock existe SOLO en pruebas (NODE_ENV=test). Fuera de pruebas,
  // sin base de datos se falla ruidosamente (Aterrizaje PR 1 — issue #20).
  if (process.env.NODE_ENV === 'test') {
    console.warn('[test] Database not connected — using mock');
    const noOp = {
      findMany: async () => [],
      findFirst: async () => null,
      findUnique: async () => null,
      count: async () => 0,
      create: async (d: any) => d?.data ?? {},
      update: async (d: any) => d?.data ?? {},
      delete: async () => ({}),
      $queryRaw: async () => [],
    };
    prisma = new Proxy({}, { get: () => noOp });
  } else {
    throw err;
  }
}

export { prisma };
export * from '@prisma/client';
export * from './kpi.js';

// ─── NODO-VIG VIG-006 (NVIG-R8 #188, épica #167): RAG territorial ético ───

// Origen de los fragmentos del índice rag_index (recompute idempotente por
// (nodo_key, source_type, source_id) — patrón kpi_snapshots): SOLO contenido
// autorizado. Nunca ingiere: restricted (ADR-036), el campo `sensible` de
// custodia (VIG-004), consentimiento, PII ni huérfanas (Ley 25.326, R15).
export const RagSourceTypeSchema = z.enum(["subnodo", "activo", "kpi"]);

// Dominio interpretativo de la respuesta (plantillas autorizadas v1 sin LLM —
// decisión DH ratificada 2026-10-14: nada generado, sin plantilla → null
// honesto). territorial = fragmentos de estructura territorial o KPIs.
export const AskDominioSchema = z.enum([
  "patrimonial",
  "productivo_rural",
  "turistico",
  "territorial",
]);

// Fuente citable de un fragmento (ADR-035): la fecha es opcional cuando la
// fuente no la publica (p. ej. catálogos de referencia sin corte temporal).
export const AskFuenteSchema = z.object({
  fuente: z.string().trim().min(1, "fuente requerida").max(160),
  fecha: z.string().trim().max(20).optional(),
});

// Consulta territorial ética (POST /api/nodos/:key/ask, público anónimo —
// decisión DH ratificada 2026-10-14): longitud acotada como anti-abuso;
// filtros opcionales por subnodo (distrito/paraje) y capital N1.
export const AskPreguntaSchema = z.object({
  pregunta: z.string().trim().min(3, "La pregunta requiere al menos 3 caracteres").max(300),
  subnodo: z
    .string()
    .trim()
    .regex(/^[a-z0-9_]+$/, "subnodo: slug en minúsculas y guiones bajos")
    .max(60)
    .optional(),
  n1: ActivoCapitalN1Schema.optional(),
});

// Fragmento recuperado del índice: prosa autorizada + sus fuentes.
export const AskFragmentoSchema = z.object({
  source_type: RagSourceTypeSchema,
  source_id: z.string(),
  subnodo_key: z.string().nullable(),
  texto: z.string(),
  fuentes: z.array(AskFuenteSchema),
});

// Respuesta ética (Dato–Interpretación–Sugerencia, reglas §17 del VIG-000):
// el dato son hechos recuperados con fuente; la interpretación y la
// sugerencia son PLANTILLAS AUTORIZADAS del dominio dominante (nada
// generado) — o null honesto si ninguna aplica. confidence se DERIVA de la
// cobertura de fuentes (fragmentos con procedencia / total), nunca se
// declara a mano. Toda respuesta nace human_review: "pending" (revisión
// humana habilitada — Bloque 11 del VIG-000).
export const RespuestaAskSchema = z.object({
  nodo_key: SanJuanNodeSlugSchema,
  pregunta: z.string(),
  dato: z.array(AskFragmentoSchema),
  dominio: AskDominioSchema.nullable(),
  interpretacion: z.string().nullable(),
  sugerencia: z.string().nullable(),
  fuentes: z.array(AskFuenteSchema),
  confidence: z.number().min(0).max(1),
  recovered: z.number().int().min(0),
  human_review: z.literal("pending"),
});
