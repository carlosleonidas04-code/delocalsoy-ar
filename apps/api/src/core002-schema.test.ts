import { describe, expect, it } from 'vitest';

// EV-020 / CORE-002 T2 (#64): la migración versionada del vocabulario del
// demo se aplica sobre DB nueva (el job test corre db:deploy antes de la
// suite). Sin base → skip honesto (patrón events-idempotencia).
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';

const { prisma } = await import('@delocalsoy/db');

const dbUp = await prisma
  .$queryRaw`SELECT 1`
  .then(() => true)
  .catch(() => false);

describe.skipIf(!dbUp)('Migración CORE-002 — vocabulario del demo (#64)', () => {
  it('las 5 tablas del vocabulario existen tras db:deploy', async () => {
    const tablas = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('nodos', 'capas', 'categorias', 'features', 'reportes')
    `;
    expect(tablas.map((t) => t.table_name).sort())
      .toEqual(['capas', 'categorias', 'features', 'nodos', 'reportes']);
  });

  it('triggers geom e índices GiST presentes', async () => {
    const triggers = await prisma.$queryRaw<Array<{ trigger_name: string }>>`
      SELECT trigger_name FROM information_schema.triggers
      WHERE trigger_schema = 'public' AND event_object_table IN ('reportes', 'features')
    `;
    const nombres = triggers.map((t) => t.trigger_name);
    expect(nombres).toContain('trg_reportes_geom');
    expect(nombres).toContain('trg_features_geom');

    const indices = await prisma.$queryRaw<Array<{ indexname: string }>>`
      SELECT indexname FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname IN ('reportes_geom_idx', 'features_geom_idx')
    `;
    expect(indices.map((i) => i.indexname).sort())
      .toEqual(['features_geom_idx', 'reportes_geom_idx']);
  });

  it('el trigger sincroniza geom desde lat/lng (insert de humo, limpieza en cascada)', async () => {
    const nodo = await prisma.nodos.create({
      data: {
        key: 'test-t2-humo-' + Date.now(),
        nombre: 'Nodo de humo T2',
        subtitle: 'test',
        foco: 'test',
        centro_lat: -31.5,
        centro_lng: -68.5,
        poblacion: 1,
      },
    });

    const reporte = await prisma.reportes.create({
      data: {
        nodo_id: nodo.id,
        categoria: 'test_t2',
        lat: -31.5375,
        lng: -68.5365,
        hash: 't2-humo-' + nodo.id,
      },
    });

    const geom = await prisma.$queryRaw<Array<{ g: string }>>`
      SELECT ST_AsText(geom) AS g FROM reportes WHERE id = ${reporte.id}
    `;
    expect(geom[0].g).toBe('POINT(-68.5365 -31.5375)');

    // cleanup: la cascada limpia reportes/features/capas/categorias
    await prisma.nodos.delete({ where: { id: nodo.id } });
    const restante = await prisma.reportes.count({ where: { hash: 't2-humo-' + nodo.id } });
    expect(restante).toBe(0);
  });
});
