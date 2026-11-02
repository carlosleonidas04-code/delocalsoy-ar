import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// VIG-009 (#241, épica #239): observaciones de estado patrimonial de Achango
// — POST /api/patrimonio/:activoId/observaciones (ciudadano autenticado,
// testimonio append-only con idempotencia por hash sha256(autor|activo|fecha|
// checklist|nota), sello patrimonio.observado en events_raw con rollback: sin
// sello no hay observación acreditada) y GET /:activoId/observaciones (bandeja
// pública con estado_conservacion_global SIEMPRE null — R15: la observación es
// testimonio, jamás diagnóstico; sin informe técnico oficial no existe estado
// verificado). El checklist es el contrato VIG-009 de 5 dimensiones
// (grietas/cornisas/techos/maderos/muros). Requiere Postgres/PostGIS real (job
// test de CI); sin base → skip honesto (patrón patrimonio-rutas).

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';
process.env.JWT_SECRET = 'test-jwt-secret-vig009-achango-observaciones-32';

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

describe.skipIf(!dbUp)('Observaciones patrimoniales VIG-009 (#241, épica #239)', () => {
  const ts = Date.now();
  const jsonHeaders = { 'content-type': 'application/json' };
  const PASSWORD = 'contrasena-muy-secreta-8+chars';

  let observacionId = '';

  // El activo de la Capilla de Achango via la ficha sembrada en VIG-004:
  // las observaciones solo viven sobre activos con ficha patrimonial (R1).
  async function activoAchangoId(): Promise<string> {
    const ficha: any = await prisma.activos_patrimonio.findUnique({ where: { id: 'seed-patrimonio-capilla-achango' } });
    if (ficha === null || typeof ficha.activo_id !== 'string') {
      throw new Error('falta la ficha seed-patrimonio-capilla-achango (seed VIG-004)');
    }
    return ficha.activo_id;
  }

  const bodyObservacion = {
    fecha_observacion: '2026-10-19',
    checklist: { grietas: true, cornisas: true, techos: false, maderos: false, muros: true },
    nota: 'Cornisas del frente con desprendimiento parcial y grietas en el muro norte',
    evidencia: { evidence_type: 'field_observation', descripcion: 'Visita de referencia al paraje Achango del test VIG-009' },
  };

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

  it('POST sin sesión → 401 (la observación exige identidad, no anonimato)', async () => {
    const activoId = await activoAchangoId();
    const res = await fetch(base + '/api/patrimonio/' + activoId + '/observaciones', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(bodyObservacion),
    });
    expect(res.status).toBe(401);
    await res.arrayBuffer();
  });

  it('POST 201 + sello patrimonio.observado sin PII con observador_hash', async () => {
    const activoId = await activoAchangoId();
    const email = 'vig009-' + ts + '-obs@example.test';
    const token = await registrarYLoguear(email);
    const res = await fetch(base + '/api/patrimonio/' + activoId + '/observaciones', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify(bodyObservacion),
    });
    expect(res.status).toBe(201);
    const body: any = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.activo_id).toBe(activoId);
    expect(body.data.duplicada).toBe(false);
    expect(typeof body.data.observacion_id).toBe('string');
    observacionId = body.data.observacion_id;

    // sello en la fuente de verdad: payload sin PII, autor como pseudónimo
    const sello: any = await prisma.events_raw.findFirst({
      where: { type: 'patrimonio.observado', payload: { path: ['observacion_id'], equals: observacionId } },
    });
    expect(sello).not.toBeNull();
    expect(sello.payload.activo_id).toBe(activoId);
    expect(sello.payload.fecha_observacion).toBe('2026-10-19');
    expect(sello.payload.checklist).toEqual(bodyObservacion.checklist);
    expect(sello.payload.observador_hash).toMatch(/^[0-9a-f]{32}$/);
    const texto = JSON.stringify(sello.payload);
    expect(texto).not.toContain('@');
    expect(texto).not.toContain('example.test');
  });

  it('POST idéntico → duplicada:true sin nueva fila (idempotencia por hash)', async () => {
    const activoId = await activoAchangoId();
    const email = 'vig009-' + ts + '-obs@example.test';
    const token = await registrarYLoguear(email); // mismo ciudadano → mismo hash
    const antes = await prisma.patrimonio_observaciones.count({ where: { activo_id: activoId } });
    const res = await fetch(base + '/api/patrimonio/' + activoId + '/observaciones', {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
      body: JSON.stringify(bodyObservacion),
    });
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.duplicada).toBe(true);
    expect(body.data.observacion_id).toBe(observacionId);
    const despues = await prisma.patrimonio_observaciones.count({ where: { activo_id: activoId } });
    expect(despues).toBe(antes);
  });

  it('POST sobre activo sin ficha patrimonial → 404 (R1: solo activos VIG-004)', async () => {
    const email = 'vig009-' + ts + '-sinficha@example.test';
    const token = await registrarYLoguear(email);
    const activo = await prisma.activos.create({
      data: {
        tipo: 'local',
        titulo: 'Activo sin ficha para observaciones (test VIG-009)',
        estado: 'aprobado',
        nodo_key: 'iglesia',
        lat: -30.2,
        lng: -69.2,
        created_by_hash: 'test-vig009-sin-ficha',
        hash: 'test-vig009-sin-ficha-' + ts,
      },
    });
    try {
      const res = await fetch(base + '/api/patrimonio/' + activo.id + '/observaciones', {
        method: 'POST',
        headers: { ...jsonHeaders, authorization: 'Bearer ' + token },
        body: JSON.stringify(bodyObservacion),
      });
      expect(res.status).toBe(404);
      const body: any = await res.json();
      expect(body.success).toBe(false);
    } finally {
      await prisma.activos.delete({ where: { id: activo.id } });
    }
  });

  it('GET bandeja pública: fila visible y estado_conservacion_global SIEMPRE null (R15)', async () => {
    const activoId = await activoAchangoId();
    const res = await fetch(base + '/api/patrimonio/' + activoId + '/observaciones');
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.success).toBe(true);
    expect(body.estado_conservacion_global).toBeNull();
    expect(body.estado_conservacion_nota).toContain('informe técnico oficial');
    const fila = body.data.find((o: any) => o.id === observacionId);
    expect(fila, 'la observación del test debe ser visible').toBeDefined();
    expect(fila.activo_id).toBe(activoId);
    expect(fila.checklist).toEqual(bodyObservacion.checklist);
    expect(fila.nota).toBe(bodyObservacion.nota);
    expect(fila.created_by_hash).toMatch(/^[0-9a-f]{32}$/);
    // limpieza de la fila del test para no ensuciar corridas siguientes
    await prisma.patrimonio_observaciones.delete({ where: { id: observacionId } }).catch(() => undefined);
    await prisma.events_raw.deleteMany({
      where: { type: 'patrimonio.observado', payload: { path: ['observacion_id'], equals: observacionId } },
    }).catch(() => undefined);
  });
});
