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

  // Health check legado (demo web)
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'delocalsoy-ar-api', version: '0.2.0' });
  });

  // Dominio: territorios federados — recorte espacial bbox con PostGIS (Aterrizaje PR 2 — issue #21)
  app.use('/api/territorios', territoriosRouter);

  // Dominio: registro de evidencias ejecutables (EV-xxx)
  app.use('/evidencias', evidenciasRouter);

  // Dominio: eventos crudos (fuente de verdad, append-only, idempotentes)
  app.use('/events', eventsRouter);

  // Manejo de errores centralizado
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[delocalsoy-ar-api] error:', err.message);
    res.status(500).json({ error: 'error interno', detail: err.message });
  });

  return app;
}
