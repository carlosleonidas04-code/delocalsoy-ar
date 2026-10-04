import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'delocalsoy-api-mock',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/api/health' || req.url === '/health') {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ status: 'ok', service: 'delocalsoy-ar-api', version: '0.1.0' }));
            return;
          }
          if (req.url?.startsWith('/api/territorios')) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, data: [], count: 0 }));
            return;
          }
          if (req.url?.startsWith('/api/evidencias')) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, data: [], count: 0 }));
            return;
          }
          next();
        });
      },
    },
  ],
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
  },
});

