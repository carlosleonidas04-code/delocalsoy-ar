import { createHash } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { redisCommand } from '@delocalsoy/redis';

/**
 * Rate limiting de identidad — CORE-004 R5a (AUD-05, #101).
 *
 * POST /api/auth/{register,login} limitan intentos por IP + hash del email:
 * acota el credential stuffing por cuenta sin dejar que un atacante remoto
 * bloquee la cuenta de la víctima (para eso necesitaría además su IP).
 *
 * Cero dependencias nuevas (mismo criterio R3b/R4): contadores INCR + EXPIRE
 * sobre el cliente RESP de @delocalsoy/redis. Si Redis no responde, el límite
 * cae a contadores en memoria del proceso (fail-open documentado): la
 * disponibilidad del login no puede depender del transporte — igual que la
 * verdad (events_raw) nunca dependió de él (ADR-032).
 *
 * El email NUNCA va crudo a Redis (Ley 25.326): solo su sha256 truncado.
 */

function enteroEnv(nombre: string, defecto: number): number {
  const raw = Number(process.env[nombre]);
  return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : defecto;
}

// Defaults: 5 intentos por ventana de 300 s (login y register, por clave).
const MAX_INTENTOS = enteroEnv('RATE_LIMIT_MAX', 5);
const VENTANA_SEG = enteroEnv('RATE_LIMIT_WINDOW_SEG', 300);

type Veredicto = { permitido: boolean; reintentoSeg: number };

// Fallback en memoria (fail-open): una ventana deslizante por clave.
const memoria = new Map<string, { intentos: number; reiniciaEnMs: number }>();

// Exportado para verificación directa del fallback en pruebas (R5a).
export async function consumirIntentos(clave: string): Promise<Veredicto> {
  const bucket = 'rl:auth:' + clave;
  try {
    const n = await redisCommand(['INCR', bucket]);
    if (typeof n === 'number' && n === 1) {
      await redisCommand(['EXPIRE', bucket, String(VENTANA_SEG)]);
    }
    if (typeof n === 'number' && n > MAX_INTENTOS) {
      const ttl = await redisCommand(['TTL', bucket]);
      const reintentoSeg = typeof ttl === 'number' && ttl > 0 ? ttl : VENTANA_SEG;
      return { permitido: false, reintentoSeg };
    }
    return { permitido: true, reintentoSeg: 0 };
  } catch {
    const ahora = Date.now();
    const entrada = memoria.get(clave);
    if (!entrada || entrada.reiniciaEnMs <= ahora) {
      memoria.set(clave, { intentos: 1, reiniciaEnMs: ahora + VENTANA_SEG * 1000 });
      return { permitido: true, reintentoSeg: 0 };
    }
    entrada.intentos += 1;
    if (entrada.intentos > MAX_INTENTOS) {
      return { permitido: false, reintentoSeg: Math.ceil((entrada.reiniciaEnMs - ahora) / 1000) };
    }
    return { permitido: true, reintentoSeg: 0 };
  }
}

// Middleware de las rutas de identidad (register/login — #101).
export async function rateLimitAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const ip = req.ip ?? 'sin-ip';
  const email =
    typeof (req.body as { email?: unknown } | undefined)?.email === 'string'
      ? (req.body as { email: string }).email.trim().toLowerCase()
      : '';
  const huella = email
    ? createHash('sha256').update(email).digest('hex').slice(0, 32)
    : 'sin-email';
  const veredicto = await consumirIntentos(ip + ':' + huella);
  if (!veredicto.permitido) {
    res
      .status(429)
      .set('Retry-After', String(veredicto.reintentoSeg))
      .json({
        success: false,
        error: 'demasiados intentos: reintentá en ' + veredicto.reintentoSeg + 's',
      });
    return;
  }
  next();
}
