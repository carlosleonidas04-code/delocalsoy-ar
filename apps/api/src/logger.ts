// M1 observabilidad (#288): logs JSON estructurados — una linea por evento a
// stdout, 0 dependencias (D4 ratificado DH 2026-10-30: JSON siempre, sin modo
// texto v1). Anti-PII (ADR-027/Ley 25.326): este modulo nunca loguea cuerpos,
// queries, emails ni tokens — quien lo llama decide los campos, y el middleware
// de app.ts solo pasa metodo, path (SIN query string), status y duracion.
// Los logs son observabilidad efimera de operacion: NO sustituyen a events_raw
// (unica fuente de verdad, ADR-032).

export type LogLevel = 'info' | 'warn' | 'error';

export function logJson(level: LogLevel, msg: string, fields: Record<string, unknown> = {}): void {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, msg, ...fields });
  if (level === 'error') {
    console.error(line);
  } else {
    console.log(line);
  }
}

export function levelForStatus(status: number): LogLevel {
  if (status >= 500) return 'error';
  if (status >= 400) return 'warn';
  return 'info';
}
