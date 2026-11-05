import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CorredorStatusSchema } from '@delocalsoy/contracts';

// NODO-CAPITAL NCAP-R4 (#156): red de corredores v0.1 — extremo a extremo
// contra servicios reales (PostgreSQL/PostGIS). Decisiones de diseño
// ratificadas por la DH 2026-11-04: (1) entidad nueva Prisma — features es
// Point-only y no alberga el grafo relacional; (2) segmentos from/to
// tipados con secuencia, modos, observaciones, observed_at y fuentes por
// tramo (ADR-035), SIN geometría en v0.1 (R15: sin fuente verificada no
// hay traza dibujada); (3) SOLO lectura pública — los corredores son
// hipótesis de diseño DH, no input ciudadano. Verifica: catálogo de los 5
// corredores de la hipótesis con continuidad ok y status del vocabulario
// ratificado, detalle con hitos/subnodos resueltos y fuentes por tramo,
// 404 honesto, continuidad ruptura con detalle del corte y sello del seed
// idempotente por hash. Requiere Postgres/PostGIS real (job test de CI);
// sin base el suite se salta (honesto, R5).
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';
process.env.JWT_SECRET = 'test-jwt-secret-ncap-r4-corredores-32ch';

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

describe.skipIf(!dbUp)('corredores NCAP-R4 (#156 — red de corredores v0.1)', () => {
  it('GET /api/corredores: catálogo público con los 5 corredores de la hipótesis DH, status candidate (nunca traza oficial) y continuidad ok', async () => {
    const res = await fetch(base + '/api/corredores');
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    const keys: string[] = body.data.map((c: any) => c.key);
    for (const esperada of [
      'cor_centro_civico',
      'cor_libertador_west',
      'cor_centro_desamparados',
      'cor_centro_micro_macro',
      'cor_redtulum_centro',
    ]) {
      expect(keys).toContain(esperada);
    }
    for (const c of body.data) {
      expect(CorredorStatusSchema.options).toContain(c.status);
      expect(c.status).toBe('candidate'); // hipótesis DH v0.1 — R15
      expect(typeof c.segmentos_count).toBe('number');
      expect(typeof c.hitos_count).toBe('number');
      expect(c.continuidad).toBe('ok'); // los seeds de la DH están encadenados
    }
  });

  it('GET /api/corredores/cor_centro_civico: detalle con hitos resueltos, segmentos ordenados, fuentes por tramo (ADR-035) y continuidad ok', async () => {
    const res = await fetch(base + '/api/corredores/cor_centro_civico');
    expect(res.status).toBe(200);
    const { data } = (await res.json()) as any;
    expect(data.status).toBe('candidate');
    expect(data.continuidad).toBe('ok');
    expect(data.rupturas).toEqual([]);
    expect(data.hitos.map((h: any) => h.key).sort()).toEqual(
      ['hit_centro_civico', 'hit_parque_de_mayo', 'hit_teatro_plaza_bicentenario'].sort()
    );
    expect(data.segmentos.length).toBe(2);
    expect(data.segmentos[0].secuencia).toBe(1);
    expect(data.segmentos[1].secuencia).toBe(2);
    expect(data.segmentos[0].to.key).toBe(data.segmentos[1].from.key);
    for (const s of data.segmentos) {
      expect(Array.isArray(s.modos)).toBe(true);
      expect(s.modos.length).toBeGreaterThan(0);
      expect(Array.isArray(s.fuentes)).toBe(true);
      expect(s.fuentes.length).toBeGreaterThan(0); // ADR-035: relación sin fuente = invención
      expect(s.observed_at).toBeTruthy();
    }
  });

  it('GET /api/corredores/cor_centro_desamparados: endpoints subnodo resueltos con label — el corredor RELACIONA distritos, no los reasigna (regla #154)', async () => {
    const res = await fetch(base + '/api/corredores/cor_centro_desamparados');
    expect(res.status).toBe(200);
    const { data } = (await res.json()) as any;
    expect(data.continuidad).toBe('ok');
    expect(data.segmentos.length).toBe(1);
    expect(data.segmentos[0].from.tipo).toBe('subnodo');
    expect(data.segmentos[0].from.key).toBe('sj_capital_centro');
    expect(data.segmentos[0].to.key).toBe('sj_capital_desamparados');
    const labels: string[] = data.subnodos.map((s: any) => s.label);
    expect(labels).toContain('Centro');
    expect(labels).toContain('Desamparados');
    expect(data.hitos).toEqual([]); // el corredor distrito↔distrito no inventa hitos
  });

  it('GET /api/corredores/cor_inexistente → 404 honesto', async () => {
    const res = await fetch(base + '/api/corredores/cor_inexistente');
    expect(res.status).toBe(404);
    const body: any = await res.json();
    expect(body.success).toBe(false);
  });

  it('continuidad ruptura: la API reporta dónde se corta la cadena (criterio de cierre #156)', async () => {
    const ts = Date.now();
    const corredor = await prisma.corredores.create({
      data: {
        key: 'cor_test_ruptura_' + ts,
        nodo_key: 'capital',
        label: 'Corredor de prueba de ruptura',
        proposito: 'Corredor sintético de verificación de continuidad — se elimina al final del test',
        status: 'candidate',
      },
    });
    await prisma.corredor_segmentos.createMany({
      data: [
        {
          corredor_id: corredor.id,
          secuencia: 1,
          from_tipo: 'hito',
          from_key: 'hit_test_a',
          to_tipo: 'hito',
          to_key: 'hit_test_b',
          modos: ['walk'],
          observed_at: new Date(),
          fuentes: [{ fuente: 'test de continuidad', fecha: '2026' }],
        },
        {
          corredor_id: corredor.id,
          secuencia: 2,
          from_tipo: 'hito',
          from_key: 'hit_test_c',
          to_tipo: 'hito',
          to_key: 'hit_test_a',
          modos: ['walk'],
          observed_at: new Date(),
          fuentes: [{ fuente: 'test de continuidad', fecha: '2026' }],
        },
      ],
    });
    const res = await fetch(base + '/api/corredores/' + corredor.key);
    expect(res.status).toBe(200);
    const { data } = (await res.json()) as any;
    expect(data.continuidad).toBe('ruptura');
    expect(data.rupturas.length).toBe(1);
    expect(data.rupturas[0].despues_de_secuencia).toBe(1);
    expect(data.rupturas[0].esperaba.key).toBe('hit_test_b');
    expect(data.rupturas[0].encontro.key).toBe('hit_test_c');
    await prisma.corredores.delete({ where: { id: corredor.id } }); // cascade limpia segmentos
  });

  it('sello del seed en events_raw: corredor.creado idempotente por hash (R4/R15, patrón seed-subnodo #154)', async () => {
    const sello = await prisma.events_raw.findUnique({ where: { hash: 'seed-corredor-cor_centro_civico' } });
    expect(sello).not.toBeNull();
    expect(sello!.type).toBe('corredor.creado');
    expect((sello!.payload as any).key).toBe('cor_centro_civico');
    expect((sello!.payload as any).source).toBe('seed-ncap-r4');
    expect((sello!.payload as any).segmentos_count).toBe(2);
  });
});
