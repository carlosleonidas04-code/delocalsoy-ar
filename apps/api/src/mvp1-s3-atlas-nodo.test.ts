import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// MVP-1 «Atlas Territorial» S3 (RFC-021, #532, épica OBJE-CAMPUS #531):
// GET /api/atlas/:nodo extremo a extremo contra servicios reales
// (PostgreSQL/PostGIS):
// - composición de SOLO-LECTURA de superficies ya acreditadas (ADR-084):
//   vocabulario CORE-002, kpis LIC-R1, amenazas LIC-R4, convenios LIC-R9,
//   curricular MVP-1 (ADR-082) — sin nueva escritura territorial
// - estado honesto por bloque: publicado | sin_fuente_ingestada |
//   en_custodia (R15: null ≠ 0, lo vacío se declara, nada se fabrica)
// - nodo fuera del vocabulario canónico → 400
// - anti-ranking (R5/ADR-036): conteos y estados con procedencia, jamás
//   puntajes ni comparaciones entre nodos
// - sin geometrías de dominios sensibles (patrón Iglesia): estados y
//   conteos, jamás trazas
// Requiere Postgres/PostGIS real (job test de CI); sin base el suite se
// salta (honesto, R5).
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';
process.env.JWT_SECRET = 'test-jwt-secret-mvp1-s3-atlas-532';

const { createApp } = await import('./app.js');
const prisma = (await import('./lib/prisma.js')).default;
const { AtlasNodoResponseSchema, EstadoBloqueAtlasSchema } = await import('@delocalsoy/contracts');

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

async function getAtlas(nodo: string) {
  const res = await fetch(base + '/api/atlas/' + nodo);
  const body: any = await res.json().catch(() => ({}));
  return { res, body };
}

// Coherencia estado ↔ detalle (R15): el estado declarado y su detalle
// cuentan la misma verdad — sin valores que se contradigan.
function expectDetalleCoherente(bloque: any) {
  if (bloque.estado === 'publicado') expect(bloque.detalle).toBeTruthy();
  if (bloque.estado === 'sin_fuente_ingestada') expect(bloque.detalle).toContain('R15');
  if (bloque.estado === 'en_custodia') expect(bloque.detalle).toContain('en custodia');
}

describe.skipIf(!dbUp)('Atlas Territorial por nodo (MVP-1 S3 — RFC-021, #532)', () => {
  it('nodo desconocido → 400 (vocabulario canónico: capital | caucete | iglesia)', async () => {
    const res = await fetch(base + '/api/atlas/jachal');
    expect(res.status).toBe(400);
    const body: any = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('vocabulario');
  });

  it('los 3 nodos canónicos → 200 con exactamente los 5 bloques acreditados (ADR-084)', async () => {
    for (const nodo of ['capital', 'caucete', 'iglesia']) {
      const { res, body } = await getAtlas(nodo);
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.count).toBe(5);
      expect(body.data.nodo_key).toBe(nodo);
      expect(body.data.bloques.map((b: any) => b.bloque)).toEqual([
        'vocabulario',
        'kpis',
        'amenazas',
        'convenios',
        'curricular',
      ]);
      for (const b of body.data.bloques) {
        expect(EstadoBloqueAtlasSchema.safeParse(b.estado).success).toBe(true);
        expectDetalleCoherente(b);
      }
      expect(AtlasNodoResponseSchema.parse(body.data).bloques).toHaveLength(5);
    }
  });

  it('vocabulario publicado con los conteos del seed (CORE-002 — superficie acreditada)', async () => {
    const { body } = await getAtlas('iglesia');
    const vocab = body.data.bloques.find((b: any) => b.bloque === 'vocabulario');
    expect(vocab.estado).toBe('publicado');
    expect(vocab.detalle).toContain('CORE-002');
    expect(vocab.detalle).toContain('capas');
  });

  it('amenazas en_custodia: capa sísmica declarada sin ingesta publicada (LIC-R4, R15)', async () => {
    const { body } = await getAtlas('iglesia');
    const amenazas = body.data.bloques.find((b: any) => b.bloque === 'amenazas');
    expect(amenazas.estado).toBe('en_custodia');
    expect(amenazas.detalle).toContain('LIC-R4');
  });

  it('bloques sin fuente nacen honestos: sin datos la superficie se declara, no se fabrica (R15)', async () => {
    const { body } = await getAtlas('iglesia');
    const convenios = body.data.bloques.find((b: any) => b.bloque === 'convenios');
    expect(convenios.estado).toBe('sin_fuente_ingestada');
    expect(convenios.detalle).toContain('LIC-R9');

    const kpis = body.data.bloques.find((b: any) => b.bloque === 'kpis');
    if (kpis.estado === 'publicado') expect(kpis.detalle).toContain('KPIs con snapshot');
    else expect(kpis.detalle).toContain('sin snapshots');

    const curricular = body.data.bloques.find((b: any) => b.bloque === 'curricular');
    if (curricular.estado === 'publicado') expect(curricular.detalle).toContain('matriz curricular');
    else expect(curricular.detalle).toContain('nace vacío');
  });

  it('anti-ranking: cada bloque declara estado y procedencia, jamás puntaje ni comparación (R5/ADR-036)', async () => {
    for (const nodo of ['capital', 'caucete', 'iglesia']) {
      const { body } = await getAtlas(nodo);
      for (const b of body.data.bloques) {
        expect(Object.keys(b).sort()).toEqual(['bloque', 'detalle', 'estado']);
        expect(JSON.stringify(b)).not.toMatch(/puntaje|ranking|score|posicion/i);
      }
    }
  });
});
