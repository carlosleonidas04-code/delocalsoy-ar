// CORE-004 R6 (#87) — EV-035: flujo vertical completo en entorno limpio.
//
// Corre como PASO DEL JOB `vertical` del CI (workflows v16), NO como suite
// vitest: es el CLIENTE que recorre la cadena completa de punta a punta
// contra PROCESOS REALES — la API (apps/api/src/server.ts) y el worker
// (apps/worker/src/index.ts) levantados por el job — con PostGIS + Redis
// reales y base recién migrada (sin seed: entorno limpio).
//
// Cadena acreditada (R6, #87):
//   registro ciudadano → login JWT → POST /api/activos (contrato + anti-PII)
//   → sello activo.propuesto en events_raw (única verdad) → referencia al
//   stream events:raw → worker core004-worker la proyecta EXACTAMENTE UNA
//   VEZ en event_projections → visible en GET /api/activos?bbox= (mapa).
//
// Sin API o sin worker alcanzables el script falla (exit != 0): no se
// simula nada (R5). La salida real acredita (R4): cada check imprime OK.

process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://delocalsoy:delocalsoy@localhost:5432/delocalsoy?schema=public';
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

const API = process.env.VERTICAL_API_URL ?? 'http://127.0.0.1:3000';
const STREAM = 'events:raw';
const GROUP = 'core004-worker';
const BBOX = '-68.7,-31.2,-68.4,-30.9'; // envolvente del nodo caucete (SRID=4326)

const { prisma } = await import('@delocalsoy/db');
const { redisCommand, xaddEventReference } = await import('@delocalsoy/redis');

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const email = 'vertical-r6-' + stamp + '@example.test';
const password = 'flujo-vertical-r6-ci-2026';

let fallos = 0;
function check(nombre: string, ok: boolean, detalle: string): void {
  const estado = ok ? 'OK   ' : 'FALLA';
  console.log('[' + estado + '] ' + nombre + ' — ' + detalle);
  if (!ok) fallos += 1;
}

async function esperar(condicion: () => Promise<boolean>, ms: number, cada: number): Promise<boolean> {
  const inicio = Date.now();
  while (Date.now() - inicio < ms) {
    if (await condicion()) return true;
    await new Promise((r) => setTimeout(r, cada));
  }
  return await condicion();
}

async function jsonFetch(metodo: string, ruta: string, cuerpo?: unknown, token?: string) {
  const res = await fetch(API + ruta, {
    method: metodo,
    headers: {
      'content-type': 'application/json',
      ...(token !== undefined ? { authorization: 'Bearer ' + token } : {}),
    },
    body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
  });
  let body: unknown = null;
  try { body = await res.json(); } catch { /* sin cuerpo */ }
  return { status: res.status, body: body as any };
}

// [1] health: API arriba, transporte vivo, modo real.
const health = await jsonFetch('GET', '/api/health');
check('health', health.status === 200 && health.body?.redis === 'ok',
  'status=' + health.status + ' redis=' + (health.body?.redis ?? 'n/d') + ' mode=' + (health.body?.mode ?? 'n/d'));

// [2] rendezvous con el worker: el consumer group debe existir ANTES del
// alta (el grupo nace en $: lo publicado antes no se entrega).
const grupoExiste = async () => {
  try {
    const reply = await redisCommand(['XINFO', 'GROUPS', STREAM]);
    return JSON.stringify(reply).includes(GROUP);
  } catch { return false; }
};
const workerArriba = await esperar(grupoExiste, 30000, 500);
check('worker arriba (grupo ' + GROUP + ')', workerArriba,
  workerArriba ? 'consumer group creado — worker real vivo' : 'timeout 30s sin worker');

// [3] registro ciudadano (ADR-031): el alta pública solo crea ciudadanos.
const registro = await jsonFetch('POST', '/api/auth/register', { email, password });
check('registro ciudadano', registro.status === 201 && registro.body?.data?.rol === 'ciudadano',
  'status=' + registro.status + ' rol=' + (registro.body?.data?.rol ?? 'n/d'));

// [4] login → JWT HS256 (sesión sellada en events_raw, sin PII).
const login = await jsonFetch('POST', '/api/auth/login', { email, password });
const token = login.body?.data?.token;
check('login JWT', login.status === 200 && typeof token === 'string' && token.length > 0,
  'status=' + login.status + ' token=' + (token ? 'presente' : 'ausente'));

// [5] baseline del mapa público (bbox sobre PostGIS, entorno limpio).
const antes = await jsonFetch('GET', '/api/activos?bbox=' + BBOX);
const n0 = antes.body?.count ?? -1;
check('lectura pública bbox', antes.status === 200 && n0 >= 0, 'count inicial=' + n0);

// [6] escritura ciudadana verificada: alta autenticada por contrato (R5b).
const alta = await jsonFetch('POST', '/api/activos', {
  tipo: 'servicio',
  titulo: 'Punto de verificación del flujo vertical',
  descripcion: 'Alta ciudadana de verificación CORE-004 R6 en entorno limpio de CI',
  nodo_key: 'caucete',
  lat: -31.0484,
  lng: -68.5556,
}, token);
const activoId = alta.body?.data?.id;
check('alta ciudadana', alta.status === 201 && typeof activoId === 'string' && alta.body?.data?.estado === 'propuesto',
  'status=' + alta.status + ' estado=' + (alta.body?.data?.estado ?? 'n/d'));

// [7] sello en events_raw: única fuente de verdad, rollback si falla.
const sello = await prisma.events_raw.findFirst({
  where: { type: 'activo.propuesto' },
  orderBy: { occurred_at: 'desc' },
});
const selloOk = !!sello && (sello.payload as any)?.activo_id === activoId;
check('sello activo.propuesto en events_raw', selloOk,
  selloOk ? 'event_id=' + sello!.id : 'no encontrado para activo ' + activoId);
if (!selloOk || !sello) {
  console.error('sin sello no hay flujo vertical — abortando (R4/R15)');
  process.exit(1);
}

// [8] transporte: la REFERENCIA del sello está en el stream (ADR-032).
const entries = (await redisCommand(['XRANGE', STREAM, '-', '+'])) as unknown as Array<[string, string[]]>;
const ref = entries.find((e) => Array.isArray(e?.[1]) && e[1].includes(sello.id));
const refOk = !!ref && ref[1].includes(sello.hash);
check('referencia publicada al stream', refOk,
  refOk ? 'stream id=' + ref[0] : 'sin referencia de ' + sello.id);

// [9] proyección del worker: exactamente una vez (consumer group + P2002).
const proyectada = await esperar(async () => {
  const p = await prisma.event_projections.findUnique({ where: { event_id: sello.id } });
  return p !== null;
}, 20000, 400);
const proyecciones = proyectada ? await prisma.event_projections.count({ where: { event_id: sello.id } }) : 0;
check('proyección del worker (una vez exactamente)', proyectada && proyecciones === 1,
  'proyecciones=' + proyecciones + (proyectada ? '' : ' (timeout 20s)'));

// [10] idempotencia EN el flujo: re-publicar la MISMA referencia no duplica.
await xaddEventReference(STREAM, {
  event_id: sello.id,
  type: sello.type,
  hash: sello.hash,
  occurred_at: sello.occurred_at.toISOString(),
});
await new Promise((r) => setTimeout(r, 2500)); // ≥ 4 pasadas del worker (interval 500 ms)
const trasRepub = await prisma.event_projections.count({ where: { event_id: sello.id } });
check('re-entrega no duplica la proyección', trasRepub === 1,
  'proyecciones tras re-publicación=' + trasRepub);

// [11] visible en el mapa público: bbox + geometry (consulta real del mapa).
const despues = await jsonFetch('GET', '/api/activos?bbox=' + BBOX);
const visible = (despues.body?.data ?? []).some((a: any) => a?.id === activoId);
check('visible en consulta/mapa', despues.status === 200 && despues.body?.count === n0 + 1 && visible,
  'count=' + (despues.body?.count ?? 'n/d') + ' (esperado ' + (n0 + 1) + ') visible=' + visible);

// [12] auditoría: la proyección acredita el sello correcto (métrica honesta).
const proyeccion = await prisma.event_projections.findUnique({ where: { event_id: sello.id } });
check('auditoría de la proyección',
  !!proyeccion && proyeccion!.event_type === 'activo.propuesto' && proyeccion!.event_hash === sello.hash,
  'event_type=' + (proyeccion?.event_type ?? 'n/d'));

console.log('');
console.log('=== EV-035 · flujo vertical completo (entorno limpio) ===');
console.log('checks: ' + (12 - fallos) + '/12 OK — fallos: ' + fallos);
if (fallos > 0) {
  console.error('FLUJO VERTICAL INCOMPLETO — R6 NO ACREDITADO');
  process.exit(1);
}
console.log('R6 ACREDITADO: ciudadano → JWT → POST /api/activos → events_raw → stream → worker → proyección → visible');
process.exit(0);
