/**
 * UX-002 (#223): suite de deteccion de plataforma.
 * Entorno node: casos de UA documentados, sin red ni DOM (R5: contrato puro).
 */
import { describe, expect, it } from 'vitest';
import { detectPlatform } from './detectPlatform';

const UA_ANDROID_TV =
  'Mozilla/5.0 (Linux; Android 11; SHIELD Android TV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const UA_CHROMECAST =
  'Mozilla/5.0 (X11; Linux armv7l) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.225 Safari/537.36 CrKey 1.56.500000';
const UA_AUTOMOTIVE =
  'Mozilla/5.0 (Linux; Android 10; Automotive OS) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36';
const UA_ANDROIDAUTO =
  'Mozilla/5.0 (Linux; Android 13; AndroidAuto) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const UA_ANDROID_MOVIL =
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const UA_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const UA_ESCRITORIO =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

describe('detectPlatform (UX-002)', () => {
  it('TV: Android TV y Chromecast (CrKey)', () => {
    expect(detectPlatform({ userAgent: UA_ANDROID_TV })).toBe('tv');
    expect(detectPlatform({ userAgent: UA_CHROMECAST })).toBe('tv');
  });

  it('Vehiculo: Automotive OS y AndroidAuto (prioridad sobre TV/movil)', () => {
    expect(detectPlatform({ userAgent: UA_AUTOMOTIVE })).toBe('vehicle');
    expect(detectPlatform({ userAgent: UA_ANDROIDAUTO })).toBe('vehicle');
  });

  it('Movil: Android telefonico e iPhone', () => {
    expect(detectPlatform({ userAgent: UA_ANDROID_MOVIL })).toBe('mobile');
    expect(detectPlatform({ userAgent: UA_IPHONE })).toBe('mobile');
  });

  it('Escritorio: UA de escritorio con puntero fino', () => {
    expect(detectPlatform({ userAgent: UA_ESCRITORIO, coarsePointer: false })).toBe('desktop');
  });

  it('Honesto (R15): UA desconocido + puntero grueso -> movil (targets grandes)', () => {
    expect(detectPlatform({ userAgent: '', coarsePointer: true })).toBe('mobile');
  });

  it('Sin evidencia alguna -> escritorio conservador', () => {
    expect(detectPlatform({ userAgent: '' })).toBe('desktop');
  });
});
