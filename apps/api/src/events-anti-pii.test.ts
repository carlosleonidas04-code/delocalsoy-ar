import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// CORE-002 T5 (#67): el filtro anti-PII se dispara ANTES de tocar la base,
// así que los 400 son verificables sin PostGIS (aislamiento por archivo,
// patrón de health.test.ts). Sin base, un payload legítimo llega a la
// persistencia y falla con 500 — nunca con 400 de PII.
process.env.DATABASE_URL = 'postgresql://sinbase:sinbase@localhost:9/sinbase?schema=public';

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

describe('POST /api/events — anti-PII server-side (ADR-020 cond. 1, Ley 25.326, #67)', () => {
  const post = (payload: unknown) =>
    fetch(base + '/api/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });

  const casos: Array<[string, Record<string, unknown>]> = [
    ['DNI', { nota: 'el documento 20.123.456 del vecino' }],
    ['CUIT', { contribuyente: '20-12345678-4' }],
    ['email', { contacto: 'test@example.com' }],
    ['teléfono', { celular: '+54 11 1234 5678' }],
  ];

  for (const [nombre, campos] of casos) {
    it(`${nombre} en el payload → 400, sin eco del valor en la respuesta`, async () => {
      const res = await post({ type: 'test.pii', payload: campos });
      expect(res.status).toBe(400);
      const body: any = await res.json();
      expect(body.error).toContain('datos personales identificables');
      // El valor crudo jamás aparece en la respuesta:
      const texto = JSON.stringify(body);
      for (const valor of Object.values(campos)) {
        expect(texto).not.toContain(String(valor));
      }
    });
  }

  it('payload territorial legítimo pasa el filtro (sin base → 500 de persistencia, no 400)', async () => {
    const res = await post({
      type: 'territorio.observacion',
      payload: { nodo: 'capital', nota: 'actividad territorial en el departamento Capital, San Juan' },
    });
    expect(res.status).not.toBe(400);
    expect(res.status).toBe(500);
  });
});
