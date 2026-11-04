import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// NODO-CAPITAL NCAP-R6-ext (#165): extensiones del dominio oportunidades —
// extremo a extremo contra servicios reales (PostgreSQL/PostGIS + Redis),
// sobre la base canónica de #160 (no-go honrado: la versión en memoria
// fail-open del material de diseño NUNCA se aterriza):
// - territorial_context: cor_* v0.1 en el alta (hipótesis provisional #156)
// - paginación: limit/offset + header X-DELocalSoy-Total-Count
// - métricas: GET /stats/resumen (totales por tipo/estado + tasa de
//   corroboración — cobertura, nunca 'estado del territorio', R5/ADR-035)
// - gate de evidencia: avanzar a validated exige evidencia corroborated|
//   reviewed; PATCH /:id/evidencia (moderador|admin) sella y habilita
// - conexiones: consentimiento explícito literal(true) (ADR-027),
//   idempotencia por hash, sello oportunidad.conexion_creada
// - scoring: PATCH /:id/scoring con método declarado (ADR-035) y sello
// Requiere Postgres/PostGIS real (job test de CI); sin base el suite se
// salta (honesto, R5).
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';
process.env.JWT_SECRET = 'test-jwt-secret-ncap-r6-ext-oportunidades-32ch';

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

describe.skipIf(!dbUp)('oportunidades NCAP-R6-ext (#165 — extensiones del Banco de Potencialidades)', () => {
  const ts = Date.now();
  const jsonHeaders = { 'content-type': 'application/json' };
  const PASSWORD = 'contrasena-muy-secreta-8+chars';

  const payloadBase = {
    tipo: 'human_capacity',
    titulo: 'Cocina comunitaria del corredor cívico ' + ts,
    descripcion: 'Vecinas del eje cívico organizan una cocina comunitaria para el barrio, con productos de productores locales',
    nodo_key: 'capital',
    subnodo_key: 'sj_capital_centro',
    evidencia: { evidence_type: 'community_input', descripcion: 'Propuesta del encuentro vecinal del corredor' },
    actores: [
      { role: 'proposer', consent_confirmed: true },
      { role: 'beneficiary', consent_confirmed: true },
    ],
    tags: ['cocina', 'corredor'],
    territorial_context: {
      corridor_id: 'cor_centro_civico',
      landmark_id: 'plaza-25-de-mayo',
      service_area_name: 'microcentro',
    },
  };

  let tokenCiudadano = '';
  let tokenModerador = '';
  let oportunidadId = '';

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

  async function tokenDeModerador(email: string): Promise<string> {
    await prisma.usuarios.update({ where: { email }, data: { rol: 'moderador' } });
    const login = await fetch(base + '/api/auth/login', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ email, password: PASSWORD }),
    });
    expect(login.status).toBe(200);
    return ((await login.json()) as any).data.token as string;
  }

  it('alta con territorial_context cor_*: 201 y persistido; corridor_id inválido → 400', async () => {
    tokenCiudadano = await registrarYLoguear('r6ext-' + ts + '-a@example.test');
    const res = await fetch(base + '/api/oportunidades', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenCiudadano },
      body: JSON.stringify(payloadBase),
    });
    expect(res.status).toBe(201);
    const body: any = await res.json();
    oportunidadId = body.data.id;
    expect(body.data.territorial_context.corridor_id).toBe('cor_centro_civico');

    const malCorredor = await fetch(base + '/api/oportunidades', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenCiudadano },
      body: JSON.stringify({
        ...payloadBase,
        titulo: 'Corredor inválido ' + ts,
        territorial_context: { corridor_id: 'centro_civico' },
      }),
    });
    expect(malCorredor.status).toBe(400);
    await malCorredor.arrayBuffer();
  });

  it('paginación: limit/offset por contrato y total en header X-DELocalSoy-Total-Count', async () => {
    const totalEsperado = await prisma.oportunidades.count({ where: { estado: { not: 'discarded' } } });
    const pagina = await fetch(base + '/api/oportunidades?limit=1');
    expect(pagina.status).toBe(200);
    expect(pagina.headers.get('x-delocalsoy-total-count')).toBe(String(totalEsperado));
    const body: any = await pagina.json();
    expect(body.data.length).toBeLessThanOrEqual(1);
    expect(body.total).toBe(totalEsperado);

    const limitCero = await fetch(base + '/api/oportunidades?limit=0');
    expect(limitCero.status).toBe(400);
    await limitCero.arrayBuffer();

    const limitGrande = await fetch(base + '/api/oportunidades?limit=101');
    expect(limitGrande.status).toBe(400);
    await limitGrande.arrayBuffer();

    const offsetLejos = await fetch(base + '/api/oportunidades?limit=5&offset=100000');
    expect(offsetLejos.status).toBe(200);
    expect(((await offsetLejos.json()) as any).data.length).toBe(0);
  });

  it('resumen: GET /stats/resumen con totales por estado/tipo y tasa de corroboración honesta', async () => {
    const res = await fetch(base + '/api/oportunidades/stats/resumen');
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.total_publicado).toBeGreaterThanOrEqual(1);
    // 'discarded' nunca entra en lo publicado
    expect(Object.keys(body.data.por_estado)).not.toContain('discarded');
    expect(typeof body.data.por_tipo['human_capacity']).toBe('number');
    expect(body.data.evidencia.tasa_corroboracion).toBeGreaterThanOrEqual(0);
    expect(body.data.evidencia.tasa_corroboracion).toBeLessThanOrEqual(1);
  });

  it('gate de evidencia: sin veredicto no hay validated; PATCH /evidencia (moderación) sella y habilita', async () => {
    const emailModerador = 'r6ext-' + ts + '-mod@example.test';
    await registrarYLoguear(emailModerador);
    tokenModerador = await tokenDeModerador(emailModerador);

    // El ciudadano no valida evidencia (403 — moderador|admin, ADR-031).
    const intentoCiudadano = await fetch(base + '/api/oportunidades/' + oportunidadId + '/evidencia', {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenCiudadano },
      body: JSON.stringify({ validationStatus: 'corroborated' }),
    });
    expect(intentoCiudadano.status).toBe(403);
    await intentoCiudadano.arrayBuffer();

    // Avance legítimo: detected → under_review.
    const review = await fetch(base + '/api/oportunidades/' + oportunidadId + '/estado', {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenModerador },
      body: JSON.stringify({ estado: 'under_review', motivo: 'revisión de la evidencia vecinal' }),
    });
    expect(review.status).toBe(200);
    await review.arrayBuffer();

    // Gate: under_review → validated sin evidencia corroborada → 400.
    const salto = await fetch(base + '/api/oportunidades/' + oportunidadId + '/estado', {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenModerador },
      body: JSON.stringify({ estado: 'validated', motivo: 'evidencia suficiente' }),
    });
    expect(salto.status).toBe(400);
    expect(JSON.stringify(await salto.json())).toContain('gate de evidencia');

    // Moderación corrobora la evidencia + sello en la fuente de verdad.
    const validar = await fetch(base + '/api/oportunidades/' + oportunidadId + '/evidencia', {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenModerador },
      body: JSON.stringify({ validationStatus: 'corroborated', motivo: 'contraste con el acta del encuentro vecinal' }),
    });
    expect(validar.status).toBe(200);
    const dataValidada: any = (await validar.json()).data;
    expect(dataValidada.evidencia.validationStatus).toBe('corroborated');

    const selloEvidencia = await prisma.events_raw.findFirst({
      where: { type: 'oportunidad.evidencia_validada', payload: { path: ['oportunidad_id'], equals: oportunidadId } },
    });
    expect(selloEvidencia).not.toBeNull();
    expect(JSON.stringify(selloEvidencia?.payload)).not.toContain('@');

    // Ahora sí: under_review → validated → 200 (R15: veredicto antes que avance).
    const avanzar = await fetch(base + '/api/oportunidades/' + oportunidadId + '/estado', {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenModerador },
      body: JSON.stringify({ estado: 'validated', motivo: 'evidencia corroborada por moderación' }),
    });
    expect(avanzar.status).toBe(200);
    await avanzar.arrayBuffer();
  });

  it('conexiones: consentimiento explícito obligatorio, anti-PII, sello, idempotencia y lectura pública', async () => {
    // Sin consentimiento → 400 (ADR-027: imposible default(true)).
    const sinConsentimiento = await fetch(base + '/api/oportunidades/' + oportunidadId + '/conexiones', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenCiudadano },
      body: JSON.stringify({
        actor_origen: { role: 'provider', consent_confirmed: true },
        actor_destino: { role: 'beneficiary', consent_confirmed: true },
        tipo_vinculo: 'oferta',
        consentimiento_confirmado: false,
      }),
    });
    expect(sinConsentimiento.status).toBe(400);
    expect(JSON.stringify(await sinConsentimiento.json())).toContain('consentimiento');

    // Anti-PII sobre el nombre del actor (ADR-020 cond. 1).
    const conPii = await fetch(base + '/api/oportunidades/' + oportunidadId + '/conexiones', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenCiudadano },
      body: JSON.stringify({
        actor_origen: { role: 'provider', name: 'juan.perez@example.com', consent_confirmed: true },
        actor_destino: { role: 'beneficiary', consent_confirmed: true },
        tipo_vinculo: 'oferta',
        consentimiento_confirmado: true,
      }),
    });
    expect(conPii.status).toBe(400);
    const textoPii = JSON.stringify(await conPii.json());
    expect(textoPii).not.toContain('juan.perez@example.com');

    // Vínculo válido → 201 + sello oportunidad.conexion_creada.
    const res = await fetch(base + '/api/oportunidades/' + oportunidadId + '/conexiones', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenCiudadano },
      body: JSON.stringify({
        actor_origen: { role: 'provider', name: 'Cocina del corredor', consent_confirmed: true },
        actor_destino: { role: 'beneficiary', name: 'Comedor del barrio', consent_confirmed: true },
        tipo_vinculo: 'oferta',
        consentimiento_confirmado: true,
      }),
    });
    expect(res.status).toBe(201);
    const conexion = ((await res.json()) as any).data;
    expect(conexion.consentimiento_confirmado).toBe(true);

    const selloConexion = await prisma.events_raw.findFirst({
      where: { type: 'oportunidad.conexion_creada', payload: { path: ['oportunidad_id'], equals: oportunidadId } },
    });
    expect(selloConexion).not.toBeNull();
    expect(JSON.stringify(selloConexion?.payload)).not.toContain('@');

    // Idempotencia del vínculo: re-POST → 200 idempotente, sin duplicar.
    const repetido = await fetch(base + '/api/oportunidades/' + oportunidadId + '/conexiones', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenCiudadano },
      body: JSON.stringify({
        actor_origen: { role: 'provider', name: 'Cocina del corredor', consent_confirmed: true },
        actor_destino: { role: 'beneficiary', name: 'Comedor del barrio', consent_confirmed: true },
        tipo_vinculo: 'oferta',
        consentimiento_confirmado: true,
      }),
    });
    expect(repetido.status).toBe(200);
    expect(((await repetido.json()) as any).idempotente).toBe(true);

    // Lectura pública del vínculo.
    const lista = await fetch(base + '/api/oportunidades/' + oportunidadId + '/conexiones');
    expect(lista.status).toBe(200);
    const bodyLista: any = await lista.json();
    expect(bodyLista.data.some((c: any) => c.id === conexion.id)).toBe(true);
  });

  it('scoring: moderador declara interpretación con método (ADR-035); ciudadano 403; sin método 400', async () => {
    const intentoCiudadano = await fetch(base + '/api/oportunidades/' + oportunidadId + '/scoring', {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenCiudadano },
      body: JSON.stringify({
        territorial_impact: 'alta',
        feasibility: 'media',
        urgency: 'baja',
        metodo: 'taller comunitario del corredor cívico',
      }),
    });
    expect(intentoCiudadano.status).toBe(403);
    await intentoCiudadano.arrayBuffer();

    const sinMetodo = await fetch(base + '/api/oportunidades/' + oportunidadId + '/scoring', {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenModerador },
      body: JSON.stringify({
        territorial_impact: 'alta',
        feasibility: 'media',
        urgency: 'baja',
      }),
    });
    expect(sinMetodo.status).toBe(400);
    await sinMetodo.arrayBuffer();

    const res = await fetch(base + '/api/oportunidades/' + oportunidadId + '/scoring', {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenModerador },
      body: JSON.stringify({
        territorial_impact: 'alta',
        feasibility: 'media',
        urgency: 'baja',
        metodo: 'interpretación del taller comunitario del corredor cívico contrastada con las cautelas de #156',
        fuente: 'asamblea-vecinal',
      }),
    });
    expect(res.status).toBe(200);
    const data: any = (await res.json()).data;
    expect(data.scoring.territorial_impact).toBe('alta');
    expect(data.scoring.metodo.length).toBeGreaterThanOrEqual(10);

    const selloScoring = await prisma.events_raw.findFirst({
      where: { type: 'oportunidad.scoring_declarado', payload: { path: ['oportunidad_id'], equals: oportunidadId } },
    });
    expect(selloScoring).not.toBeNull();
  });
});
