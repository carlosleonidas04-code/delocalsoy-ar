import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// NODO-CAU R6 (activación territorial, #145, épica #137): subnodos del
// nodo Caucete — estructura v0.1 ratificada por la DH (2026-10-20): 10
// entidades Georef/INDEC del departamento como referencia estadística —
// 1 district (localidad censal Caucete, área operativa inicial) + 9
// locality (Bermejo, El Rincón, Las Talas - Los Médanos, Pie de Palo,
// Vallecito, Villa Independencia, Marayes, y las entidades Las Talas y
// Los Médanos como hijas de la localidad censal compuesta). A diferencia
// del Capital (puntos BAHRA a verificar → lat/lng null, R15), acá los
// centroides son oficiales y públicos (Georef, apis.datos.gob.ar,
// consultado 2026-10-20) → se publican (ADR-036: punto de dominio, no
// sensible). Todo nace provisional hasta ratificación municipal de
// límites (R15/ADR-035). El test ejecuta el seed REAL (db:seed, que corre
// seed.sql + seed-subnodos.sql + seed-subnodos-caucete.sql + los seeds
// VIG), no una copia de la lógica. Requiere Postgres/PostGIS real (job
// test de CI); sin base → skip honesto (patrón subnodos-rutas).

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

describe.skipIf(!dbUp)('Subnodos del Nodo Caucete — NC-R6 activación territorial (#145, épica #137)', () => {
  it('GET /api/nodos/caucete/subnodos — estructura v0.1 ratificada: 10 entidades Georef', async () => {
    const res = await fetch(base + '/api/nodos/caucete/subnodos');
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.success).toBe(true);
    expect(body.count).toBe(10);
    const keys: string[] = body.data.map((s: any) => s.key);
    for (const k of [
      'sj_caucete_ciudad',
      'sj_caucete_bermejo',
      'sj_caucete_el_rincon',
      'sj_caucete_las_talas_los_medanos',
      'sj_caucete_pie_de_palo',
      'sj_caucete_vallecito',
      'sj_caucete_villa_independencia',
      'sj_caucete_marayes',
      'sj_caucete_las_talas',
      'sj_caucete_los_medanos',
    ]) {
      expect(keys, 'falta la entidad ' + k).toContain(k);
    }
  });

  it('la ciudad Caucete es el district operativo: centroide Georef oficial, provisional (R15)', async () => {
    const res = await fetch(base + '/api/nodos/caucete/subnodos?type=district');
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.count).toBe(1);
    const ciudad = body.data[0];
    expect(ciudad.key).toBe('sj_caucete_ciudad');
    expect(ciudad.label).toBe('Caucete');
    expect(ciudad.nodo_key).toBe('caucete');
    expect(ciudad.parent_key).toBeNull(); // hijo directo del nodo
    expect(ciudad.boundary_status).toBe('provisional'); // hasta ratificación municipal (ADR-035)
    expect(ciudad.assignment_status).toBe('dh_directive'); // estructura v0.1 ratificada por la DH
    expect(ciudad.zone).toBe('valle_de_tulum');
    expect(ciudad.external_id).toBe('70035020'); // localidad censal Caucete (Georef)
    expect(ciudad.external_source).toBe('georef');
    // centroide oficial Georef/INDEC de la localidad censal (-31.6515, -68.2820)
    expect(ciudad.lat).toBeCloseTo(-31.6515, 3);
    expect(ciudad.lng).toBeCloseTo(-68.2820, 3);
  });

  it('las 9 localidades del departamento: referencia estadística Georef, zona valle_de_tulum', async () => {
    const res = await fetch(base + '/api/nodos/caucete/subnodos?type=locality');
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.count).toBe(9);
    for (const l of body.data) {
      expect(l.nodo_key).toBe('caucete');
      expect(l.type).toBe('locality');
      expect(l.zone).toBe('valle_de_tulum');
      expect(l.external_source).toBe('georef');
      expect(typeof l.lat).toBe('number'); // centroide oficial publicado (ADR-036)
      expect(typeof l.lng).toBe('number');
      expect(l.boundary_status).toBe('provisional');
      expect(l.assignment_status).toBe('dh_directive');
    }
    // spot-check de extremos del departamento: Bermejo (este) y Marayes (sur)
    const bermejo = body.data.find((s: any) => s.key === 'sj_caucete_bermejo');
    expect(bermejo.external_id).toBe('70035010');
    const marayes = body.data.find((s: any) => s.key === 'sj_caucete_marayes');
    expect(marayes.external_id).toBe('70035050');
  });

  it('jerarquía Georef: Las Talas y Los Médanos son entidades de la localidad censal compuesta', async () => {
    const res = await fetch(base + '/api/nodos/caucete/subnodos?parent=sj_caucete_las_talas_los_medanos');
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.count).toBe(2);
    for (const h of body.data) {
      expect(h.parent_key).toBe('sj_caucete_las_talas_los_medanos');
      expect(h.type).toBe('locality');
    }
    const talas = body.data.find((s: any) => s.key === 'sj_caucete_las_talas');
    expect(talas.external_id).toBe('7003504001');
    const medanos = body.data.find((s: any) => s.key === 'sj_caucete_los_medanos');
    expect(medanos.external_id).toBe('7003504002');
  });

  it('filtros honestos: 8 hijos directos (parent=none), parajes → 0, nodo inexistente → 404, type=pueblo → 400', async () => {
    const directos = await fetch(base + '/api/nodos/caucete/subnodos?parent=none');
    expect(directos.status).toBe(200);
    const bodyDirectos: any = await directos.json();
    expect(bodyDirectos.count).toBe(8); // ciudad + 7 localidades; talas/medanos cuelgan de la LC compuesta
    for (const s of bodyDirectos.data) {
      expect(s.parent_key).toBeNull(); // hijos directos del nodo
    }

    const parajes = await fetch(base + '/api/nodos/caucete/subnodos?type=paraje');
    expect(parajes.status).toBe(200);
    const bodyParajes: any = await parajes.json();
    expect(bodyParajes.count).toBe(0); // estructura v0.1 sin parajes: 0 honesto

    const missing = await fetch(base + '/api/nodos/no-existe/subnodos');
    expect(missing.status).toBe(404);

    const badType = await fetch(base + '/api/nodos/caucete/subnodos?type=pueblo');
    expect(badType.status).toBe(400);
  });

  it('las estructuras de Iglesia (52) y Capital (2) quedan intactas (VIG-001, NCAP-R2)', async () => {
    const iglesia = await fetch(base + '/api/nodos/iglesia/subnodos');
    const bodyIglesia: any = await iglesia.json();
    expect(bodyIglesia.count).toBe(52); // semilla VIG-001 intocada
    const capital = await fetch(base + '/api/nodos/capital/subnodos');
    const bodyCapital: any = await capital.json();
    expect(bodyCapital.count).toBe(2); // NCAP-R2 intocada
  });

  it('db:seed re-ejecutado no duplica subnodos ni sellos (idempotencia total)', async () => {
    const antes = await Promise.all([
      prisma.subnodos.count(),
      prisma.events_raw.count({ where: { type: 'subnodo.creado' } }),
    ]);
    execSync('pnpm --filter @delocalsoy/db db:seed', { cwd: repoRoot, stdio: 'pipe' });
    const despues = await Promise.all([
      prisma.subnodos.count(),
      prisma.events_raw.count({ where: { type: 'subnodo.creado' } }),
    ]);
    expect(despues).toEqual(antes);
  }, 60000);

  it('sellos subnodo.creado de Caucete: 10, hash idempotente, sin PII, source seed-nc-r6', async () => {
    const sellos: any[] = await prisma.events_raw.findMany({
      where: { type: 'subnodo.creado', hash: { startsWith: 'seed-subnodo-sj_caucete_' } },
    });
    expect(sellos.length).toBe(10);
    const ciudad: any = sellos.find((e: any) => e.hash === 'seed-subnodo-sj_caucete_ciudad');
    expect(ciudad, 'falta el sello de la ciudad Caucete').toBeDefined();
    expect(ciudad.payload.nodo_key).toBe('caucete');
    expect(ciudad.payload.key).toBe('sj_caucete_ciudad');
    expect(ciudad.payload.type).toBe('district');
    expect(ciudad.payload.parent_key).toBeNull();
    expect(ciudad.payload.source).toBe('seed-nc-r6');
    // el sello no lleva PII: solo claves territoriales y procedencia
    const payloadKeys = Object.keys(ciudad.payload).sort();
    expect(payloadKeys).toEqual(['key', 'nodo_key', 'parent_key', 'source', 'type']);
    // las entidades hijas llevan el parent_key de la LC compuesta
    const talas: any = sellos.find((e: any) => e.hash === 'seed-subnodo-sj_caucete_las_talas');
    expect(talas, 'falta el sello de Las Talas').toBeDefined();
    expect(talas.payload.parent_key).toBe('sj_caucete_las_talas_los_medanos');
    expect(talas.payload.source).toBe('seed-nc-r6');
  });
});
