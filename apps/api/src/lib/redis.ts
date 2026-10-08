import { createConnection } from 'node:net';

/**
 * Transporte Redis Streams — CORE-004 R4a (ADR-032, #87).
 *
 * events_raw es la única fuente de verdad: el stream events:raw es SOLO
 * transporte (referencias event_id/type/hash/occurred_at, sin payload ni
 * PII — Ley 25.326). El worker de R4b consume desde el stream; la API
 * nunca lee estado desde Redis.
 *
 * Fail-open por diseño (ADR-032): si Redis no responde, la API sigue
 * sirviendo — la pérdida se acota a la latencia de proyección, nunca a la
 * verdad. (Distinto del fail-closed de la identidad: aquí el recurso ya
 * quedó asegurado en events_raw antes de publicar.)
 *
 * Cero dependencias nuevas (mismo criterio que R3b): cliente RESP mínimo
 * sobre node:net — una conexión por comando, sin pool ni estado compartido.
 */

const REDIS_TIMEOUT_MS = 1500;

export type RedisReply = string | number | null | RedisReply[];

function redisTarget(): { host: string; port: number } {
  const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
  try {
    const parsed = new URL(url);
    return { host: parsed.hostname || '127.0.0.1', port: Number(parsed.port || 6379) };
  } catch {
    return { host: '127.0.0.1', port: 6379 };
  }
}

// Parser RESP mínimo: cubre los tipos que usa el transporte (+, -, :, $, *).
// Devuelve null si la respuesta aún está incompleta; lanza si Redis manda
// un error (-ERR ...).
function parseReply(buf: Buffer, pos: number): { value: RedisReply; next: number } | null {
  if (pos >= buf.length) return null;
  const type = String.fromCharCode(buf.readUInt8(pos));
  const lineEnd = buf.indexOf('\r\n', pos);
  if (lineEnd === -1) return null;
  if (type === '+' || type === ':') {
    const body = buf.toString('utf8', pos + 1, lineEnd);
    return { value: type === ':' ? Number(body) : body, next: lineEnd + 2 };
  }
  if (type === '-') {
    throw new Error('redis: ' + buf.toString('utf8', pos + 1, lineEnd));
  }
  if (type === '$') {
    const len = Number(buf.toString('utf8', pos + 1, lineEnd));
    if (len === -1) return { value: null, next: lineEnd + 2 };
    if (buf.length < lineEnd + 2 + len + 2) return null;
    return { value: buf.toString('utf8', lineEnd + 2, lineEnd + 2 + len), next: lineEnd + 2 + len + 2 };
  }
  if (type === '*') {
    const count = Number(buf.toString('utf8', pos + 1, lineEnd));
    if (count === -1) return { value: null, next: lineEnd + 2 };
    let next = lineEnd + 2;
    const items: RedisReply[] = [];
    for (let i = 0; i < count; i++) {
      const item = parseReply(buf, next);
      if (!item) return null;
      items.push(item.value);
      next = item.next;
    }
    return { value: items, next };
  }
  throw new Error('redis: tipo de respuesta RESP desconocido');
}

// Un comando por conexión: simple, sin estado, apto para publishes puntuales.
export async function redisCommand(args: string[], timeoutMs: number = REDIS_TIMEOUT_MS): Promise<RedisReply> {
  const { host, port } = redisTarget();
  return await new Promise<RedisReply>((resolve, reject) => {
    const socket = createConnection({ host, port });
    let acc: Buffer = Buffer.alloc(0);
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error('redis: timeout tras ' + timeoutMs + 'ms'));
    }, timeoutMs);
    const fail = (err: unknown) => {
      clearTimeout(timer);
      socket.destroy();
      reject(err instanceof Error ? err : new Error(String(err)));
    };
    socket.on('error', fail);
    socket.on('connect', () => {
      let wire = '*' + args.length + '\r\n';
      for (const arg of args) {
        wire += '$' + Buffer.byteLength(arg, 'utf8') + '\r\n' + arg + '\r\n';
      }
      socket.write(wire);
    });
    socket.on('data', (chunk: Buffer) => {
      acc = Buffer.concat([acc, chunk]);
      let parsed: { value: RedisReply; next: number } | null = null;
      try {
        parsed = parseReply(acc, 0);
      } catch (err) {
        fail(err);
        return;
      }
      if (parsed) {
        clearTimeout(timer);
        socket.destroy();
        resolve(parsed.value);
      }
      // respuesta incompleta: se espera el próximo chunk (o el timeout)
    });
    socket.on('close', () => fail(new Error('redis: conexión cerrada sin respuesta')));
  });
}

// Ping honesto (R5): 'ok' solo si Redis responde PONG — nunca se asume.
export async function pingRedis(): Promise<'ok' | 'down'> {
  try {
    const reply = await redisCommand(['PING']);
    return reply === 'PONG' ? 'ok' : 'down';
  } catch {
    return 'down';
  }
}

// Publica la REFERENCIA de un evento al stream. Fail-open (ADR-032):
// cualquier fallo se traga y devuelve null — la API nunca rompe por el
// transporte; la verdad ya quedó asegurada en events_raw.
export async function xaddEventReference(
  stream: string,
  fields: Record<string, string>,
): Promise<string | null> {
  try {
    const args = ['XADD', stream, '*'];
    for (const [key, value] of Object.entries(fields)) {
      args.push(key, value);
    }
    const reply = await redisCommand(args);
    return typeof reply === 'string' ? reply : null;
  } catch {
    return null;
  }
}
