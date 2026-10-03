import express, { type Express } from 'express';

export function createApp(): Express {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'delocalsoy-ar-api', version: '0.1.0' });
  });

  return app;
}
