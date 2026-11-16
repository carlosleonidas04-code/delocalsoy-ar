import { describe, expect, it } from 'vitest';
import {
  CursoAltaSchema,
  EstadoBloqueAtlasSchema,
  ObligatoriedadSchema,
  PesoDeclaradoSchema,
  VinculoCursoCompetenciaSchema,
} from '@delocalsoy/contracts';

// MVP-1 S1 (#532, épica OBJE-CAMPUS #531): contratos + schema curricular.
// El dominio NACE VACÍA (R15) — esta suite acredita que las 7 tablas existen
// tras db:deploy y que el catálogo arranca en 0 honesto: declarar la
// estructura NO es simular datos. Sin base → skip honesto (patrón core002).
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';

const { prisma } = await import('@delocalsoy/db');

const dbUp = await prisma
  .$queryRaw`SELECT 1`
  .then(() => true)
  .catch(() => false);

describe('contratos curriculares (MVP-1 S1 — RFC-020/021, #532)', () => {
  it('el peso declarado de la matriz es texto cualitativo, jamás un puntaje (ADR-036)', () => {
    expect(PesoDeclaradoSchema.safeParse('42').success).toBe(false);
    expect(PesoDeclaradoSchema.safeParse('7.5').success).toBe(false);
    expect(PesoDeclaradoSchema.safeParse('aporte central al perfil territorial').success).toBe(true);
  });

  it('la obligatoriedad del paso solo admite los 3 valores declarados en el corpus', () => {
    expect(ObligatoriedadSchema.safeParse('obligatorio').success).toBe(true);
    expect(ObligatoriedadSchema.safeParse('recomendado').success).toBe(true);
    expect(ObligatoriedadSchema.safeParse('electivo').success).toBe(true);
    expect(ObligatoriedadSchema.safeParse('muy_importante').success).toBe(false);
  });

  it('el alta de curso exige fuente + ingesta: sin procedencia no hay fila (R9/R15)', () => {
    const soloKey = CursoAltaSchema.safeParse({ key: 'curso_x' });
    expect(soloKey.success).toBe(false);

    const completo = CursoAltaSchema.safeParse({
      key: 'curso_atlas_territorial',
      titulo: 'Atlas Territorial',
      track_key: 'nucleo_territorial',
      fuente: { fuente_key: 'corpus_dului_it', fecha_corte: '2026-11-15' },
      ingesta_id: 'ingesta_corpus_0001',
    });
    expect(completo.success).toBe(true);
  });

  it('el vínculo de la matriz exige ambas claves + peso declarado (ADR-083)', () => {
    expect(VinculoCursoCompetenciaSchema.safeParse({ course_key: 'curso_x' }).success).toBe(false);
    expect(
      VinculoCursoCompetenciaSchema.safeParse({
        course_key: 'curso_x',
        competency_key: 'comp_lectura_cartografica',
        peso_declarado: 'desarrollo central',
      }).success,
    ).toBe(true);
  });

  it('los bloques del Atlas solo declaran estados honestos (null ≠ 0, R15)', () => {
    expect(EstadoBloqueAtlasSchema.safeParse('publicado').success).toBe(true);
    expect(EstadoBloqueAtlasSchema.safeParse('sin_fuente_ingestada').success).toBe(true);
    expect(EstadoBloqueAtlasSchema.safeParse('en_custodia').success).toBe(true);
    expect(EstadoBloqueAtlasSchema.safeParse('estimado').success).toBe(false);
  });
});

describe.skipIf(!dbUp)('MVP-1 S1 — schema curricular nace vacío (#532)', () => {
  it('las 7 tablas del dominio curricular existen tras db:deploy', async () => {
    const tablas = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('courses', 'competencies', 'course_competencies', 'tracks', 'perfiles', 'learning_paths', 'learning_path_steps')
    `;
    const nombres = tablas.map((t: { table_name: string }) => t.table_name).sort();
    expect(nombres).toEqual([
      'competencies',
      'course_competencies',
      'courses',
      'learning_path_steps',
      'learning_paths',
      'perfiles',
      'tracks',
    ]);
  });

  it('la procedencia cuelga de ingestas: el dato no viaja suelto (NC-EV-09)', async () => {
    const fks = await prisma.$queryRaw<Array<{ conname: string }>>`
      SELECT conname FROM pg_constraint
      WHERE contype = 'f' AND conrelid = 'courses'::regclass
    `;
    const nombres = fks.map((f: { conname: string }) => f.conname);
    expect(nombres).toContain('courses_ingesta_id_fkey');
  });
});
