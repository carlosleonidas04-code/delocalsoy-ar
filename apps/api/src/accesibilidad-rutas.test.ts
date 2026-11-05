import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// NODO-CAPITAL NCAP-R5 (#157, épica #152): capa inicial de accesibilidad
// peatonal del nodo Capital + dashboard mínimo. REGLA DE HONESTIDAD
// (R5/ADR-036): el dashboard publica conteos CON cobertura y fecha, jamás
// puntajes globales — «82% de los tramos relevados cumple (cobertura: 14
// de 120)», nunca «accesibilidad del Centro: 82%». Los 18 tramos
// priorizados provienen del anuncio municipal de repavimentación del
// microcentro 2026 (fuente repavimentacion_microcentro_2026, NCAP-R3
// #155): anuncio ≠ obra — estado por tramo exige verificación municipal
// (R15); nacen 'declared' con coordenadas ilustrativas (is_synthetic).
// Las 6 observaciones seed ejercen el workflow de revisión (pending |
// community_validated | verified | disputed). Requiere Postgres/PostGIS
// real (job test de CI); sin base → skip honesto (patrón vocabulario).
// Idempotencia: conteos ACOTADOS a los ids/sellos de este seed (un count
// global de events_raw es racy bajo las suites en paralelo).
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

// Los 2 hashes de los sellos de este seed (tramos + observaciones).
const SELLOS_R5 = ['seed-tramos-capital', 'seed-acc-observaciones-capital'];

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

async function getJson(path: string): Promise<{ status: number; body: any }> {
  const res = await fetch(base + path);
  return { status: res.status, body: await res.json() };
}

describe.skipIf(!dbUp)('Accesibilidad peatonal del nodo Capital NCAP-R5 (#157)', () => {
  it('GET /api/nodos/capital/accesibilidad — dashboard con regla y fecha, sin puntajes globales', async () => {
    const { status, body } = await getJson('/api/nodos/capital/accesibilidad');
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.nodo_key).toBe('capital');
    expect(body.data.regla).toContain('cobertura');
    expect(typeof body.data.generado_en).toBe('string');
    // R5/ADR-036: jamás un puntaje global del tipo «accesibilidad del Centro:
    // 82%». Los DATOS no contienen puntaje/porcentaje/score; la `regla`
    // nombra «puntajes globales» para negarlos — se excluye del assert.
    const { regla: _regla, ...sinRegla } = body.data;
    expect(JSON.stringify(sinRegla)).not.toContain('porcentaje');
    expect(JSON.stringify(sinRegla)).not.toContain('puntaje');
    expect(JSON.stringify(sinRegla)).not.toContain('score');
    expect(Array.isArray(body.data.reportes_por_categoria)).toBe(true);
  });

  it('tramos_vereda: 18 priorizados declarados, 0 relevados — cobertura y cautela honestas', async () => {
    const { body } = await getJson('/api/nodos/capital/accesibilidad');
    const t = body.data.tramos_vereda;
    expect(t.priorizados).toBe(18);
    expect(t.con_relevamiento).toBe(0); // anuncio ≠ obra: sin verificación municipal no hay relevamiento (R15)
    expect(t.cobertura).toBe('0 de 18 tramos priorizados cuentan con relevamiento');
    expect(t.cautela).toContain('anuncio');
    expect(typeof t.fecha_corte).toBe('string');
  });

  it('observaciones por estado de revisión: 2 ingresadas, 2 revisadas, 1 corroborada, 1 disputada + 4 ilustrativas R1', async () => {
    const { body } = await getJson('/api/nodos/capital/accesibilidad');
    const o = body.data.observaciones;
    expect(o.ingresadas).toBe(2); // pending
    expect(o.revisadas).toBe(2); // community_validated
    expect(o.corroboradas).toBe(1); // verified
    expect(o.disputadas).toBe(1); // disputed
    expect(o.ilustrativas).toBe(4); // los 4 seed synthetic_demo del NCAP-R1
    expect(typeof o.fecha_corte).toBe('string');
  });

  it('features por capa y por fuente del dominio movilidad (accessibility 10, sidewalks 19)', async () => {
    const { body } = await getJson('/api/nodos/capital/accesibilidad');
    const porCapa = body.data.features_por_capa;
    const acc = porCapa.find((c: any) => c.capa === 'accessibility');
    const sw = porCapa.find((c: any) => c.capa === 'sidewalks');
    expect(acc.total).toBe(10);
    expect(acc.por_estado.synthetic_demo).toBe(4);
    expect(sw.total).toBe(19); // 18 tramos + seed-f-cap-105
    expect(sw.por_estado.declared).toBe(18);
    expect(sw.por_estado.community_validated).toBe(1);
    const anuncio = body.data.features_por_fuente.find((f: any) => f.fuente.includes('repavimentación'));
    expect(anuncio.total).toBe(18);
  });

  it('hitos del catálogo global con ficha y fecha de última revisión', async () => {
    const { body } = await getJson('/api/nodos/capital/accesibilidad');
    const hitos = body.data.hitos;
    expect(hitos.length).toBe(11);
    const conFicha = hitos.filter((h: any) => h.con_ficha);
    expect(conFicha.length).toBe(9); // features landmarks NCAP-R1
    for (const h of hitos) {
      if (h.con_ficha) {
        expect(typeof h.ultima_revision).toBe('string');
      } else {
        expect(h.ultima_revision).toBeNull(); // sin ficha → null honesto (R15)
      }
    }
  });

  it('404 honesto para nodo inexistente', async () => {
    const { status, body } = await getJson('/api/nodos/no-existe/accesibilidad');
    expect(status).toBe(404);
    expect(body.success).toBe(false);
  });

  it('sellos seed-ncap-r5 en events_raw: 2, sin PII', async () => {
    const sellos: any[] = await prisma.events_raw.findMany({ where: { hash: { in: SELLOS_R5 } } });
    expect(sellos.length).toBe(2);
    for (const s of sellos) {
      expect(s.payload.source).toBe('seed-ncap-r5');
      expect(s.hash.startsWith('seed-')).toBe(true);
      expect(JSON.stringify(s.payload)).not.toContain('@'); // sin PII
    }
  });

  it('idempotencia: re-ejecutar db:seed no duplica la accesibilidad', async () => {
    const nodo = await prisma.nodos.findFirst({ where: { key: 'capital' } });
    const antes = await Promise.all([
      prisma.features.count({ where: { nodo_id: nodo!.id } }),
      prisma.categorias.count({ where: { nodo_id: nodo!.id } }),
      prisma.features.count({ where: { nodo_id: nodo!.id, id: { startsWith: 'seed-f-tramo-' } } }),
      prisma.events_raw.count({ where: { hash: { in: SELLOS_R5 } } }),
    ]);
    execSync('pnpm --filter @delocalsoy/db db:seed', { cwd: repoRoot, stdio: 'pipe' });
    const despues = await Promise.all([
      prisma.features.count({ where: { nodo_id: nodo!.id } }),
      prisma.categorias.count({ where: { nodo_id: nodo!.id } }),
      prisma.features.count({ where: { nodo_id: nodo!.id, id: { startsWith: 'seed-f-tramo-' } } }),
      prisma.events_raw.count({ where: { hash: { in: SELLOS_R5 } } }),
    ]);
    expect(despues).toEqual(antes);
    expect(despues[0]).toBe(43); // 19 NCAP-R1 + 18 tramos + 6 observaciones
    expect(despues[1]).toBe(13); // 12 NCAP-R1 + tramo_priorizado
    expect(despues[2]).toBe(18);
    expect(despues[3]).toBe(2);
  }, 60000);
});
