import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api, type Evidencia } from './api';

type HealthState =
  | { status: 'checking' }
  | { status: 'ok' }
  | { status: 'error'; message: string };

type Tab = 'integracion' | 'evidencias';

function BadgeEstado({ estado }: { estado: string }) {
  const variant = estado === 'ok' ? 'ok' : estado === 'fallido' ? 'fail' : 'pend';
  return <span className={'badge ' + variant}>{estado}</span>;
}

export function App() {
  const [tab, setTab] = useState<Tab>('integracion');
  const [health, setHealth] = useState<HealthState>({ status: 'checking' });

  const [evidencias, setEvidencias] = useState<Evidencia[] | null>(null);
  const [evidenciasError, setEvidenciasError] = useState<string | null>(null);

  const [eventoType, setEventoType] = useState('');
  const [eventoPayload, setEventoPayload] = useState('{}');
  const [eventoResultado, setEventoResultado] = useState<string | null>(null);

  useEffect(() => {
    api.health().then(() => setHealth({ status: 'ok' })).catch((e: Error) => setHealth({ status: 'error', message: e.message }));
  }, []);

  const cargarEvidencias = useCallback(async () => {
    setEvidencias(null);
    setEvidenciasError(null);
    try {
      const data = await api.evidencias();
      setEvidencias(data.evidencias);
    } catch (e) {
      setEvidenciasError(e instanceof Error ? e.message : 'error desconocido');
    }
  }, []);

  useEffect(() => {
    if (tab === 'evidencias' && evidencias === null && evidenciasError === null) void cargarEvidencias();
  }, [tab, evidencias, evidenciasError, cargarEvidencias]);

  const emitirEvento = async (ev: FormEvent) => {
    ev.preventDefault();
    setEventoResultado(null);
    let payload: unknown;
    try {
      payload = JSON.parse(eventoPayload || '{}');
    } catch {
      setEventoResultado('❌ Payload no es JSON válido');
      return;
    }
    try {
      const r = await api.emitirEvento(eventoType.trim(), payload);
      setEventoResultado(
        r.status === 'creado'
          ? '✅ Evento creado (' + r.event.type + ') — hash ' + r.event.hash.slice(0, 12) + '…'
          : '♻️ Evento duplicado (' + r.event.type + ') — idempotencia confirmada',
      );
    } catch (e) {
      setEventoResultado('❌ ' + (e instanceof Error ? e.message : 'error desconocido'));
    }
  };

  return (
    <main className="container">
      <header>
        <h1>DELocalSoy.AR</h1>
        <p className="subtitle">Territorio · Software · Metodología — HITUB</p>
      </header>

      <nav className="tabs">
        <button className={tab === 'integracion' ? 'active' : ''} onClick={() => setTab('integracion')}>Integración</button>
        <button className={tab === 'evidencias' ? 'active' : ''} onClick={() => setTab('evidencias')}>Evidencias</button>
      </nav>

      {tab === 'integracion' && (
        <section className="card" data-state={health.status}>
          <h2>Estado de la integración</h2>
          {health.status === 'checking' && <p>Consultando <code>/api/health</code>…</p>}
          {health.status === 'ok' && <p className="ok">✅ API conectada</p>}
          {health.status === 'error' && (
            <>
              <p className="error">❌ Sin conexión con la API</p>
              <pre>{health.message}</pre>
            </>
          )}
        </section>
      )}

      {tab === 'evidencias' && (
        <>
          <section className="card">
            <h2>Registro de evidencias (EV-xxx)</h2>
            {evidenciasError && <p className="error">❌ {evidenciasError}</p>}
            {!evidencias && !evidenciasError && <p>Cargando…</p>}
            {evidencias && evidencias.length === 0 && (
              <p className="hint">Sin evidencias registradas todavía. Sembrá datos en la tabla <code>evidencias</code> para verlas acá.</p>
            )}
            {evidencias && evidencias.length > 0 && (
              <table>
                <thead>
                  <tr><th>Código</th><th>Título</th><th>Estado</th></tr>
                </thead>
                <tbody>
                  {evidencias.map((e) => (
                    <tr key={e.id}>
                      <td><code>{e.code}</code></td>
                      <td>{e.title}</td>
                      <td><BadgeEstado estado={String(e.status)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <button className="secondary" onClick={() => void cargarEvidencias()}>Actualizar</button>
          </section>

          <section className="card">
            <h2>Emitir evento crudo (append-only)</h2>
            <form onSubmit={(e) => void emitirEvento(e)} className="form">
              <label>
                type
                <input value={eventoType} onChange={(e) => setEventoType(e.target.value)} placeholder="e.g. territorio.evento.demo" required />
              </label>
              <label>
                payload (JSON)
                <textarea rows={4} value={eventoPayload} onChange={(e) => setEventoPayload(e.target.value)} />
              </label>
              <button type="submit">Enviar POST /api/events</button>
            </form>
            {eventoResultado && <pre>{eventoResultado}</pre>}
            <p className="hint">El mismo type + timestamp + payload produce el mismo hash → el backend responde "duplicado" sin insertar dos veces.</p>
          </section>
        </>
      )}

      <footer>
        <p>Monorepo Track A v7.1 — <code>apps/web</code> · <code>apps/api</code> · <code>packages/db</code></p>
      </footer>
    </main>
  );
}
