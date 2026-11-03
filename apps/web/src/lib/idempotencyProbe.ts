import { ApiDataSource, DataSourceHttpError, SyntheticDataSource } from './dataSource';

/**
 * Sonda de idempotencia y propagación de errores (EV-005 · R5) — extraída 1:1
 * desde App.tsx (FE-DEUDA-02 #293, corte 23): mismo cuerpo verbatim; ahora es
 * función pura que devuelve el string de resultado. App retiene el estado.
 */
export async function runIdempotencyAndErrorProbe(): Promise<string> {
  const syn = new SyntheticDataSource();
  const first = await syn.emitEvent({
    type: 'demo.probe_ev005',
    nodeId: 'capital',
    payload: { check: 'idempotencia-ev005', cycle: 'post-core-002' },
  });
  const second = await syn.emitEvent({
    type: 'demo.probe_ev005',
    nodeId: 'capital',
    payload: { check: 'idempotencia-ev005', cycle: 'post-core-002' },
  });
  const degradedApi = new ApiDataSource({
    fetchImpl: async () =>
      new Response(JSON.stringify({ error: '503 Base de datos desconectada' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }),
  });
  let propagated503 = false;
  try {
    await degradedApi.listTerritories();
  } catch (e) {
    propagated503 = e instanceof DataSourceHttpError && e.status === 503;
  }
  return (
    `1er insert: ${first.status} (${first.id}) · 2do insert: ${second.status} (mismo id=${first.id === second.id}, hash=${first.hash.slice(0, 12)}…) · 503 propagado sin []: ${propagated503 ? 'SÍ (R5 OK)' : 'NO'}`
  );
}
