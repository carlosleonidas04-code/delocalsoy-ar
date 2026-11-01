import { execSync } from 'node:child_process';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// R2 (CORE-005, #206): dominio reportes — escritura ciudadana de extremo a
// extremo contra servicios reales (PostgreSQL/PostGIS + Redis):
// - POST /api/reportes: ciudadano autenticado reporta → 201 'received',
//   pseudónimo sha256 sin PII, sello reporte.recibido en events_raw,
//   anti-PII antes de persistir y sin eco del valor
// - idempotencia por hash único: reintento del mismo reporte → 200 con el
//   mismo id y un solo sello
// - la categoría se valida contra el vocabulario real del nodo (CORE-003)
// Requiere Postgres/PostGIS real (job test de CI); sin base el suite se
// salta (honesto, R5). El vocabulario del nodo (nodos/categorias del seed
// CORE-003) es obligatorio para validar la categoría → db:seed en beforeAll.
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';
process.env.JWT_SECRET = 'test-jwt-secret-core005-r2-con-mas-de-32-chars';

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

describe.skipIf(!dbUp)('dominio reportes (CORE-005 R2 — escritura ciudadana, #206)', () => {
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

  function altaValida() {
    return {
      nodo_key: 'capital',
      categoria: 'insufficient_lighting',
      descripcion: 'Falta iluminación en la esquina del corredor peatonal; de noche queda muy oscuro.',
      ...punto,
    };
  }

  it('POST sin sesión → 401 (la escritura exige identidad)', async () => {
    const res = await fetch(base + '/api/reportes', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(altaValida()),
    });
    expect(res.status).toBe(401);
    await res.arrayBuffer();
  });

  it('ciudadano reporta: 201 received, pseudónimo sin PII, sello en events_raw y visible en el nodo', async () => {
    const token = await registrarYLoguear('c005r2-' + ts + '-a@example.test');

    // Baseline de la lectura pública existente (CORE-003 R1).
    const antes = await fetch(base + '/api/nodos/capital/reportes');
    expect(antes.status).toBe(200);
    const bodyAntes: any = await antes.json();
    const n0: number = bodyAntes.count ?? bodyAntes.data.length;

    const res = await fetch(base + '/api/reportes', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify(altaValida()),
    });
    expect(res.status).toBe(201);
    const body: any = await res.json();
    const reporte = body.data;
    expect(reporte.estado).toBe('received');
    expect(reporte.is_synthetic).toBe(false);
    expect(reporte.created_by_hash).toMatch(/^[0-9a-f]{32}$/);

    // Sello en la fuente de verdad: reporte.recibido con el id, sin PII —
    // el texto del ciudadano nunca viaja al sello.
    const sello = await prisma.events_raw.findFirst({
      where: { type: 'reporte.recibido', payload: { path: ['reporte_id'], equals: reporte.id } },
    });
    expect(sello).not.toBeNull();
    const selloTexto = JSON.stringify(sello?.payload);
    expect(selloTexto).not.toContain('@');
    expect(selloTexto).not.toContain('example.test');
    expect(selloTexto).not.toContain('Falta iluminación');

    // Visible en la lectura pública existente del nodo.
    const despues = await fetch(base + '/api/nodos/capital/reportes');
    expect(despues.status).toBe(200);
    const bodyDespues: any = await despues.json();
    expect(bodyDespues.data.some((r: any) => r.id === reporte.id)).toBe(true);
    expect((bodyDespues.count ?? bodyDespues.data.length)).toBe(n0 + 1);
  });

  it('idempotencia por hash: reintento del mismo reporte → 200 con el mismo id y un solo sello', async () => {
    const token = await registrarYLoguear('c005r2-' + ts + '-b@example.test');
    const alta = altaValida();

    const primero = await fetch(base + '/api/reportes', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify(alta),
    });
    expect(primero.status).toBe(201);
    const idPrimero = ((await primero.json()) as any).data.id;

    const segundo = await fetch(base + '/api/reportes', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify(alta),
    });
    expect(segundo.status).toBe(200);
    const bodySegundo: any = await segundo.json();
    expect(bodySegundo.idempotente).toBe(true);
    expect(bodySegundo.data.id).toBe(idPrimero);

    const sellos = await prisma.events_raw.findMany({
      where: { type: 'reporte.recibido', payload: { path: ['reporte_id'], equals: idPrimero } },
    });
    expect(sellos.length).toBe(1);
  });

  it('anti-PII: descripción con email → 400 antes de persistir y sin eco del valor', async () => {
    const token = await registrarYLoguear('c005r2-' + ts + '-c@example.test');

    const res = await fetch(base + '/api/reportes', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify({ ...altaValida(), descripcion: 'contacto: juan.perez@example.com' }),
    });
    expect(res.status).toBe(400);
    const texto = JSON.stringify(await res.json());
    expect(texto).not.toContain('juan.perez@example.com');
  });

  it('categoría ajena al vocabulario del nodo → 400 (se valida contra el catálogo real)', async () => {
    const token = await registrarYLoguear('c005r2-' + ts + '-d@example.test');

    const res = await fetch(base + '/api/reportes', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify({ ...altaValida(), categoria: 'categoria_fuera_de_vocabulario' }),
    });
    expect(res.status).toBe(400);
    const body: any = await res.json();
    expect(body.error).toBe('categoría inexistente en el vocabulario del nodo');
  });

  it('contrato: descripción corta y lat fuera de rango → 400 (validación Zod de R1)', async () => {
    const token = await registrarYLoguear('c005r2-' + ts + '-e@example.test');

    const corta = await fetch(base + '/api/reportes', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify({ ...altaValida(), descripcion: 'corta' }),
    });
    expect(corta.status).toBe(400);
    await corta.arrayBuffer();

    const latInvalida = await fetch(base + '/api/reportes', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify({ ...altaValida(), lat: 999 }),
    });
    expect(latInvalida.status).toBe(400);
    const body: any = await latInvalida.json();
    expect(JSON.stringify(body.details)).toContain('lat fuera de rango');
  });
});
