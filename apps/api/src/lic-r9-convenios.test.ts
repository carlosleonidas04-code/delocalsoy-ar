import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// LIC-DLUI LIC-R9 (LIC-09 #456, épica #448): DL-14 — cooperación y convenios,
// extremo a extremo contra servicios reales (PostgreSQL/PostGIS):
// - el convenio es acto institucional: alta SOLO admin (ADR-031) —
//   401 sin JWT, 403 ciudadano
// - contrapartes genéricas sin PII (Ley 25.326/ADR-027): la contraparte con
//   @ es rechazada antes de persistir
// - estados honestos: sin_instrumento_encontrado se declara y se lee (R15 —
//   el vacío se declara, no se maquilla; precedente not_found)
// - sin fuente no hay convenio declarado (patrón DL-13.1 a nivel contrato)
// - idempotencia por hash sha256(contraparte|nodo|objeto|fuente|fecha_corte)
//   → 409
// - sello convenio.declarado con rollback (R4/R15)
// - cobertura «X de N» honesta que nace «0 de N» (DL-5) — jamás ranking
//   entre nodos (R5/ADR-036); aserciones DINÁMICAS sobre N (lección LIC-R1:
//   nunca totales hardcodeados)
// Fixture de escritura en CAUCETE — capital READ-ONLY (patrón LIC-R2..R8).
// Requiere Postgres/PostGIS real (job test de CI); sin base el suite se
// salta (honesto, R5).
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';
process.env.JWT_SECRET = 'test-jwt-secret-lic-r9-convenios-456';

const { createApp } = await import('./app.js');
const prisma = (await import('./lib/prisma.js')).default;
const { ConvenioSchema } = await import('@delocalsoy/contracts');

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

const dbUp = await prisma
  .\$queryRaw\`SELECT 1\`
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

describe.skipIf(!dbUp)('Cooperación y convenios (LIC-DLUI LIC-R9 — #456, épica #448)', () => {
  const ts = Date.now();
  const jsonHeaders = { 'content-type': 'application/json' };
  const PASSWORD = 'contrasena-muy-secreta-8+chars';

  // Tokens con login ÚNICO por email: el rate limit de identidad (R5a, #101:
  // 5 intentos / 300 s por ip + hash de email, contadores en Redis COMPARTIDO
  // entre las suites paralelas de CI) bloquea logins repetidos del mismo email
  // dentro de la suite — el JWT vive 15 min y se reutiliza entre tests.
  let adminToken = '';
  let ciudadanoToken = '';

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

  // Fixture de ESCRITURA en caucete — capital READ-ONLY (patrón LIC-R2..R8).
  function payloadConvenio(overrides: Record<string, unknown> = {}) {
    return {
      nodo_key: 'caucete',
      contraparte: 'Municipalidad de Caucete',
      contraparte_tipo: 'municipal',
      objeto: 'Cooperación para datos abiertos del nodo Caucete',
      estado: 'vigente',
      fuente_key: 'municipio-caucete',
      fecha_corte: '2026-11-13',
      ...overrides,
    };
  }

  it('nace honesto: GET /convenios vacío (R15 — la tabla nace VACÍA) y cobertura «0 de N» dinámica (DL-5)', async () => {
    const res = await fetch(base + '/api/convenios');
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(0);
    expect(body.count).toBe(0);
    // La tabla nace VACÍA (DL-14): declarar la estructura NO es simular datos.
    expect(await prisma.convenios.count()).toBe(0);

    const cob = await fetch(base + '/api/convenios/cobertura');
    expect(cob.status).toBe(200);
    const cobBody: any = await cob.json();
    expect(cobBody.success).toBe(true);
    expect(cobBody.data.regla).toContain('DL-14');
    expect(cobBody.data.nodos_con_convenios).toBe(0);
    expect(cobBody.data.nodos_totales).toBeGreaterThan(0);
    expect(cobBody.data.cobertura).toBe('0 de ' + cobBody.data.nodos_totales); // dinámico, jamás hardcode
    expect(cobBody.data.cautela).toContain('ranking'); // anti-ranking R5/ADR-036
  });

  it('acto institucional: POST sin JWT → 401; ciudadano → 403 (solo admin, ADR-031)', async () => {
    const anon = await fetch(base + '/api/convenios', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(payloadConvenio()),
    });
    expect(anon.status).toBe(401);
    await anon.arrayBuffer();

    ciudadanoToken = await registrarYLoguear('lic-r9-ciudadano-' + ts + '@test.delocalsoy.ar');
    const ciud = await fetch(base + '/api/convenios', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + ciudadanoToken },
      body: JSON.stringify(payloadConvenio()),
    });
    expect(ciud.status).toBe(403);
    await ciud.arrayBuffer();
  });

  it('nodo inexistente → 400 (el nodo es clave del vocabulario)', async () => {
    adminToken = await rolYLoguear('lic-r9-admin-' + ts + '@test.delocalsoy.ar', 'admin');
    expect(adminToken).toBeTruthy();

    const res = await fetch(base + '/api/convenios', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + adminToken },
      body: JSON.stringify(payloadConvenio({ nodo_key: 'nodo_que_no_existe' })),
    });
    expect(res.status).toBe(400);
    const body: any = await res.json();
    expect(body.error).toContain('vocabulario');
  });

  it('anti-PII: contraparte con @ → 400 (Ley 25.326/ADR-027 — la contraparte es un organismo, jamás una persona)', async () => {
    const res = await fetch(base + '/api/convenios', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + adminToken },
      body: JSON.stringify(payloadConvenio({ contraparte: 'juan.perez@example.com' })),
    });
    expect(res.status).toBe(400);
    const body: any = await res.json();
    expect(body.error).toContain('25.326');
  });

  it('E2E: alta admin → 201 + sello convenio.declarado + lectura pública con el convenio', async () => {
    const res = await fetch(base + '/api/convenios', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + adminToken },
      body: JSON.stringify(payloadConvenio()),
    });
    expect(res.status).toBe(201);
    const body: any = await res.json();
    expect(body.success).toBe(true);
    const fila = ConvenioSchema.parse(body.data);
    expect(fila.nodo_key).toBe('caucete');
    expect(fila.estado).toBe('vigente');
    expect(fila.fuente.fuente_key).toBe('municipio-caucete');

    // Sello acotado por convenio_id (patrón NCAP-R1): el sello existe y cita
    // la fila — sin sello no hay escritura acreditada (R4/R15).
    const sello = await prisma.events_raw.findFirst({
      where: { type: 'convenio.declarado', payload: { path: ['convenio_id'], equals: fila.id } },
    });
    expect(sello).toBeTruthy();
    expect((sello!.payload as any).nodo_key).toBe('caucete');

    // Lectura pública: el convenio declarado se ve con su estado.
    const pub = await fetch(base + '/api/convenios?nodo=caucete');
    expect(pub.status).toBe(200);
    const pubBody: any = await pub.json();
    expect(pubBody.count).toBe(1);
    expect(pubBody.data[0].id).toBe(fila.id);
    expect(pubBody.data[0].contraparte).toBe('Municipalidad de Caucete');
  });

  it('idempotencia por hash → 409 (mismo convenio = una sola fila, DL-14)', async () => {
    const res = await fetch(base + '/api/convenios', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + adminToken },
      body: JSON.stringify(payloadConvenio()),
    });
    expect(res.status).toBe(409);
    const body: any = await res.json();
    expect(body.error).toContain('idempotencia');
    expect(await prisma.convenios.count()).toBe(1);
  });

  it('estado honesto sin_instrumento_encontrado se declara y se lee (R15 — el vacío se declara, no se maquilla)', async () => {
    const res = await fetch(base + '/api/convenios', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + adminToken },
      body: JSON.stringify(
        payloadConvenio({
          contraparte: 'Dirección de Economía Social de San Juan',
          contraparte_tipo: 'provincial',
          objeto: 'Registro honesto de búsqueda sin instrumento encontrado',
          estado: 'sin_instrumento_encontrado',
          fuente_key: 'economia-social-sj',
        })
      ),
    });
    expect(res.status).toBe(201);
    const body: any = await res.json();
    expect(body.data.estado).toBe('sin_instrumento_encontrado');

    const filtro = await fetch(base + '/api/convenios?estado=sin_instrumento_encontrado');
    expect(filtro.status).toBe(200);
    const filtroBody: any = await filtro.json();
    expect(filtroBody.count).toBe(1);
    expect(filtroBody.data[0].estado).toBe('sin_instrumento_encontrado');

    // La cobertura cuenta TODOS los convenios declarados (el vacío declarado
    // también es registro — conteo CON cobertura, jamás ranking).
    const cob = await fetch(base + '/api/convenios/cobertura');
    const cobBody: any = await cob.json();
    expect(cobBody.data.nodos_con_convenios).toBe(1);
    expect(cobBody.data.cobertura).toBe('1 de ' + cobBody.data.nodos_totales);
  });

  it('filtros inválidos → 400 (el query se valida, patrón comunicacion)', async () => {
    const res = await fetch(base + '/api/convenios?estado=estado-inexistente');
    expect(res.status).toBe(400);
    await res.arrayBuffer();
  });
});
