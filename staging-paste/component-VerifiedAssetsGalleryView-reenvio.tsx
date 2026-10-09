import { useMemo, useState } from 'react';
import {
  DOMAINS,
  STATUS_META,
  type TerritorioFeature,
  type TerritorioLayer,
} from '../data/federatedModel';

export type VisualCheckStatus = 'optimal_verified' | 'maintenance_required';

interface VerifiedAssetsGalleryViewProps {
  nodeKey: string;
  nodeName: string;
  features: TerritorioFeature[];
  layers: TerritorioLayer[];
  onVisualValidateAsset?: (
    featureId: string,
    visualState: VisualCheckStatus,
  ) => Promise<void>;
}

interface AiAssetVisualMeta {
  imageUrl: string;
  aiPromptSummary: string;
  visualzoneLabel: string;
}

const AI_IMAGES_BY_NODE: Record<string, AiAssetVisualMeta> = {
  capital: {
    imageUrl: '/assets/images/asset_capital_plaza_comercio_1791139968044.jpg',
    aiPromptSummary:
      'Placeholder IA · Corredor cívico-comercial, arbolado urbano y acequias revestidas en Capital (Distrito Centro y Distrito Desamparados, San Juan)',
    visualzoneLabel: 'Distrito Centro y Distrito Desamparados · SRID 4326',
  },
  caucete: {
    imageUrl: '/assets/images/asset_caucete_escuela_centro_1791139978038.jpg',
    aiPromptSummary:
      'Placeholder IA · Equipamiento educativo, drenaje agrícola y centro comunitario al pie de Pie de Palo (Caucete, San Juan)',
    visualzoneLabel: 'Valle de Tulum Oriental (Caucete) · SRID 4326',
  },
  iglesia: {
    imageUrl: '/assets/images/asset_iglesia_semillas_capilla_1791139988855.jpg',
    aiPromptSummary:
      'Placeholder IA · Unidad productiva semillera irrigada y patrimonio histórico en valle andino de Iglesia (San Juan)',
    visualzoneLabel: 'Valle Cordillerano Andino (Iglesia) · SRID 4326',
  },
};

function resolveAssetVisualMeta(feature: TerritorioFeature): AiAssetVisualMeta {
  if (AI_IMAGES_BY_NODE[feature.nodeKey]) {
    return AI_IMAGES_BY_NODE[feature.nodeKey];
  }
  if (feature.domain === 'production' || feature.domain === 'tourism') {
    return AI_IMAGES_BY_NODE.iglesia;
  }
  if (feature.domain === 'health' || feature.domain === 'community') {
    return AI_IMAGES_BY_NODE.caucete;
  }
  return AI_IMAGES_BY_NODE.capital;
}

export function VerifiedAssetsGalleryView({
  nodeKey,
  nodeName,
  features,
  layers,
  onVisualValidateAsset,
}: VerifiedAssetsGalleryViewProps) {
  const [filterMode, setFilterMode] = useState<
    'verified_all' | 'strict_verified' | 'all_node_features'
  >('verified_all');
  const [visualChecks, setVisualChecks] = useState<
    Record<string, { state: VisualCheckStatus; checkedAt: string }>
  >({});
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [busyFeatureId, setBusyFeatureId] = useState<string | null>(null);
  const [batchValidating, setBatchValidating] = useState(false);
  const [expandedFeature, setExpandedFeature] =
    useState<TerritorioFeature | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const nodeFeatures = useMemo(
    () => features.filter((f) => f.nodeKey === nodeKey),
    [features, nodeKey],
  );

  // Activos verificados por defecto: features del nodo con tipo 'asset' (o estado verified/community_validated)
  const galleryItems = useMemo(() => {
    const assetsOnly = nodeFeatures.filter((f) => f.type === 'asset');
    const basePool = assetsOnly.length > 0 ? assetsOnly : nodeFeatures;

    if (filterMode === 'strict_verified') {
      const strict = basePool.filter((f) => f.status === 'verified');
      return strict.length > 0 ? strict : basePool;
    }
    if (filterMode === 'verified_all') {
      const verifiedOrCommunity = basePool.filter(
        (f) => f.status === 'verified' || f.status === 'community_validated',
      );
      return verifiedOrCommunity.length > 0 ? verifiedOrCommunity : basePool;
    }
    return nodeFeatures;
  }, [nodeFeatures, filterMode]);

  const getLayerName = (layerKey: string) =>
    layers.find((l) => l.key === layerKey)?.name ?? layerKey;

  const getDomainLabel = (domainKey: string) =>
    DOMAINS.find((d) => d.key === domainKey)?.label ?? domainKey;

  const handleSingleVisualValidation = async (
    feature: TerritorioFeature,
    visualState: VisualCheckStatus,
  ) => {
    setBusyFeatureId(feature.id);
    try {
      const nowTime = new Date().toLocaleTimeString('es-AR');
      setVisualChecks((prev) => ({
        ...prev,
        [feature.id]: { state: visualState, checkedAt: nowTime },
      }));
      if (onVisualValidateAsset) {
        await onVisualValidateAsset(feature.id, visualState);
      }
      setFeedbackMessage(
        `Activo "${feature.title}" (${feature.id}) validado visualmente como ${
          visualState === 'optimal_verified'
            ? 'Estado Óptimo Operativo'
            : 'Observación de Mantenimiento Preventivo'
        } y registrado en events_raw.`,
      );
    } finally {
      setBusyFeatureId(null);
    }
  };

  const handleBatchVisualValidation = async () => {
    if (galleryItems.length === 0) return;
    setBatchValidating(true);
    try {
      const nowTime = new Date().toLocaleTimeString('es-AR');
      const nextChecks: Record<
        string,
        { state: VisualCheckStatus; checkedAt: string }
      > = { ...visualChecks };
      for (const item of galleryItems) {
        nextChecks[item.id] = {
          state: 'optimal_verified',
          checkedAt: nowTime,
        };
        if (onVisualValidateAsset) {
          await onVisualValidateAsset(item.id, 'optimal_verified');
        }
      }
      setVisualChecks(nextChecks);
      setFeedbackMessage(
        `Validación visual rápida completada sobre ${galleryItems.length} activos de ${nodeName} · Eventos sellados en events_raw.`,
      );
    } finally {
      setBatchValidating(false);
    }
  };

  const validatedCount = galleryItems.filter(
    (item) => visualChecks[item.id] || item.status === 'verified',
  ).length;

  return (
    <div className="asset-gallery-wrapper">
      <div className="pane-header">
        <div>
          <span className="tiny-label">
            Galería de Inspección Visual Asistida por IA · Activos Territoriales de {nodeName}
          </span>
          <h3 style={{ margin: '0.15rem 0 0', fontSize: '1rem' }}>
            Imágenes Placeholder Generadas por IA para Activos Verificados ({galleryItems.length})
          </h3>
        </div>

        <div className="territory-actions">
          <span className="territory-meta tabular-nums">
            Inspeccionados: <strong>{validatedCount}/{galleryItems.length}</strong>
          </span>
          <button
            type="button"
            className="btn-confirm"
            onClick={() => void handleBatchVisualValidation()}
            disabled={batchValidating || galleryItems.length === 0}
          >
            {batchValidating
              ? 'Validando lote…'
              : `✓ Validar visualmente todos (${galleryItems.length})`}
          </button>
        </div>
      </div>

      {/* Controles de filtro de la galería */}
      <div
        className="filter-group"
        style={{ marginTop: '0.6rem' }}
        role="group"
        aria-label="Filtrar activos en galería visual"
      >
        <button
          type="button"
          className={
            filterMode === 'verified_all' ? 'btn-filter active' : 'btn-filter'
          }
          onClick={() => setFilterMode('verified_all')}
        >
          Activos Verificados &amp; Validados
        </button>
        <button
          type="button"
          className={
            filterMode === 'strict_verified' ? 'btn-filter active' : 'btn-filter'
          }
          onClick={() => setFilterMode('strict_verified')}
        >
          Solo Verificados Institucionales
        </button>
        <button
          type="button"
          className={
            filterMode === 'all_node_features'
              ? 'btn-filter active'
              : 'btn-filter'
          }
          onClick={() => setFilterMode('all_node_features')}
        >
          Todos los Registros del Nodo ({nodeFeatures.length})
        </button>
      </div>

      {feedbackMessage && (
        <div className="workspace-feedback-bar" style={{ marginTop: '0.65rem' }}>
          <span className="ok">{feedbackMessage}</span>
        </div>
      )}

      {galleryItems.length === 0 ? (
        <p className="empty-state" style={{ marginTop: '0.75rem' }}>
          No hay activos verificados para el filtro seleccionado en {nodeName}.
        </p>
      ) : (
        <div className="asset-gallery-grid" style={{ marginTop: '0.85rem' }}>
          {galleryItems.map((feature) => {
            const visualMeta = resolveAssetVisualMeta(feature);
            const statusInfo = STATUS_META[feature.status];
            const checkRecord = visualChecks[feature.id];
            const isImgFailed = Boolean(failedImages[feature.id]);
            const isBusy = busyFeatureId === feature.id;

            return (
              <article key={feature.id} className="asset-gallery-card">
                {/* Contenedor 4:3 con imagen IA y fallback resiliente */}
                <div className="asset-gallery-media">
                  {!isImgFailed ? (
                    <img
                      src={visualMeta.imageUrl}
                      alt={`${feature.title} — ${visualMeta.aiPromptSummary}`}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      className="asset-gallery-img"
                      onError={() =>
                        setFailedImages((prev) => ({
                          ...prev,
                          [feature.id]: true,
                        }))
                      }
                    />
                  ) : (
                    <div className="asset-gallery-fallback">
                      <span className="kicker-text">
                        Vista Simbólica Resiliente · {nodeName}
                      </span>
                      <strong>{feature.title}</strong>
                      <span className="territory-meta tabular-nums">
                        Coord. ({feature.x}, {feature.y}) · Capa: {feature.layer}
                      </span>
                    </div>
                  )}

                  <div className="asset-gallery-scrim">
                    <span className="asset-gallery-scrim-text tabular-nums">
                      IA Placeholder · <code>{feature.id}</code> · ({feature.x},{' '}
                      {feature.y})
                    </span>
                    <button
                      type="button"
                      className="asset-gallery-zoom-btn"
                      onClick={() => setExpandedFeature(feature)}
                    >
                      Ampliar vista
                    </button>
                  </div>
                </div>

                {/* Cuerpo de la tarjeta con metadatos limpios (Zero-Pill discipline) */}
                <div className="asset-gallery-content">
                  <div className="territory-meta tabular-nums">
                    <span>{getDomainLabel(feature.domain)}</span>
                    <span aria-hidden="true"> · </span>
                    <span>{getLayerName(feature.layer)}</span>
                    <span aria-hidden="true"> · </span>
                    <span>Obs: {feature.observedAt}</span>
                  </div>

                  <h4 className="asset-gallery-title">{feature.title}</h4>

                  <div className="territory-meta" style={{ marginTop: '0.2rem' }}>
                    {visualMeta.aiPromptSummary}
                  </div>

                  <div
                    className="territory-meta tabular-nums"
                    style={{ marginTop: '0.35rem' }}
                  >
                    Estatuto epistémico:{' '}
                    <strong style={{ color: statusInfo?.color ?? '#2e9e5b' }}>
                      ● {statusInfo?.label ?? feature.status}
                    </strong>{' '}
                    · Fuente: {feature.sourceLabel}
                  </div>

                  {/* Estado de la validación visual rápida */}
                  <div
                    className="territory-meta tabular-nums"
                    style={{ marginTop: '0.25rem' }}
                  >
                    Inspección visual:{' '}
                    {checkRecord ? (
                      <strong
                        style={{
                          color:
                            checkRecord.state === 'optimal_verified'
                              ? '#2e9e5b'
                              : '#d99b26',
                        }}
                      >
                        {checkRecord.state === 'optimal_verified'
                          ? `✓ Estado óptimo validado (${checkRecord.checkedAt})`
                          : `⚠ Mantenimiento preventivo marcado (${checkRecord.checkedAt})`}
                      </strong>
                    ) : feature.status === 'verified' ? (
                      <strong style={{ color: '#2e9e5b' }}>
                        ✓ Activo verificado en padrón
                      </strong>
                    ) : (
                      <strong style={{ color: '#38bdf8' }}>
                        Pendiente de confirmación visual rápida
                      </strong>
                    )}
                  </div>

                  {/* Acciones de Validación Visual Rápida */}
                  <div className="asset-gallery-actions">
                    <button
                      type="button"
                      className="btn-confirm"
                      disabled={isBusy}
                      onClick={() =>
                        void handleSingleVisualValidation(
                          feature,
                          'optimal_verified',
                        )
                      }
                    >
                      {isBusy ? 'Validando…' : '✓ Validar estado óptimo'}
                    </button>
                    <button
                      type="button"
                      className="btn-toggle"
                      disabled={isBusy}
                      onClick={() =>
                        void handleSingleVisualValidation(
                          feature,
                          'maintenance_required',
                        )
                      }
                    >
                      ⚠ Marcar observación
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Inspector Visual Ampliado (Lightbox dentro del componente) */}
      {expandedFeature && (
        <div
          className="asset-lightbox-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={`Vista ampliada de ${expandedFeature.title}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setExpandedFeature(null);
            }
          }}
        >
          <div className="asset-lightbox-card">
            <div className="event-row-top" style={{ marginBottom: '0.6rem' }}>
              <div>
                <span className="kicker-text">
                  Inspección Visual de Activo Territorial · {nodeName}
                </span>
                <h4 style={{ margin: '0.15rem 0 0', fontSize: '1.05rem' }}>
                  {expandedFeature.title}
                </h4>
              </div>
              <button
                type="button"
                className="btn-toggle"
                onClick={() => setExpandedFeature(null)}
              >
                ✕ Cerrar vista
              </button>
            </div>

            <div className="asset-lightbox-media">
              <img
                src={resolveAssetVisualMeta(expandedFeature).imageUrl}
                alt={expandedFeature.title}
                referrerPolicy="no-referrer"
                className="asset-lightbox-img"
              />
            </div>

            <div
              className="territory-meta tabular-nums"
              style={{ marginTop: '0.65rem' }}
            >
              ID: <code>{expandedFeature.id}</code> · Capa:{' '}
              <strong>{getLayerName(expandedFeature.layer)}</strong> · Dominio:{' '}
              <strong>{getDomainLabel(expandedFeature.domain)}</strong> ·
              Coordenada esquemática:{' '}
              <code>
                ({expandedFeature.x}, {expandedFeature.y})
              </code>{' '}
              · Observado: <strong>{expandedFeature.observedAt}</strong>
            </div>

            <div className="modal-actions" style={{ marginTop: '0.75rem' }}>
              <button
                type="button"
                className="btn-confirm"
                onClick={() => {
                  void handleSingleVisualValidation(
                    expandedFeature,
                    'optimal_verified',
                  );
                  setExpandedFeature(null);
                }}
              >
                ✓ Confirmar estado óptimo y cerrar
              </button>
              <button
                type="button"
                className="btn-toggle"
                onClick={() => {
                  void handleSingleVisualValidation(
                    expandedFeature,
                    'maintenance_required',
                  );
                  setExpandedFeature(null);
                }}
              >
                ⚠ Registrar observación de mantenimiento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
