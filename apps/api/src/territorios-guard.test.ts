import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// R8 / CORE-002 T1 (#63): este archivo prueba el guard de API key de las escrituras
// de territorios SIN base de datos. Puerto cerrado (localhost:9): PrismaClient se
// construye, pero toda query falla → el guard responde ANTES de tocar la base,
// así que el 401 es verificable sin PostGIS (aislamiento por archivo, patrón de
// health.test.ts).
process.env.DATABASE_URL = 'postgresql://sinbase:sinbase@localhost:9/sinbase?schema=public';
process.env.TERRITORIOS_API_KEY = 'test-key-guard-t1';

const { createApp } = await import('./app.js');

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

describe('Guard R8 — escrituras de territorios (CORE-002 T1, #63)', () => {
  it('POST /api/territorios sin cabecera x-api-key → 401', async () => {
    const res = await fetch(base + '/api/territorios', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ nombre: 'X', provincia: 'San Juan' }),
    });
    expect(res.status).toBe(401);
    const body: any = await res.json();
    expect(body.error).toContain('no autorizado');
  });

  it('POST con x-api-key incorrecta → 401', async () => {
    const res = await fetch(base + '/api/territorios', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': 'incorrecta' },
      body: JSON.stringify({ nombre: 'X', provincia: 'San Juan' }),
    });
    expect(res.status).toBe(401);
  });

  it('PUT y DELETE sin key → 401 (el guard cubre todas las escrituras)', async () => {
    const put = await fetch(base + '/api/territorios/no-existe', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ activo: false }),
    });
    expect(put.status).toBe(401);

    const del = await fetch(base + '/api/territorios/no-existe', { method: 'DELETE' });
    expect(del.status).toBe(401);
  });

  it('GET /api/territorios permanece público (sin key no hay 401)', async () => {
    const res = await fetch(base + '/api/territorios');
    expect(res.status).not.toBe(401);
  });

  it('con x-api-key correcta el guard pasa (sin base → 500 de persistencia, no 401)', async () => {
    const res = await fetch(base + '/api/territorios', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': 'test-key-guard-t1' },
      body: JSON.stringify({ nombre: 'X', provincia: 'San Juan' }),
    });
    expect(res.status).not.toBe(401);
    expect(res.status).toBe(500);
  });
});
