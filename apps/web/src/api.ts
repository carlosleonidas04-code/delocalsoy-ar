const BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    let detail = 'HTTP ' + res.status;
    try {
      const body = await res.json();
      if (body?.detail) detail = String(body.detail);
    } catch { /* sin cuerpo */ }
    throw new Error(detail);
  }
  return res.json();
}

export interface Evidencia {
  id: string;
  code: string;
  title: string;
  status: string;
  [k: string]: unknown;
}

export interface EventoCrudo {
  id: string;
  type: string;
  hash: string;
  occurred_at: string;
  ingested_at: string;
  payload: unknown;
}

export const api = {
  health: () => request<unknown>('/health'),
  evidencias: () => request<{ count: number; evidencias: Evidencia[] }>('/evidencias'),
  emitirEvento: (type: string, payload: unknown) =>
    request<{ status: string; event: EventoCrudo }>('/events', {
      method: 'POST',
      body: JSON.stringify({ type, payload }),
    }),
};
