import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// NC-R4 (#139, epica #137): cruce informacion publica <-> relevamiento in-situ
// sobre las capas v6 del nodo caucete (hydrology / seismic_risk / public_space /
// accessibility / sustainability -- NODO-CAU R1 #141 + capas cientificas NC-R2
// #138/#147). El flujo ciudadano existente (CORE-004 R5b: POST /api/activos con
// pseudonimo sha256 sin PII + moderacion moderador|admin) queda posicionado
// sobre las capas nuevas del nodo:
// - alta ciudadana de activo sobre caucete -> 201 'propuesto' + sello en events_raw
// - moderacion PATCH /api/activos/:id/estado -> 'aprobado' con sello
// - GET publico anonimo con bbox sobre caucete (PostGIS real)
// - cruce NC-R2: el dato publico (features con fuente diferenciada, ADR-035) y
//   el relevamiento in-situ (activo propuesto por la ciudadania) quedan
//   visibles JUNTOS, sin fusionarse; estados honestos (ADR-036): el feature
//   in-situ puede confirmar, matizar o contradecir el dato publico -- ambos
//   canales conviven con fuente diferenciada.
// Requiere Postgres/PostGIS real (job test de CI); sin base el suite se
// salta (honesto, R5).
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';
process.env.JWT_SECRET = 'test-jwt-secret-nc-r4-cruce-in-situ-con-mas-de-32-chars';

const { createApp } = await import('./app.js');
const prisma = (await import('./lib/prisma.js')).default;

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

// Las 5 capas v6 del relevo (NODO-CAU R1 #141) sobre las que se posiciona
// el flujo ciudadano de NC-R4.
const CAPAS_V6 = ['hydrology', 'seismic_risk', 'public_space', 'accessibility', 'sustainability'];
const ESTADOS_HONESTOS = [
  'pending',
  'community_validated',
  'verified',
  'synthetic_demo',
  'declared',
  'disputed',
];

describe.skipIf(!dbUp)('NC-R4 (#139) — cruce publico <-> in-situ sobre capas v6 de caucete', () => {
  const ts = Date.now();
  const jsonHeaders = { 'content-type': 'application/json' };
  // Caucete (~ centro urbano del departamento): dentro del bbox del test.
  const punto = { lat: -31.0403, lng: -68.5717 };
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

  it('capas v6 del relevo presentes en caucete (NC-R2)', async () => {
    const res = await fetch(base + '/api/nodos/caucete/capas');
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.success).toBe(true);
    const keys: string[] = body.data.map((c: any) => c.key);
    for (const capa of CAPAS_V6) {
      expect(keys, 'capa v6 ' + capa).toContain(capa);
    }
  });

  it('alta ciudadana de activo sobre caucete: 201 propuesto, pseudonimo sin PII y sello activo.propuesto', async () => {
    const token = await registrarYLoguear('ncr4-' + ts + '-a@example.test');

    const res = await fetch(base + '/api/activos', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify({
        tipo: 'infraestructura',
        titulo: 'Boca de tormenta relevada por vecinos',
        descripcion: 'Relevo in-situ del escurrimiento urbano tras la tormenta',
        nodo_key: 'caucete',
        ...punto,
      }),
    });
    expect(res.status).toBe(201);
    const body: any = await res.json();
    const activo = body.data;
    expect(activo.estado).toBe('propuesto');
    expect(activo.nodo_key).toBe('caucete');
    expect(activo.created_by_hash).toMatch(/^[0-9a-f]{32}$/);

    // Sello en la fuente de verdad: activo.propuesto con el id, sin PII (R5).
    const sello = await prisma.events_raw.findFirst({
      where: { type: 'activo.propuesto', payload: { path: ['activo_id'], equals: activo.id } },
    });
    expect(sello).not.toBeNull();
    const selloTexto = JSON.stringify(sello?.payload);
    expect(selloTexto).not.toContain('@');
    expect(selloTexto).not.toContain('example.test');
  });

  it('moderacion: ciudadano 403, moderador 200 aprobado con sello, repetido 409', async () => {
    const email = 'ncr4-' + ts + '-b@example.test';
    const tokenCiudadano = await registrarYLoguear(email);

    const creado = await fetch(base + '/api/activos', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenCiudadano },
      body: JSON.stringify({
        tipo: 'infraestructura',
        titulo: 'Vereda danada relevada por vecinos',
        nodo_key: 'caucete',
        ...punto,
      }),
    });
    expect(creado.status).toBe(201);
    const { id } = ((await creado.json()) as any).data;

    // El ciudadano no modera: solo moderador|admin (ADR-031) — la
    // "informacion veraz y responsable" exige moderacion registrada.
    const intentoCiudadano = await fetch(base + '/api/activos/' + id + '/estado', {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenCiudadano },
      body: JSON.stringify({ estado: 'aprobado' }),
    });
    expect(intentoCiudadano.status).toBe(403);
    await intentoCiudadano.arrayBuffer();

    // Validacion comunitaria: la corroboracion del relevo se acredita por
    // moderacion con motivo (nada pasa a aprobado sin registro).
    await prisma.usuarios.update({ where: { email }, data: { rol: 'moderador' } });
    const loginModerador = await fetch(base + '/api/auth/login', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ email, password: PASSWORD }),
    });
    expect(loginModerador.status).toBe(200);
    const tokenModerador = ((await loginModerador.json()) as any).data.token as string;

    const res = await fetch(base + '/api/activos/' + id + '/estado', {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenModerador },
      body: JSON.stringify({ estado: 'aprobado', motivo: 'corroborado por el relevo in-situ de los vecinos' }),
    });
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data.estado).toBe('aprobado');

    const sello = await prisma.events_raw.findFirst({
      where: { type: 'activo.estado_cambiado', payload: { path: ['activo_id'], equals: id } },
    });
    expect(sello).not.toBeNull();
    expect((sello?.payload as any).estado).toBe('aprobado');
    expect(JSON.stringify(sello?.payload)).not.toContain('@');

    // Sin transicion no hay evento: repetir el mismo estado -> 409.
    const repetido = await fetch(base + '/api/activos/' + id + '/estado', {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenModerador },
      body: JSON.stringify({ estado: 'aprobado' }),
    });
    expect(repetido.status).toBe(409);
    await repetido.arrayBuffer();
  });

  it('GET publico anonimo con bbox sobre caucete: el activo del relevo es visible; bbox ajeno lo excluye', async () => {
    const token = await registrarYLoguear('ncr4-' + ts + '-c@example.test');
    const res = await fetch(base + '/api/activos', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify({
        tipo: 'infraestructura',
        titulo: 'Canal de riego relevado por usuarios',
        nodo_key: 'caucete',
        ...punto,
      }),
    });
    expect(res.status).toBe(201);
    const { id } = ((await res.json()) as any).data;

    // Anonimo, envolvente sobre Caucete -> PostGIS lo encuentra.
    const cerca = await fetch(base + '/api/activos?bbox=-68.60,-31.06,-68.54,-31.01');
    expect(cerca.status).toBe(200);
    const bodyCerca: any = await cerca.json();
    expect(bodyCerca.success).toBe(true);
    expect(bodyCerca.data.some((a: any) => a.id === id)).toBe(true);
    const creado = bodyCerca.data.find((a: any) => a.id === id);
    expect(creado.geometry.type).toBe('Point');

    // Envolvente sobre Buenos Aires -> no lo encuentra (recorte espacial real).
    const lejos = await fetch(base + '/api/activos?bbox=-58.45,-34.62,-58.35,-34.55');
    expect(lejos.status).toBe(200);
    const bodyLejos: any = await lejos.json();
    expect(bodyLejos.data.some((a: any) => a.id === id)).toBe(false);
  });

  it('cruce NC-R2: el dato publico y el relevo in-situ conviven con fuente diferenciada (ADR-035/036)', async () => {
    const feats = await fetch(base + '/api/nodos/caucete/features');
    expect(feats.status).toBe(200);
    const bodyFeats: any = await feats.json();
    expect(bodyFeats.success).toBe(true);

    // Canal publico: features de las capas v6 con estado honesto y fuente
    // declarada (ADR-035: sin sintetico, fuente publica obligatoria).
    const v6 = bodyFeats.data.filter((f: any) => CAPAS_V6.includes(f.layer));
    expect(v6.length, 'features de capas v6 en caucete').toBeGreaterThan(0);
    for (const f of v6) {
      expect(ESTADOS_HONESTOS, 'estado honesto de ' + f.id).toContain(f.estado);
      if (!f.is_synthetic) {
        expect(f.fuente_label, 'fuente declarada de ' + f.id).toBeTruthy();
      }
    }

    // Canal in-situ: el activo relevado por la ciudadania es un canal
    // DISTINTO (created_by_hash) que convive sin fusionarse con el dato
    // publico — puede confirmar, matizar o contradecir; nunca reemplaza.
    const activos = await fetch(base + '/api/activos?bbox=-68.60,-31.06,-68.54,-31.01');
    const bodyActivos: any = await activos.json();
    const relevo = bodyActivos.data.find(
      (a: any) => a.id && String(a.id).startsWith('ncr4') === false && a.created_by_hash,
    );
    const idsFeatures = new Set(v6.map((f: any) => f.id));
    for (const a of bodyActivos.data) {
      expect(idsFeatures.has(a.id), 'el activo in-situ no es un feature publico').toBe(false);
    }
    expect(typeof relevo, 'canal in-situ presente en la lectura publica').toBe('object');
  });
});
