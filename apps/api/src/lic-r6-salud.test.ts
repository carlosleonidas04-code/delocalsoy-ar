import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// LIC-DLUI LIC-R6 (LIC-06 #449, épica #448): DL-11 — salud urbana federada,
// extremo a extremo contra servicios reales (PostgreSQL/PostGIS):
// - SOLO agregados oficiales federados VÍA ingestas (patrón EV-049): la
//   salud individual es dato sensible PROHIBIDO (Ley 25.326) — la superficie
//   no registra personas, casos ni eventos individuales y el alta no tiene
//   campos de texto libre (superficie PII cero)
// - tabla salud_agregados que NACE VACÍA (R15, DL-11): el catálogo público
//   sirve cada par (nodo, indicador) como `sin_fuente_ingestada` con valor
//   null (null ≠ 0 — la brecha es visible, jamás estimada)
// - NC-EV-09: el agregado cita su ingesta del pipeline; la lectura pública
//   SOLO expone agregados cuya ingesta esté 'publicado' — el pipeline en
//   curso queda `en_custodia` con valor null
// - integridad de procedencia: la fuente_key declarada debe coincidir con
//   la de la ingesta (el agregado no viaja suelto)
// - alta curada solo admin (R15 estricta, patrón ingestas), idempotencia
//   por hash único, sello salud.agregado_ingestado con rollback
// - NUNCA ranking de salud entre nodos (R5/ADR-036): cobertura «X de Y»
// Fixture de escritura en CAUCETE — capital READ-ONLY (patrón LIC-R2..R7).
// Requiere Postgres/PostGIS real (job test de CI); sin base el suite se
// salta (honesto, R5).
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';
process.env.JWT_SECRET = 'test-jwt-secret-lic-r6-salud-449';

const { createApp } = await import('./app.js');
const prisma = (await import('./lib/prisma.js')).default;
const { SaludAgregadoRowSchema } = await import('@delocalsoy/contracts');

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

describe.skipIf(!dbUp)('Salud urbana federada (LIC-DLUI LIC-R6 — #449, épica #448)', () => {
  const ts = Date.now();
  const jsonHeaders = { 'content-type': 'application/json' };
  const PASSWORD = 'contrasena-muy-secreta-8+chars';

  // Tokens con login ÚNICO por email: el rate limit de identidad (R5a, #101:
  // 5 intentos / 300 s por ip + hash de email, contadores en Redis COMPARTIDO
  // entre las suites paralelas de CI) bloquea logins repetidos del mismo email
  // dentro de la suite — el JWT vive 15 min y se reutiliza entre tests.
  let adminToken = '';

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

  function payloadIngesta(sourceId: string) {
    return {
      source_id: sourceId,
      fuente_key: 'refes',
      nodo_key: 'caucete', // fixture de ESCRITURA en caucete — capital READ-ONLY
      capa_servicio: 'refes_establecimientos_departamento',
      fecha_acceso: '2026-11-12',
      fecha_corte: '2025',
      crs_origen: 'EPSG:4326',
      crs_normalizado: 'EPSG:4326',
      escala_precision: 'departamental — conteo anual de efectores',
      external_id: 'refes-caucete-' + sourceId,
      transformaciones: 'conteo agregado de establecimientos por departamento',
    };
  }

  function payloadAgregado(indicador: string, periodo: string, valor: number, ingestaId: string) {
    return {
      indicador,
      periodo,
      valor,
      fuente_key: 'refes',
      ingesta_id: ingestaId,
    };
  }

  it('nace honesto: catálogo público con todos los pares sin_fuente_ingestada, valor null y cobertura «0 de 12» (R15, DL-11)', async () => {
    const res = await fetch(base + '/api/salud');
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.regla).toContain('Ley 25.326'); // DL-11 visible en la superficie
    expect(body.data.cautela).toContain('ranking'); // anti-ranking R5/ADR-036
    expect(body.data.indicadores).toHaveLength(4); // catálogo declarado DL-11
    expect(body.data.nodos).toHaveLength(3); // capital, caucete, iglesia
    // R15: null ≠ 0 — sin fuente ingestado el par NO se computa (12 pares).
    for (const nodo of body.data.nodos) {
      expect(nodo.pares).toHaveLength(4);
      for (const par of nodo.pares) {
        expect(par.estado).toBe('sin_fuente_ingestada');
        expect(par.valor).toBeNull();
        expect(par.periodo).toBeNull();
        expect(par.procedencia).toBeNull();
      }
    }
    expect(body.data.cobertura).toBe('0 de 12'); // conteo CON cobertura, jamás ranking
    // La tabla nace VACÍA (DL-11): declarar la estructura NO es simular datos.
    expect(await prisma.salud_agregados.count()).toBe(0);
  });

  it('R15: el ciudadano NO carga agregados → 403 (alta curada solo admin)', async () => {
    const token = await registrarYLoguear('licr6-' + ts + '-ciu@example.test');
    const res = await fetch(base + '/api/salud/agregados', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify(payloadAgregado('efectores_salud', '2025', 12, 'ingesta-inexistente')),
    });
    expect(res.status).toBe(403);
    await res.arrayBuffer();
  });

  it('R15: el moderador tampoco → 403 (la federación de salud es curada por admin, patrón ingestas)', async () => {
    const token = await rolYLoguear('licr6-' + ts + '-mod@example.test', 'moderador');
    const res = await fetch(base + '/api/salud/agregados', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify(payloadAgregado('efectores_salud', '2025', 12, 'ingesta-inexistente')),
    });
    expect(res.status).toBe(403);
    await res.arrayBuffer();
  });

  it('E2E federación: admin crea ingesta REFES → pipeline publicado → agregado publicado con procedencia + sello', async () => {
    const emailAdmin = 'licr6-' + ts + '-admin@example.test';
    const token = (adminToken = await rolYLoguear(emailAdmin, 'admin'));

    // 1) La ingesta del pipeline de procedencia (fuente 'refes' del catálogo).
    const ing = await fetch(base + '/api/ingestas', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify(payloadIngesta('licr6-refes-caucete-' + ts)),
    });
    expect(ing.status).toBe(201);
    const ingBody: any = await ing.json();
    const ingestaId = ingBody.data.id as string;
    expect(ingBody.data.estado).toBe('recibido');

    // 2) Pipeline completo recibido → … → publicado (solo admin).
    for (const estado of ['validado_tecnicamente', 'validado_territorialmente', 'publicado']) {
      const paso = await fetch(base + '/api/ingestas/' + ingestaId + '/estado', {
        method: 'PATCH',
        headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
        body: JSON.stringify({ estado, motivo: 'paso de pipeline del fixture LIC-R6' }),
      });
      expect(paso.status, 'pipeline → ' + estado).toBe(200);
    }

    // 3) El agregado federado cita su ingesta (NC-EV-09).
    const res = await fetch(base + '/api/salud/agregados', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify(payloadAgregado('efectores_salud', '2025', 12, ingestaId)),
    });
    expect(res.status).toBe(201);
    const body: any = await res.json();
    expect(() => SaludAgregadoRowSchema.parse(body.data)).not.toThrow();
    expect(body.data.nodo_key).toBe('caucete'); // derivado de la ingesta
    expect(body.data.indicador).toBe('efectores_salud');
    expect(body.data.valor).toBe(12);
    const agregadoId = body.data.id as string;

    // Sello del acto (fuente de verdad), ACOTADO por agregado_id (patrón
    // NCAP-R1: un count global de events_raw es racy bajo suites paralelas).
    const sellos: any[] = await prisma.events_raw.findMany({
      where: { type: 'salud.agregado_ingestado', payload: { path: ['agregado_id'], equals: agregadoId } },
    });
    expect(sellos.length).toBe(1);
    expect(sellos[0].payload.indicador).toBe('efectores_salud');
    expect(sellos[0].payload.fuente_key).toBe('refes');
    expect(sellos[0].payload.ingesta_id).toBe(ingestaId);
    expect(JSON.stringify(sellos[0].payload)).not.toContain('@'); // sin PII

    // 4) El catálogo público ahora sirve el par publicado CON procedencia.
    const cat = await fetch(base + '/api/salud');
    const catBody: any = await cat.json();
    const caucete = catBody.data.nodos.find((n: any) => n.nodo_key === 'caucete');
    const par = caucete.pares.find((p: any) => p.indicador === 'efectores_salud');
    expect(par.estado).toBe('publicado');
    expect(par.valor).toBe(12);
    expect(par.periodo).toBe('2025');
    expect(par.procedencia).toEqual({ fuente_key: 'refes', source_id: 'licr6-refes-caucete-' + ts, fecha_corte: '2025' });
    expect(catBody.data.cobertura).toBe('1 de 12');
    // Los demás pares siguen honestos en null (null ≠ 0, R15).
    for (const otro of caucete.pares.filter((p: any) => p.indicador !== 'efectores_salud')) {
      expect(otro.estado).toBe('sin_fuente_ingestada');
      expect(otro.valor).toBeNull();
    }
  });

  it('NC-EV-09: agregado con ingesta en curso queda en_custodia — valor null, no se lee', async () => {
    // Token del admin (login ÚNICO por email — R5a): reutilizado entre tests.
    const token = adminToken;
    expect(token, 'token del admin (login único del test E2E)').toBeTruthy();

    // Segunda ingesta REFES que QUEDA en curso (nace 'recibido', sin pipeline).
    const ing = await fetch(base + '/api/ingestas', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify(payloadIngesta('licr6-refes-camas-' + ts)),
    });
    expect(ing.status).toBe(201);
    const ingBody: any = await ing.json();
    const ingestaEnCurso = ingBody.data.id as string;

    const res = await fetch(base + '/api/salud/agregados', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify(payloadAgregado('camas_internacion', '2025', 34, ingestaEnCurso)),
    });
    expect(res.status).toBe(201);
    await res.arrayBuffer();

    // El agregado existe pero su ingesta no está publicada: en custodia.
    const cat = await fetch(base + '/api/salud');
    const catBody: any = await cat.json();
    const caucete = catBody.data.nodos.find((n: any) => n.nodo_key === 'caucete');
    const par = caucete.pares.find((p: any) => p.indicador === 'camas_internacion');
    expect(par.estado).toBe('en_custodia');
    expect(par.valor).toBeNull(); // NC-EV-09: el pipeline en curso no se lee
    expect(par.procedencia).toBeNull();
    expect(catBody.data.cobertura).toBe('1 de 12'); // sin cambios en lo público
  });

  it('idempotencia: mismo agregado (misma ingesta) → idempotente true sin segunda fila', async () => {
    const token = adminToken;
    expect(token, 'token del admin (login único del test E2E)').toBeTruthy();

    const ingesta = (await prisma.ingestas.findFirstOrThrow({
      where: { source_id: 'licr6-refes-caucete-' + ts },
      select: { id: true },
    })) as { id: string };

    const res = await fetch(base + '/api/salud/agregados', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify(payloadAgregado('efectores_salud', '2025', 12, ingesta.id)),
    });
    expect(res.status).toBe(200); // idempotente, no 201 duplicado
    const body: any = await res.json();
    expect(body.success).toBe(true);
    expect(body.idempotente).toBe(true);

    // Acotado por la ingesta del fixture: una sola fila por agregado.
    const filas = await prisma.salud_agregados.count({ where: { ingesta_id: ingesta.id } });
    expect(filas).toBe(1);
  });

  it('NC-EV-09: ingesta inexistente → 404 (el agregado no viaja suelto)', async () => {
    const token = adminToken;
    expect(token, 'token del admin (login único del test E2E)').toBeTruthy();

    const res = await fetch(base + '/api/salud/agregados', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify(payloadAgregado('efectores_salud', '2025', 12, 'ingesta-que-no-existe-' + ts)),
    });
    expect(res.status).toBe(404);
    const body: any = await res.json();
    expect(body.error).toContain('ingesta');
  });

  it('integridad de procedencia: fuente_key que no coincide con la ingesta → 400', async () => {
    const token = adminToken;
    expect(token, 'token del admin (login único del test E2E)').toBeTruthy();

    const ingesta = (await prisma.ingestas.findFirstOrThrow({
      where: { source_id: 'licr6-refes-camas-' + ts },
      select: { id: true },
    })) as { id: string };

    const res = await fetch(base + '/api/salud/agregados', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify({
        indicador: 'camas_internacion',
        periodo: '2025',
        valor: 34,
        fuente_key: 'inpres', // NO coincide con 'refes' de la ingesta
        ingesta_id: ingesta.id,
      }),
    });
    expect(res.status).toBe(400);
    const body: any = await res.json();
    expect(body.error).toContain('no coincide');
  });

  it('integridad + anti-PII: created_by_hash sha32 del admin y superficie sin PII (Ley 25.326)', async () => {
    const token = adminToken;
    expect(token, 'token del admin (login único del test E2E)').toBeTruthy();

    const emailAdmin = 'licr6-' + ts + '-admin@example.test';
    const ingesta = (await prisma.ingestas.findFirstOrThrow({
      where: { source_id: 'licr6-refes-caucete-' + ts },
      select: { id: true },
    })) as { id: string };
    const fila = (await prisma.salud_agregados.findFirstOrThrow({
      where: { ingesta_id: ingesta.id },
    })) as any;
    expect(fila.created_by_hash).toMatch(/^[0-9a-f]{32}$/); // sha32 (sha256 truncado)

    // El pseudónimo ES el sha256(usuario_id) del admin (patrón ingestas).
    const admin = await prisma.usuarios.findUniqueOrThrow({ where: { email: emailAdmin } });
    const esperado = createHash('sha256').update(admin.id).digest('hex').slice(0, 32);
    expect(fila.created_by_hash).toBe(esperado);

    // Superficie pública sin PII: el catálogo no expone emails ni identidad.
    const cat = await fetch(base + '/api/salud');
    const catBody: any = await cat.json();
    expect(JSON.stringify(catBody)).not.toContain('@');
    expect(JSON.stringify(catBody)).not.toContain('example.test');
    // Cobertura honesta final: 1 publicado de 12 (el de REFES publicado).
    expect(catBody.data.cobertura).toBe('1 de 12');
    // Ningún registro individual: solo agregados, jamás personas (DL-11).
    expect(await prisma.salud_agregados.count()).toBe(2); // efectores + camas del fixture
  });
});
