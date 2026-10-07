import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import evidenciasRouter from './routes/evidencias.js';
import eventsRouter from './routes/events.js';
import healthRouter from './routes/health.js';
import territoriosRouter from './routes/territorios.js';

export function createApp(): Express {
  const app = express();
  app.use(express.json());

  // Salud honesta del sistema: mode real|synthetic|degraded, nunca OK silencioso (R5)
  // Aterrizaje PR 1 — issue #20
  app.use('/api/health', healthRouter);

  // Dominio: territorios federados — recorte espacial bbox con PostGIS (Aterrizaje PR 2 — issue #21)
  app.use('/api/territorios', territoriosRouter);

  // Dominio: registro de evidencias ejecutables (EV-xxx) — unificado bajo /api (riesgo #53)
  app.use('/api/evidencias', evidenciasRouter);

  // Dominio: eventos crudos (fuente de verdad, append-only, idempotentes) — unificado bajo /api (riesgo #53)
  app.use('/api/events', eventsRouter);

  // Riesgo #57 (ADR-028): la ruta legada /health fue retirada — sin consumidores
  // legítimos tras #53/#61. Único health: /api/health (honesto, R5).
  // Verificación ejecutable en health.test.ts: GET /health → 404.

  // Manejo de errores centralizado
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[delocalsoy-ar-api] error:', err.message);
    res.status(500).json({ error: 'error interno', detail: err.message });
  });

  return app;
}
