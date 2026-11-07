import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// ARTEFACTOS-ROLES AR4 (#403): GET /api/sellos — libro contable público de
// events_raw, y GET /api/sellos/tipos — cobertura por type. Requiere
// Postgres/PostGIS real (en CI, el job test levanta el servicio y aplica
// migraciones con db:deploy — riesgo #55). Sin base alcanzable el suite se
// salta (honesto, R5: no se simula el libro contable con el mock).
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';

const { createApp } = await import('./app.js');
const { prisma } = await import('@delocalsoy/db');

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

// Eventos de prueba: occurred_at fijo → hash determinista → el test es
// idempotente entre runs (re-ejecutar encuentra 'duplicado', no falla).
const TIPOS = ['test.sellos.ar4-a', 'test.sellos.ar4-b', 'test.sellos.ar4-c'];
const NODO_POR_TIPO: Record<string, string> = {
  'test.sellos.ar4-a': 'iglesia',
  'test.sellos.ar4-b': 'iglesia',
  'test.sellos.ar4-c': 'capital',
};

async function postEvento(type: string) {
  const res = await fetch(base + '/api/events', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      type,
      payload: { nodo_key: NODO_POR_TIPO[type], suite: 'ar4-sellos' },
      occurred_at: '2026-11-07T12:00:00.000Z',
    }),
  });
  return { status: res.status, body: (await res.json()) as any };
}

async function getSellos(query = '') {
  const res = await fetch(base + '/api/sellos' + query);
  const texto = await res.text();
  return {
    status: res.status,
    total: res.headers.get('x-delocalsoy-total-count'),
    texto,
    body: texto ? (JSON.parse(texto) as any) : null,
  };
}

describe.skipIf(!dbUp)('GET /api/sellos — libro contable público (AR4, #403)', () => {
  beforeAll(async () => {
    for (const t of TIPOS) {
      const r = await postEvento(t);
      if (![200, 201].includes(r.status)) {
        throw new Error('no se pudo sembrar el evento de prueba ' + t + ': HTTP ' + r.status);
      }
    }
  });

  it('lista sellos con id/type/hash/occurred_at ISO y payload — envelope + header total', async () => {
    const r = await getSellos('?type=' + encodeURIComponent('test.sellos.ar4-a'));
    expect(r.status).toBe(200);
    expect(r.body.success).toBe(true);
    expect(r.body.data).toHaveLength(1);
    const sello = r.body.data[0];
    expect(sello.type).toBe('test.sellos.ar4-a');
    expect(sello.hash).toBeTruthy();
    expect(typeof sello.hash).toBe('string');
    expect(sello.occurred_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(sello.payload.nodo_key).toBe('iglesia');
    expect(r.total).toBe('1');
    expect(r.body.total).toBe(1);
    expect(r.body.count).toBe(1);
  });

  it('?nodo= filtra por payload->nodo_key (events_raw no tiene columna nodo)', async () => {
    const r = await getSellos('?nodo=iglesia&type=' + encodeURIComponent('test.sellos.ar4-b'));
    expect(r.status).toBe(200);
    expect(r.body.data).toHaveLength(1);
    expect(r.body.data[0].payload.nodo_key).toBe('iglesia');
    // el sello del nodo capital NO aparece con el filtro iglesia
    const rCapital = await getSellos('?nodo=iglesia');
    expect(rCapital.body.data.every((s: any) => s.payload.nodo_key === 'iglesia')).toBe(true);
  });

  it('?type= exacto: un sello del nodo capital responde con su nodo', async () => {
    const r = await getSellos('?type=' + encodeURIComponent('test.sellos.ar4-c'));
    expect(r.status).toBe(200);
    expect(r.body.data).toHaveLength(1);
    expect(r.body.data[0].payload.nodo_key).toBe('capital');
  });

  it('paginación limit/offset: slices distintos del mismo conjunto ordenado', async () => {
    const r1 = await getSellos('?nodo=iglesia&limit=1&offset=0');
    const r2 = await getSellos('?nodo=iglesia&limit=1&offset=1');
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(r1.body.data).toHaveLength(1);
    expect(r2.body.data).toHaveLength(1);
    expect(r1.body.limit).toBe(1);
    expect(r1.body.offset).toBe(0);
    // orden occurred_at desc con occurred_at idéntico entre runs → ids
    // distintos por diseño (hash distinto por type): las páginas no se repiten
    expect(r1.body.data[0].id === r2.body.data[0].id).toBe(false);
    expect(Number(r1.total)).toBeGreaterThanOrEqual(2);
  });

  it('400 con query inválido (limit 0 / limit 999)', async () => {
    const r0 = await getSellos('?limit=0');
    expect(r0.status).toBe(400);
    expect(r0.body.success).toBe(false);
    const r999 = await getSellos('?limit=999');
    expect(r999.status).toBe(400);
  });

  it('spot-check anti-PII: la respuesta del libro contable no expone patrones de documento/email AR', async () => {
    const r = await getSellos('?type=' + encodeURIComponent('test.sellos.ar4-a'));
    const texto = r.texto;
    expect(texto).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
    expect(texto).not.toMatch(/\b\d{2}-\d{8}-\d\b/);
    expect(texto).not.toMatch(/\b\d{7,8}\b/);
  });
});

describe.skipIf(!dbUp)('POST /api/events + GET /api/sellos — la compuerta de ingesta sigue viva', () => {
  it('la ingesta rechaza PII (400) ANTES de que exista el sello — la lectura queda limpia por construcción', async () => {
    const res = await fetch(base + '/api/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type: 'test.sellos.ar4-pii',
        payload: { nota: 'escribime a juan.perez@ejemplo.com' },
        occurred_at: '2026-11-07T12:00:00.000Z',
      }),
    });
    expect(res.status).toBe(400);
  });
});

describe.skipIf(!dbUp)('GET /api/sellos/tipos — cobertura por type (AR4, #403)', () => {
  beforeAll(async () => {
    for (const t of TIPOS) {
      const r = await postEvento(t);
      if (![200, 201].includes(r.status)) {
        throw new Error('no se pudo sembrar el evento de prueba ' + t + ': HTTP ' + r.status);
      }
    }
  });

  it('agrupa por type con counts >= 1 para los sellos de prueba y total coherente', async () => {
    const res = await fetch(base + '/api/sellos/tipos');
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    for (const t of TIPOS) {
      const fila = body.data.find((x: any) => x.type === t);
      expect(fila, 'falta el type de prueba ' + t).toBeTruthy();
      expect(fila.count).toBeGreaterThanOrEqual(1);
    }
    expect(body.total).toBeGreaterThanOrEqual(3);
    // orden desc por count: la primera fila tiene el mayor count
    for (let i = 1; i < Math.min(body.data.length, 5); i++) {
      expect(body.data[i - 1].count).toBeGreaterThanOrEqual(body.data[i].count);
    }
  });
});
