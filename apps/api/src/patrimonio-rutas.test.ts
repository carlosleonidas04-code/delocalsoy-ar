import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// NODO-VIG VIG-004 (NVIG-R6 #173, épica #167): patrimonio protegido — ficha
// patrimonial pública (declaratoria + conservación + reglas + punto público
// de acceso) y custodia PATCH moderador|admin con sello patrimonio.custodiado
// en events_raw + rollback. Decisiones ratificadas por la DH (2026-10-14,
// traza #173 comment 6159546907): tabla 1:1 activos_patrimonio; ficha pública
// TAMBIÉN para activos restricted (la declaratoria es registro público; lo
// restringido es la geometría interna); `sensible` existe desde v1 pero queda
// NULL con sensible_status='sin_relevamiento' (honesto R15: no existe
// relevamiento de geometría interna en nuestras fuentes); ficha de tejedora
// diferida (0 consentimientos reales, Ley 25.326/ADR-027). La respuesta
// pública NUNCA contiene `sensible` ni `sensible_nota` (ADR-036). Requiere
// Postgres/PostGIS real (job test de CI); sin base → skip honesto (patrón
// subnodos-rutas). El test ejecuta el seed REAL (db:seed = 4 SQL idempotentes).

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';
process.env.JWT_SECRET = 'test-jwt-secret-vig004-patrimonio-protegido-32';

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

describe.skipIf(!dbUp)('Patrimonio protegido VIG-004 (#173, épica #167)', () => {
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

  it('seed VIG-004: 3 fichas con declaratoria verificada, sensible NULL y sellos patrimonio.ingestado sin PII', async () => {
    const fichas: any[] = await prisma.activos_patrimonio.findMany({
      where: { id: { startsWith: 'seed-patrimonio-' } },
    });
    expect(fichas.length).toBe(3);
    const porId = new Map(fichas.map((f: any) => [f.id, f]));
    for (const f of fichas) {
      expect(f.sensible).toBeNull(); // R15: sin relevamiento, sin inventar
      expect(f.sensible_status).toBe('sin_relevamiento');
      expect(f.reglas_acceso).toEqual([]);
      expect(f.acceso_lat).toBeNull();
      expect(f.acceso_lng).toBeNull();
    }
    const angualasto: any = porId.get('seed-patrimonio-yacimiento-angualasto');
    expect(angualasto, 'falta la ficha del yacimiento de Angualasto').toBeDefined();
    expect(angualasto.proteccion_nivel).toBe('nacional_decreto');
    expect(angualasto.proteccion_norma).toContain('2.154/2009');
    expect(angualasto.proteccion_norma).toContain('7.300/2002');
    expect(angualasto.conservacion_estado).toContain('fase 1');
    const achango: any = porId.get('seed-patrimonio-capilla-achango');
    expect(achango, 'falta la ficha de la Capilla de Achango').toBeDefined();
    expect(achango.proteccion_nivel).toBe('nacional_ley');
    expect(achango.proteccion_norma).toContain('24.790');
    expect(achango.conservacion_estado).toContain('crítico');
    const molino: any = porId.get('seed-patrimonio-molino-bella-vista');
    expect(molino, 'falta la ficha del Molino de Bella Vista').toBeDefined();
    expect(molino.proteccion_nivel).toBe('nacional_ley');
    expect(molino.proteccion_norma).toContain('25.291');
    // Sellos de la ingesta curada: uno por ficha, hash idempotente (hash del
    // activo + ':pat'), payload sin PII (solo claves territoriales y nivel).
    const sellos: any[] = await prisma.events_raw.findMany({ where: { type: 'patrimonio.ingestado' } });
    expect(sellos.length).toBe(3);
    const activos: any[] = await prisma.activos.findMany({ where: { hash: { startsWith: 'seed-activo-' } } });
    for (const s of sellos) {
      expect(s.hash.endsWith(':pat')).toBe(true);
      expect(s.payload.source).toBe('seed-vig-004');
      const a: any = activos.find((x: any) => x.id === s.payload.activo_id);
      expect(a, 'el sello apunta a un activo de la semilla').toBeDefined();
      expect(s.hash).toBe(a.hash + ':pat');
      const payloadKeys = Object.keys(s.payload).sort();
      expect(payloadKeys).toEqual(['activo_id', 'nodo_key', 'proteccion_nivel', 'sensible_status', 'source', 'subnodo_key']);
    }
    const texto = JSON.stringify(sellos);
    expect(texto).not.toContain('@');
    expect(texto).not.toContain('example.test');
  });

  it('GET ficha pública: declaratoria visible, `sensible` y `sensible_nota` NUNCA (ADR-036)', async () => {
    for (const hash of [
      'seed-activo-yacimiento-angualasto',
      'seed-activo-capilla-achango',
      'seed-activo-molino-bella-vista',
    ]) {
      const a: any = await prisma.activos.findUnique({ where: { hash } });
      const res = await fetch(base + '/api/patrimonio/' + a.id);
      expect(res.status, 'ficha de ' + hash).toBe(200);
      const body: any = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.proteccion_norma.length).toBeGreaterThan(3);
      expect(body.data.sensible_status).toBe('sin_relevamiento');
      const keys = Object.keys(body.data);
      expect(keys).not.toContain('sensible');
      expect(keys).not.toContain('sensible_nota');
    }
    const angualasto: any = await prisma.activos.findUnique({ where: { hash: 'seed-activo-yacimiento-angualasto' } });
    const res = await fetch(base + '/api/patrimonio/' + angualasto.id);
    const body: any = await res.json();
    expect(body.data.proteccion_nivel).toBe('nacional_decreto');
    expect(body.data.proteccion_norma).toContain('2.154/2009');
    expect(body.data.reglas_acceso).toEqual([]);
    expect(typeof body.data.lat).toBe('number'); // public → punto propio visible
    expect(body.data.nodo_key).toBe('iglesia');
  });

  it('404 honesto: activo inexistente o sin ficha patrimonial', async () => {
    const inexistente = await fetch(base + '/api/patrimonio/no-existe-vig004');
    expect(inexistente.status).toBe(404);
    await inexistente.arrayBuffer();
    const sinFicha = await prisma.activos.create({
      data: {
        tipo: 'local',
        titulo: 'Activo sin ficha patrimonial (test VIG-004)',
        estado: 'aprobado',
        nodo_key: 'iglesia',
        lat: -30.2,
        lng: -69.2,
        created_by_hash: 'test-vig004-sin-ficha',
        hash: 'test-vig004-sin-ficha-' + ts,
      },
    });
    try {
      const res = await fetch(base + '/api/patrimonio/' + sinFicha.id);
      expect(res.status).toBe(404);
      const body: any = await res.json();
      expect(body.success).toBe(false);
    } finally {
      await prisma.activos.delete({ where: { id: sinFicha.id } });
    }
  });

  it('PATCH sin sesión → 401 (la custodia exige identidad)', async () => {
    const res = await fetch(base + '/api/patrimonio/no-existe-vig004', {
      method: 'PATCH',
      headers: jsonHeaders,
      body: JSON.stringify({ proteccion_nivel: 'municipal' }),
    });
    expect(res.status).toBe(401);
    await res.arrayBuffer();
  });

  it('custodia moderador: restricted fuera del mapa pero ficha pública con declaratoria y sello patrimonio.custodiado', async () => {
    const email = `vig004-${ts}-a@example.test`;
    const tokenCiudadano = await registrarYLoguear(email);
    const activo = await prisma.activos.create({
      data: {
        tipo: 'patrimonio',
        titulo: 'Sitio patrimonial de custodia (test VIG-004)',
        estado: 'aprobado',
        nodo_key: 'iglesia',
        subnodo_key: 'sj_iglesia_angualasto',
        lat: -30.05,
        lng: -68.1667,
        created_by_hash: 'test-vig004-custodia',
        hash: 'test-vig004-custodia-' + ts,
      },
    });
    try {
      // el ciudadano no custodia: solo moderador|admin (ADR-031)
      const intentoCiudadano = await fetch(base + '/api/patrimonio/' + activo.id, {
        method: 'PATCH',
        headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenCiudadano },
        body: JSON.stringify({ proteccion_nivel: 'municipal' }),
      });
      expect(intentoCiudadano.status).toBe(403);
      await intentoCiudadano.arrayBuffer();

      // Promoción de sistema (moderador) + login nuevo → token con rol.
      await prisma.usuarios.update({ where: { email }, data: { rol: 'moderador' } });
      const tokenModerador = await registrarYLoguear(email);
      const res = await fetch(base + '/api/patrimonio/' + activo.id, {
        method: 'PATCH',
        headers: { ...jsonHeaders, authorization: 'Bearer ' + tokenModerador },
        body: JSON.stringify({
          proteccion_nivel: 'provincial_ley',
          proteccion_norma: 'Ley provincial de prueba del test VIG-004',
          reglas_acceso: [{ regla: 'Visitas solo con guía autorizada del distrito', fuente: 'reglamento municipal de prueba del test' }],
          sensible: { material: 'adobe', interior: 'relevamiento interno de prueba' },
          sensible_status: 'relevado_restringido',
          visibilidad: 'restricted',
        }),
      });
      expect(res.status).toBe(200);
      const body: any = await res.json();
      expect(body.data.visibilidad).toBe('restricted');

      // restricted: fuera del mapa público (ADR-036)...
      const lista = await fetch(base + '/api/activos?subnodo=sj_iglesia_angualasto');
      const bodyLista: any = await lista.json();
      expect(bodyLista.data.some((a: any) => a.id === activo.id)).toBe(false);

      // ...pero la ficha patrimonial sigue pública (la declaratoria es
      // registro público) SIN el punto propio del activo
      const ficha = await fetch(base + '/api/patrimonio/' + activo.id);
      expect(ficha.status).toBe(200);
      const bodyFicha: any = await ficha.json();
      expect(bodyFicha.data.visibilidad).toBe('restricted');
      expect(bodyFicha.data.proteccion_nivel).toBe('provincial_ley');
      expect(bodyFicha.data.reglas_acceso.length).toBe(1);
      expect(bodyFicha.data.reglas_acceso[0].fuente).toContain('reglamento');
      const fichaKeys = Object.keys(bodyFicha.data);
      expect(fichaKeys).not.toContain('sensible');
      expect(fichaKeys).not.toContain('sensible_nota');
      expect(fichaKeys).not.toContain('lat');
      expect(fichaKeys).not.toContain('lng');

      // la custodia quedó persistida para los gestores, nunca publicada
      const enDb: any = await prisma.activos_patrimonio.findUnique({ where: { activo_id: activo.id } });
      expect(enDb.sensible).toEqual({ material: 'adobe', interior: 'relevamiento interno de prueba' });
      expect(enDb.sensible_status).toBe('relevado_restringido');
      expect(enDb.sensible_nota).toBeNull();

      // sello en la fuente de verdad, sin PII
      const sello = await prisma.events_raw.findFirst({
        where: { type: 'patrimonio.custodiado', payload: { path: ['activo_id'], equals: activo.id } },
      });
      expect(sello).not.toBeNull();
      expect((sello?.payload as any).proteccion_nivel).toBe('provincial_ley');
      expect((sello?.payload as any).visibilidad).toBe('restricted');
      expect((sello?.payload as any).custodio_hash).toMatch(/^[0-9a-f]{32}$/);
      const selloTexto = JSON.stringify(sello?.payload);
      expect(selloTexto).not.toContain('@');
      expect(selloTexto).not.toContain('example.test');
    } finally {
      await prisma.activos.delete({ where: { id: activo.id } });
    }
  });

  it('anti-PII: email en sensible_nota → 400 antes de persistir, sin eco (la custodia no es refugio de PII)', async () => {
    const angualasto: any = await prisma.activos.findUnique({ where: { hash: 'seed-activo-yacimiento-angualasto' } });
    const email = `vig004-${ts}-b@example.test`;
    await registrarYLoguear(email);
    await prisma.usuarios.update({ where: { email }, data: { rol: 'moderador' } });
    const token = await registrarYLoguear(email);
    const res = await fetch(base + '/api/patrimonio/' + angualasto.id, {
      method: 'PATCH',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify({ sensible_nota: 'custodio de referencia: juan.perez@example.com' }),
    });
    expect(res.status).toBe(400);
    const texto = JSON.stringify(await res.json());
    expect(texto).not.toContain('juan.perez@example.com');
    // y la ficha sembrada quedó intacta
    const enDb: any = await prisma.activos_patrimonio.findUnique({ where: { activo_id: angualasto.id } });
    expect(JSON.stringify(enDb.sensible_nota)).not.toContain('juan.perez');
  });

  it('db:seed re-ejecutado no duplica fichas ni sellos (idempotencia total)', async () => {
    const antes = await Promise.all([
      prisma.activos_patrimonio.count({ where: { id: { startsWith: 'seed-patrimonio-' } } }),
      prisma.events_raw.count({ where: { type: 'patrimonio.ingestado' } }),
    ]);
    execSync('pnpm --filter @delocalsoy/db db:seed', { cwd: repoRoot, stdio: 'pipe' });
    const despues = await Promise.all([
      prisma.activos_patrimonio.count({ where: { id: { startsWith: 'seed-patrimonio-' } } }),
      prisma.events_raw.count({ where: { type: 'patrimonio.ingestado' } }),
    ]);
    expect(despues).toEqual(antes);
    expect(despues[0]).toBe(3);
    expect(despues[1]).toBe(3);
  }, 60000);
});
