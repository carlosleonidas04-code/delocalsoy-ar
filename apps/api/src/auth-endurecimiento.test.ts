import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

// R5a (auditoría agent-perplexity, #99–#102): endurecimiento de identidad
// ANTES de abrir escrituras ciudadanas (R5b). Verifica con servicios reales:
// - #99: login con costo scrypt constante → 401 idéntico exista o no el email
// - #100: 5xx sin mensajes internos (el detalle queda en stdout del servidor)
// - #101: rate limiting 429 por IP+hash(email) — Redis real (INCR/EXPIRE),
//         con fallback en memoria si Redis no responde (fail-open)
// - #102: /me con manejo de errores (sin promesa colgada de Express 4)
// Requiere Postgres/PostGIS real (job test de CI); sin base el suite se
// salta (honesto, R5).
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';
// El guard es fail-closed: la suite fija su secret ANTES de importar la app.
process.env.JWT_SECRET = 'test-jwt-secret-core004-r5a-con-mas-de-32-chars';

const { createApp } = await import('./app.js');
const prisma = (await import('./lib/prisma.js')).default;
const { consumirIntentos } = await import('./lib/rate-limit.js');

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

describe.skipIf(!dbUp)('endurecimiento de identidad (R5a — #99/#100/#101/#102)', () => {
  const ts = Date.now();
  const jsonHeaders = { 'content-type': 'application/json' };

  it('#99: 401 idéntico para email existente e inexistente — sin canal lateral', async () => {
    const email = `r5a-${ts}-a@example.test`;
    const reg = await fetch(base + '/api/auth/register', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ email, password: 'contrasena-muy-secreta-8+chars' }),
    });
    expect(reg.status).toBe(201);

    const intento = (e: string) =>
      fetch(base + '/api/auth/login', {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ email: e, password: 'password-equivocada-8+' }),
      });

    const existente = await intento(email);
    const inexistente = await intento(`r5a-${ts}-no-registrado@example.test`);
    expect(existente.status).toBe(401);
    expect(inexistente.status).toBe(401);
    const a = await existente.json();
    const b = await inexistente.json();
    // Misma respuesta byte a byte: el email del 401 no delata nada (Ley 25.326).
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
  });

  it('#101: login → 401 x5 y 429 en el 6.º intento con Retry-After', async () => {
    const email = `r5a-${ts}-b@example.test`;
    const intento = () =>
      fetch(base + '/api/auth/login', {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ email, password: 'password-equivocada-8+' }),
      });

    for (let i = 0; i < 5; i++) {
      const res = await intento();
      expect(res.status, 'intento ' + (i + 1)).toBe(401);
      await res.arrayBuffer();
    }
    const sexto = await intento();
    expect(sexto.status).toBe(429);
    const retryAfter = Number(sexto.headers.get('retry-after'));
    expect(retryAfter).toBeGreaterThan(0);
    const body: any = await sexto.json();
    expect(body.success).toBe(false);
    await sexto.arrayBuffer();
  });

  it('#101: register → 201, 409 x4 y 429 en el 6.º intento', async () => {
    const email = `r5a-${ts}-c@example.test`;
    const body = JSON.stringify({ email, password: 'contrasena-muy-secreta-8+chars' });
    const intento = () =>
      fetch(base + '/api/auth/register', { method: 'POST', headers: jsonHeaders, body });

    expect((await intento()).status).toBe(201);
    for (let i = 0; i < 4; i++) {
      const res = await intento();
      expect(res.status, 'intento ' + (i + 2)).toBe(409);
      await res.arrayBuffer();
    }
    expect((await intento()).status).toBe(429);
  });

  it('#102/#100: /me ante fallo de base → 500 genérico sin detalles internos', async () => {
    const email = `r5a-${ts}-d@example.test`;
    const reg = await fetch(base + '/api/auth/register', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ email, password: 'contrasena-muy-secreta-8+chars' }),
    });
    expect(reg.status).toBe(201);
    const login = await fetch(base + '/api/auth/login', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ email, password: 'contrasena-muy-secreta-8+chars' }),
    });
    expect(login.status).toBe(200);
    const { token } = ((await login.json()) as any).data;

    // Fallo simulado de base con un mensaje interno sensible: la respuesta
    // no puede contenerlo (AUD-06, #100); el catch de /me responde 500 (AUD-08, #102).
    const secreto = 'postgres://usuario:secreto@10.0.0.9:5432/prod';
    const spy = vi
      .spyOn(prisma.usuarios, 'findUnique')
      .mockRejectedValueOnce(new Error('conexion perdida: ' + secreto));
    try {
      const res = await fetch(base + '/api/auth/me', {
        headers: { authorization: 'Bearer ' + token },
      });
      expect(res.status).toBe(500);
      const texto = JSON.stringify(await res.json());
      expect(texto).not.toContain(secreto);
      expect(texto).not.toContain('postgres://');
      expect(texto).not.toContain('conexion perdida');
      expect(texto).toContain('fallo al leer la identidad');
    } finally {
      spy.mockRestore();
    }
  });

  it('#101: sin Redis → fallback en memoria con el mismo límite (fail-open)', async () => {
    const urlOriginal = process.env.REDIS_URL;
    process.env.REDIS_URL = 'redis://127.0.0.1:6390'; // puerto sin servicio
    try {
      const clave = 'fallback-memoria-' + ts;
      for (let i = 0; i < 5; i++) {
        const v = await consumirIntentos(clave);
        expect(v.permitido, 'intento ' + (i + 1)).toBe(true);
      }
      const sexto = await consumirIntentos(clave);
      expect(sexto.permitido).toBe(false);
      expect(sexto.reintentoSeg).toBeGreaterThan(0);
    } finally {
      process.env.REDIS_URL = urlOriginal;
    }
  });
});
