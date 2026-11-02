import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// R5 (riesgo #59): este archivo prueba el comportamiento SIN base de datos.
// Puerto cerrado (localhost:9): PrismaClient se construye, pero toda query
// falla → dbConnected() false → el modo efectivo reportado es 'degraded'.
// La honestidad es la invariant: nunca 200 'ok' silencioso sin base.
process.env.DATABASE_URL = 'postgresql://sinbase:sinbase@localhost:9/sinbase?schema=public';
process.env.SYSTEM_MODE = 'real';

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

describe('GET /api/health — salud honesta sin base (R5, riesgo #59)', () => {
  it('declara mode degraded y dataSource none — nunca ok silencioso', async () => {
    const res = await fetch(base + '/api/health');
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.mode).toBe('degraded');
    expect(body.status).toBe('degraded');
    expect(body.dataSource).toBe('none');
    expect(body.status).not.toBe('ok');
  });

  it('declara projection_lag null sin base — honesto (AUD-08 D4, R15)', async () => {
    const res = await fetch(base + '/api/health');
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.projection_lag).toBeNull();
  });
});

describe('GET /health legado — retirado (riesgo #57, ADR-028)', () => {
  it('responde 404; /api/health sigue 200 — única salud honesta (R5)', async () => {
    const legacy = await fetch(base + '/health');
    expect(legacy.status).toBe(404);
    await legacy.arrayBuffer();

    const honest = await fetch(base + '/api/health');
    expect(honest.status).toBe(200);
    await honest.arrayBuffer();
  });
});

describe('Contrato OpenAPI ↔ rutas reales (riesgo #53, prueba de #59)', () => {
  it('ningún path declarado en docs/api/openapi.json responde 404', async () => {
    const spec = JSON.parse(
      readFileSync(new URL('../../../docs/api/openapi.json', import.meta.url), 'utf-8'),
    ) as { paths: Record<string, Record<string, unknown>> };
    const paths = Object.keys(spec.paths);
    expect(paths.length).toBeGreaterThan(0);

    for (const path of paths) {
      for (const method of ['get', 'post', 'patch'] as const) {
        const methods = spec.paths[path] ?? {};
        if (!(method in methods)) continue;
        const res = await fetch(base + path, {
          method: method.toUpperCase(),
          headers: { 'content-type': 'application/json' },
          body: method === 'get' ? undefined : '{}',
        });
        expect(
          res.status,
          method.toUpperCase() + ' ' + path + ' declarado en OpenAPI pero no montado',
        ).not.toBe(404);
        await res.arrayBuffer();
      }
    }
  });
});
