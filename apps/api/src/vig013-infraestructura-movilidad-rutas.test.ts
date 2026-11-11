import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// NODO-VIG VIG-013 (#382, épica #377 — patrón NCAP-R5 #157): dashboard
// público «Infraestructura y movilidad» — GET /api/nodos/:key/
// infraestructura-movilidad. Regla R5/ADR-036: conteos CON cobertura y
// fecha SIEMPRE, jamás puntajes globales; anuncio ≠ obra (R15); la
// comunidad corrobora, NUNCA verifica (R15); sin geometría publicada
// (ADR-036 — el dashboard cuenta, no dibuja); la capa parada_transporte
// nace VACÍA (sin padrón verificado no se siembran paradas — R15) y las
// brechas SOS por tramo son DECLARADAS (ADR-027, documento vecinal
// interno). Las aserciones se DERIVAN del dominio vivo (GET
// /api/nodos/:key/features y la tabla pedidos) para no contaminarse con
// las escrituras de otras suites del mismo job (lección VIG-011). El
// bloque kpis ejerce el patrón VIG-003: recompute idempotente → 25
// snapshots (set v1 + set v2 + set v2 mercado MK-3a #426 + set observatorio LIC-R1
// #457) y lectura consistente en AMBAS superficies
// (GET /api/nodos/:key/kpis y el dashboard). Requiere Postgres/PostGIS
// real; sin base → skip honesto.

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';
process.env.JWT_SECRET = 'test-jwt-secret-vig013-infraestructura-movilidad-32';

const { createApp } = await import('./app.js');
const prisma = (await import('./lib/prisma.js')).default;
const { recomputeKpisForNode } = await import('@delocalsoy/db');
const { VIG013_KPI_KEYS } = await import('@delocalsoy/contracts');

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

type FeatureRow = {
  id: string;
  layer: string;
  titulo: string;
  estado: string;
  fuente_label: string;
  observado_at: string;
};

async function getJson(path: string): Promise<{ status: number; body: any }> {
  const res = await fetch(base + path);
  return { status: res.status, body: await res.json() };
}

async function featuresDeCapa(nodo: string, capa: string): Promise<FeatureRow[]> {
  const res = await getJson('/api/nodos/' + nodo + '/features');
  expect(res.status).toBe(200);
  const data: FeatureRow[] = res.body.data ?? [];
  return data.filter((f) => f.layer === capa);
}

function contarPorEstado(rows: { estado: string }[]): Record<string, number> {
  const por: Record<string, number> = {};
  for (const r of rows) por[r.estado] = (por[r.estado] ?? 0) + 1;
  return por;
}

function suma(obj: Record<string, number>): number {
  return Object.values(obj).reduce((acc, n) => acc + n, 0);
}

describe.skipIf(!dbUp)('Dashboard infraestructura-movilidad VIG-013 (#382, épica #377)', () => {
  it('estructura del dashboard (6 secciones, regla R5) y 404 en nodo inexistente', async () => {
    const res = await getJson('/api/nodos/iglesia/infraestructura-movilidad');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const data = res.body.data;
    expect(data.nodo_key).toBe('iglesia');
    expect(data.generado_en).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(data.regla).toContain('R5/ADR-036');
    for (const seccion of [
      'obras',
      'puntos_criticos',
      'paradas_transporte',
      'cobertura_sos',
      'pedidos_dpv',
      'kpis',
    ]) {
      expect(data).toHaveProperty(seccion);
    }

    // R15: nodo inexistente → 404 honesto, sin datos simulados.
    const missing = await getJson('/api/nodos/nodo-que-no-existe-vig013/infraestructura-movilidad');
    expect(missing.status).toBe(404);
    expect(missing.body.success).toBe(false);
  });

  it('obras viales: por_estado y por_fuente derivadas del dominio, km null honesto (R15)', async () => {
    const obrasDominio = await featuresDeCapa('iglesia', 'obra_vial');
    const res = await getJson('/api/nodos/iglesia/infraestructura-movilidad');
    expect(res.status).toBe(200);
    const obras = res.body.data.obras;

    expect(obras.total).toBe(obrasDominio.length);
    expect(obras.por_estado).toEqual(contarPorEstado(obrasDominio));
    expect(suma(obras.por_estado)).toBe(obras.total);

    const porFuente: Record<string, number> = {};
    for (const f of obrasDominio) porFuente[f.fuente_label] = (porFuente[f.fuente_label] ?? 0) + 1;
    expect(obras.por_fuente.length).toBe(Object.keys(porFuente).length);
    expect(suma(Object.fromEntries(obras.por_fuente.map((x: any) => [x.fuente, x.total])))).toBe(
      obras.total
    );

    // km null honesto: los km de los tramos no están estructurados en
    // fuente verificada — null ≠ 0 (R15).
    expect(obras.km_ejecucion).toBeNull();
    expect(obras.km_nota).toContain('null honesto');
    expect(obras.cautela).toContain('anuncio ≠ obra');
  });

  it('puntos críticos del AMC: derivados del dominio y SIN geometría publicada (ADR-036)', async () => {
    const criticosDominio = await featuresDeCapa('iglesia', 'punto_critico');
    const res = await getJson('/api/nodos/iglesia/infraestructura-movilidad');
    expect(res.status).toBe(200);
    const pc = res.body.data.puntos_criticos;

    expect(pc.total).toBe(criticosDominio.length);
    expect(pc.por_estado).toEqual(contarPorEstado(criticosDominio));
    expect(suma(pc.por_estado)).toBe(pc.total);

    // Lista: id/titulo/estado/observado_at del dominio vivo, jamás un
    // puntaje global (R5).
    expect(pc.criticos.length).toBe(criticosDominio.length);
    const idsDominio = new Set(criticosDominio.map((f) => f.id));
    for (const c of pc.criticos) {
      expect(idsDominio).toContain(c.id);
      expect(c.titulo).toBe(criticosDominio.find((f) => f.id === c.id)?.titulo);
      expect(typeof c.estado).toBe('string');
      expect(c.observado_at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    expect(pc.cautela).toContain('corrobora');

    // ADR-036: el dashboard cuenta, no dibuja — el body NO publica lat/lng.
    const body = JSON.stringify(res.body);
    expect(body).not.toContain('"lat"');
    expect(body).not.toContain('"lng"');
  });

  it('paradas de transporte: capa nace VACÍA con cobertura declarada (R15)', async () => {
    const paradasDominio = await featuresDeCapa('iglesia', 'parada_transporte');
    const res = await getJson('/api/nodos/iglesia/infraestructura-movilidad');
    expect(res.status).toBe(200);
    const paradas = res.body.data.paradas_transporte;

    // Derivado del dominio: sin padrón verificado la capa nace VACÍA.
    expect(paradas.total).toBe(paradasDominio.length);
    expect(paradas.por_estado).toEqual(contarPorEstado(paradasDominio));
    expect(paradas.cobertura).toBe(
      paradasDominio.length + ' paradas registradas (sin padrón verificado — R15)'
    );
    expect(paradas.fuente).toContain('secundaria/provisional');
    expect(paradas.cautela).toContain('nace VACÍA');
  });

  it('cobertura SOS: red derivada del dominio + 3 brechas DECLARADAS (ADR-027)', async () => {
    const sosDominio = await featuresDeCapa('iglesia', 'cobertura_sos');
    const res = await getJson('/api/nodos/iglesia/infraestructura-movilidad');
    expect(res.status).toBe(200);
    const sos = res.body.data.cobertura_sos;

    expect(sos.red_por_estado).toEqual(contarPorEstado(sosDominio));

    // Brechas por tramo DECLARADAS por el trabajo territorial — constantes
    // del módulo, fuente ADR-027, jamás padrón oficial (R15).
    expect(sos.brechas_declaradas.length).toBe(3);
    const tramos = sos.brechas_declaradas.map((b: any) => b.tramo);
    expect(tramos).toContain('RN 150 tramo Las Flores–Colola');
    expect(tramos).toContain('RN 150 tramo Rodeo–Jáchal');
    expect(tramos).toContain('RN 149 bajada Alto del Colorado–Villa Iglesia');
    for (const b of sos.brechas_declaradas) {
      expect(b.estado).toBe('declarada');
      expect(b.fuente).toContain('ADR-027');
    }
    expect(sos.cautela).toContain('DECLARADAS');
  });

  it('pedidos a DPV: resumen consistente con la tabla VIG-012 (X de 15 · corte)', async () => {
    const res = await getJson('/api/nodos/iglesia/infraestructura-movilidad');
    expect(res.status).toBe(200);
    const dpv = res.body.data.pedidos_dpv;

    // Derivado de la tabla pedidos (VIG-012 #379) — mismo cálculo que la
    // ruta, jamás datos simulados (R15).
    const pedidos: any[] = await prisma.pedidos.findMany({ where: { nodo_key: 'iglesia' } });
    const presentados = pedidos.length;
    const respondidos = pedidos.filter(
      (p) => p.estado === 'respondido_en_plazo' || p.estado === 'respondido_tardio'
    ).length;

    expect(dpv.esperados_documento).toBe(15); // PEDIDOS_DPV_ESPERADOS
    expect(dpv.presentados).toBe(presentados);
    expect(dpv.respondidos).toBe(respondidos);
    expect(dpv.fecha_corte).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(dpv.cobertura).toBe(
      presentados + ' de 15 presentados · ' + respondidos + ' respondidos (corte ' + dpv.fecha_corte + ')'
    );
  });

  it('KPIs set v2 (patrón VIG-003): recompute 25, lectura 25 y dashboard 6 consistentes', async () => {
    // Idempotencia estructural VIG-003: el recompute RE-DERIVA desde el
    // dominio — set v1 (9) + set v2 (6) + set v2 mercado (6, MK-3a #426) +
    // set observatorio (4, LIC-R1 #457) = 25 snapshots.
    const snapshots = await recomputeKpisForNode('iglesia');
    expect(snapshots.length).toBe(25); // set v1 (VIG-003) + set v2 (VIG-013) + set v2 mercado (MK-3a #426) + 4 del observatorio (LIC-R1 #457)

    const kpisRes = await getJson('/api/nodos/iglesia/kpis');
    expect(kpisRes.status).toBe(200);
    expect(kpisRes.body.count).toBe(25); // set v1 (VIG-003) + set v2 (VIG-013) + set v2 mercado (MK-3a #426) + 4 del observatorio (LIC-R1 #457)
    const porKey = new Map<string, any>();
    for (const row of kpisRes.body.data ?? []) porKey.set(row.kpi_key, row);

    const res = await getJson('/api/nodos/iglesia/infraestructura-movilidad');
    expect(res.status).toBe(200);
    const kpis = res.body.data.kpis;

    // El dashboard lee SOLO las 6 claves VIG-013 de kpi_snapshots.
    expect(kpis.total).toBe(6);
    const claves = new Set(kpis.snapshots.map((k: any) => k.kpi_key));
    expect(claves.size).toBe(6);
    for (const clave of [...VIG013_KPI_KEYS]) expect(claves).toContain(clave);

    // Consistencia entre AMBAS superficies de lectura (kpis ↔ dashboard).
    for (const k of kpis.snapshots) {
      const espejo = porKey.get(k.kpi_key);
      expect(espejo).toBeDefined();
      expect(k.valor).toBe(espejo.valor);
      expect(k.detalles).toEqual(espejo.detalles);
      expect(k.computed_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }

    // Honestidad del set v2 (R15): km null honesto y respondidos contra la
    // tabla pedidos — coherentes con el resto del dashboard.
    const km = kpis.snapshots.find((k: any) => k.kpi_key === 'obras_km_ejecucion');
    expect(km.valor).toBeNull();
    const respondidosKpi = kpis.snapshots.find((k: any) => k.kpi_key === 'pedidos_respondidos');
    expect(respondidosKpi.valor).toBe(res.body.data.pedidos_dpv.respondidos);
    expect(kpis.nota).toContain('VIG-003');
  });
});
