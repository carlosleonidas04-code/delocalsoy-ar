import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// R5 también en el dev-server (riesgo #54): el mock sintético es OPT-IN
// (VITE_MOCK_API=1 en apps/web/.env.local) y cuando responde se
// autodeclara "synthetic" — nunca un "ok" silencioso. Sin backend y sin
// mock: la UI muestra el error honesto ("Sin conexión con la API").
//
// El proxy ya NO reescribe el prefijo /api (riesgo #53): las rutas del
// backend se sirven 1:1 bajo /api/* (igual que docs/api/openapi.json).
function mockApi() {
  return {
    name: 'delocalsoy-api-mock',
    configureServer(server: { middlewares: { use: (fn: (req: any, res: any, next: any) => void) => void } }) {
      server.middlewares.use((req: any, res: any, next: any) => {
        const synthetic = (body: Record<string, unknown>) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ mode: 'synthetic', ...body }));
        };
        if (req.url === '/api/health') {
          synthetic({ status: 'synthetic', service: 'delocalsoy-ar-api', version: 'mock' });
          return;
        }
        if (req.url?.startsWith('/api/territorios')) {
          synthetic({ success: true, data: [], count: 0 });
          return;
        }
        if (req.url?.startsWith('/api/evidencias')) {
          synthetic({ success: true, data: [], count: 0 });
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const mockEnabled = env.VITE_MOCK_API === '1' || process.env.VITE_MOCK_API === '1';

  return {
    plugins: [react(), ...(mockEnabled ? [mockApi()] : [])],
    server: {
      // Riesgo #57 (ADR-028): binding conservador por defecto — 0.0.0.0 solo
      // explícito (HOST=0.0.0.0 en Codespace/sandbox si se necesita).
      host: process.env.HOST ?? 'localhost',
      port: 3000,
      // allowedHosts solo en entornos que lo declaran: Codespace detectado
      // automáticamente (variable CODESPACE) o ALLOWED_HOSTS=true explícito.
      allowedHosts: process.env.ALLOWED_HOSTS === 'true' || !!process.env.CODESPACE,
      proxy: {
        '/api': {
          target: process.env.API_URL ?? env.API_URL ?? 'http://localhost:3000',
          changeOrigin: true,
          // sin rewrite: identidad 1:1 con las rutas /api/* del backend (riesgo #53)
        },
      },
    },
  };
});
