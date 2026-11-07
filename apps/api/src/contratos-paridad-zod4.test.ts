/**
 * Suite de paridad de contratos — Sprint C6 (#415): migración zod 3 → 4.6.6.
 *
 * La DH registró el estándar al cerrar el PR #296 (2026-11-02): «si en el
 * futuro se migra, debe ser una migración dedicada con suite completa de
 * paridad de contratos». Esta suite acredita en CI que los mensajes
 * canónicos de @delocalsoy/contracts — los que las rutas devuelven en
 * "details" y las suites E2E afirman — son idénticos bajo zod 4.6.6.
 *
 * La única superficie de la API de error que el código usa es ".issues"
 * (zod 4 eliminó ZodError.errors — causa raíz del build+test en rojo del
 * PR #296).
 */
import { describe, expect, it } from 'vitest';
import {
  ActivoAltaSchema,
  FichaRespuestasV1Schema,
  OportunidadActorSchema,
  ReporteAltaSchema,
  ReporteEstadoCambioSchema,
} from '@delocalsoy/contracts';

/** Mensajes de los issues de un resultado fallido (API canónica de zod 4). */
function mensajes(resultado: { success: boolean; error?: { issues: Array<{ message: string }> } }): string[] {
  if (resultado.success || !resultado.error) return [];
  return resultado.error.issues.map((i) => i.message);
}

describe('paridad de contratos bajo zod 4 (Sprint C6, #415)', () => {
  it('invariante de la API de error: los issues se leen por .issues (zod 4 eliminó .errors)', () => {
    const parsed = ReporteAltaSchema.safeParse({});
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(Array.isArray(parsed.error.issues)).toBe(true);
      expect(parsed.error.issues.length).toBeGreaterThan(0);
    }
  });

  it('ReporteAltaSchema: lat fuera de rango con el mensaje canónico (CORE-005 R1, #206)', () => {
    const parsed = ReporteAltaSchema.safeParse({
      nodo_key: 'capital',
      categoria: 'alumbrado_publico',
      descripcion: 'descripción válida de prueba para la paridad',
      lat: 999,
      lng: -68.5,
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(mensajes(parsed).join(' | ')).toContain('lat fuera de rango');
    }
  });

  it('ReporteAltaSchema: payload válido parsea (paridad positiva)', () => {
    const parsed = ReporteAltaSchema.safeParse({
      nodo_key: 'capital',
      categoria: 'alumbrado_publico',
      descripcion: 'descripción válida de prueba para la paridad',
      lat: -31.54,
      lng: -68.52,
    });
    expect(parsed.success).toBe(true);
  });

  it('ReporteEstadoCambioSchema: justificación pública obligatoria (ADR-038, #206)', () => {
    const parsed = ReporteEstadoCambioSchema.safeParse({ estado: 'in_progress', justificacion: 'x' });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(mensajes(parsed).join(' | ')).toContain('ADR-038');
    }
  });

  it('ReporteEstadoCambioSchema: payload válido parsea (paridad positiva)', () => {
    const parsed = ReporteEstadoCambioSchema.safeParse({
      estado: 'in_progress',
      justificacion: 'cuadrilla asignada y en camino (paridad)',
    });
    expect(parsed.success).toBe(true);
  });

  it('OportunidadActorSchema: actor nombrado sin consentimiento (ADR-027, Ley 25.326, #158)', () => {
    const parsed = OportunidadActorSchema.safeParse({
      role: 'proposer',
      name: 'Vecina de Prueba',
      consent_confirmed: false,
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(mensajes(parsed).join(' | ')).toContain('un actor nombrado exige consentimiento confirmado');
    }
  });

  it('OportunidadActorSchema: actor con consentimiento parsea (paridad positiva)', () => {
    const parsed = OportunidadActorSchema.safeParse({
      role: 'proposer',
      name: 'Vecina de Prueba',
      consent_confirmed: true,
    });
    expect(parsed.success).toBe(true);
  });

  it('FichaRespuestasV1Schema: al menos un uso del espacio (NODO-CAU R4, #149)', () => {
    const parsed = FichaRespuestasV1Schema.shape.usos_vitalidad.safeParse({
      usos_detectados: [],
      nivel_actividad: 'baja',
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(mensajes(parsed).join(' | ')).toContain('Debe detectarse al menos un uso del espacio');
    }
  });

  it('ActivoAltaSchema: exactamente una clasificación primaria (CORE-004/VIG-002)', () => {
    const clasificacion = (is_primary: boolean) => ({
      n1: 'civico_social',
      n2: 'plaza_principal',
      is_primary,
      source: 'fixture de paridad C6',
    });
    const parsed = ActivoAltaSchema.safeParse({
      tipo: 'inmueble',
      titulo: 'Título válido de paridad',
      nodo_key: 'caucete',
      lat: -31.65,
      lng: -68.28,
      clasificaciones: [clasificacion(true), clasificacion(true)],
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(mensajes(parsed).join(' | ')).toContain('las clasificaciones exigen exactamente una primaria');
    }
  });

  it('ActivoAltaSchema: payload válido parsea (paridad positiva)', () => {
    const parsed = ActivoAltaSchema.safeParse({
      tipo: 'inmueble',
      titulo: 'Título válido de paridad',
      nodo_key: 'caucete',
      lat: -31.65,
      lng: -68.28,
    });
    expect(parsed.success).toBe(true);
  });
});
