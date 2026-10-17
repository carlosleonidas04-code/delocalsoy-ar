import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// NVIG-R5 (#172): catálogo de fuentes y procedencia del Valle de
// Iglesia. 16 fuentes específicas del valle al catálogo global ADR-035
// (patrón NODO-CAU R2 #200: la tabla fuentes, las rutas /api/fuentes y el
// pipeline ingestas se reutilizan SIN cambios de rutas ni de openapi).
// Estados honestos verificados en las tandas 1-3 de investigación
// (trazas #167-#174): ninguna fuente se marca disponible sin
// verificación; las que exigen padrón o instrumento no encontrado
// quedan requiere_solicitud. Sin escritura en este suite: solo lectura
// pública del catálogo + sellos del seed (events_raw).
// Requiere Postgres/PostGIS real (job test de CI); sin base el suite se
// salta (honesto, R5).
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';
process.env.JWT_SECRET = 'test-jwt-secret-nvig-r5-fuentes-valle-iglesia-32ch';

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

describe.skipIf(!dbUp)('fuentes del Valle de Iglesia (NVIG-R5 — catálogo y procedencia, #172)', () => {
  const TIPOS = ['wms', 'wfs', 'descarga', 'documento', 'api'];
  const ESTADOS = ['disponible', 'requiere_credenciales', 'requiere_solicitud', 'no_disponible', 'deprecado'];

  const KEYS_VIG = [
    'municipio_iglesia', 'decreto_2154_2009', 'ley_24790', 'ley_25291',
    'leyes_patrimonio_sj', 'conicet_garcia_2024', 'michieli_2016', 'pedl_iglesia',
    'cna_2018', 'hidrometria_sj', 'ley_826_g', 'viales_rn150',
    'conectividad_agua_negra', 'ley_2400_t', 'inaes', 'turismo_sj',
  ];

  // Estados honestos verificados en las tandas 1-3 (trazas #167-#174):
  // las tres que exigen padrón o instrumento no encontrado quedan en
  // requiere_solicitud; el resto está verificado (documento, DOI o
  // servicio contrastado en vivo).
  const ESTADOS_VIG: Record<string, string> = {
    municipio_iglesia: 'disponible',
    decreto_2154_2009: 'disponible',
    ley_24790: 'disponible',
    ley_25291: 'disponible',
    leyes_patrimonio_sj: 'disponible',
    conicet_garcia_2024: 'disponible',
    michieli_2016: 'disponible',
    pedl_iglesia: 'disponible',
    cna_2018: 'disponible',
    hidrometria_sj: 'disponible',
    ley_826_g: 'disponible',
    viales_rn150: 'disponible',
    conectividad_agua_negra: 'disponible',
    ley_2400_t: 'requiere_solicitud',
    inaes: 'requiere_solicitud',
    turismo_sj: 'requiere_solicitud',
  };

  it('catálogo global: 31 fuentes (15 Caucete + 16 del valle) sin claves duplicadas', async () => {
    const res = await fetch(base + '/api/fuentes');
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.success).toBe(true);
    expect(body.count).toBe(31);
    const keys = body.data.map((f: any) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const k of KEYS_VIG) expect(keys).toContain(k);
  });

  it('catálogo VIG: 16 fuentes con organismo, estado honesto verificado y cautela', async () => {
    const res = await fetch(base + '/api/fuentes');
    const body: any = await res.json();
    for (const k of KEYS_VIG) {
      const f = body.data.find((x: any) => x.key === k);
      expect(f, 'falta la fuente ' + k).toBeDefined();
      expect(f.organismo.length).toBeGreaterThan(3);
      expect(f.cautela.length).toBeGreaterThan(10);
      expect(TIPOS).toContain(f.tipo);
      expect(ESTADOS).toContain(f.estado);
      expect(f.estado, 'estado honesto de ' + k).toBe(ESTADOS_VIG[k]);
    }
  });

  it('cautelas centrales del valle: Qhapaq Ñan, fechados 14C, ordenanza, ADR-036', async () => {
    const res = await fetch(base + '/api/fuentes');
    const body: any = await res.json();
    const por = (key: string) => body.data.find((f: any) => f.key === key);
    expect(por('conicet_garcia_2024').cautela).toContain('not_demonstrated_inca');
    expect(por('michieli_2016').cautela).toContain('Calingasta');
    expect(por('municipio_iglesia').cautela).toContain('1906-C.D.-2020');
    expect(por('decreto_2154_2009').cautela).toContain('ADR-036');
    expect(por('conectividad_agua_negra').cautela).toContain('2024-03');
  });

  it('ficha pública: /api/fuentes/municipio_iglesia 200 y clave inexistente 404', async () => {
    const ok = await fetch(base + '/api/fuentes/municipio_iglesia');
    expect(ok.status).toBe(200);
    const bodyOk: any = await ok.json();
    expect(bodyOk.data.organismo).toContain('Iglesia');

    const falta = await fetch(base + '/api/fuentes/fuente-vig-inventada');
    expect(falta.status).toBe(404);
    await falta.arrayBuffer();
  });

  it('sellos seed-vig-r5: 16 fuente.registrada con payload {key, organismo, source} sin PII', async () => {
    const sellos = await prisma.events_raw.findMany({
      where: { type: 'fuente.registrada', payload: { path: ['source'], equals: 'seed-vig-r5' } },
    });
    expect(sellos.length).toBe(16);

    const keys = sellos.map((s: any) => (s.payload as any).key).sort();
    expect(keys).toEqual(KEYS_VIG.slice().sort());

    const muestra = sellos.find((s: any) => (s.payload as any).key === 'municipio_iglesia');
    expect(muestra).toBeDefined();
    expect((muestra?.payload as any).organismo).toContain('Iglesia');
    expect(Object.keys((muestra?.payload as any) ?? {}).sort()).toEqual(['key', 'organismo', 'source']);
    const texto = JSON.stringify(sellos.map((s: any) => s.payload));
    expect(texto).not.toContain('@');
  });
});
