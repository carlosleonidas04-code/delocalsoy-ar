import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// NODO-VIG VIG-002 (NVIG-R2 #169, épica #167): activos multimodales del
// Valle de Iglesia — clasificación N1→N3 (taxonomía VIG-000), procedencia
// ADR-035, visibilidad ADR-036 y semilla verificada de 6 activos. Decisiones
// ratificadas por la DH (2026-10-13, traza #169 comment 6156260102): semilla
// SOLO con datos verificados (0 prestadores Ley 2400-T, 0 Mujeres de Montaña
// unverified). Requiere Postgres/PostGIS real (job test de CI); sin base →
// skip honesto (patrón subnodos-rutas). El test ejecuta el seed REAL
// (db:seed = seed.sql + seed-subnodos.sql + seed-activos-vig002.sql).

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';
process.env.JWT_SECRET = 'test-jwt-secret-vig002-activos-multimodales-32';

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

describe.skipIf(!dbUp)('activos multimodales VIG-002 (#169, épica #167)', () => {
  const ts = Date.now();
  const jsonHeaders = { 'content-type': 'application/json' };
  const PASSWORD = 'contrasena-muy-secreta-8+chars';
  let creadoId = '';

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

  it('seed VIG-002: 6 activos verificados, procedencia trazable y punto solo con fuente (R15)', async () => {
    const sembrados: any[] = await prisma.activos.findMany({
      where: { hash: { startsWith: 'seed-activo-' } },
    });
    expect(sembrados.length).toBe(6);
    const porHash = new Map(sembrados.map((a: any) => [a.hash, a]));
    for (const a of sembrados) {
      expect(a.estado).toBe('aprobado'); // "verificado" = aprobado + procedencia
      expect(a.visibilidad).toBe('public');
      expect(a.is_synthetic).toBe(false);
      expect(a.procedencia).not.toBeNull();
      expect((a.procedencia as any).source_id).toBeTruthy();
      expect((a.procedencia as any).fuente).toBeTruthy();
      expect((a.procedencia as any).fecha).toMatch(/^\d{4}(-\d{2}-\d{2})?$/);
    }
    // Yacimiento Angualasto: único con punto propio — citado por Decreto
    // 2.154/2009 art. 1 (~30°3 S 68°10 O).
    const angualasto: any = porHash.get('seed-activo-yacimiento-angualasto');
    expect(angualasto, 'falta Angualasto').toBeDefined();
    expect(angualasto.lat).toBe(-30.05);
    expect(angualasto.lng).toBeCloseTo(-68.1667, 3);
    // El resto acredita ubicación por subnodo: null honesto, sin inventar (R15)
    for (const h of [
      'seed-activo-capilla-achango',
      'seed-activo-molino-bella-vista',
      'seed-activo-fecoagro-tudcum',
      'seed-activo-coop-valles-iglesianos',
      'seed-activo-dique-cuesta-del-viento',
    ]) {
      const a: any = porHash.get(h);
      expect(a, 'falta ' + h).toBeDefined();
      expect(a.lat).toBeNull();
      expect(a.lng).toBeNull();
    }
    // Clasificaciones N1→N3: una primaria con fuente por activo
    const clas: any[] = await prisma.activos_clasificaciones.findMany({
      where: { activo_id: { in: sembrados.map((a: any) => a.id) } },
    });
    expect(clas.length).toBe(6);
    const capilla = clas.find((c: any) => c.n1 === 'patrimonial' && c.n2 === 'patrimonio_colonial');
    expect(capilla).toBeDefined();
    expect(capilla.n3).toBe('capilla');
    expect(capilla.is_primary).toBe(true);
    expect(capilla.source).toContain('24.790');
  });

  it('filtros VIG-002 de la lectura pública: n1 de la taxonomía, subnodo y tipo', async () => {
    const pat = await fetch(base + '/api/activos?n1=patrimonial');
    expect(pat.status).toBe(200);
    expect(((await pat.json()) as any).count).toBe(3);
    const prod = await fetch(base + '/api/activos?n1=productivo_rural');
    expect(((await prod.json()) as any).count).toBe(2);
    const tur = await fetch(base + '/api/activos?n1=turistico');
    expect(((await tur.json()) as any).count).toBe(1);
    const coop = await fetch(base + '/api/activos?n1=turistico&tipo=infraestructura');
    const coopBody: any = await coop.json();
    expect(coopBody.count).toBe(1);
    expect(coopBody.data[0].subnodo_key).toBe('sj_iglesia_p_dique_cuesta_del_viento');
    // contexto de distrito: Fecoagro Tudcum es el único activo del subnodo
    const porSubnodo = await fetch(base + '/api/activos?subnodo=sj_iglesia_tudcum');
    const bodySubnodo: any = await porSubnodo.json();
    expect(porSubnodo.status).toBe(200);
    expect(bodySubnodo.count).toBe(1);
    expect(bodySubnodo.data[0].titulo).toBe('Cooperativa Fecoagro Tudcum');
    const porTipo = await fetch(base + '/api/activos?tipo=prestador');
    expect(((await porTipo.json()) as any).count).toBe(2);
    const badN1 = await fetch(base + '/api/activos?n1=no_existe');
    expect(badN1.status).toBe(400);
    await badN1.arrayBuffer();
  });

  it('visibilidad restricted queda excluida de la lectura pública (ADR-036)', async () => {
    const sensible = await prisma.activos.create({
      data: {
        tipo: 'patrimonio',
        titulo: 'Ficha sensible de custodia (test VIG-002)',
        estado: 'aprobado',
        nodo_key: 'iglesia',
        subnodo_key: 'sj_iglesia_p_bauchaceta',
        lat: -30.01,
        lng: -69.2,
        visibilidad: 'restricted',
        created_by_hash: 'test-vig002',
      },
    });
    try {
      const lista = await fetch(base + '/api/activos?subnodo=sj_iglesia_p_bauchaceta');
      const bodyLista: any = await lista.json();
      expect(bodyLista.success).toBe(true);
      expect(bodyLista.data.some((a: any) => a.id === sensible.id)).toBe(false);
      // y tampoco por bbox aunque el punto caiga dentro de la envolvente
      const porBbox = await fetch(base + '/api/activos?bbox=-69.25,-30.05,-69.15,-29.95');
      const bodyBbox: any = await porBbox.json();
      expect(bodyBbox.data.some((a: any) => a.id === sensible.id)).toBe(false);
    } finally {
      await prisma.activos.delete({ where: { id: sensible.id } });
    }
  });

  it('ciudadano propone experiencia multimodal: 201 con subnodo, clasificación y sello', async () => {
    const email = `vig002-${ts}-a@example.test`;
    const token = await registrarYLoguear(email);
    const res = await fetch(base + '/api/activos', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify({
        tipo: 'experiencia',
        titulo: 'Recorrido textil del telar iglesiano',
        descripcion: 'Recorrido comunitario por el nudo textil de Achango propuesto por vecinos del distrito',
        nodo_key: 'iglesia',
        subnodo_key: 'sj_iglesia_p_achango',
        lat: -30.05,
        lng: -68.1667,
        clasificaciones: [
          { n1: 'civico_social', n2: 'oficios_tradicionales', n3: 'tejido', is_primary: true, source: 'propuesta comunitaria del nodo (VIG-000)' },
        ],
      }),
    });
    expect(res.status).toBe(201);
    const activo = ((await res.json()) as any).data;
    creadoId = activo.id;
    expect(activo.estado).toBe('propuesto');
    expect(activo.subnodo_key).toBe('sj_iglesia_p_achango');
    expect(activo.visibilidad).toBe('public');
    expect(activo.is_synthetic).toBe(false);
    // clasificación creada atómicamente con el alta
    const clas: any[] = await prisma.activos_clasificaciones.findMany({ where: { activo_id: activo.id } });
    expect(clas.length).toBe(1);
    expect(clas[0].n1).toBe('civico_social');
    expect(clas[0].n2).toBe('oficios_tradicionales');
    expect(clas[0].n3).toBe('tejido');
    expect(clas[0].is_primary).toBe(true);
    // sello con el contexto subnodo (VIG-002), sin PII
    const sello = await prisma.events_raw.findFirst({
      where: { type: 'activo.propuesto', payload: { path: ['activo_id'], equals: activo.id } },
    });
    expect(sello).not.toBeNull();
    expect((sello?.payload as any).subnodo_key).toBe('sj_iglesia_p_achango');
    const selloTexto = JSON.stringify(sello?.payload);
    expect(selloTexto).not.toContain('@');
    expect(selloTexto).not.toContain('example.test');
  });

  it('subnodo inexistente o ajeno al nodo declarado → 400', async () => {
    const token = await registrarYLoguear(`vig002-${ts}-b@example.test`);
    const inexistente = await fetch(base + '/api/activos', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify({
        tipo: 'observacion',
        titulo: 'Observacion con subnodo inexistente',
        nodo_key: 'iglesia',
        subnodo_key: 'sj_iglesia_p_no_existe',
        lat: -30.1,
        lng: -69.1,
      }),
    });
    expect(inexistente.status).toBe(400);
    await inexistente.arrayBuffer();
    // sj_iglesia_rodeo existe, pero pertenece al nodo iglesia, no a caucete
    const ajeno = await fetch(base + '/api/activos', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify({
        tipo: 'observacion',
        titulo: 'Observacion con subnodo ajeno al nodo',
        nodo_key: 'caucete',
        subnodo_key: 'sj_iglesia_rodeo',
        lat: -31.38,
        lng: -68.28,
      }),
    });
    expect(ajeno.status).toBe(400);
    await ajeno.arrayBuffer();
  });

  it('anti-PII: teléfono +54 en la descripción → 400 antes de persistir, sin eco', async () => {
    const token = await registrarYLoguear(`vig002-${ts}-c@example.test`);
    const res = await fetch(base + '/api/activos', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify({
        tipo: 'local',
        titulo: 'Emprendimiento vecinal',
        descripcion: 'coordinar visitas al +54 264 555 1234',
        nodo_key: 'iglesia',
        lat: -30.2,
        lng: -69.2,
      }),
    });
    expect(res.status).toBe(400);
    const texto = JSON.stringify(await res.json());
    expect(texto).not.toContain('555 1234');
    expect(texto).not.toContain('+54');
  });

  it('contrato: clasificaciones sin primaria exacta → 400', async () => {
    const token = await registrarYLoguear(`vig002-${ts}-d@example.test`);
    const res = await fetch(base + '/api/activos', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify({
        tipo: 'patrimonio',
        titulo: 'Prueba de clasificacion sin primaria',
        nodo_key: 'iglesia',
        lat: -30.2,
        lng: -69.2,
        clasificaciones: [
          { n1: 'patrimonial', n2: 'capilla_test', is_primary: false, source: 'prueba de contrato' },
        ],
      }),
    });
    expect(res.status).toBe(400);
    const texto = JSON.stringify(await res.json());
    expect(texto).toContain('primaria');
  });

  it('moderación VIG-002: archivado retira del catálogo vivo con sello', async () => {
    const email = `vig002-${ts}-a@example.test`;
    await prisma.usuarios.update({ where: { email }, data: { rol: 'moderador' } });
    const token = await registrarYLoguear(email);
    const res = await fetch(base + '/api/activos/' + creadoId + '/estado', {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify({ estado: 'archivado', motivo: 'retirado del catálogo vivo en moderación' }),
    });
    expect(res.status).toBe(200);
    expect(((await res.json()) as any).data.estado).toBe('archivado');
    const sello = await prisma.events_raw.findFirst({
      where: { type: 'activo.estado_cambiado', payload: { path: ['activo_id'], equals: creadoId } },
    });
    expect(sello).not.toBeNull();
    expect((sello?.payload as any).estado).toBe('archivado');
  });

  it('db:seed re-ejecutado no duplica: 6 activos, 6 sellos activo.ingestado sin PII', async () => {
    const antes = await Promise.all([
      prisma.activos.count({ where: { hash: { startsWith: 'seed-activo-' } } }),
      prisma.activos_clasificaciones.count(),
      prisma.events_raw.count({ where: { type: 'activo.ingestado' } }),
    ]);
    execSync('pnpm --filter @delocalsoy/db db:seed', { cwd: repoRoot, stdio: 'pipe' });
    const despues = await Promise.all([
      prisma.activos.count({ where: { hash: { startsWith: 'seed-activo-' } } }),
      prisma.activos_clasificaciones.count(),
      prisma.events_raw.count({ where: { type: 'activo.ingestado' } }),
    ]);
    expect(despues).toEqual(antes);
    expect(despues[0]).toBe(6);
    expect(despues[2]).toBe(6);
    const sellos: any[] = await prisma.events_raw.findMany({ where: { type: 'activo.ingestado' } });
    const dique: any = sellos.find((e: any) => e.hash === 'seed-activo-dique-cuesta-del-viento');
    expect(dique, 'falta el sello del Dique Cuesta del Viento').toBeDefined();
    expect(dique.payload.estado).toBe('aprobado');
    expect(dique.payload.source).toBe('seed-vig-002');
    expect(dique.payload.subnodo_key).toBe('sj_iglesia_p_dique_cuesta_del_viento');
    const payloadKeys = Object.keys(dique.payload).sort();
    expect(payloadKeys).toEqual(['activo_id', 'estado', 'nodo_key', 'source', 'subnodo_key', 'tipo']);
    const texto = JSON.stringify(sellos);
    expect(texto).not.toContain('@');
    expect(texto).not.toContain('example.test');
  }, 60000);
});
