import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// CORE-003 R1/R2 (#83): rutas de lectura del vocabulario + seed del
// vocabulario (nodos/capas/categorias/features/reportes). Requiere
// Postgres/PostGIS real (job test de CI); sin base → skip honesto (patrón
// seed-territorios). El test ejecuta el comando REAL (db:seed), no una copia
// de la lógica.
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

beforeAll(async () => {
  execSync('pnpm --filter @delocalsoy/db db:seed', { cwd: repoRoot, stdio: 'pipe' });
  server = createApp().listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = 'http://127.0.0.1:' + server.address().port;
});

afterAll(async () => {
  await new Promise((resolve, reject) => {
    server.close((err: any) => {
      if (err) reject(err);
      else resolve(null);
    });
    if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
  });
});

describe.skipIf(!dbUp)('Rutas del vocabulario CORE-002 (CORE-003, #83)', () => {
  it('GET /api/nodos devuelve los 3 nodos con población y centro reales', async () => {
    const res = await fetch(base + '/api/nodos');
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.success).toBe(true);
    expect(body.count).toBeGreaterThanOrEqual(3);
    const nombres: string[] = body.data.map((n: any) => n.nombre);
    for (const nombre of ['Capital', 'Caucete', 'Iglesia']) {
      expect(nombres, 'falta el nodo ' + nombre).toContain(nombre);
    }
    const capital = body.data.find((n: any) => n.key === 'capital');
    expect(capital.poblacion).toBeGreaterThan(0);
    expect(capital.centro_lat).not.toBe(0);
    expect(capital.centro_lng).not.toBe(0);
  });

  it('GET /api/nodos/:key — 200 real y 404 honesto', async () => {
    const ok = await fetch(base + '/api/nodos/capital');
    expect(ok.status).toBe(200);
    const body: any = await ok.json();
    expect(body.data.key).toBe('capital');
    const missing = await fetch(base + '/api/nodos/no-existe');
    expect(missing.status).toBe(404);
    const bodyMissing: any = await missing.json();
    expect(bodyMissing.success).toBe(false);
  });

  it('GET /api/nodos/capital/capas — catálogo explícito del vocabulario v5.1', async () => {
    const res = await fetch(base + '/api/nodos/capital/capas');
    expect(res.status).toBe(200);
    const body: any = await res.json();
    const keys: string[] = body.data.map((c: any) => c.key);
    for (const k of ['commerce', 'public_space', 'public_lighting', 'trees', 'sidewalks', 'irrigation_channels']) {
      expect(keys, 'falta la capa ' + k).toContain(k);
    }
    for (const c of body.data) {
      expect(['assets', 'problems', 'public_space', 'health', 'community', 'production', 'tourism']).toContain(c.dominio);
      expect(['Point', 'LineString']).toContain(c.geometria);
      expect(typeof c.default_on).toBe('boolean');
    }
  });

  it('GET /api/nodos/:key/categorias — layer apunta a una capa existente del nodo', async () => {
    for (const key of ['capital', 'caucete', 'iglesia']) {
      const res = await fetch(base + '/api/nodos/' + key + '/categorias');
      expect(res.status).toBe(200);
      const body: any = await res.json();
      expect(body.count).toBeGreaterThan(0);
      const capasRes = await fetch(base + '/api/nodos/' + key + '/capas');
      const capas: any = await capasRes.json();
      const capaKeys: string[] = capas.data.map((c: any) => c.key);
      for (const cat of body.data) {
        expect(capaKeys, 'categoría ' + cat.code + ' apunta a capa inexistente ' + cat.layer).toContain(cat.layer);
      }
    }
  });

  it('GET /api/nodos/:key/features — lat/lng reales de San Juan, tipo y fuente válidos', async () => {
    for (const key of ['capital', 'caucete', 'iglesia']) {
      const res = await fetch(base + '/api/nodos/' + key + '/features');
      expect(res.status).toBe(200);
      const body: any = await res.json();
      expect(body.count).toBeGreaterThanOrEqual(5);
      for (const f of body.data) {
        expect(['asset', 'problem']).toContain(f.tipo);
        expect(f.lat).toBeGreaterThan(-33);
        expect(f.lat).toBeLessThan(-29);
        expect(f.lng).toBeGreaterThan(-70);
        expect(f.lng).toBeLessThan(-66);
        // datos de diseño hasta que exista relevamiento real (regla de la demo)
        expect(f.is_synthetic).toBe(true);
        expect(f.fuente_label.startsWith('Ilustrativa ·')).toBe(true);
      }
    }
  });

  it('GET /api/nodos/:key/reportes — estados del flujo válidos', async () => {
    const res = await fetch(base + '/api/nodos/capital/reportes');
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.count).toBeGreaterThanOrEqual(1);
    for (const r of body.data) {
      expect(['received', 'evaluating', 'in_progress', 'resolved']).toContain(r.estado);
      expect(typeof r.lat).toBe('number');
      expect(typeof r.lng).toBe('number');
    }
  });

  it('db:seed re-ejecutado no duplica el vocabulario (idempotencia total)', async () => {
    const antes = await Promise.all([
      prisma.nodos.count(),
      prisma.capas.count(),
      prisma.categorias.count(),
      prisma.features.count(),
      prisma.reportes.count(),
    ]);
    execSync('pnpm --filter @delocalsoy/db db:seed', { cwd: repoRoot, stdio: 'pipe' });
    const despues = await Promise.all([
      prisma.nodos.count(),
      prisma.capas.count(),
      prisma.categorias.count(),
      prisma.features.count(),
      prisma.reportes.count(),
    ]);
    expect(despues).toEqual(antes);
  });
});
