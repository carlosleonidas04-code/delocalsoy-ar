// CORE-004 R6 (#87) — EV-035: flujo vertical completo en entorno limpio.
//
// Corre como PASO DEL JOB `vertical` del CI (workflows v16 → v17), NO como suite
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
//
// CORE-005 R6 (#206) — EV-056: ciclo completo del reporte en la misma
// pasada. La cadena se extiende al dominio reportes (rama stacked sobre
// R5, PR #219): alta ciudadana (R2) → sello reporte.recibido → referencia
// al stream → proyección del worker → duplicado sugerido por proximidad
// con distancia_m (R5, ADR-039: sugerencia, NUNCA fusión automática) →
// reintento idempotente (200) → promoción a moderador y ciclo completo
// con justificación pública por transición (R3, ADR-038) → sellos 1:1
// reporte.estado_cambiado → historial público (R4) → suscripción /mios →
// lectura pública del nodo. El vocabulario (nodo + categoría) se planta
// como fixture idempotente vía prisma: el entorno sigue limpio (sin
// seed) y el POST /api/reportes valida contra las tablas reales.

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
let checks = 0;
function check(nombre: string, ok: boolean, detalle: string): void {
  const estado = ok ? 'OK   ' : 'FALLA';
  console.log('[' + estado + '] ' + nombre + ' — ' + detalle);
  checks += 1;
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
// ===== CORE-005 R6 (#206) — EV-056: ciclo completo del reporte =====

// [13] fixture del vocabulario (entorno limpio, sin seed): el POST
// /api/reportes valida nodo (404) y categoría (400) contra las TABLAS
// reales — el cliente planta el mínimo idempotente vía prisma (nada se
// acepta por confianza).
const nodoR6 =
  (await prisma.nodos.findFirst({ where: { key: 'capital' } })) ??
  (await prisma.nodos.create({
    data: {
      key: 'capital',
      nombre: 'San Juan (Capital)',
      subtitle: 'Centro–Cívico–Desamparados',
      foco: 'Comercio y espacio público',
      centro_lat: -31.5375,
      centro_lng: -68.5364,
      poblacion: 109000,
    },
  }));
const categoriaR6 =
  (await prisma.categorias.findFirst({
    where: { nodo_id: nodoR6.id, code: 'insufficient_lighting' },
  })) ??
  (await prisma.categorias.create({
    data: { nodo_id: nodoR6.id, code: 'insufficient_lighting', label: 'Iluminación insuficiente' },
  }));
check('fixture vocabulario (nodo capital + categoría)', nodoR6 !== null && categoriaR6 !== null,
  'nodo=' + nodoR6.key + ' categoria=' + categoriaR6.code);

// [14] baseline de la lectura pública del nodo (CORE-003 R1).
const reportesAntes = await jsonFetch('GET', '/api/nodos/capital/reportes');
const n0r = reportesAntes.body?.count ?? -1;
check('baseline lectura pública del nodo', reportesAntes.status === 200 && n0r >= 0, 'count inicial=' + n0r);

// [15][16] alta ciudadana del reporte A (R2): received + sin duplicados
// (vacío verificado — R15: [] con duplicados_verificados=true).
const PUNTO_A = { lat: -31.5375, lng: -68.5364 };
const cuerpoA = {
  nodo_key: 'capital',
  categoria: 'insufficient_lighting',
  descripcion: 'Falla de iluminación en la vereda del corredor cívico — verificación E2E CORE-005 R6',
  lat: PUNTO_A.lat,
  lng: PUNTO_A.lng,
};
const altaA = await jsonFetch('POST', '/api/reportes', cuerpoA, token);
const reporteA: any = altaA.body?.data?.id;
check('alta ciudadana del reporte A', altaA.status === 201 && typeof reporteA === 'string' && altaA.body?.data?.estado === 'received',
  'status=' + altaA.status + ' estado=' + (altaA.body?.data?.estado ?? 'n/d'));
check('reporte A sin duplicados (vacío verificado)', altaA.status === 201 && Array.isArray(altaA.body?.duplicados_sugeridos) && altaA.body.duplicados_sugeridos.length === 0 && altaA.body?.duplicados_verificados === true,
  'sugeridos=' + (altaA.body?.duplicados_sugeridos?.length ?? 'n/d') + ' verificados=' + (altaA.body?.duplicados_verificados ?? 'n/d'));

// [17] sello reporte.recibido en events_raw (única fuente de verdad).
const selloA = await prisma.events_raw.findFirst({
  where: { type: 'reporte.recibido', payload: { path: ['reporte_id'], equals: reporteA ?? '' } },
});
check('sello reporte.recibido en events_raw', !!selloA,
  selloA ? 'event_id=' + selloA.id : 'no encontrado para ' + reporteA);

// [18] transporte: la referencia del sello de A está en el stream.
const entradasR6 = (await redisCommand(['XRANGE', STREAM, '-', '+'])) as unknown as Array<[string, string[]]>;
const refA = selloA ? entradasR6.find((e) => Array.isArray(e?.[1]) && e[1].includes(selloA!.id)) : undefined;
check('referencia del sello de A al stream', !!refA && refA[1].includes(selloA!.hash),
  refA ? 'stream id=' + refA[0] : 'sin referencia de ' + (selloA?.id ?? 'sello ausente'));

// [19] proyección del worker del sello de A (exactamente una vez).
const proyectadaA = selloA
  ? await esperar(async () => (await prisma.event_projections.findUnique({ where: { event_id: selloA!.id } })) !== null, 20000, 400)
  : false;
check('proyección del worker del sello de A', proyectadaA,
  proyectadaA ? 'event_id=' + selloA!.id + ' proyectado' : 'timeout 20s sin proyección');

// [20][21] alta del reporte B a ~22 m de A (R5, ADR-039): la respuesta
// SUGIERE a A con su distancia — nada se fusiona automáticamente.
const cuerpoB = {
  ...cuerpoA,
  descripcion: 'Luminaria apagada en la misma cuadra del corredor cívico — verificación E2E CORE-005 R6',
  lat: PUNTO_A.lat + 0.0002, // ≈ 22 m al norte de A
  lng: PUNTO_A.lng,
};
const altaB = await jsonFetch('POST', '/api/reportes', cuerpoB, token);
const reporteB: any = altaB.body?.data?.id;
const sugeridosB = (altaB.body?.duplicados_sugeridos ?? []) as Array<{ id: string; distancia_m: number | null }>;
const sugeridoA = typeof reporteA === 'string' ? sugeridosB.find((d) => d.id === reporteA) : undefined;
check('alta B con duplicado sugerido (ADR-039)', altaB.status === 201 && typeof reporteB === 'string' && !!sugeridoA,
  'status=' + altaB.status + ' sugeridos=' + JSON.stringify(sugeridosB.map((d) => d.id)));
check('distancia del sugerido en metros (ST_DWithin)', !!sugeridoA && sugeridoA.distancia_m !== null && sugeridoA.distancia_m >= 10 && sugeridoA.distancia_m <= 40,
  'distancia_m=' + (sugeridoA?.distancia_m ?? 'n/d'));

// [22] reintento idempotente de B: 200 con el mismo id, sin escritura nueva.
const reintentoB = await jsonFetch('POST', '/api/reportes', cuerpoB, token);
check('reintento idempotente de B (200, mismo id)', reintentoB.status === 200 && reintentoB.body?.idempotente === true && reintentoB.body?.data?.id === reporteB,
  'status=' + reintentoB.status + ' idempotente=' + (reintentoB.body?.idempotente ?? 'n/d'));

// [23] promoción a moderador (operación de sistema del fixture de CI) y
// login con el rol promovido — el guard requireRole lo acredita abajo.
await prisma.usuarios.update({ where: { email }, data: { rol: 'moderador' } });
const loginMod = await jsonFetch('POST', '/api/auth/login', { email, password });
const tokenMod = loginMod.body?.data?.token;
check('promoción a moderador + login', loginMod.status === 200 && typeof tokenMod === 'string',
  'status=' + loginMod.status + ' token=' + (tokenMod ? 'presente' : 'ausente'));

// [24][25][26] moderación del ciclo completo (R3, ADR-038): justificación
// pública OBLIGATORIA por transición, matriz REPORTE_TRANSICIONES.
const transicion = async (estado: string, justificacion: string) =>
  jsonFetch('PATCH', '/api/reportes/' + reporteA + '/estado', { estado, justificacion }, tokenMod);
const patch1 = await transicion('evaluating', 'El reporte pasa a evaluación del área de alumbrado público');
const patch2 = await transicion('in_progress', 'Cuadrilla asignada para reponer la luminaria del corredor');
const patch3 = await transicion('resolved', 'Luminaria repuesta y encendida; verificación de campo completada');
check('transición received→evaluating (ADR-038)', patch1.status === 200 && patch1.body?.data?.estado === 'evaluating',
  'status=' + patch1.status + ' estado=' + (patch1.body?.data?.estado ?? 'n/d'));
check('transición evaluating→in_progress', patch2.status === 200 && patch2.body?.data?.estado === 'in_progress',
  'status=' + patch2.status + ' estado=' + (patch2.body?.data?.estado ?? 'n/d'));
check('transición in_progress→resolved', patch3.status === 200 && patch3.body?.data?.estado === 'resolved',
  'status=' + patch3.status + ' estado=' + (patch3.body?.data?.estado ?? 'n/d'));

// [27] sellos 1:1 del ciclo: 3 eventos reporte.estado_cambiado en orden.
const sellosA = await prisma.events_raw.findMany({
  where: { type: 'reporte.estado_cambiado', payload: { path: ['reporte_id'], equals: reporteA ?? '' } },
  orderBy: { occurred_at: 'asc' },
});
const secuenciaR6 = sellosA.map((s: any) => (s.payload as any)?.estado_nuevo).join('→');
check('sellos 1:1 del ciclo (3 eventos en orden)', sellosA.length === 3 && secuenciaR6 === 'evaluating→in_progress→resolved',
  'eventos=' + sellosA.length + ' secuencia=' + secuenciaR6);

// [28] proyección del worker de los 3 sellos del ciclo (una vez cada uno).
const idsSellosR6 = sellosA.map((s: any) => s.id);
const proyectadosR6 = await esperar(async () => {
  const n = await prisma.event_projections.count({ where: { event_id: { in: idsSellosR6 } } });
  return n === idsSellosR6.length;
}, 20000, 400);
check('proyección del worker de los 3 sellos', proyectadosR6,
  proyectadosR6 ? '3/3 proyectados' : 'timeout 20s');

// [29] historial público (R4): 3 transiciones justificadas en orden.
const historial = await jsonFetch('GET', '/api/reportes/' + reporteA + '/historial');
const transicionesHist = historial.body?.data?.transiciones ?? [];
const ordenHist = transicionesHist.map((t: any) => t.estado_nuevo).join('→');
const justificadas = transicionesHist.every((t: any) => typeof t.justificacion === 'string' && t.justificacion.length >= 10);
check('historial público (3 transiciones justificadas en orden)', historial.status === 200 && transicionesHist.length === 3 && ordenHist === 'evaluating→in_progress→resolved' && justificadas,
  'status=' + historial.status + ' transiciones=' + transicionesHist.length + ' orden=' + ordenHist);

// [30] suscripción del reportero (R4): A resuelto con sus 3 transiciones.
const mios = await jsonFetch('GET', '/api/reportes/mios', undefined, token);
const miosA = (mios.body?.data ?? []).find((r: any) => r.id === reporteA);
check('suscripción /mios del reportero', mios.status === 200 && !!miosA && miosA?.estado === 'resolved' && Array.isArray(miosA?.transiciones) && miosA.transiciones.length === 3,
  'status=' + mios.status + ' estado=' + (miosA?.estado ?? 'n/d') + ' transiciones=' + (miosA?.transiciones?.length ?? 'n/d'));

// [31][32] alta del reporte C (~11 m de B, ~33 m de A): sugiere a B
// (abierto) pero NO al A resuelto — el ciclo terminado deja de ser
// sugerible; y nada se fusiona: A sigue resolved y B received en BD.
const cuerpoC = {
  ...cuerpoA,
  descripcion: 'Otra luminaria apagada en la misma vereda del corredor cívico — verificación E2E CORE-005 R6',
  lat: PUNTO_A.lat + 0.0003, // ≈ 33 m de A, ≈ 11 m de B
  lng: PUNTO_A.lng,
};
const altaC = await jsonFetch('POST', '/api/reportes', cuerpoC, token);
const reporteC: any = altaC.body?.data?.id;
const sugeridosC = (altaC.body?.duplicados_sugeridos ?? []) as Array<{ id: string }>;
const cSugiereB = typeof reporteB === 'string' && sugeridosC.some((d) => d.id === reporteB);
const cSugiereA = typeof reporteA === 'string' && sugeridosC.some((d) => d.id === reporteA);
check('alta C sugiere a B, no al A resuelto (ADR-039)', altaC.status === 201 && typeof reporteC === 'string' && cSugiereB && !cSugiereA,
  'status=' + altaC.status + ' sugeridos=' + JSON.stringify(sugeridosC.map((d) => d.id)));
const aEnBd = typeof reporteA === 'string' ? await prisma.reportes.findUnique({ where: { id: reporteA } }) : null;
const bEnBd = typeof reporteB === 'string' ? await prisma.reportes.findUnique({ where: { id: reporteB } }) : null;
check('nada se fusiona (A resolved y B received en BD)', !!aEnBd && aEnBd.estado === 'resolved' && !!bEnBd && bEnBd.estado === 'received',
  'estado A=' + (aEnBd?.estado ?? 'n/d') + ' estado B=' + (bEnBd?.estado ?? 'n/d'));

// [33] lectura pública del nodo: count n0r+3 y A, B y C presentes.
const reportesDespues = await jsonFetch('GET', '/api/nodos/capital/reportes');
const idsPublicos = new Set((reportesDespues.body?.data ?? []).map((r: any) => r.id));
check('lectura pública del nodo (count+3, A/B/C presentes)', reportesDespues.status === 200 && reportesDespues.body?.count === n0r + 3 && idsPublicos.has(reporteA) && idsPublicos.has(reporteB) && idsPublicos.has(reporteC),
  'count=' + (reportesDespues.body?.count ?? 'n/d') + ' (esperado ' + (n0r + 3) + ')');

console.log('');
console.log('=== EV-035 · flujo vertical activos (CORE-004 R6) + EV-056 · ciclo completo del reporte (CORE-005 R6) ===');
console.log('checks: ' + (checks - fallos) + '/' + checks + ' OK — fallos: ' + fallos);
if (fallos > 0) {
  console.error('FLUJO VERTICAL INCOMPLETO — R6 NO ACREDITADO');
  process.exit(1);
}
console.log('R6 ACREDITADO (activos, CORE-004 — EV-035): ciudadano → JWT → POST /api/activos → events_raw → stream → worker → proyección → visible');
console.log('R6 ACREDITADO (reportes, CORE-005 — EV-056): alta → sello → proyección → duplicado sugerido (ADR-039) → moderación justificada (ADR-038) → historial público → /mios → lectura del nodo');
process.exit(0);
