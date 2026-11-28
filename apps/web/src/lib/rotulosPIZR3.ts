/**
 * DELocalSoy.AR — Rótulos humanos PIZ-R3 (#546, EV-117): FUENTE ÚNICA.
 * Consumidores: vista asistente del A1 y destino Preguntar (REF-R9 #642).
 *
 * Los valores (n1, dominio) y el confidence viven tal como los emite la
 * API — la UI no los reescribe (R15), los PRESENTA con su significado y
 * conserva el valor crudo entre paréntesis para trazabilidad.
 */
import type { PreguntaAsk } from './artefactoA1';

export type ValorN1 = NonNullable<PreguntaAsk['n1']>;

export const ETIQUETA_N1: Record<ValorN1, string> = {
  productivo_rural: 'capital productivo rural',
  turistico: 'capital turística',
  patrimonial: 'capital patrimonial',
  civico_social: 'capital cívico social/ambiental',
};

export const ETIQUETA_DOMINIO: Record<string, string> = {
  productivo_rural: 'productivo rural',
  turistico: 'turístico',
  patrimonial: 'patrimonial',
  territorial: 'estructura territorial y KPIs del nodo',
};

export function etiquetaN1(valor: string): string {
  if (valor === '') return 'sin filtro';
  return ETIQUETA_N1[valor as ValorN1] ?? valor;
}
