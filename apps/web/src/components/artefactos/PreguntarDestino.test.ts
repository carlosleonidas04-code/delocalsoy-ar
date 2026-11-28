// REF-R9 (#642, épica REF #633): test de PreguntarDestino — filtro por
// tema con las 4 opciones reales de AskPreguntaSchema (PIZ-R3/EV-117),
// rótulos humanos con valor crudo preservado (R15) y honestidad de la
// respuesta (recovered 0 = sin dato, null ≠ 0; anti-ranking R5/ADR-036).

import { describe, expect, it } from 'vitest';
import { dominioHumano, ETIQUETA_N1, etiquetaN1, textoCobertura, textoSinFragmentos } from './PreguntarDestino';

describe('PreguntarDestino — filtro por tema (AskPreguntaSchema, PIZ-R3/EV-117)', () => {
  it('las 4 opciones reales de n1 con etiquetas humanas (jamás inventadas)', () => {
    expect(Object.keys(ETIQUETA_N1).sort()).toEqual(['civico_social', 'patrimonial', 'productivo_rural', 'turistico']);
    expect(ETIQUETA_N1.turistico).toBe('capital turística');
  });

  it('sin filtro se declara como tal', () => {
    expect(etiquetaN1('')).toBe('sin filtro');
  });

  it('dominio humanizado conserva el valor crudo entre paréntesis (R15)', () => {
    expect(dominioHumano('territorial')).toBe('estructura territorial y KPIs del nodo (dominio crudo: territorial)');
    expect(dominioHumano(null)).toBeNull();
  });
});

describe('PreguntarDestino — honestidad de la respuesta (R15/R5)', () => {
  it('recovered 0 se declara sin dato (null ≠ 0, jamás un cero con cobertura)', () => {
    expect(textoSinFragmentos()).toContain('sin dato');
  });

  it('cobertura de fuentes: conteo con cobertura y confidence crudo preservado', () => {
    const s = textoCobertura(2, 3, 0.67, 'pending');
    expect(s).toContain('2 de 3');
    expect(s).toContain('0.67');
    expect(s).toContain('pending');
  });

  it('anti-ranking: ningún texto puntúa ni compara (R5/ADR-036)', () => {
    for (const s of [textoSinFragmentos(), textoCobertura(0, 0, 0, 'pending'), dominioHumano('turistico') ?? '']) {
      expect(s).not.toMatch(/puntaje|ranking|score|posicion|mejor|peor/i);
    }
  });
});
