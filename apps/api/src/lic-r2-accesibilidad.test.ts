import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// LIC-DLUI LIC-R2 (LIC-02 #453, épica #448): KPI tramos_con_relevamiento —
// relevamiento de accesibilidad de los tramos del anuncio (NCAP-R5 #155).
// Criterio ESPEJO del dashboard accesibilidad (verdad única, sin
// divergencia): tramos = features capa sidewalks id seed-f-tramo-% del
// nodo; con relevamiento = community_validated | verified. Nace honesto
// «0 de 18» (DL-5): sin relevamiento el 0 es REAL sobre los 18 tramos del
// anuncio — la brecha visible, jamás oculta; SIN puntajes de accesibilidad
// ni de personas (R5/ADR-036); obra ≠ relevamiento (R15: in_execution |
// completed NO mueven el KPI).
//
// CAPITAL: SOLO LECTURA — este suite NUNCA recomputa capital ni muta sus
// tramos (showcase-demo.test.ts exige capital.kpis === 0 y
// accesibilidad-rutas.test.ts hardcodea 18/0 sobre el dominio del
// anuncio). Los escenarios de escritura usan un fixture con prefijo
// propio en CAUCETE (ninguna suite hardcodea counts de caucete) que se
// limpia SIEMPRE (try/finally + afterAll). Requiere Postgres/PostGIS
// real; sin base → skip honesto.

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';
process.env.JWT_SECRET = 'test-jwt-secret-lic-r2-accesibilidad-453';

const { createApp } = await import('./app.js');
const prisma = (await import('./lib/prisma.js')).default;
const { recomputeKpisForNode, Prisma } = await import('@delocalsoy/db');
const { LIC02_KPI_KEYS, OBSERVATORIO_KPI_KEYS } = await import('@delocalsoy/contracts');

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

const dbUp = await prisma
  .$queryRaw`SELECT 1`
  .then(() => true)
  .catch(() => false);

let server: any;
let base = '';

// Fixture LIC-R2: tramos con prefijo PROPIO (caucete) — jamás los del
// anuncio real del capital. is_synthetic true (coordenadas ilustrativas,
// ADR-035): el KPI cuenta los estados del ciclo porque los tramos SON el
// dominio del anuncio — filtrar por is_synthetic ocultaría la brecha.
const PREFIJO_TRAMO = 'seed-f-tramo-test-lic-r2-';
let capaFixtureId: string | null = null;

async function limpiarTramosFixture(): Promise<void> {
  await prisma.features.deleteMany({ where: { id: { startsWith: PREFIJO_TRAMO } } });
  if (capaFixtureId !== null) {
    try {
      await prisma.capas.delete({ where: { id: capaFixtureId } });
    } catch {
      // ya eliminada (onDelete cascade) — sin estado
    }
    capaFixtureId = null;
  }
}

async function sembrarTramosFixture(n: number): Promise<void> {
  await limpiarTramosFixture(); // idempotente: siempre parte de cero
  const caucete = await prisma.nodos.findFirst({ where: { key: 'caucete' } });
  if (!caucete) throw new Error('nodo caucete inexistente — db:seed requerido');
  let capa: any = await prisma.capas.findFirst({ where: { nodo_id: caucete.id, key: 'sidewalks' } });
  if (!capa) {
    capa = await prisma.capas.create({
      data: {
        nodo_id: caucete.id,
        key: 'sidewalks',
        nombre: 'Veredas (fixture LIC-R2)',
        dominio: 'movilidad',
        geometria: 'LineString',
      },
    });
    capaFixtureId = capa.id; // solo la capa PROPIA se elimina al limpiar
  }
  const ahora = new Date();
  const filas = Array.from({ length: n }, (_, i) => ({
    id: PREFIJO_TRAMO + String(i + 1).padStart(2, '0'),
    nodo_id: caucete.id,
    capa_id: capa.id,
    titulo: 'Tramo fixture LIC-R2 ' + String(i + 1).padStart(2, '0'),
    tipo: 'asset',
    estado: 'declared',
    fuente_label: 'Ilustrativa · fixture test LIC-R2 #453',
    observado_at: ahora,
    lat: -31.65,
    lng: -68.28,
    is_synthetic: true,
  }));
  await prisma.features.createMany({ data: filas });
}

beforeAll(async () => {
  execSync('pnpm --filter @delocalsoy/db db:seed', { cwd: repoRoot, stdio: 'pipe' });
  server = createApp().listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = 'http://127.0.0.1:' + server.address().port;
}, 60000);

afterAll(async () => {
  await limpiarTramosFixture().catch(() => undefined);
  // caucete queda re-derivado SIN el fixture: el dominio manda (patrón vig003).
  await recomputeKpisForNode('caucete').catch(() => undefined);
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

function snapTramos(snapshots: any[]): any {
  return snapshots.find((s: any) => s.kpi_key === 'tramos_con_relevamiento');
}

describe.skipIf(!dbUp)('KPI tramos_con_relevamiento LIC-R2 (#453, épica #448)', () => {
  it('capital READ-ONLY: dominio del anuncio 18 declared, «0 de 18» en dashboard y ficha (DL-5)', async () => {
    // Espejo del dominio con el MISMO predicado del KPI (NCAP-R5).
    const espejo: Record<string, number> = {};
    for (const r of (await prisma.$queryRaw(Prisma.sql`
      SELECT f.estado AS estado, COUNT(*)::int AS total
      FROM features f
      JOIN capas c ON c.id = f.capa_id
      WHERE c.key = 'sidewalks' AND f.id LIKE 'seed-f-tramo-%'
        AND f.nodo_id = (SELECT id FROM nodos WHERE key = 'capital')
      GROUP BY f.estado`)) as Array<{ estado: string; total: number }>) {
      espejo[r.estado] = r.total;
    }
    const priorizados = espejo['declared'] ?? 0;
    const relevados = (espejo['community_validated'] ?? 0) + (espejo['verified'] ?? 0);
    expect(priorizados).toBe(18); // anuncio NCAP-R5 #155: 18 tramos declared
    expect(relevados).toBe(0); // sin relevamiento: el 0 es REAL (DL-5)

    // Dashboard accesibilidad (NCAP-R5): MISMA verdad, sin divergencia.
    const res = await getJson('/api/nodos/capital/accesibilidad');
    expect(res.status).toBe(200);
    expect(res.body.data.tramos_vereda.priorizados).toBe(priorizados);
    expect(res.body.data.tramos_vereda.con_relevamiento).toBe(relevados);
    expect(res.body.data.tramos_vereda.cobertura).toBe(
      relevados + ' de ' + (priorizados + relevados) + ' tramos priorizados cuentan con relevamiento'
    );

    // Observatorio de capital SIN recompute → 0 snapshots honestos (R15,
    // patrón showcase) y la ficha del KPI LIC-02 publicada igual (DL-1).
    const obs = await getJson('/api/nodos/capital/observatorio');
    expect(obs.status).toBe(200);
    expect(obs.body.data.kpis.total).toBe(0);
    const fichas: any[] = obs.body.data.fichas_metodologicas;
    expect(fichas.length).toBe(OBSERVATORIO_KPI_KEYS.length);
    const ficha = fichas.find((f: any) => f.clave === LIC02_KPI_KEYS[0]);
    expect(ficha).toBeDefined();
    expect(ficha.formula).toContain('community_validated');
    expect(ficha.fuente).toContain('NCAP-R5');
    expect(ficha.cobertura).toContain('0 de 18'); // DL-5: la brecha visible
  });

  it('fixture caucete (espejo del anuncio): recompute → «0 de 18» honesto + panel lo publica', async () => {
    try {
      await sembrarTramosFixture(18);
      const snap = snapTramos(await recomputeKpisForNode('caucete'));
      expect(snap?.valor).toBe(0); // «0 de 18» REAL (DL-5)
      expect(snap?.detalles).toEqual({
        tramos_total: 18,
        tramos_declared: 18,
        tramos_in_execution: 0,
        tramos_completed: 0,
        tramos_community_validated: 0,
        tramos_verified: 0,
      });
      // El observatorio publica el snapshot del set LIC-02 (5 claves).
      const res = await getJson('/api/nodos/caucete/observatorio');
      expect(res.status).toBe(200);
      expect(res.body.data.kpis.total).toBe(OBSERVATORIO_KPI_KEYS.length);
      const row = res.body.data.kpis.snapshots.find((s: any) => s.kpi_key === 'tramos_con_relevamiento');
      expect(row).toBeDefined();
      expect(row.valor).toBe(0);
      expect(row.detalles.tramos_total).toBe(18);
    } finally {
      await limpiarTramosFixture();
    }
  });

  it('flip de estados: el relevamiento mueve el valor, la obra NO (anuncio ≠ obra, R15)', async () => {
    try {
      await sembrarTramosFixture(4);
      // 1 tramo relevado → community_validated.
      await prisma.features.update({ where: { id: PREFIJO_TRAMO + '01' }, data: { estado: 'community_validated' } });
      let snap = snapTramos(await recomputeKpisForNode('caucete'));
      expect(snap?.valor).toBe(1);
      expect(snap?.detalles).toEqual({
        tramos_total: 4,
        tramos_declared: 3,
        tramos_in_execution: 0,
        tramos_completed: 0,
        tramos_community_validated: 1,
        tramos_verified: 0,
      });
      // La obra avanza (in_execution | completed) pero el KPI NO se mueve.
      await prisma.features.update({ where: { id: PREFIJO_TRAMO + '02' }, data: { estado: 'in_execution' } });
      await prisma.features.update({ where: { id: PREFIJO_TRAMO + '03' }, data: { estado: 'completed' } });
      snap = snapTramos(await recomputeKpisForNode('caucete'));
      expect(snap?.valor).toBe(1); // obra ≠ relevamiento
      expect(snap?.detalles).toEqual({
        tramos_total: 4,
        tramos_declared: 1,
        tramos_in_execution: 1,
        tramos_completed: 1,
        tramos_community_validated: 1,
        tramos_verified: 0,
      });
      // Corroboración comunitaria → verificación técnica: el valor sigue
      // contando el relevamiento; el desglose separa cv | verified.
      await prisma.features.update({ where: { id: PREFIJO_TRAMO + '01' }, data: { estado: 'verified' } });
      snap = snapTramos(await recomputeKpisForNode('caucete'));
      expect(snap?.valor).toBe(1);
      expect(snap?.detalles).toEqual({
        tramos_total: 4,
        tramos_declared: 1,
        tramos_in_execution: 1,
        tramos_completed: 1,
        tramos_community_validated: 0,
        tramos_verified: 1,
      });
    } finally {
      await limpiarTramosFixture();
    }
  });

  it('iglesia sin tramos: 0 honesto con tramos_total 0 — el conteo existe, no es null', async () => {
    await recomputeKpisForNode('iglesia');
    const res = await getJson('/api/nodos/iglesia/observatorio');
    expect(res.status).toBe(200);
    expect(res.body.data.kpis.total).toBe(OBSERVATORIO_KPI_KEYS.length);
    const row = res.body.data.kpis.snapshots.find((s: any) => s.kpi_key === 'tramos_con_relevamiento');
    expect(row).toBeDefined();
    expect(row.valor).toBe(0); // 0 honesto (R15): sin tramos → 0 de 0
    expect(row.detalles.tramos_total).toBe(0);
  });

  it('re-computar es idempotente: una fila por clave, valores estables (patrón VIG-003)', async () => {
    try {
      await sembrarTramosFixture(2);
      const primero = snapTramos(await recomputeKpisForNode('caucete'));
      const segundo = snapTramos(await recomputeKpisForNode('caucete'));
      expect(segundo?.valor).toBe(primero?.valor);
      expect(segundo?.detalles).toEqual(primero?.detalles);
      const count = await prisma.kpi_snapshots.count({
        where: { nodo_key: 'caucete', kpi_key: 'tramos_con_relevamiento' },
      });
      expect(count).toBe(1); // upsert por (nodo_key, kpi_key): nunca duplica
    } finally {
      await limpiarTramosFixture();
    }
  });
});
