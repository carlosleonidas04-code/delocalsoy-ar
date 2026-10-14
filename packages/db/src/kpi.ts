import { prisma, Prisma } from './index.js';

/**
 * KPIs del nodo — NODO-VIG VIG-003 (NVIG-R3 #182, épica #167).
 *
 * Set honesto v1 ratificado por la DH (2026-10-14, traza #182 comment
 * 6158288630): SOLO agregados sin PII (Ley 25.326) y la visibilidad
 * `restricted` queda EXCLUIDA de todo cálculo (ADR-036).
 *
 * Idempotencia estructural: cada snapshot es un upsert por (nodo_key,
 * kpi_key) que RE-DERIVA el valor desde las tablas de dominio (subnodos,
 * activos, activos_clasificaciones, events_raw) — nunca incrementos.
 * Cualquier snapshot es verificable contra la fuente en cualquier momento
 * (R4/R15): re-computar siempre da el mismo resultado.
 *
 * Deuda ADR-030 resuelta en el diseño: events_raw no tiene columna nodo →
 * eventos_por_tipo filtra por `payload->>'nodo_key'` (el sello lo declara).
 */

export const KPI_KEYS = [
  'subnodos_total',
  'subnodos_por_distrito',
  'subnodos_con_punto',
  'activos_por_estado',
  'activos_por_tipo',
  'activos_por_capital_n1',
  'activos_verificados',
  'eventos_por_tipo',
  'cobertura_geometrica',
] as const;

export type KpiKey = (typeof KPI_KEYS)[number];

export type KpiSnapshot = {
  nodo_key: string;
  kpi_key: KpiKey;
  valor: number | null;
  detalles: Record<string, number>;
};

type SubnodoRow = {
  key: string;
  type: string;
  parent_key: string | null;
  lat: number | null;
  lng: number | null;
};

type GroupRow = { estado: string; tipo: string; n1: string; type: string; total: number };

// Distrito de un subnodo: primer ancestro de tipo 'district' en la cadena
// parent_key ('_sin_distrito' si la cadena no llega a uno — p. ej. los
// parajes de alta cordillera, hijos directos del nodo).
function distritoDe(row: SubnodoRow, porKey: Map<string, SubnodoRow>): string {
  let actual: SubnodoRow | undefined = row;
  while (actual) {
    const padre = actual.parent_key ? porKey.get(actual.parent_key) : undefined;
    if (!padre) break;
    if (padre.type === 'district') return padre.key;
    actual = padre;
  }
  return '_sin_distrito';
}

async function upsertSnapshot(
  nodoKey: string,
  kpiKey: KpiKey,
  valor: number | null,
  detalles: Record<string, number>,
  computedAt: Date
): Promise<void> {
  await prisma.kpi_snapshots.upsert({
    where: { nodo_key_kpi_key: { nodo_key: nodoKey, kpi_key: kpiKey } },
    create: { nodo_key: nodoKey, kpi_key: kpiKey, valor, detalles, computed_at: computedAt },
    update: { valor, detalles, computed_at: computedAt },
  });
}

/**
 * Re-computa el set completo de KPIs v1 de un nodo y lo materializa en
 * kpi_snapshots (upsert idempotente por nodo_key+kpi_key). Devuelve los
 * snapshots escritos.
 */
export async function recomputeKpisForNode(nodoKey: string): Promise<KpiSnapshot[]> {
  const now = new Date();

  // Subnodos (dominio VIG-001): total, por distrito y con punto público.
  const subnodos = (await prisma.subnodos.findMany({
    where: { nodo_key: nodoKey },
    select: { key: true, type: true, parent_key: true, lat: true, lng: true },
  })) as SubnodoRow[];
  const porKey = new Map<string, SubnodoRow>();
  for (const s of subnodos) porKey.set(s.key, s);
  const porDistrito: Record<string, number> = {};
  let conPunto = 0;
  for (const s of subnodos) {
    if (s.lat !== null && s.lng !== null) conPunto += 1;
    if (s.type !== 'district') {
      const distrito = distritoDe(s, porKey);
      porDistrito[distrito] = (porDistrito[distrito] ?? 0) + 1;
    }
  }

  // Activos (dominio R5b + VIG-002): restricted excluido del cálculo (ADR-036).
  const porEstado: Record<string, number> = {};
  for (const r of (await prisma.$queryRaw(Prisma.sql`
    SELECT estado, COUNT(*)::int AS total FROM activos
    WHERE nodo_key = ${nodoKey} AND visibilidad <> 'restricted'
    GROUP BY estado`)) as GroupRow[]) {
    porEstado[r.estado] = r.total;
  }

  const porTipo: Record<string, number> = {};
  for (const r of (await prisma.$queryRaw(Prisma.sql`
    SELECT tipo, COUNT(*)::int AS total FROM activos
    WHERE nodo_key = ${nodoKey} AND visibilidad <> 'restricted'
    GROUP BY tipo`)) as GroupRow[]) {
    porTipo[r.tipo] = r.total;
  }

  // Capital N1 (taxonomía VIG-000): clasificaciones primarias.
  const porN1: Record<string, number> = {};
  for (const r of (await prisma.$queryRaw(Prisma.sql`
    SELECT c.n1 AS n1, COUNT(*)::int AS total
    FROM activos_clasificaciones c
    JOIN activos a ON a.id = c.activo_id
    WHERE a.nodo_key = ${nodoKey} AND c.is_primary = true AND a.visibilidad <> 'restricted'
    GROUP BY c.n1`)) as GroupRow[]) {
    porN1[r.n1] = r.total;
  }

  // Verificados (ADR-035): aprobado + procedencia trazable — nunca un sello.
  const verificadosRows = (await prisma.$queryRaw(Prisma.sql`
    SELECT COUNT(*)::int AS total FROM activos
    WHERE nodo_key = ${nodoKey} AND estado = 'aprobado'
      AND procedencia IS NOT NULL AND visibilidad <> 'restricted'`)) as GroupRow[];
  const verificados = verificadosRows.length ? verificadosRows[0].total : 0;

  // Eventos (deuda ADR-030): sin columna nodo → payload->>'nodo_key'.
  const porEvento: Record<string, number> = {};
  for (const r of (await prisma.$queryRaw(Prisma.sql`
    SELECT type, COUNT(*)::int AS total FROM events_raw
    WHERE payload->>'nodo_key' = ${nodoKey}
    GROUP BY type`)) as GroupRow[]) {
    porEvento[r.type] = r.total;
  }

  const activosConPuntoRows = (await prisma.$queryRaw(Prisma.sql`
    SELECT COUNT(*)::int AS total FROM activos
    WHERE nodo_key = ${nodoKey} AND lat IS NOT NULL AND lng IS NOT NULL
      AND visibilidad <> 'restricted'`)) as GroupRow[];
  const activosConPunto = activosConPuntoRows.length ? activosConPuntoRows[0].total : 0;

  const suma = (obj: Record<string, number>): number =>
    Object.values(obj).reduce((acc, n) => acc + n, 0);

  const snapshots: KpiSnapshot[] = [
    { nodo_key: nodoKey, kpi_key: 'subnodos_total', valor: subnodos.length, detalles: {} },
    { nodo_key: nodoKey, kpi_key: 'subnodos_por_distrito', valor: suma(porDistrito), detalles: porDistrito },
    { nodo_key: nodoKey, kpi_key: 'subnodos_con_punto', valor: conPunto, detalles: {} },
    { nodo_key: nodoKey, kpi_key: 'activos_por_estado', valor: suma(porEstado), detalles: porEstado },
    { nodo_key: nodoKey, kpi_key: 'activos_por_tipo', valor: suma(porTipo), detalles: porTipo },
    { nodo_key: nodoKey, kpi_key: 'activos_por_capital_n1', valor: suma(porN1), detalles: porN1 },
    { nodo_key: nodoKey, kpi_key: 'activos_verificados', valor: verificados, detalles: {} },
    { nodo_key: nodoKey, kpi_key: 'eventos_por_tipo', valor: suma(porEvento), detalles: porEvento },
    // Cobertura v1: sin métrica de cobertura computada — null honesto (R15),
    // con el desglose verificable de entidades con punto público.
    {
      nodo_key: nodoKey,
      kpi_key: 'cobertura_geometrica',
      valor: null,
      detalles: { subnodos_con_punto: conPunto, activos_con_punto: activosConPunto },
    },
  ];

  for (const s of snapshots) {
    await upsertSnapshot(s.nodo_key, s.kpi_key, s.valor, s.detalles, now);
  }
  return snapshots;
}
