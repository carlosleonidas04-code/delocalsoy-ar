import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// EV-032 como código (CORE-004 R3, #87): registro/login/me con JWT + roles
// (ADR-031), sesiones selladas en events_raw sin PII (Ley 25.326). Requiere
// Postgres/PostGIS real (job test de CI + db:deploy con la migración
// 20261008120000_core004_usuarios); sin base alcanzable el suite se salta
// (honesto, R5).
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';
// El guard es fail-closed: la suite fija su secret ANTES de importar la app.
process.env.JWT_SECRET = 'test-jwt-secret-core004-r3-con-mas-de-32-chars';

const { createApp } = await import('./app.js');
const { prisma } = await import('@delocalsoy/db');
const express = (await import('express')).default;
const { requireJwt, requireRole } = await import('./lib/auth.js');

const dbUp = await prisma
  .$queryRaw`SELECT 1`
  .then(() => true)
  .catch(() => false);

let server: any;
let base = '';
// App de prueba para la autorización por rol (EV-032): el guard se verifica
// sin agregar rutas especulativas a producción.
let roleServer: any;
let roleBase = '';

const email = 'core004-r3-' + Date.now() + '@example.test';
const password = 'contrasena-muy-secreta-8+chars';

beforeAll(async () => {
  server = createApp().listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = 'http://127.0.0.1:' + server.address().port;

  const roleApp = express();
  roleApp.use(express.json());
  roleApp.post('/solo-moderacion', requireJwt, requireRole('moderador', 'admin'), (_req: any, res: any) => {
    res.json({ ok: true });
  });
  roleServer = roleApp.listen(0, '127.0.0.1');
  await new Promise((resolve) => roleServer.once('listening', resolve));
  roleBase = 'http://127.0.0.1:' + roleServer.address().port;
});

afterAll(async () => {
  await new Promise((resolve, reject) => {
    server.close((err: any) => {
      if (err) reject(err);
      else resolve(null);
    });
    if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
  });
  await new Promise((resolve, reject) => {
    roleServer.close((err: any) => {
      if (err) reject(err);
      else resolve(null);
    });
  });
});

describe.skipIf(!dbUp)('identidad por etapas (ADR-031, EV-032)', () => {
  let token = '';
  let usuarioId = '';

  it('register: alta de ciudadano 201 + rol default', async () => {
    const res = await fetch(base + '/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password, display_name: 'Ciudadano Test' }),
    });
    expect(res.status).toBe(201);
    const body: any = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.rol).toBe('ciudadano');
    expect(body.data.email).toBe(email);
    usuarioId = body.data.id;
  });

  it('register: email duplicado → 409', async () => {
    const res = await fetch(base + '/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    expect(res.status).toBe(409);
  });

  it('register: password corta → 400 (contrato Zod)', async () => {
    const res = await fetch(base + '/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'otro-' + email, password: 'corta' }),
    });
    expect(res.status).toBe(400);
  });

  it('sello system.user_registered existe y NO contiene email (Ley 25.326)', async () => {
    const sello = await prisma.events_raw.findFirst({
      where: { type: 'system.user_registered' },
      orderBy: { occurred_at: 'desc' },
    });
    expect(sello).toBeTruthy();
    const payload = JSON.stringify(sello!.payload);
    expect(payload).toContain(usuarioId);
    expect(payload).not.toContain(email); // sin PII en events_raw
  });

  it('login: credenciales válidas → token JWT (3 partes)', async () => {
    const res = await fetch(base + '/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.success).toBe(true);
    token = body.data.token;
    expect(token.split('.').length).toBe(3);
    expect(body.data.usuario.rol).toBe('ciudadano');
  });

  it('login: password incorrecta → 401 genérico', async () => {
    const res = await fetch(base + '/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: 'password-equivocada-8+' }),
    });
    expect(res.status).toBe(401);
    const body: any = await res.json();
    expect(body.error).toBe('credenciales inválidas');
  });

  it('me: sin token → 401; token basura → 401; token válido → 200 con rol', async () => {
    const sin = await fetch(base + '/api/auth/me');
    expect(sin.status).toBe(401);

    const basura = await fetch(base + '/api/auth/me', {
      headers: { authorization: 'Bearer a.b.c' },
    });
    expect(basura.status).toBe(401);

    const ok = await fetch(base + '/api/auth/me', {
      headers: { authorization: 'Bearer ' + token },
    });
    expect(ok.status).toBe(200);
    const body: any = await ok.json();
    expect(body.data.id).toBe(usuarioId);
    expect(body.data.rol).toBe('ciudadano');
  });

  it('autorización por rol: ciudadano NO pasa un guard moderador|admin → 403 (EV-032)', async () => {
    const res = await fetch(roleBase + '/solo-moderacion', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' },
      body: '{}',
    });
    expect(res.status).toBe(403);
  });

  it('sello system.user_session existe y NO contiene email', async () => {
    const sello = await prisma.events_raw.findFirst({
      where: { type: 'system.user_session' },
      orderBy: { occurred_at: 'desc' },
    });
    expect(sello).toBeTruthy();
    const payload = JSON.stringify(sello!.payload);
    expect(payload).toContain(usuarioId);
    expect(payload).not.toContain(email);
  });
});
