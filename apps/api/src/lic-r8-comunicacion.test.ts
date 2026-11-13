import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// LIC-DLUI LIC-R8 (LIC-08 #451, épica #448): DL-13 — comunicación pública
// honesta, extremo a extremo contra servicios reales (PostgreSQL/PostGIS):
// - canon DLUI-569 como ley interna: la comunicación JAMÁS sustituye la
//   evidencia — sin fuente no hay aviso (el alta sin fuente es 400 a nivel
//   contrato, DL-13.1)
// - la plataforma traduce, jamás alerta: el aviso cita y enlaza la fuente
//   oficial — no sirena (R5/ADR-036)
// - caducidad honesta: el aviso de riesgo exige caduca_en (DL-13.3)
// - anti-infodemia: un desmentido se publica con certeza rumor_descartado
//   (DL-13.4)
// - alta curada SOLO admin (R15 estricta, patrón /api/salud/agregados):
//   401 sin JWT, 403 ciudadano/moderador
// - idempotencia por hash sha256(titulo|nodo|fuente|fecha_corte) → 409
// - sello comunicacion.aviso_publicado con rollback (R4/R15)
// - cobertura «X de N» honesta que nace «0 de N» (DL-5) — jamás ranking
//   entre nodos (R5/ADR-036); aserciones DINÁMICAS sobre N (lección LIC-R1:
//   nunca totales hardcodeados)
// Fixture de escritura en CAUCETE — capital READ-ONLY (patrón LIC-R2..R7).
// Requiere Postgres/PostGIS real (job test de CI); sin base el suite se
// salta (honesto, R5).
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';
process.env.JWT_SECRET = 'test-jwt-secret-lic-r8-comunicacion-451';

const { createApp } = await import('./app.js');
const prisma = (await import('./lib/prisma.js')).default;
const { AvisoSchema } = await import('@delocalsoy/contracts');

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

describe.skipIf(!dbUp)('Comunicación pública honesta (LIC-DLUI LIC-R8 — #451, épica #448)', () => {
  const ts = Date.now();
  const jsonHeaders = { 'content-type': 'application/json' };
  const PASSWORD = 'contrasena-muy-secreta-8+chars';

  // Tokens con login ÚNICO por email: el rate limit de identidad (R5a, #101:
  // 5 intentos / 300 s por ip + hash de email, contadores en Redis COMPARTIDO
  // entre las suites paralelas de CI) bloquea logins repetidos del mismo email
  // dentro de la suite — el JWT vive 15 min y se reutiliza entre tests.
  let adminToken = '';

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

  async function rolYLoguear(email: string, rol: string): Promise<string> {
    await registrarYLoguear(email);
    await prisma.usuarios.update({ where: { email }, data: { rol } });
    const login = await fetch(base + '/api/auth/login', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ email, password: PASSWORD }),
    });
    expect(login.status).toBe(200);
    return ((await login.json()) as any).data.token as string;
  }

  // Fixture de ESCRITURA en caucete — capital READ-ONLY (patrón LIC-R2..R7).
  function payloadAviso(overrides: Record<string, unknown> = {}) {
    return {
      nodo_key: 'caucete',
      titulo: 'Vientos zonda en el departamento Caucete',
      cuerpo:
        'El SMN reporta vientos zonda con ráfagas para el departamento Caucete. La plataforma traduce el parte oficial: consulte la fuente citada y no sustituye el sistema de alerta operativa.',
      tipo: 'riesgo_climatico',
      caduca_en: '2027-01-31', // fecha futura — el aviso nace publicado y vigente
      fuente_key: 'smn',
      fecha_corte: '2026-11-12',
      certeza: 'verificado',
      ...overrides,
    };
  }

  it('nace honesto: GET /avisos vacío (R15 — la tabla nace VACÍA) y cobertura «0 de N» dinámica (DL-5)', async () => {
    const res = await fetch(base + '/api/comunicacion/avisos');
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(0);
    expect(body.count).toBe(0);
    // La tabla nace VACÍA (DL-13): declarar la estructura NO es simular datos.
    expect(await prisma.avisos.count()).toBe(0);

    const cob = await fetch(base + '/api/comunicacion/cobertura');
    expect(cob.status).toBe(200);
    const cobBody: any = await cob.json();
    expect(cobBody.success).toBe(true);
    expect(cobBody.data.reglas ?? cobBody.data.regla).toContain('DL-13');
    expect(cobBody.data.nodos_con_avisos).toBe(0);
    expect(cobBody.data.nodos_totales).toBeGreaterThan(0);
    expect(cobBody.data.cobertura).toBe('0 de ' + cobBody.data.nodos_totales); // dinámico, jamás hardcode
    expect(cobBody.data.cautela).toContain('ranking'); // anti-ranking R5/ADR-036
  });

  it('DL-13.1: POST sin fuente → 400 (un aviso sin fuente no se publica, no existe)', async () => {
    const token = await rolYLoguear('licr8-' + ts + '-admin@example.test', 'admin');
    adminToken = token;
    const { fuente_key: _fk, fecha_corte: _fc, certeza: _c, ...sinFuente } = payloadAviso();
    const res = await fetch(base + '/api/comunicacion/avisos', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify(sinFuente),
    });
    expect(res.status).toBe(400);
    const body: any = await res.json();
    expect(body.success).toBe(false);
  });

  it('DL-13.3: POST de riesgo sin caduca_en → 400 (caducidad honesta obligatoria)', async () => {
    const token = adminToken;
    expect(token, 'token del admin (login único por email — R5a)').toBeTruthy();
    const { caduca_en: _c, ...sinCaducidad } = payloadAviso();
    const res = await fetch(base + '/api/comunicacion/avisos', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify(sinCaducidad),
    });
    expect(res.status).toBe(400);
    await res.arrayBuffer();
  });

  it('DL-13.4: POST de desmentido con certeza verificado → 400 (el desmentido se publica con rumor_descartado)', async () => {
    const token = adminToken;
    expect(token).toBeTruthy();
    const res = await fetch(base + '/api/comunicacion/avisos', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify(
        payloadAviso({
          tipo: 'desmentido',
          certeza: 'verificado', // contradictorio — el refine DL-13.4 lo rechaza
          titulo: 'Desmentido: no hay corte de agua en Caucete',
          caduca_en: undefined,
        }),
      ),
    });
    expect(res.status).toBe(400);
    await res.arrayBuffer();
  });

  it('E2E: admin publica aviso con fuente → 201 + fila válida + sello comunicacion.aviso_publicado + visible en GET', async () => {
    const token = adminToken;
    expect(token).toBeTruthy();

    const res = await fetch(base + '/api/comunicacion/avisos', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify(payloadAviso()),
    });
    expect(res.status).toBe(201);
    const body: any = await res.json();
    expect(body.success).toBe(true);
    expect(() => AvisoSchema.parse(body.data)).not.toThrow();
    expect(body.data.nodo_key).toBe('caucete');
    expect(body.data.estado).toBe('publicado');
    expect(body.data.fuente.fuente_key).toBe('smn');
    expect(body.data.fuente.certeza).toBe('verificado');
    const avisoId = body.data.id as string;

    // Sello del acto (fuente de verdad), ACOTADO por aviso_id (patrón NCAP-R1:
    // un count global de events_raw es racy bajo suites paralelas).
    const sellos: any[] = await prisma.events_raw.findMany({
      where: { type: 'comunicacion.aviso_publicado', payload: { path: ['aviso_id'], equals: avisoId } },
    });
    expect(sellos.length).toBe(1);
    expect(sellos[0].payload.fuente_key).toBe('smn');
    expect(sellos[0].payload.fecha_corte).toBe('2026-11-12');
    expect(JSON.stringify(sellos[0].payload)).not.toContain('@'); // sin PII

    // La lectura pública ahora sirve el aviso publicado.
    const get = await fetch(base + '/api/comunicacion/avisos?nodo=caucete');
    expect(get.status).toBe(200);
    const getBody: any = await get.json();
    expect(getBody.data.length).toBeGreaterThanOrEqual(1);
    expect(getBody.data.some((a: any) => a.id === avisoId)).toBe(true);
  });

  it('idempotencia: re-POST idéntico → 409 (hash único — no duplica, DL-13)', async () => {
    const token = adminToken;
    expect(token).toBeTruthy();
    const res = await fetch(base + '/api/comunicacion/avisos', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify(payloadAviso()),
    });
    expect(res.status).toBe(409);
    const body: any = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('idempotencia');
  });

  it('cobertura honesta: «1 de N» después del alta — aserción DINÁMICA sobre N (lección LIC-R1)', async () => {
    const cob = await fetch(base + '/api/comunicacion/cobertura');
    expect(cob.status).toBe(200);
    const cobBody: any = await cob.json();
    expect(cobBody.data.nodos_con_avisos).toBe(1);
    expect(cobBody.data.cobertura).toBe('1 de ' + cobBody.data.nodos_totales);
    const caucete = cobBody.data.detalle.find((d: any) => d.nodo_key === 'caucete');
    expect(caucete.avisos_publicados).toBe(1);
    // El resto de los nodos sigue en 0 honesto (jamás ranking — DL-13.6).
    for (const d of cobBody.data.detalle.filter((x: any) => x.nodo_key !== 'caucete')) {
      expect(d.avisos_publicados).toBe(0);
    }
  });

  it('R15 estricta: POST sin JWT → 401 y con rol ciudadano → 403 (alta curada solo admin)', async () => {
    const sinJwt = await fetch(base + '/api/comunicacion/avisos', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(payloadAviso()),
    });
    expect(sinJwt.status).toBe(401);
    await sinJwt.arrayBuffer();

    const tokenCiu = await registrarYLoguear('licr8-' + ts + '-ciu@example.test');
    const ciu = await fetch(base + '/api/comunicacion/avisos', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenCiu },
      body: JSON.stringify(payloadAviso()),
    });
    expect(ciu.status).toBe(403);
    await ciu.arrayBuffer();
  });

  it('filtros inválidos → 400 y nodo inexistente → 400 (el nodo es clave del vocabulario)', async () => {
    const token = adminToken;
    expect(token).toBeTruthy();

    const filtroMalo = await fetch(base + '/api/comunicacion/avisos?tipo=tipo-inexistente');
    expect(filtroMalo.status).toBe(400);
    await filtroMalo.arrayBuffer();

    const nodoMalo = await fetch(base + '/api/comunicacion/avisos', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify(payloadAviso({ nodo_key: 'nodo_que_no_existe' })),
    });
    expect(nodoMalo.status).toBe(400);
    const body: any = await nodoMalo.json();
    expect(body.error).toContain('vocabulario');
  });
});
