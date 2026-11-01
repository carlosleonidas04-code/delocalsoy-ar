import { prisma } from './index.js';

/**
 * Índice RAG territorial ético — NODO-VIG VIG-006 (NVIG-R8 #188, épica #167).
 *
 * Regla central (VIG-000, Bloque 11 + reglas RAG §17): el índice SOLO
 * contiene prosa autorizada derivada del dominio publicado — subnodos,
 * activos aprobados no restricted (con su ficha patrimonial pública VIG-004
 * y su operativa VIG-005) y KPIs agregados. NUNCA ingiere: visibilidad
 * restricted (ADR-036), el campo sensible de custodia, consentimiento,
 * PII (Ley 25.326) ni registros huérfanos (R15).
 *
 * Idempotencia estructural (patrón kpi_snapshots, VIG-003): cada fragmento
 * es un upsert por (nodo_key, source_type, source_id) que RE-DERIVA el
 * texto desde las tablas de dominio — nunca acumula. El delete lógico
 * retira los fragmentos que dejaron de calificar (p. ej. un activo que
 * pasó a restricted en la custodia VIG-004).
 */

export const RAG_SOURCE_TYPES = ['subnodo', 'activo', 'kpi'] as const;
export type RagSourceType = (typeof RAG_SOURCE_TYPES)[number];

export type RagFuente = { fuente: string; fecha?: string };

export type RagFragmento = {
  nodo_key: string;
  source_type: RagSourceType;
  source_id: string;
  subnodo_key: string | null;
  texto: string;
  fuentes: RagFuente[];
};

export type RagRecomputeResult = { written: number; deleted: number };

type SubnodoRow = {
  key: string;
  label: string;
  type: string;
  parent_key: string | null;
  external_id: string | null;
  external_source: string | null;
};

type ClasifRow = { n1: string; n2: string; n3: string };

type ReglaRow = { regla?: string; fuente?: string };

type ActivoRow = {
  id: string;
  tipo: string;
  titulo: string;
  descripcion: string | null;
  subnodo_key: string | null;
  procedencia: unknown;
  clasificaciones: ClasifRow[];
  patrimonio: {
    proteccion_nivel: string;
    proteccion_norma: string;
    conservacion_estado: string | null;
    reglas_acceso: unknown;
  } | null;
  operativa: {
    horario: string | null;
    temporada_meses: unknown;
    capacity_status: string;
    procedencia: unknown;
  } | null;
};

type KpiRow = {
  kpi_key: string;
  valor: number | null;
  detalles: Record<string, number>;
  computed_at: Date;
};

const TIPO_TEXTO: Record<string, string> = {
  district: 'distrito',
  paraje: 'paraje',
  subparaje: 'subparaje',
  locality: 'localidad',
};

const KPI_TEXTO: Record<string, string> = {
  subnodos_total: 'Total de subnodos territoriales del nodo',
  subnodos_por_distrito: 'Subnodos por distrito',
  subnodos_con_punto: 'Subnodos con punto público verificado',
  activos_por_estado: 'Activos territoriales por estado',
  activos_por_tipo: 'Activos territoriales por tipo',
  activos_por_capital_n1: 'Activos por capital territorial N1',
  activos_verificados: 'Activos verificados con procedencia trazable',
  eventos_por_tipo: 'Eventos sellados por tipo',
  cobertura_geometrica: 'Cobertura geométrica del nodo',
};

function asReglas(v: unknown): ReglaRow[] {
  return Array.isArray(v) ? (v as ReglaRow[]) : [];
}

function asMeses(v: unknown): number[] {
  return Array.isArray(v) ? (v as number[]) : [];
}

function asProcedencia(v: unknown): { fuente?: string; fecha?: string } {
  return (v ?? {}) as { fuente?: string; fecha?: string };
}

function desglose(detalles: Record<string, number>): string {
  const pares = Object.entries(detalles ?? {}).map(([clave, valor]) => clave + '=' + valor);
  return pares.length ? ' Desglose: ' + pares.join(', ') + '.' : '';
}

async function upsertFragmento(f: RagFragmento, computedAt: Date): Promise<void> {
  await prisma.rag_index.upsert({
    where: {
      nodo_key_source_type_source_id: {
        nodo_key: f.nodo_key,
        source_type: f.source_type,
        source_id: f.source_id,
      },
    },
    create: {
      nodo_key: f.nodo_key,
      source_type: f.source_type,
      source_id: f.source_id,
      subnodo_key: f.subnodo_key,
      texto: f.texto,
      fuentes: f.fuentes,
      computed_at: computedAt,
    },
    update: {
      subnodo_key: f.subnodo_key,
      texto: f.texto,
      fuentes: f.fuentes,
      computed_at: computedAt,
    },
  });
}

/**
 * Re-deriva el índice RAG del nodo desde el dominio publicado y lo
 * materializa en rag_index (upsert idempotente por nodo_key+source_type+
 * source_id + delete lógico de lo que dejó de calificar). Devuelve los
 * fragmentos escritos y los fragmentos retirados.
 */
export async function recomputeRagIndexForNode(nodoKey: string): Promise<RagRecomputeResult> {
  const now = new Date();
  const fragmentos: RagFragmento[] = [];

  // 1. Subnodos (VIG-001): estructura territorial publicada del nodo.
  const subnodos = (await prisma.subnodos.findMany({
    where: { nodo_key: nodoKey },
    select: { key: true, label: true, type: true, parent_key: true, external_id: true, external_source: true },
  })) as SubnodoRow[];
  for (const s of subnodos) {
    const tipo = TIPO_TEXTO[s.type] ?? s.type;
    const origen = s.external_source === 'bahra' ? 'BAHRA' : s.external_source === 'georef' ? 'Georef' : '';
    const registro = s.external_id && origen ? ' (registro ' + origen + ' ' + s.external_id + ')' : '';
    fragmentos.push({
      nodo_key: nodoKey,
      source_type: 'subnodo',
      source_id: s.key,
      subnodo_key: s.key,
      texto: s.label + ' — ' + tipo + ' del nodo ' + nodoKey + registro + '.',
      fuentes: [
        { fuente: s.external_id && origen ? origen + ' ' + s.external_id : 'Vocabulario territorial VIG-001' },
      ],
    });
  }

  // 2. Activos aprobados no restricted: título, descripción, clasificación
  // primaria, ficha patrimonial PÚBLICA (nunca sensible — ADR-036) y
  // operativa honesta (VIG-005).
  const activos = (await prisma.activos.findMany({
    where: { nodo_key: nodoKey, estado: 'aprobado', visibilidad: { not: 'restricted' } },
    include: { clasificaciones: { where: { is_primary: true } }, patrimonio: true, operativa: true },
  })) as ActivoRow[];
  for (const a of activos) {
    const partes: string[] = [a.titulo + ' — activo ' + a.tipo + ' del nodo ' + nodoKey + '.'];
    if (a.descripcion) partes.push(a.descripcion);
    const primaria = a.clasificaciones[0];
    if (primaria) {
      partes.push(
        'Clasificación principal: ' + primaria.n1 + ' / ' + primaria.n2 + (primaria.n3 ? ' / ' + primaria.n3 : '') + '.'
      );
    }
    if (a.patrimonio) {
      const reglas = asReglas(a.patrimonio.reglas_acceso)
        .map((r) => r.regla ?? '')
        .filter((t) => t.length > 0);
      partes.push(
        'Patrimonio protegido: ' + a.patrimonio.proteccion_norma + ' (' + a.patrimonio.proteccion_nivel + ').' +
          (a.patrimonio.conservacion_estado ? ' Estado de conservación: ' + a.patrimonio.conservacion_estado + '.' : '') +
          ' Reglas de acceso: ' + (reglas.length ? reglas.join('; ') : 'sin reglas publicadas') + '.'
      );
    }
    if (a.operativa) {
      const meses = asMeses(a.operativa.temporada_meses);
      partes.push(
        'Operativa: horario ' + (a.operativa.horario ?? 'sin dato') +
          '; temporada ' + (meses.length ? 'meses ' + meses.join(', ') : 'sin dato') +
          '; capacidad ' + a.operativa.capacity_status + '.'
      );
    }
    const fuentes: RagFuente[] = [];
    const proc = asProcedencia(a.procedencia);
    if (proc.fuente) fuentes.push(proc.fecha ? { fuente: proc.fuente, fecha: proc.fecha } : { fuente: proc.fuente });
    if (a.patrimonio) {
      for (const r of asReglas(a.patrimonio.reglas_acceso)) {
        if (r.fuente) fuentes.push({ fuente: r.fuente });
      }
    }
    if (a.operativa) {
      const op = asProcedencia(a.operativa.procedencia);
      if (op.fuente) fuentes.push(op.fecha ? { fuente: op.fuente, fecha: op.fecha } : { fuente: op.fuente });
    }
    fragmentos.push({
      nodo_key: nodoKey,
      source_type: 'activo',
      source_id: a.id,
      subnodo_key: a.subnodo_key,
      texto: partes.join(' '),
      fuentes,
    });
  }

  // 3. KPIs agregados (VIG-003): snapshots sin PII del set honesto v1.
  const kpis = (await prisma.kpi_snapshots.findMany({ where: { nodo_key: nodoKey } })) as KpiRow[];
  for (const k of kpis) {
    fragmentos.push({
      nodo_key: nodoKey,
      source_type: 'kpi',
      source_id: k.kpi_key,
      subnodo_key: null,
      texto:
        (KPI_TEXTO[k.kpi_key] ?? k.kpi_key) + ': ' +
        (k.valor === null ? 'sin dato (null honesto, R15)' : k.valor) + '.' +
        desglose(k.detalles) + ' (kpi ' + k.kpi_key + ').',
      fuentes: [{ fuente: 'kpi_snapshots — recompute vig003-kpi (VIG-003)', fecha: k.computed_at.toISOString().slice(0, 10) }],
    });
  }

  for (const f of fragmentos) {
    await upsertFragmento(f, now);
  }

  // Delete lógico: fragmentos del nodo que ya no califican (el registro
  // desapareció o dejó de ser publicable — p. ej. pasó a restricted).
  const validos = (tipo: string): string[] =>
    fragmentos.filter((f) => f.source_type === tipo).map((f) => f.source_id);
  const deleted =
    (await prisma.rag_index.deleteMany({
      where: { nodo_key: nodoKey, source_type: 'subnodo', source_id: { notIn: validos('subnodo') } },
    })).count +
    (await prisma.rag_index.deleteMany({
      where: { nodo_key: nodoKey, source_type: 'activo', source_id: { notIn: validos('activo') } },
    })).count +
    (await prisma.rag_index.deleteMany({
      where: { nodo_key: nodoKey, source_type: 'kpi', source_id: { notIn: validos('kpi') } },
    })).count;

  return { written: fragmentos.length, deleted };
}
