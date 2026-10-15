import { execSync } from 'node:child_process';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// R3 (CORE-005, #206 — ADR-038): moderación transparente de reportes de
// extremo a extremo contra servicios reales (PostgreSQL/PostGIS + Redis):
// - PATCH /api/reportes/:id/estado: moderador|admin transita el ciclo con
//   justificación pública OBLIGATORIA (400 sin justificación, ≥10 chars),
//   sello reporte.estado_cambiado en events_raw con {estado_anterior,
//   estado_nuevo, justificacion, moderador_hash} y rollback si falla
// - matriz REPORTE_TRANSICIONES (ADR-038): 400 salto inválido,
//   409 sin transición (mismo estado), resolved/descartado terminales
// - 401 sin sesión, 403 ciudadano, 404 reporte inexistente, anti-PII sobre
//   la justificación (sin eco del valor)
// Requiere Postgres/PostGIS real (job test de CI); sin base el suite se
// salta (honesto, R5). El alta del reporte (POST /api/reportes, R2) exige el
// vocabulario real del nodo → db:seed en beforeAll.
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';
process.env.JWT_SECRET = 'test-jwt-secret-core005-r3-con-mas-de-32-chars';

const { createApp } = await import('./app.js');
const prisma = (await import('./lib/prisma.js')).default;

const dbUp = await prisma
  .$queryRaw`SELECT 1`
  .then(() => true)
  .catch(() => false);

let server: any;
let base = '';

beforeAll(async () => {
  // Vocabulario real del nodo (nodos/categorias del seed CORE-003): el
  // reporte de la prueba nace por POST /api/reportes (R2), que valida la
  // categoría contra el catálogo.
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

describe.skipIf(!dbUp)('moderación de reportes (CORE-005 R3 — transparencia del ciclo de vida, #206)', () => {
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

  async function crearReporte(token: string): Promise<string> {
    const res = await fetch(base + '/api/reportes', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify({
        nodo_key: 'capital',
        categoria: 'insufficient_lighting',
        descripcion: 'Vereda rota frente a la escuela; peligroso de noche sin iluminación.',
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

  it('PATCH sin sesión → 401 y con ciudadano → 403 (la moderación exige rol)', async () => {
    const tokenCiudadano = await registrarYLoguear('c005r3-' + ts + '-a@example.test');
    const id = await crearReporte(tokenCiudadano);

    const anon = await fetch(base + '/api/reportes/' + id + '/estado', {
      method: 'PATCH',
      headers: jsonHeaders,
      body: JSON.stringify({ estado: 'evaluating', justificacion: 'revisión inicial del equipo' }),
    });
    expect(anon.status).toBe(401);
    await anon.arrayBuffer();

    const intento = await transitar(tokenCiudadano, id, 'evaluating', 'revisión inicial del equipo');
    expect(intento.status).toBe(403);
    await intento.arrayBuffer();
  });

  it('moderador transita received → evaluating con justificación: sello con el ciclo completo', async () => {
    const email = 'c005r3-' + ts + '-b@example.test';
    const tokenCiudadano = await registrarYLoguear(email);
    const id = await crearReporte(tokenCiudadano);
    const token = await tokenModerador(email);

    const res = await transitar(token, id, 'evaluating', 'revisión inicial: el reporte coincide con el reclamo vecinal');
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data.estado).toBe('evaluating');

    // Sello en la fuente de verdad: el ciclo completo queda acreditado —
    // estado_anterior, estado_nuevo, justificación pública y moderador_hash
    // (pseudónimo sha256 truncado, sin PII).
    const sello = await prisma.events_raw.findFirst({
      where: { type: 'reporte.estado_cambiado', payload: { path: ['reporte_id'], equals: id } },
    });
    expect(sello).not.toBeNull();
    const payload: any = sello?.payload;
    expect(payload.estado_anterior).toBe('received');
    expect(payload.estado_nuevo).toBe('evaluating');
    expect(payload.justificacion).toBe('revisión inicial: el reporte coincide con el reclamo vecinal');
    expect(payload.moderador_hash).toMatch(/^[0-9a-f]{32}$/);
    const selloTexto = JSON.stringify(payload);
    expect(selloTexto).not.toContain('@');
    expect(selloTexto).not.toContain('example.test');
  });

  it('sin justificación (ausente o <10 chars) → 400 con el detalle ADR-038 y sin sello', async () => {
    const email = 'c005r3-' + ts + '-c@example.test';
    await registrarYLoguear(email);
    const token = await tokenModerador(email);
    const id = await crearReporte(token);

    const sinJust = await fetch(base + '/api/reportes/' + id + '/estado', {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify({ estado: 'evaluating' }),
    });
    expect(sinJust.status).toBe(400);
    const texto = JSON.stringify(await sinJust.json());
    expect(texto).toContain('ADR-038');

    const corta = await transitar(token, id, 'evaluating', 'corta');
    expect(corta.status).toBe(400);
    const textoCorta = JSON.stringify(await corta.json());
    expect(textoCorta).toContain('ADR-038');

    // Sin justificación válida no hay transición ni sello.
    const sellos = await prisma.events_raw.findMany({
      where: { type: 'reporte.estado_cambiado', payload: { path: ['reporte_id'], equals: id } },
    });
    expect(sellos.length).toBe(0);
  });

  it('matriz ADR-038: salto inválido received → resolved → 400; mismo estado → 409', async () => {
    const email = 'c005r3-' + ts + '-d@example.test';
    await registrarYLoguear(email);
    const token = await tokenModerador(email);
    const id = await crearReporte(token);

    // La moderación no inventa caminos: received → resolved no está en la
    // matriz → 400 salto inválido.
    const salto = await transitar(token, id, 'resolved', 'salto directo no permitido por la matriz');
    expect(salto.status).toBe(400);
    await salto.arrayBuffer();

    // Sin transición no hay evento: el mismo estado → 409.
    const mismo = await transitar(token, id, 'received', 'volver al mismo estado no es transición');
    expect(mismo.status).toBe(409);
    await mismo.arrayBuffer();

    const sellos = await prisma.events_raw.findMany({
      where: { type: 'reporte.estado_cambiado', payload: { path: ['reporte_id'], equals: id } },
    });
    expect(sellos.length).toBe(0);
  });

  it('estado fuera del contrato → 400 (validación Zod R1)', async () => {
    const email = 'c005r3-' + ts + '-e@example.test';
    await registrarYLoguear(email);
    const token = await tokenModerador(email);
    const id = await crearReporte(token);

    const res = await transitar(token, id, 'publicado', 'estado inexistente en el contrato R1');
    expect(res.status).toBe(400);
    await res.arrayBuffer();
  });

  it('reporte inexistente → 404', async () => {
    const email = 'c005r3-' + ts + '-f@example.test';
    await registrarYLoguear(email);
    const token = await tokenModerador(email);

    const res = await transitar(token, 'id-inexistente-c005r3', 'evaluating', 'reporte que no existe en la base');
    expect(res.status).toBe(404);
    await res.arrayBuffer();
  });

  it('cadena completa received → evaluating → in_progress → resolved: un sello por transición y resolved terminal', async () => {
    const email = 'c005r3-' + ts + '-g@example.test';
    await registrarYLoguear(email);
    const token = await tokenModerador(email);
    const id = await crearReporte(token);

    const r1 = await transitar(token, id, 'evaluating', 'equipo de obra evaluó el reclamo en terreno');
    expect(r1.status).toBe(200);
    await r1.arrayBuffer();
    const r2 = await transitar(token, id, 'in_progress', 'la cuadrilla municipal ya está trabajando en el arreglo');
    expect(r2.status).toBe(200);
    await r2.arrayBuffer();
    const r3 = await transitar(token, id, 'resolved', 'verificado en terreno: vereda e iluminación reparadas');
    expect(r3.status).toBe(200);
    const body: any = await r3.json();
    expect(body.data.estado).toBe('resolved');

    // El historial público (R4) derivará de estos sellos: una transición,
    // un evento — la cadena queda 1:1 en la fuente de verdad.
    const sellos = await prisma.events_raw.findMany({
      where: { type: 'reporte.estado_cambiado', payload: { path: ['reporte_id'], equals: id } },
    });
    expect(sellos.length).toBe(3);
    const nuevos = sellos.map((s: any) => (s.payload as any).estado_nuevo);
    expect(nuevos).toContain('evaluating');
    expect(nuevos).toContain('in_progress');
    expect(nuevos).toContain('resolved');

    // resolved es terminal en v1: sin reapertura (ADR-038).
    const terminal = await transitar(token, id, 'descartado', 'intento de reabrir un reporte resuelto');
    expect(terminal.status).toBe(400);
    await terminal.arrayBuffer();
  });

  it('anti-PII: justificación con email → 400 antes de sellar y sin eco del valor', async () => {
    const email = 'c005r3-' + ts + '-h@example.test';
    await registrarYLoguear(email);
    const token = await tokenModerador(email);
    const id = await crearReporte(token);

    const res = await transitar(token, id, 'evaluating', 'contacto del vecino: juan.perez@example.com');
    expect(res.status).toBe(400);
    const texto = JSON.stringify(await res.json());
    expect(texto).not.toContain('juan.perez@example.com');

    const sellos = await prisma.events_raw.findMany({
      where: { type: 'reporte.estado_cambiado', payload: { path: ['reporte_id'], equals: id } },
    });
    expect(sellos.length).toBe(0);
  });
});
