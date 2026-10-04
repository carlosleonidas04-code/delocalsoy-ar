import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import evidenciasRouter from './routes/evidencias.js';
import eventsRouter from './routes/events.js';

export function createApp(): Express {
  const app = express();
  app.use(express.json());

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'delocalsoy-ar-api', version: '0.2.0' });
  });

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
