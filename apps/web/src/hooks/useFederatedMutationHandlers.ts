import type {
  AccreditedCustodianRecord,
  DomainKey,
  PostgisGeometryType,
  RawEventRecord,
} from '../data/federatedModel';

/**
 * Hook con los 18 manejadores de mutación del Modelo Territorial Federado
 * (Horizontes 1–4 · EV-015 a EV-018). Extraído 1:1 desde App.tsx
 * (FE-DEUDA-02 #293, corte 22): código verbatim, mismos nombres de
 * manejadores; la única sustitución es `cargarModeloFederado` →
 * `reloadModel` (dependencia inyectada). App conserva el estado
 * compartido y acopla por props; los manejadores regresan por
 * desestructuración con su nombre original.
 */
export interface FederatedMutationHandlersOptions {
  reloadModel: () => Promise<void>;
  eventsRaw: RawEventRecord[];
}

export function useFederatedMutationHandlers({
  reloadModel,
  eventsRaw,
}: FederatedMutationHandlersOptions) {
  const handleCreateReport = async (payload: {
    nodeKey: string;
    category: string;
    description: string;
    picked: { x: number; y: number };
  }) => {
    const res = await fetch('/api/reportes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      await reloadModel();
    }
  };

  const handleAdvanceReport = async (reportId: string) => {
    const res = await fetch(`/api/reportes/${reportId}/advance`, {
      method: 'PATCH',
    });
    if (res.ok) {
      await reloadModel();
    }
  };

  const handleRecordHumanReview = async (nodeKey: string, reviewerNote: string) => {
    const res = await fetch('/api/ethical-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodeKey, reviewerNote }),
    });
    if (res.ok) {
      await reloadModel();
    }
  };

  const handleCreateGeometry = async (payload: {
    nodeKey: string;
    geometryType: PostgisGeometryType;
    title: string;
    domain: DomainKey;
  }) => {
    const res = await fetch('/api/geometrias-postgis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      await reloadModel();
    }
  };

  const handleCreateSyncPack = async (payload: {
    sourceNodeKey: string;
    targetNodeKey: string;
    domain: DomainKey;
    title: string;
    sharedSummary: string;
    sourceCustodian: string;
  }) => {
    const res = await fetch('/api/federacion/sync-packs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      await reloadModel();
    }
  };

  const handleAckSyncPack = async (packId: string, targetCustodianAck: string) => {
    const res = await fetch(`/api/federacion/sync-packs/${encodeURIComponent(packId)}/ack`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetCustodianAck }),
    });
    if (res.ok) {
      await reloadModel();
    }
  };

  const handleCreateSynthesis = async (payload: {
    title: string;
    involvedNodes: string[];
    involvedDomains: DomainKey[];
    sugerenciaAccion: string;
  }) => {
    const res = await fetch('/api/horizonte3/sintesis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      await reloadModel();
    }
  };

  const handleRatifySynthesis = async (
    synthesisId: string,
    ratifiedBy: string,
    ratifiedNote: string,
  ) => {
    const res = await fetch(
      `/api/horizonte3/sintesis/${encodeURIComponent(synthesisId)}/ratificar`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ratifiedBy, ratifiedNote }),
      },
    );
    if (res.ok) {
      await reloadModel();
    }
  };

  const handleAuditLineage = async (): Promise<string> => {
    const res = await fetch('/api/horizonte3/auditar-linaje', {
      method: 'POST',
    });
    const body = (await res.json()) as {
      message?: string;
      auditHash?: string;
      tipHash?: string;
    };
    await reloadModel();
    return `[HTTP ${res.status}] ${body.message ?? 'Auditoría completada'} · AuditHash: ${body.auditHash ?? ''} · TipHash: ${body.tipHash ?? ''}`;
  };

  // ==========================================================================
  // Manejadores del Horizonte 4 (EV-015, EV-016, EV-017, EV-018)
  // ==========================================================================
  const handleExecuteSpatialIntersection = async (payload: {
    geometryId: string;
    bufferMeters: number;
  }) => {
    const res = await fetch('/api/horizonte4/postgis-interseccion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      await reloadModel();
    }
  };

  const handleEnqueueOfflineFieldItem = async (payload: {
    nodeKey: string;
    brigadeName: string;
    title: string;
    notes: string;
  }) => {
    const res = await fetch('/api/horizonte4/offline-queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      await reloadModel();
    }
  };

  const handleExecuteBatchSync = async (): Promise<string> => {
    const res = await fetch('/api/horizonte4/batch-sync', {
      method: 'POST',
    });
    const body = (await res.json()) as {
      message?: string;
      batchHash?: string;
    };
    await reloadModel();
    return `[HTTP ${res.status}] ${body.message ?? 'Batch sync completado'} · BatchHash: ${body.batchHash ?? ''}`;
  };

  const handleIssueEd25519Signature = async (payload: {
    custodianId: string;
    targetEntity: string;
  }): Promise<string> => {
    const res = await fetch('/api/horizonte4/firmar-ed25519', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = (await res.json()) as {
      signatureHex?: string;
      data?: AccreditedCustodianRecord;
    };
    await reloadModel();
    return `[HTTP ${res.status}] Firma Ed25519 emitida por ${body.data?.displayName ?? payload.custodianId} · Firma: ${body.signatureHex ?? ''} (EV-017 ok)`;
  };

  const handleIngestTelemetryWebhook = async (payload: {
    stationId: string;
    value: number;
  }) => {
    const res = await fetch('/api/horizonte4/webhooks/telemetria', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      await reloadModel();
    }
  };

  const handleVisualValidateAsset = async (
    featureId: string,
    visualState: 'optimal_verified' | 'maintenance_required',
  ) => {
    const res = await fetch(
      `/api/features/${encodeURIComponent(featureId)}/visual-check`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visualState }),
      },
    );
    if (res.ok) {
      await reloadModel();
    }
  };

  const handleTestDuplicateHashIdempotency = async (): Promise<string> => {
    const sampleEvent = eventsRaw[0];
    const targetHash = sampleEvent?.hash ?? 'demo-hash-ev005';
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: sampleEvent?.type ?? 'TerritorialReportCreated',
        nodeId: sampleEvent?.nodeId ?? 'ter-sjn-cap',
        hash: targetHash,
        payload: sampleEvent?.payload ?? { test: 'idempotency' },
      }),
    });
    const body = (await res.json()) as {
      error?: string;
      evidencia_actualizada?: string;
    };
    await reloadModel();
    return `[HTTP ${res.status}] ${body.error ?? 'Verificado'} (${body.evidencia_actualizada ?? 'EV-005 verificada'})`;
  };

  const handleVerifyEvidencia = async (code: string) => {
    const res = await fetch(`/api/evidencias/${encodeURIComponent(code)}/verify`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        result: {
          verified_by: 'Ciclo interactivo HITUB Horizontes 1, 2 y 3',
          timestamp: new Date().toISOString(),
        },
      }),
    });
    if (res.ok) {
      await reloadModel();
    }
  };

  const handleWorkspaceExportVerified = async (exportMeta: {
    channel: 'google-docs' | 'google-drive' | 'local-download';
    template: string;
    title: string;
    fileId?: string;
    webViewLink?: string;
  }) => {
    await fetch('/api/evidencias/EV-014/verify', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        result: {
          channel: exportMeta.channel,
          template: exportMeta.template,
          title: exportMeta.title,
          fileId: exportMeta.fileId ?? null,
          exported_at: new Date().toISOString(),
        },
      }),
    });
    await reloadModel();
  };

  return {
    handleCreateReport,
    handleAdvanceReport,
    handleRecordHumanReview,
    handleCreateGeometry,
    handleCreateSyncPack,
    handleAckSyncPack,
    handleCreateSynthesis,
    handleRatifySynthesis,
    handleAuditLineage,
    handleExecuteSpatialIntersection,
    handleEnqueueOfflineFieldItem,
    handleExecuteBatchSync,
    handleIssueEd25519Signature,
    handleIngestTelemetryWebhook,
    handleVisualValidateAsset,
    handleTestDuplicateHashIdempotency,
    handleVerifyEvidencia,
    handleWorkspaceExportVerified,
  };
}
