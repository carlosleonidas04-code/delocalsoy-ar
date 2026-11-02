import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// VIG-009 R4 (#241, épica #239): oportunidades de Achango sembradas por
// seed-oportunidades-vig009-achango.sql (8 filas detected: conjunto MHN,
// nudo textil, custodia familiar, demanda de restauración, turismo
// patrimonial, alianzas, inversión con candado epistémico y política
// pública). Suite de solo lectura contra el dominio real: GET
// /api/oportunidades, fichas por id y sellos oportunidad.propuesta con
// source 'seed-vig-009'. Actores SIN nombre y consent_confirmed false
// (ADR-027, VIG-009 R3): la estimación de restauración es testimonio del
// cuidador, no presupuesto oficial (R15). Requiere Postgres/PostGIS real;
// sin base → skip honesto.

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';
process.env.JWT_SECRET = 'test-jwt-secret-vig-009-oportunidades-32ch';

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

describe.skipIf(!dbUp)('oportunidades VIG-009 Achango (#241 — seed del sistema de apoyo)', () => {
  const HASH_MHN = 'seed-oportunidad-vig009-mhn';
  const HASH_NUDO = 'seed-oportunidad-vig009-nudo-achango';
  const HASH_CUSTODIA = 'seed-oportunidad-vig009-custodia-familiar';
  const HASH_DEMANDA = 'seed-oportunidad-vig009-demanda-restauracion';
  const HASH_TURISMO = 'seed-oportunidad-vig009-turismo-patrimonial';
  const HASH_ALIANZAS = 'seed-oportunidad-vig009-alianzas';
  const HASH_INVERSION = 'seed-oportunidad-vig009-inversion-restauracion';
  const HASH_POLITICA = 'seed-oportunidad-vig009-politica-publica';
  const SEEDS = [HASH_MHN, HASH_NUDO, HASH_CUSTODIA, HASH_DEMANDA, HASH_TURISMO, HASH_ALIANZAS, HASH_INVERSION, HASH_POLITICA];
  const TIPO_POR_HASH: Record<string, string> = {
    [HASH_MHN]: 'physical_asset',
    [HASH_NUDO]: 'cultural_asset',
    [HASH_CUSTODIA]: 'institutional_asset',
    [HASH_DEMANDA]: 'detected_demand',
    [HASH_TURISMO]: 'market_gap',
    [HASH_ALIANZAS]: 'partnership_opportunity',
    [HASH_INVERSION]: 'investment_opportunity',
    [HASH_POLITICA]: 'policy_opportunity',
  };
  // evidence_type canónico del seed: institutional_document para las 3
  // ancladas en documentos institucionales; news_source para las 5
  // ancladas en testimonio periodístico (ADR-035, candado epistémico).
  const EVIDENCIA_POR_HASH: Record<string, string> = {
    [HASH_MHN]: 'institutional_document',
    [HASH_NUDO]: 'news_source',
    [HASH_CUSTODIA]: 'news_source',
    [HASH_DEMANDA]: 'news_source',
    [HASH_TURISMO]: 'news_source',
    [HASH_ALIANZAS]: 'institutional_document',
    [HASH_INVERSION]: 'news_source',
    [HASH_POLITICA]: 'institutional_document',
  };

  it('GET ?nodo=iglesia expone las 8 seeds en estado detected', async () => {
    const res = await fetch(base + '/api/oportunidades?nodo=iglesia');
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.success).toBe(true);
    const seeds = body.data.filter((o: any) => SEEDS.includes(o.hash));
    expect(seeds.length).toBe(8);
    for (const o of seeds) {
      expect(o.estado).toBe('detected');
      expect(o.nodo_key).toBe('iglesia');
    }
  });

  it('fichas por id: tipos y evidence_type canónicos, actores sin nombre ni PII', async () => {
    const res = await fetch(base + '/api/oportunidades?nodo=iglesia');
    const body: any = await res.json();
    const ids: Record<string, string> = {};
    for (const h of SEEDS) {
      const o = body.data.find((x: any) => x.hash === h);
      expect(o, 'falta la oportunidad ' + h).toBeDefined();
      ids[h] = o.id;
    }

    const fichas: any[] = [];
    for (const h of SEEDS) {
      const r = await fetch(base + '/api/oportunidades/' + ids[h]);
      expect(r.status, 'ficha de ' + h).toBe(200);
      fichas.push((await r.json()).data);
    }
    for (const f of fichas) {
      expect(Array.isArray(f.actores)).toBe(true);
      for (const actor of f.actores) {
        expect(actor.name).toBeUndefined(); // ADR-027: sin consentimiento no hay nombres
        expect(actor.consent_confirmed ?? false).toBe(false);
      }
    }
    for (const h of SEEDS) {
      const f = fichas.find((x: any) => x.id === ids[h]);
      expect(f.tipo).toBe(TIPO_POR_HASH[h]);
      expect(f.evidencia.evidence_type).toBe(EVIDENCIA_POR_HASH[h]);
    }
    expect(JSON.stringify(fichas)).not.toContain('@');
  });

  it('sellos oportunidad.propuesta (source seed-vig-009): 8 con payload canónico sin PII', async () => {
    const sellos = await prisma.events_raw.findMany({
      where: { type: 'oportunidad.propuesta', payload: { path: ['source'], equals: 'seed-vig-009' } },
    });
    expect(sellos.length).toBe(8);
    for (const s of sellos) {
      expect(Object.keys((s.payload as any) ?? {}).sort()).toEqual([
        'created_by_hash', 'estado', 'nodo_key', 'oportunidad_id', 'source', 'subnodo_key', 'tipo',
      ]);
    }
    const texto = JSON.stringify(sellos.map((s: any) => s.payload));
    expect(texto).not.toContain('@');
  });

  it('GET ?nodo=capital no incluye las seeds de iglesia', async () => {
    const res = await fetch(base + '/api/oportunidades?nodo=capital');
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data.some((o: any) => SEEDS.includes(o.hash))).toBe(false);
  });

  it('seed idempotente: re-ejecutar db:seed no duplica oportunidades ni sellos', async () => {
    const antes = await Promise.all([
      prisma.oportunidades.count({ where: { created_by_hash: 'seed-vig-009' } }),
      prisma.events_raw.count({
        where: { type: 'oportunidad.propuesta', payload: { path: ['source'], equals: 'seed-vig-009' } },
      }),
    ]);
    execSync('pnpm --filter @delocalsoy/db db:seed', { cwd: repoRoot, stdio: 'pipe' });
    const despues = await Promise.all([
      prisma.oportunidades.count({ where: { created_by_hash: 'seed-vig-009' } }),
      prisma.events_raw.count({
        where: { type: 'oportunidad.propuesta', payload: { path: ['source'], equals: 'seed-vig-009' } },
      }),
    ]);
    expect(despues).toEqual(antes);
    expect(despues[0]).toBe(8);
    expect(despues[1]).toBe(8);
  }, 60000);
});
