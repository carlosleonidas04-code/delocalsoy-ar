import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// NODO-CAPITAL NCAP-R3 (#155, épica #152): catálogo de fuentes espaciales
// y procedencia del nodo Capital. 9 fuentes agregadas al catálogo global
// ADR-035 (patrón NODO-CAU R2 #138/#147 y NVIG-R5 #172: la tabla fuentes,
// las rutas /api/fuentes y el pipeline de ingestas se reutilizan SIN
// cambios de rutas ni de openapi). Estados honestos verificados 2026-11-05
// (código INDEC Capital = 70028 confirmado contra fuentes públicas):
// ninguna fuente se marca disponible sin verificación; catastro y
// habilitación municipal quedan requiere_solicitud; redtulum_anillo
// no_disponible (sin GTFS). Sin escritura en este suite: solo lectura
// pública del catálogo + sellos del seed (events_raw).
// Requiere Postgres/PostGIS real (job test de CI); sin base el suite se
// salta (honesto, R5).
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';
process.env.JWT_SECRET = 'test-jwt-secret-ncap-r3-fuentes-capital-32chars';

const { createApp } = await import('./app.js');
const prisma = (await import('./lib/prisma.js')).default;

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

describe.skipIf(!dbUp)('fuentes del nodo Capital (NCAP-R3 — catálogo y procedencia, #155)', () => {
  const TIPOS = ['wms', 'wfs', 'descarga', 'documento', 'api', 'registro_web'];
  const ESTADOS = ['disponible', 'requiere_credenciales', 'requiere_solicitud', 'no_disponible', 'deprecado'];

  const KEYS_CAPITAL = [
    'pec_capital_2025', 'pec_capital_2026', 'catastro_capital', 'unsj_fi',
    'redtulum_anillo', 'indec_cp2022', 'habilitacion_municipal_sj',
    'repavimentacion_microcentro_2026', 'datos_abiertos_sj',
  ];

  // Estados honestos verificados 2026-11-05 (issue #155 + investigación
  // NUT-CAP): catastro y habilitación municipal exigen solicitud formal;
  // el Anillo Céntrico de RedTulum no tiene GTFS (app muerta post-Moovit).
  const ESTADOS_CAPITAL: Record<string, string> = {
    pec_capital_2025: 'disponible',
    pec_capital_2026: 'disponible',
    catastro_capital: 'requiere_solicitud',
    unsj_fi: 'disponible',
    redtulum_anillo: 'no_disponible',
    indec_cp2022: 'disponible',
    habilitacion_municipal_sj: 'requiere_solicitud',
    repavimentacion_microcentro_2026: 'disponible',
    datos_abiertos_sj: 'disponible',
  };

  it('catálogo global: 49 fuentes (15 Caucete + 20 del valle + 1 SIIC web MARKET-CAP MK-2 #243 + 9 Capital NCAP-R3 #155 + 4 Iglesia VIG-010 #381) sin claves duplicadas', async () => {
    const res = await fetch(base + '/api/fuentes');
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.success).toBe(true);
    expect(body.count).toBe(49);
    const keys = body.data.map((f: any) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const k of KEYS_CAPITAL) expect(keys).toContain(k);
  });

  it('catálogo Capital: 9 fuentes con organismo, estado honesto verificado y cautela', async () => {
    const res = await fetch(base + '/api/fuentes');
    const body: any = await res.json();
    for (const k of KEYS_CAPITAL) {
      const f = body.data.find((x: any) => x.key === k);
      expect(f, 'falta la fuente ' + k).toBeDefined();
      expect(f.organismo.length).toBeGreaterThan(3);
      expect(f.cautela.length).toBeGreaterThan(10);
      expect(TIPOS).toContain(f.tipo);
      expect(ESTADOS).toContain(f.estado);
      expect(f.estado, 'estado honesto de ' + k).toBe(ESTADOS_CAPITAL[k]);
    }
  });

  it('cautelas centrales del Capital: PEC perímetro, redtulum sin GTFS, INDEC 70028, repavimentación R15', async () => {
    const res = await fetch(base + '/api/fuentes');
    const body: any = await res.json();
    const por = (key: string) => body.data.find((f: any) => f.key === key);
    expect(por('pec_capital_2025').cautela).toContain('perímetro v0.1');
    expect(por('pec_capital_2026').cautela).toContain('NO son distritos administrativos');
    expect(por('redtulum_anillo').cautela).toContain('GTFS');
    expect(por('redtulum_anillo').cautela).toContain('nunca línea dibujada');
    expect(por('indec_cp2022').cautela).toContain('70028');
    expect(por('indec_cp2022').cautela).toContain('nunca por nombre');
    expect(por('repavimentacion_microcentro_2026').cautela).toContain('Anuncio ≠ obra ejecutada');
    expect(por('catastro_capital').cautela).toContain('PROVISIONAL');
    expect(por('unsj_fi').cautela).toContain('lat/lng NULL');
  });

  it('ficha pública: /api/fuentes/pec_capital_2025 200 y clave inexistente 404', async () => {
    const ok = await fetch(base + '/api/fuentes/pec_capital_2025');
    expect(ok.status).toBe(200);
    const bodyOk: any = await ok.json();
    expect(bodyOk.data.organismo).toContain('CoPESJ');

    const falta = await fetch(base + '/api/fuentes/fuente-capital-inventada');
    expect(falta.status).toBe(404);
    await falta.arrayBuffer();
  });

  it('sellos seed-ncap-r3: 9 fuente.registrada con payload {key, organismo, source} sin PII', async () => {
    const sellos = await prisma.events_raw.findMany({
      where: { type: 'fuente.registrada', payload: { path: ['source'], equals: 'seed-ncap-r3' } },
    });
    expect(sellos.length).toBe(9);

    const keys = sellos.map((s: any) => (s.payload as any).key).sort();
    expect(keys).toEqual(KEYS_CAPITAL.slice().sort());

    const muestra = sellos.find((s: any) => (s.payload as any).key === 'pec_capital_2025');
    expect(muestra).toBeDefined();
    expect((muestra?.payload as any).organismo).toContain('CoPESJ');
    expect(Object.keys((muestra?.payload as any) ?? {}).sort()).toEqual(['key', 'organismo', 'source']);
    const texto = JSON.stringify(sellos.map((s: any) => s.payload));
    expect(texto).not.toContain('@');
  });
});
