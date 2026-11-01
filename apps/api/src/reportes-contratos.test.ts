import { describe, expect, it } from 'vitest';
import {
  REPORTE_TRANSICIONES,
  ReporteAltaSchema,
  ReporteEstadoCambioSchema,
  ReporteEstadoPublicoFiltroSchema,
  ReporteEstadoSchema,
  ReporteHistorialSchema,
} from '@delocalsoy/contracts';

// EV-051 / CORE-005 R1 (#206): los contratos del dominio `reportes` viven en
// @delocalsoy/contracts (fuente única — riesgo #52) y esta suite los
// acredita desde apps/api, el consumidor real. Suite de contratos PUROS:
// sin base ni Redis — corre en cualquier entorno del job `test`.

describe('EV-051 CORE-005 R1 — contratos reportes (#206)', () => {
  describe('ReporteAltaSchema — alta ciudadana', () => {
    const altaValida = {
      nodo_key: 'caucete',
      categoria: 'insufficient_lighting',
      descripcion: 'Falta iluminación en la esquina de la plaza; de noche queda muy oscuro.',
      lat: -31.0484,
      lng: -68.5556,
    };

    it('acepta un alta ciudadana completa', () => {
      expect(ReporteAltaSchema.safeParse(altaValida).success).toBe(true);
    });

    it('rechaza nodo_key fuera del vocabulario federado', () => {
      expect(ReporteAltaSchema.safeParse({ ...altaValida, nodo_key: 'mendoza' }).success).toBe(false);
    });

    it('rechaza categoria que no es slug del vocabulario', () => {
      expect(ReporteAltaSchema.safeParse({ ...altaValida, categoria: 'Falta de Luz!' }).success).toBe(false);
    });

    it('la descripción es obligatoria con mínimo de 10 caracteres', () => {
      expect(ReporteAltaSchema.safeParse({ ...altaValida, descripcion: 'corta' }).success).toBe(false);
      const sinDescripcion: Record<string, unknown> = { ...altaValida };
      delete sinDescripcion.descripcion;
      expect(ReporteAltaSchema.safeParse(sinDescripcion).success).toBe(false);
    });

    it('exige lat/lng con rangos SRID=4326 (un reporte sin punto no es cartografiable)', () => {
      expect(ReporteAltaSchema.safeParse({ ...altaValida, lat: 91 }).success).toBe(false);
      expect(ReporteAltaSchema.safeParse({ ...altaValida, lng: -181 }).success).toBe(false);
      const sinPunto: Record<string, unknown> = { ...altaValida };
      delete sinPunto.lat;
      expect(ReporteAltaSchema.safeParse(sinPunto).success).toBe(false);
    });
  });

  describe('ReporteEstadoSchema + matriz de transiciones (ADR-038)', () => {
    it('admite exactamente los 5 estados del ciclo', () => {
      for (const estado of ['received', 'evaluating', 'in_progress', 'resolved', 'descartado']) {
        expect(ReporteEstadoSchema.safeParse(estado).success).toBe(true);
      }
      expect(ReporteEstadoSchema.safeParse('cerrado').success).toBe(false);
    });

    it('la matriz declara el ciclo received → evaluating → in_progress → resolved', () => {
      expect(REPORTE_TRANSICIONES.received).toEqual(['evaluating', 'descartado']);
      expect(REPORTE_TRANSICIONES.evaluating).toEqual(['in_progress', 'descartado']);
      expect(REPORTE_TRANSICIONES.in_progress).toEqual(['resolved', 'descartado']);
    });

    it('resolved y descartado son terminales (sin reapertura en v1)', () => {
      expect(REPORTE_TRANSICIONES.resolved).toEqual([]);
      expect(REPORTE_TRANSICIONES.descartado).toEqual([]);
    });

    it('toda transición declarada es ida: ningún destino vuelve al origen', () => {
      const estados = Object.keys(REPORTE_TRANSICIONES) as Array<keyof typeof REPORTE_TRANSICIONES>;
      for (const origen of estados) {
        for (const destino of REPORTE_TRANSICIONES[origen]) {
          expect(REPORTE_TRANSICIONES[destino]).not.toContain(origen);
        }
      }
    });

    it('el filtro público excluye descartado (nunca publicable)', () => {
      expect(ReporteEstadoPublicoFiltroSchema.safeParse('descartado').success).toBe(false);
      expect(ReporteEstadoPublicoFiltroSchema.safeParse('resolved').success).toBe(true);
    });
  });

  describe('ReporteEstadoCambioSchema — ADR-038: justificación obligatoria', () => {
    it('acepta una transición con justificación pública', () => {
      expect(
        ReporteEstadoCambioSchema.safeParse({
          estado: 'evaluating',
          justificacion: 'El reporte coincide con dos vecinos más; se abre evaluación.',
        }).success
      ).toBe(true);
    });

    it('rechaza la transición sin justificación', () => {
      const sinJustificacion: Record<string, unknown> = { estado: 'evaluating' };
      expect(ReporteEstadoCambioSchema.safeParse(sinJustificacion).success).toBe(false);
    });

    it('rechaza la justificación vacía o menor al mínimo', () => {
      expect(ReporteEstadoCambioSchema.safeParse({ estado: 'evaluating', justificacion: '' }).success).toBe(false);
      expect(ReporteEstadoCambioSchema.safeParse({ estado: 'evaluating', justificacion: 'ok' }).success).toBe(false);
    });

    it('rechaza un estado fuera del ciclo', () => {
      expect(
        ReporteEstadoCambioSchema.safeParse({ estado: 'cerrado', justificacion: 'cierre fuera del ciclo v1' }).success
      ).toBe(false);
    });
  });

  describe('ReporteHistorialSchema — historial derivado de events_raw (R4)', () => {
    const entrada = {
      estado_anterior: 'received',
      estado_nuevo: 'evaluating',
      justificacion: 'Se corroboró con el relevamiento de la cuadra.',
      moderador_hash: 'a1b2c3d4e5f6',
      occurred_at: '2026-10-15T12:00:00.000Z',
    };

    it('valida una entrada del historial con pseudónimo del moderador', () => {
      expect(ReporteHistorialSchema.safeParse({ reporte_id: 'clr1test', transiciones: [entrada] }).success).toBe(true);
    });

    it('rechaza un timestamp que no es ISO datetime', () => {
      expect(
        ReporteHistorialSchema.safeParse({
          reporte_id: 'clr1test',
          transiciones: [{ ...entrada, occurred_at: 'ayer a la tarde' }],
        }).success
      ).toBe(false);
    });

    it('rechaza una entrada con estado fuera del ciclo', () => {
      expect(
        ReporteHistorialSchema.safeParse({
          reporte_id: 'clr1test',
          transiciones: [{ ...entrada, estado_nuevo: 'cerrado' }],
        }).success
      ).toBe(false);
    });
  });
});
