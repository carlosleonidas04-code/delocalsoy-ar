import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// R5b (CORE-004, #87): dominio activos — escritura ciudadana verificada de
// extremo a extremo contra servicios reales (PostgreSQL/PostGIS + Redis):
// - POST /api/activos: ciudadano autenticado propone → 201 'propuesto',
//   pseudónimo sha256 sin PII, sello activo.propuesto en events_raw,
//   anti-PII antes de persistir y sin eco del valor
// - GET /api/activos: lectura pública anónima, con y sin bbox (PostGIS real)
// - PATCH /api/activos/:id/estado: 403 para ciudadano, 200 para moderador
//   con sello activo.estado_cambiado, 409 si el estado no cambia
// Requiere Postgres/PostGIS real (job test de CI); sin base el suite se
// salta (honesto, R5).
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';
process.env.JWT_SECRET = 'test-jwt-secret-core004-r5b-con-mas-de-32-chars';

const { createApp } = await import('./app.js');
const prisma = (await import('./lib/prisma.js')).default;

const dbUp = await prisma
  .$queryRaw`SELECT 1`
  .then(() => true)
  .catch(() => false);

let server: any;
let base = '';

beforeAll(async () => {
  server = createApp().listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = 'http://127.0.0.1:' + server.address().port;
});

afterAll(async () => {
  await new Promise((resolve, reject) => {
    server.close((err: any) => {
      if (err) reject(err);
      else resolve(null);
    });
    if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
  });
});

describe.skipIf(!dbUp)('dominio activos (R5b — escritura ciudadana, #87)', () => {
  const ts = Date.now();
  const jsonHeaders = { 'content-type': 'application/json' };
  // San Juan capital (~ centro cívico): dentro del bbox del test de lectura.
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

  it('POST sin sesión → 401 (la escritura exige identidad)', async () => {
    const res = await fetch(base + '/api/activos', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ tipo: 'inmueble', titulo: 'Sede vecinal', nodo_key: 'capital', ...punto }),
    });
    expect(res.status).toBe(401);
    await res.arrayBuffer();
  });

  it('ciudadano propone: 201 estado propuesto, pseudónimo sin PII y sello en events_raw', async () => {
    const token = await registrarYLoguear(`r5b-${ts}-a@example.test`);

    const res = await fetch(base + '/api/activos', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify({
        tipo: 'inmueble',
        titulo: 'Galpón comunitario del barrio',
        descripcion: 'Activos en desuso recuperables por el barrio',
        nodo_key: 'capital',
        ...punto,
      }),
    });
    expect(res.status).toBe(201);
    const body: any = await res.json();
    const activo = body.data;
    expect(activo.estado).toBe('propuesto');
    expect(activo.titulo).toBe('Galpón comunitario del barrio');
    expect(activo.created_by_hash).toMatch(/^[0-9a-f]{32}$/);

    // Sello en la fuente de verdad: activo.propuesto con el id, sin PII.
    const sello = await prisma.events_raw.findFirst({
      where: { type: 'activo.propuesto', payload: { path: ['activo_id'], equals: activo.id } },
    });
    expect(sello).not.toBeNull();
    const selloTexto = JSON.stringify(sello?.payload);
    expect(selloTexto).not.toContain('@');
    expect(selloTexto).not.toContain('example.test');
  });

  it('anti-PII: descripción con email → 400 antes de persistir y sin eco del valor', async () => {
    const token = await registrarYLoguear(`r5b-${ts}-b@example.test`);

    const res = await fetch(base + '/api/activos', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify({
        tipo: 'servicio',
        titulo: 'Merendero del parque',
        descripcion: 'contacto: juan.perez@example.com',
        nodo_key: 'capital',
        ...punto,
      }),
    });
    expect(res.status).toBe(400);
    const texto = JSON.stringify(await res.json());
    expect(texto).not.toContain('juan.perez@example.com');
  });

  it('GET público anónimo con bbox: incluye el punto cercano, excluye el lejano', async () => {
    const token = await registrarYLoguear(`r5b-${ts}-c@example.test`);
    const res = await fetch(base + '/api/activos', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify({
        tipo: 'patrimonio',
        titulo: 'Mural históricos del centro',
        nodo_key: 'capital',
        ...punto,
      }),
    });
    expect(res.status).toBe(201);
    const { id } = ((await res.json()) as any).data;

    // Anónimo, envolvente sobre San Juan capital → PostGIS lo encuentra.
    const cerca = await fetch(base + '/api/activos?bbox=-68.55,-31.56,-68.52,-31.52');
    expect(cerca.status).toBe(200);
    const bodyCerca: any = await cerca.json();
    expect(bodyCerca.success).toBe(true);
    expect(bodyCerca.data.some((a: any) => a.id === id)).toBe(true);
    const creado = bodyCerca.data.find((a: any) => a.id === id);
    expect(creado.geometry.type).toBe('Point');

    // Envolvente sobre Buenos Aires → no lo encuentra (recorte espacial real).
    const lejos = await fetch(base + '/api/activos?bbox=-58.45,-34.62,-58.35,-34.55');
    expect(lejos.status).toBe(200);
    const bodyLejos: any = await lejos.json();
    expect(bodyLejos.data.some((a: any) => a.id === id)).toBe(false);

    // Filtro por estado con bbox: solo 'propuesto' por ahora.
    const filtro = await fetch(base + '/api/activos?bbox=-68.55,-31.56,-68.52,-31.52&estado=aprobado');
    const bodyFiltro: any = await filtro.json();
    expect(bodyFiltro.data.some((a: any) => a.id === id)).toBe(false);
  });

  it('moderación: ciudadano 403, moderador 200 con sello, repetido 409', async () => {
    const email = `r5b-${ts}-d@example.test`;
    const tokenCiudadano = await registrarYLoguear(email);

    const creado = await fetch(base + '/api/activos', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenCiudadano },
      body: JSON.stringify({
        tipo: 'infraestructura',
        titulo: 'Plaza seca recuperable',
        nodo_key: 'capital',
        ...punto,
      }),
    });
    expect(creado.status).toBe(201);
    const { id } = ((await creado.json()) as any).data;

    // El ciudadano no modera: solo moderador|admin (ADR-031).
    const intentoCiudadano = await fetch(base + '/api/activos/' + id + '/estado', {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenCiudadano },
      body: JSON.stringify({ estado: 'aprobado' }),
    });
    expect(intentoCiudadano.status).toBe(403);
    await intentoCiudadano.arrayBuffer();

    // Promoción de sistema (moderador) + login nuevo → token con rol.
    await prisma.usuarios.update({ where: { email }, data: { rol: 'moderador' } });
    const loginModerador = await fetch(base + '/api/auth/login', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ email, password: PASSWORD }),
    });
    expect(loginModerador.status).toBe(200);
    const tokenModerador = ((await loginModerador.json()) as any).data.token as string;

    const res = await fetch(base + '/api/activos/' + id + '/estado', {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenModerador },
      body: JSON.stringify({ estado: 'aprobado', motivo: 'verificado en terreno por la delegación' }),
    });
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data.estado).toBe('aprobado');

    const sello = await prisma.events_raw.findFirst({
      where: { type: 'activo.estado_cambiado', payload: { path: ['activo_id'], equals: id } },
    });
    expect(sello).not.toBeNull();
    expect((sello?.payload as any).estado).toBe('aprobado');

    // Sin transición no hay evento: repetir el mismo estado → 409.
    const repetido = await fetch(base + '/api/activos/' + id + '/estado', {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenModerador },
      body: JSON.stringify({ estado: 'aprobado' }),
    });
    expect(repetido.status).toBe(409);
    await repetido.arrayBuffer();
  });

  it('contrato: lat 999 → 400 (validación Zod del contrato)', async () => {
    const token = await registrarYLoguear(`r5b-${ts}-e@example.test`);
    const res = await fetch(base + '/api/activos', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify({ tipo: 'otro', titulo: 'Fuera del mundo', nodo_key: 'capital', lat: 999, lng: 0 }),
    });
    expect(res.status).toBe(400);
    const texto = JSON.stringify(await res.json());
    expect(texto).toContain('lat fuera de rango');
  });
});
