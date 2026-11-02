/**
 * DELocalSoy.AR — Suite de las puertas del server live-ws (FE-DEUDA-03 #294).
 *
 * Ejercita las 4 puertas extraídas del upgrade handler que vivía embebido en
 * vite.config.ts (refactor puro: mismas reglas, mismo orden, mismos códigos
 * de estado del gate R12 #236 / lote M29):
 *   1) Origin allowlist (403) · 2) Auth fail-closed (401 / 503 sin
 *   LIVE_WS_TOKEN configurado, R15) · 3) conexiones concurrentes por IP (429) ·
 *   4) frames por minuto por IP en ventana de 60 s.
 */
import { describe, expect, it } from 'vitest';
import {
  LIVE_WS_RUTA,
  configLiveWsDesdeEnv,
  esRutaLiveWs,
  evaluarFrame,
  extraerTokenPresentado,
  validarClientesPorIp,
  validarOrigin,
  validarTokenLiveWs,
} from './liveWsGate';

describe('configLiveWsDesdeEnv', () => {
  it('usa los defaults del gate M29 cuando el env no declara nada', () => {
    const config = configLiveWsDesdeEnv({});
    expect(config.token).toBeUndefined();
    expect(config.allowedOrigins).toEqual(['http://localhost:3000']);
    expect(config.maxClientsPerIp).toBe(10);
    expect(config.maxFramesPerMin).toBe(45);
    expect(config.maxFrameBytes).toBe(64 * 1024);
  });

  it('parsea orígenes custom separados por coma con trim y sin vacíos', () => {
    const config = configLiveWsDesdeEnv({
      LIVE_WS_TOKEN: 'secreto',
      LIVE_WS_ALLOWED_ORIGINS: ' https://a.example , ,http://b.example, ',
    });
    expect(config.token).toBe('secreto');
    expect(config.allowedOrigins).toEqual(['https://a.example', 'http://b.example']);
  });
});

describe('esRutaLiveWs', () => {
  it('solo gestiona el prefijo /api/ia-etica/live-ws (comportamiento previo)', () => {
    expect(esRutaLiveWs(LIVE_WS_RUTA)).toBe(true);
    expect(esRutaLiveWs('/api/ia-etica/live-ws?token=abc')).toBe(true);
    expect(esRutaLiveWs('/api/ia-etica/live-ws/sub')).toBe(true);
    expect(esRutaLiveWs('/api/ia-etica/otro')).toBe(false);
    expect(esRutaLiveWs('')).toBe(false);
  });
});

describe('validarOrigin (puerta 1, M29)', () => {
  const allowed = ['http://localhost:3000'];

  it('sin header Origin rechaza 403', () => {
    const v = validarOrigin(undefined, allowed);
    expect(v).toEqual({ ok: false, status: 403, reason: 'origin no autorizado' });
  });

  it('origin fuera de la allowlist rechaza 403', () => {
    const v = validarOrigin('https://malicioso.example', allowed);
    expect(v).toEqual({ ok: false, status: 403, reason: 'origin no autorizado' });
  });

  it('origin en la allowlist pasa', () => {
    expect(validarOrigin('http://localhost:3000', allowed)).toEqual({ ok: true });
  });
});

describe('validarTokenLiveWs (puerta 2, fail-closed M29/R15)', () => {
  it('sin LIVE_WS_TOKEN configurado la superficie queda cerrada: 503', () => {
    const v = validarTokenLiveWs(undefined, 'cualquiera');
    expect(v.ok).toBe(false);
    if (!v.ok) {
      expect(v.status).toBe(503);
      expect(v.reason).toContain('fail-closed');
    }
  });

  it('token configurado pero ausente en el request rechaza 401', () => {
    const v = validarTokenLiveWs('secreto', undefined);
    expect(v).toEqual({ ok: false, status: 401, reason: 'token de sesion ausente o invalido' });
  });

  it('token presentado distinto del configurado rechaza 401', () => {
    const v = validarTokenLiveWs('secreto', 'otro');
    expect(v).toEqual({ ok: false, status: 401, reason: 'token de sesion ausente o invalido' });
  });

  it('token correcto pasa', () => {
    expect(validarTokenLiveWs('secreto', 'secreto')).toEqual({ ok: true });
  });
});

describe('extraerTokenPresentado', () => {
  it('Bearer del header tiene prioridad sobre ?token=', () => {
    expect(extraerTokenPresentado('Bearer header-token', 'query-token')).toBe('header-token');
  });

  it('sin Bearer cae al ?token= de la query', () => {
    expect(extraerTokenPresentado('Basic xyz', 'query-token')).toBe('query-token');
    expect(extraerTokenPresentado('', 'query-token')).toBe('query-token');
  });

  it('sin ninguno presenta undefined', () => {
    expect(extraerTokenPresentado('', null)).toBeUndefined();
  });
});

describe('validarClientesPorIp (puerta 3, 429)', () => {
  it('al alcanzar el máximo de conexiones concurrentes rechaza 429', () => {
    const v = validarClientesPorIp(10, 10);
    expect(v).toEqual({ ok: false, status: 429, reason: 'limite de conexiones concurrentes por ip' });
  });

  it('por debajo del máximo pasa', () => {
    expect(validarClientesPorIp(9, 10)).toEqual({ ok: true });
  });
});

describe('evaluarFrame (puerta 4, ventana 60 s)', () => {
  const ahora = 1_000_000;

  it('filtra los tiempos fuera de la ventana de 60 s', () => {
    const { permitido, ventana } = evaluarFrame(
      [ahora - 120_000, ahora - 59_999, ahora - 30_000],
      ahora,
      45,
    );
    expect(permitido).toBe(true);
    expect(ventana).toEqual([ahora - 59_999, ahora - 30_000]);
  });

  it('al alcanzar el límite de frames/min el frame no se permite', () => {
    const times = Array.from({ length: 45 }, (_unused, i) => ahora - i * 100);
    const { permitido } = evaluarFrame(times, ahora, 45);
    expect(permitido).toBe(false);
  });

  it('bajo el límite se permite y la ventana queda lista para el push', () => {
    const { permitido, ventana } = evaluarFrame([ahora - 1000], ahora, 45);
    expect(permitido).toBe(true);
    expect(ventana.length).toBe(1);
    ventana.push(ahora);
    expect(ventana).toEqual([ahora - 1000, ahora]);
  });
});
