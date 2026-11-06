import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// ARTEFACTOS-ROLES AR1 (#400, épica #399) como código: atributo de
// residencia (vecino = ciudadano con residencia declarada — decisión DH
// 2026-11-06: atributo, NO rol) + cuenta ligera visitante (rol RBAC nuevo
// solo lectura v0.2). Requiere Postgres/PostGIS real (job test de CI +
// db:deploy con la migración 20261106140000_ar1_residencia_visitante); sin
// base alcanzable el suite se salta (honesto, R5).
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';
// El guard es fail-closed: la suite fija su secret ANTES de importar la app.
process.env.JWT_SECRET = 'test-jwt-secret-ar1-con-mas-de-32-chars-0000';

const { createApp } = await import('./app.js');
const { prisma } = await import('@delocalsoy/db');

const dbUp = await prisma
  .$queryRaw`SELECT 1`
  .then(() => true)
  .catch(() => false);

let server: any;
let base = '';

const password = 'contrasena-muy-secreta-8+chars';
const stamp = Date.now();

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

async function subnodoReal(): Promise<string> {
  const subnodo = await prisma.subnodos.findFirst({ orderBy: { key: 'asc' } });
  if (subnodo === null) {
    throw new Error('sin subnodos en el vocabulario: el seed de territorios no corrió (R15 — no se simula)');
  }
  return (subnodo as { key: string }).key;
}

describe.skipIf(!dbUp)('AR1: cuenta ligera visitante (#400)', () => {
  const emailVisitante = `ar1-visitante-${stamp}@example.test`;
  let subnodoKey = '';
  let tokenVisitante = '';

  it('register-visitante: 201 con rol visitante + alias público + tránsito declarado', async () => {
    subnodoKey = await subnodoReal();
    const res = await fetch(base + '/api/auth/register-visitante', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: emailVisitante,
        password,
        alias: 'Turista Valle',
        subnodo_transito_key: subnodoKey,
        consentimiento: { contacto_email: true },
      }),
    });
    expect(res.status).toBe(201);
    const body: any = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.rol).toBe('visitante');
    expect(body.data.display_name).toBe('Turista Valle');
    expect(body.data.transito_subnodo_key).toBe(subnodoKey);
  });

  it('sello visitante.registrado SIN PII (sin email ni alias — Ley 25.326)', async () => {
    const sello = await prisma.events_raw.findFirst({
      where: { type: 'visitante.registrado' },
      orderBy: { occurred_at: 'desc' },
    });
    expect(sello).toBeTruthy();
    const payload = JSON.stringify(sello!.payload);
    expect(payload).toContain(subnodoKey);
    expect(payload).not.toContain(emailVisitante);
    expect(payload).not.toContain('Turista Valle');
  });

  it('register-visitante: subnodo de tránsito inexistente → 400 (vocabulario real, R15)', async () => {
    const res = await fetch(base + '/api/auth/register-visitante', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: `ar1-badsub-${stamp}@example.test`,
        password,
        alias: 'SinNodo',
        subnodo_transito_key: 'no_existe',
        consentimiento: { contacto_email: true },
      }),
    });
    expect(res.status).toBe(400);
  });

  it('register-visitante: consentimiento sin contacto_email true → 400 (ADR-027)', async () => {
    const res = await fetch(base + '/api/auth/register-visitante', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: `ar1-noconsent-${stamp}@example.test`,
        password,
        alias: 'SinConsent',
        subnodo_transito_key: subnodoKey,
        consentimiento: { contacto_email: false },
      }),
    });
    expect(res.status).toBe(400);
  });

  it('register-visitante: email duplicado → 409', async () => {
    const res = await fetch(base + '/api/auth/register-visitante', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: emailVisitante,
        password,
        alias: 'Dup',
        subnodo_transito_key: subnodoKey,
        consentimiento: { contacto_email: true },
      }),
    });
    expect(res.status).toBe(409);
  });

  it('login visitante → token JWT con rol visitante', async () => {
    const res = await fetch(base + '/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: emailVisitante, password }),
    });
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data.usuario.rol).toBe('visitante');
    tokenVisitante = body.data.token;
  });

  it('visitante es SOLO LECTURA: PUT /api/me/residencia → 403 (la API es la compuerta)', async () => {
    const res = await fetch(base + '/api/me/residencia', {
      method: 'PUT',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + tokenVisitante },
      body: JSON.stringify({ subnodo_key: subnodoKey }),
    });
    expect(res.status).toBe(403);
  });

  it('rate limit de identidad: 6º intento con el mismo email → 429 (R5a, #101)', async () => {
    const correo = `ar1-rl-${stamp}@example.test`;
    let ultimo = 0;
    for (let i = 0; i < 6; i++) {
      const res = await fetch(base + '/api/auth/register-visitante', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: correo,
          password: 'corta', // falla Zod: solo se cuenta el intento del rate limit
          alias: 'RL',
          subnodo_transito_key: 'x',
          consentimiento: { contacto_email: true },
        }),
      });
      ultimo = res.status;
    }
    expect(ultimo).toBe(429);
  });
});

describe.skipIf(!dbUp)('AR1: atributo de residencia — vecino (#400)', () => {
  const email = `ar1-vecino-${stamp}@example.test`;
  let subnodoKey = '';
  let token = '';

  it('setup: alta de ciudadano + subnodo real del vocabulario + login', async () => {
    subnodoKey = await subnodoReal();
    const reg = await fetch(base + '/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    expect(reg.status).toBe(201);
    const login = await fetch(base + '/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    expect(login.status).toBe(200);
    token = ((await login.json()) as any).data.token;
  });

  it('PUT /api/me/residencia: 200 con atributo declarado (auto-declaración R15)', async () => {
    const res = await fetch(base + '/api/me/residencia', {
      method: 'PUT',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token },
      body: JSON.stringify({ subnodo_key: subnodoKey }),
    });
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.residencia_subnodo_key).toBe(subnodoKey);
    expect(body.data.residencia_declarada_en).toBeTruthy();
  });

  it('sello residencia.declarada SIN PII (sin email — Ley 25.326)', async () => {
    const sello = await prisma.events_raw.findFirst({
      where: { type: 'residencia.declarada' },
      orderBy: { occurred_at: 'desc' },
    });
    expect(sello).toBeTruthy();
    const payload = JSON.stringify(sello!.payload);
    expect(payload).toContain(subnodoKey);
    expect(payload).not.toContain(email);
  });

  it('GET /api/auth/me devuelve el atributo (perfil vecino derivable en el cliente)', async () => {
    const res = await fetch(base + '/api/auth/me', { headers: { authorization: 'Bearer ' + token } });
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data.residencia_subnodo_key).toBe(subnodoKey);
    expect(body.data.residencia_declarada_en).toBeTruthy();
  });

  it('subnodo inexistente → 400 (la residencia se ancla al vocabulario real)', async () => {
    const res = await fetch(base + '/api/me/residencia', {
      method: 'PUT',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token },
      body: JSON.stringify({ subnodo_key: 'no_existe' }),
    });
    expect(res.status).toBe(400);
  });

  it('re-declaración: 200 con timestamp renovado (append-only en events_raw)', async () => {
    const antes = await prisma.events_raw.count({ where: { type: 'residencia.declarada' } });
    const res = await fetch(base + '/api/me/residencia', {
      method: 'PUT',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token },
      body: JSON.stringify({ subnodo_key: subnodoKey }),
    });
    expect(res.status).toBe(200);
    const despues = await prisma.events_raw.count({ where: { type: 'residencia.declarada' } });
    expect(despues).toBe(antes + 1); // una escritura, un evento (R4)
  });

  it('sin token → 401 (guard requireJwt, fail-closed)', async () => {
    const res = await fetch(base + '/api/me/residencia', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ subnodo_key: 'x' }),
    });
    expect(res.status).toBe(401);
  });
});
