import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import activosRouter from './routes/activos.js';
import authRouter from './routes/auth.js';
import evidenciasRouter from './routes/evidencias.js';
import eventsRouter from './routes/events.js';
import healthRouter from './routes/health.js';
import nodosRouter from './routes/nodos.js';
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
  app.use('/api/nodos', nodosRouter);

  // Dominio: activos territoriales (CORE-004 R5b, #87) — escritura ciudadana
  // verificada: POST autenticado con pseudónimo sin PII (Ley 25.326), sello
  // en events_raw, moderación PATCH /:id/estado (moderador|admin) y GET
  // público anónimo con recorte espacial bbox sobre PostGIS.
  app.use('/api/activos', activosRouter);

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
