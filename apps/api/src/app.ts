import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { levelForStatus, logJson } from './logger.js';
import activosRouter from './routes/activos.js';
import amenazasRouter from './routes/amenazas.js';
import authRouter from './routes/auth.js';
import comerciosRouter from './routes/comercios.js';
import comunicacionRouter from './routes/comunicacion.js';
import corredoresRouter from './routes/corredores.js';
import evidenciasRouter from './routes/evidencias.js';
import eventsRouter from './routes/events.js';
import fichasValoracionRouter from './routes/fichasValoracion.js';
import fuentesRouter from './routes/fuentes.js';
import healthRouter from './routes/health.js';
import healthDetailedRouter from './routes/healthDetailed.js';
import mediadoresRouter from './routes/mediadores.js';
import meRouter from './routes/me.js';
import modeloFederadoRouter from './routes/modeloFederado.js';
import nodosRouter from './routes/nodos.js';
import oportunidadesRouter from './routes/oportunidades.js';
import patrimonioRouter from './routes/patrimonio.js';
import pedidosRouter from './routes/pedidos.js';
import practicasRouter from './routes/practicas.js';
import productosRouter from './routes/productos.js';
import reportesRouter from './routes/reportes.js';
import saludRouter from './routes/salud.js';
import sellosRouter from './routes/sellos.js';
import showcaseRouter from './routes/showcase.js';
import territoriosRouter from './routes/territorios.js';

export function createApp(): Express {
  const app = express();
  app.use(express.json());

  // M1 observabilidad (#288, D3 ratificado DH 2026-10-30): request_id por
  // request + logs JSON estructurados. El id vive en res.locals, se expone
  // como header X-Request-Id y el handler de errores lo REUTILIZA — AUD-06
  // generaba otro distinto y perdia la correlacion. Anti-PII (ADR-027/Ley
  // 25.326): solo metodo, path SIN query string, status y duracion.
  app.use((req: Request, res: Response, next: NextFunction) => {
    const requestId = randomUUID().slice(0, 8);
    res.locals.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      logJson(levelForStatus(res.statusCode), 'http_request', {
        request_id: requestId,
        method: req.method,
        path: req.originalUrl.split('?')[0],
        status: res.statusCode,
        duration_ms: Number(process.hrtime.bigint() - start) / 1e6,
      });
    });
    next();
  });

  // Identidad por etapas (CORE-004 R3, ADR-031): registro/login/me con JWT
  // HS256 y roles. Fail-closed sin JWT_SECRET. La API key R8 subsiste para
  // operaciones de sistema (guard R8 intocado).
  app.use('/api/auth', authRouter);

  // Dominio «mi cuenta» (ARTEFACTOS-ROLES AR1, #400 — épica #399): atributo
  // de residencia auto-declarado sobre la cuenta (vecino = ATRIBUTO, NO rol
  // — decisión DH 2026-11-06) y lens del visitante (rol solo lectura v0.2).
  // PUT /api/me/residencia: ciudadano|moderador|admin autenticado; solo la
  // clave del subnodo REAL del vocabulario + timestamp — sin domicilio jamás
  // (Ley 25.326 / ADR-027); sello residencia.declarada con rollback (R4/R15).
  app.use('/api/me', meRouter);

  // A1 observabilidad (#290, hoja M1, RUNBOOK seccion 6): salud detallada por
  // componente (db, redis/streams, projection_lag, proceso) — acceso admin
  // (ADR-031): expone internals operativos. El health publico honesto (R5)
  // sigue siendo GET /api/health; este lo complementa, nunca lo reemplaza.
  app.use('/api/health/detailed', healthDetailedRouter);

  // Salud honesta del sistema: mode real|synthetic|degraded, nunca OK silencioso (R5)
  // Aterrizaje PR 1 — issue #20
  app.use('/api/health', healthRouter);

  // Dominio: territorios federados — recorte espacial bbox con PostGIS (Aterrizaje PR 2 — issue #21)
  app.use('/api/territorios', territoriosRouter);

  // Dominio: vocabulario del demo federado (CORE-003 R1, #83) — nodos, capas,
  // categorías, features y reportes en lectura pública. El backend sirve todo
  // lo que el contrato DataSource consume: fin de los "declarado vacío" (R15).
  // NODO-VIG VIG-001 (#171, épica #167): GET /api/nodos/:key/subnodos — jerarquía
  // territorial del Valle de Iglesia (distrito → paraje → subparaje + localidad
  // INDEC), con punto público BAHRA/Georef y estados honestos de asignación.
  app.use('/api/nodos', nodosRouter);

  // Dominio: activos territoriales (CORE-004 R5b, #87) — escritura ciudadana
  // verificada: POST autenticado con pseudónimo sin PII (Ley 25.326), sello
  // en events_raw, moderación PATCH /:id/estado (moderador|admin) y GET
  // público anónimo con recorte espacial bbox sobre PostGIS.
  app.use('/api/activos', activosRouter);

  // MARKET-CAP MK-1 (#243, sub-épica #152): Mercado de Proximidad — alta
  // ciudadana de comercios con moderación (nace 'propuesto'), ficha 1:1
  // comercio_ficha y lectura pública multinodo (facetas + bbox).
  app.use('/api/comercios', comerciosRouter);

  // Dominio: red de corredores v0.1 (NODO-CAPITAL NCAP-R4, #156 — épica
  // #152): corredores como red MODELADA (grafo relacional: corredor →
  // segmentos from/to tipados → hitos/subnodos vinculados), no líneas
  // dibujadas — SIN geometría en v0.1 (R15: la traza exige fuente
  // verificada; status 'candidate' = hipótesis de diseño DH, ratificado
  // 2026-11-04). Lectura pública anónima: GET /api/corredores y
  // GET /api/corredores/:key con hitos/subnodos resueltos, fuentes por
  // tramo (ADR-035) y continuidad revisada ok|ruptura derivada de la
  // cadena de segmentos. Sin escritura ciudadana en v0.1: los corredores
  // son hipótesis de diseño DH, no input ciudadano.
  app.use('/api/corredores', corredoresRouter);

  // Dominio: fichas de valoración comunitaria del espacio público
  // (NODO-CAU R4, #149) — testimonio revisable anclado a features de la capa
  // public_space: POST ciudadano con pseudónimo sin PII y sello
  // ficha_valoracion.propuesta en events_raw, GET público anónimo con estado
  // derivado validado|testimonio y recorte bbox por la geometría del espacio,
  // moderación PATCH /:id/estado (corroborada con corroboracion
  // individual|taller_comunitario | descartada, ADR-036).
  app.use('/api/fichas-valoracion', fichasValoracionRouter);

  // Dominio: oportunidades de desarrollo local (NODO-CAPITAL NCAP-R6, #158 —
  // Bloque 9 Banco de Potencialidades): registro ciudadano autenticado con
  // evidencia obligatoria, ciclo de vida por matriz de transiciones sellada
  // en events_raw, moderación moderador|admin y lectura pública anónima
  // ('discarded' nunca se publica).
  app.use('/api/oportunidades', oportunidadesRouter);

  // Dominio: patrimonio protegido (NODO-VIG VIG-004, NVIG-R6 #173 — épica
  // #167): ficha patrimonial pública (declaratoria + conservación + reglas +
  // punto de acceso — NUNCA el campo sensible, ADR-036) y custodia PATCH
  // moderador|admin con sello patrimonio.custodiado en events_raw + rollback.
  app.use('/api/patrimonio', patrimonioRouter);
  app.use('/api/pedidos', pedidosRouter);

  // Dominio: producción y turismo (NODO-VIG VIG-005, NVIG-R7 #174 — épica
  // #167): catálogo de productos del territorio por activo (GET público
  // propuesto|aprobado, alta ciudadana autenticada que nace 'propuesto' y
  // moderación moderador|admin en PATCH /api/productos/:id/estado) y operativa
  // del activo (GET /api/operativa/:id — horario, temporada, capacidad,
  // seguridad y habilitación honesta). ADR-036: restricted queda excluido de
  // toda lectura pública, sin excepción ratificada (traza #174).
  app.use('/api', productosRouter);

  // Dominio: catálogo de fuentes espaciales + procedencia (NODO-CAU R2,
  // #138/#147 — ADR-035): GET /api/fuentes — catálogo público y anónimo de
  // fuentes (organismo, tipo de acceso, estado honesto de disponibilidad y
  // cautela central); POST /api/ingestas — ingesta curada por admin que
  // declara procedencia completa por conjunto (fuente del catálogo, fechas
  // de acceso/corte, licencia, CRS, precisión, transformaciones — NC-EV-09);
  // PATCH /api/ingestas/:id/estado — pipeline recibido → validado_tecnicamente
  // → validado_territorialmente → publicado (solo admin, decisión DH
  // 2026-10-15); GET /api/ingestas — lectura pública SOLO de lo publicado
  // (R15); sellos ingesta.creada e ingesta.estado_cambiado en events_raw con
  // rollback si fallan.
  app.use('/api', fuentesRouter);

  // Dominio: reportes ciudadanos (CORE-005 R2, #206 — épica CORE-005):
  // alta ciudadana autenticada de reportes territoriales — POST /api/reportes
  // crea el reporte en estado 'received' (ReporteEstadoSchema R1) con
  // created_by_hash = sha256(usuario_id) truncado sin PII (Ley 25.326,
  // ADR-027), categoría validada contra el vocabulario real del nodo
  // (404 nodo inexistente, 400 categoría ajena), anti-PII antes de
  // persistir (ADR-020 cond. 1), idempotencia por hash único y sello
  // reporte.recibido en events_raw con rollback si el sello falla.
  app.use('/api/reportes', reportesRouter);

  // Dominio: práctica territorial (LIC-DLUI LIC-R3, #452 — épica #448):
  // POST /api/practicas/acreditar — acto de la DH (admin, patrón
  // decision_dh): atributo de práctica sobre la cuenta ciudadana (Opción B
  // ratificada: patrón AR1, atributo NO rol) con referente comunitario que
  // valida y no decide (D4). El mandato NUNCA persiste (solo su hash);
  // sello practica.acreditada sin PII con rollback (R4/R15). El sello
  // habilita (DL-7) el canal de relevamiento del practicante en
  // POST /api/reportes (protocolo versionado LIC-R2).
  app.use('/api/practicas', practicasRouter);

  // Dominio: capas de amenaza sísmica (LIC-DLUI LIC-R4, #455 — épica #448):
  // GET /api/amenazas — catálogo público derivado de capas declaradas ×
  // ingestas publicadas (capa_servicio = capas.key, DL-9 — patrón
  // NODO-CAU R2 #138/#147); GET /api/amenazas/cobertura — dashboard honesto
  // «X de N distritos con capa sísmica publicada» + fecha de corte (criterio
  // de cierre #455). Regla metadatos-antes-de-capa: sin ingesta publicada la
  // capa queda 'declarada' con ingesta null (R15: null ≠ 0). Sin escritura,
  // sin PII, sin ranking de riesgo (R5/ADR-036) — la plataforma no es alerta
  // operativa.
  app.use('/api/amenazas', amenazasRouter);

  // Dominio: LIC-DLUI LIC-R6 (LIC-06 #449, épica #448) — salud urbana
  // federada (DL-11): SOLO agregados oficiales (REFES/DEIS) federados VÍA
  // ingestas del pipeline de procedencia (patrón EV-049); la salud
  // individual es dato sensible PROHIBIDO (Ley 25.326) — sin campos de
  // texto libre, superficie PII cero. GET /api/salud — catálogo público
  // anónimo: indicadores declarados × nodos con estado honesto
  // `sin_fuente_ingestada` (valor null, R15: null ≠ 0) | `en_custodia`
  // (NC-EV-09: ingesta no publicada no se lee) | `publicado` (valor +
  // procedencia) y cobertura «X de Y» pares publicados — conteo CON
  // cobertura, NUNCA ranking de salud entre nodos (R5/ADR-036).
  // POST /api/salud/agregados — alta curada por admin (R15 estricta,
  // patrón ingestas): idempotencia por hash, sello `salud.agregado_ingestado`
  // con rollback.
  app.use('/api/salud', saludRouter);

  // Dominio: comunicación pública honesta (LIC-DLUI LIC-R8, LIC-08 #451 —
  // épica #448): DL-13, canon DLUI-569 como ley interna. Sin fuente no hay
  // aviso (DL-13.1); la plataforma traduce, jamás alerta (cita y enlaza la
  // fuente oficial — no sirena, R5/ADR-036); caducidad honesta (el vencido
  // se expone `caducado` COMPUTADO en lectura, jamás borrado — ADR-038);
  // anti-infodemia (certeza verificado|reportado|rumor_descartado); sin PII
  // (Ley 25.326/ADR-027). GET /api/comunicacion/avisos — lectura pública con
  // filtros validados; GET /api/comunicacion/cobertura — «X de N» honesto
  // que nace «0 de N» (DL-5); POST /api/comunicacion/avisos — alta curada
  // solo admin (R15 estricta, patrón salud): idempotencia por hash → 409,
  // sello `comunicacion.aviso_publicado` con rollback.
  app.use('/api/comunicacion', comunicacionRouter);

  // Dominio: AMC — registro de mediadores (NODO-VIG-3 VIG-011, #378 — épica
  // #377): boca única de reporte territorial del nodo. POST /api/mediadores
  // (admin): alias comunitario + aval (asamblea | comision_vecinal —
  // comunitario, no gubernamental), sello 'mediador.registrado' con rollback;
  // GET público de vigentes sin PII. Nace VACÍO (R15): la asamblea aún no
  // ratificó mediadores — sin registro no hay canal papel|whatsapp.
  app.use('/api/mediadores', mediadoresRouter);

  // Demo final (NODO-VIG VIG-007, NVIG-R9 #193 — épica #167): recorrido
  // federado del showcase — lectura pública del estado REAL de los tres
  // nodos (counts del dominio con exclusiones ADR-036; sin snapshots →
  // kpis 0 honesto, R15). El guion ejecutable vive en
  // docs/nodes/valle-de-iglesia/VIG-007-DEMO-FINAL.md.
  app.use('/api/showcase', showcaseRouter);

  // Compuerta Pre-C5 (handoff [agent: google] → [agent: vibe], Refs #109/#114,
  // ADR-034): validación de integridad referencial del schema Prisma REAL
  // (11 modelos, 6 aristas @relation, huérfanos contra postgres) antes de
  // habilitar el contrato C5. R4/R15: sin base no hay compuerta abierta.
  app.use('/api/contracts', modeloFederadoRouter);

  // Dominio: registro de evidencias ejecutables (EV-xxx) — unificado bajo /api (riesgo #53)
  app.use('/api/evidencias', evidenciasRouter);

  // Dominio: eventos crudos (fuente de verdad, append-only, idempotentes) — unificado bajo /api (riesgo #53)
  // H-01 (auditoría T2, corregido en R3a): la ingesta pública rechaza system.*.
  app.use('/api/events', eventsRouter);

  // Dominio: libro contable de sellos (ARTEFACTOS-ROLES AR4, #403 — épica
  // #399): GET /api/sellos — lectura pública anónima de events_raw (fuente
  // de verdad append-only, ADR-032) con filtros ?nodo= (payload->nodo_key)
  // y ?type= exacto, paginación limit/offset con total en el header
  // X-DELocalSoy-Total-Count (patrón #165); GET /api/sellos/tipos — conteo
  // por type para la cobertura contra docs/MATRIZ_SELLOS.md. Sin PII por
  // construcción (la compuerta anti-PII vive en la ingesta POST /api/events
  // — Ley 25.326/ADR-027); sin escritura: el auditor no muta.
  app.use('/api/sellos', sellosRouter);

  // Riesgo #57 (ADR-028): la ruta legada /health fue retirada — sin consumidores
  // legítimos tras #53/#61. Único health: /api/health (honesto, R5).
  // Verificación ejecutable en health.test.ts: GET /health → 404.

  // Manejo de errores centralizado
  // AUD-06 (#100): los mensajes internos (Prisma/driver) nunca salen al
  // cliente — quedan server-side con un request_id correlacionable.
  // M1 (#288, D3): reutiliza el request_id del middleware (mismo id en el
  // log de error y en la respuesta) — corrige la correlacion rota de AUD-06.
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    const requestId = (res.locals?.requestId as string | undefined) ?? randomUUID().slice(0, 8);
    logJson('error', 'http_error', {
      request_id: requestId,
      error_message: err.message,
    });
    res.status(500).json({ error: 'error interno', request_id: requestId });
  });

  return app;
}


