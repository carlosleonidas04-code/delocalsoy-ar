/**
 * DELocalSoy.AR — Server WebSocket live-ws del dev server (voz en tiempo real
 * con gemini-3.8-live, Live API) — FE-DEUDA-03 #294.
 *
 * Extraído 1:1 de vite.config.ts (refactor puro, sin cambio de comportamiento).
 * Conserva TODAS las puertas del gate R12 #236 / M29 (ver liveWsGate.ts y su
 * suite): Origin allowlist, token fail-closed 503 sin LIVE_WS_TOKEN (R15),
 * límite de conexiones concurrentes por IP, límite de frames/min y bytes por
 * frame (maxPayload de ws).
 */
import { WebSocketServer } from 'ws';
import type { ViteDevServer } from 'vite';
import { Modality, type LiveServerMessage } from '@google/genai';
import { createServerGeminiClient, ETHICAL_ROLE_SYSTEM_INSTRUCTIONS } from './geminiLiveClient';
import {
  configLiveWsDesdeEnv,
  esRutaLiveWs,
  evaluarFrame,
  extraerTokenPresentado,
  validarClientesPorIp,
  validarOrigin,
  validarTokenLiveWs,
} from './liveWsGate';

export function montarLiveWs(server: ViteDevServer): void {
  // WebSocket Server para Conversaciones de Voz en Tiempo Real con gemini-3.8-live (Live API)
  // R12 #123 (decision DH 2026-10-17: "gate de auth + rate limit en el upgrade"): el upgrade
  // de live-ws ya NO es anonimo. Origin allowlist + token de sesion (fail-closed: sin
  // LIVE_WS_TOKEN configurado se rechaza todo upgrade) + limites por IP (conexiones
  // concurrentes, frames/min y bytes por frame) segun el HANDOFF M29 del lote live-ws
  // de [agent: google] (Origin + Bearer + 45 frames/min + 64 KB/frame).
  if (server.httpServer) {
    const LIVE_WS = configLiveWsDesdeEnv();
    const wsClientsByIp = new Map<string, Set<any>>();
    const wsFrameTimesByIp = new Map<string, number[]>();

    const wsReject = (socket: any, statusCode: number, reason: string) => {
      try {
        socket.write(
          `HTTP/1.1 ${statusCode} ${reason}\r\n` +
            'Connection: close\r\n' +
            'Content-Type: application/json\r\n' +
            '\r\n' +
            JSON.stringify({ success: false, error: `live-ws: ${reason}` }),
        );
      } catch {
        // socket ya cerrado
      }
      try {
        socket.destroy();
      } catch {
        // socket ya destruido
      }
    };

    const wss = new WebSocketServer({ noServer: true, maxPayload: LIVE_WS.maxFrameBytes });
    server.httpServer.on('upgrade', (request, socket, head) => {
      const reqUrl = request.url || '';
      if (!esRutaLiveWs(reqUrl)) {
        return; // upgrade de otra ruta: no gestionada aqui (comportamiento previo)
      }
      const wsIp = request.socket.remoteAddress || 'unknown';
      // 1) Origin allowlist (M29)
      const veredictoOrigin = validarOrigin(request.headers.origin, LIVE_WS.allowedOrigins);
      if (!veredictoOrigin.ok) {
        wsReject(socket, veredictoOrigin.status, veredictoOrigin.reason);
        return;
      }
      // 2) Auth fail-closed (M29: Bearer o ?token=) - sin LIVE_WS_TOKEN la superficie queda cerrada (R15)
      const authHeader = request.headers.authorization || '';
      const tokenFromQuery = new URL(reqUrl, 'http://localhost:3000').searchParams.get('token');
      const veredictoToken = validarTokenLiveWs(
        LIVE_WS.token,
        extraerTokenPresentado(authHeader, tokenFromQuery),
      );
      if (!veredictoToken.ok) {
        wsReject(socket, veredictoToken.status, veredictoToken.reason);
        return;
      }
      // 3) Rate limit de conexiones concurrentes por IP
      const clientsOfIp = wsClientsByIp.get(wsIp) || new Set<any>();
      const veredictoClientes = validarClientesPorIp(clientsOfIp.size, LIVE_WS.maxClientsPerIp);
      if (!veredictoClientes.ok) {
        wsReject(socket, veredictoClientes.status, veredictoClientes.reason);
        return;
      }
      wss.handleUpgrade(request, socket, head, (wsClient) => {
        clientsOfIp.add(wsClient);
        wsClientsByIp.set(wsIp, clientsOfIp);
        wsClient.on('close', () => {
          clientsOfIp.delete(wsClient);
          if (clientsOfIp.size === 0) {
            wsClientsByIp.delete(wsIp);
          }
        });
        wss.emit('connection', wsClient, request);
      });
    });

    wss.on('connection', async (clientWs, upgradeRequest) => {
      // R12 #123: rate limit de frames por IP (M29 - 45 frames/min); el exceso cierra la sesion.
      const connIp = (upgradeRequest as any)?.socket?.remoteAddress || 'unknown';
      clientWs.on('message', () => {
        const nowMs = Date.now();
        const { permitido, ventana } = evaluarFrame(
          wsFrameTimesByIp.get(connIp) || [],
          nowMs,
          LIVE_WS.maxFramesPerMin,
        );
        if (!permitido) {
          try {
            clientWs.close(1008, 'rate limit de frames alcanzado');
          } catch {
            clientWs.terminate();
          }
          return;
        }
        ventana.push(nowMs);
        wsFrameTimesByIp.set(connIp, ventana);
      });
      const ai = createServerGeminiClient();
      if (!ai) {
        clientWs.send(
          JSON.stringify({
            type: 'status',
            mode: 'synthetic-explicit-r5',
            message:
              'Regla R5: Clave GEMINI_API_KEY pendiente de vincular en Settings > Secrets. Operando en modo voz asistida explícita con síntesis territorial.',
          }),
        );
        clientWs.on('message', (raw) => {
          try {
            const msg = JSON.parse(raw.toString());
            if (msg.text) {
              clientWs.send(
                JSON.stringify({
                  type: 'ethical_turn',
                  transcript: msg.text,
                  datoEmpirico: `Relevamiento oral recibido en sesión Live: "${msg.text}"`,
                  interpretacionContextual:
                    'Procesado bajo Regla R5 (modo sintético explícito mientras se vincula GEMINI_API_KEY para stream PCM 16kHz/24kHz de gemini-3.8-live).',
                  sugerenciaAccionable:
                    'Registrar en cola SECI territorial y someter a ratificación humana colegiada (requiresHumanReview: true).',
                  requiresHumanReview: true,
                }),
              );
            }
          } catch {
            // ignore malformed frame
          }
        });
        return;
      }

      try {
        const sessionPromise = ai.live.connect({
          model: 'gemini-3.8-live',
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Zephyr' },
              },
            },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            systemInstruction: ETHICAL_ROLE_SYSTEM_INSTRUCTIONS['hidro-cuenca'],
          },
          callbacks: {
            onmessage: (message: LiveServerMessage) => {
              const audio =
                message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
              const outText =
                (message.serverContent as any)?.outputTranscription?.text ||
                message.serverContent?.modelTurn?.parts?.find((p) => p.text)?.text;
              const inText = (message.serverContent as any)?.inputTranscription?.text;

              if (audio) {
                clientWs.send(JSON.stringify({ type: 'audio', audio }));
              }
              if (outText || inText) {
                clientWs.send(
                  JSON.stringify({
                    type: 'transcription',
                    inputTranscript: inText,
                    outputTranscript: outText,
                    requiresHumanReview: true,
                  }),
                );
              }
              if (message.serverContent?.interrupted) {
                clientWs.send(JSON.stringify({ type: 'interrupted', interrupted: true }));
              }
            },
          },
        });

        clientWs.send(
          JSON.stringify({
            type: 'status',
            mode: 'live-gemini-3.8',
            message: 'Conectado en tiempo real a gemini-3.8-live (PCM 16kHz -> 24kHz).',
          }),
        );

        clientWs.on('message', (data) => {
          try {
            const parsed = JSON.parse(data.toString());
            void sessionPromise.then((session) => {
              if (parsed.audio) {
                session.sendRealtimeInput({
                  audio: {
                    data: parsed.audio,
                    mimeType: 'audio/pcm;rate=16000',
                  },
                });
              } else if (parsed.text) {
                session.sendRealtimeInput({
                  text: String(parsed.text),
                });
              }
            });
          } catch {
            // ignore frame error
          }
        });

        clientWs.on('close', () => {
          void sessionPromise
            .then((session) => session.close())
            .catch(() => undefined);
        });
      } catch (err) {
        clientWs.send(
          JSON.stringify({
            type: 'error',
            message: err instanceof Error ? err.message : 'Error al iniciar sesión gemini-3.8-live',
          }),
        );
      }
    });
  }
}
