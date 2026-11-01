import { Router, type Request, type Response } from 'express';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { prisma, Prisma } from '@delocalsoy/db';
import { xaddEventReference } from '@delocalsoy/redis';
import {
  BboxStringSchema,
  COMERCIO_TRANSICIONES,
  ComercioAltaSchema,
  ComercioAtributosSchema,
  ComercioEstadoCambioSchema,
  ComercioHabilitacionEstadoSchema,
  ComercioReclamoTitularSchema,
  TAXONOMIA_CANONICA_DELOCALSOY,
  TAXONOMIA_DIRECTORIO_CANONICA,
} from '@delocalsoy/contracts';
import { detectaPII } from '../lib/anti-pii.js';
import { requireJwt, requireRole } from '../lib/auth.js';
/**
 * MARKET-CAP MK-1 (#243, sub-épica #152): Mercado de Proximidad — ruta del
 * dominio comercial. Diseño MK-0 ratificado por la DH (2026-10-17, traza #243).
 *
 * Opción A (lección #161): el comercio ES un activo (tipo local|prestador) +
 * ficha 1:1 comercio_ficha. Estado, visibilidad, consentimiento, procedencia,
 * pseudónimo y geometría viven en activos; aquí SOLO el dominio específico
 * del mercado (rubro, atributos, habilitación COMERCIAL, titularidad).
 * Multinodo desde día 1: el scope de nodo es activos.nodo_key.
 *
 * v1 SIN pagos (MK-5 = fase 2, ADR propio Ley 24.240/AFIP) y SIN PII de
 * contacto (decisión DH: relay por plataforma, Ley 25.326 minimización).
 * Frontera de dominio: la habilitación COMERCIAL vive en comercio_ficha; la
 * del prestador turístico (Ley 2400-T) vive en activos_operativa.habilitacion.
 *
 * Toda escritura queda sellada en events_raw (R4/R15): sin sello no hay
 * escritura acreditada (rollback). MK-0 §2.4 define comercio.ingestado y
 * comercio.estado_cambiado; los sellos de titularidad y de edición de
 * atributos son extensión mínima documentada (regla del repo: toda
 * escritura queda sellada, traza del PR).
 */

const router: Router = Router(); // anotación: TS2742 declaration emit (patrón activos.ts/auth.ts)

// Multinodo desde día 1 (decisión DH, traza #243): espeja ComercioNodoKeySchema
// sin importarlo — el contrato valida la forma; aquí se reconcilia 404/400.
const NODOS_VALIDOS: string[] = ['capital', 'caucete', 'iglesia'];

// Pseudónimo (Ley 25.326, ADR-027) — mismo patrón que activos.ts.
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

// @delocalsoy/db exporta el cliente sin los tipos generados (lección #151,
// TS7006): las formas de fila se declaran explícitamente aquí.
interface ComercioFichaRow {
  activo_id: string;
  rubro_id: string;
  rubro_rama: string | null;
  atributos: Record<string, unknown>;
  habilitacion: Record<string, unknown>;
  titularidad: Record<string, unknown>;
}

interface ActivoConFicha {
  id: string;
  tipo: string;
  titulo: string;
  descripcion: string | null;
  estado: string;
  nodo_key: string;
  subnodo_key: string | null;
  lat: number | null;
  lng: number | null;
  visibilidad: string;
  is_synthetic: boolean;
  created_by_hash: string;
  hash: string | null;
  created_at: Date | string;
  comercio_ficha: ComercioFichaRow | null;
}
// Resolución de rubro por CÓDIGO, nunca por nombre (ADR-035): primero el canon
// de 11 rubros ratificado por la DH (fixture lote 3A, traza #243), luego los
// códigos legados cat-* de la taxonomía agent.google. Código desconocido =>
// label null honesto (R15): la API nunca inventa una etiqueta de rubro.
function resolverRubro(rubroId: string): { id: string; rama: string | null; label: string | null } {
  const canon = TAXONOMIA_DIRECTORIO_CANONICA.find((c) => c.code === rubroId);
  if (canon) return { id: rubroId, rama: null, label: canon.name };
  const legada = TAXONOMIA_CANONICA_DELOCALSOY.find((c) => c.idCategoria === rubroId);
  if (legada) return { id: rubroId, rama: legada.rama, label: legada.nombre };
  return { id: rubroId, rama: null, label: null };
}

// Mapa a los 4 estados honestos de UI (ComercioFichaPublicaSchema): la
// habilitación 'verificada' acredita evidencia primaria completa (ADR-035)
// => verified; cualquier otro comercio aprobado ES validación comunitaria
// (la moderación ratifica el registro comunitario) => community_validated;
// 'propuesto' => pending; is_synthetic => synthetic_demo (R15, ADR-034).
function estadoEpistemico(activo: ActivoConFicha): 'verified' | 'community_validated' | 'pending' | 'synthetic_demo' {
  if (activo.is_synthetic) return 'synthetic_demo';
  if (activo.estado === 'propuesto') return 'pending';
  const habilitacion = activo.comercio_ficha?.habilitacion as { estado?: string } | undefined;
  if (habilitacion?.estado === 'verificada') return 'verified';
  return 'community_validated';
}

// Ficha pública (contrato ComercioFichaPublicaSchema + descripcion/nodo_key/
// lat/lng del activo para el mapa). Sin PII: v1 no tiene columnas de contacto.
function fichaPublica(activo: ActivoConFicha) {
  const ficha = activo.comercio_ficha;
  return {
    id: activo.id,
    titulo: activo.titulo,
    descripcion: activo.descripcion,
    nodo_key: activo.nodo_key,
    subnodo_key: activo.subnodo_key ?? null,
    lat: activo.lat ?? null,
    lng: activo.lng ?? null,
    rubro: resolverRubro(ficha?.rubro_id ?? ''),
    estado: activo.estado,
    habilitacion: ficha?.habilitacion ?? { estado: 'sin_dato' },
    titularidad: ficha?.titularidad ?? { estado: 'sin_reclamo' },
    atributos: ficha?.atributos ?? {},
    estado_epistemico: estadoEpistemico(activo),
  };
}

// POST /api/comercios — alta ciudadana (requireJwt): activo tipo local|prestador
// + ficha 1:1 en transacción atómica (create anidado — sin ficha huérfana).
// Nace 'propuesto': la propuesta es registro comunitario, nunca publicada
// como verificado (R5b). Idempotencia por hash de alta (activos.hash @unique).
router.post('/', requireJwt, async (req: Request, res: Response) => {
  // Reconciliación 404/400 (MK-0 §2.5): el enum Zod respondería 400, pero el
  // diseño exige 404 para un nodo inexistente — el guard corre ANTES del parse.
  const nodoCrudo: unknown = (req.body as { nodo_key?: unknown } | undefined)?.nodo_key;
  if (typeof nodoCrudo === 'string' && !NODOS_VALIDOS.includes(nodoCrudo)) {
    res.status(404).json({ success: false, error: 'nodo no encontrado' });
    return;
  }

  let parsed: z.infer<typeof ComercioAltaSchema>;
  try {
    parsed = ComercioAltaSchema.parse(req.body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'datos inválidos', details: error.errors });
      return;
    }
    throw error;
  }

  // Anti-PII (ADR-020 cond. 1, Ley 25.326): sobre el texto de autoría humana
  // ANTES de persistir; rechazo con el patrón detectado, sin eco del valor.
  const contenido = JSON.stringify({ titulo: parsed.titulo, descripcion: parsed.descripcion ?? null });
  const pii = detectaPII(contenido);
  if (pii) {
    res.status(400).json({
      error: 'payload rechazado: contiene datos personales identificables (' + pii + ') — ADR-020 cond. 1, Ley 25.326',
    });
    return;
  }

  const usuario = res.locals.usuario as { id: string };
  const autor = seudonimo(usuario.id);

  // Robustez multinodo (R15): el enum del contrato acredita la forma; la tabla
  // acredita la existencia del nodo del vocabulario.
  const nodo = await prisma.nodos.findFirst({ where: { key: parsed.nodo_key } });
  if (!nodo) {
    res.status(404).json({ success: false, error: 'nodo no encontrado' });
    return;
  }

  // VIG-002 (patrón activos.ts): el subnodo declarado debe existir y
  // pertenecer al nodo_key declarado — el contexto no se acepta por confianza.
  if (parsed.subnodo_key !== undefined) {
    const subnodo = await prisma.subnodos.findFirst({
      where: { key: parsed.subnodo_key, nodo_key: parsed.nodo_key },
    });
    if (subnodo === null) {
      res.status(400).json({ success: false, error: 'subnodo_key inexistente o ajeno al nodo declarado' });
      return;
    }
  }

  const rubro = resolverRubro(parsed.rubro_id);

  // Idempotencia del alta (patrón oportunidades): mismo autor + tipo + título
  // + nodo = un solo comercio; el reintento re-entra por P2002 → 200.
  const hashAlta = createHash('sha256')
    .update('comercio|' + usuario.id + '|' + parsed.tipo + '|' + parsed.titulo + '|' + parsed.nodo_key)
    .digest('hex');

  try {
    const activo = await prisma.activos.create({
      data: {
        tipo: parsed.tipo,
        titulo: parsed.titulo,
        descripcion: parsed.descripcion ?? undefined,
        estado: 'propuesto',
        nodo_key: parsed.nodo_key,
        subnodo_key: parsed.subnodo_key ?? undefined,
        lat: parsed.lat,
        lng: parsed.lng,
        visibilidad: 'public', // ADR-036: nace público; restricted es custodia (VIG-004)
        is_synthetic: false,
        created_by_hash: autor,
        hash: hashAlta,
        comercio_ficha: {
          create: {
            rubro_id: parsed.rubro_id,
            rubro_rama: rubro.rama,
            atributos: parsed.atributos as object,
            habilitacion: parsed.habilitacion as object,
            titularidad: { estado: 'sin_reclamo' },
          },
        },
      },
      include: { comercio_ficha: true },
    });

    // Sello del sistema: 'comercio.ingestado' sin PII (R4/R15) — el texto del
    // ciudadano vive solo en activos; el sello lleva ids y códigos.
    try {
      await sellarEvento('comercio.ingestado', {
        comercio_id: activo.id,
        nodo_key: activo.nodo_key,
        subnodo_key: activo.subnodo_key ?? null,
        rubro_id: parsed.rubro_id,
        tipo: activo.tipo,
        created_by_hash: autor,
      });
    } catch (err) {
      // Rollback (R4/R15): sin evento no hay escritura acreditada.
      await prisma.activos.delete({ where: { id: activo.id } }).catch(() => undefined);
      console.error('[comercios] sellar alta:', err instanceof Error ? err.message : String(err));
      res.status(500).json({ success: false, error: 'fallo al sellar el alta' });
      return;
    }

    res.status(201).json({
      success: true,
      data: { activo, ficha: fichaPublica(activo as ActivoConFicha) },
    });
  } catch (err) {
    // P2002 en activos.hash = reintento idempotente del mismo alta: 200 con
    // el registro existente, nunca un duplicado silencioso.
    if (err && typeof err === 'object' && (err as { code?: string }).code === 'P2002') {
      const existente = await prisma.activos.findUnique({
        where: { hash: hashAlta },
        include: { comercio_ficha: true },
      });
      if (existente) {
        res.status(200).json({
          success: true,
          idempotente: true,
          data: { activo: existente, ficha: fichaPublica(existente as ActivoConFicha) },
        });
        return;
      }
      res.status(409).json({ success: false, error: 'colisión de hash de alta' });
      return;
    }
    // AUD-06 (#100): el detalle queda en stdout del servidor, nunca en la respuesta.
    console.error('[comercios] crear:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al crear el comercio' });
  }
});

// GET /api/comercios — lectura pública y anónima (el mapa se sirve sin
// sesión): SOLO comercios aprobados y públicos (moderación primero; ADR-036:
// restricted nunca sale). Facetas ?rubro= (canon o legado cat-*) ?subnodo=
// ?habilitacion= (estado epistémico) ?nodo= ?bbox= (ST_Intersects sobre el
// índice GiST — rama cruda, patrón activos.ts). take 100: paginación v1 =
// recorte honesto declarado en MK-0 §2.5.
router.get('/', async (req: Request, res: Response) => {
  try {
    const rubroCrudo = typeof req.query.rubro === 'string' ? req.query.rubro : undefined;
    const subnodoCrudo = typeof req.query.subnodo === 'string' ? req.query.subnodo : undefined;
    const habilitacionCruda = typeof req.query.habilitacion === 'string' ? req.query.habilitacion : undefined;
    const nodoCrudo = typeof req.query.nodo === 'string' ? req.query.nodo : undefined;
    const bboxCrudo = typeof req.query.bbox === 'string' ? req.query.bbox : undefined;

    let rubro: string | undefined;
    if (rubroCrudo !== undefined) {
      // Mismo regex de forma que ComercioAltaSchema (código, no nombre)
      if (!/^[a-z][a-z0-9_-]*(\.[a-z0-9_-]+)?$/.test(rubroCrudo) || rubroCrudo.length > 60) {
        res.status(400).json({ success: false, error: 'rubro inválido' });
        return;
      }
      rubro = rubroCrudo;
    }

    let subnodo: string | undefined;
    if (subnodoCrudo !== undefined) {
      if (!/^[a-z0-9_]+$/.test(subnodoCrudo) || subnodoCrudo.length > 60) {
        res.status(400).json({ success: false, error: 'subnodo inválido' });
        return;
      }
      subnodo = subnodoCrudo;
    }

    let habilitacion: z.infer<typeof ComercioHabilitacionEstadoSchema> | undefined;
    if (habilitacionCruda !== undefined) {
      const parsedHab = ComercioHabilitacionEstadoSchema.safeParse(habilitacionCruda);
      if (!parsedHab.success) {
        res.status(400).json({ success: false, error: 'habilitación inválida', details: parsedHab.error.errors });
        return;
      }
      habilitacion = parsedHab.data;
    }

    let nodo: string | undefined;
    if (nodoCrudo !== undefined) {
      if (!NODOS_VALIDOS.includes(nodoCrudo)) {
        res.status(400).json({ success: false, error: 'nodo inválido' });
        return;
      }
      nodo = nodoCrudo;
    }

    if (bboxCrudo !== undefined) {
      // Rama cruda (patrón activos.ts): JOIN con comercio_ficha + recorte
      // espacial ST_Intersects sobre el índice GiST de activos.
      const parsedBbox = BboxStringSchema.safeParse(bboxCrudo);
      if (!parsedBbox.success) {
        res.status(400).json({ success: false, error: 'bbox inválido', details: parsedBbox.error.errors });
        return;
      }
      const [minLng, minLat, maxLng, maxLat] = parsedBbox.data.split(',').map(Number);
      const rubroFiltro = rubro !== undefined ? Prisma.sql`AND cf.rubro_id = ${rubro}` : Prisma.empty;
      const subnodoFiltro = subnodo !== undefined ? Prisma.sql`AND a.subnodo_key = ${subnodo}` : Prisma.empty;
      const nodoFiltro = nodo !== undefined ? Prisma.sql`AND a.nodo_key = ${nodo}` : Prisma.empty;
      const habilitacionFiltro =
        habilitacion !== undefined ? Prisma.sql`AND cf.habilitacion ->> 'estado' = ${habilitacion}` : Prisma.empty;

      const filas = await prisma.$queryRaw`
        SELECT a.id, a.tipo, a.titulo, a.descripcion, a.estado, a.nodo_key, a.subnodo_key,
               a.lat, a.lng, a.visibilidad, a.is_synthetic, a.created_by_hash, a.hash, a.created_at,
               cf.rubro_id, cf.rubro_rama, cf.atributos, cf.habilitacion, cf.titularidad
        FROM activos a
          JOIN comercio_ficha cf ON cf.activo_id = a.id
        WHERE a.estado = 'aprobado' AND a.visibilidad = 'public'
          ${rubroFiltro} ${subnodoFiltro} ${nodoFiltro} ${habilitacionFiltro}
          AND ST_Intersects(a.geom, ST_MakeEnvelope(${minLng}, ${minLat}, ${maxLng}, ${maxLat}, 4326))
        ORDER BY a.created_at DESC
        LIMIT 100`;

      const data = (filas as Array<Record<string, unknown>>).map((fila) => {
        const activo: ActivoConFicha = {
          id: String(fila.id),
          tipo: String(fila.tipo),
          titulo: String(fila.titulo),
          descripcion: fila.descripcion as string | null,
          estado: String(fila.estado),
          nodo_key: String(fila.nodo_key),
          subnodo_key: fila.subnodo_key as string | null,
          lat: fila.lat as number | null,
          lng: fila.lng as number | null,
          visibilidad: String(fila.visibilidad),
          is_synthetic: Boolean(fila.is_synthetic),
          created_by_hash: String(fila.created_by_hash),
          hash: fila.hash as string | null,
          created_at: fila.created_at as Date | string,
          comercio_ficha: {
            activo_id: String(fila.id),
            rubro_id: String(fila.rubro_id),
            rubro_rama: fila.rubro_rama as string | null,
            atributos: fila.atributos as Record<string, unknown>,
            habilitacion: fila.habilitacion as Record<string, unknown>,
            titularidad: fila.titularidad as Record<string, unknown>,
          },
        };
        return fichaPublica(activo);
      });
      res.json({ success: true, data, count: data.length });
      return;
    }

    // Sin bbox: findMany con include (la ficha 1:1 viaja en la relación).
    const activos = await prisma.activos.findMany({
      where: {
        estado: 'aprobado', // solo lo aprobado se publica (moderación primero)
        visibilidad: 'public', // ADR-036: restricted nunca sale por lectura pública
        ...(nodo !== undefined ? { nodo_key: nodo } : {}),
        ...(subnodo !== undefined ? { subnodo_key: subnodo } : {}),
        ...(rubro !== undefined || habilitacion !== undefined
          ? {
              comercio_ficha: {
                ...(rubro !== undefined ? { rubro_id: rubro } : {}),
                ...(habilitacion !== undefined
                  ? { habilitacion: { path: ['estado'], equals: habilitacion } }
                  : {}),
              },
            }
          : {}),
      },
      include: { comercio_ficha: true },
      orderBy: { created_at: 'desc' },
      take: 100,
    });
    const data = (activos as ActivoConFicha[]).map((a) => fichaPublica(a));
    res.json({ success: true, data, count: data.length });
  } catch (err) {
    // AUD-06 (#100): el detalle queda en stdout del servidor, nunca en la respuesta.
    console.error('[comercios] listar:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al obtener comercios' });
  }
});

// GET /api/comercios/:id — ficha pública del comercio: ficha + operativa
// (1:1, VIG-005) + productos aprobados (1:N) con count. 404 honesto y sin eco
// (R15/ADR-036): inexistente, sin ficha de mercado, restricted o fuera del
// ciclo público (rechazado/archivado) son indistinguibles desde afuera.
router.get('/:id', async (req: Request, res: Response) => {
  const id = req.params.id;
  try {
    const activo = await prisma.activos.findUnique({
      where: { id },
      include: { comercio_ficha: true, operativa: true, productos: true },
    });
    if (
      !activo ||
      !activo.comercio_ficha ||
      activo.visibilidad === 'restricted' ||
      !['propuesto', 'aprobado'].includes(activo.estado)
    ) {
      res.status(404).json({ success: false, error: 'comercio no encontrado' });
      return;
    }
    const productos = ((activo.productos ?? []) as Array<{ estado?: string }>).filter(
      (p) => p.estado === 'aprobado',
    );
    const operativa = activo.operativa ?? null;
    const ficha = fichaPublica(activo as ActivoConFicha);
    res.json({
      success: true,
      data: { ...ficha, operativa, productos, count_productos: productos.length },
    });
  } catch (err) {
    console.error('[comercios] ficha:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al obtener el comercio' });
  }
});

// PATCH /api/comercios/:id/estado — moderación (R5b): solo moderador|admin.
// Matriz COMERCIO_TRANSICIONES sellada en el contrato (patrón CORE-005 R1):
// la transición inválida NO se negocia en la ruta. Justificación pública
// obligatoria (ADR-038, min 10) y anti-PII sobre ella (ADR-020 cond. 1).
router.patch('/:id/estado', requireJwt, requireRole('moderador', 'admin'), async (req: Request, res: Response) => {
  const id = req.params.id;

  let parsed: z.infer<typeof ComercioEstadoCambioSchema>;
  try {
    parsed = ComercioEstadoCambioSchema.parse(req.body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'datos inválidos', details: error.errors });
      return;
    }
    throw error;
  }

  // Anti-PII sobre la justificación pública ANTES de persistir (ADR-020).
  const pii = detectaPII(parsed.justificacion);
  if (pii) {
    res.status(400).json({
      error: 'payload rechazado: contiene datos personales identificables (' + pii + ') — ADR-020 cond. 1, Ley 25.326',
    });
    return;
  }

  try {
    const activo = await prisma.activos.findUnique({ where: { id }, include: { comercio_ficha: true } });
    if (!activo || !activo.comercio_ficha) {
      res.status(404).json({ success: false, error: 'comercio no encontrado' });
      return;
    }
    if (activo.estado === parsed.estado) {
      res.status(409).json({ success: false, error: "el comercio ya está en estado '" + parsed.estado + "'" });
      return;
    }
    if (!(COMERCIO_TRANSICIONES[activo.estado] ?? []).includes(parsed.estado)) {
      res.status(400).json({ success: false, error: 'transición inválida (matriz COMERCIO_TRANSICIONES, #243)' });
      return;
    }

    const actualizado = await prisma.activos.update({ where: { id }, data: { estado: parsed.estado } });

    const moderadorHash = seudonimo((res.locals.usuario as { id: string }).id);
    try {
      await sellarEvento('comercio.estado_cambiado', {
        comercio_id: id,
        estado_anterior: activo.estado,
        estado_nuevo: parsed.estado,
        justificacion: parsed.justificacion,
        moderador_hash: moderadorHash,
      });
    } catch (err) {
      // Rollback (R4/R15): sin sello no hay transición acreditada.
      await prisma.activos.update({ where: { id }, data: { estado: activo.estado } }).catch(() => undefined);
      console.error('[comercios] sellar cambio de estado:', err instanceof Error ? err.message : String(err));
      res.status(500).json({ success: false, error: 'fallo al sellar el cambio de estado' });
      return;
    }

    res.json({ success: true, data: actualizado });
  } catch (err) {
    console.error('[comercios] cambiar estado:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al cambiar el estado' });
  }
});

// POST /api/comercios/:id/titular — reclamo ciudadano o verificación de
// moderación (decisión DH: relay por plataforma, sin PII de contacto en v1).
// El identificador (expediente/cuit) es PII POR DISEÑO: no pasa el anti-PII
// de texto libre — se hashea ANTES de persistir y nunca sale en claro
// (Ley 25.326; solo su hash vive en el sello). El pseudónimo del reclamante
// vive en titularidad.reclamado_por_hash (hash, no PII) para que el titular
// verificado pueda editar (PATCH /:id) — extensión mínima documentada.
router.post('/:id/titular', requireJwt, async (req: Request, res: Response) => {
  const id = req.params.id;
  const usuario = res.locals.usuario as { id: string; rol: string };

  try {
    const activo = await prisma.activos.findUnique({ where: { id }, include: { comercio_ficha: true } });
    if (!activo || !activo.comercio_ficha) {
      res.status(404).json({ success: false, error: 'comercio no encontrado' });
      return;
    }
    const titularidad = ((activo.comercio_ficha as ComercioFichaRow).titularidad ?? {}) as {
      estado?: string;
      metodo?: string;
      reclamado_por_hash?: string;
    };

    if (usuario.rol === 'moderador' || usuario.rol === 'admin') {
      // Verificación de moderación (R5b): la titularidad verificada habilita
      // la edición del titular (PATCH /:id abajo).
      if (titularidad.estado !== 'reclamada') {
        res.status(409).json({ success: false, error: 'la titularidad no está reclamada' });
        return;
      }
      const verificadoAt = new Date().toISOString().slice(0, 10);
      const titularidadNueva = { ...titularidad, estado: 'verificada', verificado_at: verificadoAt };
      await prisma.comercio_ficha.update({
        where: { activo_id: id },
        data: { titularidad: titularidadNueva as object },
      });
      try {
        await sellarEvento('comercio.titularidad_verificada', {
          comercio_id: id,
          metodo: titularidad.metodo ?? null,
          verificado_por_hash: seudonimo(usuario.id),
        });
      } catch (err) {
        await prisma.comercio_ficha
          .update({ where: { activo_id: id }, data: { titularidad: titularidad as object } })
          .catch(() => undefined);
        console.error('[comercios] sellar verificación de titularidad:', err instanceof Error ? err.message : String(err));
        res.status(500).json({ success: false, error: 'fallo al sellar la verificación de titularidad' });
        return;
      }
      res.json({ success: true, data: { activo_id: id, titularidad: titularidadNueva } });
      return;
    }

    // Reclamo ciudadano: consentimiento explícito (ADR-027, nunca pre-marcado).
    let parsed: z.infer<typeof ComercioReclamoTitularSchema>;
    try {
      parsed = ComercioReclamoTitularSchema.parse(req.body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, error: 'datos inválidos', details: error.errors });
        return;
      }
      throw error;
    }
    if (titularidad.estado === 'reclamada' || titularidad.estado === 'verificada') {
      res.status(409).json({ success: false, error: 'la titularidad ya está reclamada o verificada' });
      return;
    }
    // El identificador NUNCA se persiste en claro — solo su hash en el sello.
    const identificadorHash = createHash('sha256').update(parsed.identificador).digest('hex').slice(0, 32);
    const titularidadNueva = {
      ...titularidad,
      estado: 'reclamada',
      metodo: parsed.metodo,
      reclamado_por_hash: seudonimo(usuario.id),
    };
    await prisma.comercio_ficha.update({
      where: { activo_id: id },
      data: { titularidad: titularidadNueva as object },
    });
    try {
      await sellarEvento('comercio.titularidad_reclamada', {
        comercio_id: id,
        metodo: parsed.metodo,
        reclamado_por_hash: seudonimo(usuario.id),
        identificador_hash: identificadorHash,
      });
    } catch (err) {
      await prisma.comercio_ficha
        .update({ where: { activo_id: id }, data: { titularidad: titularidad as object } })
        .catch(() => undefined);
      console.error('[comercios] sellar reclamo de titularidad:', err instanceof Error ? err.message : String(err));
      res.status(500).json({ success: false, error: 'fallo al sellar el reclamo de titularidad' });
      return;
    }
    res.status(201).json({ success: true, data: { activo_id: id, titularidad: titularidadNueva } });
  } catch (err) {
    console.error('[comercios] titularidad:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al procesar la titularidad' });
  }
});

// PATCH /api/comercios/:id — edición de atributos SOLO por el titular
// verificado. 403 sin eco del motivo (Ley 25.326): no se revela si existe un
// reclamo ni de quién. Sello 'comercio.atributos_editados' = extensión mínima
// documentada del MK-0 §2.4 (regla del repo: toda escritura queda sellada).
router.patch('/:id', requireJwt, async (req: Request, res: Response) => {
  const id = req.params.id;
  const usuario = res.locals.usuario as { id: string };

  const parsedBody = z.object({ atributos: ComercioAtributosSchema }).safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({ success: false, error: 'datos inválidos', details: parsedBody.error.errors });
    return;
  }

  try {
    const activo = await prisma.activos.findUnique({ where: { id }, include: { comercio_ficha: true } });
    if (!activo || !activo.comercio_ficha) {
      res.status(404).json({ success: false, error: 'comercio no encontrado' });
      return;
    }
    const ficha = activo.comercio_ficha as ComercioFichaRow;
    const titularidad = (ficha.titularidad ?? {}) as { estado?: string; reclamado_por_hash?: string };
    if (titularidad.estado !== 'verificada' || titularidad.reclamado_por_hash !== seudonimo(usuario.id)) {
      res.status(403).json({ success: false, error: 'solo el titular verificado puede editar la ficha' });
      return;
    }
    const atributos = parsedBody.data.atributos as object;
    await prisma.comercio_ficha.update({ where: { activo_id: id }, data: { atributos } });
    try {
      await sellarEvento('comercio.atributos_editados', {
        comercio_id: id,
        titular_hash: seudonimo(usuario.id),
      });
    } catch (err) {
      await prisma.comercio_ficha
        .update({ where: { activo_id: id }, data: { atributos: ficha.atributos as object } })
        .catch(() => undefined);
      console.error('[comercios] sellar edición de atributos:', err instanceof Error ? err.message : String(err));
      res.status(500).json({ success: false, error: 'fallo al sellar la edición' });
      return;
    }
    res.json({ success: true, data: { activo_id: id, atributos } });
  } catch (err) {
    console.error('[comercios] editar atributos:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al editar la ficha' });
  }
});

export default router;
