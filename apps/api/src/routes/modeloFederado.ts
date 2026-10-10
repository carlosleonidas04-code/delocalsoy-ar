import { Router, type Request, type Response } from 'express';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { prisma } from '@delocalsoy/db';
import { xaddEventReference } from '@delocalsoy/redis';

/**
 * Compuerta Pre-C5 — validación de integridad referencial del schema Prisma REAL.
 *
 * Adaptación honesta (R4/R15) del handoff [agent: google] → [agent: vibe]
 * (Refs #109, #114, ADR-034, rama agent-google/estaciones-01-05-lentes-01-04):
 * la versión de staging declaraba 19 modelos y 7 aristas contra un linaje que
 * no es el de este repositorio. Esta ruta verifica el ESTADO REAL de main:
 *
 * - packages/db/prisma/schema.prisma se lee y parsea en cada invocación
 *   (nada hardcodeado que pueda desincronizarse del schema);
 * - los 11 modelos canónicos y las 6 aristas @relation declaradas;
 * - 0 registros huérfanos consultando PostgreSQL cuando la base responde;
 * - sin base, o con respuesta no verificable, la compuerta NO se abre
 *   (c5GateUnlocked: false) — staging propone, GitHub acredita (R15).
 *
 * Sello: si y solo si la compuerta se abre, se registra en events_raw el
 * evento 'system.contracts_pre_c5_validated' con hash determinista
 * (idempotente por @unique(hash)) y referencia al transporte Redis
 * (fail-open, ADR-032). El tipo system.* se escribe aquí como sello
 * interno — nunca aceptado por la ingesta pública (H-01).
 */
const router: Router = Router();

// Estado canónico del schema en main (11 modelos, 6 aristas @relation).
// Se contrasta contra el archivo real en cada invocación: si el schema
// cambia, la compuerta refleja el estado real, no esta lista (R4/R15).
const EXPECTED_MODELS: readonly string[] = [
  'events_raw',
  'evidencias',
  'territorios',
  'nodos',
  'capas',
  'categorias',
  'features',
  'reportes',
  'usuarios',
  'event_projections',
  'activos',
];

interface ExpectedEdge {
  child: string;
  fk: string;
  parent: string;
  // null = relación opcional sin onDelete declarado (default de Prisma)
  onDelete: string | null;
}

const EXPECTED_EDGES: ExpectedEdge[] = [
  { child: 'capas', fk: 'nodo_id', parent: 'nodos', onDelete: 'Cascade' },
  { child: 'categorias', fk: 'nodo_id', parent: 'nodos', onDelete: 'Cascade' },
  { child: 'categorias', fk: 'capa_id', parent: 'capas', onDelete: null },
  { child: 'features', fk: 'nodo_id', parent: 'nodos', onDelete: 'Cascade' },
  { child: 'features', fk: 'capa_id', parent: 'capas', onDelete: 'Cascade' },
  { child: 'reportes', fk: 'nodo_id', parent: 'nodos', onDelete: 'Cascade' },
];

// Consultas de huérfanos: solo nombres internos constantes — sin input del usuario.
const ORPHAN_QUERIES: Array<{ edge: string; sql: string }> = [
  { edge: 'capas.nodo_id → nodos.id', sql: 'SELECT COUNT(*)::int AS orphan_count FROM capas c LEFT JOIN nodos p ON p.id = c.nodo_id WHERE c.nodo_id IS NOT NULL AND p.id IS NULL' },
  { edge: 'categorias.nodo_id → nodos.id', sql: 'SELECT COUNT(*)::int AS orphan_count FROM categorias c LEFT JOIN nodos p ON p.id = c.nodo_id WHERE c.nodo_id IS NOT NULL AND p.id IS NULL' },
  { edge: 'categorias.capa_id → capas.id', sql: 'SELECT COUNT(*)::int AS orphan_count FROM categorias c LEFT JOIN capas p ON p.id = c.capa_id WHERE c.capa_id IS NOT NULL AND p.id IS NULL' },
  { edge: 'features.nodo_id → nodos.id', sql: 'SELECT COUNT(*)::int AS orphan_count FROM features c LEFT JOIN nodos p ON p.id = c.nodo_id WHERE c.nodo_id IS NOT NULL AND p.id IS NULL' },
  { edge: 'features.capa_id → capas.id', sql: 'SELECT COUNT(*)::int AS orphan_count FROM features c LEFT JOIN capas p ON p.id = c.capa_id WHERE c.capa_id IS NOT NULL AND p.id IS NULL' },
  { edge: 'reportes.nodo_id → nodos.id', sql: 'SELECT COUNT(*)::int AS orphan_count FROM reportes c LEFT JOIN nodos p ON p.id = c.nodo_id WHERE c.nodo_id IS NOT NULL AND p.id IS NULL' },
];

function schemaCandidates(): string[] {
  const candidates: string[] = [];
  if (process.env.DELOCALSOY_PRISMA_SCHEMA) {
    candidates.push(process.env.DELOCALSOY_PRISMA_SCHEMA);
  }
  try {
    // apps/api/src/routes/ → raíz del monorepo (válido también tras build con
    // la misma profundidad de directorios).
    candidates.push(fileURLToPath(new URL('../../../../packages/db/prisma/schema.prisma', import.meta.url)));
  } catch {
    // estructura de build distinta — se prueban las rutas relativas al cwd
  }
  candidates.push(`${process.cwd()}/packages/db/prisma/schema.prisma`);
  candidates.push(`${process.cwd()}/../../packages/db/prisma/schema.prisma`);
  return candidates;
}

interface DeclaredEdge {
  child: string;
  fk: string;
  parent: string;
  pk: string;
  onDelete: string | null;
}

function parseSchema(source: string): { models: string[]; edges: DeclaredEdge[] } {
  const models: string[] = [];
  const edges: DeclaredEdge[] = [];
  const blockRe = /^model\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{([\s\S]*?)^\}/gm;
  let block: RegExpExecArray | null;
  while ((block = blockRe.exec(source)) !== null) {
    const model = block[1];
    models.push(model);
    // Línea de relación: `campo Tipo? @relation(fields: [...], references: [...], onDelete: ...)`
    const relRe = /^\s*[A-Za-z_][A-Za-z0-9_]*\s+([A-Za-z_][A-Za-z0-9_]*)\??\s+@relation\(([^)]*)\)/gm;
    let rel: RegExpExecArray | null;
    while ((rel = relRe.exec(block[2])) !== null) {
      const parent = rel[1];
      const args = rel[2];
      const fk = /\bfields\s*:\s*\[([^\]]*)\]/
        .exec(args)?.[1]
        ?.split(',')
        .map((s) => s.trim())
        .filter(Boolean)[0];
      const pk = /\breferences\s*:\s*\[([^\]]*)\]/
        .exec(args)?.[1]
        ?.split(',')
        .map((s) => s.trim())
        .filter(Boolean)[0];
      const onDelete = /\bonDelete\s*:\s*(\w+)/.exec(args)?.[1] ?? null;
      if (fk && pk) {
        edges.push({ child: model, fk, parent, pk, onDelete });
      }
    }
  }
  return { models, edges };
}

router.post('/validate-prisma-referential-integrity', async (_req: Request, res: Response) => {
  // 1) Leer el schema real — si no se puede leer, la compuerta queda bloqueada.
  let source: string;
  try {
    let read: string | null = null;
    for (const candidate of schemaCandidates()) {
      try {
        read = await readFile(candidate, 'utf8');
        break;
      } catch {
        // siguiente candidato
      }
    }
    if (read === null) {
      throw new Error('schema.prisma no encontrado en ningún candidato');
    }
    source = read;
  } catch (err) {
    console.error('[contracts] schema:', err instanceof Error ? err.message : String(err));
    res.status(500).json({
      success: false,
      error: 'schema.prisma no legible — compuerta C5 bloqueada',
      c5GateUnlocked: false,
    });
    return;
  }

  // 2) Modelos canónicos del estado real.
  const parsed = parseSchema(source);
  const missingModels = EXPECTED_MODELS.filter((m) => !parsed.models.includes(m));
  const unexpectedModels = parsed.models.filter((m) => !EXPECTED_MODELS.includes(m));
  const modelsOk = missingModels.length === 0 && unexpectedModels.length === 0;

  // 3) Aristas @relation declaradas vs esperadas.
  const edgeResults = EXPECTED_EDGES.map((expected) => {
    const declared = parsed.edges.find(
      (e) => e.child === expected.child && e.fk === expected.fk && e.parent === expected.parent,
    );
    const onDeleteOk =
      declared != null &&
      ((expected.onDelete === null && declared.onDelete === null) ||
        declared.onDelete === expected.onDelete);
    return {
      edge: `${expected.child}.${expected.fk} → ${expected.parent}.id`,
      policy: declared == null ? 'arista ausente' : `onDelete: ${declared.onDelete ?? 'default (sin declaración)'}`,
      status: declared != null && onDeleteOk ? 'ok' : 'fallo',
    };
  });
  const edgesOk = edgeResults.every((e) => e.status === 'ok');

  // 4) Huérfanos contra PostgreSQL — solo si la base responde (R5 honesto).
  let dbAvailable = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbAvailable = true;
  } catch {
    dbAvailable = false;
  }

  let orphanRecordsCount: number | null = null;
  const orphanByEdge: Record<string, number> = {};
  let orphanReliable = false;
  if (dbAvailable) {
    try {
      let total = 0;
      let allNumeric = true;
      for (const q of ORPHAN_QUERIES) {
        const rows = (await prisma.$queryRawUnsafe(q.sql)) as Array<{ orphan_count?: unknown }>;
        const n = rows?.[0]?.orphan_count;
        if (typeof n !== 'number' || !Number.isFinite(n)) {
          allNumeric = false;
          break;
        }
        orphanByEdge[q.edge] = n;
        total += n;
      }
      if (allNumeric) {
        orphanRecordsCount = total;
        orphanReliable = true;
      }
    } catch {
      orphanRecordsCount = null;
      orphanReliable = false;
    }
  }
  const orphansOk = orphanReliable && orphanRecordsCount === 0;

  const c5GateUnlocked = modelsOk && edgesOk && orphansOk;

  // 5) Sello idempotente en events_raw — SOLO si la compuerta se abre.
  // Hash determinista sobre el resultado: revalidar sin cambios no crea filas.
  let seal: { type: string; hash: string; sealedAt: string } | null = null;
  if (c5GateUnlocked) {
    const payload = {
      modelsVerified: parsed.models.length,
      edgesVerified: edgeResults.filter((e) => e.status === 'ok').length,
      orphanRecordsCount,
      gate: 'unlocked',
      via: 'POST /api/contracts/validate-prisma-referential-integrity',
    };
    const hash = createHash('sha256')
      .update('system.contracts_pre_c5_validated|' + JSON.stringify(payload))
      .digest('hex');
    try {
      const existing = await prisma.events_raw.findUnique({ where: { hash } });
      const sealed =
        existing ??
        (await prisma.events_raw.create({
          data: { type: 'system.contracts_pre_c5_validated', payload, hash, occurred_at: new Date() },
        }));
      seal = { type: sealed.type, hash: sealed.hash, sealedAt: sealed.occurred_at.toISOString() };
      if (!existing) {
        try {
          await xaddEventReference('events:raw', {
            event_id: sealed.id,
            type: sealed.type,
            hash: sealed.hash,
            occurred_at: sealed.occurred_at.toISOString(),
          });
        } catch {
          // fail-open (ADR-032): events_raw es la verdad, el stream es transporte
        }
      }
    } catch (err) {
      console.error('[contracts] sellar:', err instanceof Error ? err.message : String(err));
    }
  }

  res.json({
    success: c5GateUnlocked,
    validatedAt: new Date().toISOString(),
    schema: {
      modelsExpected: EXPECTED_MODELS.length,
      modelsVerified: parsed.models.length,
      allModelsPresent: modelsOk,
      missingModels,
      unexpectedModels,
    },
    referentialEdges: {
      expected: EXPECTED_EDGES.length,
      verified: edgeResults.filter((e) => e.status === 'ok').length,
      edges: edgeResults,
    },
    orphanCheck: {
      executed: dbAvailable,
      reliable: orphanReliable,
      source: dbAvailable ? 'postgres' : 'unavailable',
      orphanRecordsCount,
      byEdge: Object.keys(orphanByEdge).length > 0 ? orphanByEdge : null,
    },
    c5GateUnlocked,
    seal,
    message: c5GateUnlocked
      ? `Integridad referencial Prisma verificada (${parsed.models.length}/${EXPECTED_MODELS.length} modelos · ${edgeResults.filter((e) => e.status === 'ok').length}/${EXPECTED_EDGES.length} aristas @relation · 0 huérfanos en postgres) → Compuerta C5 HABILITADA`
      : `Compuerta C5 BLOQUEADA — modelos: ${modelsOk ? 'ok' : 'fallo'} · aristas: ${edgesOk ? 'ok' : 'fallo'} · huérfanos: ${orphansOk ? 'ok' : dbAvailable ? 'no verificable' : 'base no disponible'} (R5: sin salida real, sin acreditación)`,
  });
});

export default router;
