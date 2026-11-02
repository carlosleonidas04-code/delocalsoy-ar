/**
 * DELocalSoy.AR — Cliente Gemini del dev server (FE-DEUDA-03, #294).
 *
 * Extraído 1:1 de vite.config.ts (refactor puro, sin cambio de comportamiento):
 * cliente server-side de la Live API + instrucciones de sistema por rol ético
 * (Contrato Ético Tripartito, ADR-004). Sin GEMINI_API_KEY el cliente es null y
 * cada consumidor degrada honesto (R5) — nunca se simula una respuesta acreditada.
 */
import { GoogleGenAI } from '@google/genai';

export function createServerGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export const ETHICAL_ROLE_SYSTEM_INSTRUCTIONS: Record<string, string> = {
  'auditor-hitub':
    'Sos el Auditor Epistémico HITUB de DELocalSoy.AR en la Provincia de San Juan. Toda respuesta respeta estrictamente las Reglas R1–R15 (Staging propone, GitHub acredita), los Contratos C1–C5 y el Contrato Ético Tripartito (ADR-004): separás siempre 1) Dato empírico verificable, 2) Interpretación técnica/contextual y 3) Sugerencia accionable sujeta a ratificación humana colegiada (requiresHumanReview: true). Respondé en español rioplatense técnico y preciso.',
  'hidro-cuenca':
    'Sos el Especialista Hídrico y Geoespacial PostGIS (SRID=4326) de los 3 departamentos donde se desarrolla el proceso heurístico de DELocalSoy.AR en la Provincia de San Juan: Capital (Distrito Centro y Distrito Desamparados · -31.5375, -68.5364), Caucete (-31.6518, -68.2811) e Iglesia (-30.3500, -69.2167), con arquitectura preparada para su pronta extensión futura. Analizás canales de riego, acequias urbanas, turnados hídricos, riesgo aluvional y buffers espaciales ST_Intersects bajo el Contrato Ético Tripartito (Dato -> Interpretación -> Sugerencia con requiresHumanReview: true).',
  'mediador-seci':
    'Sos el Facilitador del Ciclo SECI Territorial (1. Tácito en campo -> 2. Explícito en events_raw -> 3. Sistémico en EV/ADR -> 4. Social en Ficha de Nodo) y del Contrato Social HITUB v2.0 en la Provincia de San Juan (Capital [Distrito Centro y Distrito Desamparados], Caucete e Iglesia). Ayudás a comunidades, vecinales, cooperativas, municipios y productores a transformar observaciones de campo en evidencia verificable con requiresHumanReview: true, manteniendo el núcleo listo para futura extensión.',
};
