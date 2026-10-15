import { execSync } from 'node:child_process';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ReporteHistorialSchema } from '@delocalsoy/contracts';

// R4 (CORE-005, #206 — ADR-038): historial público del reporte y
// suscripción del reportero de extremo a extremo contra servicios reales
// (PostgreSQL/PostGIS + Redis):
// - GET /api/reportes/:id/historial: público anónimo; DERIVADO de los
//   sellos reporte.estado_cambiado de events_raw (única fuente de verdad,
//   ADR-032 — nunca una tabla mutable); 1:1 con los sellos, en orden;
//   'descartado' nunca publicable → 404 (su historial es del reportero)
// - GET /api/reportes/mios: autenticado; los del ciudadano por pseudónimo
//   (created_by_hash), con estado y justificaciones de cada transición —
//   el reportero ve el ciclo completo, incluido el descartado
// Requiere Postgres/PostGIS real (job test de CI); sin base el suite se
// salta (honesto, R5). El alta del reporte exige el vocabulario real del
// nodo → db:seed en beforeAll.
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';
process.env.JWT_SECRET = 'test-jwt-secret-core005-r4-con-mas-de-32-chars';

const { createApp } = await import('./app.js');
const prisma = (await import('./lib/prisma.js')).default;

const dbUp = await prisma
  .$queryRaw`SELECT 1`
  .then(() => true)
  .catch(() => false);

let server: any;
let base = '';

beforeAll(async () => {
  // Vocabulario real del nodo (nodos/categorias del seed CORE-003): la
  // categoría del reporte se valida contra el catálogo, no contra un enum.
  if (dbUp) {
    execSync('pnpm --filter @delocalsoy/db db:seed', { stdio: 'ignore', timeout: 60000 });
  }
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

describe.skipIf(!dbUp)('historial y suscripción del reportero (CORE-005 R4 — ADR-038, #206)', () => {
  const ts = Date.now();
  const jsonHeaders = { 'content-type': 'application/json' };
  // San Juan capital (~ centro cívico): punto del reporte.
  const punto = { lat: -31.5375, lng: -68.5364 };
  const PASSWORD = 'contrasena-muy-secreta-8+chars';

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

  async function crearReporte(token: string, descripcion: string): Promise<string> {
    const res = await fetch(base + '/api/reportes', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify({
        nodo_key: 'capital',
        categoria: 'insufficient_lighting',
        descripcion,
        ...punto,
      }),
    });
    expect(res.status, 'alta del reporte').toBe(201);
    return ((await res.json()) as any).data.id as string;
  }

  // Promoción de sistema (moderador) + login nuevo → token con rol (ADR-031).
  async function tokenModerador(email: string): Promise<string> {
    await prisma.usuarios.update({ where: { email }, data: { rol: 'moderador' } });
    const login = await fetch(base + '/api/auth/login', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ email, password: PASSWORD }),
    });
    expect(login.status, 'login moderador').toBe(200);
    return ((await login.json()) as any).data.token as string;
  }

  async function transitar(token: string, id: string, estado: string, justificacion: string) {
    return fetch(base + '/api/reportes/' + id + '/estado', {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify({ estado, justificacion }),
    });
  }

  it('GET /mios sin sesión → 401 (la suscripción del reportero exige identidad)', async () => {
    const res = await fetch(base + '/api/reportes/mios');
    expect(res.status).toBe(401);
    await res.arrayBuffer();
  });

  it('historial público 1:1 con los sellos: la transición justificada queda expuesta con su moderador pseudonimizado', async () => {
    const email = 'c005r4-' + ts + '-a@example.test';
    const tokenCiudadano = await registrarYLoguear(email);
    const id = await crearReporte(tokenCiudadano, 'Semañor con los tiempos rotos en la avenida; congestiona la mañana.');
    const token = await tokenModerador(email);

    const just = 'se corroboró con el relevamiento de la cuadra: los tiempos están desfasados';
    const res = await transitar(token, id, 'evaluating', just);
    expect(res.status).toBe(200);
    await res.arrayBuffer();

    // Lectura pública anónima del historial derivado de events_raw.
    const hist = await fetch(base + '/api/reportes/' + id + '/historial');
    expect(hist.status).toBe(200);
    const body: any = await hist.json();
    expect(ReporteHistorialSchema.safeParse(body.data).success).toBe(true);

    // 1:1 con los sellos: exactamente la transición sellada, con su
    // justificación y el moderador pseudonimizado — nada más, nada menos.
    const sellos = await prisma.events_raw.findMany({
      where: { type: 'reporte.estado_cambiado', payload: { path: ['reporte_id'], equals: id } },
      orderBy: { occurred_at: 'asc' },
    });
    expect(body.data.transiciones.length).toBe(sellos.length);
    expect(body.data.transiciones.length).toBe(1);
    expect(body.data.reporte_id).toBe(id);
    const t = body.data.transiciones[0];
    expect(t.estado_anterior).toBe('received');
    expect(t.estado_nuevo).toBe('evaluating');
    expect(t.justificacion).toBe(just);
    expect(t.moderador_hash).toMatch(/^[0-9a-f]{32}$/);
    expect(t.occurred_at).toBe(sellos[0].occurred_at.toISOString());
    expect(JSON.stringify(body)).not.toContain('@');
    expect(JSON.stringify(body)).not.toContain('example.test');
  });

  it('historial del ciclo completo en orden: received → evaluating → in_progress → resolved (3 sellos, 3 entradas)', async () => {
    const email = 'c005r4-' + ts + '-b@example.test';
    await registrarYLoguear(email);
    const token = await tokenModerador(email);
    const id = await crearReporte(token, 'Bache profundo en la calzada de la rotonda; riesgo para motos.');

    const pasos: Array<[string, string]> = [
      ['evaluating', 'inspección programada: el bache coincide con el registro de reclamos'],
      ['in_progress', 'la cuadrilla de asfalto ya está en el sitio con el material'],
      ['resolved', 'reparación verificada: calzada nivelada y señalización retirada'],
    ];
    for (const [estado, justificacion] of pasos) {
      const res = await transitar(token, id, estado, justificacion);
      expect(res.status).toBe(200);
      await res.arrayBuffer();
    }

    const hist = await fetch(base + '/api/reportes/' + id + '/historial');
    expect(hist.status).toBe(200);
    const body: any = await hist.json();
    expect(body.data.transiciones.length).toBe(3);
    expect(body.data.transiciones.map((t: any) => t.estado_nuevo)).toEqual(['evaluating', 'in_progress', 'resolved']);
    // La cadena queda acreditada 1:1 contra la fuente de verdad.
    const sellos = await prisma.events_raw.findMany({
      where: { type: 'reporte.estado_cambiado', payload: { path: ['reporte_id'], equals: id } },
      orderBy: { occurred_at: 'asc' },
    });
    expect(sellos.length).toBe(3);
  });

  it('reporte sin transiciones → historial público con transiciones vacías (honesto, R15) y 404 para el inexistente', async () => {
    const token = await registrarYLoguear('c005r4-' + ts + '-c@example.test');
    const id = await crearReporte(token, 'Falta señal de preferencia peatonal frente al colegio en hora de salida.');

    const hist = await fetch(base + '/api/reportes/' + id + '/historial');
    expect(hist.status).toBe(200);
    const body: any = await hist.json();
    expect(body.data.transiciones).toEqual([]);
    expect(body.data.reporte_id).toBe(id);

    const inexistente = await fetch(base + '/api/reportes/id-inexistente-c005r4/historial');
    expect(inexistente.status).toBe(404);
    await inexistente.arrayBuffer();
  });

  it('descartado nunca publicable: historial público 404, pero el reportero ve el ciclo completo con su justificación en /mios', async () => {
    const email = 'c005r4-' + ts + '-d@example.test';
    const tokenCiudadano = await registrarYLoguear(email);
    const id = await crearReporte(tokenCiudadano, 'Cartel de calle tapado por ramas; no se lee el nombre de la vía.');
    const token = await tokenModerador(email);

    const motivo = 'descartado tras verificación: el cartel corresponde a una vía privada sin apertura al público';
    const res = await transitar(token, id, 'descartado', motivo);
    expect(res.status).toBe(200);
    await res.arrayBuffer();

    // 'descartado' no es publicable: el historial público no lo expone.
    const hist = await fetch(base + '/api/reportes/' + id + '/historial');
    expect(hist.status).toBe(404);
    await hist.arrayBuffer();

    // La suscripción del reportero: el ciclo completo con la justificación
    // pública de la moderación (ADR-038 — el POR QUÉ es del reportero).
    const mios = await fetch(base + '/api/reportes/mios', {
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenCiudadano },
    });
    expect(mios.status).toBe(200);
    const body: any = await mios.json();
    expect(body.count).toBe(1);
    expect(body.data[0].id).toBe(id);
    expect(body.data[0].estado).toBe('descartado');
    expect(body.data[0].transiciones.length).toBe(1);
    expect(body.data[0].transiciones[0].justificacion).toBe(motivo);
    expect(body.data[0].transiciones[0].estado_nuevo).toBe('descartado');
    // Sin PII: el pseudónimo es lo único que identifica al autor.
    const texto = JSON.stringify(body);
    expect(texto).not.toContain('@');
    expect(texto).not.toContain('example.test');
  });

  it('/mios aislado por pseudónimo: cada ciudadano ve solo sus reportes, con estados y justificaciones', async () => {
    const emailA = 'c005r4-' + ts + '-e@example.test';
    const tokenA = await registrarYLoguear(emailA);
    const emailB = 'c005r4-' + ts + '-f@example.test';
    const tokenB = await registrarYLoguear(emailB);

    const idA1 = await crearReporte(tokenA, 'Luminaria del paseo peatonal encendida de día: gasto innecesario.');
    const idA2 = await crearReporte(tokenA, 'Papelera volcada en la plaza: residuos esparcidos por el viento.');
    await crearReporte(tokenB, 'Cordón destruido frente al paradero; dificulta el ascenso con silla de ruedas.');

    // Moderación sobre un reporte de A (con moderador distinto del autor).
    const tokenMod = await tokenModerador(emailB);
    const res = await transitar(tokenMod, idA1, 'evaluating', 'el reclamo coincide con el plan de mantenimiento del paseo');
    expect(res.status).toBe(200);
    await res.arrayBuffer();

    const miosA = await fetch(base + '/api/reportes/mios', {
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenA },
    });
    const bodyA: any = await miosA.json();
    expect(bodyA.count).toBe(2);
    expect(bodyA.data.some((r: any) => r.id === idA1)).toBe(true);
    expect(bodyA.data.some((r: any) => r.id === idA2)).toBe(true);
    const conHistorial = bodyA.data.find((r: any) => r.id === idA1);
    expect(conHistorial.estado).toBe('evaluating');
    expect(conHistorial.transiciones.length).toBe(1);
    expect(conHistorial.transiciones[0].justificacion).toBe('el reclamo coincide con el plan de mantenimiento del paseo');

    const miosB = await fetch(base + '/api/reportes/mios', {
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenB },
    });
    const bodyB: any = await miosB.json();
    expect(bodyB.count).toBe(1);
    expect(bodyB.data[0].id).not.toBe(idA1);
    expect(bodyB.data[0].estado).toBe('received');
    expect(bodyB.data[0].transiciones).toEqual([]);

    // La respuesta no expone el pseudónimo de otros ciudadanos ni PII.
    expect(JSON.stringify(bodyA)).not.toContain('example.test');
  });
});
