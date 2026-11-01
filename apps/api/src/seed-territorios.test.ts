import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// EV-021 / CORE-002 T3 (#65): seed idempotente de nodos San Juan (ADR-021).
// Requiere Postgres/PostGIS real (job test de CI). Sin base → skip honesto
// (mismo patrón que events-idempotencia.test.ts). El test ejecuta el comando
// REAL (pnpm --filter @delocalsoy/db db:seed), no una copia de la lógica.
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

const seed = () =>
  execSync('pnpm --filter @delocalsoy/db db:seed', { cwd: repoRoot, stdio: 'pipe' });

describe.skipIf(!dbUp)('Seed idempotente de nodos San Juan (ADR-021, #65)', () => {
  const esperados = ['Capital', 'Caucete', 'Iglesia'];

  it('db:seed crea (o ya creó) los 3 nodos del ADR-021', async () => {
    seed();
    const rows = await prisma.territorios.findMany({ where: { provincia: 'San Juan' } });
    const nombres = rows.map((r: any) => r.nombre);
    for (const nombre of esperados) {
      expect(nombres, 'falta el nodo ' + nombre).toContain(nombre);
    }
  }, 60000);

  it('re-ejecutar db:seed no duplica (idempotencia por NOT EXISTS)', async () => {
    const antes = await prisma.territorios.count({ where: { provincia: 'San Juan' } });
    seed();
    seed();
    const despues = await prisma.territorios.count({ where: { provincia: 'San Juan' } });
    expect(despues).toBe(antes);
  }, 60000);

  it('el seed preserva activo (un soft delete no se revive)', async () => {
    await prisma.territorios.updateMany({
      where: { nombre: 'Capital', provincia: 'San Juan' },
      data: { activo: false },
    });
    seed();
    const capital = await prisma.territorios.findFirst({
      where: { nombre: 'Capital', provincia: 'San Juan' },
    });
    expect(capital?.activo).toBe(false);
    // dejar el estado como estaba para el siguiente run
    await prisma.territorios.updateMany({
      where: { nombre: 'Capital', provincia: 'San Juan' },
      data: { activo: true },
    });
  }, 60000);

  it('GET /api/territorios?bbox de San Juan devuelve los 3 nodos con geometría', async () => {
    const res = await fetch(base + '/api/territorios?bbox=-70.0,-32.0,-66.5,-29.0');
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.success).toBe(true);
    const nombres: string[] = (body.data ?? []).map((t: any) => t.nombre);
    for (const nombre of esperados) {
      expect(nombres, 'bbox no devuelve ' + nombre).toContain(nombre);
    }
  });
});
