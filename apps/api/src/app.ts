import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import activosRouter from './routes/activos.js';
import authRouter from './routes/auth.js';
import evidenciasRouter from './routes/evidencias.js';
import eventsRouter from './routes/events.js';
import fichasValoracionRouter from './routes/fichasValoracion.js';
import healthRouter from './routes/health.js';
import modeloFederadoRouter from './routes/modeloFederado.js';
import nodosRouter from './routes/nodos.js';
import oportunidadesRouter from './routes/oportunidades.js';
import patrimonioRouter from './routes/patrimonio.js';
import productosRouter from './routes/productos.js';
import showcaseRouter from './routes/showcase.js';
import territoriosRouter from './routes/territorios.js';

export function createApp(): Express {
  const app = express();
  app.use(express.json());

  // Identidad por etapas (CORE-004 R3, ADR-031): registro/login/me con JWT
  // HS256 y roles. Fail-closed sin JWT_SECRET. La API key R8 subsiste para
  // operaciones de sistema (guard R8 intocado).
  app.use('/api/auth', authRouter);

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

  // Dominio: producción y turismo (NODO-VIG VIG-005, NVIG-R7 #174 — épica
  // #167): catálogo de productos del territorio por activo (GET público
  // propuesto|aprobado, alta ciudadana autenticada que nace 'propuesto' y
  // moderación moderador|admin en PATCH /api/productos/:id/estado) y operativa
  // del activo (GET /api/operativa/:id — horario, temporada, capacidad,
  // seguridad y habilitación honesta). ADR-036: restricted queda excluido de
  // toda lectura pública, sin excepción ratificada (traza #174).
  app.use('/api', productosRouter);

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

  // Riesgo #57 (ADR-028): la ruta legada /health fue retirada — sin consumidores
  // legítimos tras #53/#61. Único health: /api/health (honesto, R5).
  // Verificación ejecutable en health.test.ts: GET /health → 404.

  // Manejo de errores centralizado
  // AUD-06 (#100): los mensajes internos (Prisma/driver) nunca salen al
  // cliente — quedan server-side con un request_id correlacionable.
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    const requestId = randomUUID().slice(0, 8);
    console.error('[delocalsoy-ar-api] error ' + requestId + ':', err.message);
    res.status(500).json({ error: 'error interno', request_id: requestId });
  });

  return app;
}
