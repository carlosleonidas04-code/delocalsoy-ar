/**
 * DELocalSoy.AR — Puertas del server live-ws (#123, gates #236 · lote M29 de
 * [agent: google]) — FE-DEUDA-03 #294.
 *
 * Decisiones puras extraídas 1:1 del upgrade handler que vivía embebido en
 * vite.config.ts (refactor puro: mismas reglas, mismo orden, mismos códigos de
 * estado). La suite liveWsGate.test.ts las ejercita; liveWsServer.ts las
 * aplica en el mismo orden original:
 *   1) Origin allowlist (403) · 2) Auth fail-closed (401 / 503 sin token
 *   configurado, R15) · 3) conexiones concurrentes por IP (429) · 4) frames por
 *   minuto por IP (cierre 1008; 64 KB/frame via maxPayload de ws).
 */
export const LIVE_WS_RUTA = '/api/ia-etica/live-ws';

export interface ConfigLiveWs {
  token: string | undefined;
  allowedOrigins: string[];
  maxClientsPerIp: number;
  maxFramesPerMin: number;
  maxFrameBytes: number;
}

/** Config 1:1 de las variables LIVE_WS_* (defaults: 10 clientes/IP, 45 frames/min, 64 KB/frame). */
export function configLiveWsDesdeEnv(
  env: Record<string, string | undefined> = process.env,
): ConfigLiveWs {
  return {
    token: env.LIVE_WS_TOKEN,
    allowedOrigins: (env.LIVE_WS_ALLOWED_ORIGINS || 'http://localhost:3000')
      .split(',')
      .map((origin: string) => origin.trim())
      .filter((origin: string) => origin.length > 0),
    maxClientsPerIp: Number(env.LIVE_WS_MAX_CLIENTS_PER_IP || 10),
    maxFramesPerMin: Number(env.LIVE_WS_MAX_FRAMES_PER_MIN || 45),
    maxFrameBytes: Number(env.LIVE_WS_MAX_FRAME_BYTES || 64 * 1024),
  };
}

/** Solo la ruta /api/ia-etica/live-ws (prefijo) se gestiona; otras rutas no (comportamiento previo). */
export function esRutaLiveWs(reqUrl: string): boolean {
  return reqUrl.startsWith(LIVE_WS_RUTA);
}

/** M29: Bearer del header Authorization tiene prioridad; sin él cae al ?token= de la query. */
export function extraerTokenPresentado(
  authHeader: string,
  tokenFromQuery: string | null,
): string | undefined {
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return tokenFromQuery ?? undefined;
}

export type VeredictoLiveWs = { ok: true } | { ok: false; status: number; reason: string };

/** Puerta 1 — Origin allowlist (M29). */
export function validarOrigin(
  originHeader: string | undefined,
  allowedOrigins: string[],
): VeredictoLiveWs {
  if (!originHeader || !allowedOrigins.includes(originHeader)) {
    return { ok: false, status: 403, reason: 'origin no autorizado' };
  }
  return { ok: true };
}

/** Puerta 2 — Auth fail-closed (M29): Bearer o ?token=; sin LIVE_WS_TOKEN la superficie queda cerrada (R15). */
export function validarTokenLiveWs(
  tokenConfigurado: string | undefined,
  presentedToken: string | undefined,
): VeredictoLiveWs {
  if (!tokenConfigurado || !presentedToken || presentedToken !== tokenConfigurado) {
    return {
      ok: false,
      status: tokenConfigurado ? 401 : 503,
      reason: tokenConfigurado
        ? 'token de sesion ausente o invalido'
        : 'live-ws deshabilitado: LIVE_WS_TOKEN no configurado (fail-closed, R15)',
    };
  }
  return { ok: true };
}

/** Puerta 3 — Rate limit de conexiones concurrentes por IP. */
export function validarClientesPorIp(
  conexionesActuales: number,
  maxClientsPerIp: number,
): VeredictoLiveWs {
  if (conexionesActuales >= maxClientsPerIp) {
    return { ok: false, status: 429, reason: 'limite de conexiones concurrentes por ip' };
  }
  return { ok: true };
}

/** Puerta 4 — Rate limit de frames por IP en ventana de 60 s (M29: 45 frames/min). */
export function evaluarFrame(
  times: number[],
  ahoraMs: number,
  maxFramesPerMin: number,
): { permitido: boolean; ventana: number[] } {
  const ventana = times.filter((t) => ahoraMs - t < 60_000);
  return { permitido: ventana.length < maxFramesPerMin, ventana };
}
