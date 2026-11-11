import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// LIC-DLUI LIC-R3 (LIC-03 #452, épica #448): Práctica Territorial
// Acreditada — Opción B ratificada por la DH: atributo practica.acreditada
// sobre la cuenta ciudadana (patrón AR1, NO rol) + compuerta DL-7 en el canal
// del practicante (POST /api/reportes con clave 'relevamiento', protocolo
// versionado LIC-R2 v1.0, evidencia obligatoria ADR-035, 4 dimensiones MDPI
// del ESPACIO — jamás puntajes de personas ni de accesibilidad, R5/ADR-036).
// Ciclo E2E del criterio de cierre del issue: la DH acredita (admin, mandato
// nunca persistido — solo hash) → el ciudadano releva un tramo real de la
// capa sidewalks → el reporte ingresa received con sello reporte.recibido
// extendido → la moderación existente transita con justificación pública
// (ADR-038). El tramo NO se flipea a community_validated aquí: eso lo hace
// la corroboración/ingesta futura — el KPI «0 de 18» se mueve cuando el
// dominio cambie (R15).
//
// CAPITAL: SOLO LECTURA — este suite NUNCA toca los 18 tramos del anuncio
// (accesibilidad-rutas.test.ts hardcodea 18/0; showcase exige
// capital.kpis === 0). El tramo del fixture vive en CAUCETE con id QUE NO
// matchea 'seed-f-tramo-%' (el predicado del KPI LIC-R2 nunca lo cuenta) y
// se limpia SIEMPRE (try/finally + afterAll). Requiere Postgres/PostGIS
// real + db:seed; sin base → skip honesto.

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';
process.env.JWT_SECRET = 'test-jwt-secret-lic-r3-practica-452-32ch';

const { createApp } = await import('./app.js');
const { prisma } = await import('@delocalsoy/db');

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

const dbUp = await prisma
  .$queryRaw`SELECT 1`
  .then(() => true)
  .catch(() => false);

let server: any;
let base = '';

// Fixture LIC-R3: tramo de la capa sidewalks de caucete con id que NO
// matchea el predicado del KPI LIC-R2 (cero contaminación cruzada).
const TRAMO_ID = 'fixture-lic-r3-tramo-01';
let capaFixtureId: string | null = null;
const reportesCreados: string[] = [];

async function limpiarFixture(): Promise<void> {
  if (reportesCreados.length > 0) {
    await prisma.reportes.deleteMany({ where: { id: { in: [...reportesCreados] } } });
    reportesCreados.length = 0;
  }
  await prisma.features.deleteMany({ where: { id: TRAMO_ID } });
  if (capaFixtureId !== null) {
    try {
      await prisma.capas.delete({ where: { id: capaFixtureId } });
    } catch {
      // ya eliminada (onDelete cascade) — sin estado
    }
    capaFixtureId = null;
  }
}

async function sembrarTramoFixture(): Promise<void> {
  const caucete = await prisma.nodos.findFirst({ where: { key: 'caucete' } });
  if (!caucete) throw new Error('nodo caucete inexistente — db:seed requerido');
  let capa: any = await prisma.capas.findFirst({ where: { nodo_id: caucete.id, key: 'sidewalks' } });
  if (!capa) {
    capa = await prisma.capas.create({
      data: {
        nodo_id: caucete.id,
        key: 'sidewalks',
        nombre: 'Veredas (fixture LIC-R3)',
        dominio: 'movilidad',
        geometria: 'LineString',
      },
    });
    capaFixtureId = capa.id; // solo la capa PROPIA se elimina al limpiar
  }
  await prisma.features.upsert({
    where: { id: TRAMO_ID },
    create: {
      id: TRAMO_ID,
      nodo_id: caucete.id,
      capa_id: capa.id,
      titulo: 'Tramo fixture LIC-R3 01',
      tipo: 'asset',
      estado: 'declared',
      fuente_label: 'Ilustrativa · fixture test LIC-R3 #452',
      observado_at: new Date(),
      lat: -31.65,
      lng: -68.28,
      is_synthetic: true,
    },
    update: {},
  });
}

beforeAll(async () => {
  execSync('pnpm --filter @delocalsoy/db db:seed', { cwd: repoRoot, stdio: 'pipe' });
  await sembrarTramoFixture();
  server = createApp().listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = 'http://127.0.0.1:' + server.address().port;
}, 60000);

afterAll(async () => {
  await limpiarFixture().catch(() => undefined);
  await new Promise((resolve, reject) => {
    server.close((err: any) => {
      if (err) reject(err);
      else resolve(null);
    });
    if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
  });
});

const jsonHeaders = { 'content-type': 'application/json' };
const PASSWORD = 'contrasena-muy-secreta-8+chars';
const ts = Date.now();
const hoy = new Date().toISOString().slice(0, 10);
const manana = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

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

async function idDeSesion(token: string): Promise<string> {
  const me = await fetch(base + '/api/auth/me', { headers: { authorization: 'Bearer ' + token } });
  const body: any = await me.json();
  return body.data.id as string;
}

function sha32(texto: string): string {
  return createHash('sha256').update(texto).digest('hex').slice(0, 32);
}

describe.skipIf(!dbUp)('LIC-R3: acreditación de práctica (#452, épica #448)', () => {
  const MANDATO = 'Resolución DH 2026-11-11: se acredita la práctica territorial del practicante en el marco LIC-03';
  let tokenAdmin = '';
  let tokenCiudadano = '';
  let tokenVisitante = '';
  let tokenPracticante = '';
  let idPracticante = '';

  it('setup: ciudadano + admin + moderador + visitante con sesión real (patrón VIG-012)', async () => {
    tokenCiudadano = await registrarYLoguear('licr3-ciudadano-' + ts + '@example.test');
    const emailAdmin = 'licr3-admin-' + ts + '@example.test';
    await registrarYLoguear(emailAdmin);
    await prisma.usuarios.update({ where: { email: emailAdmin }, data: { rol: 'admin' } });
    tokenAdmin = await registrarYLoguear(emailAdmin); // re-login ya admin
    const emailVisitante = 'licr3-visitante-' + ts + '@example.test';
    await registrarYLoguear(emailVisitante);
    await prisma.usuarios.update({ where: { email: emailVisitante }, data: { rol: 'visitante' } });
    tokenVisitante = await registrarYLoguear(emailVisitante);

    tokenPracticante = await registrarYLoguear('licr3-practicante-' + ts + '@example.test');
    idPracticante = await idDeSesion(tokenPracticante);
  });

  it('la compuerta del acto: sin sesión 401; ciudadano 403 — solo admin acredita (decision_dh)', async () => {
    const sinSesion = await fetch(base + '/api/practicas/acreditar', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ usuario_id: idPracticante, mandato: MANDATO, referente: { rol: 'REFERENTE_COMUNITARIO', consentimiento_confirmado: true } }),
    });
    expect(sinSesion.status).toBe(401);
    const c = await fetch(base + '/api/practicas/acreditar', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenCiudadano },
      body: JSON.stringify({ usuario_id: idPracticante, mandato: MANDATO, referente: { rol: 'REFERENTE_COMUNITARIO', consentimiento_confirmado: true } }),
    });
    expect(c.status).toBe(403);
  });

  it('validaciones: usuario inexistente 404; visitante 400 (el practicante ES ciudadano); referente sin consentimiento 400; PII en referencia_externa 400 sin eco', async () => {
    const post = (body: unknown) =>
      fetch(base + '/api/practicas/acreditar', {
        method: 'POST',
        headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenAdmin },
        body: JSON.stringify(body),
      });

    const inexistente = await post({ usuario_id: 'cuid-inexistente-' + ts, mandato: MANDATO, referente: { rol: 'REFERENTE_COMUNITARIO', consentimiento_confirmado: true } });
    expect(inexistente.status).toBe(404);

    const idVisitante = await idDeSesion(tokenVisitante);
    const visitante = await post({ usuario_id: idVisitante, mandato: MANDATO, referente: { rol: 'REFERENTE_COMUNITARIO', consentimiento_confirmado: true } });
    expect(visitante.status).toBe(400);

    const sinConsentimiento = await post({ usuario_id: idPracticante, mandato: MANDATO, referente: { rol: 'REFERENTE_COMUNITARIO', nombre: 'Referente de la junta vecinal', consentimiento_confirmado: false } });
    expect(sinConsentimiento.status).toBe(400); // ADR-027: nombrar exige consentimiento

    const pii = await post({ usuario_id: idPracticante, mandato: MANDATO, referente: { rol: 'REFERENTE_COMUNITARIO', consentimiento_confirmado: true }, referencia_externa: 'Convenio con contacto juan.perez@example.com' });
    expect(pii.status).toBe(400);
    const textoPii = JSON.stringify(await pii.json());
    expect(textoPii).not.toContain('juan.perez'); // sin eco del valor rechazado
  });

  it('201 admin: atributo true + /me lo expone + sello practica.acreditada sin PII (hashes verificados)', async () => {
    const res = await fetch(base + '/api/practicas/acreditar', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenAdmin },
      body: JSON.stringify({
        usuario_id: idPracticante,
        mandato: MANDATO,
        referente: { rol: 'REFERENTE_COMUNITARIO', consentimiento_confirmado: true },
        referencia_externa: 'Secretaría de Extensión — convenio marco de práctica',
      }),
    });
    expect(res.status).toBe(201);
    const body: any = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.practica_acreditada).toBe(true);
    expect(body.data.practica_acreditada_en).toBeTruthy();
    expect(JSON.stringify(body)).not.toContain('Resolución DH'); // el mandato jamás en la respuesta

    // La fila persiste el hash del mandato, jamás el texto.
    const fila = await prisma.usuarios.findUnique({ where: { id: idPracticante } });
    expect(fila?.practica_acreditada).toBe(true);
    expect(fila?.practica_mandato_hash).toBe(sha32(MANDATO));
    expect(fila?.practica_referencia_externa).toContain('convenio marco');

    // GET /api/auth/me expone el atributo (patrón AR1).
    const me = await fetch(base + '/api/auth/me', { headers: { authorization: 'Bearer ' + tokenPracticante } });
    const meBody: any = await me.json();
    expect(meBody.data.practica_acreditada).toBe(true);
    expect(meBody.data.practica_acreditada_en).toBeTruthy();

    // Sello sin PII: hashes verificados, sin email ni mandato ni nombre.
    const sello = await prisma.events_raw.findFirst({
      where: { type: 'practica.acreditada' },
      orderBy: { occurred_at: 'desc' },
    });
    expect(sello).toBeTruthy();
    const p: any = sello?.payload;
    expect(p.practicante_hash).toBe(sha32(idPracticante));
    expect(p.mandato_hash).toBe(sha32(MANDATO));
    expect(p.referente_rol).toBe('REFERENTE_COMUNITARIO');
    expect(p.referencia_externa_presente).toBe(true);
    const selloTexto = JSON.stringify(p);
    expect(selloTexto).not.toContain('example.test');
    expect(selloTexto).not.toContain('Resolución DH');
    expect(selloTexto).not.toContain('convenio marco'); // solo la bandera de presencia
  });

  it('re-acreditación renueva: 201 + segundo sello (patrón residencia AR1)', async () => {
    const antes = await prisma.events_raw.count({
      where: { type: 'practica.acreditada', payload: { path: ['practicante_hash'], equals: sha32(idPracticante) } },
    });
    const res = await fetch(base + '/api/practicas/acreditar', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenAdmin },
      body: JSON.stringify({ usuario_id: idPracticante, mandato: MANDATO + ' (renovación)', referente: { rol: 'REFERENTE_COMUNITARIO', consentimiento_confirmado: true } }),
    });
    expect(res.status).toBe(201);
    const despues = await prisma.events_raw.count({
      where: { type: 'practica.acreditada', payload: { path: ['practicante_hash'], equals: sha32(idPracticante) } },
    });
    expect(despues).toBe(antes + 1); // una escritura, un evento (R4)
  });

  it('sin sello no hay canal: relevamiento de un ciudadano común → 403 real (compuerta DL-7)', async () => {
    const res = await fetch(base + '/api/reportes', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenCiudadano },
      body: JSON.stringify({
        nodo_key: 'caucete',
        categoria: 'damaged_sidewalk',
        descripcion: 'Relevamiento de accesibilidad del tramo fixture del anuncio',
        lat: -31.65,
        lng: -68.28,
        relevamiento: {
          feature_id: TRAMO_ID,
          version: 'v1.0',
          fecha_relevamiento: hoy,
          metodo: 'Recorrido peatonal con guía del protocolo LIC-R2 v1.0',
          dimensiones: {
            funcional: 'Verera con baldosas rotas en el tercio sur del tramo observado',
            seguridad: 'Rampa de esquina con desnivel pronunciado observada en el tramo',
            confort: 'Falta de sombra y mobiliario de descanso en el tramo observado',
            destino: 'Acceso al comercio de esquina dificultado por el desnivel del tramo',
          },
          evidencia: {
            evidence_type: 'fotografia_tramo',
            descripcion: 'Fotografía del tramo tomada desde la esquina noreste del fixture',
          },
        },
      }),
    });
    expect(res.status).toBe(403);
    const body: any = await res.json();
    expect(body.error).toContain('practicante acreditado');
  });

  it('con sello: 201 received + columna relevamiento + sello reporte.recibido extendido', async () => {
    const res = await fetch(base + '/api/reportes', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenPracticante },
      body: JSON.stringify({
        nodo_key: 'caucete',
        categoria: 'damaged_sidewalk',
        descripcion: 'Relevamiento de accesibilidad del tramo fixture del anuncio',
        lat: -31.65,
        lng: -68.28,
        relevamiento: {
          feature_id: TRAMO_ID,
          version: 'v1.0',
          fecha_relevamiento: hoy,
          metodo: 'Recorrido peatonal con guía del protocolo LIC-R2 v1.0',
          dimensiones: {
            funcional: 'Verera con baldosas rotas en el tercio sur del tramo observado',
            seguridad: 'Rampa de esquina con desnivel pronunciado observada en el tramo',
            confort: 'Falta de sombra y mobiliario de descanso en el tramo observado',
            destino: 'Acceso al comercio de esquina dificultado por el desnivel del tramo',
          },
          evidencia: {
            evidence_type: 'fotografia_tramo',
            descripcion: 'Fotografía del tramo tomada desde la esquina noreste del fixture',
          },
        },
      }),
    });
    expect(res.status).toBe(201);
    const body: any = await res.json();
    expect(body.data.estado).toBe('received');
    expect(body.data.relevamiento.feature_id).toBe(TRAMO_ID);
    expect(body.data.relevamiento.version).toBe('v1.0');
    reportesCreados.push(body.data.id);

    // Sello extendido: feature_id + version + fecha — sin texto del relevamiento.
    const sello = await prisma.events_raw.findFirst({
      where: { type: 'reporte.recibido', payload: { path: ['reporte_id'], equals: body.data.id } },
    });
    expect(sello).toBeTruthy();
    const p: any = sello?.payload;
    expect(p.relevamiento).toEqual({ feature_id: TRAMO_ID, version: 'v1.0', fecha_relevamiento: hoy });
    expect(JSON.stringify(p)).not.toContain('baldosas');

    // El alta CORE-005 sigue intacta SIN la clave: reporte común del practicante.
    const comun = await fetch(base + '/api/reportes', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenPracticante },
      body: JSON.stringify({ nodo_key: 'caucete', categoria: 'damaged_sidewalk', descripcion: 'Observación común sin frame de relevamiento', lat: -31.651, lng: -68.281 }),
    });
    expect(comun.status).toBe(201);
    const comunBody: any = await comun.json();
    expect(comunBody.data.relevamiento).toBeNull();
    reportesCreados.push(comunBody.data.id);
  });

  it('anclaje real: tramo inexistente 404; feature de otra capa 404; fecha futura 400 (R15)', async () => {
    const frame = {
      version: 'v1.0',
      fecha_relevamiento: hoy,
      metodo: 'Recorrido peatonal con guía del protocolo LIC-R2 v1.0',
      dimensiones: {
        funcional: 'Verera con baldosas rotas en el tercio sur del tramo observado',
        seguridad: 'Rampa de esquina con desnivel pronunciado observada en el tramo',
        confort: 'Falta de sombra y mobiliario de descanso en el tramo observado',
        destino: 'Acceso al comercio de esquina dificultado por el desnivel del tramo',
      },
      evidencia: {
        evidence_type: 'fotografia_tramo',
        descripcion: 'Fotografía del tramo tomada desde la esquina noreste del fixture',
      },
    };
    const post = (relevamiento: Record<string, unknown>) =>
      fetch(base + '/api/reportes', {
        method: 'POST',
        headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenPracticante },
        body: JSON.stringify({ nodo_key: 'caucete', categoria: 'damaged_sidewalk', descripcion: 'Relevamiento de accesibilidad del tramo fixture del anuncio', lat: -31.65, lng: -68.28, relevamiento }),
      });

    const fantasma = await post({ ...frame, feature_id: 'fixture-lic-r3-tramo-99' });
    expect(fantasma.status).toBe(404);

    // seed-f-cau-101 existe pero vive en la capa education, no sidewalks.
    const otraCapa = await post({ ...frame, feature_id: 'seed-f-cau-101' });
    expect(otraCapa.status).toBe(404);

    const futuro = await post({ ...frame, feature_id: TRAMO_ID, fecha_relevamiento: manana });
    expect(futuro.status).toBe(400);
  });

  it('contrato: sin evidencia 400; dimensión corta 400; PII en la evidencia 400 sin eco', async () => {
    const base_ = {
      feature_id: TRAMO_ID,
      version: 'v1.0',
      fecha_relevamiento: hoy,
      metodo: 'Recorrido peatonal con guía del protocolo LIC-R2 v1.0',
      dimensiones: {
        funcional: 'Verera con baldosas rotas en el tercio sur del tramo observado',
        seguridad: 'Rampa de esquina con desnivel pronunciado observada en el tramo',
        confort: 'Falta de sombra y mobiliario de descanso en el tramo observado',
        destino: 'Acceso al comercio de esquina dificultado por el desnivel del tramo',
      },
    };
    const post = (relevamiento: Record<string, unknown>) =>
      fetch(base + '/api/reportes', {
        method: 'POST',
        headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenPracticante },
        body: JSON.stringify({ nodo_key: 'caucete', categoria: 'damaged_sidewalk', descripcion: 'Relevamiento de accesibilidad del tramo fixture del anuncio', lat: -31.65, lng: -68.28, relevamiento }),
      });

    const sinEvidencia = await post({ ...base_, evidencia: undefined });
    expect(sinEvidencia.status).toBe(400);

    const corta = await post({ ...base_, evidencia: { evidence_type: 'observacion_campo', descripcion: 'breve' } });
    expect(corta.status).toBe(400);

    const pii = await post({ ...base_, evidencia: { evidence_type: 'fotografia_tramo', descripcion: 'Contacto del practicante juan.perez@example.com' } });
    expect(pii.status).toBe(400);
    const texto = JSON.stringify(await pii.json());
    expect(texto).not.toContain('juan.perez'); // sin eco
  });

  it('idempotencia: el mismo relevamiento reintenta 200 sin sello nuevo (R4)', async () => {
    const cuerpo = {
      nodo_key: 'caucete',
      categoria: 'damaged_sidewalk',
      descripcion: 'Relevamiento de accesibilidad del tramo fixture del anuncio',
      lat: -31.65,
      lng: -68.28,
      relevamiento: {
        feature_id: TRAMO_ID,
        version: 'v1.0',
        fecha_relevamiento: hoy,
        metodo: 'Recorrido peatonal con guía del protocolo LIC-R2 v1.0',
        dimensiones: {
          funcional: 'Verera con baldosas rotas en el tercio sur del tramo observado',
          seguridad: 'Rampa de esquina con desnivel pronunciado observada en el tramo',
          confort: 'Falta de sombra y mobiliario de descanso en el tramo observado',
          destino: 'Acceso al comercio de esquina dificultado por el desnivel del tramo',
        },
        evidencia: {
          evidence_type: 'fotografia_tramo',
          descripcion: 'Fotografía del tramo tomada desde la esquina noreste del fixture',
        },
      },
    };
    const primero = await fetch(base + '/api/reportes', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenPracticante },
      body: JSON.stringify(cuerpo),
    });
    expect(primero.status).toBe(200); // idempotente contra el creado en el test del canal
    const body: any = await primero.json();
    expect(body.idempotente).toBe(true);
    reportesCreados.push(body.data.id);
    const sellos = await prisma.events_raw.count({
      where: { type: 'reporte.recibido', payload: { path: ['reporte_id'], equals: body.data.id } },
    });
    expect(sellos).toBe(1); // una escritura, un evento
  });

  it('la moderación existente cierra el end-to-end: received → evaluating con justificación (ADR-038)', async () => {
    const idMod = 'licr3-mod-' + ts + '@example.test';
    await registrarYLoguear(idMod);
    await prisma.usuarios.update({ where: { email: idMod }, data: { rol: 'moderador' } });
    const tokenMod = await registrarYLoguear(idMod);

    const reporteId = reportesCreados[0];
    const res = await fetch(base + '/api/reportes/' + reporteId + '/estado', {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenMod },
      body: JSON.stringify({ estado: 'evaluating', justificacion: 'El relevamiento del practicante pasa a evaluación de moderación' }),
    });
    expect(res.status).toBe(200);

    const sello = await prisma.events_raw.findFirst({
      where: { type: 'reporte.estado_cambiado', payload: { path: ['reporte_id'], equals: reporteId } },
    });
    expect(sello).toBeTruthy();
    expect((sello?.payload as any).estado_nuevo).toBe('evaluating');
  });
});
