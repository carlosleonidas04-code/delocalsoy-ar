// Patrones de PII argentina (ADR-027) — módulo compartido (CORE-004 R5b, #87).
// La política anti-PII es de la API, no de una ruta: la ingesta de eventos
// (events.ts) y la escritura ciudadana de activos (activos.ts) aplican los
// MISMOS patrones. Extracción literal desde routes/events.ts — sin cambio de
// comportamiento: events-anti-pii.test.ts sigue verificando la ingesta.

const PII_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: 'CUIT/CUIL', regex: /\b\d{2}-\d{8}-\d\b/ },
  { name: 'DNI', regex: /\b\d{1,2}\.?\d{3}\.?\d{3}\b/ },
  { name: 'email', regex: /[\w.+-]+@[\w-]+\.[\w.-]+/ },
  { name: 'teléfono AR', regex: /\+54[\d\s().-]{8,}|\b011[\d\s().-]{8,}/ },
];

/**
 * Detecta PII argentina en un texto serializado (ADR-020 cond. 1, Ley 25.326).
 * Devuelve el nombre del patrón detectado o null. El llamador responde con un
 * mensaje genérico: nunca repite el valor sospechoso en la respuesta ni en
 * stdout — el rechazo es ANTES de persistir y sin eco del valor.
 */
export function detectaPII(serialized: string): string | null {
  for (const patron of PII_PATTERNS) {
    if (patron.regex.test(serialized)) return patron.name;
  }
  return null;
}
