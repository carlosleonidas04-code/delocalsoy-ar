import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// LIC-DLUI LIC-R4 (LIC-04 #455, épica #448): capas de amenaza sísmica con
// procedencia por ingesta + dashboard de cobertura — extremo a extremo
// contra servicios reales (PostgreSQL/PostGIS):
// - seed-lic-r4-amenaza-sismica.sql: capa 'seismic_risk' declarada para
//   capital e iglesia (caucete ya la tenía de CORE-003 #83) + sellos
//   capa.registrada source 'seed-lic-r4' (reutiliza el sello de la matriz,
//   sin fila nueva — regla 5 por reutilización), idempotentes por hash
// - GET /api/amenazas: catálogo público derivado capas × ingestas
//   publicadas (capa_servicio = capas.key, DL-9 — patrón #147/EV-049);
//   regla metadatos-antes-de-capa: sin ingesta publicada el nodo queda
//   'declarada' con ingesta null (R15: null ≠ 0)
// - GET /api/amenazas/cobertura: dashboard honesto «X de N distritos» +
//   fecha de corte; nace «0 de 3» con fecha null (criterio de cierre #455)
// - E2E publicación: admin crea la ingesta INPRES (NC-EV-09: fecha de
//   corte/CRS/escala) y avanza el pipeline recibido → validado_tecnicamente
//   → validado_territorialmente → publicado; SOLO entonces la capa del
//   nodo pasa a 'publicada' con metadatos y la cobertura pasa a «1 de 3»
//   con fecha de corte (R15: el pipeline en curso queda en custodia)
// - Anti-puntaje (R5/ADR-036): la cobertura es conteo con fecha, NUNCA
//   ranking de riesgo; la plataforma no es alerta operativa
// Fixture de escritura en CAUCETE — capital READ-ONLY (patrón LIC-R2/LIC-R3).
// Requiere Postgres/PostGIS real (job test de CI); sin base el suite se
// salta (honesto, R5).
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';
process.env.JWT_SECRET = 'test-jwt-secret-lic-r4-amenaza-sismica-455';

const { createApp } = await import('./app.js');
const prisma = (await import('./lib/prisma.js')).default;
const { AmenazaCatalogoResponseSchema, AmenazaCoberturaResponseSchema } = await import('@delocalsoy/contracts');

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

describe.skipIf(!dbUp)('Capas de amenaza sísmica (LIC-DLUI LIC-R4 — #455, épica #448)', () => {
  const ts = Date.now();
  const jsonHeaders = { 'content-type': 'application/json' };
  const PASSWORD = 'contrasena-muy-secreta-8+chars';

  // Sellos del seed LIC-R4 (conteo ACOTADO: un count global de events_raw
  // es racy bajo suites paralelas — patrón NCAP-R1/VIG-010).
  const SELLOS_LICR4 = ['seed-capa-capital-seismic_risk', 'seed-capa-iglesia-seismic_risk'];

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

  it('seed: capa seismic_risk declarada en los 3 nodos con dominio health y sellos capa.registrada sin PII', async () => {
    for (const key of ['capital', 'caucete', 'iglesia']) {
      const res = await fetch(base + '/api/nodos/' + key + '/capas');
      expect(res.status).toBe(200);
      const body: any = await res.json();
      const capa = body.data.find((c: any) => c.key === 'seismic_risk');
      expect(capa, 'falta seismic_risk en ' + key).toBeTruthy();
      expect(capa.dominio).toBe('health');
      expect(capa.geometria).toBe('Point');
    }

    const sellos: any[] = await prisma.events_raw.findMany({
      where: { hash: { in: SELLOS_LICR4 } },
      select: { type: true, hash: true, payload: true },
    });
    expect(sellos.length).toBe(2);
    for (const s of sellos) {
      expect(s.type).toBe('capa.registrada');
      expect((s.payload as any).source).toBe('seed-lic-r4');
      expect((s.payload as any).key).toBe('seismic_risk');
      expect(JSON.stringify(s.payload)).not.toContain('@'); // sin PII (ADR-027)
    }
  });

  it('GET /api/amenazas — nace honesto: 3 declaradas, ingesta null, cobertura «0 de 3» con fecha null (R15: null ≠ 0)', async () => {
    const res = await fetch(base + '/api/amenazas');
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.success).toBe(true);
    expect(body.count).toBe(3);
    // La superficie deriva del contrato (patrón showcase).
    expect(() => AmenazaCatalogoResponseSchema.parse(body.data)).not.toThrow();
    expect(body.data.nodos.map((n: any) => n.nodo_key).sort()).toEqual(['capital', 'caucete', 'iglesia']);
    for (const n of body.data.nodos) {
      expect(n.capa_key).toBe('seismic_risk');
      expect(n.estado).toBe('declarada');
      expect(n.ingesta).toBeNull(); // metadatos-antes-de-capa (regla ratificada)
    }

    const cob = await fetch(base + '/api/amenazas/cobertura');
    expect(cob.status).toBe(200);
    const cobBody: any = await cob.json();
    expect(() => AmenazaCoberturaResponseSchema.parse(cobBody.data)).not.toThrow();
    expect(cobBody.data.cobertura).toBe('0 de 3');
    expect(cobBody.data.nodos_total).toBe(3);
    expect(cobBody.data.nodos_publicados).toBe(0);
    expect(cobBody.data.fecha_corte).toBeNull(); // R15: sin ingesta el null es REAL
    expect(cobBody.data.regla).toContain('jamás ranking');
  });

  it('E2E publicación: ingesta INPRES en caucete avanza el pipeline y SOLO al publicar la capa pasa a publicada con metadatos (NC-EV-09)', async () => {
    const tokenAdmin = await rolYLoguear('licr4-' + ts + '-admin@example.test', 'admin');
    const tokenCiudadano = await registrarYLoguear('licr4-' + ts + '-ciu@example.test');

    // La ingesta del ciudadano NO existe (alta curada por admin, DH 2026-10-15).
    const payload = {
      source_id: 'inpres-zona4-cau-' + ts,
      fuente_key: 'inpres',
      nodo_key: 'caucete',
      capa_servicio: 'seismic_risk',
      fecha_acceso: '2026-11-12',
      fecha_corte: '2018', // INPRES-CIRSOC 103 Parte I (2018)
      crs_origen: 'EPSG:4326',
      crs_normalizado: 'EPSG:4326',
      escala_precision: 'zonificación departamental INPRES (Zona 4) — sin microzonificación por edificio (ADR-036)',
      external_id: 'inpres-cirsoc-103-p1-2018',
      transformaciones: 'zonificación de referencia por departamento; sin reproyección',
    };
    const prohibido = await fetch(base + '/api/ingestas', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenCiudadano },
      body: JSON.stringify(payload),
    });
    expect(prohibido.status).toBe(403); // R15 estricta: solo admin
    await prohibido.arrayBuffer();

    const creada = await fetch(base + '/api/ingestas', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenAdmin },
      body: JSON.stringify(payload),
    });
    expect(creada.status).toBe(201);
    const ingesta = ((await creada.json()) as any).data;
    expect(ingesta.estado).toBe('recibido');

    // Pipeline: el estado en curso NO publica nada (custodia, R15).
    const enCurso = await fetch(base + '/api/amenazas');
    const catCurso: any = await enCurso.json();
    expect(catCurso.data.nodos.find((n: any) => n.nodo_key === 'caucete').estado).toBe('declarada');

    // Avance completo: recibido → validado_tecnicamente → validado_territorialmente → publicado.
    for (const estado of ['validado_tecnicamente', 'validado_territorialmente', 'publicado']) {
      const paso = await fetch(base + '/api/ingestas/' + ingesta.id + '/estado', {
        method: 'PATCH',
        headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenAdmin },
        body: JSON.stringify({ estado, motivo: 'avance del pipeline LIC-R4 #455' }),
      });
      expect(paso.status, 'transición a ' + estado).toBe(200);
    }

    // SOLO publicado: metadatos de procedencia visibles (NC-EV-09) y
    // cobertura honesta «1 de 3» con fecha de corte.
    const cat = await fetch(base + '/api/amenazas');
    const catBody: any = await cat.json();
    const cau = catBody.data.nodos.find((n: any) => n.nodo_key === 'caucete');
    expect(cau.estado).toBe('publicada');
    expect(cau.ingesta.fuente_key).toBe('inpres');
    expect(cau.ingesta.fecha_corte).toBe('2018');
    expect(cau.ingesta.crs_normalizado).toBe('EPSG:4326');
    expect(cau.ingesta.escala_precision).toContain('Zona 4');
    // Los otros nodos quedan declarados (null ≠ 0, R15).
    for (const n of catBody.data.nodos.filter((n: any) => n.nodo_key !== 'caucete')) {
      expect(n.estado).toBe('declarada');
      expect(n.ingesta).toBeNull();
    }

    const cob = await fetch(base + '/api/amenazas/cobertura');
    const cobBody: any = await cob.json();
    expect(cobBody.data.cobertura).toBe('1 de 3');
    expect(cobBody.data.nodos_publicados).toBe(1);
    expect(cobBody.data.fecha_corte).toBe('2018');

    // Sello del sistema de la publicación: ingesta.estado_cambiado sin PII.
    // findMany + filtro en JS: el pipeline sella 3 transiciones para la
    // misma ingesta y la consulta debe quedar en la FINAL ('publicado'),
    // no en la primera (orden frágil entre occurred_at casi simultáneos).
    const sellosTransicion: any[] = await prisma.events_raw.findMany({
      where: { type: 'ingesta.estado_cambiado', payload: { path: ['ingesta_id'], equals: ingesta.id } },
    });
    expect(sellosTransicion.length).toBe(3); // 3 transiciones del pipeline
    const sello = sellosTransicion.find((s: any) => (s.payload as any).estado === 'publicado');
    expect(sello, 'falta el sello de la transición a publicado').toBeTruthy();
    expect((sello!.payload as any).estado).toBe('publicado');
    expect(JSON.stringify(sello!.payload)).not.toContain('@');
    expect(JSON.stringify(sello!.payload)).not.toContain('example.test');
  });

  it('idempotencia: re-ejecutar db:seed no duplica capas ni sellos del seed LIC-R4', async () => {
    const antes = await Promise.all([
      prisma.capas.count({ where: { key: 'seismic_risk' } }),
      prisma.events_raw.count({ where: { hash: { in: SELLOS_LICR4 } } }),
    ]);
    execSync('pnpm --filter @delocalsoy/db db:seed', { cwd: repoRoot, stdio: 'pipe' });
    const despues = await Promise.all([
      prisma.capas.count({ where: { key: 'seismic_risk' } }),
      prisma.events_raw.count({ where: { hash: { in: SELLOS_LICR4 } } }),
    ]);
    expect(despues).toEqual(antes);
    expect(despues[0]).toBe(3); // capital + caucete + iglesia
    expect(despues[1]).toBe(2);
  }, 60000);
});
