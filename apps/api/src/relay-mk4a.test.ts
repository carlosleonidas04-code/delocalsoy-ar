import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// MARKET-CAP MK-4a (#427, épica #422): relay por plataforma del Mercado de
// Proximidad. Decisiones ratificadas por la DH 2026-11-07: el relay cursa con
// titularidad RECLAMADA o verificada (el canal abre con el reclamo); bandeja
// por comercio Y bandeja unificada (ambas); el sello comercio.relay_recibido
// vive SOLO en el libro contable — NO entra a COMERCIO_SELLOS_HISTORIAL (el
// historial F-3 queda en 7 sellos). Canal ÚNICO sin PII de contacto (Ley
// 25.326): el mensaje pasa la compuerta anti-PII (ADR-020 cond. 1) ANTES de
// persistir; el remitente vive SOLO como pseudónimo (ADR-027). 202 Accepted =
// asíncrono honesto (el envío no promete lectura). Idempotencia por hash
// (usuario + comercio + mensaje). Requiere Postgres/PostGIS real (job test de
// CI); sin base → skip honesto (patrón ofertas-mk3b). Ejecuta el seed REAL
// (db:seed idempotente) y usa aserciones DINÁMICAS contra el dominio vivo.

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';
process.env.JWT_SECRET = 'test-jwt-secret-marketcap-mk4a-relay-32';

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
  // Cleanup de los comercios creados por la suite (re-runs locales limpios):
  // la FK Cascade del activo arrastra comercio_ficha y comercio_relay.
  await prisma.activos
    .deleteMany({ where: { titulo: { startsWith: 'Comercio test MK-4a' } } })
    .catch(() => undefined);
  await new Promise((resolve, reject) => {
    server.close((err: any) => {
      if (err) reject(err);
      else resolve(null);
    });
    if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
  });
});

describe.skipIf(!dbUp)('Relay MARKET-CAP MK-4a (#427, épica #422)', () => {
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

  // Alta ciudadana de comercio + aprobación de moderación. El reclamo de
  // titularidad queda APARTE: la compuerta del canal (409 sin titular
  // reclamado) se ejercita por test con el mismo comercio.
  async function comercioAprobado(
    emailBase: string,
    titulo: string,
    rubro: string
  ): Promise<{ comercioId: string; tokenTitular: string; tokenModerador: string }> {
    const tokenTitular = await registrarYLoguear(emailBase + '-titular@example.test');
    const alta = await fetch(base + '/api/comercios', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenTitular },
      body: JSON.stringify({
        nodo_key: 'iglesia',
        titulo,
        rubro_id: rubro,
        tipo: 'local',
        atributos: { venta_directa: false, delivery: false, pagos: [], accesibilidad: 'unknown' },
        habilitacion: { estado: 'sin_dato' },
      }),
    });
    expect(alta.status, 'alta del comercio ' + titulo).toBe(201);
    const comercioId = ((await alta.json()) as any).data.activo.id as string;

    // moderación aprueba el comercio (la moderación ES la validación, R15)
    const regMod = await fetch(base + '/api/auth/register', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ email: emailBase + '-mod@example.test', password: PASSWORD }),
    });
    expect([201, 409]).toContain(regMod.status);
    await prisma.usuarios.update({ where: { email: emailBase + '-mod@example.test' }, data: { rol: 'moderador' } });
    const tokenModerador = await registrarYLoguear(emailBase + '-mod@example.test');
    const aprobar = await fetch(base + '/api/comercios/' + comercioId + '/estado', {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenModerador },
      body: JSON.stringify({ estado: 'aprobado', justificacion: 'aprobación del comercio de prueba MK-4a' }),
    });
    expect(aprobar.status, 'aprobar ' + titulo).toBe(200);
    return { comercioId, tokenTitular, tokenModerador };
  }

  // Reclamo ciudadano de titularidad (el identificador SOLO viaja como hash
  // en el sello, Ley 25.326): abre el canal del relay con estado 'reclamada'.
  async function reclamarTitularidad(comercioId: string, tokenTitular: string): Promise<void> {
    const reclamo = await fetch(base + '/api/comercios/' + comercioId + '/titular', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenTitular },
      body: JSON.stringify({
        metodo: 'expediente',
        identificador: 'EX-2026-' + (ts % 10000),
        declaracion_consentimiento: true,
      }),
    });
    expect(reclamo.status, 'reclamo de titularidad').toBe(201);
  }

  async function verificarTitularidad(comercioId: string, tokenModerador: string): Promise<void> {
    const verificar = await fetch(base + '/api/comercios/' + comercioId + '/titular', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenModerador },
      body: JSON.stringify({}),
    });
    expect(verificar.status, 'verificación de titularidad').toBe(200);
  }

  async function enviarRelay(comercioId: string, token: string, mensaje: string): Promise<Response> {
    return fetch(base + '/api/comercios/' + comercioId + '/relay', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify({ mensaje }),
    });
  }

  it('relay cursa con titularidad reclamada o verificada: 202 + sello comercio.relay_recibido sin PII + F-3 no lo expone', async () => {
    const { comercioId, tokenTitular, tokenModerador } = await comercioAprobado(
      'mk4a-' + ts + '-a',
      'Comercio test MK-4a almacén',
      'food_drink'
    );
    await reclamarTitularidad(comercioId, tokenTitular); // canal ABIERTO con 'reclamada'

    const tokenSender = await registrarYLoguear('mk4a-' + ts + '-a-sender@example.test');
    const mensaje1 = 'Hola, quiero encargar pan casero para el viernes';
    const envio1 = await enviarRelay(comercioId, tokenSender, mensaje1);
    expect(envio1.status, 'relay con titularidad reclamada cursa (202)').toBe(202);
    const body1: any = await envio1.json();
    expect(body1.data.estado).toBe('aceptado');
    expect(typeof body1.data.relay_id).toBe('string');

    // sello en la fuente de verdad, sin PII (decisión DH: solo libro contable)
    const sello: any = await prisma.events_raw.findFirst({
      where: { type: 'comercio.relay_recibido', payload: { path: ['comercio_id'], equals: comercioId } },
    });
    expect(sello, 'falta el sello comercio.relay_recibido').not.toBeNull();
    expect(sello.payload.nodo_key).toBe('iglesia');
    expect(sello.payload.relay_id).toBe(body1.data.relay_id);
    expect(sello.payload.creado_por_hash).toMatch(/^[0-9a-f]{32}$/);
    const selloTexto = JSON.stringify(sello.payload);
    expect(selloTexto).not.toContain('@');
    expect(selloTexto).not.toContain('example.test');

    // F-3 (historial público): el relay NO se expone (decisión DH 2026-11-07)
    const historial: any = await (await fetch(base + '/api/comercios/' + comercioId + '/historial')).json();
    const tipos = historial.data.map((e: any) => e.type);
    expect(tipos).not.toContain('comercio.relay_recibido');

    // verificación de titularidad: el canal SIGUE cursando (reclamada O verificada)
    await verificarTitularidad(comercioId, tokenModerador);
    const mensaje2 = 'Quiero coordinar el retiro del pedido en el local';
    const envio2 = await enviarRelay(comercioId, tokenSender, mensaje2);
    expect(envio2.status, 'relay con titularidad verificada cursa (202)').toBe(202);

    // bandeja por comercio: SOLO el titular la lee, con los 2 mensajes
    const bandeja = await fetch(base + '/api/comercios/' + comercioId + '/relay', {
      headers: { authorization: 'Bearer ' + tokenTitular },
    });
    expect(bandeja.status).toBe(200);
    const bodyBandeja: any = await bandeja.json();
    expect(bodyBandeja.count).toBe(2);
    expect(bodyBandeja.data.map((m: any) => m.mensaje).sort()).toEqual([mensaje1, mensaje2].sort());
    for (const m of bodyBandeja.data) {
      expect(m.creado_por_hash).toMatch(/^[0-9a-f]{32}$/);
    }
  });

  it('compuertas del relay: 401 sin sesión, 404 sin eco, 409 sin titular, 400 corto, 400 PII sin eco, 403 bandeja ajena', async () => {
    const { comercioId, tokenTitular } = await comercioAprobado(
      'mk4a-' + ts + '-b',
      'Comercio test MK-4a bodega',
      'retail'
    );
    const tokenSender = await registrarYLoguear('mk4a-' + ts + '-b-sender@example.test');
    const url = base + '/api/comercios/' + comercioId + '/relay';

    const sinSesion = await fetch(url, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ mensaje: 'mensaje sin sesión del relay MK-4a' }),
    });
    expect(sinSesion.status).toBe(401);
    await sinSesion.arrayBuffer();

    const inexistente = await fetch(base + '/api/comercios/no-existe-mk4a/relay', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenSender },
      body: JSON.stringify({ mensaje: 'mensaje a un comercio inexistente' }),
    });
    expect(inexistente.status).toBe(404);
    await inexistente.arrayBuffer();

    // 409: comercio aprobado SIN titular reclamado — no existe canal
    // alternativo con PII de reemplazo (decisión DH, Ley 25.326).
    const sinTitular = await enviarRelay(comercioId, tokenSender, 'mensaje a un comercio sin titular reclamado');
    expect(sinTitular.status).toBe(409);
    await sinTitular.arrayBuffer();

    // 400 corto (RelayMensajeSchema, min 10) — corre ANTES de la compuerta
    const corto = await enviarRelay(comercioId, tokenSender, 'hola');
    expect(corto.status, 'mensaje de al menos 10 caracteres').toBe(400);
    await corto.arrayBuffer();

    // 400 PII SIN ECO del valor rechazado (ADR-020 cond. 1) y sin persistir
    const pii = await enviarRelay(comercioId, tokenSender, 'escribime a juanperez@gmail.com para coordinar');
    expect(pii.status).toBe(400);
    const textoPii = JSON.stringify(await pii.json());
    expect(textoPii).not.toContain('juanperez');
    expect(await prisma.comercio_relay.count({ where: { comercio_id: comercioId } })).toBe(0);

    // 403 bandeja ajena: quien no reclamó la titularidad NO lee la bandeja
    await reclamarTitularidad(comercioId, tokenTitular);
    const bandejaAjena = await fetch(url, {
      headers: { authorization: 'Bearer ' + tokenSender },
    });
    expect(bandejaAjena.status).toBe(403);
    await bandejaAjena.arrayBuffer();
  });

  it('idempotencia por hash (usuario+comercio+mensaje): reenvío → 200 idempotente con una sola fila', async () => {
    const { comercioId, tokenTitular } = await comercioAprobado(
      'mk4a-' + ts + '-c',
      'Comercio test MK-4a fiambrería',
      'food_drink'
    );
    await reclamarTitularidad(comercioId, tokenTitular);
    const tokenA = await registrarYLoguear('mk4a-' + ts + '-c-a@example.test');
    const mensaje = 'Quiero encargar una tabla de quesos para el finde';

    const envio1 = await enviarRelay(comercioId, tokenA, mensaje);
    expect(envio1.status).toBe(202);
    const envio2 = await enviarRelay(comercioId, tokenA, mensaje);
    expect(envio2.status, 'reintento idempotente → 200').toBe(200);
    const body2: any = await envio2.json();
    expect(body2.idempotente).toBe(true);
    expect(await prisma.comercio_relay.count({ where: { comercio_id: comercioId } })).toBe(1);

    // otro ciudadano con el MISMO texto: hash distinto (el usuario entra al
    // hash) → cursa como mensaje propio, no colisiona
    const tokenB = await registrarYLoguear('mk4a-' + ts + '-c-b@example.test');
    const envio3 = await enviarRelay(comercioId, tokenB, mensaje);
    expect(envio3.status).toBe(202);
    expect(await prisma.comercio_relay.count({ where: { comercio_id: comercioId } })).toBe(2);
  });

  it('bandeja unificada /relay/mios: el titular ve su comercio con mensajes; quien no reclamó ve count 0 honesto', async () => {
    const { comercioId, tokenTitular } = await comercioAprobado(
      'mk4a-' + ts + '-d',
      'Comercio test MK-4a verdulería',
      'food_drink'
    );
    await reclamarTitularidad(comercioId, tokenTitular);
    const tokenSender = await registrarYLoguear('mk4a-' + ts + '-d-sender@example.test');
    const envio = await enviarRelay(comercioId, tokenSender, 'Quiero reservar una caja de tomates perita');
    expect(envio.status).toBe(202);

    // bandeja unificada del titular: su comercio con el mensaje recibido
    const mios = await fetch(base + '/api/comercios/relay/mios', {
      headers: { authorization: 'Bearer ' + tokenTitular },
    });
    expect(mios.status).toBe(200);
    const bodyMios: any = await mios.json();
    const propia = bodyMios.data.find((b: any) => b.comercio_id === comercioId);
    expect(propia, 'el titular ve su comercio en la bandeja unificada').toBeDefined();
    expect(propia.titularidad_estado).toBe('reclamada');
    expect(propia.count).toBe(1);
    expect(propia.mensajes[0].mensaje).toBe('Quiero reservar una caja de tomates perita');

    // quien NO reclamó titularidad: bandeja honesta VACÍA (count 0, no null)
    const miosSender = await fetch(base + '/api/comercios/relay/mios', {
      headers: { authorization: 'Bearer ' + tokenSender },
    });
    expect(miosSender.status).toBe(200);
    const bodySender: any = await miosSender.json();
    expect(bodySender.count).toBe(0);
    expect(bodySender.data).toEqual([]);
  });

  it('comercio archivado: relay 404 sin eco (ADR-036)', async () => {
    const { comercioId, tokenTitular, tokenModerador } = await comercioAprobado(
      'mk4a-' + ts + '-e',
      'Comercio test MK-4a kiosco',
      'retail'
    );
    await reclamarTitularidad(comercioId, tokenTitular);
    const tokenSender = await registrarYLoguear('mk4a-' + ts + '-e-sender@example.test');
    const envio = await enviarRelay(comercioId, tokenSender, 'Quiero pedir golosinas para un cumpleaños');
    expect(envio.status).toBe(202);

    // archivado: el activo sale del ciclo público y el relay no cursa más
    const archivar = await fetch(base + '/api/comercios/' + comercioId + '/estado', {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenModerador },
      body: JSON.stringify({ estado: 'archivado', justificacion: 'archivo del comercio de prueba MK-4a' }),
    });
    expect(archivar.status).toBe(200);
    const archivado = await enviarRelay(comercioId, tokenSender, 'segundo mensaje tras el archivo del comercio');
    expect(archivado.status, 'el relay a un archivado es 404 sin eco').toBe(404);
    await archivado.arrayBuffer();
  });
});
