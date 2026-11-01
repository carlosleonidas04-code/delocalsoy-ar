import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// VIG-008 (#240): oportunidades institucionales del Valle de Iglesia
// seeded por seed-oportunidades-vig008.sql (2 filas: brecha post-cierre
// ProHuerta y alianza FECOAGRO/INTA/UNSJ). Suite de solo lectura y
// verificación contra el dominio real: GET /api/oportunidades con
// filtros, ficha pública por id y sellos oportunidad.propuesta en
// events_raw (source 'seed-vig-008'). Sin PII (ADR-027): actores sin
// nombre y consent_confirmed false hasta consentimiento institucional.
// Requiere Postgres/PostGIS real (job test de CI); sin base el suite se
// salta (honesto, R5).
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';
process.env.JWT_SECRET = 'test-jwt-secret-vig-008-oportunidades-32ch';

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

describe.skipIf(!dbUp)('oportunidades VIG-008 del Valle de Iglesia (#240 — seed institucional)', () => {
  const HASH_PRO_HUERTA = 'seed-oportunidad-vig008-pro-huerta';
  const HASH_EXTENSION = 'seed-oportunidad-vig008-extension';
  const SEEDS = [HASH_PRO_HUERTA, HASH_EXTENSION];

  it('GET ?nodo=iglesia expone las 2 seeds en estado detected', async () => {
    const res = await fetch(base + '/api/oportunidades?nodo=iglesia');
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.success).toBe(true);
    const seeds = body.data.filter((o: any) => SEEDS.includes(o.hash));
    expect(seeds.length).toBe(2);
    for (const o of seeds) {
      expect(o.estado).toBe('detected');
      expect(o.nodo_key).toBe('iglesia');
    }
  });

  it('fichas por id: evidencia correcta, actores sin nombre, sin PII', async () => {
    const res = await fetch(base + '/api/oportunidades?nodo=iglesia');
    const body: any = await res.json();
    const ids: Record<string, string> = {};
    for (const h of SEEDS) {
      const o = body.data.find((x: any) => x.hash === h);
      expect(o, 'falta la oportunidad ' + h).toBeDefined();
      ids[h] = o.id;
    }

    const fichaProHuerta = await fetch(base + '/api/oportunidades/' + ids[HASH_PRO_HUERTA]);
    expect(fichaProHuerta.status).toBe(200);
    const proHuerta: any = (await fichaProHuerta.json()).data;
    expect(proHuerta.tipo).toBe('market_gap');
    expect(proHuerta.evidencia.evidence_type).toBe('news_source');
    expect(Array.isArray(proHuerta.actores)).toBe(true);
    for (const actor of proHuerta.actores) {
      expect(actor.name).toBeUndefined();
      expect(actor.consent_confirmed ?? false).toBe(false);
    }

    const fichaExtension = await fetch(base + '/api/oportunidades/' + ids[HASH_EXTENSION]);
    expect(fichaExtension.status).toBe(200);
    const extension: any = (await fichaExtension.json()).data;
    expect(extension.tipo).toBe('partnership_opportunity');
    expect(extension.evidencia.evidence_type).toBe('institutional_document');

    expect(JSON.stringify([proHuerta, extension])).not.toContain('@');
  });

  it('sellos oportunidad.propuesta (source seed-vig-008): 2 con payload canonico sin PII', async () => {
    const sellos = await prisma.events_raw.findMany({
      where: { type: 'oportunidad.propuesta', payload: { path: ['source'], equals: 'seed-vig-008' } },
    });
    expect(sellos.length).toBe(2);
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
      prisma.oportunidades.count({ where: { nodo_key: 'iglesia' } }),
      prisma.events_raw.count({
        where: { type: 'oportunidad.propuesta', payload: { path: ['source'], equals: 'seed-vig-008' } },
      }),
    ]);
    execSync('pnpm --filter @delocalsoy/db db:seed', { cwd: repoRoot, stdio: 'pipe' });
    const despues = await Promise.all([
      prisma.oportunidades.count({ where: { nodo_key: 'iglesia' } }),
      prisma.events_raw.count({
        where: { type: 'oportunidad.propuesta', payload: { path: ['source'], equals: 'seed-vig-008' } },
      }),
    ]);
    expect(despues).toEqual(antes);
  }, 60000);
});
