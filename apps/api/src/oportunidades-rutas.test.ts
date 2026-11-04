import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// NODO-CAPITAL R6 (#158): Banco de Potencialidades (Bloque 9) — extremo a
// extremo contra servicios reales (PostgreSQL/PostGIS + Redis):
// - POST /api/oportunidades: ciudadano autenticado registra → 201 'detected'
//   (evidencia obligatoria), pseudónimo sha256 sin PII, sello
//   oportunidad.propuesta, anti-PII antes de persistir, idempotencia por
//   hash único, actores nombrados exigen consentimiento confirmado
// - GET /api/oportunidades: lectura pública anónima con filtros ?nodo=
//   ?tipo= ?estado= ?subnodo= ('discarded' nunca se publica)
// - PATCH /api/oportunidades/:id/estado: 403 ciudadano, transición inválida
//   400 (matriz del ciclo de vida), moderador 200 con sello, repetido 409,
//   descartada desaparece de la lectura pública
// - NCAP-R6-ext (#165) gate de evidencia: antes de validated, la
//   moderación corrobora la evidencia vía PATCH /:id/evidencia
// Requiere Postgres/PostGIS real (job test de CI); sin base el suite se
// salta (honesto, R5).
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';
process.env.JWT_SECRET = 'test-jwt-secret-ncap-r6-banco-potencialidades-32';

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

describe.skipIf(!dbUp)('oportunidades (NODO-CAPITAL R6 — Banco de Potencialidades, #158)', () => {
  const ts = Date.now();
  const jsonHeaders = { 'content-type': 'application/json' };
  const PASSWORD = 'contrasena-muy-secreta-8+chars';

  const payloadValido = {
    tipo: 'human_capacity',
    titulo: 'Taller de oficios comunitario',
    descripcion: 'Jubilado con oficio de carpintería ofrece un taller de oficios para jóvenes del barrio',
    nodo_key: 'capital',
    subnodo_key: 'sj_capital_desamparados',
    evidencia: { evidence_type: 'community_input', descripcion: 'Propuesta surgida en la reunión vecinal del mes' },
    actores: [{ role: 'proposer', consent_confirmed: true }],
    tags: ['oficios', 'formacion'],
  };

  let tokenCiudadano = '';
  let emailCiudadano = '';
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

  it('POST sin sesión → 401 (el registro exige identidad)', async () => {
    const res = await fetch(base + '/api/oportunidades', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(payloadValido),
    });
    expect(res.status).toBe(401);
    await res.arrayBuffer();
  });

  it('ciudadano registra: 201 estado detected, evidencia obligatoria, pseudónimo sin PII y sello en events_raw', async () => {
    emailCiudadano = 'ncap-r6-' + ts + '-a@example.test';
    tokenCiudadano = await registrarYLoguear(emailCiudadano);

    const res = await fetch(base + '/api/oportunidades', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenCiudadano },
      body: JSON.stringify(payloadValido),
    });
    expect(res.status).toBe(201);
    const body: any = await res.json();
    const oportunidad = body.data;
    oportunidadId = oportunidad.id;
    expect(oportunidad.estado).toBe('detected');
    expect(oportunidad.tipo).toBe('human_capacity');
    expect(oportunidad.nodo_key).toBe('capital');
    expect(oportunidad.subnodo_key).toBe('sj_capital_desamparados');
    expect(oportunidad.created_by_hash).toMatch(/^[0-9a-f]{32}$/);
    expect(oportunidad.evidencia.evidence_type).toBe('community_input');

    // Sello en la fuente de verdad: oportunidad.propuesta con el id, sin PII.
    const sello = await prisma.events_raw.findFirst({
      where: { type: 'oportunidad.propuesta', payload: { path: ['oportunidad_id'], equals: oportunidad.id } },
    });
    expect(sello).not.toBeNull();
    const selloTexto = JSON.stringify(sello?.payload);
    expect(selloTexto).not.toContain('@');
    expect(selloTexto).not.toContain('example.test');
  });

  it('idempotencia: re-POST del mismo payload con el mismo ciudadano → 200 idempotente, sin duplicar', async () => {
    const antes = await prisma.oportunidades.count({ where: { nodo_key: 'capital' } });

    const res = await fetch(base + '/api/oportunidades', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenCiudadano },
      body: JSON.stringify(payloadValido),
    });
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.idempotente).toBe(true);
    expect(body.data.id).toBe(oportunidadId);

    const despues = await prisma.oportunidades.count({ where: { nodo_key: 'capital' } });
    expect(despues).toBe(antes);
  });

  it('anti-PII: descripción con email → 400 antes de persistir y sin eco del valor', async () => {
    const token = await registrarYLoguear('ncap-r6-' + ts + '-b@example.test');
    const res = await fetch(base + '/api/oportunidades', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify({
        ...payloadValido,
        titulo: 'Capacidad distinta ' + ts,
        descripcion: 'contacto: juan.perez@example.com',
      }),
    });
    expect(res.status).toBe(400);
    const texto = JSON.stringify(await res.json());
    expect(texto).not.toContain('juan.perez@example.com');
  });

  it('contrato: sin evidencia → 400 (criterio mínimo del Bloque 9)', async () => {
    const token = await registrarYLoguear('ncap-r6-' + ts + '-c@example.test');
    const { evidencia, ...sinEvidencia } = payloadValido;
    const res = await fetch(base + '/api/oportunidades', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify({ ...sinEvidencia, titulo: 'Otra capacidad ' + ts }),
    });
    expect(res.status).toBe(400);
    await res.arrayBuffer();
  });

  it('consentimiento: actor nombrado sin consentimiento → 400 (Ley 25.326)', async () => {
    const token = await registrarYLoguear('ncap-r6-' + ts + '-d@example.test');
    const res = await fetch(base + '/api/oportunidades', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify({
        ...payloadValido,
        titulo: 'Actor sin consentimiento ' + ts,
        actores: [{ role: 'provider', name: 'Taller textil del barrio', consent_confirmed: false }],
      }),
    });
    expect(res.status).toBe(400);
    const texto = JSON.stringify(await res.json());
    expect(texto).toContain('consentimiento');
  });

  it('GET público: la oportunidad aparece con filtros y no en otro nodo', async () => {
    const lista = await fetch(base + '/api/oportunidades?nodo=capital&tipo=human_capacity&estado=detected&subnodo=sj_capital_desamparados');
    expect(lista.status).toBe(200);
    const bodyLista: any = await lista.json();
    expect(bodyLista.success).toBe(true);
    expect(bodyLista.data.some((o: any) => o.id === oportunidadId)).toBe(true);

    const otroNodo = await fetch(base + '/api/oportunidades?nodo=caucete');
    expect(otroNodo.status).toBe(200);
    const bodyOtro: any = await otroNodo.json();
    expect(bodyOtro.data.some((o: any) => o.id === oportunidadId)).toBe(false);

    const detalle = await fetch(base + '/api/oportunidades/' + oportunidadId);
    expect(detalle.status).toBe(200);
    const bodyDetalle: any = await detalle.json();
    expect(bodyDetalle.data.id).toBe(oportunidadId);
  });

  it('ciclo de vida: ciudadano 403, salto inválido 400, moderador avanza con sello, repetido 409, descartada no se publica', async () => {
    // El ciudadano no modera: solo moderador|admin (ADR-031).
    const intentoCiudadano = await fetch(base + '/api/oportunidades/' + oportunidadId + '/estado', {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenCiudadano },
      body: JSON.stringify({ estado: 'validated' }),
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

    // Salto inválido: detected → validated NO existe en la matriz (Bloque 9).
    const salto = await fetch(base + '/api/oportunidades/' + oportunidadId + '/estado', {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenModerador },
      body: JSON.stringify({ estado: 'validated' }),
    });
    expect(salto.status).toBe(400);
    await salto.arrayBuffer();

    // Avance legítimo: detected → under_review, con sello en la fuente de verdad.
    const res = await fetch(base + '/api/oportunidades/' + oportunidadId + '/estado', {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenModerador },
      body: JSON.stringify({ estado: 'under_review', motivo: 'revisión de duplicados y evidencia' }),
    });
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data.estado).toBe('under_review');

    const sello = await prisma.events_raw.findFirst({
      where: { type: 'oportunidad.estado_cambiado', payload: { path: ['oportunidad_id'], equals: oportunidadId } },
    });
    expect(sello).not.toBeNull();
    expect((sello?.payload as any).estado_anterior).toBe('detected');
    expect((sello?.payload as any).estado).toBe('under_review');

    // NCAP-R6-ext (#165) gate de evidencia: la moderación corrobora la
    // evidencia ANTES de validar — sin veredicto, el avance es 400 (R15:
    // veredicto de moderación antes que salto epistémico).
    const corroborar = await fetch(base + '/api/oportunidades/' + oportunidadId + '/evidencia', {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenModerador },
      body: JSON.stringify({ validationStatus: 'corroborated', motivo: 'contraste con el acta de la reunión vecinal' }),
    });
    expect(corroborar.status).toBe(200);
    await corroborar.arrayBuffer();

    // Continuidad del ciclo: under_review → validated (evidencia corroborada).
    const validar = await fetch(base + '/api/oportunidades/' + oportunidadId + '/estado', {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenModerador },
      body: JSON.stringify({ estado: 'validated', motivo: 'evidencia suficiente y sin duplicados' }),
    });
    expect(validar.status).toBe(200);
    await validar.arrayBuffer();

    // Sin transición no hay evento: repetir el mismo estado → 409.
    const repetido = await fetch(base + '/api/oportunidades/' + oportunidadId + '/estado', {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenModerador },
      body: JSON.stringify({ estado: 'validated' }),
    });
    expect(repetido.status).toBe(409);
    await repetido.arrayBuffer();

    // Descartada: la oportunidad se retira de la lectura pública (R15).
    const descarte = await fetch(base + '/api/oportunidades/' + oportunidadId + '/estado', {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenModerador },
      body: JSON.stringify({ estado: 'discarded', motivo: 'duplicado de otra oportunidad ya validada' }),
    });
    expect(descarte.status).toBe(200);
    await descarte.arrayBuffer();

    const trasDescarte = await fetch(base + '/api/oportunidades?nodo=capital');
    const bodyDescarte: any = await trasDescarte.json();
    expect(bodyDescarte.data.some((o: any) => o.id === oportunidadId)).toBe(false);

    const detalle = await fetch(base + '/api/oportunidades/' + oportunidadId);
    expect(detalle.status).toBe(404);
    await detalle.arrayBuffer();
  });
});
