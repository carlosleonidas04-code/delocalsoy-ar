import { useState } from 'react';
import type { EvidenciaRecord, RawEventRecord } from '../data/federatedModel';

interface TraceabilityAndEvidenciasPanelProps {
  eventsRaw: RawEventRecord[];
  evidencias: EvidenciaRecord[];
  onTestDuplicateHashIdempotency: () => Promise<string>;
  onVerifyEvidencia: (code: string) => Promise<void>;
}

const UPSTREAM_MAIN_OK_CODES = new Set(['EV-003', 'EV-006']);

export function TraceabilityAndEvidenciasPanel({
  eventsRaw,
  evidencias,
  onTestDuplicateHashIdempotency,
  onVerifyEvidencia,
}: TraceabilityAndEvidenciasPanelProps) {
  const [idempotencyLog, setIdempotencyLog] = useState<string | null>(null);
  const [testingIdempotency, setTestingIdempotency] = useState(false);

  const handleRunIdempotencyCheck = async () => {
    setTestingIdempotency(true);
    try {
      const msg = await onTestDuplicateHashIdempotency();
      setIdempotencyLog(msg);
    } finally {
      setTestingIdempotency(false);
    }
  };

  const okInMainCount = evidencias.filter((e) =>
    UPSTREAM_MAIN_OK_CODES.has(e.code),
  ).length;
  const verifiedInStagingCount = evidencias.filter(
    (e) => e.status === 'ok' && !UPSTREAM_MAIN_OK_CODES.has(e.code),
  ).length;
  const pendingLandingCount = evidencias.filter(
    (e) => !UPSTREAM_MAIN_OK_CODES.has(e.code),
  ).length;

  return (
    <section id="trazabilidad-hitub" className="card" data-state="ok">
      <div className="section-header">
        <div>
          <span className="kicker-text">
            03. Gobernanza HITUB, Regla R4 &amp; ADR-015 · Re-base Honesto de Evidencias (v7.4)
          </span>
          <h2>
            Trazabilidad Append-Only (events_raw) y Estado Real de Evidencias (main vs staging PRs)
          </h2>
          <p className="section-caption">
            <strong>Honestidad epistémica (R4):</strong> Ninguna evidencia se declara cerrada en{' '}
            <code>main</code> sin su PR fusionado y run de CI enlazado. Aquí se distingue lo ya
            fusionado en <code>main @ 68a8872</code> (<strong>2/6 EV ok</strong>) de las{' '}
            <strong>{pendingLandingCount} evidencias en staging</strong> (<code>agent-google/*</code>)
            pendientes de aterrizaje por PR.
          </p>
        </div>
        <button
          type="button"
          className="btn-confirm"
          onClick={() => void handleRunIdempotencyCheck()}
          disabled={testingIdempotency}
        >
          {testingIdempotency
            ? 'Verificando idempotencia…'
            : 'Probar rechazo de hash duplicado (EV-005)'}
        </button>
      </div>

      {/* Cinta de Estado Re-basado: main @ 68a8872 vs Ramas de Aterrizaje agent-google/* */}
      <div
        className="quarters-summary-strip tabular-nums"
        style={{ marginBottom: '0.9rem' }}
      >
        <div className="quarter-summary-cell">
          <div className="quarter-cell-title">En GitHub main (commit 68a8872)</div>
          <div className="territory-meta">
            <strong style={{ color: '#2e9e5b' }}>{okInMainCount}/6 EV ok</strong> · CI run{' '}
            <code>37098706368</code> (<code>EV-003</code>, <code>EV-006</code>)
          </div>
        </div>
        <div className="quarter-summary-cell">
          <div className="quarter-cell-title">Pendientes de Aterrizaje en PR (R11)</div>
          <div className="territory-meta">
            <strong style={{ color: '#d99b26' }}>
              {pendingLandingCount} evidencias
            </strong>{' '}
            en ramas <code>agent-google/*</code>
          </div>
        </div>
        <div className="quarter-summary-cell">
          <div className="quarter-cell-title">Verificadas en Sesión Staging Local</div>
          <div className="territory-meta">
            <strong style={{ color: '#38bdf8' }}>
              {verifiedInStagingCount} ejecutadas hoy
            </strong>{' '}
            (listas para auditoría de <code>agent-vibe</code>)
          </div>
        </div>
        <div className="quarter-summary-cell">
          <div className="quarter-cell-title">Rol de AI Studio (ADR-015)</div>
          <div className="territory-meta">
            <strong>Cliente Consumidor del Contrato API</strong> · No plataforma paralela
          </div>
        </div>
      </div>

      {idempotencyLog && (
        <pre className="idempotency-log">{idempotencyLog}</pre>
      )}

      <div className="trace-evidencias-grid">
        {/* Columna 1: Registro Re-basado de Evidencias (EV-001 a EV-018) */}
        <div>
          <div className="tiny-label">
            Registro de evidencias ejecutables (EV-001 a EV-018 · Re-basado bajo Regla R4)
          </div>
          <ul className="territory-list">
            {evidencias.map((ev) => {
              const isMergedInMain = UPSTREAM_MAIN_OK_CODES.has(ev.code);
              const isVerifiedInStaging = ev.status === 'ok' && !isMergedInMain;
              const prBranch =
                (ev.result as Record<string, unknown> | null)?.pr_branch as
                  | string
                  | undefined;

              return (
                <li key={ev.code} className="territory-item">
                  <div className="territory-info">
                    <span className="territory-name">
                      <code>{ev.code}</code> — {ev.title}
                    </span>
                    <span className="territory-meta tabular-nums">
                      Estado en <code>main</code>:{' '}
                      {isMergedInMain ? (
                        <strong style={{ color: '#2e9e5b' }}>
                          ✓ OK en main (CI run #37098706368 · PR #7)
                        </strong>
                      ) : isVerifiedInStaging ? (
                        <strong style={{ color: '#38bdf8' }}>
                          ● Verificada en staging local · Pendiente de aterrizaje en PR a main
                        </strong>
                      ) : (
                        <strong style={{ color: '#d99b26' }}>
                          ⧗ Pendiente de aterrizaje en PR a main
                        </strong>
                      )}
                      {prBranch && (
                        <>
                          {' '}
                          · Rama: <code>{prBranch}</code>
                        </>
                      )}
                    </span>
                    {ev.result && (
                      <span className="territory-meta">
                        Evidencia / Metadatos: <code>{JSON.stringify(ev.result)}</code>
                      </span>
                    )}
                  </div>
                  <div className="territory-actions">
                    {!isMergedInMain && !isVerifiedInStaging && (
                      <button
                        type="button"
                        className="btn-toggle"
                        onClick={() => void onVerifyEvidencia(ev.code)}
                        title="Ejecutar prueba en entorno de staging local antes de abrir PR"
                      >
                        Probar en staging
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Columna 2: Libro Mayor Append-Only events_raw */}
        <div>
          <div className="tiny-label tabular-nums">
            Libro mayor append-only · events_raw ({eventsRaw.length} eventos registrados)
          </div>
          <div className="events-stream">
            {eventsRaw.map((ev) => (
              <div key={ev.id} className="event-row">
                <div className="event-row-top">
                  <strong className="event-type">{ev.type}</strong>
                  <code>hash: {ev.hash}</code>
                </div>
                <div className="event-row-meta tabular-nums">
                  <span>id: {ev.id}</span>
                  <span aria-hidden="true">·</span>
                  <span>nodo: {ev.nodeId}</span>
                  <span aria-hidden="true">·</span>
                  <span>{new Date(ev.occurred_at).toLocaleTimeString('es-AR')}</span>
                </div>
                <pre className="event-payload">
                  {JSON.stringify(ev.payload)}
                </pre>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
