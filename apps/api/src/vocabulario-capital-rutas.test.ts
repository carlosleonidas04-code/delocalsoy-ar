import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// NODO-CAPITAL NCAP-R1 (#153, épica #152): vocabulario del nodo Capital —
// capas (v5.1 + accessibility + landmarks), categorías de reporte alineadas
// a los dominios del documento y features seed alineadas al catálogo global
// corredor_hitos (#156). Análogo de NODO-CAU R1 (#141). Requiere
// Postgres/PostGIS real (job test de CI); sin base → skip honesto (patrón
// nodos-rutas). El test ejecuta el comando REAL (db:seed), no una copia.
// Paridad syntheticData (criterio de cierre #153): todo feature es
// sintético/ilustrativo (is_synthetic=true, fuente «Ilustrativa · …»,
// estado synthetic_demo) — las convenciones 1:1 del vocabulario sintético
// v5.1 de apps/web/src/demo/syntheticData.js (fixtures congelados ADR-040:
// no se extienden; el frontend #163 consumirá este vocabulario del API).
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';

const { createApp } = await import('./app.js');
const { prisma } = await import('@delocalsoy/db');

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

const dbUp = await prisma
  .$queryRaw`SELECT 1`
  .then(() => true)
  .catch(() => false);

let server: any;
let base = '';

// Envolvente estricta del nodo Capital (CoordenadaCapitalSchema, #154).
const LAT_MIN = -31.6, LAT_MAX = -31.45, LNG_MIN = -68.6, LNG_MAX = -68.45;

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

async function getJson(path: string): Promise<any> {
  const res = await fetch(base + path);
  return { status: res.status, body: await res.json() };
}

const CAPAS_V51 = ['commerce', 'public_space', 'public_lighting', 'trees', 'sidewalks', 'irrigation_channels'];
const HITOS_R1 = ['hit_plaza_25_de_mayo', 'hit_catedral', 'hit_casa_natal_sarmiento', 'hit_basilica_desamparados'];

describe.skipIf(!dbUp)('Vocabulario del nodo Capital NCAP-R1 (#153)', () => {
  it('GET /api/nodos/capital/capas — v5.1 + accessibility (complementaria) + landmarks', async () => {
    const { status, body } = await getJson('/api/nodos/capital/capas');
    expect(status).toBe(200);
    expect(body.count).toBe(8);
    const keys: string[] = body.data.map((c: any) => c.key);
    for (const k of [...CAPAS_V51, 'accessibility', 'landmarks']) {
      expect(keys, 'falta la capa ' + k).toContain(k);
    }
    const accessibility = body.data.find((c: any) => c.key === 'accessibility');
    expect(accessibility.dominio).toBe('problems');
    expect(accessibility.geometria).toBe('Point'); // puntos: los tramos siguen en sidewalks (#157)
    expect(accessibility.default_on).toBe(false);
    const landmarks = body.data.find((c: any) => c.key === 'landmarks');
    expect(landmarks.dominio).toBe('assets');
    expect(landmarks.geometria).toBe('Point');
    expect(landmarks.default_on).toBe(true);
  });

  it('categorías nuevas alineadas a los dominios del documento (movilidad + espacio público)', async () => {
    const { body } = await getJson('/api/nodos/capital/categorias');
    expect(body.count).toBe(12);
    const porCode = new Map(body.data.map((c: any) => [c.code, c]));
    expect(porCode.get('missing_ramp')?.layer).toBe('accessibility');
    expect(porCode.get('obstructed_sidewalk')?.layer).toBe('accessibility');
    expect(porCode.get('unsafe_crossing')?.layer).toBe('accessibility');
    expect(porCode.get('damaged_landmark')?.layer).toBe('landmarks');
    const capas = await getJson('/api/nodos/capital/capas');
    const capaKeys: string[] = capas.body.data.map((c: any) => c.key);
    for (const cat of body.data) {
      expect(capaKeys, 'categoría ' + cat.code + ' apunta a capa inexistente ' + cat.layer).toContain(cat.layer);
    }
  });

  it('features landmarks (9): alineados a corredor_hitos, sintéticos/ilustrativos (paridad)', async () => {
    const { body } = await getJson('/api/nodos/capital/features');
    const landmarks = body.data.filter((f: any) => f.layer === 'landmarks');
    expect(landmarks.length).toBe(9);
    const hitos: any[] = await prisma.corredor_hitos.findMany({ where: { nodo_key: 'capital' }, select: { key: true } });
    const hitoKeys = new Set(hitos.map((h: any) => h.key));
    for (const f of landmarks) {
      expect(f.id.startsWith('seed-f-hit_')).toBe(true); // alineación estructural: id = seed-f-<hito_key>
      expect(hitoKeys.has(f.id.replace('seed-f-', '')), 'feature ' + f.id + ' sin hito en corredor_hitos').toBe(true);
      expect(f.tipo).toBe('asset');
      expect(f.estado).toBe('synthetic_demo');
      expect(f.is_synthetic).toBe(true);
      expect(f.fuente_label.startsWith('Ilustrativa ·')).toBe(true);
      expect(f.lat).toBeGreaterThan(LAT_MIN);
      expect(f.lat).toBeLessThan(LAT_MAX);
      expect(f.lng).toBeGreaterThan(LNG_MIN);
      expect(f.lng).toBeLessThan(LNG_MAX);
    }
  });

  it('features accessibility (4): puntos complementarios de sidewalks, sintéticos', async () => {
    const { body } = await getJson('/api/nodos/capital/features');
    const acc = body.data.filter((f: any) => f.layer === 'accessibility');
    expect(acc.length).toBe(4);
    for (const f of acc) {
      expect(['asset', 'problem']).toContain(f.tipo);
      expect(f.estado).toBe('synthetic_demo');
      expect(f.is_synthetic).toBe(true);
      expect(f.fuente_label.startsWith('Ilustrativa ·')).toBe(true);
      expect(f.lat).toBeGreaterThan(LAT_MIN);
      expect(f.lat).toBeLessThan(LAT_MAX);
      expect(f.lng).toBeGreaterThan(LNG_MIN);
      expect(f.lng).toBeLessThan(LNG_MAX);
    }
  });

  it('corredor_hitos: catálogo global 11 hitos del nodo, lat/lng NULL honestos (R15)', async () => {
    const hitos: any[] = await prisma.corredor_hitos.findMany({ where: { nodo_key: 'capital' } });
    expect(hitos.length).toBe(11);
    const keys = new Set(hitos.map((h: any) => h.key));
    for (const k of HITOS_R1) expect(keys.has(k), 'falta el hito ' + k).toBe(true);
    for (const h of hitos) {
      expect(h.lat).toBeNull();
      expect(h.lng).toBeNull();
    }
  });

  it('sellos seed-ncap-r1 en events_raw: 2 capas + 4 hitos, sin PII', async () => {
    const sellos: any[] = await prisma.events_raw.findMany({
      where: { type: { in: ['capa.registrada', 'hito.registrado'] } },
      select: { type: true, hash: true, payload: true },
    });
    const r1 = sellos.filter((s: any) => s.payload?.source === 'seed-ncap-r1');
    expect(r1.length).toBe(6);
    expect(r1.filter((s: any) => s.type === 'capa.registrada').length).toBe(2);
    expect(r1.filter((s: any) => s.type === 'hito.registrado').length).toBe(4);
    for (const s of r1) {
      expect(s.hash.startsWith('seed-capa-capital-') || s.hash.startsWith('seed-hito-')).toBe(true);
      expect(JSON.stringify(s.payload)).not.toContain('@'); // sin PII
    }
  });

  it('idempotencia: re-ejecutar db:seed no duplica el vocabulario', async () => {
    const nodo = await prisma.nodos.findFirst({ where: { key: 'capital' } });
    const antes = await Promise.all([
      prisma.capas.count({ where: { nodo_id: nodo!.id } }),
      prisma.categorias.count({ where: { nodo_id: nodo!.id } }),
      prisma.features.count({ where: { nodo_id: nodo!.id } }),
      prisma.corredor_hitos.count({ where: { nodo_key: 'capital' } }),
      prisma.events_raw.count(),
    ]);
    execSync('pnpm --filter @delocalsoy/db db:seed', { cwd: repoRoot, stdio: 'pipe' });
    const despues = await Promise.all([
      prisma.capas.count({ where: { nodo_id: nodo!.id } }),
      prisma.categorias.count({ where: { nodo_id: nodo!.id } }),
      prisma.features.count({ where: { nodo_id: nodo!.id } }),
      prisma.corredor_hitos.count({ where: { nodo_key: 'capital' } }),
      prisma.events_raw.count(),
    ]);
    expect(despues).toEqual(antes);
    expect(despues[0]).toBe(8);
    expect(despues[1]).toBe(12);
    expect(despues[2]).toBe(19);
    expect(despues[3]).toBe(11);
  }, 60000);
});
