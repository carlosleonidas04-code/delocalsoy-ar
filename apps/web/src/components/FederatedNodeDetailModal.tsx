import { useEffect, useState } from 'react';
import type { Territorio } from '../App';
import {
  DOMAINS,
  REPORT_STATUS_META,
  STATUS_META,
  type FederalSovereigntyRecord,
  type SpatialGeometryRecord,
  type TerritorialReport,
  type TerritorioCategory,
  type TerritorioFeature,
  type TerritorioLayer,
} from '../data/federatedModel';
import {
  VerifiedAssetsGalleryView,
  type VisualCheckStatus,
} from './VerifiedAssetsGalleryView';
import {
  DriveReportExportModal,
  type DriveExportTarget,
} from './DriveReportExportModal';
import type { ExportReportTemplateKey } from './WorkspacePanel';

interface FederatedNodeDetailModalProps {
  territorio: Territorio | null;
  onClose: () => void;
  layers: TerritorioLayer[];
  categories: TerritorioCategory[];
  features: TerritorioFeature[];
  reports: TerritorialReport[];
  spatialGeometries: SpatialGeometryRecord[];
  sovereigntyRecord: FederalSovereigntyRecord | null;
  onAdvanceReport: (reportId: string) => Promise<void>;
  onToggleNodeSovereignty: (nodeKey: string) => Promise<void>;
  onNavigateToExplorer: (nodeKey: string) => void;
  onFocusOnGoogleMap: (territorioId: string) => void;
  onVisualValidateAsset?: (
    featureId: string,
    visualState: VisualCheckStatus,
  ) => Promise<void>;
  onExportVerified?: (exportMeta: {
    channel: 'google-docs' | 'google-drive' | 'local-download';
    template: ExportReportTemplateKey;
    title: string;
    fileId?: string;
    webViewLink?: string;
  }) => Promise<void>;
}

const CUSTODIAN_LABELS: Record<string, string> = {
  community: 'Comunidad',
  institutions: 'Instituciones',
  businesses: 'Comercios / Productores',
};

export function FederatedNodeDetailModal({
  territorio,
  onClose,
  layers,
  categories,
  features,
  reports,
  spatialGeometries,
  sovereigntyRecord,
  onAdvanceReport,
  onToggleNodeSovereignty,
  onNavigateToExplorer,
  onFocusOnGoogleMap,
  onVisualValidateAsset,
  onExportVerified,
}: FederatedNodeDetailModalProps) {
  const [modalViewMode, setModalViewMode] = useState<'all' | 'gallery'>('all');
  const [driveExportTarget, setDriveExportTarget] =
    useState<DriveExportTarget | null>(null);

  useEffect(() => {
    if (!territorio) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [territorio, onClose]);

  if (!territorio) return null;

  const nodeFeatures = features.filter((f) => f.nodeKey === territorio.key);
  const verifiedAssetsCount = nodeFeatures.filter(
    (f) =>
      f.type === 'asset' &&
      (f.status === 'verified' || f.status === 'community_validated'),
  ).length;
  const nodeReports = reports.filter((r) => r.nodeKey === territorio.key);
  const activeReports = nodeReports.filter((r) => r.status !== 'resolved');
  const resolvedReports = nodeReports.filter((r) => r.status === 'resolved');
  const nodeGeometries = spatialGeometries.filter(
    (g) => g.nodeKey === territorio.key,
  );

  const sovereigntyMode =
    sovereigntyRecord?.sovereigntyMode ?? 'delegacion_revocable_activa';
  const isDelegated = sovereigntyMode === 'delegacion_revocable_activa';

  const getDomainLabel = (domainKey: string) =>
    DOMAINS.find((d) => d.key === domainKey)?.label ?? domainKey;

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="node-detail-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="modal-card node-detail-modal-card">
        {/* Cabecera del Modal */}
        <div className="section-header node-modal-header">
          <div>
            <div className="eyebrow-row">
              <span
                className="node-dot"
                style={{ backgroundColor: territorio.color || '#2e9e5b' }}
              />
              <span className="kicker-text">
                Ficha Integral de Nodo Federado · {territorio.provincia} · ID:{' '}
                <code>{territorio.id}</code>
              </span>
            </div>
            <h2 id="node-detail-modal-title" style={{ margin: '0.2rem 0 0' }}>
              {territorio.nombre}{' '}
              <span className="node-subtitle">
                · {territorio.subtitulo || 'Nodo Territorial Federado'}
              </span>
            </h2>
            <p className="section-caption" style={{ marginTop: '0.35rem' }}>
              {territorio.focusLong ||
                `Vocación territorial: ${territorio.foco || 'Relevamiento comunitario y activos locales'}.`}
            </p>
          </div>

          <div className="territory-actions">
            <div
              className="filter-group"
              role="tablist"
              aria-label="Modo de visualización de la ficha del nodo"
            >
              <button
                type="button"
                role="tab"
                aria-selected={modalViewMode === 'all'}
                className={
                  modalViewMode === 'all' ? 'btn-filter active' : 'btn-filter'
                }
                onClick={() => setModalViewMode('all')}
              >
                Ficha Completa + Galería IA
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={modalViewMode === 'gallery'}
                className={
                  modalViewMode === 'gallery'
                    ? 'btn-filter active'
                    : 'btn-filter'
                }
                onClick={() => setModalViewMode('gallery')}
              >
                Galería de Activos IA ({verifiedAssetsCount || nodeFeatures.length})
              </button>
            </div>

            <button
              type="button"
              className="btn-toggle"
              onClick={onClose}
              aria-label="Cerrar ficha del nodo"
            >
              ✕ Cerrar
            </button>
          </div>
        </div>

        {/* Franja de indicadores del nodo */}
        <div className="node-modal-kpi-strip tabular-nums">
          <div className="node-modal-kpi-cell">
            <span className="tiny-label">Estado Operativo</span>
            <strong
              style={{ color: territorio.activo ? '#2e9e5b' : '#d99b26' }}
            >
              {territorio.activo ? 'Activo en Federación' : 'En vinculación / Inactivo'}
            </strong>
          </div>
          <div className="node-modal-kpi-cell">
            <span className="tiny-label">Población Estimada</span>
            <strong>
              {(territorio.poblacion ?? 15000).toLocaleString('es-AR')} hab.
            </strong>
          </div>
          <div className="node-modal-kpi-cell">
            <span className="tiny-label">Capas Declaradas</span>
            <strong>
              {layers.length} capas ({categories.length} categorías)
            </strong>
          </div>
          <div className="node-modal-kpi-cell">
            <span className="tiny-label">Reportes Activos / Total</span>
            <strong>
              {activeReports.length} activos / {nodeReports.length} total
            </strong>
          </div>
          <div className="node-modal-kpi-cell">
            <span className="tiny-label">Activos Verificados &amp; PostGIS</span>
            <strong>
              {verifiedAssetsCount} activos IA · {nodeGeometries.length} WKT
            </strong>
          </div>
        </div>

        {/* Cuerpo scrollable con Soberanía, Galería de Activos IA, Capas Asociadas y Reportes Activos */}
        <div className="node-modal-body">
          {/* GALERÍA DE ACTIVOS VERIFICADOS CON IMÁGENES IA (Visible tanto en vista 'gallery' como en 'all') */}
          <div className="node-modal-section">
            <VerifiedAssetsGalleryView
              nodeKey={territorio.key}
              nodeName={territorio.nombre}
              features={features}
              layers={layers}
              onVisualValidateAsset={onVisualValidateAsset}
            />
          </div>

          {modalViewMode === 'all' && (
            <>
          {/* 1. MODO DE SOBERANÍA ACTUAL (Current Sovereignty Mode) */}
          <div className="node-modal-section">
            <div className="pane-header">
              <div>
                <span className="tiny-label">
                  01. Régimen de Soberanía Semántica y Delegación Federal (Horizonte 3)
                </span>
                <h3 style={{ margin: '0.15rem 0 0', fontSize: '1rem' }}>
                  Modo de Soberanía Actual:{' '}
                  <span
                    style={{
                      color: isDelegated ? '#2e9e5b' : '#d99b26',
                    }}
                  >
                    {isDelegated
                      ? 'Delegación Federal Revocable Activa'
                      : 'Custodia Local Estricta (Reserva Soberana del Nodo)'}
                  </span>
                </h3>
              </div>
              <button
                type="button"
                className="btn-toggle"
                onClick={() => void onToggleNodeSovereignty(territorio.key)}
              >
                Alternar modo de soberanía
              </button>
            </div>

            <p className="territory-meta" style={{ margin: '0.45rem 0 0' }}>
              {isDelegated
                ? 'El nodo comparte sus capas verificadas y resúmenes agregados con el Observatorio Federal sin ceder su taxonomía vernácula ni el control sobre sus datos crudos.'
                : 'El nodo mantiene sus registros bajo custodia local exclusiva; los paquetes federados requieren autorización puntual de su mesa tripartita antes de sincronizarse.'}
            </p>

            <div className="territory-meta tabular-nums" style={{ marginTop: '0.55rem' }}>
              Custodios activos:{' '}
              <strong>
                {(
                  sovereigntyRecord?.custodiansActive ?? [
                    'community',
                    'institutions',
                    'businesses',
                  ]
                )
                  .map((c) => CUSTODIAN_LABELS[c] ?? c)
                  .join(' · ')}
              </strong>{' '}
              · Merkle Root SHA-256:{' '}
              <code>
                {sovereigntyRecord?.nodeMerkleRoot ??
                  `merkle-${territorio.key}-4326-verified`}
              </code>{' '}
              · Última auditoría:{' '}
              <strong>
                {sovereigntyRecord?.lastAuditAt
                  ? new Date(sovereigntyRecord.lastAuditAt).toLocaleString('es-AR')
                  : 'Verificada en sesión'}
              </strong>
            </div>
          </div>

          {/* 2. CAPAS ASOCIADAS AL NODO (Associated Layers) */}
          <div className="node-modal-section">
            <div className="pane-header">
              <div>
                <span className="tiny-label">
                  02. Ontología Local y Capas Asociadas ({layers.length})
                </span>
                <h3 style={{ margin: '0.15rem 0 0', fontSize: '1rem' }}>
                  Capas Territoriales Declaradas por {territorio.nombre}
                </h3>
              </div>
              <span className="territory-meta tabular-nums">
                Foco vocacional: <strong>{territorio.foco || 'General'}</strong>
              </span>
            </div>

            {layers.length === 0 ? (
              <p className="empty-state">
                Este nodo aún no tiene capas específicas declaradas; utiliza el esquema base federado.
              </p>
            ) : (
              <div className="node-modal-layers-grid">
                {layers.map((layer) => {
                  const layerCategories = categories.filter(
                    (c) => c.layer === layer.key,
                  );
                  const layerFeatures = nodeFeatures.filter(
                    (f) => f.layer === layer.key,
                  );
                  const layerPostgis = nodeGeometries.filter(
                    (g) => g.layerKey === layer.key,
                  );

                  return (
                    <div key={layer.key} className="node-modal-layer-card">
                      <div className="event-row-top">
                        <strong>{layer.name}</strong>
                        <code>{layer.geometry}</code>
                      </div>
                      <div className="territory-meta tabular-nums" style={{ marginTop: '0.25rem' }}>
                        Código: <code>{layer.key}</code> · Dominio:{' '}
                        <strong>{getDomainLabel(layer.domain)}</strong> · Estado inicial:{' '}
                        <strong>{layer.defaultOn ? 'Activa' : 'Opcional'}</strong>
                      </div>
                      <div className="territory-meta" style={{ marginTop: '0.25rem' }}>
                        Custodia tripartita:{' '}
                        <strong>
                          {layer.producedBy
                            .map((p) => CUSTODIAN_LABELS[p] ?? p)
                            .join(' · ')}
                        </strong>
                      </div>
                      <div className="territory-meta tabular-nums" style={{ marginTop: '0.25rem' }}>
                        Registros en capa: <strong>{layerFeatures.length}</strong> features H1 ·{' '}
                        <strong>{layerPostgis.length}</strong> geometrías PostGIS H2
                      </div>
                      {layerCategories.length > 0 && (
                        <div className="territory-meta" style={{ marginTop: '0.35rem' }}>
                          Categorías vernáculas:{' '}
                          {layerCategories.map((cat, idx) => (
                            <span key={cat.code}>
                              {idx > 0 ? ' · ' : ''}
                              <code>{cat.code}</code> {cat.label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. REPORTES ACTIVOS Y CICLO DE VIDA (Active Reports) */}
          <div className="node-modal-section">
            <div className="pane-header">
              <div>
                <span className="tiny-label">
                  03. Ciclo de Vida de Reportes Territoriales ({activeReports.length} activos ·{' '}
                  {resolvedReports.length} resueltos)
                </span>
                <h3 style={{ margin: '0.15rem 0 0', fontSize: '1rem' }}>
                  Reportes Activos y Trazabilidad Operativa en {territorio.nombre}
                </h3>
              </div>
              <button
                type="button"
                className="btn-confirm"
                onClick={() =>
                  setDriveExportTarget({
                    mode: 'node-bundle',
                    territorio,
                    reports: nodeReports,
                    features: nodeFeatures,
                  })
                }
              >
                ☁ Exportar reportes de {territorio.nombre} a Google Drive
              </button>
            </div>

            {nodeReports.length === 0 ? (
              <p className="empty-state">
                No hay reportes registrados actualmente para este nodo. Podés crear uno desde el Explorador de Nodos (Horizonte 1).
              </p>
            ) : (
              <ul className="territory-list" style={{ marginTop: '0.5rem' }}>
                {nodeReports.map((rep) => {
                  const statusMeta = REPORT_STATUS_META[rep.status];
                  const isResolved = rep.status === 'resolved';
                  return (
                    <li key={rep.id} className="territory-item">
                      <div className="territory-info">
                        <div className="event-row-top">
                          <span className="territory-name">
                            {rep.categoryLabel || rep.category}{' '}
                            <span className="node-subtitle">
                              · <code>{rep.id}</code>
                            </span>
                          </span>
                          <span
                            className="territory-meta tabular-nums"
                            style={{
                              color: statusMeta?.color ?? '#8e9299',
                              fontWeight: 700,
                            }}
                          >
                            ● {statusMeta?.label ?? rep.status}
                          </span>
                        </div>
                        <span className="territory-meta">
                          {rep.description}
                        </span>
                        <span className="territory-meta tabular-nums">
                          Coordenada esquemática: <code>({rep.picked.x}, {rep.picked.y})</code> ·
                          Creado: <strong>{rep.createdAt}</strong> · Evento:{' '}
                          <code>{rep.eventId}</code>
                          {rep.humanReviewed && (
                            <>
                              {' '}
                              ·{' '}
                              <strong style={{ color: '#2e9e5b' }}>
                                Revisión humana verificada
                              </strong>
                            </>
                          )}
                        </span>
                      </div>

                      <div className="territory-actions">
                        <button
                          type="button"
                          className="btn-toggle"
                          onClick={() =>
                            setDriveExportTarget({
                              mode: 'single-report',
                              report: rep,
                              territorio,
                            })
                          }
                          title="Exportar este reporte territorial a Google Drive"
                        >
                          ☁ Exportar a Drive
                        </button>
                        {!isResolved ? (
                          <button
                            type="button"
                            className="btn-toggle"
                            onClick={() => void onAdvanceReport(rep.id)}
                          >
                            Avanzar estado ➔
                          </button>
                        ) : (
                          <span className="territory-meta ok">✓ Cerrado</span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Resumen de Features / Observaciones verificadas en el nodo */}
            {nodeFeatures.length > 0 && (
              <div style={{ marginTop: '0.9rem' }}>
                <div className="tiny-label">
                  Observaciones y Activos Georreferenciados en {territorio.nombre} ({nodeFeatures.length})
                </div>
                <div className="territory-meta tabular-nums" style={{ marginTop: '0.35rem' }}>
                  {nodeFeatures.map((f, idx) => (
                    <span key={f.id}>
                      {idx > 0 ? ' · ' : ''}
                      <strong>{f.title}</strong> ({STATUS_META[f.status]?.label ?? f.status})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
            </>
          )}
        </div>

        {/* Pie del Modal con Acciones Directas */}
        <div className="modal-actions node-modal-footer">
          <button
            type="button"
            className="btn-toggle"
            onClick={() =>
              setDriveExportTarget({
                mode: 'node-bundle',
                territorio,
                reports: nodeReports,
                features: nodeFeatures,
              })
            }
          >
            ☁ Exportar Dossier a Google Drive
          </button>
          <button
            type="button"
            className="btn-toggle"
            onClick={() => {
              onFocusOnGoogleMap(territorio.id);
              onClose();
            }}
          >
            Ver nodo en Google Maps
          </button>
          <button
            type="button"
            className="btn-confirm"
            onClick={() => {
              onNavigateToExplorer(territorio.key);
              onClose();
            }}
          >
            Abrir en Explorador Multicapa (H1)
          </button>
          <button type="button" className="btn-toggle" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>

      <DriveReportExportModal
        target={driveExportTarget}
        onClose={() => setDriveExportTarget(null)}
        onExportVerified={onExportVerified}
      />
    </div>
  );
}
