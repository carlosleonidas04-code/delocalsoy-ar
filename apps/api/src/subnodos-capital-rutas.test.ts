import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// NODO-CAPITAL NCAP-R2 (activación territorial, #154, épica #152): subnodos
// del nodo Capital — estructura v0.1 ratificada por la DH («RATIFICADO» en
// #154, 2026-10-13): los 2 distritos documentados en el PEC 2025 (Centro y
// Desamparados) como hijos directos del nodo. Regla de modelado central
// (#154): distrito oficial ≠ área funcional ≠ relación por corredor — las
// áreas analíticas (microcentro/macrocentro/centro cívico) y las
// centralidades (Plaza de Desamparados, Facultad de Ingeniería UNSJ,
// Parque de Mayo) NO se siembran como subnodos. Todo nace provisional
// hasta contraste UNIDE/Catastro (ADR-035); los puntos BAHRA/Georef están
// A VERIFICAR → lat/lng null honesto (R15). El test ejecuta el seed REAL
// (db:seed, que corre seed.sql + seed-subnodos.sql + seed-subnodos-capital.sql
// + los seeds VIG), no una copia de la lógica. Requiere Postgres/PostGIS
// real (job test de CI); sin base → skip honesto (patrón subnodos-rutas).

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

describe.skipIf(!dbUp)('Subnodos del Nodo Capital — NCAP-R2 activación territorial (#154, épica #152)', () => {
  it('GET /api/nodos/capital/subnodos — estructura v0.1 ratificada: 2 distritos provisionales', async () => {
    const res = await fetch(base + '/api/nodos/capital/subnodos');
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.success).toBe(true);
    expect(body.count).toBe(2);
    const keys: string[] = body.data.map((s: any) => s.key);
    expect(keys).toContain('sj_capital_centro');
    expect(keys).toContain('sj_capital_desamparados');
  });

  it('los 2 distritos son hijos directos del nodo, provisionales y sin punto inventado', async () => {
    const res = await fetch(base + '/api/nodos/capital/subnodos?type=district');
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.count).toBe(2);
    for (const d of body.data) {
      expect(d.nodo_key).toBe('capital');
      expect(d.type).toBe('district');
      expect(d.parent_key).toBeNull();
      expect(d.boundary_status).toBe('provisional'); // hasta contraste UNIDE/Catastro (ADR-035)
      expect(d.assignment_status).toBe('dh_directive'); // estructura v0.1 ratificada por la DH
      expect(d.zone).toBe('gran_san_juan');
      expect(d.lat).toBeNull(); // punto BAHRA/Georef a verificar — sin punto verificado no se publica (R15)
      expect(d.lng).toBeNull();
      expect(d.external_id).toBeNull();
      expect(d.external_source).toBeNull();
    }
    const centro = body.data.find((s: any) => s.key === 'sj_capital_centro');
    expect(centro.label).toBe('Centro');
    const desamparados = body.data.find((s: any) => s.key === 'sj_capital_desamparados');
    expect(desamparados.label).toBe('Desamparados');
  });

  it('regla de modelado #154: áreas funcionales y centralidades NO son subnodos', async () => {
    const res = await fetch(base + '/api/nodos/capital/subnodos');
    const body: any = await res.json();
    expect(body.count).toBe(2); // solo los 2 distritos del PEC 2025
    const keys: string[] = body.data.map((s: any) => s.key);
    // microcentro/macrocentro/centro_cívico son áreas ANALÍTICAS del distrito
    // Centro (PEC 2025); las centralidades participan por relaciones
    // near/connects (NCAP-R4) SIN asignación distrital.
    for (const noSubnodo of [
      'microcentro',
      'macrocentro',
      'centro_civico',
      'sj_capital_plaza_desamparados',
      'sj_capital_facultad_ingenieria_unsj',
      'sj_capital_parque_de_mayo',
    ]) {
      expect(keys, 'un área funcional/centralidad NO debe sembrarse como subnodo: ' + noSubnodo).not.toContain(noSubnodo);
    }
  });

  it('filtros honestos: parajes → 0, hijos directos (parent=none) → 2, nodo inexistente → 404', async () => {
    const parajes = await fetch(base + '/api/nodos/capital/subnodos?type=paraje');
    expect(parajes.status).toBe(200);
    const bodyParajes: any = await parajes.json();
    expect(bodyParajes.count).toBe(0); // el nodo urbano no tiene parajes: 0 honesto

    const directos = await fetch(base + '/api/nodos/capital/subnodos?parent=none');
    const bodyDirectos: any = await directos.json();
    expect(bodyDirectos.count).toBe(2);

    const missing = await fetch(base + '/api/nodos/no-existe/subnodos');
    expect(missing.status).toBe(404);
  });

  it('la estructura del Valle de Iglesia queda intacta: 52 entidades (VIG-001)', async () => {
    const res = await fetch(base + '/api/nodos/iglesia/subnodos');
    const body: any = await res.json();
    expect(body.count).toBe(52); // semilla VIG-001 intocada
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

  it('sellos subnodo.creado de Capital: 2, hash idempotente, sin PII', async () => {
    const sellos: any[] = await prisma.events_raw.findMany({
      where: { type: 'subnodo.creado', hash: { startsWith: 'seed-subnodo-sj_capital_' } },
    });
    expect(sellos.length).toBe(2); // 52 iglesia (VIG-001) + 2 capital (NCAP-R2) = 54 en total
    const centro: any = sellos.find((e: any) => e.hash === 'seed-subnodo-sj_capital_centro');
    expect(centro, 'falta el sello del distrito Centro').toBeDefined();
    expect(centro.payload.nodo_key).toBe('capital');
    expect(centro.payload.key).toBe('sj_capital_centro');
    expect(centro.payload.type).toBe('district');
    expect(centro.payload.source).toBe('seed-ncap-r2');
    // el sello no lleva PII: solo claves territoriales y procedencia
    const payloadKeys = Object.keys(centro.payload).sort();
    expect(payloadKeys).toEqual(['key', 'nodo_key', 'parent_key', 'source', 'type']);
    const desamparados: any = sellos.find((e: any) => e.hash === 'seed-subnodo-sj_capital_desamparados');
    expect(desamparados, 'falta el sello del distrito Desamparados').toBeDefined();
    expect(desamparados.payload.parent_key).toBeNull();
  });
});
