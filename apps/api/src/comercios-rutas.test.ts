import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// MARKET-CAP MK-1 (#243, sub-épica #152): Mercado de Proximidad — suite E2E
// de la ruta /api/comercios (MK-0 §2.7: 12 tests). Decisiones ratificadas
// por la DH (2026-10-17, traza #243): Opción A (activo local|prestador +
// ficha 1:1 comercio_ficha — el estado y la visibilidad viven en activos),
// v1 SIN pagos (MK-5 = fase 2) y SIN PII de contacto (relay por plataforma,
// Ley 25.326), canon de 11 rubros (fixture lote 3A) + legados cat-*,
// multinodo desde día 1, semilla con 0 comercios (patrón VIG-005: solo se
// publica lo verificado). Requiere Postgres/PostGIS real (job test de CI);
// sin base → skip honesto (patrón productos-operativa). El test ejecuta el
// seed REAL (idempotente) y usa aserciones DINÁMICAS contra el dominio vivo.

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';
process.env.JWT_SECRET = 'test-jwt-secret-marketcap-mk1-comercios-32';

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
    .deleteMany({ where: { titulo: { startsWith: 'Comercio test MK-1' } } })
    .catch(() => undefined);
  await new Promise((resolve, reject) => {
    server.close((err: any) => {
      if (err) reject(err);
      else resolve(null);
    });
    if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
  });
});

describe.skipIf(!dbUp)('Comercios MARKET-CAP MK-1 (#243, sub-épica #152)', () => {
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
    const { res, body } = await altaComercio(token, 'Comercio test MK-1 ' + sufijo + ' ' + ts, extra);
    expect(res.status, 'alta ' + sufijo).toBe(201);
    const id = body.data.activo.id as string;
    await prisma.usuarios.update({ where: { email }, data: { rol: 'moderador' } });
    const tokenModerador = await registrarYLoguear(email);
    const patch = await fetch(base + '/api/comercios/' + id + '/estado', {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenModerador },
      body: JSON.stringify({ estado: 'aprobado', justificacion: 'aprobacion de prueba del test MK-1 ' + sufijo }),
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

  it('1. alta ciudadana: nace propuesto con ficha 1:1, sello comercio.ingestado sin PII (R4/R15, R5b)', async () => {
    const email = 'mk1-' + ts + '-a@example.test';
    const token = await registrarYLoguear(email);
    const { res, body } = await altaComercio(token, 'Comercio test MK-1 A ' + ts, {
      descripcion: 'Almacen de barrio de prueba del Mercado de Proximidad',
    });
    expect(res.status).toBe(201);
    expect(body.data.activo.estado).toBe('propuesto'); // R5b: nunca nace aprobado
    expect(body.data.activo.visibilidad).toBe('public'); // ADR-036
    expect(body.data.ficha.rubro).toEqual({ id: 'food_drink', rama: null, label: 'Alimentación y bebidas' });
    expect(body.data.ficha.estado_epistemico).toBe('pending');
    expect(body.data.ficha.titularidad.estado).toBe('sin_reclamo');
    // ficha 1:1 en la tabla real
    const ficha: any = await prisma.comercio_ficha.findUnique({ where: { activo_id: body.data.activo.id } });
    expect(ficha).not.toBeNull();
    expect(ficha.rubro_id).toBe('food_drink');
    // el propuesto NO sale en la lectura pública (moderación primero)
    expect(await idsPublicos()).not.toContain(body.data.activo.id);
    // sello en la fuente de verdad, sin PII
    const sello: any = await prisma.events_raw.findFirst({
      where: { type: 'comercio.ingestado', payload: { path: ['comercio_id'], equals: body.data.activo.id } },
    });
    expect(sello, 'falta el sello comercio.ingestado').not.toBeNull();
    expect(sello.payload.rubro_id).toBe('food_drink');
    expect(sello.payload.nodo_key).toBe('capital');
    const texto = JSON.stringify(sello);
    expect(texto).not.toContain(email);
    expect(texto).not.toContain('example.test');
  });

  it('2. idempotencia del alta: mismo reintento → 200 idempotente con el mismo id, ficha 1:1 sin duplicado', async () => {
    const email = 'mk1-' + ts + '-b@example.test';
    const token = await registrarYLoguear(email);
    const payload = { nodo_key: 'capital', titulo: 'Comercio test MK-1 B ' + ts, rubro_id: 'retail', tipo: 'local' };
    const res1 = await fetch(base + '/api/comercios', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify(payload),
    });
    expect(res1.status).toBe(201);
    const body1: any = await res1.json();
    const res2 = await fetch(base + '/api/comercios', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify(payload),
    });
    expect(res2.status).toBe(200);
    const body2: any = await res2.json();
    expect(body2.idempotente).toBe(true);
    expect(body2.data.activo.id).toBe(body1.data.activo.id);
    const fichas = await prisma.comercio_ficha.count({ where: { activo_id: body1.data.activo.id } });
    expect(fichas).toBe(1); // 1:1: el reintento no duplica
  });

  it('3. lectura pública: solo aprobado y public — restricted y rechazado nunca salen, 404 sin eco (ADR-036)', async () => {
    const email = 'mk1-' + ts + '-c@example.test';
    const id = await altaYAprobada(email, 'C');
    expect(await idsPublicos()).toContain(id);
    // restricted: ni en lista ni en ficha
    await prisma.activos.update({ where: { id }, data: { visibilidad: 'restricted' } });
    expect(await idsPublicos()).not.toContain(id);
    const resRestricted = await fetch(base + '/api/comercios/' + id);
    expect(resRestricted.status).toBe(404);
    await resRestricted.arrayBuffer();
    await prisma.activos.update({ where: { id }, data: { visibilidad: 'public' } });
    // rechazado: fuera del catálogo y de la ficha
    const tokenModerador = await registrarYLoguear(email);
    const patch = await fetch(base + '/api/comercios/' + id + '/estado', {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenModerador },
      body: JSON.stringify({ estado: 'rechazado', justificacion: 'rechazo de prueba del test MK-1 C' }),
    });
    expect(patch.status).toBe(200);
    await patch.arrayBuffer();
    expect(await idsPublicos()).not.toContain(id);
    const resRechazado = await fetch(base + '/api/comercios/' + id);
    expect(resRechazado.status).toBe(404);
    const bodyRechazado: any = await resRechazado.json();
    expect(bodyRechazado.error).toBe('comercio no encontrado'); // sin eco del estado
  });

  it('4. facetas multinodo: ?rubro= ?habilitacion= ?nodo= y recorte ?bbox= (ST_Intersects, rama cruda)', async () => {
    const email = 'mk1-' + ts + '-d@example.test';
    const idComida = await altaYAprobada(email, 'D', {
      lat: -31.5376,
      lng: -68.5364,
    });
    const idRetail = await altaYAprobada(email, 'D2', { rubro_id: 'retail' });
    const porRubro = await idsPublicos('?rubro=food_drink');
    expect(porRubro).toContain(idComida);
    expect(porRubro).not.toContain(idRetail);
    const porRetail = await idsPublicos('?rubro=retail');
    expect(porRetail).toContain(idRetail);
    expect(porRetail).not.toContain(idComida);
    // habilitacion facet: ambos nacieron sin_dato (default honesto, R15)
    expect(await idsPublicos('?habilitacion=sin_dato')).toContain(idComida);
    expect(await idsPublicos('?habilitacion=verificada')).not.toContain(idComida);
    // nodo facet + multinodo desde día 1: alta en caucete
    const token = await registrarYLoguear('mk1-' + ts + '-d3@example.test');
    const resCaucete = await fetch(base + '/api/comercios', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify({ nodo_key: 'caucete', titulo: 'Comercio test MK-1 D3 ' + ts, rubro_id: 'food_drink', tipo: 'local' }),
    });
    expect(resCaucete.status).toBe(201);
    const bodyCaucete: any = await resCaucete.json();
    const idCaucete = bodyCaucete.data.activo.id as string;
    await prisma.activos.update({ where: { id: idCaucete }, data: { estado: 'aprobado' } });
    const porNodo = await idsPublicos('?nodo=caucete');
    expect(porNodo).toContain(idCaucete);
    expect(porNodo).not.toContain(idComida);
    // bbox: recorte espacial sobre el índice GiST
    const enBbox = await idsPublicos('?bbox=-68.60,-31.60,-68.45,-31.45');
    expect(enBbox).toContain(idComida); // punto en el centro de San Juan
    expect(enBbox).not.toContain(idCaucete); // sin lat/lng => sin geometría (R15)
    expect(await idsPublicos('?bbox=-70.0,-32.0,-69.0,-31.0')).not.toContain(idComida);
    // rubro inválido → 400
    const resRubroInvalido = await fetch(base + '/api/comercios?rubro=RUBRO-INVALIDO');
    expect(resRubroInvalido.status).toBe(400);
    await resRubroInvalido.arrayBuffer();
  });

  it('5. moderación PATCH /:id/estado: justificación obligatoria (ADR-038), matriz sellada, mismo estado 409, ciudadano 403', async () => {
    const email = 'mk1-' + ts + '-e@example.test';
    const token = await registrarYLoguear(email);
    const { res, body } = await altaComercio(token, 'Comercio test MK-1 E ' + ts);
    expect(res.status).toBe(201);
    const id = body.data.activo.id as string;
    await prisma.usuarios.update({ where: { email }, data: { rol: 'moderador' } });
    const tokenModerador = await registrarYLoguear(email);
    const cabecera = { ...jsonHeaders, authorization: 'Bearer ' + tokenModerador };

    // justificación ausente → 400 (ADR-038: transición con causa pública)
    const sinJustificacion = await fetch(base + '/api/comercios/' + id + '/estado', {
      method: 'PATCH',
      headers: cabecera,
      body: JSON.stringify({ estado: 'aprobado' }),
    });
    expect(sinJustificacion.status).toBe(400);
    await sinJustificacion.arrayBuffer();
    // justificación corta → 400 (min 10)
    const corta = await fetch(base + '/api/comercios/' + id + '/estado', {
      method: 'PATCH',
      headers: cabecera,
      body: JSON.stringify({ estado: 'aprobado', justificacion: 'corta' }),
    });
    expect(corta.status).toBe(400);
    await corta.arrayBuffer();
    // salto propuesto → archivado → 400 (matriz COMERCIO_TRANSICIONES, #243)
    const salto = await fetch(base + '/api/comercios/' + id + '/estado', {
      method: 'PATCH',
      headers: cabecera,
      body: JSON.stringify({ estado: 'archivado', justificacion: 'salto invalido del test MK-1 E' }),
    });
    expect(salto.status).toBe(400);
    await salto.arrayBuffer();
    // mismo estado → 409
    const mismo = await fetch(base + '/api/comercios/' + id + '/estado', {
      method: 'PATCH',
      headers: cabecera,
      body: JSON.stringify({ estado: 'propuesto', justificacion: 'sin cambio real del test MK-1 E' }),
    });
    expect(mismo.status).toBe(409);
    await mismo.arrayBuffer();
    // el ciudadano no modera → 403 (ADR-031)
    const ciudadano = await fetch(base + '/api/comercios/' + id + '/estado', {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify({ estado: 'aprobado', justificacion: 'intento de ciudadano del test MK-1 E' }),
    });
    expect(ciudadano.status).toBe(403);
    await ciudadano.arrayBuffer();
    // transición válida → 200
    const ok = await fetch(base + '/api/comercios/' + id + '/estado', {
      method: 'PATCH',
      headers: cabecera,
      body: JSON.stringify({ estado: 'aprobado', justificacion: 'aprobacion de prueba del test MK-1 E' }),
    });
    expect(ok.status).toBe(200);
    await ok.arrayBuffer();
  });

  it('6. historial de moderación: sellos comercio.estado_cambiado 1:1 por transición, encadenados y sin PII', async () => {
    const email = 'mk1-' + ts + '-f@example.test';
    const token = await registrarYLoguear(email);
    const { body } = await altaComercio(token, 'Comercio test MK-1 F ' + ts);
    const id = body.data.activo.id as string;
    await prisma.usuarios.update({ where: { email }, data: { rol: 'moderador' } });
    const tokenModerador = await registrarYLoguear(email);
    const cabecera = { ...jsonHeaders, authorization: 'Bearer ' + tokenModerador };
    const aprobar = await fetch(base + '/api/comercios/' + id + '/estado', {
      method: 'PATCH',
      headers: cabecera,
      body: JSON.stringify({ estado: 'aprobado', justificacion: 'aprobacion de prueba del test MK-1 F' }),
    });
    expect(aprobar.status).toBe(200);
    await aprobar.arrayBuffer();
    const rechazar = await fetch(base + '/api/comercios/' + id + '/estado', {
      method: 'PATCH',
      headers: cabecera,
      body: JSON.stringify({ estado: 'rechazado', justificacion: 'rechazo de prueba del test MK-1 F' }),
    });
    expect(rechazar.status).toBe(200);
    await rechazar.arrayBuffer();
    const sellos: any[] = await prisma.events_raw.findMany({
      where: { type: 'comercio.estado_cambiado', payload: { path: ['comercio_id'], equals: id } },
      orderBy: { occurred_at: 'asc' },
    });
    expect(sellos.length).toBe(2); // 1:1 con las transiciones (append-only)
    expect(sellos[0].payload.estado_anterior).toBe('propuesto');
    expect(sellos[0].payload.estado_nuevo).toBe('aprobado');
    expect(sellos[1].payload.estado_anterior).toBe('aprobado');
    expect(sellos[1].payload.estado_nuevo).toBe('rechazado');
    expect(sellos[0].payload.justificacion).toContain('aprobacion');
    expect(sellos[0].payload.moderador_hash).toMatch(/^[0-9a-f]{32}$/);
    const texto = JSON.stringify(sellos);
    expect(texto).not.toContain(email);
    expect(texto).not.toContain('example.test');
  });

  it('7. titularidad: reclamo ciudadano → verificación de moderador → edición del titular; ajeno → 403 sin eco', async () => {
    const emailTitular = 'mk1-' + ts + '-g@example.test';
    const tokenTitular = await registrarYLoguear(emailTitular);
    const { res, body } = await altaComercio(tokenTitular, 'Comercio test MK-1 G ' + ts);
    expect(res.status).toBe(201);
    const id = body.data.activo.id as string;

    // sin consentimiento explícito → 400 (ADR-027: nunca pre-marcado)
    const reclamoSinConsentimiento = await fetch(base + '/api/comercios/' + id + '/titular', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenTitular },
      body: JSON.stringify({ metodo: 'expediente', identificador: 'EXP-2026-' + ts }),
    });
    expect(reclamoSinConsentimiento.status).toBe(400);
    await reclamoSinConsentimiento.arrayBuffer();

    const reclamo = await fetch(base + '/api/comercios/' + id + '/titular', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenTitular },
      body: JSON.stringify({ metodo: 'expediente', identificador: 'EXP-2026-' + ts, declaracion_consentimiento: true }),
    });
    expect(reclamo.status).toBe(201);
    const bodyReclamo: any = await reclamo.json();
    expect(bodyReclamo.data.titularidad.estado).toBe('reclamada');

    // verificación de moderador (ignora el cuerpo)
    const emailModerador = 'mk1-' + ts + '-g2@example.test';
    await registrarYLoguear(emailModerador);
    await prisma.usuarios.update({ where: { email: emailModerador }, data: { rol: 'moderador' } });
    const tokenModerador = await registrarYLoguear(emailModerador);
    const verificacion = await fetch(base + '/api/comercios/' + id + '/titular', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenModerador },
      body: JSON.stringify({}),
    });
    expect(verificacion.status).toBe(200);
    const bodyVerificacion: any = await verificacion.json();
    expect(bodyVerificacion.data.titularidad.estado).toBe('verificada');

    // el identificador NUNCA en claro: ni en la ficha ni en el sello (Ley 25.326)
    const ficha: any = await prisma.comercio_ficha.findUnique({ where: { activo_id: id } });
    expect(JSON.stringify(ficha.titularidad)).not.toContain('EXP-2026');
    const sello: any = await prisma.events_raw.findFirst({
      where: { type: 'comercio.titularidad_reclamada', payload: { path: ['comercio_id'], equals: id } },
    });
    expect(sello, 'falta el sello comercio.titularidad_reclamada').not.toBeNull();
    expect(sello.payload.identificador_hash).toMatch(/^[0-9a-f]{32}$/);
    expect(sello.payload.reclamado_por_hash).toMatch(/^[0-9a-f]{32}$/);
    expect(JSON.stringify(sello)).not.toContain('EXP-2026');

    // edición del titular verificado → 200
    const edicion = await fetch(base + '/api/comercios/' + id, {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenTitular },
      body: JSON.stringify({
        atributos: { venta_directa: true, delivery: true, pagos: ['qr'], accesibilidad: 'declarada' },
      }),
    });
    expect(edicion.status).toBe(200);
    const bodyEdicion: any = await edicion.json();
    expect(bodyEdicion.data.atributos.delivery).toBe(true);

    // no-titular (otro ciudadano verificado que no es el titular) → 403 sin eco
    const emailAjeno = 'mk1-' + ts + '-g3@example.test';
    const tokenAjeno = await registrarYLoguear(emailAjeno);
    const edicionAjena = await fetch(base + '/api/comercios/' + id, {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenAjeno },
      body: JSON.stringify({
        atributos: { venta_directa: false, delivery: false, pagos: [], accesibilidad: 'unknown' },
      }),
    });
    expect(edicionAjena.status).toBe(403);
    await edicionAjena.arrayBuffer();
  });

  it('8. habilitación epistémica (ADR-035): verificada SIN evidencia primaria → 400; completa → 201 + estado verified', async () => {
    const email = 'mk1-' + ts + '-h@example.test';
    const token = await registrarYLoguear(email);
    const sinEvidencia = await altaComercio(token, 'Comercio test MK-1 H ' + ts, {
      habilitacion: { estado: 'verificada' },
    });
    expect(sinEvidencia.res.status).toBe(400);
    await sinEvidencia.res.arrayBuffer();

    const completa = await altaComercio(token, 'Comercio test MK-1 H2 ' + ts, {
      habilitacion: {
        estado: 'verificada',
        tipo: 'municipal',
        numero: 'HAB-2026-' + ts,
        fuente_key: 'municipio',
        url: 'https://example.test/habilitacion-' + ts,
        fecha_verificacion: '2026-10-17',
      },
    });
    expect(completa.res.status).toBe(201);
    const id = completa.body.data.activo.id as string;
    expect(completa.body.data.ficha.estado_epistemico).toBe('pending'); // propuesto (no verificado por moderar)
    await prisma.activos.update({ where: { id }, data: { estado: 'aprobado' } });
    const ficha = await fetch(base + '/api/comercios/' + id);
    const bodyFicha: any = await ficha.json();
    expect(bodyFicha.data.estado_epistemico).toBe('verified'); // evidencia primaria completa
    expect(await idsPublicos('?habilitacion=verificada')).toContain(id);
  });

  it('9. anti-PII: teléfono en la descripción → 400 antes de persistir, sin eco (ADR-020 cond. 1, Ley 25.326)', async () => {
    const email = 'mk1-' + ts + '-i@example.test';
    const token = await registrarYLoguear(email);
    const res = await fetch(base + '/api/comercios', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify({
        nodo_key: 'capital',
        titulo: 'Comercio test MK-1 I ' + ts,
        descripcion: 'Llamar al +54 264 555-1234 para encargar',
        rubro_id: 'food_drink',
        tipo: 'local',
      }),
    });
    expect(res.status).toBe(400);
    const texto = JSON.stringify(await res.json());
    expect(texto).not.toContain('555-1234'); // sin eco del valor rechazado
    expect(texto).not.toContain('+54');
    // y no persistió nada
    const activos = await prisma.activos.findMany({ where: { titulo: 'Comercio test MK-1 I ' + ts } });
    expect(activos.length).toBe(0);
  });

  it('10. rubro desconocido → 201 y ficha honesta: label y rama null (R15, nunca una etiqueta inventada)', async () => {
    const email = 'mk1-' + ts + '-j@example.test';
    const token = await registrarYLoguear(email);
    const { res, body } = await altaComercio(token, 'Comercio test MK-1 J ' + ts, { rubro_id: 'rubro_desconocido_test' });
    expect(res.status).toBe(201);
    expect(body.data.ficha.rubro).toEqual({ id: 'rubro_desconocido_test', rama: null, label: null });
    const ficha = await fetch(base + '/api/comercios/' + body.data.activo.id);
    const bodyFicha: any = await ficha.json();
    expect(bodyFicha.data.rubro.label).toBeNull();
    expect(bodyFicha.data.rubro.rama).toBeNull();
  });

  it('11. 404 honestos: nodo ajeno en el alta (guard pre-parse) y comercio inexistente — sin eco (R15)', async () => {
    const email = 'mk1-' + ts + '-k@example.test';
    const token = await registrarYLoguear(email);
    const res = await fetch(base + '/api/comercios', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify({
        nodo_key: 'mendoza',
        titulo: 'Comercio test MK-1 K ' + ts,
        rubro_id: 'food_drink',
        tipo: 'local',
      }),
    });
    expect(res.status).toBe(404); // reconciliación 404/400 (MK-0 §2.5)
    await res.arrayBuffer();
    const inexistente = await fetch(base + '/api/comercios/no-existe-mk1-' + ts);
    expect(inexistente.status).toBe(404);
    const bodyInexistente: any = await inexistente.json();
    expect(bodyInexistente.error).toBe('comercio no encontrado');
  });

  it('12. semilla: 0 comercios (patrón VIG-005, decisión DH) y re-seed idempotente sin fichas de comercio', async () => {
    const antes = await prisma.comercio_ficha.count({ where: { activo: { hash: { startsWith: 'seed-' } } } });
    expect(antes).toBe(0); // la semilla NO crea comercios: solo se publica lo verificado
    execSync('pnpm --filter @delocalsoy/db db:seed', { cwd: repoRoot, stdio: 'pipe' });
    const activosSeed: any[] = await prisma.activos.findMany({ where: { hash: { startsWith: 'seed-' } } });
    expect(activosSeed.length).toBeGreaterThan(0); // la semilla existe (activos verificados)…
    const fichasSeed = await prisma.comercio_ficha.findMany({
      where: { activo_id: { in: activosSeed.map((a: any) => a.id) } },
    });
    expect(fichasSeed.length).toBe(0); // …pero NINGUNO es comercio
    const despues = await prisma.comercio_ficha.count({ where: { activo: { hash: { startsWith: 'seed-' } } } });
    expect(despues).toBe(0); // re-seed idempotente: sigue en 0
  }, 60000);
});
