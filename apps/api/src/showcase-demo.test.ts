import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// NODO-VIG VIG-007 (NVIG-R9 #193, épica #167): demo final del showcase —
// guion ejecutable de 13 pasos, 4 escenarios y 10 criterios con estado
// REAL (docs/nodes/valle-de-iglesia/VIG-007-DEMO-FINAL.md). Este suite
// recorre el guion de punta a punta contra la superficie federada
// GET /api/showcase y las rutas que cada paso referencia: nada maquetado
// (R15). Los counts del resumen se comparan con el dominio leído por
// Prisma con el MISMO predicado (aserciones dinámicas contra el dominio
// vivo, patrón vig003-kpis — otras suites del job test escriben en el
// mismo nodo). Capital activó su base territorial (NCAP-R2 #154: 2 distritos
// provisionales) y caucete activó la suya (NODO-CAU R6 #145: ciudad + 9
// localidades de referencia Georef); productos 0 en ambos, nunca fabricado
// (R15, decisión DH traza #193). Requiere
// Postgres/PostGIS real; sin base → skip honesto.

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';
process.env.JWT_SECRET = 'test-jwt-secret-vig007-demo-final-showcase-32';

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
  // El paso 9 del guion: el recompute deja iglesia con sus 21 snapshots y
  // su índice RAG — el recorrido lee el estado materializado real.
  await recomputeKpisForNode('iglesia');
  await recomputeRagIndexForNode('iglesia');
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

async function postJson(path: string, payload: any): Promise<{ status: number; body: any }> {
  const res = await fetch(base + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return { status: res.status, body: await res.json() };
}

async function porKey(path: string): Promise<Map<string, any>> {
  const map = new Map<string, any>();
  const res = await getJson(path);
  for (const row of res.body.data ?? []) map.set(row.kpi_key, row);
  return map;
}

describe.skipIf(!dbUp)('Demo final del showcase VIG-007 (#193, épica #167)', () => {
  it('pasos 1-3: recorrido federado en orden del guion con 3 nodos y guion referenciado', async () => {
    const res = await getJson('/api/showcase');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(3);
    expect(res.body.data.recorrido).toEqual(['caucete', 'capital', 'iglesia']);
    expect(res.body.data.nodos.map((n: any) => n.key)).toEqual(['caucete', 'capital', 'iglesia']);
    expect(res.body.data.guion).toEqual({
      doc: 'docs/nodes/valle-de-iglesia/VIG-007-DEMO-FINAL.md',
      pasos: 13,
    });
  });

  it('paso 3: resumen de iglesia consistente con el dominio (mismo predicado, ADR-036)', async () => {
    const res = await getJson('/api/showcase');
    const iglesia: any = res.body.data.nodos.find((n: any) => n.key === 'iglesia');
    expect(iglesia).toBeDefined();

    // Mismo predicado que la ruta: aprobados no restricted cuentan como
    // activos; las fichas cuentan sobre TODOS los aprobados (registro
    // público, decisión DH VIG-004).
    const aprobados: any[] = await prisma.activos.findMany({
      where: { nodo_key: 'iglesia', estado: 'aprobado' },
      select: { id: true, visibilidad: true },
    });
    const idsTodos = aprobados.map((a: any) => a.id);
    const idsNoRestricted = aprobados.filter((a: any) => a.visibilidad !== 'restricted').map((a: any) => a.id);
    const fichas = await prisma.activos_patrimonio.count({ where: { activo_id: { in: idsTodos } } });
    const operativas = await prisma.activos_operativa.count({ where: { activo_id: { in: idsNoRestricted } } });
    const productos = await prisma.productos.count({
      where: { estado: 'aprobado', activo_id: { in: idsNoRestricted } },
    });
    const subnodos = await prisma.subnodos.count({ where: { nodo_key: 'iglesia' } });

    expect(iglesia.subnodos).toBe(subnodos);
    expect(iglesia.subnodos).toBeGreaterThanOrEqual(52); // semilla VIG-001
    expect(iglesia.kpis).toBe(26); // + 5 KPIs del observatorio (LIC-R1 #457 + LIC-R2 #453) // set honesto v1 (VIG-003) + v2 (VIG-013) + v2 mercado (MK-3a) tras el recompute
    expect(iglesia.kpis).toBe(iglesia.kpis_detalle.length);
    expect(iglesia.activos_aprobados).toBe(idsNoRestricted.length);
    expect(iglesia.activos_aprobados).toBeGreaterThanOrEqual(6);
    expect(iglesia.fichas_patrimoniales).toBe(fichas);
    expect(iglesia.fichas_patrimoniales).toBeGreaterThanOrEqual(3);
    expect(iglesia.operativas).toBe(operativas);
    expect(iglesia.operativas).toBeGreaterThanOrEqual(3);
    expect(iglesia.productos_aprobados).toBe(productos);
    expect(iglesia.rag_fragmentos).toBeGreaterThanOrEqual(1); // índice VIG-006
  });

  it('pasos 1-2: capital con su base territorial NCAP-R2 y caucete honesto — nada fabricado (R15)', async () => {
    const res = await getJson('/api/showcase');
    const capital: any = res.body.data.nodos.find((n: any) => n.key === 'capital');
    const caucete: any = res.body.data.nodos.find((n: any) => n.key === 'caucete');
    expect(capital).toBeDefined();
    expect(caucete).toBeDefined();
    // capital activó su base territorial (NCAP-R2 #154, épica #152): 2
    // distritos provisionales — count comparado con el dominio vivo con el
    // MISMO predicado, nunca hardcodeado sin fuente.
    const subnodosCapital = await prisma.subnodos.count({ where: { nodo_key: 'capital' } });
    expect(capital.subnodos).toBe(subnodosCapital);
    expect(capital.subnodos).toBe(2);
    expect(capital.productos_aprobados).toBe(0);
    expect(capital.kpis).toBe(0); // sin snapshots aún → 0 honesto
    expect(capital.kpis).toBe(capital.kpis_detalle.length); // consistente siempre
    expect(capital.rag_fragmentos).toBe(0); // sin prosa indexada del nodo
    // caucete activó su base territorial (NODO-CAU R6, #145, épica #137):
    // 10 subnodos (ciudad + 9 localidades Georef) — count comparado con el
    // dominio vivo con el MISMO predicado (patrón vig003-kpis); snapshots y
    // productos siguen en 0 honesto (R15).
    const subnodosCaucete = await prisma.subnodos.count({ where: { nodo_key: 'caucete' } });
    expect(caucete.subnodos).toBe(subnodosCaucete);
    expect(caucete.subnodos).toBe(10);
    expect(caucete.productos_aprobados).toBe(0);
    expect(caucete.kpis).toBe(caucete.kpis_detalle.length);
    expect(caucete.rag_fragmentos).toBe(0);
  });

  it('pasos 5-6: escenario productivo — N1 sin restricted y operativa del dique honesta', async () => {
    const listado = await getJson('/api/activos?nodo=iglesia&n1=productivo_rural');
    expect(listado.status).toBe(200);
    expect(listado.body.count).toBeGreaterThanOrEqual(2); // semilla VIG-002
    for (const a of listado.body.data ?? []) {
      expect(a.nodo_key).toBe('iglesia');
      expect(a.visibilidad).not.toBe('restricted'); // ADR-036
    }

    const dique: any = await prisma.activos.findUnique({ where: { hash: 'seed-activo-dique-cuesta-del-viento' } });
    expect(dique, 'falta el activo del dique Cuesta del Viento').toBeDefined();
    const op = await getJson('/api/operativa/' + dique.id);
    expect(op.status).toBe(200);
    expect(op.body.data.nodo_key).toBe('iglesia');
    expect(op.body.data.horario).toContain('Ley 826-G');
    expect(op.body.data.temporada_meses).toEqual([3, 4, 9, 10]);
    expect(op.body.data.capacity_status).toBe('unknown'); // R15: sin aforos verificados
    expect(op.body.data.capacidad_plazas).toBeNull();
  });

  it('paso 7: escenario patrimonial — ficha de Angualasto con declaratoria y sin sensible (VIG-004)', async () => {
    const fichas = await prisma.activos_patrimonio.findMany({
      where: { proteccion_norma: { contains: '2.154' } },
      select: { activo_id: true },
    });
    expect(fichas.length).toBeGreaterThanOrEqual(1);
    const res = await getJson('/api/patrimonio/' + fichas[0].activo_id);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.nodo_key).toBe('iglesia');
    expect(res.body.data.proteccion_norma).toContain('2.154/2009');
    expect(res.body.data.sensible_status).toBe('sin_relevamiento'); // R15
    const keys = Object.keys(res.body.data);
    expect(keys).not.toContain('sensible'); // ADR-036: jamás en lectura pública
    expect(keys).not.toContain('sensible_nota');
  });

  it('pasos 9-10: escenario gestión — 9 KPIs honestos con subnodos_total y cobertura null', async () => {
    const showcase = await getJson('/api/showcase');
    const iglesia: any = showcase.body.data.nodos.find((n: any) => n.key === 'iglesia');
    const kpis = await porKey('/api/nodos/iglesia/kpis');
    expect(kpis.size).toBe(26); // + 5 KPIs del observatorio (LIC-R1 #457 + LIC-R2 #453) // set v1 (VIG-003) + v2 (VIG-013) + v2 mercado (MK-3a)
    expect(kpis.get('subnodos_total')?.valor).toBe(iglesia.subnodos);
    expect(kpis.get('subnodos_total')?.valor).toBeGreaterThanOrEqual(52);
    expect(kpis.get('cobertura_geometrica')?.valor).toBeNull(); // R15 honesto
  });

  it('pasos 11-12: escenario RAG — ask sobre Angualasto con dato, fuentes y human_review pending (VIG-006)', async () => {
    const res = await postJson('/api/nodos/iglesia/ask', { pregunta: 'yacimiento Angualasto' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.nodo_key).toBe('iglesia');
    expect(res.body.data.recovered).toBeGreaterThanOrEqual(1);
    const textos = (res.body.data.dato ?? []).map((f: any) => String(f.texto ?? '')).join(' ');
    expect(textos.toLowerCase()).toContain('angualasto');
    expect(res.body.data.human_review).toBe('pending'); // revisión humana habilitada
    expect(Array.isArray(res.body.data.fuentes)).toBe(true);
    expect('sensible' in res.body.data).toBe(false); // sin clave custodial
  });

  it('paso 13: trazabilidad — las superficies del guion dejaron sellos en events_raw (R4)', async () => {
    const total = await prisma.events_raw.count();
    expect(total).toBeGreaterThan(0);
    // Sellos de las ingestas curadas que el recorrido muestra (idempotentes).
    const sellosPatrimonio = await prisma.events_raw.count({ where: { type: 'patrimonio.ingestado' } });
    expect(sellosPatrimonio).toBeGreaterThanOrEqual(3);
    const sellosOperativa = await prisma.events_raw.count({ where: { type: 'operativa.ingestado' } });
    expect(sellosOperativa).toBeGreaterThanOrEqual(3);
  });
});

