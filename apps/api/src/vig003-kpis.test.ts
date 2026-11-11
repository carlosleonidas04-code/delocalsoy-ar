import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// NODO-VIG VIG-003 (NVIG-R3 #182, épica #167): KPIs del nodo — snapshots
// materializados idempotentes (tabla kpi_snapshots, upsert por
// nodo_key+kpi_key) + lectura pública GET /api/nodos/:key/kpis. Set honesto
// v1 ratificado por la DH (2026-10-14): SOLO agregados sin PII (Ley 25.326),
// visibilidad restricted excluida del cálculo (ADR-036), cobertura v1 =
// null honesto (R15). Este suite ejerce el recompute directamente (el
// consumidor vig003-kpi tiene su propia suite en apps/worker) y verifica la
// consistencia dominio → recompute → API leyendo AMBAS superficies. Las
// aserciones son consistentes con el dominio vivo (no hard-coded) porque
// otras suites del job test escriben activos de prueba en el mismo nodo.
// Requiere Postgres/PostGIS real; sin base → skip honesto.

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';
process.env.JWT_SECRET = 'test-jwt-secret-vig003-kpis-del-nodo-32';

const { createApp } = await import('./app.js');
const prisma = (await import('./lib/prisma.js')).default;
const { recomputeKpisForNode, Prisma } = await import('@delocalsoy/db');

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

type SnapshotRow = { kpi_key: string; valor: number | null; detalles: Record<string, number> };

async function getJson(path: string): Promise<{ status: number; body: any }> {
  const res = await fetch(base + path);
  return { status: res.status, body: await res.json() };
}

function porKey(body: any): Map<string, SnapshotRow> {
  const map = new Map<string, SnapshotRow>();
  for (const row of body.data ?? []) map.set(row.kpi_key, row);
  return map;
}

async function kpisDe(nodo: string): Promise<Map<string, SnapshotRow>> {
  await recomputeKpisForNode(nodo);
  const res = await getJson('/api/nodos/' + nodo + '/kpis');
  expect(res.status).toBe(200);
  expect(res.body.count).toBe(26); // set v1 (VIG-003) + set v2 (VIG-013) + set v2 mercado (MK-3a #426) + set observatorio (LIC-R1 #457) + 1 accesibilidad (LIC-R2 #453)
  return porKey(res.body);
}

describe.skipIf(!dbUp)('KPIs del nodo VIG-003 (#182, épica #167)', () => {
  it('recompute de iglesia → 9 KPIs consistentes con el dominio leído por la API', async () => {
    const subnodosRes = await getJson('/api/nodos/iglesia/subnodos');
    const subnodos: any[] = subnodosRes.body.data ?? [];
    const activosRes = await getJson('/api/activos?nodo=iglesia');
    const activos: any[] = activosRes.body.data ?? [];

    const snapshots = await recomputeKpisForNode('iglesia');
    expect(snapshots.length).toBe(26); // set v1 (VIG-003) + set v2 (VIG-013) + set v2 mercado (MK-3a #426) + set observatorio (LIC-R1 #457) + 1 accesibilidad (LIC-R2 #453)
    const map = await kpisDe('iglesia');

    // Subnodos: total y con punto público consistentes con la lectura pública.
    expect(map.get('subnodos_total')?.valor).toBe(subnodos.length);
    const conPunto = subnodos.filter((s: any) => s.lat !== null && s.lng !== null).length;
    expect(map.get('subnodos_con_punto')?.valor).toBe(conPunto);

    // Por distrito: cada no-distrito cuenta exactamente una vez y las claves
    // son distritos reales (o '_sin_distrito' para hijos directos del nodo).
    const porDistrito = map.get('subnodos_por_distrito')?.detalles ?? {};
    const distritos = new Set(subnodos.filter((s: any) => s.type === 'district').map((s: any) => s.key));
    const sumaDistrito = Object.values(porDistrito).reduce((a: number, b: number) => a + b, 0);
    expect(sumaDistrito).toBe(subnodos.length - distritos.size);
    for (const clave of Object.keys(porDistrito)) {
      expect(clave === '_sin_distrito' || distritos.has(clave)).toBe(true);
    }

    // Activos: consistentes con la lectura pública (que excluye restricted).
    const porEstado = map.get('activos_por_estado')?.detalles ?? {};
    const aprobadosPublicos = activos.filter((a: any) => a.estado === 'aprobado').length;
    expect(porEstado['aprobado'] ?? 0).toBe(aprobadosPublicos);

    // Capital N1: consistente con la consulta relacional de clasificaciones
    // primarias (mismo predicado, otra vía) — la semilla aporta >= 3/2/1.
    const clasif: any[] = await prisma.activos_clasificaciones.findMany({
      where: { is_primary: true, activo: { nodo_key: 'iglesia', visibilidad: { not: 'restricted' } } },
      select: { n1: true },
    });
    const esperadoN1: Record<string, number> = {};
    for (const c of clasif) esperadoN1[c.n1] = (esperadoN1[c.n1] ?? 0) + 1;
    expect(map.get('activos_por_capital_n1')?.detalles).toEqual(esperadoN1);
    expect(esperadoN1['patrimonial'] ?? 0).toBeGreaterThanOrEqual(3);
    expect(esperadoN1['productivo_rural'] ?? 0).toBeGreaterThanOrEqual(2);
    expect(esperadoN1['turistico'] ?? 0).toBeGreaterThanOrEqual(1);

    // Verificados (ADR-035): mismo predicado por la vía Prisma — >= 6 de semilla.
    const verificadosDirecto = await prisma.activos.count({
      where: {
        nodo_key: 'iglesia',
        estado: 'aprobado',
        procedencia: { not: Prisma.DbNull },
        visibilidad: { not: 'restricted' },
      },
    });
    expect(map.get('activos_verificados')?.valor).toBe(verificadosDirecto);
    expect(verificadosDirecto).toBeGreaterThanOrEqual(6);

    // Cobertura v1: null honesto (R15) con desglose verificable.
    expect(map.get('cobertura_geometrica')?.valor).toBeNull();

    // Eventos (deuda ADR-030): consistente con el filtrado por payload.
    const eventosRows = (await prisma.$queryRaw(
      Prisma.sql`SELECT COUNT(*)::int AS total FROM events_raw WHERE payload->>'nodo_key' = 'iglesia'`
    )) as Array<{ total: number }>;
    expect(map.get('eventos_por_tipo')?.valor).toBe(eventosRows[0]?.total ?? 0);
  });

  it('nodo inexistente → 404 honesto (R15)', async () => {
    const res = await getJson('/api/nodos/inexistente-vig003/kpis');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('recompute de caucete (base territorial activada, NODO-CAU R6 #145) → 9 KPIs honestos', async () => {
    // caucete ya no está sin subnodos: NODO-CAU R6 (#145) sembró 10 entidades
    // Georef/INDEC (1 district + 9 locality) — las aserciones se derivan del
    // dominio vivo con el MISMO predicado del test de iglesia (R15).
    const subnodosRes = await getJson('/api/nodos/caucete/subnodos');
    const subnodos: any[] = subnodosRes.body.data ?? [];
    expect(subnodos.length).toBe(10);

    const map = await kpisDe('caucete');
    expect(map.get('subnodos_total')?.valor).toBe(subnodos.length);
    const conPunto = subnodos.filter((s: any) => s.lat !== null && s.lng !== null).length;
    expect(map.get('subnodos_con_punto')?.valor).toBe(conPunto);
    // Por distrito: 1 district (localidad censal Caucete) + hijos directos
    // del nodo → '_sin_distrito' — cada no-distrito cuenta exactamente 1 vez.
    const porDistrito = map.get('subnodos_por_distrito')?.detalles ?? {};
    const distritos = new Set(subnodos.filter((s: any) => s.type === 'district').map((s: any) => s.key));
    const sumaDistrito = Object.values(porDistrito).reduce((a: number, b: number) => a + b, 0);
    expect(sumaDistrito).toBe(subnodos.length - distritos.size);
    for (const clave of Object.keys(porDistrito)) {
      expect(clave === '_sin_distrito' || distritos.has(clave)).toBe(true);
    }
    expect(map.get('cobertura_geometrica')?.valor).toBeNull();
  });

  it('re-computar es idempotente: sin duplicados y valores estables', async () => {
    const antes = await kpisDe('iglesia');
    const despues = await kpisDe('iglesia');
    for (const [k, row] of antes) {
      expect(despues.get(k)?.valor).toBe(row.valor);
    }
  });

  it('un activo restricted NO entra en ningún KPI (ADR-036) y la limpieza restaura el estado', async () => {
    const antes = await kpisDe('iglesia');
    const verificadosAntes = antes.get('activos_verificados')?.valor;
    const aprobadosAntes = (antes.get('activos_por_estado')?.detalles ?? {})['aprobado'];

    const ts = Date.now();
    const hash = 'test-vig003-restricted-' + ts;
    await prisma.activos.create({
      data: {
        tipo: 'patrimonio',
        titulo: 'Activo restringido test VIG-003',
        estado: 'aprobado',
        nodo_key: 'iglesia',
        visibilidad: 'restricted',
        procedencia: { source_id: 'test-vig003', fuente: 'test', fecha: '2026' },
        created_by_hash: 'test-vig003-' + ts,
        hash,
      },
    });

    const con = await kpisDe('iglesia');
    expect(con.get('activos_verificados')?.valor).toBe(verificadosAntes);
    expect((con.get('activos_por_estado')?.detalles ?? {})['aprobado']).toBe(aprobadosAntes);

    await prisma.activos.deleteMany({ where: { hash } });
    const sin = await kpisDe('iglesia');
    expect(sin.get('activos_verificados')?.valor).toBe(verificadosAntes);
    expect((sin.get('activos_por_estado')?.detalles ?? {})['aprobado']).toBe(aprobadosAntes);
  });
});

