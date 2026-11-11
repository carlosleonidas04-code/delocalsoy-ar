import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// LIC-DLUI LIC-R1 (LIC-01 #457, épica #448): observatorio de indicadores —
// 4 KPIs del set LIC-01 (kpi_snapshots, patrón VIG-003/MK-3a) + lectura
// pública GET /api/nodos/:key/observatorio con fichas metodológicas por
// clave (DL-1: fórmula+fuente+cobertura, patrón IDERA v2.0) y familias
// nuevas del temario declaradas `sin_fuente_ingestada` (DL-1: null ≠ 0,
// R15 — sin fuente ingestado el indicador NO se computa, jamás se estima).
// Este suite ejerce el recompute directamente (patrón vig003-kpis.test.ts)
// y verifica consistencia dominio → recompute → panel leyendo AMBAS
// superficies con el MISMO predicado (aserciones dinámicas, no
// hard-coded, porque otras suites del job test escriben en el mismo
// nodo). Requiere Postgres/PostGIS real; sin base → skip honesto.

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';
process.env.JWT_SECRET = 'test-jwt-secret-lic-r1-observatorio-457';

const { createApp } = await import('./app.js');
const prisma = (await import('./lib/prisma.js')).default;
const { recomputeKpisForNode, Prisma } = await import('@delocalsoy/db');
const { LIC01_KPI_KEYS, LIC02_KPI_KEYS, OBSERVATORIO_KPI_KEYS } = await import('@delocalsoy/contracts');

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

const dbUp = await prisma
  .$queryRaw`SELECT 1`
  .then(() => true)
  .catch(() => false);

let server: any;
let base = '';

beforeAll(async () => {
  execSync('pnpm --filter @delocalsoy/db db:seed', { cwd: repoRoot, stdio: 'pipe' });
  server = createApp().listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = 'http://127.0.0.1:' + server.address().port;
}, 60000);

afterAll(async () => {
  await new Promise((resolve, reject) => {
    server.close((err: any) => {
      if (err) reject(err);
      else resolve(null);
    });
    if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
  });
});

async function getJson(path: string): Promise<{ status: number; body: any }> {
  const res = await fetch(base + path);
  return { status: res.status, body: await res.json() };
}

type SnapshotRow = { kpi_key: string; valor: number | null; detalles: Record<string, number> };

function porKey(data: any): Map<string, SnapshotRow> {
  const map = new Map<string, SnapshotRow>();
  for (const row of data.kpis?.snapshots ?? []) map.set(row.kpi_key, row);
  return map;
}

async function observatorioDe(nodo: string): Promise<any> {
  await recomputeKpisForNode(nodo);
  const res = await getJson('/api/nodos/' + nodo + '/observatorio');
  expect(res.status).toBe(200);
  return res.body.data;
}

describe.skipIf(!dbUp)('Observatorio de indicadores LIC-R1 (#457, épica #448)', () => {
  it('recompute de iglesia → panel con 4 KPIs consistentes con el dominio (predicados espejo)', async () => {
    const data = await observatorioDe('iglesia');
    expect(data.nodo_key).toBe('iglesia');
    expect(data.regla).toBe('Conteos con cobertura y fecha — jamás puntajes globales (R5/ADR-036)');
    expect(data.kpis.total).toBe(LIC01_KPI_KEYS.length + LIC02_KPI_KEYS.length); // 4 del observatorio (LIC-R1 #457) + 1 accesibilidad (LIC-R2 #453)
    const map = porKey(data);
    for (const clave of [...LIC01_KPI_KEYS, ...LIC02_KPI_KEYS]) expect(map.has(clave)).toBe(true);

    // 1. reportes_por_estado: espejo del predicado CORE-005 (excluye
    // sintéticos y descartado — ADR-038).
    const espejoEstado: Record<string, number> = {};
    for (const r of (await prisma.$queryRaw(Prisma.sql`
      SELECT estado, COUNT(*)::int AS total FROM reportes
      WHERE nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia')
        AND is_synthetic = false AND estado <> 'descartado'
      GROUP BY estado`)) as Array<{ estado: string; total: number }>) {
      espejoEstado[r.estado] = r.total;
    }
    expect(map.get('reportes_por_estado')?.detalles).toEqual(espejoEstado);
    expect(map.get('reportes_por_estado')?.valor).toBe(
      Object.values(espejoEstado).reduce((a: number, b: number) => a + b, 0)
    );

    // 2. fuentes_ingestadas_por_nodo: espejo del pipeline NODO-CAU R2 (#147).
    const espejoFuentes = (await prisma.$queryRaw(Prisma.sql`
      SELECT COUNT(DISTINCT fuente_key)::int AS fuentes,
             COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE estado = 'publicado')::int AS publicadas
      FROM ingestas
      WHERE nodo_key = 'iglesia'`)) as Array<{ fuentes: number; total: number; publicadas: number }>;
    expect(map.get('fuentes_ingestadas_por_nodo')?.valor).toBe(
      espejoFuentes.length ? espejoFuentes[0].fuentes : 0
    );
    expect(map.get('fuentes_ingestadas_por_nodo')?.detalles).toEqual({
      ingestas_total: espejoFuentes.length ? espejoFuentes[0].total : 0,
      ingestas_publicadas: espejoFuentes.length ? espejoFuentes[0].publicadas : 0,
    });

    // 3. capas_con_metadatos: espejo del cruce capas × ingestas (#147).
    const espejoCapas = (await prisma.$queryRaw(Prisma.sql`
      SELECT COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE EXISTS (
               SELECT 1 FROM ingestas i
               WHERE i.nodo_key = 'iglesia' AND i.capa_servicio = c.key
             ))::int AS con_ingesta
      FROM capas c
      WHERE c.nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia')`)) as Array<{ total: number; con_ingesta: number }>;
    const capasConIngesta = espejoCapas.length ? espejoCapas[0].con_ingesta : 0;
    expect(map.get('capas_con_metadatos')?.valor).toBe(capasConIngesta);
    expect(map.get('capas_con_metadatos')?.detalles).toEqual({
      capas_total: espejoCapas.length ? espejoCapas[0].total : 0,
      capas_con_ingesta: capasConIngesta,
    });

    // 4. cobertura_reportes_distrito: espejo del anclaje por cadena parent
    // (mismo criterio que reportes_amc_por_distrito, VIG-013).
    const subnodos = (await prisma.subnodos.findMany({
      where: { nodo_key: 'iglesia' },
      select: { key: true, type: true, parent_key: true },
    })) as Array<{ key: string; type: string; parent_key: string | null }>;
    const porKeySub = new Map(subnodos.map((s) => [s.key, s]));
    const anclajes = (await prisma.$queryRaw(Prisma.sql`
      SELECT subnodo_key, COUNT(*)::int AS total FROM reportes
      WHERE nodo_id = (SELECT id FROM nodos WHERE key = 'iglesia')
        AND is_synthetic = false AND estado <> 'descartado'
        AND subnodo_key IS NOT NULL
      GROUP BY subnodo_key`)) as Array<{ subnodo_key: string; total: number }>;
    const distritosConReporte = new Set<string>();
    for (const r of anclajes) {
      let actual: { key: string; type: string; parent_key: string | null } | undefined = porKeySub.get(r.subnodo_key);
      while (actual) {
        if (actual.type === 'district') {
          distritosConReporte.add(actual.key);
          break;
        }
        actual = actual.parent_key ? porKeySub.get(actual.parent_key) : undefined;
      }
    }
    const distritosTotal = subnodos.filter((s) => s.type === 'district').length;
    expect(map.get('cobertura_reportes_distrito')?.valor).toBe(distritosConReporte.size);
    expect(map.get('cobertura_reportes_distrito')?.detalles).toEqual({
      distritos_total: distritosTotal,
      distritos_con_reporte: distritosConReporte.size,
    });

    // Cobertura y fecha SIEMPRE (R5): computed_at en cada snapshot y
    // fecha_corte derivada del recompute.
    expect(typeof data.kpis.fecha_corte).toBe('string');
    for (const row of data.kpis.snapshots) {
      expect(typeof row.computed_at).toBe('string');
    }
  });

  it('fichas metodológicas: 4, una por clave, con fórmula+fuente+cobertura (DL-1)', async () => {
    const data = await observatorioDe('iglesia');
    const fichas: any[] = data.fichas_metodologicas;
    expect(Array.isArray(fichas)).toBe(true);
    expect(fichas.length).toBe(OBSERVATORIO_KPI_KEYS.length);
    const claves = new Set<string>(fichas.map((f: any) => f.clave));
    for (const clave of OBSERVATORIO_KPI_KEYS) expect(claves.has(clave)).toBe(true);
    for (const f of fichas) {
      expect(f.nombre.length).toBeGreaterThan(0);
      expect(f.formula.length).toBeGreaterThan(0);
      expect(f.fuente.length).toBeGreaterThan(0);
      expect(f.cobertura.length).toBeGreaterThan(0);
    }
  });

  it('familias nuevas del temario: sin_fuente_ingestada con valor null (DL-1, null ≠ 0 — R15)', async () => {
    const data = await observatorioDe('iglesia');
    const familias: any[] = data.familias_sin_fuente_ingestada;
    expect(Array.isArray(familias)).toBe(true);
    expect(familias.length).toBe(4);
    for (const fam of familias) {
      expect(fam.estado).toBe('sin_fuente_ingestada');
      expect(fam.valor).toBeNull(); // null ≠ 0 (R15): sin fuente NO hay métrica.
      expect(fam.familia.length).toBeGreaterThan(0);
      expect(fam.cautela.length).toBeGreaterThan(0);
    }
  });

  it('nodo inexistente → 404 honesto (R15)', async () => {
    const res = await getJson('/api/nodos/inexistente-lic-r1/observatorio');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('capital sin recompute → 0 snapshots honestos (R15, patrón showcase)', async () => {
    const res = await getJson('/api/nodos/capital/observatorio');
    expect(res.status).toBe(200);
    expect(res.body.data.kpis.total).toBe(0);
    expect(res.body.data.kpis.snapshots).toEqual([]);
    expect(res.body.data.kpis.fecha_corte).toBeNull();
    // El panel NUNCA oculta la ficha ni la deuda: se publican igual (DL-1).
    expect(res.body.data.fichas_metodologicas.length).toBe(OBSERVATORIO_KPI_KEYS.length);
    expect(res.body.data.familias_sin_fuente_ingestada.length).toBe(4);
  });

  it('re-computar es idempotente: valores estables en el panel', async () => {
    const antes = (await observatorioDe('iglesia')).kpis.snapshots;
    const despues = (await observatorioDe('iglesia')).kpis.snapshots;
    expect(antes.length).toBe(despues.length);
    for (let i = 0; i < antes.length; i++) {
      expect(despues[i].kpi_key).toBe(antes[i].kpi_key);
      expect(despues[i].valor).toBe(antes[i].valor);
      expect(despues[i].detalles).toEqual(antes[i].detalles);
    }
  });
});
