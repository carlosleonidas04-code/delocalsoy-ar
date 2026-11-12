import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// LIC-DLUI LIC-R7 (LIC-07 #450, épica #448): DL-12 — consentimiento granular
// del portador para patrimonio cultural vivo y memoria oral, extremo a
// extremo contra servicios reales (PostgreSQL/PostGIS):
// - instrumento VIG-009 (custodio_hash) aterrizado y EXTENDIDO al dominio
//   vivo: tabla patrimonio_consentimientos que NACE VACÍA (R15, DL-12 —
//   0 registros hasta consentimientos reales: preparar el instrumento NO
//   es simular otorgamientos)
// - el PORTADOR JAMÁS se identifica (Ley 25.326/ADR-027): la fila acredita
//   QUE existe el consentimiento y sus alcances, nunca QUIÉN lo otorgó;
//   el registrante institucional queda como custodio_hash sha32
// - consentimiento granular NUNCA pre-marcado (ADR-027): cada alcance es
//   z.literal(true) explícito (ausente = no otorgado, false NO es válido) +
//   declaracion z.literal(true) + firmante por ROL comunitario
// - alta idempotente por hash sha256 (custodio|activo|rol|alcances|desde),
//   sello patrimonio.consentido accion otorgado con rollback
// - retiro (DL-12): transición sellada vigente → revocado, revocable en
//   cualquier momento, 409 al repetir — jamás DELETE (ADR-038)
// - compuerta VIG-009 R1: consentimientos SOLO sobre activos con ficha
//   patrimonial (VIG-004)
// - anti-PII (ADR-020 cond. 1, Ley 25.326): el motivo del retiro también
//   pasa la compuerta
// Fixture de escritura en CAUCETE — capital READ-ONLY (patrón LIC-R2/R3/R4).
// Requiere Postgres/PostGIS real (job test de CI); sin base el suite se
// salta (honesto, R5).
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';
process.env.JWT_SECRET = 'test-jwt-secret-lic-r7-consentimientos-450';

const { createApp } = await import('./app.js');
const prisma = (await import('./lib/prisma.js')).default;
const { PatrimonioVivoRowSchema } = await import('@delocalsoy/contracts');

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

describe.skipIf(!dbUp)('Consentimiento del portador (LIC-DLUI LIC-R7 — #450, épica #448)', () => {
  const ts = Date.now();
  const jsonHeaders = { 'content-type': 'application/json' };
  const PASSWORD = 'contrasena-muy-secreta-8+chars';

  let activoConFicha = ''; // fixture de ESCRITURA en caucete (con ficha VIG-004)
  let activoSinFicha = ''; // fixture caucete SIN ficha (compuerta VIG-009 R1)
  let activoIglesia = ''; // activo del seed (READ-ONLY): capilla de iglesia

  beforeAll(async () => {
    // Capital READ-ONLY: los fixtures de escritura viven en caucete.
    activoIglesia = (
      await prisma.activos.findFirstOrThrow({
        where: { nodo_key: 'iglesia', tipo: 'patrimonio', patrimonio: { isNot: null } },
        select: { id: true },
      })
    ).id;
    const a = await prisma.activos.create({
      data: {
        tipo: 'patrimonio',
        titulo: 'LIC-R7 fixture consentimiento caucete ' + ts,
        nodo_key: 'caucete',
        created_by_hash: 'licr7-fixture-caucete-' + ts,
      },
    });
    await prisma.activos_patrimonio.create({
      data: {
        activo_id: a.id,
        proteccion_nivel: 'sin_declaratoria',
        proteccion_norma: 'sin declaratoria — relevamiento comunitario LIC-R7',
        reglas_acceso: [],
      },
    });
    activoConFicha = a.id;
    const b = await prisma.activos.create({
      data: {
        tipo: 'patrimonio',
        titulo: 'LIC-R7 fixture sin ficha caucete ' + ts,
        nodo_key: 'caucete',
        created_by_hash: 'licr7-fixture-sin-ficha-' + ts,
      },
    });
    activoSinFicha = b.id;
  });

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

  function payloadConsentimiento() {
    return {
      firmante_rol: 'portador',
      alcance: { memoria_oral: true, practica_viva: true },
      vigencia_desde: '2026-11-12',
      vigencia_hasta: null,
      declaracion: true,
    };
  }

  it('nace honesto en 0: bandeja pública y bloque de ficha sin consentimientos simulados (R15, DL-12)', async () => {
    const bandeja = await fetch(base + '/api/patrimonio/' + activoIglesia + '/consentimientos');
    expect(bandeja.status).toBe(200);
    const body: any = await bandeja.json();
    expect(body.success).toBe(true);
    expect(body.count).toBe(0); // R15: 0 REAL — la tabla nace vacía
    expect(body.data).toEqual([]);
    expect(body.portador_nota).toContain('el portador no se identifica');

    const ficha = await fetch(base + '/api/patrimonio/' + activoIglesia);
    expect(ficha.status).toBe(200);
    const fichaBody: any = await ficha.json();
    expect(fichaBody.data.consentimientos.vigentes).toBe(0);
    expect(fichaBody.data.consentimientos.revocados).toBe(0);
    expect(fichaBody.data.consentimientos.alcances).toEqual([]);
    expect(fichaBody.data.consentimientos.nota).toContain('el portador no se identifica');
  });

  it('alta granular: moderador registra consentimiento literal true → 201 vigente + sello patrimonio.consentido accion otorgado', async () => {
    const token = await rolYLoguear('licr7-' + ts + '-mod@example.test', 'moderador');
    const payload = payloadConsentimiento();

    const res = await fetch(base + '/api/patrimonio/' + activoConFicha + '/consentimientos', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify(payload),
    });
    expect(res.status).toBe(201);
    const body: any = await res.json();
    expect(body.data.duplicada).toBe(false);
    expect(body.data.activo_id).toBe(activoConFicha);
    const cid = body.data.consentimiento_id as string;

    const fila = await prisma.patrimonio_consentimientos.findUniqueOrThrow({ where: { id: cid } });
    expect(fila.estado).toBe('vigente');
    expect(fila.firmante_rol).toBe('portador');
    expect(fila.alcances).toEqual({ memoria_oral: true, practica_viva: true });
    expect(fila.revocado_en).toBeNull();

    // Sello del acto (fuente de verdad), ACOTADO por consentimiento_id
    // (patrón NCAP-R1: un count/find global de events_raw es racy bajo
    // suites paralelas).
    const sellos: any[] = await prisma.events_raw.findMany({
      where: { type: 'patrimonio.consentido', payload: { path: ['consentimiento_id'], equals: cid } },
    });
    expect(sellos.length).toBe(1);
    expect(sellos[0].payload.accion).toBe('otorgado');
    expect(sellos[0].payload.firmante_rol).toBe('portador');
    expect(sellos[0].payload.alcances).toEqual({ memoria_oral: true, practica_viva: true });
    expect(JSON.stringify(sellos[0].payload)).not.toContain('@'); // sin PII (ADR-027)
  });

  it('compuerta ADR-027: alcance vacío → 400, false → 400, declaracion ausente → 400 (jamás pre-marcado)', async () => {
    const token = await fetch(base + '/api/auth/login', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ email: 'licr7-' + ts + '-mod@example.test', password: PASSWORD }),
    }).then((r) => r.json().then((b: any) => b.data.token as string));

    const base_ = payloadConsentimiento();
    const vacio = await fetch(base + '/api/patrimonio/' + activoConFicha + '/consentimientos', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify({ ...base_, alcance: {} }),
    });
    expect(vacio.status).toBe(400); // sin al menos un alcance true no hay consentimiento
    await vacio.arrayBuffer();

    const falso = await fetch(base + '/api/patrimonio/' + activoConFicha + '/consentimientos', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify({ ...base_, alcance: { memoria_oral: false } }),
    });
    expect(falso.status).toBe(400); // z.literal(true): false NO es válido
    await falso.arrayBuffer();

    const implicito = await fetch(base + '/api/patrimonio/' + activoConFicha + '/consentimientos', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify({ ...base_, declaracion: undefined }),
    });
    expect(implicito.status).toBe(400); // declaracion z.literal(true): imposible el implícito
    await implicito.arrayBuffer();

    // Nada de lo rechazado persistió (fixture acotado por activo).
    const filas = await prisma.patrimonio_consentimientos.count({ where: { activo_id: activoConFicha } });
    expect(filas).toBe(1); // solo el alta del test anterior
  });

  it('idempotencia: mismo registrante + mismo payload → duplicada true sin segunda fila', async () => {
    const token = await fetch(base + '/api/auth/login', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ email: 'licr7-' + ts + '-mod@example.test', password: PASSWORD }),
    }).then((r) => r.json().then((b: any) => b.data.token as string));

    const res = await fetch(base + '/api/patrimonio/' + activoConFicha + '/consentimientos', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify(payloadConsentimiento()),
    });
    expect(res.status).toBe(200); // idempotente, no 201 duplicado
    const body: any = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.duplicada).toBe(true);

    const filas = await prisma.patrimonio_consentimientos.count({ where: { activo_id: activoConFicha } });
    expect(filas).toBe(1);
  });

  it('integridad custodio_hash: sha32 del registrante, distinto por registrante, bandeja sin PII', async () => {
    const emailAdmin = 'licr7-' + ts + '-admin@example.test';
    const token = await rolYLoguear(emailAdmin, 'admin');

    // Mismo payload, DISTINTO registrante → distinto hash → segunda fila.
    const res = await fetch(base + '/api/patrimonio/' + activoConFicha + '/consentimientos', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify(payloadConsentimiento()),
    });
    expect(res.status).toBe(201);
    await res.arrayBuffer();

    const filas = (await prisma.patrimonio_consentimientos.findMany({
      where: { activo_id: activoConFicha },
      orderBy: { created_at: 'asc' },
    })) as any[];
    expect(filas.length).toBe(2);
    for (const f of filas) {
      expect(f.created_by_hash).toMatch(/^[0-9a-f]{32}$/); // sha32 (sha256 truncado)
    }
    expect(filas[0].created_by_hash).not.toBe(filas[1].created_by_hash); // registrantes distintos

    // El custodio_hash ES el pseudónimo del usuario registrante (VIG-009).
    const admin = await prisma.usuarios.findUniqueOrThrow({ where: { email: emailAdmin } });
    const esperado = createHash('sha256').update(admin.id).digest('hex').slice(0, 32);
    expect(filas[1].created_by_hash).toBe(esperado);

    // Bandeja pública: deriva del contrato y NO contiene PII del portador
    // ni del registrante (Ley 25.326/ADR-027).
    const bandeja = await fetch(base + '/api/patrimonio/' + activoConFicha + '/consentimientos');
    const body: any = await bandeja.json();
    expect(body.count).toBe(2);
    for (const row of body.data) {
      expect(() => PatrimonioVivoRowSchema.parse(row)).not.toThrow();
      expect(row.custodio_hash).toMatch(/^[0-9a-f]{32}$/);
    }
    expect(JSON.stringify(body)).not.toContain('@');
    expect(JSON.stringify(body)).not.toContain('example.test');
  });

  it('retiro: transición sellada vigente → revocado con sello accion revocado, 409 al repetir (jamás DELETE)', async () => {
    const token = await fetch(base + '/api/auth/login', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ email: 'licr7-' + ts + '-mod@example.test', password: PASSWORD }),
    }).then((r) => r.json().then((b: any) => b.data.token as string));

    const filas = (await prisma.patrimonio_consentimientos.findMany({
      where: { activo_id: activoConFicha },
      orderBy: { created_at: 'asc' },
    })) as any[];
    const segunda = filas[1]; // la del admin (test anterior)

    const retiro = await fetch(base + '/api/patrimonio/' + activoConFicha + '/consentimientos/' + segunda.id, {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify({ estado: 'revocado' }),
    });
    expect(retiro.status).toBe(200);
    const retiroBody: any = await retiro.json();
    expect(retiroBody.data.estado).toBe('revocado');

    const fila = await prisma.patrimonio_consentimientos.findUniqueOrThrow({ where: { id: segunda.id } });
    expect(fila.estado).toBe('revocado');
    expect(fila.revocado_en).not.toBeNull();
    expect(fila.motivo).toBeNull();

    // Sello del retiro (transición, no DELETE): 2 sellos para la fila.
    const sellos: any[] = await prisma.events_raw.findMany({
      where: { type: 'patrimonio.consentido', payload: { path: ['consentimiento_id'], equals: segunda.id } },
    });
    expect(sellos.length).toBe(2);
    const selloRetiro = sellos.find((s: any) => s.payload.accion === 'revocado');
    expect(selloRetiro, 'falta el sello del retiro').toBeTruthy();
    expect(JSON.stringify(selloRetiro!.payload)).not.toContain('@');

    // Segunda revocación → 409 (solo transición vigente → revocado).
    const repite = await fetch(base + '/api/patrimonio/' + activoConFicha + '/consentimientos/' + segunda.id, {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify({ estado: 'revocado' }),
    });
    expect(repite.status).toBe(409);
    await repite.arrayBuffer();

    // Bandeja y bloque de ficha honestos: 1 vigente, 1 revocado.
    const bandeja = await fetch(base + '/api/patrimonio/' + activoConFicha + '/consentimientos');
    const bandejaBody: any = await bandeja.json();
    expect(bandejaBody.count).toBe(2);
    expect(bandejaBody.data.filter((c: any) => c.estado === 'vigente').length).toBe(1);
    expect(bandejaBody.data.filter((c: any) => c.estado === 'revocado').length).toBe(1);

    const ficha = await fetch(base + '/api/patrimonio/' + activoConFicha);
    const fichaBody: any = await ficha.json();
    expect(fichaBody.data.consentimientos.vigentes).toBe(1);
    expect(fichaBody.data.consentimientos.revocados).toBe(1);
    expect(fichaBody.data.consentimientos.alcances).toEqual(['memoria_oral', 'practica_viva']);
  });

  it('R15: el ciudadano NO registra consentimientos → 403 (alta curada por moderador|admin)', async () => {
    const token = await registrarYLoguear('licr7-' + ts + '-ciu@example.test');
    const res = await fetch(base + '/api/patrimonio/' + activoConFicha + '/consentimientos', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify(payloadConsentimiento()),
    });
    expect(res.status).toBe(403);
    await res.arrayBuffer();

    const filas = await prisma.patrimonio_consentimientos.count({ where: { activo_id: activoConFicha } });
    expect(filas).toBe(2); // sin cambios
  });

  it('compuerta VIG-009 R1: activo sin ficha patrimonial (VIG-004) → 404', async () => {
    const token = await fetch(base + '/api/auth/login', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ email: 'licr7-' + ts + '-mod@example.test', password: PASSWORD }),
    }).then((r) => r.json().then((b: any) => b.data.token as string));

    const res = await fetch(base + '/api/patrimonio/' + activoSinFicha + '/consentimientos', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify(payloadConsentimiento()),
    });
    expect(res.status).toBe(404);
    const body: any = await res.json();
    expect(body.error).toContain('ficha patrimonial');
  });

  it('anti-PII (ADR-020 cond. 1, Ley 25.326): motivo del retiro con email → 400 y el consentimiento queda vigente', async () => {
    const token = await fetch(base + '/api/auth/login', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ email: 'licr7-' + ts + '-mod@example.test', password: PASSWORD }),
    }).then((r) => r.json().then((b: any) => b.data.token as string));

    const filas = (await prisma.patrimonio_consentimientos.findMany({
      where: { activo_id: activoConFicha, estado: 'vigente' },
    })) as any[];
    expect(filas.length).toBe(1); // la del moderador (test de alta)

    const res = await fetch(base + '/api/patrimonio/' + activoConFicha + '/consentimientos/' + filas[0].id, {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify({ estado: 'revocado', motivo: 'escribió a contacto@servidor.com' }),
    });
    expect(res.status).toBe(400); // el retiro tampoco es un refugio de PII
    await res.arrayBuffer();

    const fila = await prisma.patrimonio_consentimientos.findUniqueOrThrow({ where: { id: filas[0].id } });
    expect(fila.estado).toBe('vigente'); // sin sello no hay retiro: nada cambió
    expect(fila.revocado_en).toBeNull();
  });
});
