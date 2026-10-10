/**
 * DELocalSoy.AR — Cliente tipado del Contrato de Sistema (Backend ↔ Frontend).
 *
 * PROCEDENCIA (R4/R12 — renombre acreditado, divulgado):
 * Este módulo fue aterrizado originalmente en main (PR #116) como
 * `lib/systemContract.ts` — NOMBRE INFERIDO por [agent: vibe] en aquel entonces.
 * El import `from '../lib/apiClient'` del componente RecursiveProspectiveContractPanel
 * (lote M26 del staging) ACREDITA que el nombre real del árbol de staging es
 * `lib/apiClient.ts`. El cuerpo del módulo es byte-idéntico al aterrizado en
 * PR #116; solo cambia el nombre de archivo y este encabezado de procedencia.
 * `lib/systemContract.ts` queda como shim de re-export para cualquier consumidor
 * del nombre anterior.
 */

export interface PrismaModelDiagnostic {
  name: string;
  horizon: string;
  recordsCount: number;
  status: 'synchronized' | 'drift';
  role?: string;
}

export interface EndpointDiagnostic {
  method: string;
  path: string;
  horizon: string;
  evidence: string;
  status: 'ok' | 'degraded';
  description?: string;
}

export interface DocAlignmentDiagnostic {
  docPath: string;
  topic: string;
  aligned: boolean;
}

export interface SystemContractPayload {
  version: string;
  architectureTrack: string;
  contractDigestSha256: string;
  verifiedAt: string;
  prismaModels: PrismaModelDiagnostic[];
  endpoints: EndpointDiagnostic[];
  docsAlignment: DocAlignmentDiagnostic[];
}

export interface ApiProbeResult {
  endpoint: string;
  httpStatus: number;
  latencyMs: number;
  ok: boolean;
  timestamp: string;
}

/**
 * Cliente tipado para la integración Backend ↔ Frontend de DELocalSoy.AR.
 */
export async function fetchSystemContract(): Promise<{
  contract: SystemContractPayload;
  latencyMs: number;
}> {
  const t0 = performance.now();
  const res = await fetch('/api/contrato-sistema');
  const latencyMs = Math.max(1, Math.round(performance.now() - t0));
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} al consultar /api/contrato-sistema`);
  }
  const json = (await res.json()) as {
    success: boolean;
    data: SystemContractPayload;
  };
  return {
    contract: json.data,
    latencyMs,
  };
}

export async function runFullStackParityVerification(): Promise<{
  message: string;
  parityHash: string;
  latencyMs: number;
}> {
  const t0 = performance.now();
  const res = await fetch('/api/contrato-sistema/verificar', {
    method: 'POST',
  });
  const latencyMs = Math.max(1, Math.round(performance.now() - t0));
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} en verificación de paridad`);
  }
  const json = (await res.json()) as {
    success: boolean;
    message: string;
    parityHash: string;
  };
  return {
    message: json.message,
    parityHash: json.parityHash,
    latencyMs,
  };
}

export async function probeCoreEndpoints(): Promise<ApiProbeResult[]> {
  const targets = [
    '/api/health',
    '/api/territorios',
    '/api/modelo-federado',
    '/api/evidencias',
    '/api/contrato-sistema',
  ];

  const results: ApiProbeResult[] = [];
  for (const endpoint of targets) {
    const t0 = performance.now();
    try {
      const res = await fetch(endpoint);
      const latencyMs = Math.max(1, Math.round(performance.now() - t0));
      results.push({
        endpoint,
        httpStatus: res.status,
        latencyMs,
        ok: res.ok,
        timestamp: new Date().toISOString(),
      });
    } catch {
      const latencyMs = Math.max(1, Math.round(performance.now() - t0));
      results.push({
        endpoint,
        httpStatus: 0,
        latencyMs,
        ok: false,
        timestamp: new Date().toISOString(),
      });
    }
  }
  return results;
}
