import { createApp } from './app.js';
import { logJson } from './logger.js';

// Riesgo #57 (ADR-028): binding conservador por defecto. HOST desde env —
// 0.0.0.0 SOLO explícito (p.ej. Codespace/sandbox: HOST=0.0.0.0). Sin HOST,
// el servidor no escucha en interfaces externas (criterio del issue).
const HOST = process.env.HOST ?? '127.0.0.1';
const PORT = Number(process.env.PORT ?? 3000);
const app = createApp();

app.listen(PORT, HOST, () => {
  logJson('info', 'api_escuchando', { host: HOST, port: PORT });
});
