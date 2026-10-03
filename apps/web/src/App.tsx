import { useEffect, useState } from 'react';

type HealthState =
  | { status: 'checking' }
  | { status: 'ok'; body: string }
  | { status: 'error'; message: string };

/**
 * App base de DELocalSoy.AR.
 * Verifica la integración backend<->frontend consultando /api/health
 * (proxy de Vite hacia apps/api).
 */
export function App() {
  const [health, setHealth] = useState<HealthState>({ status: 'checking' });

  useEffect(() => {
    fetch('/api/health')
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((body) => setHealth({ status: 'ok', body }))
      .catch((err: Error) => setHealth({ status: 'error', message: err.message }));
  }, []);

  return (
    <main className="container">
      <header>
        <h1>DELocalSoy.AR</h1>
        <p className="subtitle">Territorio · Software · Metodología — HITUB</p>
      </header>

      <section className="card" data-state={health.status}>
        <h2>Estado de la integración</h2>
        {health.status === 'checking' && <p>Consultando <code>/api/health</code>…</p>}
        {health.status === 'ok' && (
          <>
            <p className="ok">✅ API conectada</p>
            <pre>{health.body}</pre>
          </>
        )}
        {health.status === 'error' && (
          <>
            <p className="error">❌ Sin conexión con la API</p>
            <pre>{health.message}</pre>
            <p className="hint">
              Levantá el backend con <code>pnpm --filter @delocalsoy/api dev</code>
            </p>
          </>
        )}
      </section>

      <footer>
        <p>Monorepo Track A v7.1 — <code>apps/web</code> (Vite + React + TS)</p>
      </footer>
    </main>
  );
}
