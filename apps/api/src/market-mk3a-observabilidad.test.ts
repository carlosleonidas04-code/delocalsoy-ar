import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// MARKET-CAP MK-3a (#426, épica #422 — plan v2 slice «observabilidad pura»
// ratificado por la DH 2026-11-07; D1–D4 del diseño
// docs/nodes/capital/MARKET-CAP-DISENO-MK3.md ratificadas 2026-10-30):
// 6 KPIs nuevos del mercado (D2), fragmentos RAG source_type 'comercio'
// (D3, F-9) y corrección H8 del disparo (producto.estado_cambiado ahora
// declara nodo_key → la aprobación de un producto dispara el recompute del
// nodo). Cero migración, cero superficie nueva: kpi_key y source_type son
// String y el upsert re-deriva (H1/H5 del diseño); el worker NO se toca
// (H3: su gate es payload.nodo_key — acreditado en apps/worker). Este
// suite ejerce dominio → recompute → API con aserciones consistentes con el
// dominio vivo (patrón vig003-kpis.test.ts: otras suites del job test
// escriben en el mismo nodo). Requiere Postgres/PostGIS real; sin base →
// skip honesto (R5).

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';
process.env.JWT_SECRET = 'test-jwt-secret-marketcap-mk3a-observabilidad-32';
// AUD-05 (#101): register+login del mismo email — knob relajado, patrón
// comercios-rutas.test.ts; se restaura en afterAll.
const RATE_LIMIT_MAX_PREV = process.env.RATE_LIMIT_MAX;
process.env.RATE_LIMIT_MAX = '500';

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
  if (RATE_LIMIT_MAX_PREV === undefined) delete process.env.RATE_LIMIT_MAX;
  else process.env.RATE_LIMIT_MAX = RATE_LIMIT_MAX_PREV;
  // Cleanup: el cascade del activo retira ficha y producto (los sellos de
  // events_raw son append-only y quedan como historia, ADR-032).
  await prisma.activos
    .deleteMany({ where: { hash: { startsWith: 'test-mk3a-' } } })
    .catch(() => undefined);
  await new Promise((resolve, reject) => {
    server.close((err: any) => {
      if (err) reject(err);
      else resolve(null);
    });
    if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
  });
});

type SnapshotRow = { kpi_key: string; valor: number | null; detalles: Record<string, number> };

async function kpisDe(nodo: string): Promise<Map<string, SnapshotRow>> {
  const snapshots = (await recomputeKpisForNode(nodo)) as unknown as SnapshotRow[];
  expect(snapshots.length).toBe(21); // 15 vivos + 6 del mercado (MK-3a D2)
  const map = new Map<string, SnapshotRow>();
  for (const s of snapshots) map.set(s.kpi_key, s);
  return map;
}

// Siembra directa del dominio mercado (patrón vig003/ask-rag): activo
// comercio + ficha 1:1 (Opción A MK-1). El alta ciudadana vía API ya tiene
// su propia suite (comercios-rutas.test.ts); este suite prueba
// observabilidad, no el alta.
async function sembrarComercio(op: {
  sufijo: string;
  rubro: string;
  estado: string;
  visibilidad: string;
  habilitacion: Record<string, unknown>;
  titularidad?: Record<string, unknown>;
  atributos?: Record<string, unknown>;
  descripcion?: string;
}): Promise<string> {
  const ts = Date.now();
  const activo = await prisma.activos.create({
    data: {
      tipo: 'local',
      titulo: 'Comercio test MK-3a ' + op.sufijo + ' ' + ts,
      descripcion: op.descripcion,
      estado: op.estado,
      nodo_key: 'iglesia',
      visibilidad: op.visibilidad,
      procedencia: { source_id: 'test-mk3a', fuente: 'test MK-3a', fecha: '2026' },
      created_by_hash: 'test-mk3a-' + ts + '-' + op.sufijo,
      hash: 'test-mk3a-' + ts + '-' + op.sufijo,
    },
  });
  await prisma.comercio_ficha.create({
    data: {
      activo_id: activo.id,
      rubro_id: op.rubro,
      atributos: op.atributos ?? { venta_directa: false, delivery: false, pagos: [], accesibilidad: 'unknown' },
      habilitacion: op.habilitacion,
      titularidad: op.titularidad ?? { estado: 'sin_reclamo' },
    },
  });
  return activo.id;
}

// Esperado dinámico con el MISMO predicado del recompute (patrón vig003):
// lo que el KPI dice debe ser exactamente lo que el dominio es AHORA.
async function esperadoMercado(nodo: string) {
  const fichas: any[] = await prisma.comercio_ficha.findMany({
    where: { activo: { nodo_key: nodo, visibilidad: { not: 'restricted' } } },
    include: { activo: { select: { estado: true, subnodo_key: true } } },
  });
  const porEstado: Record<string, number> = {};
  const porRubro: Record<string, number> = {};
  const porSubnodo: Record<string, number> = {};
  let habVerificadas = 0;
  let titVerificadas = 0;
  for (const f of fichas) {
    porEstado[f.activo.estado] = (porEstado[f.activo.estado] ?? 0) + 1;
    const rubro = f.rubro_id && f.rubro_id.length > 0 ? f.rubro_id : 'unknown';
    porRubro[rubro] = (porRubro[rubro] ?? 0) + 1;
    const subnodo = f.activo.subnodo_key ?? '_sin_subnodo';
    porSubnodo[subnodo] = (porSubnodo[subnodo] ?? 0) + 1;
    if ((f.habilitacion ?? {}).estado === 'verificada') habVerificadas += 1;
    if ((f.titularidad ?? {}).estado === 'verificada') titVerificadas += 1;
  }
  const total = fichas.length;
  const ids = fichas.map((f) => f.activo_id);
  const ofertas = ids.length
    ? await prisma.productos.count({ where: { estado: 'aprobado', activo_id: { in: ids } } })
    : 0;
  return {
    porEstado, porRubro, porSubnodo, total, habVerificadas, titVerificadas, ofertas,
    habPct: total === 0 ? null : Math.round((habVerificadas / total) * 100),
    titPct: total === 0 ? null : Math.round((titVerificadas / total) * 100),
  };
}

describe.skipIf(!dbUp)('MARKET-CAP MK-3a (#426, épica #422) — observabilidad del mercado', () => {
  const ts = Date.now();
  const jsonHeaders = { 'content-type': 'application/json' };
  const PASSWORD = 'contrasena-muy-secreta-8+chars';

  async function registrarYLoguear(email: string): Promise<string> {
    const reg = await fetch(base + '/api/auth/register', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ email, password: PASSWORD }),
    });
    if (reg.status !== 409) {
      expect(reg.status, 'register ' + email).toBe(201);
    }
    const login = await fetch(base + '/api/auth/login', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ email, password: PASSWORD }),
    });
    expect(login.status, 'login ' + email).toBe(200);
    return ((await login.json()) as any).data.token as string;
  }

  it('1. KPIs del mercado (D2): 6 claves nuevas consistentes con el dominio vivo; restricted excluido (ADR-036); pct null honesto (R15)', async () => {
    // 2 comercios aprobados públicos (uno con habilitación verificada
    // completa ADR-035 y titularidad verificada) + 1 aprobado restricted
    // (jamás cuenta, ADR-036).
    await sembrarComercio({
      sufijo: 'kpi-a',
      rubro: 'food_drink',
      estado: 'aprobado',
      visibilidad: 'public',
      habilitacion: {
        estado: 'verificada',
        tipo: 'municipal',
        numero: 'HAB-MK3A-' + ts,
        fuente_key: 'municipio',
        url: 'https://example.test/hab-mk3a-' + ts,
        fecha_verificacion: '2026-11-07',
      },
      titularidad: { estado: 'verificada' },
      atributos: { venta_directa: true, delivery: false, pagos: ['qr', 'efectivo'], accesibilidad: 'declarada' },
    });
    await sembrarComercio({
      sufijo: 'kpi-b',
      rubro: 'retail',
      estado: 'aprobado',
      visibilidad: 'public',
      habilitacion: { estado: 'sin_dato' },
    });
    const idRestricted = await sembrarComercio({
      sufijo: 'kpi-r',
      rubro: 'food_drink',
      estado: 'aprobado',
      visibilidad: 'restricted',
      habilitacion: {
        estado: 'verificada',
        tipo: 'municipal',
        numero: 'HAB-MK3A-R-' + ts,
        fuente_key: 'municipio',
        url: 'https://example.test/hab-mk3a-r-' + ts,
        fecha_verificacion: '2026-11-07',
      },
    });

    const esperado = await esperadoMercado('iglesia');
    expect(esperado.habVerificadas).toBeGreaterThanOrEqual(1); // la verificada de este test entró
    expect(esperado.total).toBeGreaterThanOrEqual(2); // los públicos de este test

    const map = await kpisDe('iglesia');
    expect(map.get('comercios_por_estado')?.valor).toBe(esperado.total);
    expect(map.get('comercios_por_estado')?.detalles).toEqual(esperado.porEstado);
    expect(map.get('comercios_por_rubro')?.valor).toBe(esperado.total);
    expect(map.get('comercios_por_rubro')?.detalles).toEqual(esperado.porRubro);
    expect(map.get('comercios_por_subnodo')?.valor).toBe(esperado.total);
    expect(map.get('comercios_por_subnodo')?.detalles).toEqual(esperado.porSubnodo);
    expect((map.get('comercios_por_subnodo')?.detalles ?? {})['_sin_subnodo'] ?? 0).toBeGreaterThanOrEqual(2);

    const hab = map.get('comercios_habilitacion_verificada_pct');
    expect(hab?.valor).toBe(esperado.habPct);
    expect(hab?.detalles).toEqual({ verificadas: esperado.habVerificadas, total: esperado.total });
    const tit = map.get('titularidad_verificada_pct');
    expect(tit?.valor).toBe(esperado.titPct);
    expect(tit?.detalles).toEqual({ verificadas: esperado.titVerificadas, total: esperado.total });
    expect(map.get('ofertas_activas')?.valor).toBe(esperado.ofertas);

    // El restricted jamás entró al cálculo (ADR-036). Limpieza parcial.
    await prisma.activos.deleteMany({ where: { id: idRestricted } });
  });

  it('2. RAG del mercado (D3, F-9): fragmento comercio con prosa pública y trazabilidad; JAMÁS PII (Ley 25.326); restricted retira el fragmento (H6)', async () => {
    const id = await sembrarComercio({
      sufijo: 'rag-a',
      rubro: 'food_drink',
      estado: 'aprobado',
      visibilidad: 'public',
      descripcion: 'Almacen de barrio de prueba del Mercado de Proximidad.',
      habilitacion: {
        estado: 'verificada',
        tipo: 'municipal',
        numero: 'HAB-MK3A-RAG-' + ts,
        fuente_key: 'municipio',
        url: 'https://example.test/hab-mk3a-rag-' + ts,
        fecha_verificacion: '2026-11-07',
      },
      atributos: { venta_directa: true, delivery: true, pagos: ['qr'], accesibilidad: 'declarada' },
    });

    await recomputeRagIndexForNode('iglesia');
    const frag = await prisma.rag_index.findUnique({
      where: { nodo_key_source_type_source_id: { nodo_key: 'iglesia', source_type: 'comercio', source_id: id } },
    });
    expect(frag, 'falta el fragmento comercio').not.toBeNull();
    const texto = String(frag?.texto ?? '');
    expect(texto).toContain('Comercio test MK-3a rag-a');
    expect(texto).toContain('rubro food_drink');
    expect(texto).toContain('Habilitación: verificada');
    expect(texto).toContain('venta directa sí');
    expect(texto).toContain('delivery sí');
    expect(texto).toContain('pagos qr');
    expect(texto).toContain('accesibilidad declarada');
    expect(texto).toContain('Almacen de barrio');
    const fuentes = JSON.stringify(frag?.fuentes ?? []);
    expect(fuentes).toContain('Mercado de Proximidad — comercio_ficha (MK-1/MK-2)');
    expect(fuentes).toContain('municipio'); // trazabilidad SIIC (ADR-035)
    // Tokens prohibidos JAMÁS en el fragmento (Ley 25.326, DH MK-2 §7.2):
    const entero = JSON.stringify(frag);
    expect(entero).not.toContain('identificador_hash');
    expect(entero).not.toContain('reclamado_por_hash');
    expect(entero).not.toContain('@');
    expect(entero).not.toContain('54 264');

    // H6: el comercio pasa a restricted → el fragmento se retira (delete
    // lógico del recompute, ADR-036 — lo no visible no se indexa).
    await prisma.activos.update({ where: { id }, data: { visibilidad: 'restricted' } });
    await recomputeRagIndexForNode('iglesia');
    const retirado = await prisma.rag_index.findUnique({
      where: { nodo_key_source_type_source_id: { nodo_key: 'iglesia', source_type: 'comercio', source_id: id } },
    });
    expect(retirado).toBeNull();
    await prisma.activos.deleteMany({ where: { id } });
  });

  it('3. H8: producto.estado_cambiado declara nodo_key → la aprobación dispara el recompute del nodo y ofertas_activas la refleja', async () => {
    const id = await sembrarComercio({
      sufijo: 'h8-a',
      rubro: 'food_drink',
      estado: 'aprobado',
      visibilidad: 'public',
      habilitacion: { estado: 'sin_dato' },
    });
    const producto = await prisma.productos.create({
      data: {
        activo_id: id,
        slug: 'oferta-mk3a-' + ts,
        nombre: 'Oferta de prueba MK-3a',
        temporada_meses: [],
        estado: 'propuesto',
        created_by_hash: 'test-mk3a-' + ts + '-h8',
      },
    });

    const antes = await esperadoMercado('iglesia');

    // Moderación por la ruta real (VIG-005) — el sello que emite es el disparo.
    const email = 'mk3a-' + ts + '-mod@example.test';
    await registrarYLoguear(email);
    await prisma.usuarios.update({ where: { email }, data: { rol: 'moderador' } });
    const tokenModerador = await registrarYLoguear(email);
    const patch = await fetch(base + '/api/productos/' + producto.id + '/estado', {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenModerador },
      body: JSON.stringify({ estado: 'aprobado', motivo: 'aprobacion de prueba del test MK-3a H8' }),
    });
    expect(patch.status).toBe(200);
    await patch.arrayBuffer();

    // H8: el sello declara el territorio — sin nodo_key el consumer
    // vig003-kpi descarta la entrada (gate acreditado en apps/worker).
    const sello: any = await prisma.events_raw.findFirst({
      where: { type: 'producto.estado_cambiado', payload: { path: ['producto_id'], equals: producto.id } },
    });
    expect(sello, 'falta el sello producto.estado_cambiado').not.toBeNull();
    expect(sello.payload.nodo_key).toBe('iglesia');
    expect('subnodo_key' in sello.payload).toBe(true);
    const textoSello = JSON.stringify(sello);
    expect(textoSello).not.toContain(email);
    expect(textoSello).not.toContain('example.test');

    // El recompute (lo que el consumer ejecuta al leer el disparo) refleja
    // la oferta aprobada — el KPI ahora «ve» el mercado de productos.
    const despues = await esperadoMercado('iglesia');
    expect(despues.ofertas).toBeGreaterThanOrEqual(antes.ofertas + 1);
    const map = await kpisDe('iglesia');
    expect(map.get('ofertas_activas')?.valor).toBe(despues.ofertas);

    // Limpieza: el cascade del activo retira ficha y producto.
    await prisma.activos.deleteMany({ where: { id } });
  });
});
