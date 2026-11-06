import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// NODO-VIG-3 VIG-011 (#378, épica #377): AMC — mediación ciudadana del
// nodo Iglesia. Ciclo E2E completo: alta AMC por canal web →
// corroboración ciudadana (un reportante distinto = un peso) →
// convergencia de cluster (mismo dominio+categoría, ~500 m, ventana 90
// días) → punto crítico community_validated en la capa punto_critico
// con N reportes / M reportantes / fecha — NUNCA puntaje (R5). Canal
// papel mediado: la planilla la carga un mediador con aval comunitario
// (registro admin, nace VACÍO — R15) y el vecino queda SOLO como alias
// con consentimiento granular (ADR-027, Ley 25.326); 2 planillas con
// alias distintos en el mismo punto = 2 pesos (el hash del cargador
// NUNCA pesa por vecino). La ventana pesa por fecha del testimonio
// (observado_en), no por la fecha de carga. Sin PII en sellos
// (reporte.recibido extendido, reporte.corroborado, cluster.creado,
// mediador.registrado). Requiere Postgres/PostGIS real (job test de
// CI); sin base → skip honesto (patrón vig010). Requiere el comando
// REAL db:seed (capa punto_critico + 40 categorías VIG-010).
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';
process.env.JWT_SECRET = 'test-jwt-secret-vig011-amc-mediacion-ciudadana-32ch';

const { createApp } = await import('./app.js');
const { prisma } = await import('@delocalsoy/db');

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

const dbUp = await prisma
  .$queryRaw
    SELECT 1
  `
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

describe.skipIf(!dbUp)('AMC — mediación ciudadana del nodo Iglesia (NODO-VIG-3 VIG-011, #378)', () => {
  const ts = Date.now();
  const jsonHeaders = { 'content-type': 'application/json' };
  const PASSWORD = 'contrasena-muy-secreta-8+chars';
  // Puntos ilustrativos del valle (test): A ~ Tudcum, B a ~7 km de A.
  const puntoA = { lat: -30.14, lng: -69.19 };
  const puntoB = { lat: -30.18, lng: -69.25 };
  const MEDIADOR_KEY = 'mediador-test-' + ts;
  const hoy = new Date().toISOString().slice(0, 10);
  const hace100 = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const ids: Record<string, string> = {};
  const tokens: Record<string, string> = {};

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

  async function post(token: string, path: string, body: unknown): Promise<{ status: number; body: any }> {
    const res = await fetch(base + path, {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify(body),
    });
    return { status: res.status, body: await res.json() };
  }

  async function getFeatures(): Promise<any[]> {
    const res = await fetch(base + '/api/nodos/iglesia/features');
    expect(res.status).toBe(200);
    return ((await res.json()) as any).data;
  }

  it('1. mediadores: admin registra con aval (201 + sello sin PII); repetido 409; ciudadano 403; GET público de vigentes', async () => {
    const emailAdmin = 'vig011-admin-' + ts + '@example.test';
    await registrarYLoguear(emailAdmin);
    await prisma.usuarios.update({ where: { email: emailAdmin }, data: { rol: 'admin' } });
    const loginAdmin = await fetch(base + '/api/auth/login', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ email: emailAdmin, password: PASSWORD }),
    });
    expect(loginAdmin.status).toBe(200);
    const tokenAdmin = ((await loginAdmin.json()) as any).data.token as string;
    tokens.admin = tokenAdmin;

    const alta = await post(tokenAdmin, '/api/mediadores', {
      nodo_key: 'iglesia',
      key: MEDIADOR_KEY,
      label: 'Mediador de asamblea (test)',
      aval: 'asamblea',
    });
    expect(alta.status).toBe(201);
    expect(alta.body.data.aval_estado).toBe('vigente');
    expect(alta.body.data.aval).toBe('asamblea');

    // El alias comunitario del mediador es único.
    const repetido = await post(tokenAdmin, '/api/mediadores', {
      nodo_key: 'iglesia',
      key: MEDIADOR_KEY,
      label: 'Mediador duplicado (test)',
      aval: 'comision_vecinal',
    });
    expect(repetido.status).toBe(409);

    // El registro no es ciudadano: solo admin (ADR-031) — el aval se
    // ratifica, no se autodeclara.
    tokens.ciudadano = await registrarYLoguear('vig011-ciudadano-' + ts + '@example.test');
    const intento = await post(tokens.ciudadano, '/api/mediadores', {
      nodo_key: 'iglesia',
      key: 'mediador-otro-' + ts,
      label: 'Sin aval ratificado',
      aval: 'asamblea',
    });
    expect(intento.status).toBe(403);

    // Lectura pública de vigentes, sin PII.
    const lista = await fetch(base + '/api/mediadores?nodo=iglesia');
    expect(lista.status).toBe(200);
    const bodyLista: any = await lista.json();
    const propio = bodyLista.data.find((m: any) => m.key === MEDIADOR_KEY);
    expect(propio).toBeDefined();
    expect(propio.aval).toBe('asamblea');
    expect(JSON.stringify(bodyLista)).not.toContain('example.test');

    const sello = await prisma.events_raw.findFirst({
      where: { type: 'mediador.registrado', payload: { path: ['key'], equals: MEDIADOR_KEY } },
    });
    expect(sello).not.toBeNull();
    const selloTexto = JSON.stringify(sello?.payload);
    expect(selloTexto).not.toContain('@');
    expect(selloTexto).not.toContain('example.test');
  });

  it('2. alta AMC web: 201 con ancla subnodo, sello extendido sin PII, sin cluster (1 reportante) y reintento idempotente', async () => {
    tokens.u1 = await registrarYLoguear('vig011-u1-' + ts + '@example.test');
    const cuerpo = {
      nodo_key: 'iglesia',
      categoria: 'road_surface',
      descripcion: 'Bache profundo en el cordón de la ruta cerca del ingreso, riesgo para motos y ciclistas',
      lat: puntoA.lat,
      lng: puntoA.lng,
      subnodo_key: 'sj_iglesia_tudcum',
      dominio: 'infraestructura_vial',
      canal_ingreso: 'web',
      precision: 'gps',
      riesgo_inmediato: true,
    };
    const res = await post(tokens.u1, '/api/reportes', cuerpo);
    expect(res.status).toBe(201);
    expect(res.body.data.estado).toBe('received');
    expect(res.body.data.subnodo_key).toBe('sj_iglesia_tudcum');
    expect(res.body.data.dominio).toBe('infraestructura_vial');
    expect(res.body.data.canal_ingreso).toBe('web');
    expect(res.body.data.riesgo_inmediato).toBe(true);
    ids.r1 = res.body.data.id;

    // 1 reportante distinto: aún no hay cluster (2+ exigidos).
    expect(res.body.cluster).toBeNull();
    expect(res.body.cluster_verificado).toBe(true);

    // Sello extendido sin PII: contexto AMC, sin texto del vecino.
    const sello = await prisma.events_raw.findFirst({
      where: { type: 'reporte.recibido', payload: { path: ['reporte_id'], equals: ids.r1 } },
    });
    expect(sello).not.toBeNull();
    const p: any = sello?.payload;
    expect(p.dominio).toBe('infraestructura_vial');
    expect(p.subnodo_key).toBe('sj_iglesia_tudcum');
    expect(p.canal_ingreso).toBe('web');
    expect(p.riesgo_inmediato).toBe(true);
    const selloTexto = JSON.stringify(p);
    expect(selloTexto).not.toContain('@');
    expect(selloTexto).not.toContain('example.test');
    expect(selloTexto).not.toContain('Bache profundo');

    // Reintento idempotente del mismo vecino: 200, sin sello nuevo.
    const re = await post(tokens.u1, '/api/reportes', cuerpo);
    expect(re.status).toBe(200);
    expect(re.body.idempotente).toBe(true);
    expect(re.body.data.id).toBe(ids.r1);
  });

  it('3. convergencia: 2º reporte de OTRO vecino a ~30 m → cluster comunitario → punto crítico community_validated con sello único', async () => {
    tokens.u2 = await registrarYLoguear('vig011-u2-' + ts + '@example.test');
    const res = await post(tokens.u2, '/api/reportes', {
      nodo_key: 'iglesia',
      categoria: 'road_surface',
      descripcion: 'El bache del ingreso ya forma pozos grandes al costado del badén',
      lat: puntoA.lat + 0.0003,
      lng: puntoA.lng + 0.0002,
      subnodo_key: 'sj_iglesia_tudcum',
      dominio: 'infraestructura_vial',
      canal_ingreso: 'web',
      precision: 'gps',
      riesgo_inmediato: false,
    });
    expect(res.status).toBe(201);
    ids.r2 = res.body.data.id;

    const cluster = res.body.cluster;
    expect(cluster).not.toBeNull();
    expect(cluster.reportes_count).toBe(2);
    expect(cluster.reportantes_count).toBe(2);
    expect(cluster.radio_m).toBe(500);
    expect(cluster.ventana_dias).toBe(90);
    ids.clusterA = cluster.cluster_key;

    // Punto crítico comunitario en la capa punto_critico (VIG-010).
    const feats = await getFeatures();
    const pc = feats.find((f: any) => f.id === ids.clusterA);
    expect(pc, 'feature ' + ids.clusterA).toBeDefined();
    expect(pc.layer).toBe('punto_critico');
    expect(pc.estado).toBe('community_validated'); // NUNCA verified (R15)
    expect(pc.tipo).toBe('problem');
    expect(pc.is_synthetic).toBe(false);
    expect(pc.fuente_label).toContain('Comunidad · AMC VIG-011');
    expect(pc.titulo).toContain('2 reportes de 2 vecinos');

    // Ambos reportes quedaron anclados al cluster.
    for (const id of [ids.r1, ids.r2]) {
      const row: any = await prisma.reportes.findUnique({ where: { id } });
      expect(row.cluster_key).toBe(ids.clusterA);
    }

    // Sello cluster.creado — una creación, un evento (R4), sin PII.
    const sellosCluster = await prisma.events_raw.findMany({
      where: { type: 'cluster.creado', payload: { path: ['cluster_key'], equals: ids.clusterA } },
    });
    expect(sellosCluster.length).toBe(1);
    expect(JSON.stringify(sellosCluster[0].payload)).not.toContain('@');
  });

  it('4. corroboración: vecino corrobora (peso true), reintento idempotente (200 peso false), autor 400; el cluster suma reportante SIN sello nuevo', async () => {
    tokens.u3 = await registrarYLoguear('vig011-u3-' + ts + '@example.test');
    const cor = await post(tokens.u3, '/api/reportes/' + ids.r1 + '/corroboracion', { precision: 'referencial' });
    expect(cor.status).toBe(201);
    expect(cor.body.data.peso).toBe(true);
    expect(cor.body.cluster).not.toBeNull();
    expect(cor.body.cluster.cluster_key).toBe(ids.clusterA);

    // Re-corroboración del mismo vecino: idempotente, sin nuevo peso.
    const cor2 = await post(tokens.u3, '/api/reportes/' + ids.r1 + '/corroboracion', { precision: 'referencial' });
    expect(cor2.status).toBe(200);
    expect(cor2.body.data.peso).toBe(false);
    expect(cor2.body.idempotente).toBe(true);

    // Un sello por (vecino, reporte): la fuente de verdad del peso.
    const sellos = await prisma.events_raw.findMany({
      where: { type: 'reporte.corroborado', payload: { path: ['reporte_id'], equals: ids.r1 } },
    });
    expect(sellos.length).toBe(1);
    const selloTexto = JSON.stringify(sellos[0].payload);
    expect(selloTexto).not.toContain('@');
    expect(selloTexto).not.toContain('example.test');

    // El autor no corrobora su propio reporte (un reportante = un peso).
    const propio = await post(tokens.u1, '/api/reportes/' + ids.r1 + '/corroboracion', {});
    expect(propio.status).toBe(400);

    // El feature re-deriva conteos: 2 reportes de 3 vecinos, sin sello nuevo.
    const feats = await getFeatures();
    const pc = feats.find((f: any) => f.id === ids.clusterA);
    expect(pc.titulo).toContain('2 reportes de 3 vecinos');
    const sellosCluster = await prisma.events_raw.findMany({
      where: { type: 'cluster.creado', payload: { path: ['cluster_key'], equals: ids.clusterA } },
    });
    expect(sellosCluster.length).toBe(1);
  });

  it('5. canal papel mediado: el mediador carga 2 planillas con alias distintos → cluster por ALIAS (el hash del cargador nunca pesa)', async () => {
    // La cuenta que carga es del mediador (ciudadano): created_by_hash
    // NO pesa por vecino en canal mediado — pesa el alias comunitario.
    tokens.cargador = await registrarYLoguear('vig011-cargador-' + ts + '@example.test');
    const planilla = (alias: string, lat: number, lng: number) => ({
      nodo_key: 'iglesia',
      categoria: 'urban_surface',
      descripcion: 'Planilla papel: vereda rota y baldosas sueltas frente al almacén de ramos generales',
      lat,
      lng,
      subnodo_key: 'sj_iglesia_tudcum',
      dominio: 'infraestructura_vial',
      canal_ingreso: 'papel',
      precision: 'referencial',
      riesgo_inmediato: false,
      mediador_ref: MEDIADOR_KEY,
      reportado_por: alias,
      consentimiento: { acepta_devolucion_contacto: true, guarda_alias: true },
      observado_en: hoy,
    });

    const res1 = await post(tokens.cargador, '/api/reportes', planilla('vecino-uno-' + ts, puntoB.lat, puntoB.lng));
    expect(res1.status).toBe(201);
    expect(res1.body.data.reportado_por).toBe('vecino-uno-' + ts);
    ids.r5 = res1.body.data.id;
    expect(res1.body.cluster).toBeNull(); // 1 reportante aún

    const res2 = await post(
      tokens.cargador,
      '/api/reportes',
      planilla('vecino-dos-' + ts, puntoB.lat + 0.0002, puntoB.lng + 0.0002)
    );
    expect(res2.status).toBe(201);
    expect(res2.body.cluster).not.toBeNull();
    expect(res2.body.cluster.reportantes_count).toBe(2); // 2 ALIAS distintos
    expect(res2.body.cluster.reportes_count).toBe(2);
    ids.clusterB = res2.body.cluster.cluster_key;

    const feats = await getFeatures();
    const pc = feats.find((f: any) => f.id === ids.clusterB);
    expect(pc).toBeDefined();
    expect(pc.estado).toBe('community_validated');
    expect(pc.titulo).toContain('2 reportes de 2 vecinos');
  });

  it('6. ventana 90 días: planilla observada hace 100 días NO clusteriza (pesa por fecha del testimonio, no de carga)', async () => {
    const res = await post(tokens.cargador, '/api/reportes', {
      nodo_key: 'iglesia',
      categoria: 'urban_surface',
      descripcion: 'Planilla papel vieja: vereda rota del mismo tramo relevado hace más de tres meses',
      lat: puntoB.lat + 0.0004,
      lng: puntoB.lng + 0.0004,
      subnodo_key: 'sj_iglesia_tudcum',
      dominio: 'infraestructura_vial',
      canal_ingreso: 'papel',
      precision: 'referencial',
      riesgo_inmediato: false,
      mediador_ref: MEDIADOR_KEY,
      reportado_por: 'vecino-tres-' + ts,
      consentimiento: { acepta_devolucion_contacto: true, guarda_alias: true },
      observado_en: hace100,
    });
    expect(res.status).toBe(201);

    // La convergencia desde el punto viejo NO lo incluye: el cluster B
    // conserva 2 reportes de la ventana — nunca se declara un vacío
    // ni se infla el conteo (R15).
    expect(res.body.cluster).not.toBeNull();
    expect(res.body.cluster.cluster_key).toBe(ids.clusterB);
    expect(res.body.cluster.reportes_count).toBe(2);
    const row: any = await prisma.reportes.findUnique({ where: { id: res.body.data.id } });
    expect(row.cluster_key).toBeNull(); // fuera de la ventana → sin ancla

    const sellosCluster = await prisma.events_raw.findMany({
      where: { type: 'cluster.creado', payload: { path: ['cluster_key'], equals: ids.clusterB } },
    });
    expect(sellosCluster.length).toBe(1); // sin sello nuevo
  });

  it('7. validaciones 400: subnodo inexistente, categoría ajena al dominio, whatsapp sin mediador, mediador sin registro, alias sin consentimiento, papel sin alias', async () => {
    const baseAmc = {
      nodo_key: 'iglesia',
      categoria: 'road_surface',
      descripcion: 'Bache de prueba del caso de validación rechazado del AMC',
      lat: puntoA.lat + 0.002,
      lng: puntoA.lng + 0.002,
      subnodo_key: 'sj_iglesia_tudcum',
      dominio: 'infraestructura_vial',
      canal_ingreso: 'web',
      precision: 'aproximado',
      riesgo_inmediato: false,
    };
    const casos: Array<{ name: string; body: Record<string, unknown> }> = [
      { name: 'subnodo inexistente', body: { ...baseAmc, subnodo_key: 'sj_iglesia_no_existe_' + ts } },
      { name: 'categoría ajena al dominio', body: { ...baseAmc, dominio: 'agua_saneamiento' } },
      { name: 'whatsapp sin mediador_ref', body: { ...baseAmc, canal_ingreso: 'whatsapp' } },
      { name: 'mediador sin registro', body: { ...baseAmc, canal_ingreso: 'whatsapp', mediador_ref: 'mediador-fantasma-' + ts } },
      { name: 'alias sin consentimiento', body: { ...baseAmc, canal_ingreso: 'papel', mediador_ref: MEDIADOR_KEY, reportado_por: 'vecino-x-' + ts } },
      { name: 'papel sin alias', body: { ...baseAmc, canal_ingreso: 'papel', mediador_ref: MEDIADOR_KEY } },
    ];
    for (const caso of casos) {
      const res = await post(tokens.u2, '/api/reportes', caso.body);
      expect(res.status, caso.name).toBe(400);
    }
  });
});
