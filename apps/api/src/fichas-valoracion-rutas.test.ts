import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// NODO-CAU R4 (#149): fichas de valoración comunitaria del espacio público —
// extremo a extremo contra servicios reales (PostgreSQL/PostGIS + Redis):
// - POST /api/fichas-valoracion: ciudadano autenticado valora → 201
//   'testimonio' (anclado al feature seed-f-cau-204 de public_space de
//   caucete), pseudónimo sha256 sin PII, sello ficha_valoracion.propuesta,
//   anti-PII antes de persistir, idempotencia por hash único
// - GET /api/fichas-valoracion: lectura pública anónima con recorte bbox
//   por la geometría del ESPACIO ancla (PostGIS real) y estado derivado
//   validado|testimonio ('descartada' nunca se publica)
// - PATCH /api/fichas-valoracion/:id/estado: 403 ciudadano, corroborar sin
//   corroboracion 400, moderador 200 con sello, repetido 409
// Requiere Postgres/PostGIS real (job test de CI); sin base el suite se
// salta (honesto, R5).
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';
process.env.JWT_SECRET = 'test-jwt-secret-nodo-cau-r4-ficha-valoracion-32-chars';

const { createApp } = await import('./app.js');
const prisma = (await import('./lib/prisma.js')).default;

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

const dbUp = await prisma
  .$queryRaw`SELECT 1`
  .then(() => true)
  .catch(() => false);

let server: any;
let base = '';

beforeAll(async () => {
  execSync('pnpm --filter @delocalsoy/db db:seed', { cwd: repoRoot, stdio: 'pipe' });
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

describe.skipIf(!dbUp)('fichas de valoración (NODO-CAU R4 — testimonio comunitario, #149)', () => {
  const ts = Date.now();
  const jsonHeaders = { 'content-type': 'application/json' };
  const PASSWORD = 'contrasena-muy-secreta-8+chars';

  // Espacio ancla: feature de la capa public_space de caucete (v6, #143).
  const ESPACIO = 'seed-f-cau-204'; // 'Plaza con mobiliario a mejorar' (-31.379, -68.283)
  const bboxCaucete = '-68.30,-31.40,-68.26,-31.36';
  const bboxBuenosAires = '-58.45,-34.62,-58.35,-34.55';

  const respuestasValidas = {
    usos_vitalidad: {
      usos_detectados: ['recreo', 'deporte'],
      nivel_actividad: 'media',
      observaciones: 'Espacio con uso familiar a la tarde',
    },
    accesibilidad: { rampa_acceso: 'parcial', estado_vereda: 'regular', obstaculos: false },
    sombra_arbolado: {
      arbolado_presente: true,
      sombra_horario_central: 'parcial',
      lectura_3_30_300: 'Se observan 4 árboles maduros',
    },
    agua_xerojardin: { riego: 'no', perdidas_visibles: false, especies_apto_clima: 'desconocido' },
    seguridad_disenio: {
      iluminacion: 'regular',
      visibilidad: 'buena',
      mantenimiento: 'regular',
      destinos_activos_cercanos: true,
    },
    equipamiento: { bancos: true, juegos_infantiles: false, canchas: true, basureros: true, bebedero: false, otro: 'Pérgola de sombra' },
    custodia: { custodia_presente: false, tipo_acuerdo: 'ninguno' },
    notas: 'Plaza con potencial de mejora del mobiliario',
  };

  let tokenCiudadano = '';
  let emailCiudadano = '';
  let fichaId = '';

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

  it('POST sin sesión → 401 (el testimonio exige identidad)', async () => {
    const res = await fetch(base + '/api/fichas-valoracion', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ nodo_key: 'caucete', feature_id: ESPACIO, version: 'v1', respuestas: respuestasValidas }),
    });
    expect(res.status).toBe(401);
    await res.arrayBuffer();
  });

  it('ciudadano valora: 201 estado testimonio, pseudónimo sin PII y sello en events_raw', async () => {
    emailCiudadano = 'nc-r4-' + ts + '-a@example.test';
    tokenCiudadano = await registrarYLoguear(emailCiudadano);

    const res = await fetch(base + '/api/fichas-valoracion', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenCiudadano },
      body: JSON.stringify({ nodo_key: 'caucete', feature_id: ESPACIO, version: 'v1', respuestas: respuestasValidas }),
    });
    expect(res.status).toBe(201);
    const body: any = await res.json();
    const ficha = body.data;
    fichaId = ficha.id;
    expect(ficha.estado).toBe('testimonio');
    expect(ficha.version).toBe('v1');
    expect(ficha.nodo_key).toBe('caucete');
    expect(ficha.feature_id).toBe(ESPACIO);
    expect(ficha.created_by_hash).toMatch(/^[0-9a-f]{32}$/);
    expect(ficha.respuestas.usos_vitalidad.usos_detectados).toContain('recreo');

    // Sello en la fuente de verdad: ficha_valoracion.propuesta con el id, sin PII.
    const sello = await prisma.events_raw.findFirst({
      where: { type: 'ficha_valoracion.propuesta', payload: { path: ['ficha_id'], equals: ficha.id } },
    });
    expect(sello).not.toBeNull();
    const selloTexto = JSON.stringify(sello?.payload);
    expect(selloTexto).not.toContain('@');
    expect(selloTexto).not.toContain('example.test');
  });

  it('idempotencia: re-POST del mismo payload con el mismo ciudadano → 200 idempotente, sin duplicar', async () => {
    const antes = await prisma.fichas_valoracion.count({ where: { feature_id: ESPACIO } });

    const res = await fetch(base + '/api/fichas-valoracion', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenCiudadano },
      body: JSON.stringify({ nodo_key: 'caucete', feature_id: ESPACIO, version: 'v1', respuestas: respuestasValidas }),
    });
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.idempotente).toBe(true);
    expect(body.data.id).toBe(fichaId);

    const despues = await prisma.fichas_valoracion.count({ where: { feature_id: ESPACIO } });
    expect(despues).toBe(antes);
  });

  it('GET público anónimo con bbox: el testimonio aparece en Caucete y no en Buenos Aires', async () => {
    const cerca = await fetch(base + '/api/fichas-valoracion?bbox=' + bboxCaucete);
    expect(cerca.status).toBe(200);
    const bodyCerca: any = await cerca.json();
    expect(bodyCerca.success).toBe(true);
    const creado = bodyCerca.data.find((f: any) => f.id === fichaId);
    expect(creado, 'la ficha no aparece en el bbox de Caucete').toBeDefined();
    expect(creado.estado_publico).toBe('testimonio');
    expect(creado.feature_titulo).toBe('Plaza con mobiliario a mejorar');
    expect(creado.geometry.type).toBe('Point');

    const lejos = await fetch(base + '/api/fichas-valoracion?bbox=' + bboxBuenosAires);
    expect(lejos.status).toBe(200);
    const bodyLejos: any = await lejos.json();
    expect(bodyLejos.data.some((f: any) => f.id === fichaId)).toBe(false);
  });

  it('anclaje: feature de otra capa (hydrology) → 404 — la ficha no inventa espacios', async () => {
    const token = await registrarYLoguear('nc-r4-' + ts + '-b@example.test');
    const res = await fetch(base + '/api/fichas-valoracion', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify({
        nodo_key: 'caucete',
        feature_id: 'seed-f-cau-201', // acequia (hydrology), NO public_space
        version: 'v1',
        respuestas: respuestasValidas,
      }),
    });
    expect(res.status).toBe(404);
    await res.arrayBuffer();
  });

  it('anti-PII: notas con email → 400 antes de persistir y sin eco del valor', async () => {
    const token = await registrarYLoguear('nc-r4-' + ts + '-c@example.test');
    const res = await fetch(base + '/api/fichas-valoracion', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify({
        nodo_key: 'caucete',
        feature_id: ESPACIO,
        version: 'v1',
        respuestas: {
          ...respuestasValidas,
          notas: 'contacto: juan.perez@example.com',
        },
      }),
    });
    expect(res.status).toBe(400);
    const texto = JSON.stringify(await res.json());
    expect(texto).not.toContain('juan.perez@example.com');
  });

  it('contrato: usos_detectados vacío → 400 (validación Zod de las 7 dimensiones)', async () => {
    const token = await registrarYLoguear('nc-r4-' + ts + '-d@example.test');
    const res = await fetch(base + '/api/fichas-valoracion', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify({
        nodo_key: 'caucete',
        feature_id: ESPACIO,
        version: 'v1',
        respuestas: {
          ...respuestasValidas,
          usos_vitalidad: { ...respuestasValidas.usos_vitalidad, usos_detectados: [] },
        },
      }),
    });
    expect(res.status).toBe(400);
    const texto = JSON.stringify(await res.json());
    expect(texto).toContain('Debe detectarse al menos un uso del espacio');
  });

  it('moderación: ciudadano 403, corroborar sin corroboracion 400, moderador 200 con sello, repetido 409, descartada no se publica', async () => {
    // El ciudadano no modera: solo moderador|admin (ADR-031).
    const intentoCiudadano = await fetch(base + '/api/fichas-valoracion/' + fichaId + '/estado', {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenCiudadano },
      body: JSON.stringify({ estado: 'corroborada', corroboracion: 'individual' }),
    });
    expect(intentoCiudadano.status).toBe(403);
    await intentoCiudadano.arrayBuffer();

    // Promoción de sistema (moderador) + login nuevo → token con rol.
    await prisma.usuarios.update({ where: { email: emailCiudadano }, data: { rol: 'moderador' } });
    const loginModerador = await fetch(base + '/api/auth/login', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ email: emailCiudadano, password: PASSWORD }),
    });
    expect(loginModerador.status).toBe(200);
    const tokenModerador = ((await loginModerador.json()) as any).data.token as string;

    // Corroborar exige declarar quién corrobora (#149): sin corroboracion → 400.
    const sinCorroboracion = await fetch(base + '/api/fichas-valoracion/' + fichaId + '/estado', {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenModerador },
      body: JSON.stringify({ estado: 'corroborada' }),
    });
    expect(sinCorroboracion.status).toBe(400);
    await sinCorroboracion.arrayBuffer();

    const res = await fetch(base + '/api/fichas-valoracion/' + fichaId + '/estado', {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenModerador },
      body: JSON.stringify({ estado: 'corroborada', corroboracion: 'individual', motivo: 'verificado en la recorrida del espacio' }),
    });
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data.estado).toBe('corroborada');
    expect(body.data.corroboracion).toBe('individual');

    // Sello de la transición en la fuente de verdad.
    const sello = await prisma.events_raw.findFirst({
      where: { type: 'ficha_valoracion.estado_cambiado', payload: { path: ['ficha_id'], equals: fichaId } },
    });
    expect(sello).not.toBeNull();
    expect((sello?.payload as any).estado).toBe('corroborada');
    expect((sello?.payload as any).corroboracion).toBe('individual');

    // La lectura pública deriva el estado: corroborada → 'validado'.
    const corroborada = await fetch(base + '/api/fichas-valoracion?bbox=' + bboxCaucete);
    const bodyCorroborada: any = await corroborada.json();
    const publicada = bodyCorroborada.data.find((f: any) => f.id === fichaId);
    expect(publicada.estado_publico).toBe('validado');

    // Sin transición no hay evento: repetir el mismo estado → 409.
    const repetido = await fetch(base + '/api/fichas-valoracion/' + fichaId + '/estado', {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenModerador },
      body: JSON.stringify({ estado: 'corroborada', corroboracion: 'individual' }),
    });
    expect(repetido.status).toBe(409);
    await repetido.arrayBuffer();

    // Descartada: el testimonio se retira de la lectura pública (ADR-036).
    const descarte = await fetch(base + '/api/fichas-valoracion/' + fichaId + '/estado', {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenModerador },
      body: JSON.stringify({ estado: 'descartada', motivo: 'espacio relevado en otra instancia' }),
    });
    expect(descarte.status).toBe(200);
    await descarte.arrayBuffer();

    const trasDescarte = await fetch(base + '/api/fichas-valoracion?bbox=' + bboxCaucete);
    const bodyDescarte: any = await trasDescarte.json();
    expect(bodyDescarte.data.some((f: any) => f.id === fichaId)).toBe(false);
  });
});
