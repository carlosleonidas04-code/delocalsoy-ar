import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// NODO-CAU R2 (#138/#147): catálogo de fuentes espaciales + procedencia por
// conjunto — extremo a extremo contra servicios reales (PostgreSQL/PostGIS +
// Redis):
// - GET /api/fuentes: catálogo público anónimo (31 fuentes: 15 Caucete +
//   16 del Valle de Iglesia NVIG-R5 #172 — con organismo, estado honesto de
//   disponibilidad y cautela) y GET /api/fuentes/:key
// - POST /api/ingestas: alta curada por admin (decisión DH 2026-10-15);
//   NC-EV-09: la ingesta sin fecha de corte/precisión/CRS se rechaza;
//   anti-PII antes de persistir; solo cita fuentes del catálogo (404);
//   pseudónimo sha256 sin PII; sello ingesta.creada; idempotencia por hash
// - PATCH /api/ingestas/:id/estado: pipeline recibido →
//   validado_tecnicamente → validado_territorialmente → publicado
//   (salto inválido 400, mismo estado 409, moderador 403, solo admin)
// - GET /api/ingestas: lectura pública SOLO de lo publicado (R15);
//   ?nodo= filtra por nodo; en curso queda en custodia (404 sin eco)
// - FuenteLabelRealSchema (ADR-035 regla 1) + invariante en features: nada
//   real con label ilustrativo o sin 'Organismo · referencia'
// Requiere Postgres/PostGIS real (job test de CI); sin base el suite se
// salta (honesto, R5).
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';
process.env.JWT_SECRET = 'test-jwt-secret-nodo-cau-r2-procedencia-32-chars';

const { createApp } = await import('./app.js');
const prisma = (await import('./lib/prisma.js')).default;
const { FuenteLabelRealSchema } = await import('@delocalsoy/contracts');

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

describe.skipIf(!dbUp)('fuentes espaciales + procedencia (NODO-CAU R2 — registro de procedencia, #138/#147)', () => {
  const ts = Date.now();
  const jsonHeaders = { 'content-type': 'application/json' };
  const PASSWORD = 'contrasena-muy-secreta-8+chars';

  const TIPOS = ['wms', 'wfs', 'descarga', 'documento', 'api'];
  const ESTADOS = ['disponible', 'requiere_credenciales', 'requiere_solicitud', 'no_disponible', 'deprecado'];
  const KEYS_CAUCETE = [
    'catastro_sj', 'ign', 'unide', 'indec_iiee', 'bahra', 'georef', 'refes',
    'mapa_educativo', 'mapa_cuidado', 'inpres', 'faud_unsj', 'hidraulica_sj',
    'mapbiomas', 'idera', 'redtulum',
  ];
  // NVIG-R5 (#172): 16 fuentes específicas del Valle de Iglesia agregadas al
  // catálogo global por seed-fuentes-vig.sql (trazas #167-#174).
  const KEYS_VIG = [
    'municipio_iglesia', 'decreto_2154_2009', 'ley_24790', 'ley_25291',
    'leyes_patrimonio_sj', 'conicet_garcia_2024', 'michieli_2016', 'pedl_iglesia',
    'cna_2018', 'hidrometria_sj', 'ley_826_g', 'viales_rn150',
    'conectividad_agua_negra', 'ley_2400_t', 'inaes', 'turismo_sj',
  ];

  // Ingesta de referencia: REFES 2026 recortado al departamento Caucete.
  const payloadIngesta = {
    source_id: 'refes-cau-2026-' + ts,
    fuente_key: 'refes',
    nodo_key: 'caucete',
    capa_servicio: 'dataset REFES 2026 — filtro departamento Caucete (código embebido de 14 dígitos)',
    fecha_acceso: '2026-10-11',
    fecha_corte: '2026',
    crs_origen: 'EPSG:4326',
    crs_normalizado: 'EPSG:4326',
    escala_precision: 'punto por establecimiento (id REFES de 14 dígitos)',
    external_id: 'refes-2026-cau',
    transformaciones: 'filtro por código de departamento embebido en el id REFES; sin reproyección',
  };

  let tokenAdmin = '';
  let ingestaId = '';

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
    expect(login.status, 'login ' + email).toBe(200);
    return ((await login.json()) as any).data.token as string;
  }

  it('catálogo público: 31 fuentes (15 Caucete + 16 VIG, NVIG-R5 #172) con organismo, estado honesto y cautela', async () => {
    const res = await fetch(base + '/api/fuentes');
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.success).toBe(true);
    expect(body.count).toBe(31);
    expect(body.data.map((f: any) => f.key).sort()).toEqual([...KEYS_CAUCETE, ...KEYS_VIG].sort());
    for (const f of body.data) {
      expect(f.organismo.length).toBeGreaterThan(3);
      expect(f.cautela.length).toBeGreaterThan(10);
      expect(TIPOS).toContain(f.tipo);
      expect(ESTADOS).toContain(f.estado);
    }
  });

  it('ficha pública: /api/fuentes/ign 200 y clave inexistente 404', async () => {
    const ign = await fetch(base + '/api/fuentes/ign');
    expect(ign.status).toBe(200);
    const bodyIgn: any = await ign.json();
    expect(bodyIgn.data.organismo).toContain('IGN');
    expect(bodyIgn.data.tipo).toBe('wfs');

    const falta = await fetch(base + '/api/fuentes/fuente-inventada');
    expect(falta.status).toBe(404);
    await falta.arrayBuffer();
  });

  it('estados honestos del catálogo (#147): unide, refes, redtulum e ign', async () => {
    const res = await fetch(base + '/api/fuentes');
    const body: any = await res.json();
    const por = (key: string) => body.data.find((f: any) => f.key === key);
    expect(por('unide').estado).toBe('requiere_credenciales');
    expect(por('refes').estado).toBe('requiere_solicitud');
    expect(por('redtulum').estado).toBe('no_disponible');
    expect(por('ign').estado).toBe('disponible');
  });

  it('POST /api/ingestas sin sesión 401 y ciudadano 403 (curaduría admin)', async () => {
    const anon = await fetch(base + '/api/ingestas', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(payloadIngesta),
    });
    expect(anon.status).toBe(401);
    await anon.arrayBuffer();

    const tokenCiudadano = await registrarYLoguear('nc-r2-' + ts + '-ciu@example.test');
    const ciudadano = await fetch(base + '/api/ingestas', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenCiudadano },
      body: JSON.stringify(payloadIngesta),
    });
    expect(ciudadano.status).toBe(403);
    await ciudadano.arrayBuffer();
  });

  it('NC-EV-09: la ingesta incompleta se rechaza (fecha de corte, precisión, CRS)', async () => {
    tokenAdmin = await rolYLoguear('nc-r2-' + ts + '-adm@example.test', 'admin');
    const authHeaders = { ...jsonHeaders, authorization: 'Bearer ' + tokenAdmin };

    const sinCorte = await fetch(base + '/api/ingestas', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ ...payloadIngesta, fecha_corte: undefined }),
    });
    expect(sinCorte.status).toBe(400);
    await sinCorte.arrayBuffer();

    const sinPrecision = await fetch(base + '/api/ingestas', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ ...payloadIngesta, escala_precision: undefined }),
    });
    expect(sinPrecision.status).toBe(400);
    await sinPrecision.arrayBuffer();

    const sinCrs = await fetch(base + '/api/ingestas', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ ...payloadIngesta, crs_origen: undefined }),
    });
    expect(sinCrs.status).toBe(400);
    await sinCrs.arrayBuffer();
  });

  it('la ingesta solo cita fuentes del catálogo: clave inventada 404', async () => {
    const res = await fetch(base + '/api/ingestas', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenAdmin },
      body: JSON.stringify({ ...payloadIngesta, fuente_key: 'fuente_inventada' }),
    });
    expect(res.status).toBe(404);
    await res.arrayBuffer();
  });

  it('ingesta válida: 201 recibido, pseudónimo sin PII, sello ingesta.creada e idempotencia', async () => {
    const antes = await prisma.ingestas.count();

    const res = await fetch(base + '/api/ingestas', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenAdmin },
      body: JSON.stringify(payloadIngesta),
    });
    expect(res.status).toBe(201);
    const body: any = await res.json();
    const ingesta = body.data;
    ingestaId = ingesta.id;
    expect(ingesta.estado).toBe('recibido');
    expect(ingesta.fecha_corte).toBe('2026');
    expect(ingesta.fuente_key).toBe('refes');
    expect(ingesta.created_by_hash).toMatch(/^[0-9a-f]{32}$/);

    // Sello en la fuente de verdad: ingesta.creada con el id, sin PII.
    const sello = await prisma.events_raw.findFirst({
      where: { type: 'ingesta.creada', payload: { path: ['ingesta_id'], equals: ingesta.id } },
    });
    expect(sello).not.toBeNull();
    const selloTexto = JSON.stringify(sello?.payload);
    expect(selloTexto).not.toContain('@');
    expect(selloTexto).not.toContain('example.test');

    // Idempotencia: el mismo conjunto no duplica la ingesta.
    const repetido = await fetch(base + '/api/ingestas', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenAdmin },
      body: JSON.stringify(payloadIngesta),
    });
    expect(repetido.status).toBe(200);
    const bodyRepetido: any = await repetido.json();
    expect(bodyRepetido.idempotente).toBe(true);
    expect(bodyRepetido.data.id).toBe(ingestaId);

    expect(await prisma.ingestas.count()).toBe(antes + 1);
  });

  it('pipeline de procedencia: salto 400, moderador 403, admin paso a paso, repetido 409', async () => {
    const authHeaders = { ...jsonHeaders, authorization: 'Bearer ' + tokenAdmin };

    // Salto directo: recibido → publicado no existe (solo hacia adelante).
    const salto = await fetch(base + '/api/ingestas/' + ingestaId + '/estado', {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ estado: 'publicado' }),
    });
    expect(salto.status).toBe(400);
    await salto.arrayBuffer();

    // Solo admin mueve el pipeline (decisión DH 2026-10-15).
    const tokenModerador = await rolYLoguear('nc-r2-' + ts + '-mod@example.test', 'moderador');
    const intentoModerador = await fetch(base + '/api/ingestas/' + ingestaId + '/estado', {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenModerador },
      body: JSON.stringify({ estado: 'validado_tecnicamente' }),
    });
    expect(intentoModerador.status).toBe(403);
    await intentoModerador.arrayBuffer();

    // Paso a paso: recibido → validado_tecnicamente → validado_territorialmente → publicado.
    const pasos = ['validado_tecnicamente', 'validado_territorialmente', 'publicado'];
    for (const estado of pasos) {
      const paso = await fetch(base + '/api/ingestas/' + ingestaId + '/estado', {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ estado }),
      });
      expect(paso.status, 'transición a ' + estado).toBe(200);
      const bodyPaso: any = await paso.json();
      expect(bodyPaso.data.estado).toBe(estado);
    }

    // Sello de la publicación en la fuente de verdad.
    const sello = await prisma.events_raw.findFirst({
      where: {
        type: 'ingesta.estado_cambiado',
        AND: [
          { payload: { path: ['ingesta_id'], equals: ingestaId } },
          { payload: { path: ['estado'], equals: 'publicado' } },
        ],
      },
    });
    expect(sello).not.toBeNull();
    expect((sello?.payload as any).estado_anterior).toBe('validado_territorialmente');
    expect(JSON.stringify(sello?.payload)).not.toContain('@');

    // 'publicado' es terminal: repetir el mismo estado → 409.
    const repetido = await fetch(base + '/api/ingestas/' + ingestaId + '/estado', {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ estado: 'publicado' }),
    });
    expect(repetido.status).toBe(409);
    await repetido.arrayBuffer();
  });

  it('lectura pública: solo lo publicado, filtrada por nodo, con CRS normalizado', async () => {
    const cerca = await fetch(base + '/api/ingestas?nodo=caucete');
    expect(cerca.status).toBe(200);
    const bodyCerca: any = await cerca.json();
    const publicada = bodyCerca.data.find((i: any) => i.id === ingestaId);
    expect(publicada, 'la ingesta publicada no aparece en caucete').toBeDefined();
    expect(publicada.estado).toBe('publicado');
    expect(publicada.fuente_key).toBe('refes');

    const capital = await fetch(base + '/api/ingestas?nodo=capital');
    expect(capital.status).toBe(200);
    const bodyCapital: any = await capital.json();
    expect(bodyCapital.data.some((i: any) => i.id === ingestaId)).toBe(false);

    const ficha = await fetch(base + '/api/ingestas/' + ingestaId);
    expect(ficha.status).toBe(200);
    const bodyFicha: any = await ficha.json();
    expect(bodyFicha.data.crs_normalizado).toBe('EPSG:4326');

    // En curso no se publica: la segunda ingesta queda en custodia (404, R15).
    const segunda = await fetch(base + '/api/ingestas', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenAdmin },
      body: JSON.stringify({
        ...payloadIngesta,
        source_id: 'indec-cau-2022-' + ts,
        fuente_key: 'indec_iiee',
        capa_servicio: 'radios censales CNPHV 2022 — departamento Caucete',
        fecha_corte: '2022',
        escala_precision: 'escala censal: radio/radio fracción, no barrios',
        external_id: 'indec-2022-cau',
        transformaciones: 'recorte al departamento Caucete; sin reproyección',
      }),
    });
    expect(segunda.status).toBe(201);
    const bodySegunda: any = await segunda.json();
    const noPublicada = await fetch(base + '/api/ingestas/' + bodySegunda.data.id);
    expect(noPublicada.status).toBe(404);
    await noPublicada.arrayBuffer();
  });

  it('ADR-035 regla 1: labels reales con Organismo · referencia; invariante en features', async () => {
    // El contrato rechaza lo ilustrativo y lo que no cita organismo.
    expect(FuenteLabelRealSchema.safeParse('Ilustrativa · plaza de demo').success).toBe(false);
    expect(FuenteLabelRealSchema.safeParse('INPRES zonificación 1977').success).toBe(false);
    expect(
      FuenteLabelRealSchema.safeParse('INPRES · Zonificación sísmica nacional (terremoto de Caucete 1977)').success,
    ).toBe(true);

    // Invariante del registro: nada real con label ilustrativo o sin separador.
    const invariantes = await prisma.$queryRaw<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM features WHERE is_synthetic = false AND (fuente_label LIKE 'Ilustrativa%' OR fuente_label NOT LIKE '%·%')`;
    expect(invariantes[0].n).toBe(0);
  });

  it('sellos seed: 15 fuente.registrada de seed-cau-r2 (catálogo multinodo), payload sin PII', async () => {
    // NVIG-R5 (#172): los sellos seed-fuente-* ahora son multinodo (15
    // Caucete + 16 VIG) — se filtran por payload.source para que la
    // acreditación NODO-CAU R2 no dependa del tamaño del catálogo global.
    const sellos = await prisma.events_raw.findMany({
      where: { type: 'fuente.registrada', payload: { path: ['source'], equals: 'seed-cau-r2' } },
    });
    expect(sellos.length).toBe(15);

    const ign = await prisma.events_raw.findFirst({ where: { type: 'fuente.registrada', hash: 'seed-fuente-ign' } });
    expect(ign).not.toBeNull();
    expect((ign?.payload as any).key).toBe('ign');
    expect((ign?.payload as any).organismo).toContain('IGN');
    expect((ign?.payload as any).source).toBe('seed-cau-r2');
    expect(Object.keys((ign?.payload as any) ?? {}).sort()).toEqual(['key', 'organismo', 'source']);
  });

  it('seed idempotente: re-ejecutar db:seed no duplica fuentes ni sellos', async () => {
    const antes = await Promise.all([
      prisma.fuentes.count(),
      prisma.events_raw.count({ where: { type: 'fuente.registrada' } }),
    ]);
    execSync('pnpm --filter @delocalsoy/db db:seed', { cwd: repoRoot, stdio: 'pipe' });
    const despues = await Promise.all([
      prisma.fuentes.count(),
      prisma.events_raw.count({ where: { type: 'fuente.registrada' } }),
    ]);
    expect(despues).toEqual(antes);
  }, 60000);
});
