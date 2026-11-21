import { describe, expect, it } from 'vitest';
import { FichaRespuestasV1Schema, FichaVersionSchema } from '@delocalsoy/contracts';

// PIZ-R4 (#547, épica #543): contrato fichas v1.1 — diente del contrato.
// Decisión DH ratificada (#547#issuecomment-6993007143, 2026-11-18): la
// versión v1.1 agrega no_sabe a las escalas de las dimensiones 2 a 7.
// Conservador: ningún valor v1 cambia de significado y no_sabe es un
// estado declarado («No lo sé»), nunca un null silencioso (R15).
describe('fichas v1.1 — no_sabe declarado (PIZ-R4 #547, decisión DH)', () => {
  it('FichaVersionSchema acepta v1 y v1.1, y nada más', () => {
    expect(FichaVersionSchema.safeParse('v1').success).toBe(true);
    expect(FichaVersionSchema.safeParse('v1.1').success).toBe(true);
    expect(FichaVersionSchema.safeParse('v2').success).toBe(false);
  });

  it('las escalas de las dimensiones 2 a 7 aceptan no_sabe sin perder v1', () => {
    const escalas: Array<[any, string[]]> = [
      [FichaRespuestasV1Schema.shape.accesibilidad, ['rampa_acceso', 'estado_vereda']],
      [FichaRespuestasV1Schema.shape.sombra_arbolado, ['sombra_horario_central']],
      [FichaRespuestasV1Schema.shape.agua_xerojardin, ['riego', 'especies_apto_clima']],
      [FichaRespuestasV1Schema.shape.seguridad_disenio, ['iluminacion', 'visibilidad', 'mantenimiento']],
      [FichaRespuestasV1Schema.shape.custodia, ['tipo_acuerdo']],
    ];
    for (const [schema, campos] of escalas) {
      for (const campo of campos) {
        expect((schema as any).shape[campo].safeParse('no_sabe').success, campo).toBe(true);
        // v1 preservado: «desconocido» ya era estado v1 de las escalas 2–6;
        // en tipo_acuerdo (d7) la v1 nunca lo tuvo — v1.1 agrega SOLO no_sabe.
        expect((schema as any).shape[campo].safeParse('desconocido').success, campo).toBe(campo !== 'tipo_acuerdo');
      }
    }
  });

  it('un instrumento v1.1 completo con no_sabe en todas las escalas parsea (estado declarado, R15)', () => {
    const parsed = FichaRespuestasV1Schema.safeParse({
      usos_vitalidad: { usos_detectados: ['recreo'], nivel_actividad: 'baja' },
      accesibilidad: { rampa_acceso: 'no_sabe', estado_vereda: 'regular', obstaculos: false },
      sombra_arbolado: { arbolado_presente: false, sombra_horario_central: 'no_sabe' },
      agua_xerojardin: { riego: 'no_sabe', perdidas_visibles: false, especies_apto_clima: 'no_sabe' },
      seguridad_disenio: { iluminacion: 'no_sabe', visibilidad: 'no_sabe', mantenimiento: 'no_sabe', destinos_activos_cercanos: false },
      equipamiento: { bancos: false, juegos_infantiles: false, canchas: false, basureros: false, bebedero: false },
      custodia: { custodia_presente: false, tipo_acuerdo: 'no_sabe' },
    });
    expect(parsed.success).toBe(true);
  });
});