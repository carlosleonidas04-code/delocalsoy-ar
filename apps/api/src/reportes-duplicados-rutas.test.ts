import { execSync } from 'node:child_process';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// R5 (CORE-005, #206 — ADR-039): duplicados sugeridos por proximidad en el
// alta de reportes, contra servicios reales (PostgreSQL/PostGIS + Redis):
// - POST /api/reportes a ~22 m de un reporte ABIERTO → la respuesta incluye
//   duplicados_sugeridos con el vecino y su distancia_m (ST_DWithin sobre
//   reportes.geom, radio default 100 m); a ~222 m → sugerencia vacía.
// - Solo abiertos: resolved (terminal) deja de sugerirse; evaluating e
//   in_progress siguen abiertos. Solo reales: el sintético no se sugiere.
// - ADR-039: es una SUGERENCIA de lectura — nada se fusiona, muta ni sella:
//   ambos reportes quedan intactos con un solo sello cada uno; la sugerencia
//   acompaña también al reintento idempotente (200).
// Requiere Postgres/PostGIS real (job test de CI); sin base el suite se
// salta (honesto, R5). db:seed en beforeAll: la categoría se valida contra
// el vocabulario real del nodo (CORE-003).
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';
process.env.JWT_SECRET = 'test-jwt-secret-core005-r5-con-mas-de-32-chars';

const { createApp } = await import('./app.js');
const prisma = (await import('./lib/prisma.js')).default;

const dbUp = await prisma
  .$queryRaw`SELECT 1`
  .then(() => true)
  .catch(() => false);

let server: any;
let base = '';

beforeAll(async () => {
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

describe.skipIf(!dbUp)('duplicados sugeridos por proximidad (CORE-005 R5 — #206, ADR-039)', () => {
  const ts = Date.now();
  const jsonHeaders = { 'content-type': 'application/json' };
  const PASSWORD = 'contrasena-muy-secreta-8+chars';

  // Punto cuasi-único por test (primos grandes sobre ts): evita colisionar
  // dentro del radio de 100 m con reportes de otras corridas del suite.
  function puntoPara(i: number): { lat: number; lng: number } {
    const a = (ts + i * 6151) % 100003;
    const b = (ts + i * 9173) % 100019;
    return { lat: -31.5 + (a / 100003) * 0.4, lng: -68.5 + (b / 100019) * 0.4 };
  }

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

  async function alta(token: string, punto: { lat: number; lng: number }, descripcion: string) {
    return fetch(base + '/api/reportes', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify({
        nodo_key: 'capital',
        categoria: 'insufficient_lighting',
        descripcion,
        lat: punto.lat,
        lng: punto.lng,
      }),
    });
  }

  it('alta aislada → 201 con duplicados_sugeridos vacíos y verificados', async () => {
    const token = await registrarYLoguear('c005r5-' + ts + '-a@example.test');
    const res = await alta(token, puntoPara(0), 'Falta iluminación en una esquina del corredor peatonal alejada de toda otra pasada de pruebas.');
    expect(res.status).toBe(201);
    const body: any = await res.json();
    expect(body.data.estado).toBe('received');
    expect(Array.isArray(body.duplicados_sugeridos)).toBe(true);
    expect(body.duplicados_sugeridos).toHaveLength(0);
    expect(body.duplicados_verificados).toBe(true);
  });

  it('alta a ~22 m de un reporte abierto → duplicados_sugeridos incluye al vecino con distancia_m', async () => {
    const token = await registrarYLoguear('c005r5-' + ts + '-b@example.test');
    const punto = puntoPara(1);
    const primero = await alta(token, punto, 'Falta iluminación en la esquina norte del corredor peatonal de esta pasada de pruebas.');
    expect(primero.status).toBe(201);
    const idPrimero = ((await primero.json()) as any).data.id;

    const vecino = { lat: punto.lat + 0.0002, lng: punto.lng };
    const res = await alta(token, vecino, 'Otra esquina del mismo corredor peatonal también queda a oscuras de noche.');
    expect(res.status).toBe(201);
    const body: any = await res.json();
    expect(body.duplicados_sugeridos.length).toBeGreaterThanOrEqual(1);
    const sugerido = body.duplicados_sugeridos.find((s: any) => s.id === idPrimero);
    expect(sugerido).toBeDefined();
    expect(sugerido.estado).toBe('received');
    expect(sugerido.categoria).toBe('insufficient_lighting');
    expect(sugerido.distancia_m).toBeGreaterThan(10);
    expect(sugerido.distancia_m).toBeLessThan(40);
    expect(typeof sugerido.created_at).toBe('string');
    expect(body.duplicados_verificados).toBe(true);
  });

  it('reintento idempotente → 200 con el mismo id y la misma sugerencia', async () => {
    const token = await registrarYLoguear('c005r5-' + ts + '-c@example.test');
    const punto = puntoPara(2);
    const primero = await alta(token, punto, 'Falta iluminación cerca de la parada del corredor de esta corrida de pruebas nocturnas.');
    expect(primero.status).toBe(201);
    const idPrimero = ((await primero.json()) as any).data.id;

    const vecino = { lat: punto.lat + 0.0002, lng: punto.lng };
    const descripcion = 'La vereda junto a la parada sigue oscura y con baldosas flojas de noche.';
    const alta1 = await alta(token, vecino, descripcion);
    expect(alta1.status).toBe(201);
    const reintento = await alta(token, vecino, descripcion);
    expect(reintento.status).toBe(200);
    const body: any = await reintento.json();
    expect(body.idempotente).toBe(true);
    expect(body.data.id).toBe(((await alta1.json()) as any).data.id);
    expect(body.duplicados_sugeridos.some((s: any) => s.id === idPrimero)).toBe(true);
    expect(body.duplicados_verificados).toBe(true);
  });

  it('ADR-039: la sugerencia nunca fusiona — ambos reportes quedan intactos con un solo sello cada uno', async () => {
    const token = await registrarYLoguear('c005r5-' + ts + '-d@example.test');
    const punto = puntoPara(3);
    const primero = await alta(token, punto, 'Falta iluminación frente al acceso norte del corredor peatonal de esta pasada.');
    expect(primero.status).toBe(201);
    const idPrimero = ((await primero.json()) as any).data.id;

    const res = await alta(token, { lat: punto.lat + 0.0002, lng: punto.lng }, 'El acceso sur del mismo corredor también queda a oscuras.');
    expect(res.status).toBe(201);
    const body: any = await res.json();
    expect(body.duplicados_sugeridos.some((s: any) => s.id === idPrimero)).toBe(true);
    const idVecino = body.data.id;
    expect(idVecino).not.toBe(idPrimero);

    // Nada se muta ni se fusiona: el vecino sugerido sigue exactamente como
    // era (received) y cada reporte tiene UN solo sello reporte.recibido.
    const filaPrimero: any = await prisma.reportes.findUnique({ where: { id: idPrimero } });
    expect(filaPrimero.estado).toBe('received');
    const sellosPrimero = await prisma.events_raw.findMany({
      where: { type: 'reporte.recibido', payload: { path: ['reporte_id'], equals: idPrimero } },
    });
    expect(sellosPrimero.length).toBe(1);
    const sellosVecino = await prisma.events_raw.findMany({
      where: { type: 'reporte.recibido', payload: { path: ['reporte_id'], equals: idVecino } },
    });
    expect(sellosVecino.length).toBe(1);
  });

  it('alta a ~222 m (fuera del radio de 100 m) → sugerencia vacía', async () => {
    const token = await registrarYLoguear('c005r5-' + ts + '-e@example.test');
    const punto = puntoPara(4);
    const primero = await alta(token, punto, 'Falta iluminación en el extremo sur del corredor peatonal de esta pasada.');
    expect(primero.status).toBe(201);

    const lejos = { lat: punto.lat + 0.002, lng: punto.lng };
    const res = await alta(token, lejos, 'Un reporte a más de doscientos metros del primero, fuera del radio de sugerencia.');
    expect(res.status).toBe(201);
    const body: any = await res.json();
    expect(body.duplicados_sugeridos).toHaveLength(0);
  });

  it('reporte resuelto (terminal) deja de sugerirse — solo los abiertos', async () => {
    const token = await registrarYLoguear('c005r5-' + ts + '-f@example.test');
    const punto = puntoPara(5);
    const primero = await alta(token, punto, 'Falta iluminación frente al kiosco del corredor peatonal de esta pasada de pruebas.');
    expect(primero.status).toBe(201);
    const idPrimero = ((await primero.json()) as any).data.id;

    const vecino = { lat: punto.lat + 0.0002, lng: punto.lng };
    const segundo = await alta(token, vecino, 'La esquina contigua al kiosco también está a oscuras durante la noche.');
    expect(segundo.status).toBe(201);
    const idSegundo = ((await segundo.json()) as any).data.id;

    // Setup directo en la base (el ciclo de moderación tiene su propia
    // suite R3): el primero pasa a resolved, terminal en v1.
    await prisma.reportes.update({ where: { id: idPrimero }, data: { estado: 'resolved' } });

    const tercero = await alta(token, vecino, 'Un tercer reporte en la misma esquina contigua, ya con el primero resuelto.');
    expect(tercero.status).toBe(201);
    const body: any = await tercero.json();
    expect(body.duplicados_sugeridos.some((s: any) => s.id === idPrimero)).toBe(false);
    // El abierto a 0 metros sí se sugiere: el filtro es por estado, no por cercanía.
    expect(body.duplicados_sugeridos.some((s: any) => s.id === idSegundo)).toBe(true);
  });

  it('evaluating e in_progress (abiertos) se siguen sugiriendo', async () => {
    const token = await registrarYLoguear('c005r5-' + ts + '-g@example.test');
    const punto = puntoPara(6);
    const primero = await alta(token, punto, 'Falta iluminación en la boca de calle del corredor peatonal de esta pasada.');
    expect(primero.status).toBe(201);
    const idPrimero = ((await primero.json()) as any).data.id;

    const vecino = { lat: punto.lat + 0.0002, lng: punto.lng };
    await prisma.reportes.update({ where: { id: idPrimero }, data: { estado: 'evaluating' } });
    const segundo = await alta(token, vecino, 'La boca de calle vecina también queda mal iluminada de noche.');
    expect(segundo.status).toBe(201);
    let body: any = await segundo.json();
    const sugeridoEvaluating = body.duplicados_sugeridos.find((s: any) => s.id === idPrimero);
    expect(sugeridoEvaluating).toBeDefined();
    expect(sugeridoEvaluating.estado).toBe('evaluating');

    await prisma.reportes.update({ where: { id: idPrimero }, data: { estado: 'in_progress' } });
    const tercero = await alta(token, vecino, 'Tercer reporte en la misma boca de calle con el primero en obra.');
    expect(tercero.status).toBe(201);
    body = await tercero.json();
    const sugeridoEnObra = body.duplicados_sugeridos.find((s: any) => s.id === idPrimero);
    expect(sugeridoEnObra).toBeDefined();
    expect(sugeridoEnObra.estado).toBe('in_progress');
  });

  it('reporte sintético (demo) nunca se sugiere como duplicado de un reporte real', async () => {
    const token = await registrarYLoguear('c005r5-' + ts + '-h@example.test');
    const punto = puntoPara(7);
    const nodo = await prisma.nodos.findFirst({ where: { key: 'capital' } });
    expect(nodo).not.toBeNull();

    // Vecino sintético a 0 metros del reporte real que se dará de alta.
    await prisma.reportes.create({
      data: {
        nodo_id: nodo.id,
        categoria: 'insufficient_lighting',
        descripcion: 'Reporte sintético del demo para el filtro is_synthetic de duplicados.',
        estado: 'received',
        lat: punto.lat,
        lng: punto.lng,
        is_synthetic: true,
        hash: 'r5-synth-' + ts,
      },
    });

    const res = await alta(token, punto, 'Un reporte real justo donde hay un reporte sintético del demo.');
    expect(res.status).toBe(201);
    const body: any = await res.json();
    expect(body.duplicados_sugeridos).toHaveLength(0);
  });
});
