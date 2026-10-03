import express, { type Express, type Router } from 'express';
import territoriosRouter from './routes/territorios.js';
import evidenciasRouter from './routes/evidencias.js';

export function createApp(): Express {
  const app = express();
  app.use(express.json());

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'delocalsoy-ar-api', version: '0.1.0' });
  });

  // API Routes
  app.use('/api/territorios', territoriosRouter);
  app.use('/api/evidencias', evidenciasRouter);

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: 'Ruta no encontrada',
    });
  });

  // Error handler
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  });

  return app;
}
