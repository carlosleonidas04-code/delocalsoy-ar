import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// NODO-VIG VIG-001 (NVIG-R4 #171, épica #167): subnodos territoriales del
// Valle de Iglesia — jerarquía distrito → paraje → subparaje + localidad
// INDEC. Requiere Postgres/PostGIS real (job test de CI); sin base → skip
// honesto (patrón nodos-rutas). El test ejecuta el seed REAL (db:seed, que
// corre seed.sql + seed-subnodos.sql), no una copia de la lógica.

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

describe.skipIf(!dbUp)('Subnodos territoriales VIG-001 (#171, épica #167)', () => {
  it('GET /api/nodos/iglesia/subnodos — primer lote ratificado: 34 entidades', async () => {
    const res = await fetch(base + '/api/nodos/iglesia/subnodos');
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.success).toBe(true);
    expect(body.count).toBe(34);
    // el segundo lote (travesía + alta cordillera no-paso) está diferido por la DH
    const keys: string[] = body.data.map((s: any) => s.key);
    for (const diferido of ['sj_iglesia_p_el_arenal', 'sj_iglesia_p_mina_veladero', 'sj_iglesia_p_campamento_pircas']) {
      expect(keys, 'entidad diferida cargada por error: ' + diferido).not.toContain(diferido);
    }
  });

  it('los 6 distritos ratificados son hijos directos del nodo, sin punto inventado', async () => {
    const res = await fetch(base + '/api/nodos/iglesia/subnodos?type=district');
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.count).toBe(6);
    const keys: string[] = body.data.map((s: any) => s.key);
    for (const k of [
      'sj_iglesia_angualasto',
      'sj_iglesia_bella_vista',
      'sj_iglesia_las_flores',
      'sj_iglesia_rodeo',
      'sj_iglesia_tudcum',
      'sj_iglesia_villa_iglesia',
    ]) {
      expect(keys, 'falta el distrito ' + k).toContain(k);
    }
    for (const d of body.data) {
      expect(d.parent_key).toBeNull();
      expect(d.zone).toBe('valle');
      expect(d.assignment_status).toBe('dh_directive');
      expect(d.lat).toBeNull(); // sin punto publicado, sin inventar (R15)
      expect(d.lng).toBeNull();
    }
  });

  it('Pismanta: localidad INDEC del distrito las-flores (external_id Georef 70049050)', async () => {
    const res = await fetch(base + '/api/nodos/iglesia/subnodos?type=locality');
    const body: any = await res.json();
    expect(body.count).toBe(1);
    const p = body.data[0];
    expect(p.key).toBe('sj_iglesia_p_pismanta');
    expect(p.parent_key).toBe('sj_iglesia_las_flores');
    expect(p.external_id).toBe('70049050');
    expect(p.external_source).toBe('georef');
    // centroide Georef dentro del departamento Iglesia
    expect(p.lat).toBeLessThan(-30);
    expect(p.lat).toBeGreaterThan(-31);
    expect(p.lng).toBeLessThan(-69.1);
    expect(p.lng).toBeGreaterThan(-69.3);
  });

  it('jerarquía documentada: Malimán de Arriba es subparaje de Malimán (BAHRA A33)', async () => {
    const res = await fetch(base + '/api/nodos/iglesia/subnodos?type=subparaje');
    const body: any = await res.json();
    expect(body.count).toBe(1);
    expect(body.data[0].key).toBe('sj_iglesia_p_maliman_de_arriba');
    expect(body.data[0].parent_key).toBe('sj_iglesia_p_maliman');
    expect(body.data[0].external_id).toBe('70049A33');
  });

  it('ratificación DH — rodeo: Dique Cuesta del Viento, Paso del Agua Negra (RN 150) y Colola', async () => {
    const res = await fetch(base + '/api/nodos/iglesia/subnodos?parent=sj_iglesia_rodeo');
    const body: any = await res.json();
    expect(body.count).toBe(3);
    const keys: string[] = body.data.map((s: any) => s.key);
    for (const k of [
      'sj_iglesia_p_dique_cuesta_del_viento',
      'sj_iglesia_p_paso_del_agua_negra',
      'sj_iglesia_p_colola',
    ]) {
      expect(keys).toContain(k);
    }
    const paso = body.data.find((s: any) => s.key === 'sj_iglesia_p_paso_del_agua_negra');
    expect(paso.zone).toBe('travesia');
    expect(paso.assignment_status).toBe('dh_directive'); // función RN 150, no cercanía
    expect(paso.external_id).toBe('70049A37');
    const colola = body.data.find((s: any) => s.key === 'sj_iglesia_p_colola');
    expect(colola.lat).toBeNull(); // local histórico sin punto publicado (R15)
  });

  it('alta cordillera "solo los pasos": Pascua Lama cuelga del nodo (zone alta_cordillera)', async () => {
    const res = await fetch(base + '/api/nodos/iglesia/subnodos?parent=none');
    const body: any = await res.json();
    // 6 distritos + Paso Pascua Lama (hijo directo del nodo)
    expect(body.count).toBe(7);
    const pascua = body.data.find((s: any) => s.key === 'sj_iglesia_p_paso_pascua_lama');
    expect(pascua, 'falta Paso Pascua Lama').toBeDefined();
    expect(pascua.parent_key).toBeNull();
    expect(pascua.zone).toBe('alta_cordillera');
    expect(pascua.external_id).toBe('70049A38');
    // los otros 15 de alta cordillera están diferidos (decisión DH)
    expect(pascua.assignment_status).toBe('dh_directive');
  });

  it('parajes de valle con asignación provisional por cercanía (22, punto BAHRA público)', async () => {
    const res = await fetch(base + '/api/nodos/iglesia/subnodos');
    const body: any = await res.json();
    const provisional = body.data.filter((s: any) => s.assignment_status === 'nearest_district_provisional');
    expect(provisional.length).toBe(22);
    for (const s of provisional) {
      expect(s.boundary_status).toBe('provisional');
      expect(s.external_source).toBe('bahra');
      expect(s.lat).toBeLessThan(-29.5);
      expect(s.lat).toBeGreaterThan(-31);
      expect(typeof s.lng).toBe('number');
    }
    // Zonda (A41): ortografía canónica ratificada — no "Sonda"
    const zonda = body.data.find((s: any) => s.key === 'sj_iglesia_p_zonda');
    expect(zonda.label).toBe('Zonda');
    expect(zonda.external_id).toBe('70049A41');
    // Colo Colo (A18) ≠ Colola: paraje BAHRA distinto del local de rodeo
    const coloColo = body.data.find((s: any) => s.key === 'sj_iglesia_p_colo_colo');
    expect(coloColo.label).toBe('Colo Colo');
    expect(coloColo.parent_key).toBe('sj_iglesia_villa_iglesia');
  });

  it('404 honesto para nodo inexistente; 400 para filtros inválidos', async () => {
    const missing = await fetch(base + '/api/nodos/no-existe/subnodos');
    expect(missing.status).toBe(404);
    const bodyMissing: any = await missing.json();
    expect(bodyMissing.success).toBe(false);

    const badType = await fetch(base + '/api/nodos/iglesia/subnodos?type=pueblo');
    expect(badType.status).toBe(400);

    const badParent = await fetch(base + '/api/nodos/iglesia/subnodos?parent=');
    expect(badParent.status).toBe(400);
  });

  it('otros nodos sin subnodos sembrados: lectura honesta (200 + count 0), no error', async () => {
    for (const key of ['capital', 'caucete']) {
      const res = await fetch(base + '/api/nodos/' + key + '/subnodos');
      expect(res.status).toBe(200);
      const body: any = await res.json();
      expect(body.success).toBe(true);
      expect(body.count).toBe(0);
    }
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
  });

  it('sello subnodo.creado en events_raw: uno por entidad, hash idempotente, sin PII', async () => {
    const sellos: any[] = await prisma.events_raw.findMany({ where: { type: 'subnodo.creado' } });
    expect(sellos.length).toBe(34);
    const rodeo: any = sellos.find((e: any) => e.hash === 'seed-subnodo-sj_iglesia_rodeo');
    expect(rodeo, 'falta el sello del distrito rodeo').toBeDefined();
    expect(rodeo.payload.nodo_key).toBe('iglesia');
    expect(rodeo.payload.key).toBe('sj_iglesia_rodeo');
    expect(rodeo.payload.type).toBe('district');
    expect(rodeo.payload.source).toBe('seed-vig-001');
    // el sello no lleva PII: solo claves territoriales y procedencia
    const payloadKeys = Object.keys(rodeo.payload).sort();
    expect(payloadKeys).toEqual(['key', 'nodo_key', 'parent_key', 'source', 'type']);
  });
});
