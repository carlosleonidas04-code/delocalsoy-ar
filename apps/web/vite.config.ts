import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// La API Express (apps/api) escucha en http://localhost:3000 por defecto.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.API_URL ?? 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
