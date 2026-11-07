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
  // NODO-VIG-3 VIG-013 (#382, épica #377) — set v2: KPIs del dashboard
  // «Infraestructura y movilidad». Los materializa el mismo consumidor
  // vig003-kpi (upsert idempotente, nunca incrementos).
  'pedidos_respondidos',
  'obras_km_ejecucion',
  'puntos_criticos_con_revision',
  'reportes_amc_por_dominio',
  'reportes_amc_por_distrito',
  'parajes_con_reporte',
  // MARKET-CAP MK-3a (#426, épica #422 — plan v2 slice a, D2 ratificada
  // 2026-10-30): set v2 del mercado — 6 KPIs del Mercado de Proximidad.
  // Mismas reglas: agregados sin PII (Ley 25.326), restricted excluido
  // (ADR-036), pct null honesto con 0 comercios (R15), re-derivado del
  // dominio — nunca incrementos.
  'comercios_por_estado',
  'comercios_por_rubro',
  'comercios_por_subnodo',
  'comercios_habilitacion_verificada_pct',
  'titularidad_verificada_pct',
  'ofertas_activas',
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
    const padre: SubnodoRow | undefined = actual.parent_key ? porKey.get(actual.parent_key) : undefined;
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

  // ─── NODO-VIG-3 VIG-013 (#382, épica #377): set v2 — KPIs del dashboard ───
  // «Infraestructura y movilidad». Mismas reglas del set v1: agregados sin
  // PII (Ley 25.326) re-derivados del dominio, null honesto cuando la
  // métrica no existe (R15) y conteo 0 honesto el día que la tabla nace
  // vacía. Sin visibilidad sensible involucrada: las tablas leídas no
  // publican geometría (ADR-036 — el dashboard cuenta, no dibuja).

  type EstadoRow = { estado: string; total: number };
  type AmcRow = { dominio: string; subnodo_key: string | null; total: number };

  // Pedidos formales (VIG-012 #379): respondidos contra los estados
  // ALMACENADOS — sin_respuesta se deriva en lectura, nunca aquí.
  const porEstadoPedidos: Record<string, number> = {};
  for (const r of (await prisma.$queryRaw(Prisma.sql`
    SELECT estado, COUNT(*)::int AS total FROM pedidos
    WHERE nodo_key = ${nodoKey} GROUP BY estado`)) as EstadoRow[]) {
    porEstadoPedidos[r.estado] = r.total;
  }
  const pedidosPresentados = Object.values(porEstadoPedidos).reduce((a, b) => a + b, 0);
  const pedidosRespondidos =
    (porEstadoPedidos['respondido_en_plazo'] ?? 0) + (porEstadoPedidos['respondido_tardio'] ?? 0);

  // Obras viales (VIG-010 #381): tramos de la capa obra_vial por estado del
  // ciclo declared → in_execution → completed. km null honesto: los km de
  // los tramos no están estructurados en fuente verificada (R15 — el
  // desglose verificable son los tramos, no una cifra de prensa).
  const porEstadoObras: Record<string, number> = {};
  for (const r of (await prisma.$queryRaw(Prisma.sql`
    SELECT f.estado AS estado, COUNT(*)::int AS total
    FROM features f
    JOIN capas c ON c.id = f.capa_id
    WHERE c.key = 'obra_vial' AND f.nodo_id = (SELECT id FROM nodos WHERE key = ${nodoKey})
    GROUP BY f.estado`)) as EstadoRow[]) {
    porEstadoObras[r.estado] = r.total;
  }

  // Puntos críticos del AMC (VIG-011 #378): features pc-* de la capa
  // punto_critico por estado de revisión; «con revisión» = validación
  // comunitaria o verificación técnica — la comunidad corrobora, NUNCA
  // verifica (R15), así que community_validated y verified se cuentan
  // por separado en el desglose.
  const porEstadoCriticos: Record<string, number> = {};
  for (const r of (await prisma.$queryRaw(Prisma.sql`
    SELECT f.estado AS estado, COUNT(*)::int AS total
    FROM features f
    JOIN capas c ON c.id = f.capa_id
    WHERE c.key = 'punto_critico' AND f.nodo_id = (SELECT id FROM nodos WHERE key = ${nodoKey})
    GROUP BY f.estado`)) as EstadoRow[]) {
    porEstadoCriticos[r.estado] = r.total;
  }
  const criticosConRevision =
    (porEstadoCriticos['community_validated'] ?? 0) + (porEstadoCriticos['verified'] ?? 0);

  // Reportes AMC (VIG-011 #378): por dominio y por distrito (el distrito se
  // DERIVA del subnodo ancla por la cadena parent — '_sin_subnodo' si el
  // reporte no declara ancla). Al pasar por un paraje de la cadena, el
  // paraje queda marcado con reporte («X de Y parajes», #382).
  const amcPorDominio: Record<string, number> = {};
  const amcPorDistrito: Record<string, number> = {};
  const parajesConReporte = new Set<string>();
  const amcRows = (await prisma.$queryRaw(Prisma.sql`
    SELECT dominio, subnodo_key, COUNT(*)::int AS total
    FROM reportes
    WHERE nodo_id = (SELECT id FROM nodos WHERE key = ${nodoKey})
      AND dominio IS NOT NULL AND is_synthetic = false AND estado <> 'descartado'
    GROUP BY dominio, subnodo_key`)) as AmcRow[];
  for (const r of amcRows) {
    amcPorDominio[r.dominio] = (amcPorDominio[r.dominio] ?? 0) + r.total;
    let distrito = '_sin_subnodo';
    if (r.subnodo_key !== null) {
      let actual: SubnodoRow | undefined = porKey.get(r.subnodo_key);
      while (actual) {
        if (actual.type === 'district') {
          distrito = actual.key;
          break;
        }
        if (actual.type === 'paraje') parajesConReporte.add(actual.key);
        actual = actual.parent_key ? porKey.get(actual.parent_key) : undefined;
      }
    }
    amcPorDistrito[distrito] = (amcPorDistrito[distrito] ?? 0) + r.total;
  }
  const parajesTotal = subnodos.filter((s) => s.type === 'paraje').length;

  // ─── MARKET-CAP MK-3a (#426): set v2 del mercado (D2 ratificada) ───
  // Frontera del dominio: la ficha MK-1 (comercio_ficha). restricted
  // excluido de TODO cálculo (ADR-036) — mismo WHERE que los 15 vivos.
  type FichaMercado = {
    activo_id: string;
    rubro_id: string;
    habilitacion: { estado?: string } | null;
    titularidad: { estado?: string } | null;
    activo: { estado: string; subnodo_key: string | null };
  };
  const fichasMercado = (await prisma.comercio_ficha.findMany({
    where: { activo: { nodo_key: nodoKey, visibilidad: { not: 'restricted' } } },
    include: { activo: { select: { estado: true, subnodo_key: true } } },
  })) as unknown as FichaMercado[];

  const comerciosPorEstado: Record<string, number> = {};
  const comerciosPorRubro: Record<string, number> = {};
  const comerciosPorSubnodo: Record<string, number> = {};
  let habilitadasVerificadas = 0;
  let titularidadesVerificadas = 0;
  for (const f of fichasMercado) {
    comerciosPorEstado[f.activo.estado] = (comerciosPorEstado[f.activo.estado] ?? 0) + 1;
    // Rubro desconocido degrada a 'unknown' honesto (R15) — nunca etiqueta inventada.
    const rubro = f.rubro_id && f.rubro_id.length > 0 ? f.rubro_id : 'unknown';
    comerciosPorRubro[rubro] = (comerciosPorRubro[rubro] ?? 0) + 1;
    // null → '_sin_subnodo' (patrón _sin_distrito).
    const subnodo = f.activo.subnodo_key ?? '_sin_subnodo';
    comerciosPorSubnodo[subnodo] = (comerciosPorSubnodo[subnodo] ?? 0) + 1;
    if ((f.habilitacion ?? {}).estado === 'verificada') habilitadasVerificadas += 1; // ADR-035
    if ((f.titularidad ?? {}).estado === 'verificada') titularidadesVerificadas += 1;
  }
  const comerciosTotal = fichasMercado.length;

  // Ofertas activas: productos aprobados de comercios del nodo. La vigencia
  // (MK-3b: precio_centavos + vigencia desde/hasta) extiende este predicado
  // cuando exista — sin vigencia declarada = siempre activa.
  const idsComercio = fichasMercado.map((f) => f.activo_id);
  const ofertasActivas = idsComercio.length
    ? await prisma.productos.count({ where: { estado: 'aprobado', activo_id: { in: idsComercio } } })
    : 0;

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
    // ─── VIG-013 (#382, épica #377): set v2 del dashboard «Infraestructura y
    // movilidad» — mismas reglas: derivado del dominio, sin PII, honesto.
    {
      nodo_key: nodoKey,
      kpi_key: 'pedidos_respondidos',
      valor: pedidosRespondidos,
      detalles: {
        presentados: pedidosPresentados,
        respondidos_en_plazo: porEstadoPedidos['respondido_en_plazo'] ?? 0,
        respondidos_tardio: porEstadoPedidos['respondido_tardio'] ?? 0,
      },
    },
    {
      nodo_key: nodoKey,
      kpi_key: 'obras_km_ejecucion',
      // null honesto (R15): los km de los tramos no están estructurados en
      // fuente verificada — el desglose verificable son los tramos.
      valor: null,
      detalles: {
        tramos_declared: porEstadoObras['declared'] ?? 0,
        tramos_in_execution: porEstadoObras['in_execution'] ?? 0,
        tramos_completed: porEstadoObras['completed'] ?? 0,
      },
    },
    {
      nodo_key: nodoKey,
      kpi_key: 'puntos_criticos_con_revision',
      valor: criticosConRevision,
      detalles: porEstadoCriticos,
    },
    {
      nodo_key: nodoKey,
      kpi_key: 'reportes_amc_por_dominio',
      valor: suma(amcPorDominio),
      detalles: amcPorDominio,
    },
    {
      nodo_key: nodoKey,
      kpi_key: 'reportes_amc_por_distrito',
      valor: suma(amcPorDistrito),
      detalles: amcPorDistrito,
    },
    {
      nodo_key: nodoKey,
      kpi_key: 'parajes_con_reporte',
      valor: parajesConReporte.size,
      detalles: { parajes_total: parajesTotal, parajes_con_reporte: parajesConReporte.size },
    },
    // ─── MARKET-CAP MK-3a (#426): set v2 del mercado (D2 ratificada) ───
    { nodo_key: nodoKey, kpi_key: 'comercios_por_estado', valor: suma(comerciosPorEstado), detalles: comerciosPorEstado },
    { nodo_key: nodoKey, kpi_key: 'comercios_por_rubro', valor: suma(comerciosPorRubro), detalles: comerciosPorRubro },
    { nodo_key: nodoKey, kpi_key: 'comercios_por_subnodo', valor: suma(comerciosPorSubnodo), detalles: comerciosPorSubnodo },
    {
      nodo_key: nodoKey,
      kpi_key: 'comercios_habilitacion_verificada_pct',
      // null honesto si 0 comercios (R15, D2): sin dominio no hay pct.
      valor: comerciosTotal === 0 ? null : Math.round((habilitadasVerificadas / comerciosTotal) * 100),
      detalles: { verificadas: habilitadasVerificadas, total: comerciosTotal },
    },
    {
      nodo_key: nodoKey,
      kpi_key: 'titularidad_verificada_pct',
      valor: comerciosTotal === 0 ? null : Math.round((titularidadesVerificadas / comerciosTotal) * 100),
      detalles: { verificadas: titularidadesVerificadas, total: comerciosTotal },
    },
    { nodo_key: nodoKey, kpi_key: 'ofertas_activas', valor: ofertasActivas, detalles: {} },
  ];

  for (const s of snapshots) {
    await upsertSnapshot(s.nodo_key, s.kpi_key, s.valor, s.detalles, now);
  }
  return snapshots;
}

