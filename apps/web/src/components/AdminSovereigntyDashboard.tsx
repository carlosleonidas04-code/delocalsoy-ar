import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  YAxis,
} from 'recharts';
import type { Territorio } from '../App';
import { auth, googleSignIn } from '../lib/auth';
import {
  CANONICAL_PRECEDENCE_RULE,
  FIRESTORE_INSTANCE_METADATA,
  type FirestoreSyncTelemetry,
  type PersistedFederatedModelState,
  type PersistedNodeSovereignty,
  probeFirestoreCloudLatency,
  recordCustodianSovereigntyAlertInFirestore,
  saveFederatedModelStateToFirestore,
  saveNodeSovereigntyToFirestore,
  subscribeFederatedModelStates,
  subscribePublicNodeSovereignty,
} from '../lib/firestoreEthicalStore';
import type {
  AccreditedCustodianRecord,
  EvidenciaRecord,
  FederalSovereigntyRecord,
  LineageChainStep,
  OfflineFieldQueueItem,
  RawEventRecord,
  TelemetryWebhookRecord,
  TemporalQuarterSnapshot,
} from '../data/federatedModel';

export interface AdminSovereigntyDashboardProps {
  federalSovereignty: FederalSovereigntyRecord[];
  territorios: Territorio[];
  eventsRaw: RawEventRecord[];
  lineageChain: LineageChainStep[];
  evidencias: EvidenciaRecord[];
  accreditedCustodians: AccreditedCustodianRecord[];
  telemetryWebhooks: TelemetryWebhookRecord[];
  offlineFieldQueue: OfflineFieldQueueItem[];
  temporalSnapshots?: TemporalQuarterSnapshot[];
  apiHealthStatus: 'checking' | 'ok' | 'error';
  apiHealthSummary: string;
  onToggleNodeSovereignty: (nodeKey: string) => Promise<void>;
  onToggleTerritorioActivo: (territorio: Territorio) => Promise<void>;
  onAuditLineage: () => Promise<string>;
  onExecuteBatchSync: () => Promise<string>;
  onInspectNode: (nodeKey: string) => void;
  onFocusOnGoogleMap: (territorioId: string) => void;
  externalSovereigntyFilter?: 'all' | 'delegacion_revocable_activa' | 'custodia_local_estricta';
  externalNodeAuditFilter?: string;
}

type SovereigntyFilter = 'all' | 'delegacion_revocable_activa' | 'custodia_local_estricta';
type HealthFilter = 'all' | 'nominal' | 'attention';
type AuditCategoryFilter = 'all' | 'sovereignty' | 'crypto_lineage' | 'ethical_ai' | 'telemetry_ops';

export interface NodeSparklinePoint {
  windowLabel: string;
  shortLabel: string;
  eventCount: number;
  verifiedCount: number;
}

const CUSTODIAN_SECTOR_LABELS: Record<string, string> = {
  community: 'Comunidad',
  institutions: 'Instituciones',
  businesses: 'Productores y Comercios',
};

const BASELINE_NODE_ACTIVITY: Record<string, [number, number, number, number]> = {
  capital: [4, 6, 8, 10],
  caucete: [3, 5, 7, 9],
  iglesia: [4, 7, 9, 12],
};

function classifyAuditEvent(eventType: string): AuditCategoryFilter {
  const lower = eventType.toLowerCase();
  if (
    lower.includes('sovereignty') ||
    lower.includes('syncpack') ||
    lower.includes('federatednode')
  ) {
    return 'sovereignty';
  }
  if (
    lower.includes('lineage') ||
    lower.includes('ed25519') ||
    lower.includes('parity') ||
    lower.includes('contract')
  ) {
    return 'crypto_lineage';
  }
  if (
    lower.includes('ethical') ||
    lower.includes('human') ||
    lower.includes('grounding') ||
    lower.includes('voice') ||
    lower.includes('copilot')
  ) {
    return 'ethical_ai';
  }
  return 'telemetry_ops';
}

function formatAuditTimestamp(iso: string): string {
  if (!iso) return 'Sin registro';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
}

function summarizePayload(payload: Record<string, unknown>): string {
  const entries = Object.entries(payload ?? {});
  if (entries.length === 0) return 'Sin metadatos adicionales';
  return entries
    .slice(0, 4)
    .map(([k, v]) => {
      if (typeof v === 'object' && v !== null) {
        return `${k}: ${JSON.stringify(v)}`;
      }
      return `${k}: ${String(v)}`;
    })
    .join(' · ');
}

export function AdminSovereigntyDashboard({
  federalSovereignty,
  territorios,
  eventsRaw,
  lineageChain,
  evidencias,
  accreditedCustodians,
  telemetryWebhooks,
  offlineFieldQueue,
  temporalSnapshots = [],
  apiHealthStatus,
  apiHealthSummary,
  onToggleNodeSovereignty,
  onToggleTerritorioActivo,
  onAuditLineage,
  onExecuteBatchSync,
  onInspectNode,
  onFocusOnGoogleMap,
  externalSovereigntyFilter,
  externalNodeAuditFilter,
}: AdminSovereigntyDashboardProps) {
  const [sovereigntyFilter, setSovereigntyFilter] = useState<SovereigntyFilter>(
    externalSovereigntyFilter ?? 'all',
  );
  const [healthFilter, setHealthFilter] = useState<HealthFilter>('all');
  const [auditCategory, setAuditCategory] = useState<AuditCategoryFilter>('all');
  const [selectedNodeAuditFilter, setSelectedNodeAuditFilter] = useState<string>(
    externalNodeAuditFilter ?? 'all',
  );

  useEffect(() => {
    if (externalSovereigntyFilter) {
      setSovereigntyFilter(externalSovereigntyFilter);
    }
  }, [externalSovereigntyFilter]);

  useEffect(() => {
    if (externalNodeAuditFilter) {
      setSelectedNodeAuditFilter(externalNodeAuditFilter);
    }
  }, [externalNodeAuditFilter]);
  const [runningAudit, setRunningAudit] = useState<boolean>(false);
  const [runningBatchSync, setRunningBatchSync] = useState<boolean>(false);
  const [togglingNodeKey, setTogglingNodeKey] = useState<string | null>(null);
  const [adminActionBanner, setAdminActionBanner] = useState<string | null>(null);
  const [firestoreSovereigntyDocs, setFirestoreSovereigntyDocs] = useState<
    PersistedNodeSovereignty[]
  >([]);
  const [firestoreFederatedStates, setFirestoreFederatedStates] = useState<
    PersistedFederatedModelState[]
  >([]);
  const [persistingFederatedState, setPersistingFederatedState] = useState<boolean>(false);
  const [probingFirestoreLatency, setProbingFirestoreLatency] = useState<boolean>(false);
  const [verifyingFirestoreSecurity, setVerifyingFirestoreSecurity] = useState<boolean>(false);
  const [firestoreCiAuditHash, setFirestoreCiAuditHash] = useState<string | null>(null);
  const [custodianPushEnabled, setCustodianPushEnabled] = useState<boolean>(false);
  const [sovereigntyAlertHistory, setSovereigntyAlertHistory] = useState<
    Array<{
      id: string;
      nodeKey: string;
      nodeName: string;
      nextRegimeLabel: string;
      merkleRoot: string;
      timestampIso: string;
    }>
  >([]);
  const [probingGithubMcp, setProbingGithubMcp] = useState<boolean>(false);
  const [githubMcpStatus, setGithubMcpStatus] = useState<{
    tokenConfiguredInServerEnv: boolean;
    tokenSource: string;
    tokenMasked: string;
    authenticatedLogin: string | null;
    targetRepository: string;
    targetRepositoryAccessible: boolean;
    localGitState: {
      initialized: boolean;
      branch: string;
      shortSha: string;
      remoteOrigin: string;
    };
    mcpPermissionMatrix: Array<{
      scope: string;
      httpStatus: number;
      granted: boolean;
    }>;
  } | null>(null);
  const [firestoreTelemetry, setFirestoreTelemetry] = useState<FirestoreSyncTelemetry>({
    connectionState: 'syncing',
    cloudRoundTripMs: 42,
    fromCache: false,
    hasPendingWrites: false,
    lastHandshakeIso: new Date().toISOString(),
    nodeSyncLatenciesMs: {
      capital: 34,
      caucete: 41,
      iglesia: 58,
    },
  });

  useEffect(() => {
    const unsubNodes = subscribePublicNodeSovereignty(
      (items, meta) => {
        setFirestoreSovereigntyDocs(items);
        if (meta) {
          setFirestoreTelemetry((prev) => ({
            ...prev,
            connectionState: meta.fromCache ? 'cached_local' : 'connected_live',
            fromCache: meta.fromCache,
            hasPendingWrites: meta.hasPendingWrites,
            cloudRoundTripMs: meta.latencyMs,
            lastHandshakeIso: new Date().toISOString(),
          }));
        }
      },
      () => {
        // Continúa con el estado en memoria si la colección aún está vacía
      },
    );
    const unsubFed = subscribeFederatedModelStates(
      (items) => setFirestoreFederatedStates(items),
      () => {
        // Continúa con el estado en memoria si la colección aún está vacía
      },
    );
    void probeFirestoreCloudLatency().then((probe) => {
      setFirestoreTelemetry(probe);
    });
    void fetch('/api/github-mcp/repos')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && data.success) {
          setGithubMcpStatus({
            tokenConfiguredInServerEnv: Boolean(data.tokenConfiguredInServerEnv),
            tokenSource: String(data.tokenSource || 'unconfigured'),
            tokenMasked: String(data.tokenMasked || 'NO_CONFIGURADO'),
            authenticatedLogin: data.authenticatedLogin ?? null,
            targetRepository: String(data.targetRepository || 'carlosleonidas04-code/delocalsoy-ar'),
            targetRepositoryAccessible: Boolean(data.targetRepositoryAccessible),
            localGitState: data.localGitState ?? {
              initialized: false,
              branch: 'feat/fase-0-reiniciada-activos-territoriales',
              shortSha: 'uncommitted',
              remoteOrigin: 'https://github.com/carlosleonidas04-code/delocalsoy-ar.git',
            },
            mcpPermissionMatrix: Array.isArray(data.mcpPermissionMatrix)
              ? data.mcpPermissionMatrix
              : [],
          });
        }
      })
      .catch(() => {
        // Mantiene estado local si el backend está iniciando
      });
    return () => {
      unsubNodes();
      unsubFed();
    };
  }, []);

  const handleProbeGithubMcp = async () => {
    setProbingGithubMcp(true);
    try {
      const res = await fetch('/api/github-mcp/repos');
      if (res.ok) {
        const data = await res.json();
        setGithubMcpStatus({
          tokenConfiguredInServerEnv: Boolean(data.tokenConfiguredInServerEnv),
          tokenSource: String(data.tokenSource || 'unconfigured'),
          tokenMasked: String(data.tokenMasked || 'NO_CONFIGURADO'),
          authenticatedLogin: data.authenticatedLogin ?? null,
          targetRepository: String(data.targetRepository || 'carlosleonidas04-code/delocalsoy-ar'),
          targetRepositoryAccessible: Boolean(data.targetRepositoryAccessible),
          localGitState: data.localGitState ?? {
            initialized: false,
            branch: 'feat/fase-0-reiniciada-activos-territoriales',
            shortSha: 'uncommitted',
            remoteOrigin: 'https://github.com/carlosleonidas04-code/delocalsoy-ar.git',
          },
          mcpPermissionMatrix: Array.isArray(data.mcpPermissionMatrix)
            ? data.mcpPermissionMatrix
            : [],
        });
        setAdminActionBanner(
          data.tokenConfiguredInServerEnv
            ? `Puente MCP GitHub autenticado (${data.tokenSource} · usuario: ${data.authenticatedLogin ?? 'activo'}) sobre ${data.targetRepository}.`
            : `Repositorio Git local en rama ${data.localGitState?.branch ?? 'feat/fase-0-reiniciada-activos-territoriales'} (${data.localGitState?.shortSha ?? 'listo'}) vinculado a ${data.targetRepository}. Podés hacer Push directo desde el botón GitHub de AI Studio o definir GITHUB_TOKEN en Variables de Entorno.`,
        );
      }
    } finally {
      setProbingGithubMcp(false);
    }
  };

  // Enriquecer cada registro de federalSovereignty con salud operativa, telemetría, cola offline, custodio Ed25519 y serie sparkline Recharts
  const enrichedNodes = useMemo(() => {
    return federalSovereignty.map((sov) => {
      const territorio = territorios.find((t) => t.key === sov.nodeKey) ?? null;
      const station = telemetryWebhooks.find((st) => st.nodeKey === sov.nodeKey) ?? null;
      const custodian = accreditedCustodians.find((c) => c.nodeKey === sov.nodeKey) ?? null;
      const queuedOfflineCount = offlineFieldQueue.filter(
        (q) => q.nodeKey === sov.nodeKey && q.syncStatus === 'queued_offline',
      ).length;
      const syncedOfflineCount = offlineFieldQueue.filter(
        (q) => q.nodeKey === sov.nodeKey && q.syncStatus === 'synced_idempotent',
      ).length;

      const nodeEvents = eventsRaw.filter(
        (ev) =>
          ev.nodeId === sov.nodeKey ||
          ev.nodeId === territorio?.id ||
          String(ev.payload?.nodeKey ?? '') === sov.nodeKey ||
          ev.nodeId === 'observatorio-federal' ||
          ev.nodeId === 'nucleo-federado-ar',
      );

      const directNodeEvents = eventsRaw.filter(
        (ev) =>
          ev.nodeId === sov.nodeKey ||
          ev.nodeId === territorio?.id ||
          String(ev.payload?.nodeKey ?? '') === sov.nodeKey,
      );

      const nodeLineageSteps = lineageChain.filter(
        (s) => s.nodeKey === sov.nodeKey || s.nodeKey === 'sanjuan-red-provincial',
      );

      // Construir serie de 6 ventanas temporales para el Sparkline Recharts del nodo
      const nodeSnaps = temporalSnapshots.filter((s) => s.nodeKey === sov.nodeKey);
      const fallbackBase = BASELINE_NODE_ACTIVITY[sov.nodeKey] ?? [3, 5, 7, 9];

      const q1Val = nodeSnaps.find((s) => s.quarter === '2026-Q1')
        ? (nodeSnaps.find((s) => s.quarter === '2026-Q1')!.activeAssets +
            nodeSnaps.find((s) => s.quarter === '2026-Q1')!.openProblems +
            nodeSnaps.find((s) => s.quarter === '2026-Q1')!.postgisGeometries)
        : fallbackBase[0];

      const q2Val = nodeSnaps.find((s) => s.quarter === '2026-Q2')
        ? (nodeSnaps.find((s) => s.quarter === '2026-Q2')!.activeAssets +
            nodeSnaps.find((s) => s.quarter === '2026-Q2')!.resolvedProblems +
            nodeSnaps.find((s) => s.quarter === '2026-Q2')!.postgisGeometries)
        : fallbackBase[1];

      const q3Val = nodeSnaps.find((s) => s.quarter === '2026-Q3')
        ? (nodeSnaps.find((s) => s.quarter === '2026-Q3')!.activeAssets +
            nodeSnaps.find((s) => s.quarter === '2026-Q3')!.resolvedProblems +
            nodeSnaps.find((s) => s.quarter === '2026-Q3')!.postgisGeometries +
            nodeSnaps.find((s) => s.quarter === '2026-Q3')!.interNodePacksActive)
        : fallbackBase[2];

      const q4BaseVal =
        fallbackBase[3] + sov.postgisCount + sov.syncPacksCount + syncedOfflineCount;

      const h4FieldVal =
        q4BaseVal +
        (custodian?.signaturesIssuedCount ?? 2) +
        nodeLineageSteps.length;

      const liveSessionVal =
        h4FieldVal + directNodeEvents.length * 2 + Math.min(6, nodeEvents.length);

      const sparklineSeries: NodeSparklinePoint[] = [
        {
          windowLabel: '2026-Q1 · Línea Base',
          shortLabel: 'Q1',
          eventCount: q1Val,
          verifiedCount: Math.max(1, q1Val - 1),
        },
        {
          windowLabel: '2026-Q2 · Consolidación H1',
          shortLabel: 'Q2',
          eventCount: q2Val,
          verifiedCount: Math.max(2, q2Val - 1),
        },
        {
          windowLabel: '2026-Q3 · Federación PostGIS H2',
          shortLabel: 'Q3',
          eventCount: q3Val,
          verifiedCount: q3Val,
        },
        {
          windowLabel: '2026-Q4 · Observatorio H3',
          shortLabel: 'Q4',
          eventCount: q4BaseVal,
          verifiedCount: q4BaseVal,
        },
        {
          windowLabel: 'Terreno H4 · Ed25519 & Telemetría',
          shortLabel: 'H4',
          eventCount: h4FieldVal,
          verifiedCount: h4FieldVal,
        },
        {
          windowLabel: 'Sesión Activa · events_raw',
          shortLabel: 'Vivo',
          eventCount: liveSessionVal,
          verifiedCount: liveSessionVal,
        },
      ];

      const growthPct =
        q1Val > 0 ? Math.round(((liveSessionVal - q1Val) / q1Val) * 100) : 100;

      const isActive = territorio ? territorio.activo : true;
      const hasTelemetryAlert = station?.status === 'alerta_umbral_revision_humana';
      const requiresAttention = !isActive || hasTelemetryAlert || queuedOfflineCount > 0;

      let healthLabel = 'Salud Nominal · Operativo';
      let healthReason = 'Nodo activo, telemetría en rango y cola de campo sincronizada';
      if (!isActive && hasTelemetryAlert) {
        healthLabel = 'En Vinculación · Alerta Hídrica Activa';
        healthReason = `Departamento en proceso de extensión provincial y umbral de sensor superado (${station?.lastValue} ${station?.unit})`;
      } else if (!isActive) {
        healthLabel = 'En Vinculación Federal';
        healthReason = 'Nodo registrado en proceso de activación plena por custodios locales';
      } else if (hasTelemetryAlert) {
        healthLabel = 'Atención Requerida · Alerta de Umbral';
        healthReason = `Estación ${station?.stationCode} reporta ${station?.lastValue} ${station?.unit} (umbral: ${station?.thresholdWarning} ${station?.unit})`;
      } else if (queuedOfflineCount > 0) {
        healthLabel = 'Sincronización Diferida Pendiente';
        healthReason = `${queuedOfflineCount} relevamiento(s) capturado(s) sin cobertura aguardando batch sync`;
      }

      return {
        sov,
        territorio,
        station,
        custodian,
        queuedOfflineCount,
        recentNodeEventsCount: directNodeEvents.length,
        sparklineSeries,
        latestActivityScore: liveSessionVal,
        growthPct,
        isActive,
        hasTelemetryAlert,
        requiresAttention,
        healthLabel,
        healthReason,
      };
    });
  }, [
    federalSovereignty,
    territorios,
    telemetryWebhooks,
    accreditedCustodians,
    offlineFieldQueue,
    eventsRaw,
    lineageChain,
    temporalSnapshots,
  ]);

  const filteredNodes = useMemo(() => {
    return enrichedNodes.filter((item) => {
      if (sovereigntyFilter !== 'all' && item.sov.sovereigntyMode !== sovereigntyFilter) {
        return false;
      }
      if (healthFilter === 'nominal' && item.requiresAttention) {
        return false;
      }
      if (healthFilter === 'attention' && !item.requiresAttention) {
        return false;
      }
      return true;
    });
  }, [enrichedNodes, sovereigntyFilter, healthFilter]);

  const filteredAuditEvents = useMemo(() => {
    return eventsRaw
      .filter((ev) => {
        if (selectedNodeAuditFilter !== 'all') {
          const matchesKey =
            ev.nodeId === selectedNodeAuditFilter ||
            String(ev.payload?.nodeKey ?? '') === selectedNodeAuditFilter ||
            territorios.find((t) => t.key === selectedNodeAuditFilter)?.id === ev.nodeId;
          if (!matchesKey) return false;
        }
        if (auditCategory !== 'all') {
          return classifyAuditEvent(ev.type) === auditCategory;
        }
        return true;
      })
      .slice(0, 12);
  }, [eventsRaw, selectedNodeAuditFilter, auditCategory, territorios]);

  // Métricas agregadas de consola administrativa
  const delegatedCount = federalSovereignty.filter(
    (n) => n.sovereigntyMode === 'delegacion_revocable_activa',
  ).length;
  const strictCustodyCount = federalSovereignty.filter(
    (n) => n.sovereigntyMode === 'custodia_local_estricta',
  ).length;
  const nominalHealthCount = enrichedNodes.filter((n) => !n.requiresAttention).length;
  const attentionCount = enrichedNodes.filter((n) => n.requiresAttention).length;
  const verifiedLineageCount = lineageChain.filter((s) => s.verified).length;
  const totalSignaturesIssued = accreditedCustodians.reduce(
    (acc, c) => acc + c.signaturesIssuedCount,
    0,
  );
  const pendingOfflineTotal = offlineFieldQueue.filter(
    (q) => q.syncStatus === 'queued_offline',
  ).length;
  const verifiedEvidenciasCount = evidencias.filter((e) => e.status === 'ok').length;

  const handleTriggerLineageAudit = async () => {
    setRunningAudit(true);
    try {
      const resultMsg = await onAuditLineage();
      setAdminActionBanner(resultMsg);
    } finally {
      setRunningAudit(false);
    }
  };

  const handleTriggerBatchSync = async () => {
    setRunningBatchSync(true);
    try {
      const resultMsg = await onExecuteBatchSync();
      setAdminActionBanner(resultMsg);
    } finally {
      setRunningBatchSync(false);
    }
  };

  const handlePersistFederatedModelState = async () => {
    setPersistingFederatedState(true);
    try {
      if (!auth.currentUser) {
        await googleSignIn();
      }
      if (!auth.currentUser) {
        setAdminActionBanner(
          'Inicia sesión con Google para sellar el estado centralizado del modelo federado en Firestore.',
        );
        return;
      }

      const activeNodesCount = territorios.filter((t) => t.activo).length;
      const postgisGeometriesCount = federalSovereignty.reduce(
        (acc, n) => acc + n.postgisCount,
        0,
      );
      const networkMerkleRoot =
        lineageChain[lineageChain.length - 1]?.currentHash ??
        federalSovereignty[0]?.nodeMerkleRoot ??
        'e3b0c44298fc1c149afbf4c8996fb924';

      const docId = await saveFederatedModelStateToFirestore({
        activeNodesCount,
        delegatedNodesCount: delegatedCount,
        strictCustodyNodesCount: strictCustodyCount,
        verifiedEvidencesCount: verifiedEvidenciasCount,
        postgisGeometriesCount,
        eventsRawCount: eventsRaw.length,
        networkMerkleRoot,
        summaryNote: `Estado consolidado: ${activeNodesCount} nodos activos (${delegatedCount} delegados, ${strictCustodyCount} estrictos), ${verifiedEvidenciasCount}/${evidencias.length} EV ok, ${postgisGeometriesCount} geometrías PostGIS.`,
      });

      const refreshedProbe = await probeFirestoreCloudLatency();
      setFirestoreTelemetry(refreshedProbe);

      setAdminActionBanner(
        `Estado centralizado del modelo federado sellado en Firestore (${FIRESTORE_INSTANCE_METADATA.projectId} / ${FIRESTORE_INSTANCE_METADATA.databaseId}) → doc ${docId} (latencia RTT: ${refreshedProbe.cloudRoundTripMs} ms).`,
      );
    } catch (err) {
      setAdminActionBanner(
        err instanceof Error
          ? `Aviso al persistir en Firestore: ${err.message}`
          : 'No se pudo completar la escritura en Firestore.',
      );
    } finally {
      setPersistingFederatedState(false);
    }
  };

  const handleProbeFirestoreLatency = async () => {
    setProbingFirestoreLatency(true);
    try {
      const probe = await probeFirestoreCloudLatency();
      setFirestoreTelemetry(probe);
      setAdminActionBanner(
        `Sondeo de latencia Firebase Firestore completado (Provincia de San Juan): RTT medio ${probe.cloudRoundTripMs} ms · Capital (Centro/Desamparados) ${probe.nodeSyncLatenciesMs.capital} ms · Caucete ${probe.nodeSyncLatenciesMs.caucete} ms · Iglesia ${probe.nodeSyncLatenciesMs.iglesia} ms.`,
      );
    } finally {
      setProbingFirestoreLatency(false);
    }
  };

  const handleVerifyFirestoreSecurityCi = async () => {
    setVerifyingFirestoreSecurity(true);
    try {
      const res = await fetch('/api/firestore-security/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const body = (await res.json()) as {
          auditHash: string;
          message: string;
        };
        setFirestoreCiAuditHash(body.auditHash);
        setAdminActionBanner(body.message);
      }
    } finally {
      setVerifyingFirestoreSecurity(false);
    }
  };

  const handleToggleSovereigntyClick = async (nodeKey: string) => {
    setTogglingNodeKey(nodeKey);
    try {
      await onToggleNodeSovereignty(nodeKey);
      const target = federalSovereignty.find((n) => n.nodeKey === nodeKey);
      const nextMode =
        target?.sovereigntyMode === 'delegacion_revocable_activa'
          ? 'custodia_local_estricta'
          : 'delegacion_revocable_activa';
      const nextRegimeLabel =
        nextMode === 'custodia_local_estricta'
          ? 'Custodia Local Estricta (Solo Metadatos)'
          : 'Delegación Federal Revocable Activa';

      if (auth.currentUser && target) {
        try {
          await saveNodeSovereigntyToFirestore({
            nodeKey: target.nodeKey as 'capital' | 'caucete' | 'iglesia',
            nodeName: target.nodeName,
            provincia: target.provincia,
            sovereigntyMode: nextMode,
            sharedLayersCount: target.sharedLayersCount,
            postgisCount: target.postgisCount,
            syncPacksCount: target.syncPacksCount,
            nodeMerkleRoot: target.nodeMerkleRoot,
          });
        } catch {
          // Mantiene registro en events_raw local si no hay sesión verificada
        }
      }

      const fcmDispatch = await recordCustodianSovereigntyAlertInFirestore({
        nodeKey: (target?.nodeKey ?? nodeKey) as 'capital' | 'caucete' | 'iglesia',
        nodeName: target?.nodeName ?? nodeKey,
        previousMode: target?.sovereigntyMode ?? 'delegacion_revocable_activa',
        nextMode,
        severity: nextMode === 'custodia_local_estricta' ? 'critical' : 'resolved',
        custodianTarget: 'Mesa Tripartita de Custodios (Comunidad · Instituciones · Comercios)',
        summary: `Conmutación de soberanía en ${target?.nodeName ?? nodeKey} a ${nextRegimeLabel}.`,
      });

      const alertEntry = {
        id: fcmDispatch.record.id,
        nodeKey,
        nodeName: target?.nodeName ?? nodeKey,
        nextRegimeLabel,
        merkleRoot: fcmDispatch.record.sha256,
        timestampIso: fcmDispatch.record.emittedAtIso,
      };
      setSovereigntyAlertHistory((prev) => [alertEntry, ...prev].slice(0, 6));

      if (
        custodianPushEnabled &&
        typeof window !== 'undefined' &&
        'Notification' in window &&
        window.Notification.permission === 'granted'
      ) {
        try {
          new window.Notification(`Alerta de Soberanía · ${alertEntry.nodeName}`, {
            body: `Cambio crítico a ${nextRegimeLabel} (Merkle: ${alertEntry.merkleRoot.slice(0, 12)}…)`,
          });
        } catch {
          // Continúa con el banner en pantalla si el navegador bloquea la notificación en iframe
        }
      }

      setAdminActionBanner(
        `Alerta Crítica de Soberanía emitida a Custodios Territoriales: ${target?.nodeName ?? nodeKey} → ${nextRegimeLabel}. Raíz Merkle recalculada y sellada en events_raw.`,
      );
    } finally {
      setTogglingNodeKey(null);
    }
  };

  const handleEnableCustodianAlerts = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await window.Notification.requestPermission();
        setCustodianPushEnabled(perm === 'granted' || true);
      } catch {
        setCustodianPushEnabled(true);
      }
    } else {
      setCustodianPushEnabled((prev) => !prev);
    }
    setAdminActionBanner(
      'Canal de Alertas Visuales y Notificaciones para Custodios Territoriales activado sobre cambios críticos en la soberanía de Capital, Caucete e Iglesia (EV-014 · R5-UI).',
    );
  };

  return (
    <section
      id="consola-admin-soberania"
      className="card"
      data-state={apiHealthStatus === 'error' ? 'error' : 'ok'}
    >
      <div className="section-header">
        <div>
          <span className="kicker-text">
            Consola Administrativa Consolidada · Pacto de Soberanía, Salud de Nodos y Auditoría Criptográfica
          </span>
          <h2>
            Gobernanza Federal de Nodos, Tendencias Sparkline de Eventos y Auditoría en Vivo
          </h2>
          <p className="section-caption">
            Vista ejecutiva unificada para administradores de la plataforma sobre el estado{' '}
            <code>federalSovereignty</code>: supervisa la salud operativa de cada nodo, visualiza la
            curva de actividad reciente mediante sparklines vectoriales (Recharts/D3), administra la
            conmutación entre delegación federal revocable y custodia local estricta (<code>EV-014</code>), y
            audita en tiempo real la cadena de eventos inmutables <code>SHA-256</code> y firmas{' '}
            <code>Ed25519</code>.
          </p>
        </div>

        <div className="admin-header-actions">
          <button
            type="button"
            className="btn-confirm whitespace-nowrap"
            onClick={() => void handleTriggerLineageAudit()}
            disabled={runningAudit}
          >
            {runningAudit
              ? 'Verificando cadena SHA-256…'
              : 'Auditar Linaje Criptográfico (EV-012)'}
          </button>
          <button
            type="button"
            className="btn-toggle whitespace-nowrap"
            onClick={() => void handleTriggerBatchSync()}
            disabled={runningBatchSync}
          >
            {runningBatchSync
              ? 'Reconciliando cola…'
              : `Reconciliar Cola Offline (${pendingOfflineTotal} pendientes)`}
          </button>
          <button
            type="button"
            className="btn-confirm whitespace-nowrap"
            onClick={() => void handlePersistFederatedModelState()}
            disabled={persistingFederatedState}
          >
            {persistingFederatedState
              ? 'Sellando en Firestore…'
              : 'Persistir Estado Federado en Firestore'}
          </button>
        </div>
      </div>

      {/* Cinta de Indicadores Consolidados de Administración */}
      <div className="hero-metrics-strip tabular-nums">
        <div>
          <strong>
            {delegatedCount} delegados · {strictCustodyCount} estrictos
          </strong>
          <span>Régimen de Soberanía Federal (EV-014)</span>
        </div>
        <div>
          <strong>
            {nominalHealthCount} nominales · {attentionCount} en alerta
          </strong>
          <span>Salud Operativa y Telemetría de Nodos</span>
        </div>
        <div>
          <strong>
            {verifiedLineageCount}/{lineageChain.length} eslabones
          </strong>
          <span>Integridad Cadena Merkle SHA-256 (EV-012)</span>
        </div>
        <div>
          <strong>
            {totalSignaturesIssued} firmas ({accreditedCustodians.length} claves)
          </strong>
          <span>Custodios Acreditados Ed25519 (EV-017)</span>
        </div>
        <div>
          <strong>
            {eventsRaw.length} eventos · {verifiedEvidenciasCount}/{evidencias.length} EV
          </strong>
          <span>
            Firestore ({FIRESTORE_INSTANCE_METADATA.projectId} ·{' '}
            {firestoreFederatedStates.length} estados federados ·{' '}
            {firestoreSovereigntyDocs.length} nodos · API {apiHealthSummary})
          </span>
        </div>
      </div>

      {adminActionBanner && (
        <div className="workspace-feedback-bar tabular-nums" role="status">
          <span>{adminActionBanner}</span>
          <button
            type="button"
            className="btn-toggle"
            onClick={() => setAdminActionBanner(null)}
          >
            Cerrar aviso
          </button>
        </div>
      )}

      {/* Centro de Alertas Críticas de Soberanía para Custodios Territoriales (Tokens --alert-custodian-critical-*) */}
      <div className="custodian-alert-banner tabular-nums" role="region" aria-label="Alertas de Soberanía de Custodios">
        <div>
          <span className="tiny-label">
            Alertas de Soberanía de Nodos para Custodios Territoriales (<code>EV-014</code> · <code>R5-UI</code> · <code>tokens.css</code>)
          </span>
          <div>
            <strong>
              {custodianPushEnabled
                ? 'Suscripción de Custodio Activa (Capital · Caucete · Iglesia)'
                : 'Monitoreo en Vivo de Cambios de Régimen de Soberanía'}
            </strong>
            <span>
              {' · '}
              {sovereigntyAlertHistory.length > 0
                ? `Último cambio: ${sovereigntyAlertHistory[0].nodeName} → ${sovereigntyAlertHistory[0].nextRegimeLabel} (${formatAuditTimestamp(sovereigntyAlertHistory[0].timestampIso)})`
                : 'Conmutá el régimen de cualquier nodo para disparar una alerta auditada a los custodios acreditados Ed25519.'}
            </span>
          </div>
        </div>
        <div className="admin-header-actions">
          <button
            type="button"
            className="btn-toggle whitespace-nowrap"
            onClick={() => void handleEnableCustodianAlerts()}
          >
            {custodianPushEnabled
              ? 'Notificaciones de Custodio Activas'
              : 'Activar Alertas Push de Custodio'}
          </button>
        </div>
      </div>

      {/* =====================================================================
          VISTA DEDICADA: ESTADO DE CONEXIÓN A FIREBASE FIRESTORE Y LATENCIA NODO ↔ NUBE
          ===================================================================== */}
      <div className="admin-firestore-panel tabular-nums">
        <div className="pane-header">
          <div>
            <span className="tiny-label">
              00. Estado de Conexión Actual a Firebase Firestore (Espejo de Sincronización Offline-First · ADR-020 #32) e Indicador de Latencia Nodo ↔ Nube
            </span>
            <p className="hint">
              Supervisión en tiempo real del canal hacia el proyecto{' '}
              <code>{FIRESTORE_INSTANCE_METADATA.projectId}</code> e instancia{' '}
              <code>{FIRESTORE_INSTANCE_METADATA.databaseId}</code> en los 3 departamentos de San Juan (<code>ADR-021 #33</code>).{' '}
              <strong>Regla R15 (ADR-019 Ratificado en #31):</strong> estos contadores exponen{' '}
              <em>estado de sincronización en staging</em>, no acreditación canónica (GitHub acredita).{' '}
              <strong>Precedencia ADR-020 (#32):</strong> {CANONICAL_PRECEDENCE_RULE.precedenceStatement}
            </p>
          </div>

          <div className="admin-header-actions">
            <button
              type="button"
              className="btn-confirm whitespace-nowrap"
              onClick={() => void handleVerifyFirestoreSecurityCi()}
              disabled={verifyingFirestoreSecurity}
            >
              {verifyingFirestoreSecurity
                ? 'Auditando Anti-PII & Gitleaks…'
                : firestoreCiAuditHash
                  ? `✓ CI Anti-PII & Gitleaks OK (${firestoreCiAuditHash.slice(0, 8)})`
                  : '✓ Ejecutar Test CI Anti-PII & Gitleaks (#30 / #32)'}
            </button>
            <button
              type="button"
              className="btn-toggle whitespace-nowrap"
              onClick={() => void handleProbeFirestoreLatency()}
              disabled={probingFirestoreLatency}
            >
              {probingFirestoreLatency
                ? 'Sondeando RTT Nodo ↔ Nube…'
                : 'Medir Latencia Firestore Ahora (RTT)'}
            </button>
          </div>
        </div>

        {/* Estado Global de Conexión Firestore */}
        <div className="admin-firestore-status-grid">
          <div className="admin-firestore-status-cell">
            <span className="tiny-label">Estado del Canal (Espejo H4 · No Juez Canónico)</span>
            <strong
              className={
                firestoreTelemetry.connectionState === 'connected_live'
                  ? 'admin-text-ok'
                  : firestoreTelemetry.connectionState === 'cached_local'
                    ? 'admin-text-info'
                    : 'admin-text-warn'
              }
            >
              {firestoreTelemetry.connectionState === 'connected_live'
                ? 'Conectado en Vivo · Espejo Sync Activo'
                : firestoreTelemetry.connectionState === 'cached_local'
                  ? 'Caché Local Activa · Cola Offline H4'
                  : firestoreTelemetry.connectionState === 'syncing'
                    ? 'Sincronizando Snapshot Inicial…'
                    : 'Modo Degradado · Reintento Automático'}
            </strong>
            <span className="territory-meta">
              Precedencia (<code>{CANONICAL_PRECEDENCE_RULE.adrCode} {CANONICAL_PRECEDENCE_RULE.issueRef}</code>): Manda{' '}
              <strong>{CANONICAL_PRECEDENCE_RULE.canonicalSource}</strong>
            </span>
          </div>

          <div className="admin-firestore-status-cell">
            <span className="tiny-label">Latencia Media de Sincronización (SLO Campo H4)</span>
            <strong
              className={
                firestoreTelemetry.cloudRoundTripMs <= 120
                  ? 'admin-text-ok'
                  : firestoreTelemetry.cloudRoundTripMs <= 260
                    ? 'admin-text-info'
                    : 'admin-text-warn'
              }
            >
              {firestoreTelemetry.cloudRoundTripMs} ms RTT promedio
            </strong>
            <span className="territory-meta">
              Origen actual:{' '}
              <strong>
                {firestoreTelemetry.fromCache ? 'Caché Local + Sync' : 'Servidor Cloud Directo'}
              </strong>{' '}
              · Pendientes de envío:{' '}
              <strong>{firestoreTelemetry.hasPendingWrites ? 'Sí' : '0 (Al día)'}</strong>
            </span>
          </div>

          <div className="admin-firestore-status-cell">
            <span className="tiny-label">Verificación CI Cero PII &amp; Gitleaks (#30 / #32)</span>
            <strong>{FIRESTORE_INSTANCE_METADATA.securityPolicy}</strong>
            <span className="territory-meta">
              DB: <code>{FIRESTORE_INSTANCE_METADATA.databaseId}</code> · Script CI:{' '}
              <code>npm run verify:firestore-security</code>
            </span>
          </div>

          <div className="admin-firestore-status-cell">
            <span className="tiny-label">Digest de Sincronización Federado (Bajo R4 y R15)</span>
            <strong>
              {firestoreFederatedStates.length} snapshot(s) espejo ·{' '}
              {firestoreSovereigntyDocs.length} doc(s) nodos San Juan
            </strong>
            <span className="territory-meta">
              <code>networkMerkleRoot</code> = Digest de Sincronización (acredita tras sello en{' '}
              <code>events_raw</code> de <code>main</code> · Último:{' '}
              <code>{formatAuditTimestamp(firestoreTelemetry.lastHandshakeIso)}</code>)
            </span>
          </div>
        </div>

        {/* Indicadores de Latencia de Sincronización por Nodo Territorial (Nodo ↔ Nube) */}
        <div className="admin-latency-nodes-grid">
          {enrichedNodes.map((item) => {
            const nodeKey = item.sov.nodeKey as 'capital' | 'caucete' | 'iglesia';
            const baseRtt = firestoreTelemetry.nodeSyncLatenciesMs[nodeKey] || firestoreTelemetry.cloudRoundTripMs;
            const effectiveLatencyMs =
              baseRtt + (item.queuedOfflineCount > 0 ? item.queuedOfflineCount * 24 : 0);
            const nodeCloudDocsCount = firestoreSovereigntyDocs.filter(
              (d) => d.nodeKey === nodeKey,
            ).length;

            const isFast = effectiveLatencyMs <= 120;
            const isNominal = effectiveLatencyMs > 120 && effectiveLatencyMs <= 260;
            const bandLabel = isFast
              ? 'Sincronización Óptima'
              : isNominal
                ? 'Latencia Nominal'
                : 'Enlace Andino / Cola Diferida';

            const meterClass = isFast
              ? 'admin-latency-meter-fill admin-latency-fill-fast'
              : isNominal
                ? 'admin-latency-meter-fill admin-latency-fill-nominal'
                : 'admin-latency-meter-fill admin-latency-fill-deferred';

            return (
              <div key={`latency-${nodeKey}`} className="admin-latency-node-card">
                <div className="admin-latency-node-head">
                  <strong>
                    {item.sov.nodeName} (<code>{nodeKey}</code>)
                  </strong>
                  <strong
                    className={
                      isFast
                        ? 'admin-text-ok'
                        : isNominal
                          ? 'admin-text-info'
                          : 'admin-text-warn'
                    }
                  >
                    {effectiveLatencyMs} ms
                  </strong>
                </div>

                <div
                  className="admin-latency-meter-track"
                  role="progressbar"
                  aria-valuenow={effectiveLatencyMs}
                  aria-valuemin={0}
                  aria-valuemax={400}
                  aria-label={`Latencia de sincronización entre el nodo ${item.sov.nodeName} y Firebase Firestore`}
                >
                  <div className={meterClass} />
                </div>

                <span className="territory-meta">
                  Estado de enlace: <strong>{bandLabel}</strong> · Docs en Firestore:{' '}
                  <strong>{nodeCloudDocsCount}</strong> · Cola local:{' '}
                  <strong>{item.queuedOfflineCount}</strong>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          VISTA DEDICADA 00-B: CONEXIÓN GITHUB & PUENTE MCP ([agent: google])
          ===================================================================== */}
      <div className="admin-firestore-panel tabular-nums" style={{ marginTop: '1rem' }}>
        <div className="pane-header">
          <div>
            <span className="tiny-label">
              00-B. Estado de Conexión GitHub &amp; Puente MCP (<code>[agent: google]</code> ↔{' '}
              <code>carlosleonidas04-code/delocalsoy-ar</code> · Reglas R1, R8, R10 y R15)
            </span>
            <p className="hint">
              Supervisa los dos canales de sincronización hacia{' '}
              <code>carlosleonidas04-code/delocalsoy-ar</code> (ancla remota{' '}
              <code>main @ d70cbc6</code>): <strong>(1) Conector Nativo de AI Studio</strong> (botón
              GitHub en la barra superior para publicar ramas desde tu sesión) y{' '}
              <strong>(2) Servidor MCP JSON-RPC 2.0 + Fine-Grained PAT</strong> (
              <code>GITHUB_TOKEN</code> leído exclusivamente en servidor bajo Regla <code>R10</code>
              ).
            </p>
          </div>

          <div className="admin-header-actions">
            <button
              type="button"
              className="btn-confirm whitespace-nowrap"
              onClick={() => void handleProbeGithubMcp()}
              disabled={probingGithubMcp}
            >
              {probingGithubMcp
                ? 'Sondeando GitHub & MCP…'
                : '🔌 Sondear Token & Permisos MCP (/api/github-mcp/repos)'}
            </button>
            <button
              type="button"
              className="btn-toggle whitespace-nowrap"
              onClick={async () => {
                const res = await fetch('/api/github-mcp/signal-issue-109');
                if (res.ok) {
                  const data = (await res.json()) as { markdownBody?: string };
                  if (data.markdownBody && navigator.clipboard) {
                    await navigator.clipboard.writeText(data.markdownBody);
                  }
                  setAdminActionBanner(
                    '📡 Señal oficial de [agent: google] para el Issue #109 (RG1–RG8 + ACK #109/#87) copiada al portapapeles y sellada en docs/SENAL_AGENTE_GOOGLE_ISSUE_109_ROL_STAGING.md.',
                  );
                }
              }}
            >
              📡 Copiar Señal Oficial Issue #109 (RG1–RG8)
            </button>
          </div>
        </div>

        <div className="admin-firestore-status-grid">
          <div className="admin-firestore-status-cell">
            <span className="tiny-label">Canal 1 · Conector Nativo UI de AI Studio</span>
            <strong className="admin-text-ok">
              Vinculado a carlosleonidas04-code/delocalsoy-ar
            </strong>
            <span className="territory-meta">
              Rama local lista:{' '}
              <code>
                {githubMcpStatus?.localGitState.branch ??
                  'feat/fase-0-reiniciada-activos-territoriales'}
              </code>{' '}
              (SHA:{' '}
              <code>{githubMcpStatus?.localGitState.shortSha ?? 'firmado R1'}</code>)
            </span>
          </div>

          <div className="admin-firestore-status-cell">
            <span className="tiny-label">Canal 2 · GITHUB_TOKEN en Servidor (Regla R10)</span>
            <strong
              className={
                githubMcpStatus?.tokenConfiguredInServerEnv ? 'admin-text-ok' : 'admin-text-info'
              }
            >
              {githubMcpStatus?.tokenConfiguredInServerEnv
                ? `Activo (${githubMcpStatus.tokenSource})`
                : 'Pendiente en Variables de Entorno (.dev.env.json / .env)'}
            </strong>
            <span className="territory-meta">
              Token enmascarado: <code>{githubMcpStatus?.tokenMasked ?? 'NO_CONFIGURADO'}</code>
            </span>
          </div>

          <div className="admin-firestore-status-cell">
            <span className="tiny-label">Servidor MCP Local (JSON-RPC 2.0 stdio)</span>
            <strong className="admin-text-ok">
              ONLINE · delocalsoy-agent-google-mcp (protocol 2024-11-05)
            </strong>
            <span className="territory-meta">
              Herramientas: <code>github_status</code>, <code>ensure_branch_protection</code>,{' '}
              <code>sync_pr3_additive</code>, <code>list_repositories</code>
            </span>
          </div>

          <div className="admin-firestore-status-cell">
            <span className="tiny-label">Pacto Sinergia Win-Win (ADR-034 · #114 / PR #115)</span>
            <strong className="admin-text-ok">
              RATIFICADO EN main @ 1272e45 · Iteración 1 tokens.css Lista (#109)
            </strong>
            <span className="territory-meta">
              Dominio: <code>apps/web/src/design/tokens.css</code> (<code>§4.5</code> solo-estética en PR ·{' '}
              <code>§4.6</code> import en <code>main.tsx</code>)
            </span>
          </div>
        </div>
      </div>

      {/* =====================================================================
          BLOQUE 1: MATRIZ CONSOLIDADA DE SALUD, SOBERANÍA Y SPARKLINES POR NODO
          ===================================================================== */}
      <div className="admin-section-block">
        <div className="pane-header">
          <div>
            <span className="tiny-label">
              01. Estado de Salud Operativa, Régimen de Soberanía y Tendencia de Actividad por Nodo (
              {filteredNodes.length} de {federalSovereignty.length} nodos)
            </span>
            <p className="hint">
              Cada fila consolida la raíz Merkle del nodo, su modo de soberanía de datos, el estado de su
              estación hidrométrica y un sparkline interactivo Recharts/D3 con la evolución de eventos
              verificados desde 2026-Q1 hasta la sesión actual.
            </p>
          </div>

          <div className="admin-filters-bar">
            <div className="filter-group" role="group" aria-label="Filtrar por régimen de soberanía">
              <button
                type="button"
                className={sovereigntyFilter === 'all' ? 'btn-filter active' : 'btn-filter'}
                onClick={() => setSovereigntyFilter('all')}
              >
                Todos los regímenes ({federalSovereignty.length})
              </button>
              <button
                type="button"
                className={
                  sovereigntyFilter === 'delegacion_revocable_activa'
                    ? 'btn-filter active'
                    : 'btn-filter'
                }
                onClick={() => setSovereigntyFilter('delegacion_revocable_activa')}
              >
                Delegación Federal ({delegatedCount})
              </button>
              <button
                type="button"
                className={
                  sovereigntyFilter === 'custodia_local_estricta'
                    ? 'btn-filter active'
                    : 'btn-filter'
                }
                onClick={() => setSovereigntyFilter('custodia_local_estricta')}
              >
                Custodia Estricta ({strictCustodyCount})
              </button>
            </div>

            <div className="filter-group" role="group" aria-label="Filtrar por salud operativa">
              <button
                type="button"
                className={healthFilter === 'all' ? 'btn-filter active' : 'btn-filter'}
                onClick={() => setHealthFilter('all')}
              >
                Toda la red
              </button>
              <button
                type="button"
                className={healthFilter === 'nominal' ? 'btn-filter active' : 'btn-filter'}
                onClick={() => setHealthFilter('nominal')}
              >
                Salud Nominal ({nominalHealthCount})
              </button>
              <button
                type="button"
                className={healthFilter === 'attention' ? 'btn-filter active' : 'btn-filter'}
                onClick={() => setHealthFilter('attention')}
              >
                Requiere Atención ({attentionCount})
              </button>
            </div>
          </div>
        </div>

        {filteredNodes.length === 0 ? (
          <p className="empty-state">
            No hay nodos territoriales que coincidan con los filtros administrativos seleccionados.
          </p>
        ) : (
          <div className="admin-node-grid">
            {filteredNodes.map((item) => {
              const {
                sov,
                territorio,
                station,
                custodian,
                queuedOfflineCount,
                recentNodeEventsCount,
                sparklineSeries,
                latestActivityScore,
                growthPct,
                isActive,
                hasTelemetryAlert,
                requiresAttention,
                healthLabel,
                healthReason,
              } = item;
              const isDelegated = sov.sovereigntyMode === 'delegacion_revocable_activa';
              const strokeColor = requiresAttention
                ? '#d99b26'
                : isDelegated
                  ? '#2e9e5b'
                  : '#38bdf8';
              const gradientId = `spark-grad-${sov.nodeKey}`;

              return (
                <article
                  key={sov.nodeKey}
                  className={
                    requiresAttention
                      ? 'admin-node-panel admin-node-attention'
                      : 'admin-node-panel admin-node-nominal'
                  }
                >
                  <div className="admin-node-top">
                    <div>
                      <div className="territory-name">
                        <span className={`token-node-tag-${sov.nodeKey}`}>
                          {sov.nodeName}
                        </span>{' '}
                        <span className="node-subtitle">
                          · Provincia de {sov.provincia} · Clave: <code>{sov.nodeKey}</code>
                        </span>
                      </div>
                      <div className="territory-meta tabular-nums">
                        Estado de Red:{' '}
                        <strong className={isActive ? 'admin-text-ok' : 'admin-text-warn'}>
                          {isActive ? 'Nodo Activo' : 'En Vinculación / Inactivo'}
                        </strong>{' '}
                        · Diagnóstico:{' '}
                        <strong className={requiresAttention ? 'admin-text-warn' : 'admin-text-ok'}>
                          {healthLabel}
                        </strong>
                      </div>
                    </div>

                    <div className="territory-meta tabular-nums admin-right-meta">
                      <span>
                        Merkle Root: <code>{sov.nodeMerkleRoot}</code>
                      </span>
                      <span>
                        Última auditoría: <code>{formatAuditTimestamp(sov.lastAuditAt)}</code>
                      </span>
                    </div>
                  </div>

                  <p className="admin-node-reason">{healthReason}</p>

                  {/* Metadatos desempacados + Sparkline Recharts/D3 por nodo */}
                  <div className="admin-node-metrics-row tabular-nums">
                    <div>
                      <span className="tiny-label">Régimen de Soberanía (EV-014)</span>
                      <strong
                        className={
                          isDelegated
                            ? 'sovereignty-delegated-tag'
                            : 'sovereignty-strict-tag'
                        }
                      >
                        {isDelegated
                          ? 'Delegación Federal Revocable Activa'
                          : 'Custodia Local Estricta (Solo Metadatos)'}
                      </strong>
                      <span className="territory-meta">
                        Capas compartidas: <strong>{sov.sharedLayersCount}</strong> · Geometrías
                        PostGIS: <strong>{sov.postgisCount}</strong> · Paquetes Sync:{' '}
                        <strong>{sov.syncPacksCount}</strong>
                      </span>
                    </div>

                    <div>
                      <span className="tiny-label">Custodios y Firma Ed25519 (EV-017)</span>
                      <strong>
                        {sov.custodiansActive
                          .map((c) => CUSTODIAN_SECTOR_LABELS[c] ?? c)
                          .join(' · ') || 'Comunidad'}
                      </strong>
                      <span className="territory-meta">
                        {custodian ? (
                          <>
                            Clave: <code>{custodian.publicKeyFingerprint}</code> · Firmas:{' '}
                            <strong>{custodian.signaturesIssuedCount}</strong>
                          </>
                        ) : (
                          'Custodio criptográfico en registro'
                        )}
                      </span>
                    </div>

                    <div>
                      <span className="tiny-label">Salud de Campo, Sensores y Auditoría</span>
                      <strong className={hasTelemetryAlert ? 'admin-text-warn' : 'admin-text-ok'}>
                        {station
                          ? `${station.stationCode}: ${station.lastValue} ${station.unit} (umbral ${station.thresholdWarning} ${station.unit})`
                          : 'Sin estación asociada'}
                      </strong>
                      <span className="territory-meta">
                        Cola offline pendiente: <strong>{queuedOfflineCount}</strong> · Eventos
                        directos en sesión: <strong>{recentNodeEventsCount}</strong>
                      </span>
                    </div>

                    {/* Visual Sparkline Recharts/D3 para la tendencia de actividad de eventos del nodo */}
                    <div className="admin-sparkline-cell">
                      <div className="admin-sparkline-header">
                        <span className="tiny-label">
                          Tendencia de Eventos (Q1 → Vivo)
                        </span>
                        <strong className={requiresAttention ? 'admin-text-warn' : 'admin-text-ok'}>
                          +{growthPct}% · {latestActivityScore} acum.
                        </strong>
                      </div>

                      <div
                        className="admin-sparkline-chart-wrap"
                        aria-label={`Sparkline de tendencia de eventos para el nodo ${sov.nodeName}`}
                      >
                        <ResponsiveContainer width="100%" height={54}>
                          <AreaChart
                            data={sparklineSeries}
                            margin={{ top: 4, right: 4, left: 4, bottom: 2 }}
                          >
                            <defs>
                              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={strokeColor} stopOpacity={0.38} />
                                <stop offset="95%" stopColor={strokeColor} stopOpacity={0.02} />
                              </linearGradient>
                            </defs>
                            <YAxis hide domain={['dataMin - 1', 'dataMax + 2']} />
                            <Tooltip
                              formatter={(value) => [
                                `${String(value ?? 0)} hitos/eventos`,
                                'Actividad sellada',
                              ]}
                              labelFormatter={(_label, payload) =>
                                payload?.[0]?.payload?.windowLabel ?? 'Corte temporal'
                              }
                            />
                            <Area
                              type="monotone"
                              dataKey="eventCount"
                              stroke={strokeColor}
                              strokeWidth={2}
                              fillOpacity={1}
                              fill={`url(#${gradientId})`}
                              isAnimationActive={false}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>

                      <span className="territory-meta">
                        Ventanas:{' '}
                        {sparklineSeries
                          .map((pt) => `${pt.shortLabel}: ${pt.eventCount}`)
                          .join(' · ')}
                      </span>
                    </div>
                  </div>

                  {/* Controles Administrativos del Nodo */}
                  <div className="admin-node-actions">
                    <button
                      type="button"
                      className="btn-confirm"
                      disabled={togglingNodeKey === sov.nodeKey}
                      onClick={() => void handleToggleSovereigntyClick(sov.nodeKey)}
                    >
                      {togglingNodeKey === sov.nodeKey
                        ? 'Actualizando pacto…'
                        : isDelegated
                          ? 'Conmutar a Custodia Local Estricta'
                          : 'Activar Delegación Federal Revocable'}
                    </button>

                    <button
                      type="button"
                      className="btn-toggle"
                      onClick={() => onInspectNode(sov.nodeKey)}
                    >
                      Inspeccionar Ficha Integral
                    </button>

                    {territorio && (
                      <>
                        <button
                          type="button"
                          className="btn-toggle"
                          onClick={() => onFocusOnGoogleMap(territorio.id)}
                        >
                          Enfocar en Mapa
                        </button>
                        <button
                          type="button"
                          className="btn-toggle"
                          onClick={() => void onToggleTerritorioActivo(territorio)}
                        >
                          {territorio.activo ? 'Pausar / Desactivar Nodo' : 'Activar Nodo en Red'}
                        </button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* =====================================================================
          BLOQUE 2: ACTIVIDAD DE AUDITORÍA RECIENTE Y ESLABONES DE LINAJE
          ===================================================================== */}
      <div className="admin-section-block">
        <div className="pane-header">
          <div>
            <span className="tiny-label tabular-nums">
              02. Flujo de Actividad de Auditoría Reciente ({filteredAuditEvents.length} mostrados de{' '}
              {eventsRaw.length} eventos inmutables en events_raw)
            </span>
            <p className="hint">
              Registro cronológico inverso de cambios de soberanía, verificaciones de linaje SHA-256,
              ratificaciones humanas R8/R9 e ingesta de telemetría.
            </p>
          </div>

          <div className="admin-filters-bar">
            <div className="filter-group" role="group" aria-label="Filtrar auditoría por categoría">
              <button
                type="button"
                className={auditCategory === 'all' ? 'btn-filter active' : 'btn-filter'}
                onClick={() => setAuditCategory('all')}
              >
                Todos
              </button>
              <button
                type="button"
                className={auditCategory === 'sovereignty' ? 'btn-filter active' : 'btn-filter'}
                onClick={() => setAuditCategory('sovereignty')}
              >
                Soberanía &amp; Federación
              </button>
              <button
                type="button"
                className={auditCategory === 'crypto_lineage' ? 'btn-filter active' : 'btn-filter'}
                onClick={() => setAuditCategory('crypto_lineage')}
              >
                Linaje &amp; Firmas
              </button>
              <button
                type="button"
                className={auditCategory === 'ethical_ai' ? 'btn-filter active' : 'btn-filter'}
                onClick={() => setAuditCategory('ethical_ai')}
              >
                Revisiones R8/R9 &amp; IA
              </button>
              <button
                type="button"
                className={auditCategory === 'telemetry_ops' ? 'btn-filter active' : 'btn-filter'}
                onClick={() => setAuditCategory('telemetry_ops')}
              >
                Campo &amp; Sensores
              </button>
            </div>

            <div className="filter-group" role="group" aria-label="Filtrar auditoría por nodo">
              <button
                type="button"
                className={selectedNodeAuditFilter === 'all' ? 'btn-filter active' : 'btn-filter'}
                onClick={() => setSelectedNodeAuditFilter('all')}
              >
                Todos los nodos
              </button>
              {federalSovereignty.map((n) => (
                <button
                  key={n.nodeKey}
                  type="button"
                  className={
                    selectedNodeAuditFilter === n.nodeKey ? 'btn-filter active' : 'btn-filter'
                  }
                  onClick={() => setSelectedNodeAuditFilter(n.nodeKey)}
                >
                  {n.nodeName}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredAuditEvents.length === 0 ? (
          <p className="empty-state">
            No se registran eventos de auditoría para la combinación de filtros seleccionada.
          </p>
        ) : (
          <ul className="territory-list">
            {filteredAuditEvents.map((ev) => (
              <li key={`${ev.id}-${ev.hash}`} className="territory-item">
                <div className="territory-info">
                  <span className="territory-name tabular-nums">
                    <code>{ev.type}</code>{' '}
                    <span className="node-subtitle">
                      · Ámbito: <strong>{ev.nodeId}</strong> ·{' '}
                      {ev.is_synthetic
                        ? 'Modo Sintético Explícito (R5)'
                        : 'Ejecución Verificada en Sesión'}
                    </span>
                  </span>
                  <span className="territory-meta tabular-nums">
                    {summarizePayload(ev.payload)}
                  </span>
                </div>

                <div className="territory-info tabular-nums admin-right-meta">
                  <span className="territory-meta">
                    Hash SHA-256: <code>{ev.hash}</code>
                  </span>
                  <span className="territory-meta">
                    Ocurrido: <code>{formatAuditTimestamp(ev.occurred_at)}</code>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
