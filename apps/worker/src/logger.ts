// M1 observabilidad (#288): logs JSON estructurados del worker — una linea
// por evento a stdout, 0 dependencias (D4 ratificado: JSON siempre). Los
// campos de las pasadas son contadores agregados (processed/repeated/
// discarded/errors) — sin PII (ADR-027/Ley 25.326). Observabilidad efimera:
// events_raw sigue siendo la unica fuente de verdad (ADR-032).

export type LogLevel = 'info' | 'error';

export function logJson(level: LogLevel, msg: string, fields: Record<string, unknown> = {}): void {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, source: 'worker', msg, ...fields });
  if (level === 'error') {
    console.error(line);
  } else {
    console.log(line);
  }
}
