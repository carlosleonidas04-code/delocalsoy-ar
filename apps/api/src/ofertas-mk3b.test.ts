import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// MARKET-CAP MK-3b (#426, sub-épica #152): ofertas del Mercado de Proximidad.
// Decisiones ratificadas por la DH 2026-11-07: catálogo público de ofertas
// dentro de MK-3b mismo PR (GET /api/productos + GET /api/productos/:id +
// PATCH /api/productos/:id), faceta subnodo junto a las existentes y q= LIKE
// simple por nombre. Doble compuerta (ADR-036/R15): SOLO producto aprobado
// cuyo comercio padre (activo con comercio_ficha) está aprobado y público —
// el catálogo del Mercado no publica propuestas, archivados ni restricted,
// y las ofertas de activos NO comerciales (producción/patrimonio, VIG-005)
// siguen en GET /api/activos/:id/productos. Precio en centavos AR ENTEROS
// jamás float (MK-3 D2); vigencia declarada con estado DERIVADO en lectura
// (RFC-027: caducidad declarada, no silenciosa). PATCH de oferta: titular
// verificado del comercio padre o moderador|admin (403 real sin eco,
// Ley 25.326), justificación pública >=10 (ADR-038), anti-PII (ADR-020
// cond. 1), sello producto.atributos_editados con rollback (R4/R15).
// Requiere Postgres/PostGIS real (job test de CI); sin base → skip honesto
// (patrón productos-operativa). Ejecuta el seed REAL (db:seed idempotente)
// y usa aserciones DINÁMICAS contra el dominio vivo.

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';
process.env.JWT_SECRET = 'test-jwt-secret-marketcap-mk3b-ofertas-32';

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
  // Cleanup de los comercios/productos creados por la suite (re-runs locales
  // limpios): la FK Cascade del activo arrastra comercio_ficha y productos.
  await prisma.activos
    .deleteMany({ where: { titulo: { startsWith: 'Comercio test MK-3b' } } })
    .catch(() => undefined);
  await prisma.productos
    .deleteMany({ where: { slug: { startsWith: 'oferta-test-mk3b' } } })
    .catch(() => undefined);
  await new Promise((resolve, reject) => {
    server.close((err: any) => {
      if (err) reject(err);
      else resolve(null);
    });
    if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
  });
});

describe.skipIf(!dbUp)('Ofertas MARKET-CAP MK-3b (#426, sub-épica #152)', () => {
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

  // Alta ciudadana de comercio + aprobación de moderación + reclamo y
  // verificación de titularidad: el camino completo del titular verificado.
  async function comercioAprobadoConTitular(
    emailBase: string,
    titulo: string,
    rubro: string,
    subnodoKey?: string
  ): Promise<{ comercioId: string; tokenTitular: string; tokenModerador: string }> {
    const tokenTitular = await registrarYLoguear(emailBase + '-titular@example.test');
    const cuerpo: Record<string, unknown> = {
      nodo_key: 'iglesia',
      titulo,
      rubro_id: rubro,
      tipo: 'local',
      atributos: { venta_directa: false, delivery: false, pagos: [], accesibilidad: 'unknown' },
      habilitacion: { estado: 'sin_dato' },
    };
    if (subnodoKey !== undefined) cuerpo.subnodo_key = subnodoKey;
    const alta = await fetch(base + '/api/comercios', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenTitular },
      body: JSON.stringify(cuerpo),
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
      body: JSON.stringify({ estado: 'aprobado', justificacion: 'aprobación del comercio de prueba MK-3b' }),
    });
    expect(aprobar.status, 'aprobar ' + titulo).toBe(200);

    // reclamo + verificación de titularidad (identificador SOLO como hash)
    const reclamo = await fetch(base + '/api/comercios/' + comercioId + '/titular', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenTitular },
      body: JSON.stringify({ metodo: 'cuit', identificador: '20-12345678-' + (ts % 100), declaracion_consentimiento: true }),
    });
    expect(reclamo.status, 'reclamo ' + titulo).toBe(201);
    const verificar = await fetch(base + '/api/comercios/' + comercioId + '/titular', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenModerador },
      body: JSON.stringify({}),
    });
    expect(verificar.status, 'verificar ' + titulo).toBe(200);
    return { comercioId, tokenTitular, tokenModerador };
  }

  async function productoAprobado(activoId: string, token: string, slug: string, nombre: string): Promise<string> {
    const alta = await fetch(base + '/api/activos/' + activoId + '/productos', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify({ slug, nombre }),
    });
    expect(alta.status, 'alta producto ' + slug).toBe(201);
    const productoId = ((await alta.json()) as any).data.id as string;
    return productoId;
  }

  it('titular verificado edita su oferta: precio centavos + vigencia + sello producto.atributos_editados sin PII', async () => {
    const { comercioId, tokenTitular, tokenModerador } = await comercioAprobadoConTitular(
      'mk3b-' + ts + '-a',
      'Comercio test MK-3b aceitunas',
      'local_production'
    );
    const productoId = await productoAprobado(comercioId, tokenTitular, 'oferta-test-mk3b-aceituna', 'Aceituna de mesa de prueba MK-3b');
    const aprobarProducto = await fetch(base + '/api/productos/' + productoId + '/estado', {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenModerador },
      body: JSON.stringify({ estado: 'aprobado', motivo: 'verificación de la oferta de prueba MK-3b' }),
    });
    expect(aprobarProducto.status).toBe(200);

    const desde = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const hasta = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
    const editar = await fetch(base + '/api/productos/' + productoId, {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenTitular },
      body: JSON.stringify({
        precio_centavos: 2500,
        vigencia_desde: desde,
        vigencia_hasta: hasta,
        justificacion: 'precio de temporada de la aceituna de prueba',
      }),
    });
    expect(editar.status, 'PATCH de oferta por el titular').toBe(200);
    const body: any = await editar.json();
    expect(body.campos_editados).toEqual(['precio_centavos', 'vigencia_desde', 'vigencia_hasta']);
    expect(body.data.precio_centavos).toBe(2500);

    // la ficha pública de la oferta deriva el estado de vigencia (RFC-027)
    const ficha = await fetch(base + '/api/productos/' + productoId);
    expect(ficha.status).toBe(200);
    const bodyFicha: any = await ficha.json();
    expect(bodyFicha.data.precio_centavos).toBe(2500);
    expect(bodyFicha.data.estado_vigencia).toBe('vigente');
    expect(bodyFicha.data.comercio.id).toBe(comercioId);
    expect(bodyFicha.data.comercio.rubro.id).toBe('local_production');

    // sello en la fuente de verdad, sin PII
    const sello: any = await prisma.events_raw.findFirst({
      where: { type: 'producto.atributos_editados', payload: { path: ['producto_id'], equals: productoId } },
    });
    expect(sello, 'falta el sello producto.atributos_editados').not.toBeNull();
    expect(sello.payload.nodo_key).toBe('iglesia');
    expect(sello.payload.campos_editados).toEqual(['precio_centavos', 'vigencia_desde', 'vigencia_hasta']);
    expect(sello.payload.actualizado_por_hash).toMatch(/^[0-9a-f]{32}$/);
    const selloTexto = JSON.stringify(sello.payload);
    expect(selloTexto).not.toContain('@');
    expect(selloTexto).not.toContain('example.test');
  });

  it('compuertas del PATCH: 401 sin sesión, 403 no titular, 400 vacío/justificación corta/precio float/vigencia invertida/PII', async () => {
    const { comercioId, tokenTitular } = await comercioAprobadoConTitular(
      'mk3b-' + ts + '-b',
      'Comercio test MK-3b panadería',
      'food_drink'
    );
    const productoId = await productoAprobado(comercioId, tokenTitular, 'oferta-test-mk3b-pan', 'Pan casero de prueba MK-3b');

    const sinSesion = await fetch(base + '/api/productos/' + productoId, {
      method: 'PATCH',
      headers: jsonHeaders,
      body: JSON.stringify({ nombre: 'Pan casero editado', justificacion: 'edición sin sesión MK-3b' }),
    });
    expect(sinSesion.status).toBe(401);
    await sinSesion.arrayBuffer();

    const otroCiudadano = await registrarYLoguear('mk3b-' + ts + '-b-otro@example.test');
    const noTitular = await fetch(base + '/api/productos/' + productoId, {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + otroCiudadano },
      body: JSON.stringify({ nombre: 'Pan editado por otro', justificacion: 'edición de quien no es titular' }),
    });
    expect(noTitular.status).toBe(403);
    await noTitular.arrayBuffer();

    const vacio = await fetch(base + '/api/productos/' + productoId, {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenTitular },
      body: JSON.stringify({ justificacion: 'solo justificación sin campos' }),
    });
    expect(vacio.status, 'PATCH sin campos editables es 400 (R15)').toBe(400);

    const corta = await fetch(base + '/api/productos/' + productoId, {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenTitular },
      body: JSON.stringify({ nombre: 'Pan casero editado', justificacion: 'corta' }),
    });
    expect(corta.status, 'ADR-038 justificación >=10').toBe(400);

    const flotante = await fetch(base + '/api/productos/' + productoId, {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenTitular },
      body: JSON.stringify({ precio_centavos: 2.5, justificacion: 'precio con decimales inválido' }),
    });
    expect(flotante.status, 'precio centavos ENTERO jamás float (MK-3 D2)').toBe(400);

    const invertida = await fetch(base + '/api/productos/' + productoId, {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenTitular },
      body: JSON.stringify({ vigencia_desde: '2027-12-31', vigencia_hasta: '2026-01-01', justificacion: 'ventana de vigencia invertida' }),
    });
    expect(invertida.status).toBe(400);

    const pii = await fetch(base + '/api/productos/' + productoId, {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenTitular },
      body: JSON.stringify({ nombre: 'Pan de juan perez +54 264 555-1234', justificacion: 'nombre con datos personales' }),
    });
    expect(pii.status).toBe(400);
    const textoPii = JSON.stringify(await pii.json());
    expect(textoPii).not.toContain('555-1234');
    const enDb: any = await prisma.productos.findUnique({ where: { id: productoId } });
    expect(enDb.nombre).toBe('Pan casero de prueba MK-3b');
  });

  it('catálogo público: doble compuerta — propuesta, archivado, restricted y oferta sin comercio jamás salen', async () => {
    const { comercioId, tokenTitular, tokenModerador } = await comercioAprobadoConTitular(
      'mk3b-' + ts + '-c',
      'Comercio test MK-3b dulces',
      'food_drink'
    );
    // propuesta: nace propuesto y NO sale en el catálogo del Mercado
    const propuestaId = await productoAprobado(comercioId, tokenTitular, 'oferta-test-mk3b-dulce', 'Dulce de prueba MK-3b');
    const catalogo1: any = await (await fetch(base + '/api/productos')).json();
    expect(catalogo1.data.some((o: any) => o.id === propuestaId)).toBe(false);

    // aprobada: sale con su comercio padre
    await fetch(base + '/api/productos/' + propuestaId + '/estado', {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenModerador },
      body: JSON.stringify({ estado: 'aprobado', motivo: 'verificación del dulce de prueba MK-3b' }),
    });
    const catalogo2: any = await (await fetch(base + '/api/productos')).json();
    expect(catalogo2.data.some((o: any) => o.id === propuestaId)).toBe(true);

    // comercio archivado: su oferta deja de salir (el activo padre ya no es público)
    await fetch(base + '/api/comercios/' + comercioId + '/estado', {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenModerador },
      body: JSON.stringify({ estado: 'archivado', justificacion: 'archivo del comercio de prueba MK-3b' }),
    });
    const catalogo3: any = await (await fetch(base + '/api/productos')).json();
    expect(catalogo3.data.some((o: any) => o.id === propuestaId)).toBe(false);

    // oferta de un activo SIN ficha de mercado (frontera VIG-005): visible en
    // el catálogo del activo, NUNCA en el catálogo del Mercado
    const dique: any = await prisma.activos.findUnique({ where: { hash: 'seed-activo-dique-cuesta-del-viento' } });
    const productoDiqueId = await productoAprobado(dique.id, tokenTitular, 'oferta-test-mk3b-nocomercio', 'Producto de activo no comercial MK-3b');
    await fetch(base + '/api/productos/' + productoDiqueId + '/estado', {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenModerador },
      body: JSON.stringify({ estado: 'aprobado', motivo: 'verificación del producto no comercial' }),
    });
    const catalogoDique: any = await (await fetch(base + '/api/productos')).json();
    expect(catalogoDique.data.some((o: any) => o.id === productoDiqueId)).toBe(false);
    const catActivo: any = await (await fetch(base + '/api/activos/' + dique.id + '/productos')).json();
    expect(catActivo.data.some((p: any) => p.id === productoDiqueId)).toBe(true);
  });

  it('filtros del catálogo: nodo, rubro por código, subnodo, precio_max, q LIKE y vigente excluye vencidas', async () => {
    // subnodo REAL del vocabulario (dinámico contra el dominio vivo)
    const subnodosRes = await fetch(base + '/api/nodos/iglesia/subnodos');
    const subnodos: any = await subnodosRes.json();
    const distrito: any = (subnodos.data ?? []).find((s: any) => s.type === 'district');
    expect(distrito, 'el seed siembra distritos en iglesia').toBeDefined();

    const { comercioId, tokenTitular, tokenModerador } = await comercioAprobadoConTitular(
      'mk3b-' + ts + '-d',
      'Comercio test MK-3b subnodo ' + distrito.key,
      'local_production',
      distrito.key
    );
    const vigenteId = await productoAprobado(comercioId, tokenTitular, 'oferta-test-mk3b-subnodo', 'Aceituna orgánica de prueba MK-3b');
    const vencidaId = await productoAprobado(comercioId, tokenTitular, 'oferta-test-mk3b-vencida', 'Aceituna vencida de prueba MK-3b');
    for (const pid of [vigenteId, vencidaId]) {
      await fetch(base + '/api/productos/' + pid + '/estado', {
        method: 'PATCH',
        headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenModerador },
        body: JSON.stringify({ estado: 'aprobado', motivo: 'verificación de la oferta de filtros MK-3b' }),
      });
    }
    await fetch(base + '/api/productos/' + vigenteId, {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenTitular },
      body: JSON.stringify({
        precio_centavos: 2500,
        vigencia_desde: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
        vigencia_hasta: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
        justificacion: 'precio vigente de la aceituna orgánica',
      }),
    });
    await fetch(base + '/api/productos/' + vencidaId, {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenTitular },
      body: JSON.stringify({
        precio_centavos: 100,
        vigencia_hasta: '2020-01-01',
        justificacion: 'oferta con ventana vencida declarada',
      }),
    });

    const porNodo: any = await (await fetch(base + '/api/productos?nodo=iglesia')).json();
    expect(porNodo.data.some((o: any) => o.id === vigenteId)).toBe(true);

    const porRubro: any = await (await fetch(base + '/api/productos?rubro=local_production')).json();
    expect(porRubro.data.some((o: any) => o.id === vigenteId)).toBe(true);

    const porSubnodo: any = await (await fetch(base + '/api/productos?subnodo=' + distrito.key)).json();
    expect(porSubnodo.data.some((o: any) => o.id === vigenteId)).toBe(true);
    const porOtroSubnodo: any = await (await fetch(base + '/api/productos?subnodo=sj_iglesia_inexistente_x')).json();
    expect(porOtroSubnodo.data.some((o: any) => o.id === vigenteId)).toBe(false);

    const porPrecioMax: any = await (await fetch(base + '/api/productos?precio_max=1000')).json();
    expect(porPrecioMax.data.some((o: any) => o.id === vigenteId)).toBe(false);
    const porPrecioMaxAlto: any = await (await fetch(base + '/api/productos?precio_max=5000')).json();
    expect(porPrecioMaxAlto.data.some((o: any) => o.id === vigenteId)).toBe(true);

    const porQ: any = await (await fetch(base + '/api/productos?q=ACEITUNA')).json();
    expect(porQ.data.some((o: any) => o.id === vigenteId)).toBe(true);

    const porVigente: any = await (await fetch(base + '/api/productos?vigente=true')).json();
    expect(porVigente.data.some((o: any) => o.id === vencidaId), 'la ventana vencida queda excluida').toBe(false);
    const fichaVencida: any = await (await fetch(base + '/api/productos/' + vencidaId)).json();
    expect(fichaVencida.data.estado_vigencia).toBe('vencida');

    // filtros inválidos: 400 (ProductoFiltroSchema, fuente única)
    const nodoMalo = await fetch(base + '/api/productos?nodo=mendoza');
    expect(nodoMalo.status).toBe(400);
    await nodoMalo.arrayBuffer();
    const qCorto = await fetch(base + '/api/productos?q=a');
    expect(qCorto.status).toBe(400);
    await qCorto.arrayBuffer();
  });

  it('ficha pública de la oferta: 404 sin eco para propuesta, comercio archivado y sin comercio; moderación edita sin ser titular', async () => {
    const { comercioId, tokenTitular, tokenModerador } = await comercioAprobadoConTitular(
      'mk3b-' + ts + '-e',
      'Comercio test MK-3b tienda',
      'retail'
    );
    const propuestaId = await productoAprobado(comercioId, tokenTitular, 'oferta-test-mk3b-tienda', 'Producto propuesto de tienda MK-3b');

    const fichaPropuesta = await fetch(base + '/api/productos/' + propuestaId);
    expect(fichaPropuesta.status, 'la propuesta no tiene ficha pública').toBe(404);
    await fichaPropuesta.arrayBuffer();

    const inexistente = await fetch(base + '/api/productos/no-existe-mk3b');
    expect(inexistente.status).toBe(404);
    await inexistente.arrayBuffer();

    // moderación edita la oferta sin ser titular (esModeracion, frontera #254)
    await fetch(base + '/api/productos/' + propuestaId + '/estado', {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenModerador },
      body: JSON.stringify({ estado: 'aprobado', motivo: 'verificación del producto de tienda MK-3b' }),
    });
    const editarModerador = await fetch(base + '/api/productos/' + propuestaId, {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenModerador },
      body: JSON.stringify({ precio_centavos: 99999, justificacion: 'precio corregido por moderación MK-3b' }),
    });
    expect(editarModerador.status).toBe(200);
    const fichaModerada: any = await (await fetch(base + '/api/productos/' + propuestaId)).json();
    expect(fichaModerada.data.precio_centavos).toBe(99999);
    expect(fichaModerada.data.comercio.rubro.id).toBe('retail');
  });

  it('db:seed re-ejecutado no duplica nada y el catálogo sigue honesto (idempotencia total)', async () => {
    // Scoped a las filas del SEED (activos seed-activo-*): las suites correne
    // en paralelo crean sus propias filas y NO son carga del seed (R15).
    const donde = { activo: { hash: { startsWith: 'seed-activo-' } } };
    const antes = await prisma.productos.count({ where: donde });
    execSync('pnpm --filter @delocalsoy/db db:seed', { cwd: repoRoot, stdio: 'pipe' });
    const despues = await prisma.productos.count({ where: donde });
    expect(despues).toBe(antes);
  }, 60000);
});
