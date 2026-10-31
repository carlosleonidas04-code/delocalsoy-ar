import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

// M1 observabilidad (#288): el middleware loguea una linea JSON por request,
// expone X-Request-Id y el nivel depende del status (>=400 warn, >=500 error).
// Este archivo NO necesita base de datos ni Redis (puerto cerrado, patron
// health.test.ts): prueba el transporte del log, no el dominio.
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

async function requestLines(spy: any, msg: string): Promise<any[]> {
  await new Promise((resolve) => setTimeout(resolve, 100)); // el log dispara en 'finish'
  return spy.mock.calls
    .map((c: any) => String(c[0] ?? ''))
    .filter((s: string) => s.startsWith('{'))
    .map((s: string) => JSON.parse(s))
    .filter((o: any) => o.msg === msg);
}

describe('M1 logs JSON — middleware de observabilidad (#288)', () => {
  it('toda respuesta loguea una linea JSON con los campos; el header X-Request-Id es el request_id del log', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const res = await fetch(base + '/api/ruta-que-no-existe-288');
      await res.arrayBuffer();
      expect(res.status).toBe(404);
      const headerId = res.headers.get('x-request-id');
      expect(headerId).toBeTruthy();

      const lines = await requestLines(spy, 'http_request');
      expect(lines.length).toBe(1);
      const line = lines[0];
      expect(line.request_id).toBe(headerId);
      expect(line.level).toBe('warn'); // 404
      expect(line.method).toBe('GET');
      expect(line.path).toBe('/api/ruta-que-no-existe-288');
      expect(line.status).toBe(404);
      expect(typeof line.duration_ms).toBe('number');
      expect(typeof line.ts).toBe('string');
    } finally {
      spy.mockRestore();
    }
  });

  it('no loguea la query string (anti-PII, ADR-027): el path queda sin ?', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const res = await fetch(base + '/api/health?token-falso=abc&bbox=1');
      await res.arrayBuffer();
      const lines = await requestLines(spy, 'http_request');
      expect(lines.length).toBe(1);
      expect(lines[0].path).toBe('/api/health');
    } finally {
      spy.mockRestore();
    }
  });
});
