import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// NODO-VIG-3 VIG-010 (#381, épica #377): vocabulario vial y territorial
// del nodo Iglesia — 9 capas nuevas (5 v5.1 reutilizadas del R1 Capital
// sin vocabulario paralelo + obra_vial, punto_critico, parada_transporte,
// cobertura_sos), 40 categorías N2 de los 9 dominios del AMC v0.3 (el nodo
// queda con 52 categorías: 10 demo + 2 VIG-009 patrimonio + 40 nuevas),
// obras RN 150/derivadores con estado honesto del ciclo de obra
// (R15: anuncio ≠ obra — declared/in_execution, coordenadas ilustrativas
// is_synthetic=true), red SOS Paso Agua Negra (verified) y 4 fuentes al
// catálogo global ADR-035 (45 → 49). La capa parada_transporte NACE VACÍA:
// sin padrón verificado no se siembran paradas (R15). Requiere
// Postgres/PostGIS real (job test de CI); sin base → skip honesto (patrón
// nodos-rutas). El test ejecuta el comando REAL (db:seed), no una copia.
// Idempotencia: los conteos se ACOTAN al vocabulario/ sellos de este seed
// (un count global de events_raw es racy: vitest corre las suites en
// paralelo y otras suites sellan en events_raw).
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';
process.env.JWT_SECRET = 'test-jwt-secret-vig010-vocabulario-vial-iglesia-32ch';

const { createApp } = await import('./app.js');
const { prisma } = await import('@delocalsoy/db');

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

const dbUp = await prisma
  .$queryRaw`SELECT 1`
  .then(() => true)
  .catch(() => false);

let server: any;
let base = '';

// Envolvente ilustrativa del corredor RN 150 / Paso Agua Negra (los puntos
// de VIG-010 son ilustrativos redondeados: is_synthetic=true, jamás
// coordenada oficial).
const LAT_MIN = -30.5, LAT_MAX = -30.0, LNG_MIN = -69.9, LNG_MAX = -69.0;

// Hashes de los 13 sellos de este seed (9 capas + 4 fuentes).
const SELLOS_VIG010 = [
  'seed-capa-iglesia-public_space',
  'seed-capa-iglesia-public_lighting',
  'seed-capa-iglesia-trees',
  'seed-capa-iglesia-sidewalks',
  'seed-capa-iglesia-irrigation_channels',
  'seed-capa-iglesia-obra_vial',
  'seed-capa-iglesia-punto_critico',
  'seed-capa-iglesia-parada_transporte',
  'seed-capa-iglesia-cobertura_sos',
  'seed-fuente-prensa_obras_iglesia_2026_11',
  'seed-fuente-portal_paso_agua_negra',
  'seed-fuente-agregador_transporte_600_601',
  'seed-fuente-documento_vecinal_iglesia_2026_11',
];

const CAPAS_VIG010 = [
  'public_space', 'public_lighting', 'trees', 'sidewalks', 'irrigation_channels',
  'obra_vial', 'punto_critico', 'parada_transporte', 'cobertura_sos',
];

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

describe.skipIf(!dbUp)('Vocabulario vial del nodo Iglesia (NODO-VIG-3 VIG-010, #381)', () => {
  it('GET /api/nodos/iglesia/capas — 12 capas: 3 demo + 5 v5.1 reutilizadas + 4 nuevas', async () => {
    const { status, body } = await getJson('/api/nodos/iglesia/capas');
    expect(status).toBe(200);
    expect(body.count).toBe(12);
    const keys: string[] = body.data.map((c: any) => c.key);
    for (const k of [...CAPAS_VIG010, 'productive_units', 'rural_services', 'tourism_resources']) {
      expect(keys, 'falta la capa ' + k).toContain(k);
    }
    const por = (k: string) => body.data.find((c: any) => c.key === k);
    // 5 v5.1 reutilizadas 1:1 del R1 Capital (sin vocabulario paralelo).
    expect(por('public_space').dominio).toBe('public_space');
    expect(por('public_space').geometria).toBe('Point');
    expect(por('public_lighting').dominio).toBe('problems');
    expect(por('trees').dominio).toBe('assets');
    expect(por('sidewalks').geometria).toBe('LineString');
    expect(por('irrigation_channels').dominio).toBe('assets');
    // 4 capas nuevas ratificadas por la DH (épica #377).
    expect(por('obra_vial').dominio).toBe('assets');
    expect(por('obra_vial').geometria).toBe('LineString');
    expect(por('obra_vial').default_on).toBe(false);
    expect(por('punto_critico').dominio).toBe('problems');
    expect(por('punto_critico').geometria).toBe('Point');
    expect(por('punto_critico').default_on).toBe(true);
    expect(por('parada_transporte').dominio).toBe('community');
    expect(por('parada_transporte').default_on).toBe(false);
    expect(por('cobertura_sos').dominio).toBe('health');
    expect(por('cobertura_sos').default_on).toBe(false);
  });

  it('categorías: 52 (10 demo + 2 VIG-009 patrimonio + 40 VIG-010 de los 9 dominios del AMC), todas con capa válida', async () => {
    const { body } = await getJson('/api/nodos/iglesia/categorias');
    expect(body.count).toBe(52);
    const cats: any[] = body.data;
    const cat = (code: string) => cats.find((c: any) => c.code === code);
    // Espacio público.
    expect(cat('street_lighting')?.layer).toBe('public_lighting');
    expect(cat('sidewalk_condition')?.layer).toBe('sidewalks');
    expect(cat('plaza_furniture')?.layer).toBe('public_space');
    expect(cat('waste_dumping')?.layer).toBe('public_space');
    expect(cat('tree_damage')?.layer).toBe('trees');
    expect(cat('stray_animals')?.layer).toBe('public_space');
    expect(cat('noise_dust_nuisance')?.layer).toBe('public_space');
    // Infraestructura vial.
    expect(cat('road_surface')?.layer).toBe('punto_critico');
    expect(cat('urban_surface')?.layer).toBe('punto_critico');
    expect(cat('road_shoulder')?.layer).toBe('punto_critico');
    expect(cat('road_signage')?.layer).toBe('punto_critico');
    expect(cat('road_barrier')?.layer).toBe('punto_critico');
    expect(cat('bridge_culvert')?.layer).toBe('punto_critico');
    expect(cat('work_zone_risk')?.layer).toBe('obra_vial');
    // Movilidad.
    expect(cat('bus_stop_issue')?.layer).toBe('parada_transporte');
    expect(cat('service_frequency')?.layer).toBe('parada_transporte');
    expect(cat('school_health_transport')?.layer).toBe('parada_transporte');
    expect(cat('pedestrian_crossing')?.layer).toBe('sidewalks');
    expect(cat('active_mobility_risk')?.layer).toBe('punto_critico');
    // Agua y saneamiento.
    expect(cat('drinking_water_issue')?.layer).toBe('punto_critico');
    expect(cat('sewer_drainage')?.layer).toBe('punto_critico');
    expect(cat('irrigation_conflict')?.layer).toBe('irrigation_channels');
    // Clima y ambiente.
    expect(cat('drought_scarcity')?.layer).toBe('punto_critico');
    expect(cat('snow_ice')?.layer).toBe('punto_critico');
    expect(cat('zonda_dust')?.layer).toBe('punto_critico');
    expect(cat('frost_hail')?.layer).toBe('punto_critico');
    expect(cat('flash_flood_risk')?.layer).toBe('punto_critico');
    expect(cat('fog_visibility')?.layer).toBe('punto_critico');
    expect(cat('urban_rural_pests')?.layer).toBe('punto_critico');
    // Conectividad.
    expect(cat('cell_dead_zone')?.layer).toBe('cobertura_sos');
    expect(cat('internet_gap')?.layer).toBe('cobertura_sos');
    expect(cat('sos_coverage_gap')?.layer).toBe('cobertura_sos');
    // Servicios.
    expect(cat('power_grid_issue')?.layer).toBe('punto_critico');
    expect(cat('health_access_issue')?.layer).toBe('punto_critico');
    expect(cat('school_facility_issue')?.layer).toBe('punto_critico');
    expect(cat('security_post_issue')?.layer).toBe('punto_critico');
    expect(cat('public_building_issue')?.layer).toBe('punto_critico');
    // Producción rural.
    expect(cat('productive_access')?.layer).toBe('rural_services');
    expect(cat('agro_practice_issue')?.layer).toBe('productive_units');
    expect(cat('wildlife_corridor')?.layer).toBe('rural_services');
    // 2 categorías REUTILIZADAS del vocabulario demo (sin duplicados).
    expect(cat('damaged_road')?.layer).toBe('rural_services');
    expect(cat('damaged_heritage')?.layer).toBe('tourism_resources');
    // 2 categorías de VIG-009 ya en main (patrimonio del nodo sobre
    // tourism_resources): 10 demo + 2 VIG-009 + 40 VIG-010 = 52.
    expect(cat('patrimonio_deterioro')?.layer).toBe('tourism_resources');
    expect(cat('patrimonio_perdida')?.layer).toBe('tourism_resources');
    // Toda categoría apunta a una capa existente del nodo.
    const capas = await getJson('/api/nodos/iglesia/capas');
    const capaKeys: string[] = capas.body.data.map((c: any) => c.key);
    for (const c of cats) {
      expect(capaKeys, 'categoría ' + c.code + ' apunta a capa inexistente ' + c.layer).toContain(c.layer);
    }
  });

  it('obras RN 150 y derivadores (4): estados honestos declared/in_execution, ilustrativas (R15)', async () => {
    const { body } = await getJson('/api/nodos/iglesia/features');
    const obras = body.data.filter((f: any) => f.layer === 'obra_vial');
    expect(obras.length).toBe(4);
    for (const f of obras) {
      expect(f.tipo).toBe('asset');
      expect(['declared', 'in_execution']).toContain(f.estado);
      expect(f.is_synthetic).toBe(true); // jamás coordenada oficial
      expect(f.fuente_label.startsWith('Ilustrativa ·')).toBe(true);
      expect(f.lat).toBeGreaterThan(LAT_MIN);
      expect(f.lat).toBeLessThan(LAT_MAX);
      expect(f.lng).toBeGreaterThan(LNG_MIN);
      expect(f.lng).toBeLessThan(LNG_MAX);
    }
    // R15: anuncio ≠ obra — los tramos anunciados de RN 150 quedan declared.
    const tramos = obras.filter((f: any) => f.id.startsWith('seed-f-vig010-rn150'));
    expect(tramos.length).toBe(2);
    for (const f of tramos) expect(f.estado).toBe('declared');
    // Derivadores: 1 agregado declarado en ejecución + 1 agregado anunciado.
    const derivadores = obras.filter((f: any) => f.id.startsWith('seed-f-vig010-derivador'));
    expect(derivadores.length).toBe(2);
    expect(derivadores.find((f: any) => f.estado === 'in_execution')).toBeDefined();
    expect(derivadores.filter((f: any) => f.estado === 'declared').length).toBe(1);
  });

  it('cobertura_sos (1): red SOS Paso Agua Negra verified; parada_transporte nace VACÍA (R15)', async () => {
    const { body } = await getJson('/api/nodos/iglesia/features');
    const sos = body.data.filter((f: any) => f.layer === 'cobertura_sos');
    expect(sos.length).toBe(1);
    expect(sos[0].estado).toBe('verified');
    expect(sos[0].tipo).toBe('asset');
    expect(sos[0].is_synthetic).toBe(true);
    expect(sos[0].fuente_label.startsWith('Ilustrativa ·')).toBe(true);
    // Ancla ilustrativa redondeada al Paso Agua Negra (BAHRA Paso A37).
    expect(sos[0].lat).toBeGreaterThan(-30.25);
    expect(sos[0].lat).toBeLessThan(-30.15);
    expect(sos[0].lng).toBeGreaterThan(-69.87);
    expect(sos[0].lng).toBeLessThan(-69.77);
    // Sin padrón verificado de paradas, la capa nace vacía (R15).
    const paradas = body.data.filter((f: any) => f.layer === 'parada_transporte');
    expect(paradas.length).toBe(0);
  });

  it('4 fuentes VIG-010 en el catálogo global (45 → 49): estado honesto, cautela y ficha pública', async () => {
    const KEYS = [
      'prensa_obras_iglesia_2026_11', 'portal_paso_agua_negra',
      'agregador_transporte_600_601', 'documento_vecinal_iglesia_2026_11',
    ];
    for (const k of KEYS) {
      const { status, body } = await getJson('/api/fuentes/' + k);
      expect(status, 'falta la fuente ' + k).toBe(200);
      expect(body.data.estado).toBe('disponible');
      expect(body.data.organismo.length).toBeGreaterThan(3);
      expect(body.data.cautela.length).toBeGreaterThan(10);
      expect(['wms', 'wfs', 'descarga', 'documento', 'api', 'registro_web']).toContain(body.data.tipo);
    }
    const prensa = await getJson('/api/fuentes/prensa_obras_iglesia_2026_11');
    expect(prensa.body.data.cautela).toContain('Anuncio ≠ obra ejecutada');
    const vecinal = await getJson('/api/fuentes/documento_vecinal_iglesia_2026_11');
    expect(vecinal.body.data.cautela).toContain('Procedencia declarada');
    expect(vecinal.body.data.cautela).toContain('NO se precargan');
  });

  it('sellos seed-vig-010 en events_raw: 9 capas + 4 fuentes, sin PII', async () => {
    const sellos: any[] = await prisma.events_raw.findMany({
      where: { hash: { in: SELLOS_VIG010 } },
      select: { type: true, hash: true, payload: true },
    });
    expect(sellos.length).toBe(13);
    expect(sellos.filter((s: any) => s.type === 'capa.registrada').length).toBe(9);
    expect(sellos.filter((s: any) => s.type === 'fuente.registrada').length).toBe(4);
    for (const s of sellos) {
      expect((s.payload as any).source).toBe('seed-vig-010');
      expect(JSON.stringify(s.payload)).not.toContain('@'); // sin PII (ADR-027)
    }
  });

  it('idempotencia: re-ejecutar db:seed no duplica el vocabulario vial', async () => {
    const nodo = await prisma.nodos.findFirst({ where: { key: 'iglesia' } });
    const antes = await Promise.all([
      prisma.capas.count({ where: { nodo_id: nodo!.id } }),
      prisma.categorias.count({ where: { nodo_id: nodo!.id } }),
      prisma.features.count({ where: { nodo_id: nodo!.id } }),
      // conteo ACOTADO a los sellos de este seed: un count global de
      // events_raw es racy bajo suites paralelas (patrón NCAP-R1).
      prisma.events_raw.count({ where: { hash: { in: SELLOS_VIG010 } } }),
    ]);
    execSync('pnpm --filter @delocalsoy/db db:seed', { cwd: repoRoot, stdio: 'pipe' });
    const despues = await Promise.all([
      prisma.capas.count({ where: { nodo_id: nodo!.id } }),
      prisma.categorias.count({ where: { nodo_id: nodo!.id } }),
      prisma.features.count({ where: { nodo_id: nodo!.id } }),
      prisma.events_raw.count({ where: { hash: { in: SELLOS_VIG010 } } }),
    ]);
    expect(despues).toEqual(antes);
    expect(despues[0]).toBe(12);
    expect(despues[1]).toBe(52); // 10 demo + 2 VIG-009 + 40 VIG-010
    expect(despues[2]).toBe(11); // 6 demo CORE-003 + 5 VIG-010
    expect(despues[3]).toBe(13);
  }, 60000);
});
