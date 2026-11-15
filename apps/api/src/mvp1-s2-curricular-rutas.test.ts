import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// MVP-1 «Atlas Territorial» S2 (RFC-020/021, #532, épica OBJE-CAMPUS #531):
// matriz curricular extremo a extremo contra servicios reales (PostgreSQL/
// PostGIS):
// - la matriz es CATÁLOGO con procedencia por ingesta (ADR-082), NO gestión
//   académica: nace VACÍA (R15) y lo vacío se declara
// - trazabilidad bidireccional curso↔competencia con peso textual (ADR-083);
//   cobertura «X de N» honesta (DL-5) — jamás ranking (R5/ADR-036)
// - alta SOLO admin (ADR-031): 401 sin JWT, 403 ciudadano
// - anti-PII sobre el texto libre ANTES de persistir y sin eco (Ley
//   25.326/ADR-027, ADR-020 cond. 1)
// - el curso no viaja suelto (NC-EV-09): ingesta inexistente → 404;
//   fuente_key que no coincide con la ingesta → 400
// - sin track no hay curso: track desconocido → 400 (catálogo sin huérfanos)
// - idempotencia por hash sha256(key|fuente|fecha_corte) → 409
// - sello curricular.curso_declarado con rollback (R4/R15)
// Fixture de ESCRITURA directo por prisma (ingesta + track de catálogo) —
// el dominio curricular no es territorial: sin nodo. Requiere Postgres/
// PostGIS real (job test de CI); sin base el suite se salta (honesto, R5).
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';
process.env.JWT_SECRET = 'test-jwt-secret-mvp1-s2-curricular-532';

const { createApp } = await import('./app.js');
const prisma = (await import('./lib/prisma.js')).default;
const { CursoVocabularioSchema, MatrizCurricularResponseSchema } = await import('@delocalsoy/contracts');

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

describe.skipIf(!dbUp)('Matriz curricular (MVP-1 S2 — RFC-020/021, #532)', () => {
  const ts = Date.now();
  const jsonHeaders = { 'content-type': 'application/json' };
  const PASSWORD = 'contrasena-muy-secreta-8+chars';

  // Tokens con login ÚNICO por email: el rate limit de identidad (R5a, #101)
  // bloquea logins repetidos del mismo email — el JWT vive 15 min y se
  // reutiliza entre tests.
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

  // Ingesta de procedencia directa por prisma (el dominio curricular no es
  // territorial: la ingesta declara un nodo del vocabulario como ancla del
  // pipeline, pero el catálogo no lleva nodo).
  async function crearIngesta(fuenteKey: string): Promise<string> {
    const ingesta = await prisma.ingestas.create({
      data: {
        source_id: 'mvp1-s2-' + ts + '-' + Math.random().toString(36).slice(2, 8),
        fuente_key: fuenteKey,
        nodo_key: 'caucete',
        capa_servicio: 'corpus_dului_it',
        fecha_acceso: '2026-11-15',
        fecha_corte: '2026-11-15',
        crs_origen: 'EPSG:4326',
        crs_normalizado: 'EPSG:4326',
        escala_precision: 'documento',
        estado: 'publicado',
        created_by_hash: 'a'.repeat(32),
        hash: 'mvp1-s2-ingesta-' + ts + '-' + Math.random().toString(36).slice(2, 8),
      },
    });
    return ingesta.id;
  }

  function payloadCurso(overrides: Record<string, unknown> = {}) {
    return {
      key: 'curso_atlas_territorial_' + ts,
      titulo: 'Atlas Territorial del nodo',
      track_key: 'trayecto_nucleo_' + ts,
      fuente: { fuente_key: 'corpus_dului_it', fecha_corte: '2026-11-15' },
      ingesta_id: 'INGESTA_PLACEHOLDER',
      ...overrides,
    };
  }

  it('nace honesto: matriz y rutas vacías (R15 — el catálogo nace VACÍO, null ≠ 0)', async () => {
    const res = await fetch(base + '/api/curricular');
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.cursos).toHaveLength(0);
    expect(body.data.competencias).toHaveLength(0);
    expect(body.data.vinculos).toHaveLength(0);
    expect(body.data.cobertura.cursos_con_competencias).toBe(0);
    expect(body.data.cobertura.total_cursos).toBe(0);
    expect(body.data.regla).toContain('catálogo');
    expect(body.data.cautela).toContain('ranking');

    const rutas = await fetch(base + '/api/curricular/rutas');
    expect(rutas.status).toBe(200);
    const rutasBody: any = await rutas.json();
    expect(rutasBody.data.tracks).toHaveLength(0);
    expect(rutasBody.data.perfiles).toHaveLength(0);
    expect(rutasBody.data.rutas).toHaveLength(0);

    // Conteo directo de las 7 tablas (R15: la migración nace VACÍA). Este es
    // el primer test del único archivo que escribe estas tablas: las suites
    // corren en paralelo por archivo en CI, así que un conteo global en otro
    // archivo sería una carrera contra los fixtures de este.
    expect(await prisma.courses.count()).toBe(0);
    expect(await prisma.competencies.count()).toBe(0);
    expect(await prisma.course_competencies.count()).toBe(0);
    expect(await prisma.tracks.count()).toBe(0);
    expect(await prisma.perfiles.count()).toBe(0);
    expect(await prisma.learning_paths.count()).toBe(0);
    expect(await prisma.learning_path_steps.count()).toBe(0);
  });

  it('acto de catálogo: POST sin JWT → 401; ciudadano → 403 (solo admin, ADR-031)', async () => {
    const anon = await fetch(base + '/api/curricular/cursos', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(payloadCurso()),
    });
    expect(anon.status).toBe(401);
    await anon.arrayBuffer();

    ciudadanoToken = await registrarYLoguear('mvp1-s2-ciudadano-' + ts + '@test.delocalsoy.ar');
    const ciud = await fetch(base + '/api/curricular/cursos', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + ciudadanoToken },
      body: JSON.stringify(payloadCurso()),
    });
    expect(ciud.status).toBe(403);
    await ciud.arrayBuffer();
  });

  it('anti-PII: titulo con email → 400 sin eco del valor (Ley 25.326/ADR-027, ADR-020 cond. 1)', async () => {
    adminToken = await rolYLoguear('mvp1-s2-admin-' + ts + '@test.delocalsoy.ar', 'admin');
    expect(adminToken).toBeTruthy();

    const res = await fetch(base + '/api/curricular/cursos', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + adminToken },
      body: JSON.stringify(payloadCurso({ titulo: 'Curso de juan.perez@example.com' })),
    });
    expect(res.status).toBe(400);
    const body: any = await res.json();
    expect(body.error).toContain('25.326');
    expect(JSON.stringify(body)).not.toContain('juan.perez@example.com');
  });

  it('el curso no viaja suelto (NC-EV-09): ingesta inexistente → 404; fuente_key que no coincide → 400', async () => {
    const sinIngesta = await fetch(base + '/api/curricular/cursos', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + adminToken },
      body: JSON.stringify(payloadCurso({ ingesta_id: 'ingesta_inexistente_0001' })),
    });
    expect(sinIngesta.status).toBe(404);
    const sinBody: any = await sinIngesta.json();
    expect(sinBody.error).toContain('ingesta');

    const ingestaId = await crearIngesta('corpus_dului_it');
    const malaFuente = await fetch(base + '/api/curricular/cursos', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + adminToken },
      body: JSON.stringify(
        payloadCurso({ ingesta_id: ingestaId, fuente: { fuente_key: 'otra_fuente', fecha_corte: '2026-11-15' } }),
      ),
    });
    expect(malaFuente.status).toBe(400);
    const malaBody: any = await malaFuente.json();
    expect(malaBody.error).toContain('procedencia');
  });

  it('sin track no hay curso: track desconocido → 400 (el catálogo no crea huérfanos, ADR-082)', async () => {
    const ingestaId = await crearIngesta('corpus_dului_it');
    const res = await fetch(base + '/api/curricular/cursos', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + adminToken },
      body: JSON.stringify(payloadCurso({ ingesta_id: ingestaId, track_key: 'trayecto_inexistente_' + ts })),
    });
    expect(res.status).toBe(400);
    const body: any = await res.json();
    expect(body.error).toContain('track');
  });

  it('E2E: alta admin → 201 + sello curricular.curso_declarado + la matriz refleja el curso con cobertura «0 de 1» (DL-5)', async () => {
    const ingestaId = await crearIngesta('corpus_dului_it');
    await prisma.tracks.create({
      data: {
        key: 'trayecto_nucleo_' + ts,
        titulo: 'Trayecto núcleo del corpus',
        tipo: 'nucleo',
        orden: 1,
        fuente_key: 'corpus_dului_it',
        fecha_corte: '2026-11-15',
        ingesta_id: ingestaId,
        created_by_hash: 'a'.repeat(32),
        hash: 'mvp1-s2-track-' + ts + '-' + Math.random().toString(36).slice(2, 8),
      },
    });

    const res = await fetch(base + '/api/curricular/cursos', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + adminToken },
      body: JSON.stringify(payloadCurso({ ingesta_id: ingestaId })),
    });
    expect(res.status).toBe(201);
    const body: any = await res.json();
    expect(body.success).toBe(true);
    const fila = CursoVocabularioSchema.parse(body.data);
    expect(fila.estado).toBe('declarado');
    expect(fila.fuente_key).toBe('corpus_dului_it');

    // Sello acotado por curso_key (patrón NCAP-R1): el sello existe y cita
    // la fila — sin sello no hay escritura acreditada (R4/R15).
    const sello = await prisma.events_raw.findFirst({
      where: { type: 'curricular.curso_declarado', payload: { path: ['curso_key'], equals: fila.key } },
    });
    expect(sello).toBeTruthy();
    expect((sello!.payload as any).ingesta_id).toBe(ingestaId);

    // Lectura pública: la matriz refleja el curso SIN vínculos aún —
    // cobertura «0 de 1» honesta (DL-5), jamás un ranking (ADR-036).
    const pub = await fetch(base + '/api/curricular');
    expect(pub.status).toBe(200);
    const pubBody: any = await pub.json();
    const matriz = MatrizCurricularResponseSchema.parse(pubBody.data);
    expect(matriz.cursos).toHaveLength(1);
    expect(matriz.cobertura.total_cursos).toBe(1);
    expect(matriz.cobertura.cursos_con_competencias).toBe(0);

    // Las rutas reflejan el track declarado con su procedencia.
    const rutas = await fetch(base + '/api/curricular/rutas');
    expect(rutas.status).toBe(200);
    const rutasBody: any = await rutas.json();
    expect(rutasBody.data.tracks).toHaveLength(1);
    expect(rutasBody.data.tracks[0].fuente_key).toBe('corpus_dului_it');
  });

  it('idempotencia por hash → 409 (mismo curso = una sola fila, ADR-082)', async () => {
    const ingestaId = await crearIngesta('corpus_dului_it');
    const res = await fetch(base + '/api/curricular/cursos', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + adminToken },
      body: JSON.stringify(payloadCurso({ ingesta_id: ingestaId })),
    });
    expect(res.status).toBe(409);
    const body: any = await res.json();
    expect(body.error).toContain('idempotencia');
  });
});
