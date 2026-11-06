import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// NODO-VIG-3 VIG-012 (#379, épica #377): pedidos formales del nodo
// Iglesia — libro de reclamos del plan vecinal ante Vialidad Provincial
// (DPV). La tabla pedidos NACE VACÍA (R15): los 15 pedidos de la nota
// formal a DPV son contenido DOCUMENTAL (fuente: documento vecinal
// interno, procedencia declarada, sin firmantes expuestos — ADR-027),
// NO filas precargadas — el tablero arranca en «0 de 15 presentados · 0
// respondidos» con fecha de corte (conteo 0 honesto, patrón NCAP-R5).
// Ciclo E2E: alta admin con fecha REAL (la futura se rechaza: preparar
// la nota ≠ presentarla, R15) + evidencia citando puntos críticos
// corroborados del AMC (VIG-011) → respuesta con estado DERIVADO contra
// el plazo (en_plazo | tardío) → vencido sin respuesta = sin_respuesta
// DERIVADO en lectura, NUNCA sellado (no existe el evento «no
// contestaron», existe la fecha vencida). Sellos pedido.presentado y
// pedido.respondido SIN tema ni nota (patrón VIG-011) y con rollback si
// el sello falla. Requiere Postgres/PostGIS real (job test de CI); sin
// base → skip honesto (patrón vig010/vig011). Requiere el comando REAL
// db:seed (nodos + categorías + capa punto_critico).
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';
process.env.JWT_SECRET = 'test-jwt-secret-vig012-pedidos-formales-32ch';

const { createApp } = await import('./app.js');
const { prisma } = await import('@delocalsoy/db');

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

describe.skipIf(!dbUp)('Pedidos formales — tablero de cobertura del nodo Iglesia (NODO-VIG-3 VIG-012, #379)', () => {
  const ts = Date.now();
  const jsonHeaders = { 'content-type': 'application/json' };
  const PASSWORD = 'contrasena-muy-secreta-8+chars';
  const DIA = 24 * 60 * 60 * 1000;
  const hoy = new Date().toISOString().slice(0, 10);
  const manana = new Date(Date.now() + DIA).toISOString().slice(0, 10);
  const hace10 = new Date(Date.now() - 10 * DIA).toISOString().slice(0, 10);
  const hace40 = new Date(Date.now() - 40 * DIA).toISOString().slice(0, 10);
  const PEDIDO_KEY = 'dpv_test_' + ts;
  const VENCIDO_KEY = 'dpv_vencido_' + ts;
  const EVID_KEY = 'dpv_evid_' + ts;
  // Punto ilustrativo del valle (test), lejos de los puntos de las
  // suites AMC (~5 km de Tudcum) para no contaminar sus clusters.
  const puntoPedido = { lat: -30.1, lng: -69.1 };
  const tokens: Record<string, string> = {};

  async function registrarYLoguear(email: string): Promise<string> {
    const reg = await fetch(base + '/api/auth/register', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ email, password: PASSWORD }),
    });
    expect(reg.status, 'register ' + email).toBe(201);
    const login = await fetch(base + '/api/auth/login', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ email, password: PASSWORD }),
    });
    expect(login.status, 'login ' + email).toBe(200);
    const { token } = ((await login.json()) as any).data;
    return token as string;
  }

  async function post(token: string, path: string, body: unknown): Promise<{ status: number; body: any }> {
    const res = await fetch(base + path, {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify(body),
    });
    return { status: res.status, body: await res.json() };
  }

  it('1. tablero nace VACÍO (R15): «0 de 15 presentados · 0 respondidos», fecha de corte y procedencia declarada — conteo 0 honesto', async () => {
    const res = await fetch(base + '/api/pedidos');
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.presentados).toBe(0);
    expect(body.data.esperados_documento).toBe(15);
    expect(body.data.respondidos).toBe(0);
    expect(body.data.cobertura).toContain('0 de 15 presentados · 0 respondidos');
    expect(body.data.fecha_corte).toBe(hoy);
    expect(body.data.pedidos.length).toBe(0);
    expect(body.data.fuente).toContain('documento vecinal');
  });

  it('2. alta admin con fecha real (201 + sello pedido.presentado sin PII ni tema); ciudadano 403 y moderador 403 (acto institucional)', async () => {
    const emailAdmin = 'vig012-admin-' + ts + '@example.test';
    await registrarYLoguear(emailAdmin);
    await prisma.usuarios.update({ where: { email: emailAdmin }, data: { rol: 'admin' } });
    const loginAdmin = await fetch(base + '/api/auth/login', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ email: emailAdmin, password: PASSWORD }),
    });
    expect(loginAdmin.status).toBe(200);
    tokens.admin = ((await loginAdmin.json()) as any).data.token as string;

    const cuerpo = {
      nodo_key: 'iglesia',
      key: PEDIDO_KEY,
      bloque: 'proyecto_ejecutivo',
      tema: 'Solicitud del proyecto ejecutivo del tramo del valle con badenes y derivadores',
      destinatario: 'DPV',
      fecha_presentacion: hace10,
      plazo_dias: 30,
    };
    const alta = await post(tokens.admin, '/api/pedidos', cuerpo);
    expect(alta.status).toBe(201);
    expect(alta.body.data.estado).toBe('presentado');
    expect(alta.body.data.fecha_presentacion).toBe(hace10);
    expect(alta.body.data.bloque).toBe('proyecto_ejecutivo');

    // Sello sin PII y SIN tema (patrón VIG-011: el texto nunca al evento).
    const sello = await prisma.events_raw.findFirst({
      where: { type: 'pedido.presentado', payload: { path: ['key'], equals: PEDIDO_KEY } },
    });
    expect(sello).not.toBeNull();
    const p: any = sello?.payload;
    expect(p.bloque).toBe('proyecto_ejecutivo');
    expect(p.destinatario).toBe('DPV');
    expect(p.fecha_presentacion).toBe(hace10);
    expect(p.plazo_dias).toBe(30);
    const selloTexto = JSON.stringify(p);
    expect(selloTexto).not.toContain('@');
    expect(selloTexto).not.toContain('example.test');
    expect(selloTexto).not.toContain('proyecto ejecutivo');

    // Presentar un pedido formal es un acto institucional: SOLO admin.
    tokens.ciudadano = await registrarYLoguear('vig012-ciudadano-' + ts + '@example.test');
    const c = await post(tokens.ciudadano, '/api/pedidos', { ...cuerpo, key: 'dpv_ciudadano_' + ts });
    expect(c.status).toBe(403);
    const emailMod = 'vig012-mod-' + ts + '@example.test';
    await registrarYLoguear(emailMod);
    await prisma.usuarios.update({ where: { email: emailMod }, data: { rol: 'moderador' } });
    const loginMod = await fetch(base + '/api/auth/login', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ email: emailMod, password: PASSWORD }),
    });
    tokens.moderador = ((await loginMod.json()) as any).data.token as string;
    const m = await post(tokens.moderador, '/api/pedidos', { ...cuerpo, key: 'dpv_mod_' + ts });
    expect(m.status).toBe(403);
  });

  it('3. idempotencia: re-registro del mismo pedido → 200 sin sello nuevo; key duplicada con otro tema → 409', async () => {
    const cuerpo = {
      nodo_key: 'iglesia',
      key: PEDIDO_KEY,
      bloque: 'proyecto_ejecutivo',
      tema: 'Solicitud del proyecto ejecutivo del tramo del valle con badenes y derivadores',
      destinatario: 'DPV',
      fecha_presentacion: hace10,
      plazo_dias: 30,
    };
    const re = await post(tokens.admin, '/api/pedidos', cuerpo);
    expect(re.status).toBe(200);
    expect(re.body.idempotente).toBe(true);
    expect(re.body.data.key).toBe(PEDIDO_KEY);
    const sellos = await prisma.events_raw.findMany({
      where: { type: 'pedido.presentado', payload: { path: ['key'], equals: PEDIDO_KEY } },
    });
    expect(sellos.length).toBe(1);

    const dup = await post(tokens.admin, '/api/pedidos', {
      ...cuerpo,
      tema: 'Otro tema distinto del mismo bloque para probar la unicidad de la key',
    });
    expect(dup.status).toBe(409);
  });

  it('4. validaciones 400 (R15 + contrato): fecha futura, bloque inválido, plazo fuera de rango, tema con PII, evidencia inexistente', async () => {
    const basePedido = {
      nodo_key: 'iglesia',
      bloque: 'seguimiento_vecinal',
      tema: 'Tema de prueba del caso de validación rechazado del pedido formal',
      destinatario: 'DPV',
      fecha_presentacion: hace10,
      plazo_dias: 30,
    };
    const casos: Array<{ name: string; body: Record<string, unknown> }> = [
      { name: 'fecha futura', body: { ...basePedido, key: 'dpv_futuro_' + ts, fecha_presentacion: manana } },
      { name: 'bloque inválido', body: { ...basePedido, key: 'dpv_bloque_' + ts, bloque: 'bloque_x' } },
      { name: 'plazo fuera de rango', body: { ...basePedido, key: 'dpv_plazo_' + ts, plazo_dias: 0 } },
      {
        name: 'tema con PII',
        body: { ...basePedido, key: 'dpv_pii_' + ts, tema: 'Pedido con contacto juan.perez@example.com para el seguimiento' },
      },
      {
        name: 'evidencia inexistente',
        body: { ...basePedido, key: 'dpv_fantasma_' + ts, evidencia_cluster_keys: ['pc-fantasma-' + ts] },
      },
    ];
    for (const caso of casos) {
      const res = await post(tokens.admin, '/api/pedidos', caso.body);
      expect(res.status, caso.name).toBe(400);
    }
  });

  it('5. evidencia AMC E2E: 2 reportes de 2 vecinos → cluster pc-* → el pedido lo cita y el tablero muestra «2 reportes de 2 vecinos» detrás', async () => {
    tokens.e1 = await registrarYLoguear('vig012-e1-' + ts + '@example.test');
    const cuerpoAmc = {
      nodo_key: 'iglesia',
      categoria: 'road_surface',
      descripcion: 'Peligro del punto de testeo del pedido formal con badén y curva ciega',
      lat: puntoPedido.lat,
      lng: puntoPedido.lng,
      subnodo_key: 'sj_iglesia_tudcum',
      dominio: 'infraestructura_vial',
      canal_ingreso: 'web',
      precision: 'gps',
      riesgo_inmediato: false,
    };
    const r1 = await post(tokens.e1, '/api/reportes', cuerpoAmc);
    expect(r1.status).toBe(201);
    expect(r1.body.cluster).toBeNull();

    tokens.e2 = await registrarYLoguear('vig012-e2-' + ts + '@example.test');
    const r2 = await post(tokens.e2, '/api/reportes', {
      ...cuerpoAmc,
      lat: puntoPedido.lat + 0.0003,
      lng: puntoPedido.lng + 0.0002,
    });
    expect(r2.status).toBe(201);
    expect(r2.body.cluster).not.toBeNull();
    expect(r2.body.cluster.reportes_count).toBe(2);
    expect(r2.body.cluster.reportantes_count).toBe(2);
    const clusterKey = r2.body.cluster.cluster_key as string;

    const alta = await post(tokens.admin, '/api/pedidos', {
      nodo_key: 'iglesia',
      key: EVID_KEY,
      bloque: 'seguridad_derivadores',
      tema: 'Reparación del punto crítico corroborado por los vecinos cerca del ingreso al valle',
      destinatario: 'DPV',
      fecha_presentacion: hace10,
      plazo_dias: 30,
      evidencia_cluster_keys: [clusterKey],
    });
    expect(alta.status).toBe(201);

    const tablero = await fetch(base + '/api/pedidos');
    expect(tablero.status).toBe(200);
    const body: any = await tablero.json();
    const pedido = body.data.pedidos.find((x: any) => x.key === EVID_KEY);
    expect(pedido).toBeDefined();
    expect(pedido.evidencia.length).toBe(1);
    expect(pedido.evidencia[0].cluster_key).toBe(clusterKey);
    expect(pedido.evidencia[0].titulo).toContain('2 reportes de 2 vecinos');
    expect(pedido.evidencia[0].estado).toBe('community_validated');
  });

  it('6. respuesta dentro del plazo → respondido_en_plazo + sello pedido.respondido; reintento 409; fecha futura 400', async () => {
    const resp = await post(tokens.admin, '/api/pedidos/' + PEDIDO_KEY + '/respuesta', {
      fecha_respuesta: hoy,
      nota: 'Respuesta de la DPV con plan de obra coordinado',
    });
    expect(resp.status).toBe(201);
    expect(resp.body.data.estado).toBe('respondido_en_plazo');
    expect(resp.body.data.respondido_en).toBe(hoy);

    const sello = await prisma.events_raw.findFirst({
      where: { type: 'pedido.respondido', payload: { path: ['key'], equals: PEDIDO_KEY } },
    });
    expect(sello).not.toBeNull();
    expect((sello?.payload as any).estado_nuevo).toBe('respondido_en_plazo');
    expect(JSON.stringify(sello?.payload)).not.toContain('@');

    // La respuesta ya está acreditada: reintento → 409.
    const reintento = await post(tokens.admin, '/api/pedidos/' + PEDIDO_KEY + '/respuesta', {
      fecha_respuesta: hoy,
    });
    expect(reintento.status).toBe(409);

    // R15: la respuesta futura se rechaza también en la respuesta.
    const futuro = await post(tokens.admin, '/api/pedidos/' + EVID_KEY + '/respuesta', {
      fecha_respuesta: manana,
    });
    expect(futuro.status).toBe(400);
  });

  it('7. vencido: sin_respuesta DERIVADO en el tablero (nunca sellado) → respuesta tardía → transiciones desde los sellos', async () => {
    const alta = await post(tokens.admin, '/api/pedidos', {
      nodo_key: 'iglesia',
      key: VENCIDO_KEY,
      bloque: 'red_provincial_emergencias',
      tema: 'Pedido vencido de prueba para verificar el estado derivado sin respuesta',
      destinatario: 'DPV',
      fecha_presentacion: hace40,
      plazo_dias: 30,
    });
    expect(alta.status).toBe(201);

    // Presentado hace 40 días con plazo 30: venció — el tablero DERIVA
    // sin_respuesta en lectura; la fila sigue presentado (R15).
    const tablero = await fetch(base + '/api/pedidos');
    const body: any = await tablero.json();
    const pedido = body.data.pedidos.find((x: any) => x.key === VENCIDO_KEY);
    expect(pedido).toBeDefined();
    expect(pedido.estado).toBe('presentado');
    expect(pedido.estado_efectivo).toBe('sin_respuesta');
    expect(body.data.sin_respuesta).toBeGreaterThanOrEqual(1);

    // La respuesta llega igual (tarde): estado DERIVADO respondido_tardio.
    const resp = await post(tokens.admin, '/api/pedidos/' + VENCIDO_KEY + '/respuesta', {
      fecha_respuesta: hoy,
    });
    expect(resp.status).toBe(201);
    expect(resp.body.data.estado).toBe('respondido_tardio');

    // El seguimiento público deriva las transiciones de los sellos.
    const detalle = await fetch(base + '/api/pedidos/' + VENCIDO_KEY);
    expect(detalle.status).toBe(200);
    const d: any = await detalle.json();
    expect(d.data.estado_efectivo).toBe('respondido_tardio');
    expect(d.data.transiciones.length).toBe(2);
    expect(d.data.transiciones[0].estado_nuevo).toBe('presentado');
    expect(d.data.transiciones[1].estado_nuevo).toBe('respondido_tardio');

    // Exactamente 2 sellos por pedido — sin_respuesta NUNCA se sella.
    const sellos = await prisma.events_raw.findMany({
      where: { type: { in: ['pedido.presentado', 'pedido.respondido'] }, payload: { path: ['key'], equals: VENCIDO_KEY } },
    });
    expect(sellos.length).toBe(2);
    const sellosFantasma = await prisma.events_raw.findMany({
      where: { type: 'pedido.sin_respuesta' },
    });
    expect(sellosFantasma.length).toBe(0);
  });
});
