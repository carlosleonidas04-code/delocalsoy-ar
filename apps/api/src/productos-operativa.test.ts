import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// NODO-VIG VIG-005 (NVIG-R7 #174, épica #167): producción y turismo —
// catálogo de productos del territorio (1:N con activos, alta ciudadana
// autenticada con moderación: nace 'propuesto'; 'aprobado' lo publica) y
// operativa del activo (1:1: horario, temporada, capacidad, seguridad y
// habilitación honesta). Decisiones ratificadas por la DH (2026-10-14, traza
// #174 comment 6160361362): semilla solo-verificada — operativa del dique
// Cuesta del Viento con horario Ley 826-G + temporada de picos [3,4,9,10] +
// capacity_status 'unknown' honesto (el 90% de ocupación hotelera de enero
// NO es aforo, R15); cooperativas solo con habilitación unknown en los 4
// atributos separados (padrón Ley 2400-T no encontrado: "distinguido" no es
// "habilitado"); y 0 productos en la semilla: solo se publica lo verificado
// (la producción por distrito queda como vacío declarado). ADR-036 sin
// excepción ratificada: restricted queda excluido del catálogo, de la
// operativa y del mapa — ni siquiera confirma existencia (404 sin eco).
// Requiere Postgres/PostGIS real (job test de CI); sin base → skip honesto
// (patrón patrimonio-rutas). El test ejecuta el seed REAL (db:seed = 5 SQL
// idempotentes) y usa aserciones DINÁMICAS contra el dominio vivo.

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';
process.env.JWT_SECRET = 'test-jwt-secret-vig005-produccion-turismo-32';

const { createApp } = await import('./app.js');
const prisma = (await import('./lib/prisma.js')).default;

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

const dbUp = await prisma
  $queryRaw`SELECT 1`
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
  // Cleanup de los productos creados por la suite (re-runs locales limpios).
  await prisma.productos
    .deleteMany({ where: { slug: { in: ['vino-patero-test-vig005', 'producto-pii-test-vig005'] } } })
    .catch(() => undefined);
  await new Promise((resolve, reject) => {
    server.close((err: any) => {
      if (err) reject(err);
      else resolve(null);
    });
    if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
  });
});

describe.skipIf(!dbUp)('Productos y operativa VIG-005 (#174, épica #167)', () => {
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

  async function activoPorHash(hash: string): Promise<any> {
    return prisma.activos.findUnique({ where: { hash } });
  }

  it('seed VIG-005: 3 operativas solo-verificadas (Ley 826-G + unknown honesto), 0 productos, sellos operativa.ingestado sin PII', async () => {
    const dique = await activoPorHash('seed-activo-dique-cuesta-del-viento');
    expect(dique, 'falta el activo del dique Cuesta del Viento').toBeDefined();
    const opDique: any = await prisma.activos_operativa.findUnique({ where: { activo_id: dique.id } });
    expect(opDique, 'falta la operativa del dique').toBeDefined();
    expect(opDique.horario).toContain('Ley 826-G');
    expect(opDique.temporada_meses).toEqual([3, 4, 9, 10]);
    expect(opDique.capacity_status).toBe('unknown'); // R15: sin aforos verificados
    expect(opDique.capacidad_plazas).toBeNull();
    expect(opDique.seguridad.reglas).toContain('guardavidas');
    expect(opDique.habilitacion).toBeNull();

    for (const hash of ['seed-activo-fecoagro-tudcum', 'seed-activo-coop-valles-iglesianos']) {
      const coop = await activoPorHash(hash);
      expect(coop, 'falta el activo ' + hash).toBeDefined();
      const op: any = await prisma.activos_operativa.findUnique({ where: { activo_id: coop.id } });
      expect(op, 'falta la operativa de ' + hash).toBeDefined();
      expect(op.horario).toBeNull();
      expect(op.temporada_meses).toEqual([]); // sin_dato honesto (R15)
      expect(op.capacity_status).toBe('unknown');
      expect(op.habilitacion).toEqual({ municipal: 'unknown', provincial_2400_t: 'unknown', sello: 'unknown', verified_at: null });
    }

    // 0 productos en la semilla: solo se publica lo verificado (decisión DH).
    const productosSeed = await prisma.productos.count({ where: { id: { startsWith: 'seed-' } } });
    expect(productosSeed).toBe(0);

    // Sellos de la ingesta curada: uno por operativa, hash idempotente
    // (hash del activo + ':op'), payload sin PII.
    const sellos: any[] = await prisma.events_raw.findMany({ where: { type: 'operativa.ingestado' } });
    expect(sellos.length).toBe(3);
    const activos: any[] = await prisma.activos.findMany({ where: { hash: { startsWith: 'seed-activo-' } } });
    for (const s of sellos) {
      expect(s.hash.endsWith(':op')).toBe(true);
      expect(s.payload.source).toBe('seed-vig-005');
      const a: any = activos.find((x: any) => x.id === s.payload.activo_id);
      expect(a, 'el sello apunta a un activo de la semilla').toBeDefined();
      expect(s.hash).toBe(a.hash + ':op');
      const payloadKeys = Object.keys(s.payload).sort();
      expect(payloadKeys).toEqual(['activo_id', 'capacity_status', 'nodo_key', 'source', 'subnodo_key']);
    }
    const texto = JSON.stringify(sellos);
    expect(texto).not.toContain('@');
    expect(texto).not.toContain('example.test');
  });

  it('GET /api/operativa/:id público: horario y temporada del dique; 404 inexistente o sin operativa', async () => {
    const dique = await activoPorHash('seed-activo-dique-cuesta-del-viento');
    const res = await fetch(base + '/api/operativa/' + dique.id);
    expect(res.status, 'operativa del dique').toBe(200);
    const body: any = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.titulo).toBe(dique.titulo);
    expect(body.data.nodo_key).toBe('iglesia');
    expect(body.data.horario).toContain('08:00-19:00');
    expect(body.data.temporada_meses).toEqual([3, 4, 9, 10]);
    expect(body.data.capacity_status).toBe('unknown'); // R15 honesto
    expect(body.data.capacidad_plazas).toBeNull();
    expect(body.data.seguridad.reglas).toContain('VHF');

    const inexistente = await fetch(base + '/api/operativa/no-existe-vig005');
    expect(inexistente.status).toBe(404);
    await inexistente.arrayBuffer();

    const sinOperativa = await prisma.activos.create({
      data: {
        tipo: 'local',
        titulo: 'Activo sin operativa (test VIG-005)',
        estado: 'aprobado',
        nodo_key: 'iglesia',
        lat: -30.2,
        lng: -69.2,
        created_by_hash: 'test-vig005-sin-operativa',
        hash: 'test-vig005-sin-operativa-' + ts,
      },
    });
    try {
      const res2 = await fetch(base + '/api/operativa/' + sinOperativa.id);
      expect(res2.status).toBe(404);
      const body2: any = await res2.json();
      expect(body2.success).toBe(false);
    } finally {
      await prisma.activos.delete({ where: { id: sinOperativa.id } });
    }
  });

  it('alta ciudadana: nace propuesto, sello producto.propuesto sin PII, visible en el catálogo del activo pero NO en ?producto=', async () => {
    const email = 'vig005-' + ts + '-a@example.test';
    const token = await registrarYLoguear(email);
    const dique = await activoPorHash('seed-activo-dique-cuesta-del-viento');
    const res = await fetch(base + '/api/activos/' + dique.id + '/productos', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify({
        slug: 'vino-patero-test-vig005',
        nombre: 'Vino patero de prueba VIG-005',
        temporada_meses: [9, 10],
      }),
    });
    expect(res.status).toBe(201);
    const body: any = await res.json();
    expect(body.data.estado).toBe('propuesto');
    expect(body.data.slug).toBe('vino-patero-test-vig005');
    expect(body.data.temporada_meses).toEqual([9, 10]);

    // visible en el catálogo del activo (propuesto es registro comunitario)
    const catalogo = await fetch(base + '/api/activos/' + dique.id + '/productos');
    const bodyCatalogo: any = await catalogo.json();
    expect(bodyCatalogo.success).toBe(true);
    expect(bodyCatalogo.data.some((p: any) => p.slug === 'vino-patero-test-vig005')).toBe(true);

    // pero NO en el mapa: ?producto= exige aprobación (moderación primero)
    const mapa = await fetch(base + '/api/activos?producto=vino-patero-test-vig005');
    const bodyMapa: any = await mapa.json();
    expect(bodyMapa.data.some((a: any) => a.id === dique.id)).toBe(false);

    // sello en la fuente de verdad, sin PII
    const sello: any = await prisma.events_raw.findFirst({
      where: { type: 'producto.propuesto', payload: { path: ['slug'], equals: 'vino-patero-test-vig005' } },
    });
    expect(sello, 'falta el sello producto.propuesto').not.toBeNull();
    expect(sello.payload.estado).toBe('propuesto');
    expect(sello.payload.nodo_key).toBe('iglesia');
    expect(sello.payload.created_by_hash).toMatch(/^[0-9a-f]{32}$/);
    const selloTexto = JSON.stringify(sello.payload);
    expect(selloTexto).not.toContain('@');
    expect(selloTexto).not.toContain('example.test');
  });

  it('moderación aprueba: visible en ?producto= y ?mes=10 (temporada del producto), no en ?mes=1; 409 re-aprobar; 403 ciudadano', async () => {
    const email = 'vig005-' + ts + '-b@example.test';
    const tokenCiudadano = await registrarYLoguear(email);
    const dique = await activoPorHash('seed-activo-dique-cuesta-del-viento');
    const producto: any = await prisma.productos.findFirst({
      where: { slug: 'vino-patero-test-vig005', activo_id: dique.id },
    });
    expect(producto, 'el producto creado por el ciudadano debe existir').not.toBeNull();

    // el ciudadano no modera: solo moderador|admin (ADR-031)
    const intentoCiudadano = await fetch(base + '/api/productos/' + producto.id + '/estado', {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenCiudadano },
      body: JSON.stringify({ estado: 'aprobado' }),
    });
    expect(intentoCiudadano.status).toBe(403);
    await intentoCiudadano.arrayBuffer();

    // Promoción de sistema (moderador) + login nuevo → token con rol.
    await prisma.usuarios.update({ where: { email }, data: { rol: 'moderador' } });
    const tokenModerador = await registrarYLoguear(email);
    const res = await fetch(base + '/api/productos/' + producto.id + '/estado', {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenModerador },
      body: JSON.stringify({ estado: 'aprobado', motivo: 'verificación de la bodega de prueba del test VIG-005' }),
    });
    expect(res.status).toBe(200);

    // visible en ?producto= (JOIN por slug aprobado)
    const mapaProducto = await fetch(base + '/api/activos?producto=vino-patero-test-vig005');
    const bodyProducto: any = await mapaProducto.json();
    expect(bodyProducto.data.some((a: any) => a.id === dique.id)).toBe(true);

    // ?mes=10: temporada del producto aprobado [9,10] matchea; ?mes=1 no
    const mapaMes10 = await fetch(base + '/api/activos?producto=vino-patero-test-vig005&mes=10');
    const bodyMes10: any = await mapaMes10.json();
    expect(bodyMes10.data.some((a: any) => a.id === dique.id)).toBe(true);
    const mapaMes1 = await fetch(base + '/api/activos?producto=vino-patero-test-vig005&mes=1');
    const bodyMes1: any = await mapaMes1.json();
    expect(bodyMes1.data.some((a: any) => a.id === dique.id)).toBe(false);

    // re-aprobar → 409 sin transición
    const reAprobar = await fetch(base + '/api/productos/' + producto.id + '/estado', {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenModerador },
      body: JSON.stringify({ estado: 'aprobado' }),
    });
    expect(reAprobar.status).toBe(409);
    await reAprobar.arrayBuffer();

    // sello de moderación en la fuente de verdad, sin PII
    const sello: any = await prisma.events_raw.findFirst({
      where: { type: 'producto.estado_cambiado', payload: { path: ['producto_id'], equals: producto.id } },
    });
    expect(sello, 'falta el sello producto.estado_cambiado').not.toBeNull();
    expect(sello.payload.estado).toBe('aprobado');
    expect(sello.payload.slug).toBe('vino-patero-test-vig005');
    expect(sello.payload.moderador_hash).toMatch(/^[0-9a-f]{32}$/);
  });

  it('?mes= por operativa del activo: dique visible en mes 4 (temporada [3,4,9,10]), no en mes 1', async () => {
    const dique = await activoPorHash('seed-activo-dique-cuesta-del-viento');
    const mes4 = await fetch(base + '/api/activos?mes=4');
    expect(mes4.status).toBe(200);
    const body4: any = await mes4.json();
    expect(body4.data.some((a: any) => a.id === dique.id)).toBe(true);
    const mes1 = await fetch(base + '/api/activos?mes=1');
    const body1: any = await mes1.json();
    expect(body1.data.some((a: any) => a.id === dique.id)).toBe(false);
  });

  it('anti-PII: teléfono en el nombre → 400 antes de persistir, sin eco (ADR-020 cond. 1)', async () => {
    const email = 'vig005-' + ts + '-c@example.test';
    const token = await registrarYLoguear(email);
    const dique = await activoPorHash('seed-activo-dique-cuesta-del-viento');
    const res = await fetch(base + '/api/activos/' + dique.id + '/productos', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify({
        slug: 'producto-pii-test-vig005',
        nombre: 'Contacto directo +54 264 555-1234',
      }),
    });
    expect(res.status).toBe(400);
    const texto = JSON.stringify(await res.json());
    expect(texto).not.toContain('555-1234');
    // y nada quedó persistido
    const enDb = await prisma.productos.findFirst({ where: { slug: 'producto-pii-test-vig005' } });
    expect(enDb).toBeNull();
  });

  it('POST sin sesión → 401 (la propuesta exige identidad autenticada)', async () => {
    const dique = await activoPorHash('seed-activo-dique-cuesta-del-viento');
    const res = await fetch(base + '/api/activos/' + dique.id + '/productos', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ slug: 'sin-sesion-test-vig005', nombre: 'Producto sin sesión VIG-005' }),
    });
    expect(res.status).toBe(401);
    await res.arrayBuffer();
  });

  it('slug único POR ACTIVO: 409 duplicado en el mismo activo, 201 en otro activo distinto', async () => {
    const email = 'vig005-' + ts + '-d@example.test';
    const token = await registrarYLoguear(email);
    const dique = await activoPorHash('seed-activo-dique-cuesta-del-viento');
    const coop = await activoPorHash('seed-activo-fecoagro-tudcum');
    try {
      const duplicado = await fetch(base + '/api/activos/' + dique.id + '/productos', {
        method: 'POST',
        headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
        body: JSON.stringify({ slug: 'vino-patero-test-vig005', nombre: 'Producto duplicado VIG-005' }),
      });
      expect(duplicado.status).toBe(409);
      await duplicado.arrayBuffer();

      // el mismo slug en OTRO activo es válido: la unicidad es (activo_id, slug)
      const otro = await fetch(base + '/api/activos/' + coop.id + '/productos', {
        method: 'POST',
        headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
        body: JSON.stringify({ slug: 'vino-patero-test-vig005', nombre: 'Mismo slug en otro activo VIG-005' }),
      });
      expect(otro.status).toBe(201);
      const bodyOtro: any = await otro.json();
      await prisma.productos.delete({ where: { id: bodyOtro.data.id } }).catch(() => undefined);
    } finally {
      await prisma.productos.deleteMany({ where: { slug: 'vino-patero-test-vig005', activo_id: coop.id } }).catch(() => undefined);
    }
  });

  it('404 honesto: activo inexistente en catálogo/operativa; restricted excluido sin excepción (ADR-036)', async () => {
    const email = 'vig005-' + ts + '-e@example.test';
    const token = await registrarYLoguear(email);

    const inexistente = await fetch(base + '/api/activos/no-existe-vig005/productos');
    expect(inexistente.status).toBe(404);
    await inexistente.arrayBuffer();

    const postInexistente = await fetch(base + '/api/activos/no-existe-vig005/productos', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify({ slug: 'activo-inexistente-vig005', nombre: 'Producto para activo inexistente' }),
    });
    expect(postInexistente.status).toBe(404);
    await postInexistente.arrayBuffer();

    const restricted = await prisma.activos.create({
      data: {
        tipo: 'local',
        titulo: 'Activo restringido (test VIG-005)',
        estado: 'aprobado',
        nodo_key: 'iglesia',
        lat: -30.2,
        lng: -69.2,
        visibilidad: 'restricted',
        created_by_hash: 'test-vig005-restricted',
        hash: 'test-vig005-restricted-' + ts,
      },
    });
    try {
      const catalogo = await fetch(base + '/api/activos/' + restricted.id + '/productos');
      expect(catalogo.status, 'restricted ni siquiera confirma existencia').toBe(404);
      await catalogo.arrayBuffer();
      const operativa = await fetch(base + '/api/operativa/' + restricted.id);
      expect(operativa.status).toBe(404);
      await operativa.arrayBuffer();
      const post = await fetch(base + '/api/activos/' + restricted.id + '/productos', {
        method: 'POST',
        headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
        body: JSON.stringify({ slug: 'producto-restricted-vig005', nombre: 'Producto sobre activo restricted' }),
      });
      expect(post.status).toBe(404);
      await post.arrayBuffer();
      // y sigue fuera del mapa público (lectura anónima)
      const lista = await fetch(base + '/api/activos');
      const bodyLista: any = await lista.json();
      expect(bodyLista.data.some((a: any) => a.id === restricted.id)).toBe(false);
    } finally {
      await prisma.activos.delete({ where: { id: restricted.id } });
    }
  });

  it('db:seed re-ejecutado no duplica operativas ni sellos (idempotencia total)', async () => {
    const antes = await Promise.all([
      prisma.activos_operativa.findMany({ where: { activo: { hash: { startsWith: 'seed-activo-' } } } }),
      prisma.events_raw.count({ where: { type: 'operativa.ingestado' } }),
    ]);
    expect(antes[0].length).toBe(3);
    expect(antes[1]).toBe(3);
    execSync('pnpm --filter @delocalsoy/db db:seed', { cwd: repoRoot, stdio: 'pipe' });
    const despues = await Promise.all([
      prisma.activos_operativa.findMany({ where: { activo: { hash: { startsWith: 'seed-activo-' } } } }),
      prisma.events_raw.count({ where: { type: 'operativa.ingestado' } }),
    ]);
    expect(despues[0].length).toBe(antes[0].length);
    expect(despues[1]).toBe(antes[1]);
    expect(despues[0].length).toBe(3);
    expect(despues[1]).toBe(3);
  }, 60000);
});
