/**
 * DELocalSoy.AR — Sección aislada /demo (#16, #17, #18): contrato DataSource y
 * auditoría EV-007..EV-018 — FE-DEUDA-02 #293 (primer corte de desmonolitización).
 *
 * Extraída 1:1 de App.tsx (refactor puro, sin cambio de comportamiento): mismos
 * 4 orígenes operativos, misma tabla de issues, misma auditoría y mismo corte
 * documental. El estado compartido y los handlers viven en App y se acoplan
 * por props; las constantes de auditoría (DEMO_ISOLATION_ISSUES,
 * EV_007_TO_018_AUDIT_MATRIX) son de este módulo (solo se consumen aquí).
 */
import {
  DEMO_ISOLATION_ISSUES,
  EV_007_TO_018_AUDIT_MATRIX,
} from '../lib/ev007To018Audit';

export interface DemoDataSourceAuditSectionProps {
  useSyntheticInDemo: boolean;
  onToggleSyntheticInDemo: () => void;
  onRunIdempotencyAndErrorProbe: () => void | Promise<void>;
  idempotencyProbeResult: string | null;
  operationalOriginLabel: string;
}

export function DemoDataSourceAuditSection({
  useSyntheticInDemo,
  onToggleSyntheticInDemo,
  onRunIdempotencyAndErrorProbe,
  idempotencyProbeResult,
  operationalOriginLabel,
}: DemoDataSourceAuditSectionProps) {
  return (
    <section
      id="demo-datasource-audit"
      className="card"
      data-state="ok"
    >
      <div className="section-header">
        <div>
          <span className="kicker-text">
            Ciclo Post-CORE-002 (`main @ e3616b5`) · Aislamiento `/demo` (`#16, #17, #18`) + Contrato `DataSource` + Revisión `EV-007..EV-018`
          </span>
          <h2>
            Separación Estricta de Orígenes Operativos (`API real` · `API degradada` · `API sintética` · `Demo local`)
          </h2>
        </div>
        <div className="territory-actions">
          <button
            type="button"
            onClick={onToggleSyntheticInDemo}
            className={useSyntheticInDemo ? 'btn-filter active' : 'btn-toggle'}
          >
            {useSyntheticInDemo
              ? 'Desactivar Fuente Sintética (Volver a ApiDataSource /api/*)'
              : 'Probar SyntheticDataSource (Simular VITE_MOCK_API=1)'}
          </button>
          <button
            type="button"
            onClick={() => void onRunIdempotencyAndErrorProbe()}
            className="btn-confirm"
          >
            Verificar EV-005 Idempotencia + No-[] en 503 (R5)
          </button>
        </div>
      </div>

      {idempotencyProbeResult && (
        <div
          className="r5-state-badge r5-state-verificado tabular-nums"
          style={{
            display: 'block',
            padding: '0.6rem 0.85rem',
            marginBottom: '0.85rem',
            fontFamily: 'var(--font-mono)',
          }}
        >
          ✅ {idempotencyProbeResult}
        </div>
      )}

      {/* 4 Orígenes Operativos Explícitos (Paso 3) */}
      <div className="coco-baba-triage-grid">
        {(
          [
            {
              label: 'API real',
              desc: 'ApiDataSource conectado a /api/* con PostGIS real y modo persistido en events_raw (#58).',
            },
            {
              label: 'API degradada',
              desc: 'HTTP 503 o sin DB conectada: se muestra estado degraded explícito, jamás [] silencioso (R5).',
            },
            {
              label: 'API sintética',
              desc: 'SyntheticDataSource activo únicamente con VITE_MOCK_API=1 y banner de advertencia obligatorio.',
            },
            {
              label: 'Demo local',
              desc: 'Encapsulado bajo la ruta /demo (#16–#18) sin alterar ni simular evidencia de producción.',
            },
          ] as const
        ).map((orig) => {
          const isCurrent = operationalOriginLabel === orig.label;
          return (
            <div
              key={orig.label}
              className="coco-baba-triage-card"
              style={
                isCurrent
                  ? {
                      borderColor: 'var(--brand-primary)',
                      boxShadow: 'var(--shadow-sm)',
                    }
                  : undefined
              }
            >
              <div className="event-row-top">
                <strong>{orig.label}</strong>
                {isCurrent && (
                  <span className="r5-state-badge r5-state-publicado">
                    ACTIVO
                  </span>
                )}
              </div>
              <p className="territory-meta" style={{ marginTop: '0.35rem', marginBottom: 0 }}>
                {orig.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* Tabla de Issues #16, #17, #18 */}
      <div className="coco-baba-triage-grid" style={{ marginTop: '0.85rem' }}>
        {DEMO_ISOLATION_ISSUES.map((item) => (
          <div key={item.issue} className="coco-baba-triage-card">
            <div className="event-row-top">
              <code>Issue {item.issue}</code>
              <span className="r5-state-badge r5-state-verificado">
                {item.status}
              </span>
            </div>
            <strong style={{ display: 'block', marginTop: '0.3rem' }}>
              {item.title}
            </strong>
            <p className="territory-meta" style={{ marginTop: '0.3rem', marginBottom: 0 }}>
              {item.isolationMechanism}
            </p>
          </div>
        ))}
      </div>

      {/* Auditoría 1 por 1 de EV-007 a EV-018 (Paso 8) */}
      <details className="audit-details-panel" style={{ marginTop: '0.85rem' }}>
        <summary className="audit-details-summary">
          Ver Auditoría Individual de `EV-007` a `EV-018` sobre `main @ e3616b5` (Paso 8 · 12 Evidencias revisadas 1 por 1)
        </summary>
        <div className="matrix-table-wrap" style={{ marginTop: '0.65rem' }}>
          <table className="demo-domain-matrix-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Horizonte</th>
                <th>En `main @ e3616b5`</th>
                <th>PR / Rama</th>
                <th>Clasificación Canónica</th>
                <th>Diagnóstico Verificado</th>
              </tr>
            </thead>
            <tbody>
              {EV_007_TO_018_AUDIT_MATRIX.map((row) => (
                <tr key={row.code}>
                  <td>
                    <code>{row.code}</code>
                  </td>
                  <td>{row.horizon}</td>
                  <td>{row.codeInMain ? '✅ Sí' : '⏳ Staging'}</td>
                  <td>
                    <code>{row.mergedPr ?? row.recoverableBranch ?? '—'}</code>
                  </td>
                  <td>
                    <span className="r5-state-badge r5-state-en_revision">
                      {row.classification}
                    </span>
                  </td>
                  <td className="territory-meta">{row.verificationTargetAndNotes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      {/* Corte Documental 07-10-2026 (76 nodos · 31 commits · 22 ramas) + Runbook de Dirección Humana */}
      <details className="audit-details-panel" style={{ marginTop: '0.65rem' }}>
        <summary className="audit-details-summary">
          Ver Corte Documental (`76 nodos · 31 commits · 22 ramas · main @ 1272e45 / d70cbc6 / e3616b5`) y Runbook Exclusivo de Dirección Humana
        </summary>
        <div className="coco-baba-triage-grid" style={{ marginTop: '0.65rem' }}>
          <div className="coco-baba-triage-card">
            <strong>Estado Consolidado del Monorepo (`delocalsoy-ar`)</strong>
            <ul className="territory-meta" style={{ marginTop: '0.4rem', paddingLeft: '1.1rem' }}>
              <li>
                <strong>Verdad Técnica Verificable:</strong> <code>CORE-001 6/6</code> (<code>caa573b</code>) + <code>CORE-002 6/6</code> (<code>PRs #69–#74</code>) + <code>EV-025</code> (<code>PRs #75–#76 @ e3616b5</code>) + <code>CORE-003</code> (<code>d70cbc6</code>).
              </li>
              <li>
                <strong>Tracker #51:</strong> 7/8 riesgos cerrados en código (<code>#52, #53, #54, #55, #57, #58, #59</code>); pendiente humano <code>#56</code> (ramas stale).
              </li>
              <li>
                <strong>Contrato DataSource:</strong> <code>apps/web/src/lib/ApiDataSource.ts</code> propaga <code>runtimeMode</code> (<code>X-DELocalSoy-Runtime-Mode</code> / <code>/api/health</code>) y captura <code>503, 401, 404, 422, 500</code> sin devolver <code>[]</code> (Regla R5).
              </li>
            </ul>
          </div>
          <div className="coco-baba-triage-card">
            <strong>Pendientes Exclusivos de Dirección Humana (No Duplicados por Agente)</strong>
            <pre className="demo-contract-json-pre" style={{ marginTop: '0.4rem', borderRadius: '6px' }}>
{`gh run list --branch main -L 5
gh secret set TERRITORIOS_API_KEY
gh secret set HEALTH_MODE_API_KEY
pnpm install && git status -sb`}
            </pre>
          </div>
        </div>
      </details>
    </section>
  );
}
