import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// NODO-VIG VIG-006 (NVIG-R8 #188, épica #167): RAG territorial ético —
// índice rag_index (recompute idempotente por nodo_key+source_type+
// source_id; full-text NATIVO de PostgreSQL en español, columna tsvector
// generada + GIN) y consulta pública POST /api/nodos/:key/ask SIN LLM
// (decisión DH ratificada 2026-10-14): recuperación full-text +
// plantillas autorizadas por dominio — nada generado; sin fragmentos →
// null honesto (R15). La visibilidad restricted JAMÁS se indexa ni se
// recupera (ADR-036) y la clave custodial 'sensible' no existe en esta
// superficie (VIG-004). Este suite ejerce el recompute directamente (el
// consumidor vig006-rag-index tiene su propia suite en apps/worker) y
// verifica dominio → recompute → consulta leyendo AMBAS superficies.
// Requiere Postgres/PostGIS real; sin base → skip honesto.

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';
process.env.JWT_SECRET = 'test-jwt-secret-vig006-rag-territorial-32';

const { createApp } = await import('./app.js');
const prisma = (await import('./lib/prisma.js')).default;
const { recomputeKpisForNode, recomputeRagIndexForNode } = await import('@delocalsoy/db');

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

async function postJson(path: string, payload: any): Promise<{ status: number; body: any }> {
  const res = await fetch(base + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return { status: res.status, body: await res.json() };
}

function ask(payload: any): Promise<{ status: number; body: any }> {
  return postJson('/api/nodos/iglesia/ask', payload);
}

describe.skipIf(!dbUp)('RAG territorial ético VIG-006 (#188, épica #167)', () => {
  it('ask sobre Angualasto recupera fragmentos autorizados con human_review pending', async () => {
    await recomputeKpisForNode('iglesia');
    await recomputeRagIndexForNode('iglesia');
    const res = await ask({ pregunta: 'yacimiento Angualasto' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.nodo_key).toBe('iglesia');
    expect(res.body.data.recovered).toBeGreaterThanOrEqual(1);
    const textos = (res.body.data.dato ?? []).map((f: any) => String(f.texto ?? '')).join(' ');
    expect(textos.toLowerCase()).toContain('angualasto');
    expect(res.body.data.human_review).toBe('pending');
    // Sin LLM: interpretación y sugerencia son plantillas autorizadas (o null), nunca texto generado.
    expect(typeof res.body.data.interpretacion === 'string' || res.body.data.interpretacion === null).toBe(true);
    // ADR-036 + VIG-004: la superficie pública NO expone la clave custodial 'sensible'.
    expect('sensible' in res.body.data).toBe(false);
    for (const f of res.body.data.dato ?? []) {
      expect('sensible' in f).toBe(false);
      expect(Array.isArray(f.fuentes)).toBe(true);
      expect(['subnodo', 'activo', 'kpi']).toContain(f.source_type);
    }
  });

  it('el filtro subnodo acota la recuperación al distrito (llave derivada del dominio)', async () => {
    const distritosRes = await fetch(base + '/api/nodos/iglesia/subnodos?type=district');
    const distritos: any[] = (await distritosRes.json()).data ?? [];
    const rodeo = distritos.find((d: any) => String(d.key).includes('rodeo'));
    expect(rodeo).toBeTruthy();
    const res = await ask({ pregunta: 'que hay en el distrito', subnodo: rodeo.key });
    expect(res.status).toBe(200);
    expect(res.body.data.recovered).toBeGreaterThanOrEqual(1);
    for (const f of res.body.data.dato ?? []) {
      expect(f.subnodo_key).toBe(rodeo.key);
    }
  });

  it('un activo aprobado público se indexa; restricted lo retira por delete lógico (ADR-036)', async () => {
    const ts = Date.now();
    const hash = 'test-vig006-rag-' + ts;
    const activo = await prisma.activos.create({
      data: {
        tipo: 'local',
        titulo: 'Bodega artesanal testvig006 del valle',
        descripcion: 'Producción familiar de vino artesanal del test VIG-006.',
        estado: 'aprobado',
        nodo_key: 'iglesia',
        visibilidad: 'public',
        procedencia: { source_id: 'test-vig006', fuente: 'test VIG-006', fecha: '2026' },
        created_by_hash: 'test-vig006-' + ts,
        hash,
      },
    });
    await prisma.activos_clasificaciones.create({
      data: {
        activo_id: activo.id,
        n1: 'productivo_rural',
        n2: 'test_vig006',
        n3: '',
        is_primary: true,
        source: 'test VIG-006',
      },
    });
    await recomputeRagIndexForNode('iglesia');
    const con = await ask({ pregunta: 'bodega artesanal testvig006' });
    expect(con.status).toBe(200);
    const ids = (con.body.data.dato ?? []).map((f: any) => f.source_id);
    expect(ids).toContain(activo.id);
    expect(con.body.data.dominio).toBe('productivo_rural');

    // Custodia VIG-004: al pasar a restricted, el delete lógico retira el
    // fragmento de la lectura pública (ADR-036) — la declaratoria sigue en
    // su ficha patrimonial, pero el índice RAG no la sirve.
    await prisma.activos.update({ where: { id: activo.id }, data: { visibilidad: 'restricted' } });
    await recomputeRagIndexForNode('iglesia');
    const sin = await ask({ pregunta: 'bodega artesanal testvig006' });
    expect(sin.status).toBe(200);
    const idsSin = (sin.body.data.dato ?? []).map((f: any) => f.source_id);
    expect(idsSin).not.toContain(activo.id);

    // Limpieza: el dominio queda como estaba.
    await prisma.activos_clasificaciones.deleteMany({ where: { activo_id: activo.id } });
    await prisma.activos.deleteMany({ where: { id: activo.id } });
    await recomputeRagIndexForNode('iglesia');
  });

  it('pregunta sin resultados → respuesta honesta: null y recovered 0 (R15)', async () => {
    const res = await ask({ pregunta: 'ornitorrinco xilofono especulativo zzz' });
    expect(res.status).toBe(200);
    expect(res.body.data.dato).toEqual([]);
    expect(res.body.data.dominio).toBeNull();
    expect(res.body.data.interpretacion).toBeNull();
    expect(res.body.data.sugerencia).toBeNull();
    expect(res.body.data.recovered).toBe(0);
    expect(res.body.data.confidence).toBe(0);
  });

  it('una pregunta por subnodos del valle recupera el KPI agregado (source_type kpi)', async () => {
    await recomputeKpisForNode('iglesia');
    await recomputeRagIndexForNode('iglesia');
    const res = await ask({ pregunta: 'cuántos subnodos tiene el valle' });
    expect(res.status).toBe(200);
    const tipos = new Set((res.body.data.dato ?? []).map((f: any) => f.source_type));
    expect(tipos.has('kpi')).toBe(true);
  });

  it('nodo inexistente → 404 honesto (R15)', async () => {
    const res = await postJson('/api/nodos/inexistente-vig006/ask', { pregunta: 'que hay en el valle' });
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('el recompute del índice es idempotente: conteo estable, sin duplicados', async () => {
    await recomputeRagIndexForNode('iglesia');
    const antes = await prisma.rag_index.count({ where: { nodo_key: 'iglesia' } });
    await recomputeRagIndexForNode('iglesia');
    const despues = await prisma.rag_index.count({ where: { nodo_key: 'iglesia' } });
    expect(despues).toBe(antes);
  });

  it('pregunta inválida → 400 (anti-abuso)', async () => {
    const res = await ask({ pregunta: 'ho' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
