import { Router, type Request, type Response } from 'express';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '@delocalsoy/db';
import { xaddEventReference } from '@delocalsoy/redis';
import {
  SALUD_INDICADORES,
  SaludAgregadoAltaSchema,
  SaludAgregadoRowSchema,
  SaludCatalogoResponseSchema,
} from '@delocalsoy/contracts';
import { requireJwt, requireRole } from '../lib/auth.js';

/**
 * Salud urbana — LIC-DLUI LIC-R6 (LIC-06 #449, épica #448).
 *
 * DL-11 ratificado: SOLO agregados oficiales federados VÍA ingestas (patrón
 * EV-049). La salud individual es dato sensible PROHIBIDO (Ley 25.326):
 * esta superficie no registra personas, casos ni eventos individuales —
 * solo conteos departamentales/anuales publicados por organismos oficiales
 * (REFES/DEIS). Sin campos de texto libre en el alta: superficie PII cero
 * por construcción.
 *
 * GET /api/salud — catálogo público anónimo (criterio de cierre #449):
 * indicadores declarados × nodos con estado honesto. La clave declarada SIN
 * fuente ingestado queda `sin_fuente_ingestada` con valor null (R15:
 * null ≠ 0 — la brecha es visible, jamás estimada); el agregado ya cargado
 * pero cuya ingesta aún no está publicada queda `en_custodia` con valor null
 * (NC-EV-09: el pipeline en curso queda para custodia, patrón fuentes.ts).
 * Cobertura honesta «X de Y» pares publicados — conteo CON cobertura, NUNCA
 * un ranking de salud entre nodos (R5/ADR-036).
 *
 * POST /api/salud/agregados — alta curada por ADMIN (R15 estricta, patrón
 * ingestas, decisión DH 2026-10-15): el agregado cita su ingesta del
 * pipeline; la ruta verifica que la fuente declarada coincida con la de la
 * ingesta (el agregado no viaja suelto, NC-EV-09). Hash único → idempotencia
 * del alta. Sello `salud.agregado_ingestado` en events_raw con rollback
 * (R4/R15): sin sello no hay escritura acreditada.
 */

const router: Router = Router();

const DOMINIO = 'salud_urbana';
const REGLA =
  'Solo agregados oficiales federados vía ingestas (DL-11) — la salud individual es dato sensible prohibido (Ley 25.326); sin fuente ingestado el valor es null, nunca 0 (R15)';
const CAUTELA =
  'Conteos departamentales/anuales publicados por organismos oficiales (REFES/DEIS) federados por ingesta del pipeline de procedencia — jamás registros ni casos individuales (Ley 25.326); NUNCA ranking de salud entre nodos (R5/ADR-036); el agregado cuya ingesta aún no está publicada queda en custodia y no se lee (NC-EV-09)';

// Pseudónimo del admin: sha256(usuario_id) truncado — irreversible, sin PII.
function seudonimo(usuarioId: string): string {
  return createHash('sha256').update(usuarioId).digest('hex').slice(0, 32);
}

// Sello idempotente en events_raw (fuente de verdad) + referencia al stream
// (transporte ADR-032, fail-open). El payload es NO-PII por construcción.
async function sellarEvento(type: string, payload: Record<string, unknown>): Promise<void> {
  const occurredAt = new Date();
  const hash = createHash('sha256')
    .update(type + '|' + occurredAt.toISOString() + '|' + JSON.stringify(payload))
    .digest('hex');
  const event = await prisma.events_raw.create({
    data: { type, payload: payload as object, hash, occurred_at: occurredAt },
  });
  await xaddEventReference('events:raw', {
    event_id: event.id,
    type: event.type,
    hash: event.hash,
    occurred_at: event.occurred_at.toISOString(),
  });
}

// Filas tipadas de las lecturas: el cliente prisma se exporta `any` (patrón
// mock de pruebas en lib/prisma), así que la forma de las filas se declara
// explícita para que la lectura siga chequeada en tsc.
type AgregadoRow = {
  id: string;
  nodo_key: string;
  indicador: string;
  periodo: string;
  valor: number;
  fuente_key: string;
  ingesta_id: string;
  created_by_hash: string;
  hash: string;
  created_at: Date;
  updated_at: Date;
};

type IngestaRow = {
  id: string;
  source_id: string;
  fuente_key: string;
  fecha_corte: string;
  estado: string;
  nodo_key: string;
};

// Catálogo público: indicadores declarados × nodos, con estado honesto por
// par (nodo, indicador). Lectura derivada de salud_agregados × ingestas —
// SOLO se lee el agregado cuya ingesta esté 'publicado' (NC-EV-09).
async function estadoSalud() {
  const nodos = await prisma.nodos.findMany({ select: { key: true } });
  const clavesNodo = nodos
    .map((n: any) => n.key as string)
    .sort((a: string, b: string) => a.localeCompare(b));

  const agregados = (await prisma.salud_agregados.findMany({
    select: {
      id: true,
      nodo_key: true,
      indicador: true,
      periodo: true,
      valor: true,
      fuente_key: true,
      ingesta_id: true,
      created_by_hash: true,
      hash: true,
      created_at: true,
      updated_at: true,
    },
    orderBy: [{ nodo_key: 'asc' }, { indicador: 'asc' }, { periodo: 'desc' }, { created_at: 'desc' }],
  })) as AgregadoRow[];
  const ingestas = (await prisma.ingestas.findMany({
    select: { id: true, source_id: true, fuente_key: true, fecha_corte: true, estado: true },
  })) as IngestaRow[];
  const ingestaPorId = new Map<string, IngestaRow>(ingestas.map((i) => [i.id, i]));

  // El ÚLTIMO agregado por (nodo, indicador) define el estado del par.
  const ultimo = new Map<string, AgregadoRow>();
  for (const a of agregados) {
    const k = a.nodo_key + '|' + a.indicador;
    if (!ultimo.has(k)) ultimo.set(k, a);
  }

  let publicados = 0;
  let total = 0;
  const nodosOut = clavesNodo.map((nodo_key) => ({
    nodo_key,
    pares: SALUD_INDICADORES.map((ind) => {
      total += 1;
      const a = ultimo.get(nodo_key + '|' + ind.key) ?? null;
      const ingesta = a ? (ingestaPorId.get(a.ingesta_id) ?? null) : null;
      if (a && ingesta && ingesta.estado === 'publicado') {
        publicados += 1;
        return {
          indicador: ind.key,
          nombre: ind.nombre,
          unidad: ind.unidad,
          organismo: ind.organismo,
          periodo: a.periodo,
          valor: a.valor,
          estado: 'publicado' as const,
          procedencia: {
            fuente_key: ingesta.fuente_key,
            source_id: ingesta.source_id,
            fecha_corte: ingesta.fecha_corte,
          },
        };
      }
      // R15/NC-EV-09: sin fuente ingestado → null honesto; con agregado cuya
      // ingesta no está publicada → en custodia, valor null (jamás filtrado).
      return {
        indicador: ind.key,
        nombre: ind.nombre,
        unidad: ind.unidad,
        organismo: ind.organismo,
        periodo: null,
        valor: null,
        estado: a ? ('en_custodia' as const) : ('sin_fuente_ingestada' as const),
        procedencia: null,
      };
    }),
  }));

  return { nodos: nodosOut, cobertura: `${publicados} de ${total}`, total, publicados };
}

// GET /api/salud — catálogo público anónimo: indicadores declarados × nodos
// con estado honesto por par + cobertura «X de Y» (criterio de cierre #449).
router.get('/', async (_req: Request, res: Response) => {
  try {
    const { nodos, cobertura } = await estadoSalud();
    const data = {
      dominio: DOMINIO,
      regla: REGLA,
      cautela: CAUTELA,
      indicadores: SALUD_INDICADORES.map((i) => ({
        key: i.key,
        nombre: i.nombre,
        unidad: i.unidad,
        organismo: i.organismo,
      })),
      nodos,
      cobertura,
    };
    SaludCatalogoResponseSchema.parse(data);
    res.json({ success: true, data, count: nodos.length });
  } catch (err) {
    // AUD-06 (#100): el detalle queda server-side, nunca en la respuesta.
    console.error('[salud] catálogo:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al armar el catálogo de salud' });
  }
});

// POST /api/salud/agregados — alta curada por admin (R15 estricta, patrón
// ingestas): el agregado cita su ingesta del pipeline de procedencia y la
// fuente declarada debe coincidir con la de la ingesta (NC-EV-09). Sin
// campos de texto libre → superficie PII cero (Ley 25.326). Idempotencia
// por hash único; sello con rollback (R4/R15).
router.post('/agregados', requireJwt, requireRole('admin'), async (req: Request, res: Response) => {
  let parsed: z.infer<typeof SaludAgregadoAltaSchema>;
  try {
    parsed = SaludAgregadoAltaSchema.parse(req.body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'datos inválidos', details: error.issues });
      return;
    }
    throw error;
  }

  // El agregado NO viaja suelto (NC-EV-09): la ingesta acredita fuente del
  // catálogo, fecha de corte y CRS del conjunto federado.
  const ingesta = (await prisma.ingestas.findUnique({ where: { id: parsed.ingesta_id } })) as
    | IngestaRow
    | null;
  if (!ingesta) {
    res.status(404).json({ success: false, error: 'ingesta no encontrada — el agregado se federa vía el pipeline de procedencia' });
    return;
  }

  // Integridad de procedencia (DL-11): la fuente declarada en el alta debe
  // coincidir con la de la ingesta que federó el conjunto.
  if (ingesta.fuente_key !== parsed.fuente_key) {
    res.status(400).json({ success: false, error: 'fuente_key no coincide con la fuente de la ingesta declarada' });
    return;
  }

  const usuario = res.locals.usuario as { id: string };
  const autor = seudonimo(usuario.id);
  // Idempotencia: mismo agregado (fuente+nodo+indicador+período+valor+ingesta)
  // = una sola fila. El hash único es la compuerta.
  const hash = createHash('sha256')
    .update(parsed.fuente_key + '|' + ingesta.nodo_key + '|' + parsed.indicador + '|' + parsed.periodo + '|' + parsed.valor + '|' + parsed.ingesta_id)
    .digest('hex');

  try {
    const existente = await prisma.salud_agregados.findUnique({ where: { hash } });
    if (existente) {
      res.status(200).json({ success: true, data: existente, idempotente: true });
      return;
    }

    const agregado = await prisma.salud_agregados.create({
      data: {
        nodo_key: ingesta.nodo_key,
        indicador: parsed.indicador,
        periodo: parsed.periodo,
        valor: parsed.valor,
        fuente_key: parsed.fuente_key,
        ingesta_id: parsed.ingesta_id,
        created_by_hash: autor,
        hash,
      },
    });

    // Sello del sistema: 'salud.agregado_ingestado' sin PII — el payload
    // lleva claves de procedencia; el detalle vive en salud_agregados.
    try {
      await sellarEvento('salud.agregado_ingestado', {
        agregado_id: agregado.id,
        nodo_key: agregado.nodo_key,
        indicador: agregado.indicador,
        periodo: agregado.periodo,
        fuente_key: agregado.fuente_key,
        ingesta_id: agregado.ingesta_id,
        created_by_hash: autor,
      });
    } catch (err) {
      // Rollback (R4/R15): sin evento no hay escritura acreditada.
      await prisma.salud_agregados.delete({ where: { id: agregado.id } }).catch(() => undefined);
      console.error('[salud] sellar agregado:', err instanceof Error ? err.message : String(err));
      res.status(500).json({ success: false, error: 'fallo al sellar el agregado' });
      return;
    }

    const fila = {
      id: agregado.id,
      nodo_key: agregado.nodo_key,
      indicador: agregado.indicador,
      periodo: agregado.periodo,
      valor: agregado.valor,
      fuente_key: agregado.fuente_key,
      ingesta_id: agregado.ingesta_id,
      created_by_hash: agregado.created_by_hash,
      created_at: agregado.created_at.toISOString(),
    };
    SaludAgregadoRowSchema.parse(fila);
    res.status(201).json({ success: true, data: fila });
  } catch (err) {
    // Carrera de idempotencia (P2002 en hash).
    const code = (err as { code?: string } | null)?.code;
    if (code === 'P2002') {
      const existente = await prisma.salud_agregados.findUnique({ where: { hash } });
      if (existente) {
        res.status(200).json({ success: true, data: existente, idempotente: true });
        return;
      }
    }
    // AUD-06 (#100): el detalle queda en stdout del servidor, nunca en la respuesta.
    console.error('[salud] crear agregado:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al crear el agregado' });
  }
});

export default router;
