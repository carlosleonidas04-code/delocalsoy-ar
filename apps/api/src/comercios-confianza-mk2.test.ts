import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// MARKET-CAP MK-2 (#243, sub-épica #152): confianza — suite E2E de las
// superficies nuevas del Mercado de Proximidad (design doc
// MARKET-CAP-DISENO-MK2.md §9.5, ratificado 5/5 por la DH 2026-10-18,
// traza #243): PATCH /api/comercios/:id/habilitacion (titular verificado
// o moderación, DH §7.1), GET /api/comercios/:id/historial (F-3, ciclo
// completo, DH §7.2) y desistir dentro de POST /:id/titular (DH §7.5).
// H1: titularidadPublica — el hash del reclamante JAMÁS sale en salida
// pública (Ley 25.326). Justificación pública ≥ 10 (ADR-038) con anti-PII
// (ADR-020 cond. 1); sello + rollback (R4/R15); guard 404 idéntico al de
// GET /:id (H3, ADR-036). Requiere Postgres/PostGIS real (job test de
// CI); sin base → skip honesto (patrón de la suite #248). El test
// ejecuta el seed REAL (idempotente) y usa aserciones DINÁMICAS contra
// el dominio vivo.

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';
process.env.JWT_SECRET = 'test-jwt-secret-marketcap-mk2-confianza-32';

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
  // Cleanup de los comercios creados por la suite (el cascade borra la ficha).
  await prisma.activos
    .deleteMany({ where: { titulo: { startsWith: 'Comercio test MK-2' } } })
    .catch(() => undefined);
  await new Promise((resolve, reject) => {
    server.close((err: any) => {
      if (err) reject(err);
      else resolve(null);
    });
    if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
  });
});

describe.skipIf(!dbUp)('Comercios MARKET-CAP MK-2 (#243, sub-épica #152)', () => {
  const ts = Date.now();
  const jsonHeaders = { 'content-type': 'application/json' };
  const PASSWORD = 'contrasena-muy-secreta-8+chars';

  async function registrarYLoguear(email: string): Promise<string> {
    const reg = await fetch(base + '/api/auth/register', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ email, password: PASSWORD }),
    });
    if (reg.status !== 409) {
      expect(reg.status, 'register ' + email).toBe(201);
    }
    const login = await fetch(base + '/api/auth/login', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ email, password: PASSWORD }),
    });
    expect(login.status, 'login ' + email).toBe(200);
    return ((await login.json()) as any).data.token as string;
  }

  async function altaComercio(token: string, titulo: string, extra: Record<string, unknown> = {}): Promise<any> {
    const res = await fetch(base + '/api/comercios', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify({
        nodo_key: 'capital',
        titulo,
        rubro_id: 'food_drink',
        tipo: 'local',
        ...extra,
      }),
    });
    const body = await res.json().catch(() => null);
    return { res, body };
  }

  async function altaYAprobada(email: string, sufijo: string, extra: Record<string, unknown> = {}): Promise<string> {
    const token = await registrarYLoguear(email);
    const { res, body } = await altaComercio(token, 'Comercio test MK-2 ' + sufijo + ' ' + ts, extra);
    expect(res.status, 'alta ' + sufijo).toBe(201);
    const id = body.data.activo.id as string;
    await prisma.usuarios.update({ where: { email }, data: { rol: 'moderador' } });
    const tokenModerador = await registrarYLoguear(email);
    const patch = await fetch(base + '/api/comercios/' + id + '/estado', {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenModerador },
      body: JSON.stringify({ estado: 'aprobado', justificacion: 'aprobacion de prueba del test MK-2 ' + sufijo }),
    });
    expect(patch.status, 'aprobar ' + sufijo).toBe(200);
    await patch.arrayBuffer();
    return id;
  }

  async function idsPublicos(query = ''): Promise<string[]> {
    const res = await fetch(base + '/api/comercios' + query);
    const body: any = await res.json();
    expect(body.success).toBe(true);
    return body.data.map((c: any) => c.id as string);
  }

  it('1. PATCH /:id/habilitacion por el titular verificado con evidencia completa: 200, ficha verificada, sello comercio.habilitacion_actualizada (DH §7.1)', async () => {
    const emailAlta = 'mk2-' + ts + '-a@example.test';
    const id = await altaYAprobada(emailAlta, 'A');
    const tokenModerador = await registrarYLoguear(emailAlta);
    const emailTitular = 'mk2-' + ts + '-a2@example.test';
    const tokenTitular = await registrarYLoguear(emailTitular);
    const reclamo = await fetch(base + '/api/comercios/' + id + '/titular', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenTitular },
      body: JSON.stringify({ metodo: 'expediente', identificador: 'EXP-2026-' + ts, declaracion_consentimiento: true }),
    });
    expect(reclamo.status).toBe(201);
    await reclamo.arrayBuffer();
    const verificacion = await fetch(base + '/api/comercios/' + id + '/titular', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenModerador },
      body: JSON.stringify({}),
    });
    expect(verificacion.status).toBe(200);
    await verificacion.arrayBuffer();
    const patch = await fetch(base + '/api/comercios/' + id + '/habilitacion', {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenTitular },
      body: JSON.stringify({
        habilitacion: {
          estado: 'verificada',
          tipo: 'municipal',
          numero: 'HAB-2026-' + ts,
          fuente_key: 'fuente_siic_web',
          url: 'https://industriaycomercio.sanjuan.gob.ar/certificado-' + ts,
          fecha_verificacion: '2026-10-18',
        },
        justificacion: 'carga de la habilitacion verificada del test MK-2 A',
      }),
    });
    expect(patch.status).toBe(200);
    const bodyPatch: any = await patch.json();
    expect(bodyPatch.data.habilitacion.estado).toBe('verificada');
    const ficha = await fetch(base + '/api/comercios/' + id);
    const bodyFicha: any = await ficha.json();
    expect(bodyFicha.data.habilitacion.estado).toBe('verificada');
    expect(bodyFicha.data.estado_epistemico).toBe('verified');
    expect(await idsPublicos('?habilitacion=verificada')).toContain(id);
    const sello: any = await prisma.events_raw.findFirst({
      where: { type: 'comercio.habilitacion_actualizada', payload: { path: ['comercio_id'], equals: id } },
    });
    expect(sello, 'falta el sello comercio.habilitacion_actualizada').not.toBeNull();
    expect(sello.payload.estado_anterior).toBe('sin_dato');
    expect(sello.payload.estado_nuevo).toBe('verificada');
    expect(sello.payload.fuente_key).toBe('fuente_siic_web');
    expect(sello.payload.actualizado_por_hash).toMatch(/^[0-9a-f]{32}$/);
  });

  it('2. refine ADR-035 en el camino nuevo: verificada sin evidencia primaria completa → 400; silencio_positivo sin fecha_presentacion → 400', async () => {
    const email = 'mk2-' + ts + '-b@example.test';
    const id = await altaYAprobada(email, 'B');
    const tokenModerador = await registrarYLoguear(email);
    const cabecera = { ...jsonHeaders, authorization: 'Bearer ' + tokenModerador };
    const sinEvidencia = await fetch(base + '/api/comercios/' + id + '/habilitacion', {
      method: 'PATCH',
      headers: cabecera,
      body: JSON.stringify({ habilitacion: { estado: 'verificada' }, justificacion: 'cambio incompleto del test MK-2 B' }),
    });
    expect(sinEvidencia.status).toBe(400);
    await sinEvidencia.arrayBuffer();
    const silencioSinFecha = await fetch(base + '/api/comercios/' + id + '/habilitacion', {
      method: 'PATCH',
      headers: cabecera,
      body: JSON.stringify({ habilitacion: { estado: 'silencio_positivo' }, justificacion: 'silencio sin fecha del test MK-2 B' }),
    });
    expect(silencioSinFecha.status).toBe(400);
    await silencioSinFecha.arrayBuffer();
    const ficha: any = await prisma.comercio_ficha.findUnique({ where: { activo_id: id } });
    expect((ficha.habilitacion as any).estado).toBe('sin_dato'); // nada persistió
  });

  it('3. permisos: ciudadano no titular → 403 sin eco; moderador → 200 (corrección de moderación, DH §7.1)', async () => {
    const emailAlta = 'mk2-' + ts + '-c@example.test';
    const id = await altaYAprobada(emailAlta, 'C');
    const tokenModerador = await registrarYLoguear(emailAlta);
    const emailAjeno = 'mk2-' + ts + '-c2@example.test';
    const tokenAjeno = await registrarYLoguear(emailAjeno);
    const ajeno = await fetch(base + '/api/comercios/' + id + '/habilitacion', {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenAjeno },
      body: JSON.stringify({ habilitacion: { estado: 'en_tramite' }, justificacion: 'intento de un ciudadano ajeno del test MK-2 C' }),
    });
    expect(ajeno.status).toBe(403);
    const textoAjeno = JSON.stringify(await ajeno.json());
    expect(textoAjeno).not.toContain(emailAlta);
    const moderador = await fetch(base + '/api/comercios/' + id + '/habilitacion', {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenModerador },
      body: JSON.stringify({ habilitacion: { estado: 'en_tramite' }, justificacion: 'correccion de moderacion del test MK-2 C' }),
    });
    expect(moderador.status).toBe(200);
    await moderador.arrayBuffer();
  });

  it('4. rollback (R4/R15): el sello falla → la ficha conserva la habilitación anterior y responde 500', async () => {
    const email = 'mk2-' + ts + '-d@example.test';
    const id = await altaYAprobada(email, 'D');
    const tokenModerador = await registrarYLoguear(email);
    await prisma.$executeRawUnsafe("ALTER TABLE events_raw ADD CONSTRAINT mk2_test_bloquea_sello CHECK (type <> 'comercio.habilitacion_actualizada')");
    try {
      const patch = await fetch(base + '/api/comercios/' + id + '/habilitacion', {
        method: 'PATCH',
        headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenModerador },
        body: JSON.stringify({ habilitacion: { estado: 'en_tramite' }, justificacion: 'cambio que no podra sellarse del test MK-2 D' }),
      });
      expect(patch.status).toBe(500);
      const texto = JSON.stringify(await patch.json());
      expect(texto).not.toContain('en_tramite'); // sin eco del valor
      const ficha: any = await prisma.comercio_ficha.findUnique({ where: { activo_id: id } });
      expect((ficha.habilitacion as any).estado).toBe('sin_dato'); // ROLLBACK: sin sello no hay cambio
      const sellos = await prisma.events_raw.count({
        where: { type: 'comercio.habilitacion_actualizada', payload: { path: ['comercio_id'], equals: id } },
      });
      expect(sellos).toBe(0);
    } finally {
      await prisma.$executeRawUnsafe('ALTER TABLE events_raw DROP CONSTRAINT mk2_test_bloquea_sello');
    }
  });

  it('5. GET /:id/historial 1:1 con los sellos en occurred_at asc; ficha recién creada = exactamente 1 entrada (H6)', async () => {
    const email = 'mk2-' + ts + '-e@example.test';
    const token = await registrarYLoguear(email);
    const { res, body } = await altaComercio(token, 'Comercio test MK-2 E ' + ts);
    expect(res.status).toBe(201);
    const id = body.data.activo.id as string;
    const hist1 = await fetch(base + '/api/comercios/' + id + '/historial');
    expect(hist1.status).toBe(200);
    const body1: any = await hist1.json();
    expect(body1.data.length).toBe(1); // H6: toda ficha viva nace con su sello de alta
    expect(body1.data[0].type).toBe('comercio.ingestado');
    expect(Object.keys(body1.data[0]).sort()).toEqual(['occurred_at', 'type']);
    // ciclo completo: reclamar + verificar + editar atributos → 4 entradas encadenadas
    const reclamo = await fetch(base + '/api/comercios/' + id + '/titular', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify({ metodo: 'expediente', identificador: 'EXP-2026-' + ts, declaracion_consentimiento: true }),
    });
    expect(reclamo.status).toBe(201);
    await reclamo.arrayBuffer();
    await prisma.usuarios.update({ where: { email }, data: { rol: 'moderador' } });
    const tokenModerador = await registrarYLoguear(email);
    const verificacion = await fetch(base + '/api/comercios/' + id + '/titular', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenModerador },
      body: JSON.stringify({}),
    });
    expect(verificacion.status).toBe(200);
    await verificacion.arrayBuffer();
    const edicion = await fetch(base + '/api/comercios/' + id, {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify({ atributos: { venta_directa: true, delivery: true, pagos: ['qr'], accesibilidad: 'declarada' } }),
    });
    expect(edicion.status).toBe(200);
    await edicion.arrayBuffer();
    const hist2 = await fetch(base + '/api/comercios/' + id + '/historial');
    const body2: any = await hist2.json();
    expect(body2.data.length).toBe(4);
    expect(body2.data.map((e: any) => e.type)).toEqual([
      'comercio.ingestado',
      'comercio.titularidad_reclamada',
      'comercio.titularidad_verificada',
      'comercio.atributos_editados',
    ]);
    for (let i = 1; i < body2.data.length; i++) {
      expect(new Date(body2.data[i].occurred_at).getTime()).toBeGreaterThanOrEqual(new Date(body2.data[i - 1].occurred_at).getTime());
    }
  });

  it('6. historial de ficha rechazada o restricted → 404 idéntico al de una ficha inexistente (H3, ADR-036)', async () => {
    const email = 'mk2-' + ts + '-f@example.test';
    const id = await altaYAprobada(email, 'F');
    const tokenModerador = await registrarYLoguear(email);
    const rechazar = await fetch(base + '/api/comercios/' + id + '/estado', {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenModerador },
      body: JSON.stringify({ estado: 'rechazado', justificacion: 'rechazo de prueba del test MK-2 F' }),
    });
    expect(rechazar.status).toBe(200);
    await rechazar.arrayBuffer();
    const histRechazado = await fetch(base + '/api/comercios/' + id + '/historial');
    expect(histRechazado.status).toBe(404);
    const bodyRechazado: any = await histRechazado.json();
    const histInexistente = await fetch(base + '/api/comercios/no-existe-mk2-' + ts + '/historial');
    expect(histInexistente.status).toBe(404);
    const bodyInexistente: any = await histInexistente.json();
    expect(bodyRechazado).toEqual(bodyInexistente); // indistinguibles desde afuera
    // restricted: mismo 404 sin eco (ADR-036)
    const id2 = await altaYAprobada('mk2-' + ts + '-f2@example.test', 'F2');
    await prisma.activos.update({ where: { id: id2 }, data: { visibilidad: 'restricted' } });
    const histRestricted = await fetch(base + '/api/comercios/' + id2 + '/historial');
    expect(histRestricted.status).toBe(404);
    const bodyRestricted: any = await histRestricted.json();
    expect(bodyRestricted).toEqual(bodyInexistente);
  });

  it('7. el historial JAMÁS expone identificador_hash ni reclamado_por_hash (DH §7.2, H1): assert sobre la salida completa', async () => {
    const emailAlta = 'mk2-' + ts + '-g@example.test';
    const id = await altaYAprobada(emailAlta, 'G');
    const tokenModerador = await registrarYLoguear(emailAlta);
    const emailTitular = 'mk2-' + ts + '-g2@example.test';
    const tokenTitular = await registrarYLoguear(emailTitular);
    const reclamo = await fetch(base + '/api/comercios/' + id + '/titular', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenTitular },
      body: JSON.stringify({ metodo: 'expediente', identificador: 'EXP-2026-' + ts, declaracion_consentimiento: true }),
    });
    expect(reclamo.status).toBe(201);
    await reclamo.arrayBuffer();
    const verificacion = await fetch(base + '/api/comercios/' + id + '/titular', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenModerador },
      body: JSON.stringify({}),
    });
    expect(verificacion.status).toBe(200);
    await verificacion.arrayBuffer();
    const historial = await fetch(base + '/api/comercios/' + id + '/historial');
    expect(historial.status).toBe(200);
    const texto = JSON.stringify(await historial.json());
    expect(texto).not.toContain('identificador_hash');
    expect(texto).not.toContain('reclamado_por_hash');
    expect(texto).not.toContain('desistido_por_hash');
    expect(texto).not.toContain('EXP-2026'); // el identificador jamás en claro
    // y la ficha pública tampoco (H1): titularidad saneada a { estado }
    const ficha = await fetch(base + '/api/comercios/' + id);
    const bodyFicha: any = await ficha.json();
    expect(bodyFicha.data.titularidad).toEqual({ estado: 'verificada' });
  });

  it('8. anti-PII: teléfono en la justificación → 400 sin eco, sin sello, sin persistencia (ADR-020 cond. 1, Ley 25.326)', async () => {
    const email = 'mk2-' + ts + '-h@example.test';
    const id = await altaYAprobada(email, 'H');
    const tokenModerador = await registrarYLoguear(email);
    const patch = await fetch(base + '/api/comercios/' + id + '/habilitacion', {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenModerador },
      body: JSON.stringify({ habilitacion: { estado: 'en_tramite' }, justificacion: 'llamar al +54 264 555-1234 para coordinar la habilitacion' }),
    });
    expect(patch.status).toBe(400);
    const texto = JSON.stringify(await patch.json());
    expect(texto).not.toContain('555-1234'); // sin eco del valor rechazado
    expect(texto).not.toContain('+54');
    const ficha: any = await prisma.comercio_ficha.findUnique({ where: { activo_id: id } });
    expect((ficha.habilitacion as any).estado).toBe('sin_dato'); // nada persistió
    const sellos = await prisma.events_raw.count({
      where: { type: 'comercio.habilitacion_actualizada', payload: { path: ['comercio_id'], equals: id } },
    });
    expect(sellos).toBe(0);
  });

  it('9. desistir (DH §7.5): el reclamante → 200 desistida + sello; un no-reclamante → 403; la ficha vuelve a ser reclamable (ciclo completo)', async () => {
    const emailAlta = 'mk2-' + ts + '-i@example.test';
    const id = await altaYAprobada(emailAlta, 'I');
    const tokenModerador = await registrarYLoguear(emailAlta);
    const emailReclamante = 'mk2-' + ts + '-i2@example.test';
    const tokenReclamante = await registrarYLoguear(emailReclamante);
    const reclamo = await fetch(base + '/api/comercios/' + id + '/titular', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenReclamante },
      body: JSON.stringify({ metodo: 'expediente', identificador: 'EXP-2026-' + ts, declaracion_consentimiento: true }),
    });
    expect(reclamo.status).toBe(201);
    await reclamo.arrayBuffer();
    // un no-reclamante no puede desistir → 403 sin eco
    const emailAjeno = 'mk2-' + ts + '-i3@example.test';
    const tokenAjeno = await registrarYLoguear(emailAjeno);
    const desistirAjeno = await fetch(base + '/api/comercios/' + id + '/titular', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenAjeno },
      body: JSON.stringify({ accion: 'desistir', declaracion_consentimiento: true }),
    });
    expect(desistirAjeno.status).toBe(403);
    await desistirAjeno.arrayBuffer();
    // el reclamante desiste → 200 con respuesta saneada { estado: 'desistida' }
    const desistir = await fetch(base + '/api/comercios/' + id + '/titular', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenReclamante },
      body: JSON.stringify({ accion: 'desistir', declaracion_consentimiento: true }),
    });
    expect(desistir.status).toBe(200);
    const bodyDesistir: any = await desistir.json();
    expect(bodyDesistir.data.titularidad.estado).toBe('desistida');
    expect(Object.keys(bodyDesistir.data.titularidad).sort()).toEqual(['estado']); // respuesta saneada (H1)
    const sello: any = await prisma.events_raw.findFirst({
      where: { type: 'comercio.titularidad_desistida', payload: { path: ['comercio_id'], equals: id } },
    });
    expect(sello, 'falta el sello comercio.titularidad_desistida').not.toBeNull();
    expect(sello.payload.desistido_por_hash).toMatch(/^[0-9a-f]{32}$/); // vive en el sello (append-only)…
    const ficha: any = await prisma.comercio_ficha.findUnique({ where: { activo_id: id } });
    expect(JSON.stringify(ficha.titularidad)).not.toContain('reclamado_por_hash'); // …pero la ficha queda sana
    expect(ficha.titularidad.estado).toBe('desistida');
    // la ficha desistida vuelve a ser reclamable: otro ciudadano reclama → 201 (ciclo completo, DH §7.2)
    const reclamo2 = await fetch(base + '/api/comercios/' + id + '/titular', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenAjeno },
      body: JSON.stringify({ metodo: 'expediente', identificador: 'EXP-2026-' + ts + '-B', declaracion_consentimiento: true }),
    });
    expect(reclamo2.status).toBe(201);
    await reclamo2.arrayBuffer();
  });
});
