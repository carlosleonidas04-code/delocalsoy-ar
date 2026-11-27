import { describe, expect, it } from 'vitest';
import {
  EstadoPortafolioSchema,
  EvidenciaPortafolioAltaSchema,
  PortafolioAltaSchema,
  VisibilidadPortafolioSchema,
} from '@delocalsoy/contracts';

// OBJE-CAMPUS RFC-002 (#573, épica #531): dominio de portafolios — slice de
// MODELO (sin rutas): contratos + schema + migración prefijada. Nace VACÍA
// (R15): declarar la estructura NO es simular datos. Sin base → skip
// honesto (patrón core002).
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';

const { prisma } = await import('@delocalsoy/db');

const dbUp = await prisma
  .$queryRaw`SELECT 1`
  .then(() => true)
  .catch(() => false);

describe('contratos de portafolios (RFC-002, #573)', () => {
  it('los estados del portafolio son honestos y cerrados (R15)', () => {
    expect(EstadoPortafolioSchema.safeParse('declarado').success).toBe(true);
    expect(EstadoPortafolioSchema.safeParse('en_construccion').success).toBe(true);
    expect(EstadoPortafolioSchema.safeParse('publicado').success).toBe(true);
    expect(EstadoPortafolioSchema.safeParse('archivado').success).toBe(true);
    expect(EstadoPortafolioSchema.safeParse('certificado').success).toBe(false);
  });

  it('la visibilidad nace cerrada: el k-anonimato se compuerta en la lectura futura (ADR-069)', () => {
    expect(VisibilidadPortafolioSchema.safeParse('privado').success).toBe(true);
    expect(VisibilidadPortafolioSchema.safeParse('nodo').success).toBe(true);
    expect(VisibilidadPortafolioSchema.safeParse('publico').success).toBe(true);
    expect(VisibilidadPortafolioSchema.safeParse('mundial').success).toBe(false);
    expect(PortafolioAltaSchema.safeParse({ slug: 'portafolio_dh', titulo: 'Portafolio territorial' }).success).toBe(true);
  });

  it('el alta exige slug + titulo: sin mínimos no hay portafolio', () => {
    expect(PortafolioAltaSchema.safeParse({ slug: 'portafolio_x' }).success).toBe(false);
    expect(PortafolioAltaSchema.safeParse({ titulo: 'Portafolio territorial' }).success).toBe(false);
  });

  it('la evidencia exige portafolio + tipo + ref + titulo (referencia, jamás copia — #149)', () => {
    expect(
      EvidenciaPortafolioAltaSchema.safeParse({ portafolio_id: 'pf_00000001', tipo: 'activo', titulo: 'Evidencia' }).success,
    ).toBe(false);
    expect(
      EvidenciaPortafolioAltaSchema.safeParse({
        portafolio_id: 'pf_00000001',
        tipo: 'practica_territorial',
        ref_tipo: 'activo',
        ref_key: 'act_iglesia_001',
        titulo: 'Ficha de valoración — taller Tudcum',
      }).success,
    ).toBe(true);
  });
});

describe.skipIf(!dbUp)('RFC-002 — schema de portafolios nace vacío (#573)', () => {
  it('las 2 tablas del dominio existen tras db:deploy', async () => {
    const tablas = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('portafolios', 'portafolio_evidencias')
    `;
    const nombres = tablas.map((t: { table_name: string }) => t.table_name).sort();
    expect(nombres).toEqual(['portafolio_evidencias', 'portafolios']);
  });

  it('el portafolio cuelga de la cuenta: FK a usuarios (sin PII en columnas — Ley 25.326)', async () => {
    const fks = await prisma.$queryRaw<Array<{ conname: string }>>`
      SELECT conname FROM pg_constraint
      WHERE contype = 'f' AND conrelid = 'portafolios'::regclass
    `;
    const nombres = fks.map((f: { conname: string }) => f.conname);
    expect(nombres).toContain('portafolios_usuario_id_fkey');
  });
});
