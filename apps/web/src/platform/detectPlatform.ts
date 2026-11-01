/**
 * UX-002 (#223): deteccion de plataforma de rendering (Diseno Base UX Multiplataforma).
 *
 * Deteccion HONESTA (R15): se clasifica solo por evidencia disponible del
 * entorno (userAgent + tipo de puntero). Sin evidencia se declara 'desktop'
 * con puntero fino; cualquier duda razonable (puntero grueso) cae a 'mobile'
 * (targets grandes, la opcion segura). El valor activa el perfil
 * data-platform del UX-001 (apps/web/src/design/platform.css).
 *
 * Dominio: [agent: vibe]. Lectura pasiva de entorno, sin red ni PII
 * (ADR-027): el User-Agent describe el dispositivo, no a la persona.
 */

export type PlatformKind = 'tv' | 'vehicle' | 'desktop' | 'mobile';

export interface PlatformEnv {
  /** User-Agent del dispositivo ('' = desconocido). */
  userAgent: string;
  /** matchMedia('(pointer: coarse)').matches cuando este disponible. */
  coarsePointer?: boolean;
}

/* Prioridad: vehiculo (glanceable, Driver Distraction) > TV (10-foot) > movil > escritorio. */
const UA_VEHICLE = /AndroidAuto|Android Automotive|Automotive OS|CarPlay/i;
const UA_TV =
  /GoogleTV|SmartTV|AppleTV|Android TV|\bCrKey\b|\bAFT\w|BRAVIA|Tizen|Web0S|HbbTV|NetCast|Viera|SHIELD/i;
const UA_MOBILE = /Mobi|iPhone|iPad|iPod|Android/i;

export function detectPlatform(env: PlatformEnv): PlatformKind {
  const ua = (env && env.userAgent) || '';
  if (UA_VEHICLE.test(ua)) {
    return 'vehicle';
  }
  if (UA_TV.test(ua)) {
    return 'tv';
  }
  if (UA_MOBILE.test(ua)) {
    return 'mobile';
  }
  if (env && env.coarsePointer === true) {
    return 'mobile';
  }
  return 'desktop';
}

/** Lee el entorno del navegador con guards (en tests/node devuelve vacio). */
export function readPlatformEnv(): PlatformEnv {
  let userAgent = '';
  let coarsePointer: boolean | undefined;
  if (typeof navigator !== 'undefined' && navigator && typeof navigator.userAgent === 'string') {
    userAgent = navigator.userAgent;
  }
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  }
  return { userAgent, coarsePointer };
}

/**
 * Aplica el atributo data-platform al raiz (activa los perfiles de platform.css)
 * y devuelve la plataforma detectada. root opcional para pruebas.
 */
export function applyPlatform(
  root: { setAttribute(name: string, value: string): void } | null,
  env: PlatformEnv = readPlatformEnv(),
): PlatformKind {
  const platform = detectPlatform(env);
  if (root !== null) {
    root.setAttribute('data-platform', platform);
  }
  return platform;
}
