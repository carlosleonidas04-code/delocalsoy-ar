import { type FormEvent, useEffect, useMemo, useState } from 'react';
import {
  DOMAINS,
  REPORT_STATUS_META,
  STATUS_META,
  type DomainKey,
  type EpistemicStatus,
  type EvidenciaRecord,
  type FederalSovereigntyRecord,
  type RawEventRecord,
  type SpatialGeometryRecord,
  type TerritorialReport,
  type TerritorioCategory,
  type TerritorioFeature,
  type TerritorioLayer,
} from '../data/federatedModel';
import type { Territorio } from '../App';
import {
  VerifiedAssetsGalleryView,
  type VisualCheckStatus,
} from './VerifiedAssetsGalleryView';
import {
  DriveReportExportModal,
  type DriveExportTarget,
} from './DriveReportExportModal';
import type { ExportReportTemplateKey } from './WorkspacePanel';
import { recordCustodianSovereigntyAlertInFirestore } from '../lib/firestoreEthicalStore';

export type CustodianFilterKey = 'all' | 'community' | 'institutions' | 'businesses';

export const CUSTODIAN_META: {
  key: CustodianFilterKey;
  label: string;
  shortLabel: string;
}[] = [
  { key: 'all', label: 'Todos los custodios', shortLabel: 'Todos' },
  { key: 'community', label: 'Comunidad', shortLabel: 'Comunidad' },
  { key: 'institutions', label: 'Instituciones', shortLabel: 'Instituciones' },
  {
    key: 'businesses',
    label: 'Comercios / Productores',
    shortLabel: 'Comercios / Prod.',
  },
];

const EPISTEMIC_TO_R5_UI: Record<
  EpistemicStatus,
  {
    r5State: 'publicado' | 'verificado' | 'en_revision' | 'pendiente';
    badgeLabel: string;
    tokenClass: string;
  }
> = {
  verified: {
    r5State: 'publicado',
    badgeLabel: 'R5-UI: publicado / verificado',
    tokenClass: 'r5-state-badge r5-state-publicado',
  },
  community_validated: {
    r5State: 'verificado',
    badgeLabel: 'R5-UI: verificado (comunidad)',
    tokenClass: 'r5-state-badge r5-state-verificado',
  },
  pending: {
    r5State: 'pendiente',
    badgeLabel: 'R5-UI: pendiente',
    tokenClass: 'r5-state-badge r5-state-pendiente',
  },
  synthetic_demo: {
    r5State: 'en_revision',
    badgeLabel: 'R5-UI: en_revision (semilla)',
    tokenClass: 'r5-state-badge r5-state-en_revision',
  },
};

interface EcosystemIntegrationItem {
  id: string;
  category: 'demo_kept' | 'ecosystem_new' | 'governance_discarded';
  title: string;
  demoOrigin: string;
  ecosystemIntegration: string;
  verificationRef: string;
}

const COCO_BABA_INTEGRATION_MATRIX: EcosystemIntegrationItem[] = [
  {
    id: 'int-01',
    category: 'demo_kept',
    title: 'Matriz 7 Dominios × 3 Nodos & Soberanía Semántica',
    demoOrigin:
      'FederatedView en docs/demo/delocalsoy-demo-territorial-federado.jsx (tabla de 7 dominios y barra Activos vs. Problemáticas).',
    ecosystemIntegration:
      'Integrada en vivo con /api/modelo-federado, tokens cromáticos de San Juan (ADR-034) y salto interactivo por celda hacia el mapa del nodo.',
    verificationRef: 'ADR-021 · ADR-034 · EV-006',
  },
  {
    id: 'int-02',
    category: 'demo_kept',
    title: 'Filtro de Capas por Custodio Tripartito & Sub-Vistas del Nodo',
    demoOrigin:
      'NodeExplorerView del Demo Base: filtros Comunidad / Instituciones / Comercios y pestañas Mapa · Reportar · Panel del Nodo.',
    ecosystemIntegration:
      'Conectado a capas reales por departamento, estados R5-UI (Issue #109), coordenadas PostGIS SRID=4326 y galería de activos verificados.',
    verificationRef: 'Issue #109 · EV-005 · EV-010',
  },
  {
    id: 'int-03',
    category: 'demo_kept',
    title: 'Flujo Extremo a Extremo en 5 Pasos & Contrato JSON del Nodo',
    demoOrigin:
      'ArchitectureView del Demo Base: 5 pasos (Evento → Validación → Proyección → Tablero → Evidencia) e inspector JSON.',
    ecosystemIntegration:
      'Evolucionado a delocalsoy.node.v2 con paridad en vivo hacia events_raw, @delocalsoy/contracts, PostGIS GiST y Firestore.',
    verificationRef: 'CORE-001 6/6 · CORE-002 6/6 · EV-036',
  },
  {
    id: 'int-04',
    category: 'ecosystem_new',
    title: 'Contrato IDataSource Honesto (R5) & Máquina de Estados R5-UI',
    demoOrigin:
      'En el demo original los datos vivían en useState local sin distinción de modo operativo ni estados editoriales R5-UI.',
    ecosystemIntegration:
      'Sustituido por ApiDataSource / SyntheticDataSource sin fallback silencioso (Regla R5) y 5 estados R5-UI (pendiente, en_revision, verificado, publicado, rechazado).',
    verificationRef: 'PR #41 · PR #60 · Issue #109',
  },
  {
    id: 'int-05',
    category: 'ecosystem_new',
    title: 'Alertas Push FCM / Firestore para Custodios & Copiloto Ético',
    demoOrigin:
      'El demo original solo mostraba un bloque estático de texto para el Copiloto IA y carecía de alertas a custodios.',
    ecosystemIntegration:
      'Integrado con despacho de alertas Push FCM / Firestore ante cambios críticos de soberanía o reportes y firma humana ética (POST /api/ethical-review).',
    verificationRef: 'ADR-004 · ADR-020 · EV-014 · EV-017',
  },
  {
    id: 'int-06',
    category: 'governance_discarded',
    title: 'Lo Descartado del Demo Base (Filtro de Gobernanza R-Scope y ADR-034)',
    demoOrigin:
      'El archivo .jsx aislado incluía un 4.º nodo fuera de San Juan, estilos oscuros hardcodeados (#0e1013) y mutaciones sin autenticación.',
    ecosystemIntegration:
      'Descartado: alcance exclusivo en los 3 departamentos de San Juan (Capital [Centro y Desamparados], Caucete e Iglesia), tokens CSS Light/Dark y guardia requireWriteAuth (R8).',
    verificationRef: 'ADR-021 (#33) · ADR-027 · ADR-034 (#114)',
  },
];

const FIVE_STEP_ARCHITECTURE_FLOW = [
  {
    step: '01',
    title: 'Evento Crudo (events_raw)',
    subtitle: 'Ingesta Append-Only + Anti-PII',
    detail:
      'Toda observación comunitaria, reporte o cambio de soberanía ingresa como evento inmutable con hash SHA-256 único (EV-005) y filtro Anti-PII Ley 25.326 (EV-023).',
    badge: 'POST /api/events · HTTP 409 en duplicado',
  },
  {
    step: '02',
    title: 'Validación & Contratos',
    subtitle: '@delocalsoy/contracts + R8',
    detail:
      'Validación estricta con esquemas Zod compartidos, guardia de escritura requireWriteAuth / JWT RBAC (ciudadano, moderador, admin) y preservación del vocabulario local del nodo.',
    badge: 'EV-019 · EV-022 · EV-032',
  },
  {
    step: '03',
    title: 'Proyección Territorial',
    subtitle: 'PostGIS SRID=4326 + R5-UI',
    detail:
      'Indexación espacial GiST (idx_territorios_geom_gist), consulta por ?bbox= y transición trazable en la máquina de estados R5-UI (pendiente → en_revision → verificado → publicado).',
    badge: 'PR #46 (2482f63d) · Issue #109',
  },
  {
    step: '04',
    title: 'Tablero, Mapa & Push FCM',
    subtitle: 'Design Tokens ADR-034 + Custodios',
    detail:
      'Visualización en el lienzo esquemático y Google Maps con paleta 60-30-10 (tokens.css) y disparo de notificaciones Push FCM / Firestore a los custodios del nodo.',
    badge: 'ADR-034 (#114) · FCM / Firestore',
  },
  {
    step: '05',
    title: 'Evidencia Auditable',
    subtitle: 'HITUB + Firma Humana Ética',
    detail:
      'Cada hito alimenta el scorecard ejecutable (EV-001..EV-036), exige requiresHumanReview: true en el Copiloto Ético y permite exportar dossieres verificados a Google Drive.',
    badge: 'R1–R15 · EV-014 · Drive/Docs',
  },
];

interface FederatedNodeExplorerProps {
  territorios: Territorio[];
  selectedNodeKey: string;
  onSelectNodeKey: (key: string) => void;
  layersByNode: Record<string, TerritorioLayer[]>;
  categoriesByNode: Record<string, TerritorioCategory[]>;
  features: TerritorioFeature[];
  reports: TerritorialReport[];
  eventsRaw?: RawEventRecord[];
  spatialGeometries?: SpatialGeometryRecord[];
  federalSovereignty?: FederalSovereigntyRecord[];
  evidencias?: EvidenciaRecord[];
  runtimeMode?: string;
  onCreateReport: (payload: {
    nodeKey: string;
    category: string;
    description: string;
    picked: { x: number; y: number };
  }) => Promise<void>;
  onAdvanceReport: (reportId: string) => Promise<void>;
  onRecordHumanReview: (nodeKey: string, reviewerNote: string) => Promise<void>;
  onToggleNodeSovereignty?: (nodeKey: string) => Promise<void>;
  onFocusOnGoogleMap: (territorioId: string) => void;
  onOpenNodeDetailModal?: (nodeKey: string) => void;
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
  externalCockpitMacroView?:
    | 'federated_matrix'
    | 'node_explorer'
    | 'compare_nodes'
    | 'architecture_contract';
  externalCustodianFilter?: CustodianFilterKey;
}

export function FederatedNodeExplorer({
  territorios,
  selectedNodeKey,
  onSelectNodeKey,
  layersByNode,
  categoriesByNode,
  features,
  reports,
  eventsRaw = [],
  spatialGeometries = [],
  federalSovereignty = [],
  evidencias = [],
  runtimeMode = 'real',
  onCreateReport,
  onAdvanceReport,
  onRecordHumanReview,
  onToggleNodeSovereignty,
  onFocusOnGoogleMap,
  onOpenNodeDetailModal,
  onVisualValidateAsset,
  onExportVerified,
  externalCockpitMacroView,
  externalCustodianFilter,
}: FederatedNodeExplorerProps) {
  // 4 Vistas Canónicas del Demo Base integradas con el Ecosistema General ("Coco-Baba")
  const [cockpitMacroView, setCockpitMacroView] = useState<
    'federated_matrix' | 'node_explorer' | 'compare_nodes' | 'architecture_contract'
  >(externalCockpitMacroView ?? 'node_explorer');

  useEffect(() => {
    if (externalCockpitMacroView) {
      setCockpitMacroView(externalCockpitMacroView);
    }
  }, [externalCockpitMacroView]);

  // Sub-pestañas dentro de "Explorar Nodo" (fieles al Demo Base + Galería IA)
  const [explorerViewMode, setExplorerViewMode] = useState<
    'map_and_layers' | 'report_flow' | 'node_dashboard' | 'gallery'
  >('map_and_layers');

  // Filtro de matriz de integración ("Lo Integrado", "Lo Nuevo", "Lo Descartado")
  const [triageFilter, setTriageFilter] = useState<
    'all' | 'demo_kept' | 'ecosystem_new' | 'governance_discarded'
  >('all');
  const [showIntegrationMatrix, setShowIntegrationMatrix] = useState<boolean>(true);

  const activeNode = useMemo(
    () =>
      territorios.find((t) => t.key === selectedNodeKey) ??
      territorios[0] ?? {
        id: 'ter-sjn-cap',
        key: 'capital',
        nombre: 'Capital',
        subtitulo: 'Distrito Centro · Distrito Desamparados',
        provincia: 'San Juan',
        foco: 'Comercio, acequias urbanas, arbolado y espacio público',
        poblacion: 115000,
        color: '#C2410C',
        activo: true,
      },
    [territorios, selectedNodeKey],
  );

  // Estado de Comparación Integrada (Vista 3 del Demo Base)
  const [compareNodeKeyA, setCompareNodeKeyA] = useState<string>('capital');
  const [compareNodeKeyB, setCompareNodeKeyB] = useState<string>('caucete');
  const [compareDomain, setCompareDomain] = useState<DomainKey>('problems');

  const nodeLayers = useMemo(
    () => layersByNode[activeNode.key] ?? [],
    [layersByNode, activeNode.key],
  );

  const nodeCategories = useMemo(
    () => categoriesByNode[activeNode.key] ?? [],
    [categoriesByNode, activeNode.key],
  );

  const [custodianFilter, setCustodianFilter] = useState<CustodianFilterKey>(
    externalCustodianFilter ?? 'all',
  );

  useEffect(() => {
    if (externalCustodianFilter) {
      setCustodianFilter(externalCustodianFilter);
    }
  }, [externalCustodianFilter]);
  const [enabledLayers, setEnabledLayers] = useState<Record<string, boolean>>({});
  const [selectedFeature, setSelectedFeature] = useState<TerritorioFeature | null>(null);
  const [pickMode, setPickMode] = useState(false);
  const [pickedCoords, setPickedCoords] = useState<{ x: number; y: number }>({
    x: 50,
    y: 50,
  });
  const [reportCategory, setReportCategory] = useState<string>('');
  const [reportDesc, setReportDesc] = useState<string>('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reviewerNote, setReviewerNote] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [driveExportTarget, setDriveExportTarget] =
    useState<DriveExportTarget | null>(null);
  const [pushAlertFeedback, setPushAlertFeedback] = useState<string | null>(null);
  const [copiedContractJson, setCopiedContractJson] = useState<boolean>(false);

  // Sincronizar capas activas por defecto al cambiar de nodo o filtro de custodio
  useEffect(() => {
    const nextLayers: Record<string, boolean> = {};
    for (const l of nodeLayers) {
      if (custodianFilter === 'all') {
        nextLayers[l.key] = l.defaultOn;
      } else {
        nextLayers[l.key] = l.producedBy.includes(custodianFilter);
      }
    }
    setEnabledLayers(nextLayers);
    setSelectedFeature(null);
    setReportCategory(nodeCategories[0]?.code ?? '');
  }, [activeNode.key, nodeLayers, nodeCategories, custodianFilter]);

  const filteredNodeLayers = useMemo(() => {
    if (custodianFilter === 'all') return nodeLayers;
    return nodeLayers.filter((l) => l.producedBy.includes(custodianFilter));
  }, [nodeLayers, custodianFilter]);

  const nodeFeatures = useMemo(
    () =>
      features.filter(
        (f) => f.nodeKey === activeNode.key && enabledLayers[f.layer],
      ),
    [features, activeNode.key, enabledLayers],
  );

  const allNodeFeatures = useMemo(
    () => features.filter((f) => f.nodeKey === activeNode.key),
    [features, activeNode.key],
  );

  const nodeReports = useMemo(
    () => reports.filter((r) => r.nodeKey === activeNode.key),
    [reports, activeNode.key],
  );

  const nodeGeometries = useMemo(
    () => spatialGeometries.filter((g) => g.nodeKey === activeNode.key),
    [spatialGeometries, activeNode.key],
  );

  const nodeSovereignty = useMemo(
    () =>
      federalSovereignty.find((s) => s.nodeKey === activeNode.key) ?? null,
    [federalSovereignty, activeNode.key],
  );

  const assetsCount = allNodeFeatures.filter((f) => f.type === 'asset').length;
  const problemsCount = allNodeFeatures.filter((f) => f.type === 'problem').length;
  const assetsRatioPct =
    allNodeFeatures.length > 0
      ? Math.round((assetsCount / allNodeFeatures.length) * 100)
      : 50;

  const toggleLayer = (layerKey: string) => {
    setEnabledLayers((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!pickMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    setPickedCoords({
      x: Math.max(6, Math.min(94, x)),
      y: Math.max(8, Math.min(92, y)),
    });
    setPickMode(false);
  };

  const handleSubmitReport = async (e: FormEvent) => {
    e.preventDefault();
    if (!reportCategory) return;
    setSubmittingReport(true);
    try {
      const catLabel =
        nodeCategories.find((c) => c.code === reportCategory)?.label ??
        reportCategory;
      await onCreateReport({
        nodeKey: activeNode.key,
        category: reportCategory,
        description:
          reportDesc.trim() || 'Observación registrada en explorador territorial',
        picked: pickedCoords,
      });

      // Emitir alerta Push FCM / Firestore al custodio del nodo ante nuevo reporte territorial
      const alertRes = await recordCustodianSovereigntyAlertInFirestore({
        nodeKey: activeNode.key as 'capital' | 'caucete' | 'iglesia',
        nodeName: activeNode.nombre,
        previousMode:
          nodeSovereignty?.sovereigntyMode ?? 'delegacion_revocable_activa',
        nextMode:
          nodeSovereignty?.sovereigntyMode ?? 'delegacion_revocable_activa',
        severity: 'warning',
        custodianTarget: `Mesa Custodia ${activeNode.nombre} (${catLabel})`,
        summary: `Nuevo reporte en ${activeNode.nombre}: ${catLabel} en coord. (${pickedCoords.x}, ${pickedCoords.y}).`,
        fcmTopic: `sovereignty-alerts-${activeNode.key}`,
      });

      setPushAlertFeedback(
        `Reporte creado en ${activeNode.nombre} + Alerta Push FCM despachada a tópico ${alertRes.record.fcmTopic} (SHA-256: ${alertRes.record.sha256.slice(0, 12)})`,
      );
      setReportDesc('');
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleHumanReviewSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmittingReview(true);
    try {
      await onRecordHumanReview(
        activeNode.key,
        reviewerNote.trim() ||
          `Validación humana ratificada para el nodo ${activeNode.nombre}`,
      );
      setReviewerNote('');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleTriggerCustodianPushForNode = async (targetNode: Territorio) => {
    const currentSov = federalSovereignty.find((s) => s.nodeKey === targetNode.key);
    const prevMode = currentSov?.sovereigntyMode ?? 'delegacion_revocable_activa';
    const nextMode =
      prevMode === 'delegacion_revocable_activa'
        ? 'custodia_local_estricta'
        : 'delegacion_revocable_activa';

    if (onToggleNodeSovereignty) {
      await onToggleNodeSovereignty(targetNode.key);
    }

    const res = await recordCustodianSovereigntyAlertInFirestore({
      nodeKey: targetNode.key as 'capital' | 'caucete' | 'iglesia',
      nodeName: targetNode.nombre,
      previousMode: prevMode,
      nextMode,
      severity: nextMode === 'custodia_local_estricta' ? 'critical' : 'resolved',
      custodianTarget: `Custodios Tripartitos de ${targetNode.nombre}`,
      summary: `Cambio de soberanía en ${targetNode.nombre}: ${prevMode} → ${nextMode} desde el Cockpit Integrado Demo Base.`,
      fcmTopic: `sovereignty-alerts-${targetNode.key}`,
    });

    setPushAlertFeedback(
      `[FCM Push + Firestore] ${targetNode.nombre}: ${prevMode} → ${nextMode} · Tópico: ${res.record.fcmTopic} · Hash: ${res.record.sha256.slice(0, 12)}`,
    );
  };

  // Construcción en vivo del Contrato Técnico JSON del Nodo (Vista 4 del Demo Base evolucionada a v2)
  const liveNodeContractJson = useMemo(() => {
    return JSON.stringify(
      {
        schema: 'delocalsoy.node.v2',
        ecosystemVersion: '7.7-coco-baba-integrated',
        runtimeMode,
        node: {
          id: activeNode.id,
          key: activeNode.key,
          name: activeNode.nombre,
          subtitle: activeNode.subtitulo,
          provincia: activeNode.provincia,
          focus: activeNode.foco,
          population: activeNode.poblacion,
          colorToken: `var(--node-${activeNode.key}-accent, ${activeNode.color})`,
          sovereigntyMode:
            nodeSovereignty?.sovereigntyMode ?? 'delegacion_revocable_activa',
          merkleRootSha256:
            nodeSovereignty?.nodeMerkleRoot ??
            `merkle-${activeNode.key}-4326-verified`,
        },
        r5UiStateMapping: {
          verified: 'publicado',
          community_validated: 'verificado',
          pending: 'pendiente',
          synthetic_demo: 'en_revision',
        },
        layers: nodeLayers.map((l) => ({
          key: l.key,
          name: l.name,
          domain: l.domain,
          geometry: l.geometry,
          srid: 4326,
          producedBy: l.producedBy,
        })),
        categoriesCount: nodeCategories.length,
        categories: nodeCategories,
        telemetryAndRecords: {
          featuresTotal: allNodeFeatures.length,
          assetsCount,
          problemsCount,
          postgisGeometriesCount: nodeGeometries.length,
          activeReportsCount: nodeReports.filter((r) => r.status !== 'resolved')
            .length,
          resolvedReportsCount: nodeReports.filter((r) => r.status === 'resolved')
            .length,
          eventsRawTotalInSession: eventsRaw.length,
        },
        ethicalContract: {
          requiresHumanReview: true,
          antiPiiLaw25326: true,
          writeAuthGuard: 'requireWriteAuth (R8)',
        },
      },
      null,
      2,
    );
  }, [
    activeNode,
    runtimeMode,
    nodeSovereignty,
    nodeLayers,
    nodeCategories,
    allNodeFeatures.length,
    assetsCount,
    problemsCount,
    nodeGeometries.length,
    nodeReports,
    eventsRaw.length,
  ]);

  const handleCopyContractJson = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(liveNodeContractJson);
      setCopiedContractJson(true);
      setTimeout(() => setCopiedContractJson(false), 2500);
    }
  };

  const filteredIntegrationItems = useMemo(() => {
    if (triageFilter === 'all') return COCO_BABA_INTEGRATION_MATRIX;
    return COCO_BABA_INTEGRATION_MATRIX.filter(
      (item) => item.category === triageFilter,
    );
  }, [triageFilter]);

  const compareNodeA =
    territorios.find((t) => t.key === compareNodeKeyA) ?? territorios[0];
  const compareNodeB =
    territorios.find((t) => t.key === compareNodeKeyB) ??
    territorios[1] ??
    territorios[0];

  return (
    <section id="explorador-nodos" className="card" data-state="ok">
      {/* Cabecera Principal del Cockpit Unificado: Demo Base + Ecosistema General */}
      <div className="section-header">
        <div>
          <span className="kicker-text">
            01. Columna Vertebral («Coco-Baba») · Demo Base Integrado al Ecosistema General v7.7
          </span>
          <h2>
            Cockpit Territorial Federado — Nodos, Capas, Comparador y Contrato en Vivo
          </h2>
          <p className="section-caption">
            Síntesis sinérgica entre la claridad pedagógica del Demo Base (
            <code>FederatedView · NodeExplorer · Compare · Architecture</code>) y la
            infraestructura real del monorepo (<code>IDataSource R5</code>,{' '}
            <code>tokens.css ADR-034</code>, <code>R5-UI #109</code>,{' '}
            <code>PostGIS SRID=4326</code> y <code>Alertas Push FCM/Firestore</code>).
          </p>
        </div>

        <div className="territory-actions">
          <button
            type="button"
            className="btn-toggle"
            onClick={() => setShowIntegrationMatrix((prev) => !prev)}
          >
            {showIntegrationMatrix
              ? '▲ Ocultar Triage Demo ↔ Ecosistema'
              : '▼ Ver Triage Demo ↔ Ecosistema'}
          </button>
          {onOpenNodeDetailModal && (
            <button
              type="button"
              className="btn-confirm"
              onClick={() => onOpenNodeDetailModal(activeNode.key)}
            >
              Ficha Integral + Galería IA ({activeNode.nombre})
            </button>
          )}
        </div>
      </div>

      {/* Panel de Triage Sinérgico: Qué tomamos del Demo Base, Qué aportó el Ecosistema Nuevo y Qué descartamos */}
      {showIntegrationMatrix && (
        <div className="coco-baba-triage-box">
          <div className="pane-header">
            <div>
              <span className="tiny-label">
                Matriz de Integración Sinérgica (Carlos Leonidas ↔ [agent: google])
              </span>
              <strong>
                Qué conservamos del Demo Base · Qué conectamos del Ecosistema Nuevo · Qué filtramos por Gobernanza
              </strong>
            </div>
            <div className="filter-group" role="group" aria-label="Filtrar matriz de integración">
              <button
                type="button"
                className={triageFilter === 'all' ? 'btn-filter active' : 'btn-filter'}
                onClick={() => setTriageFilter('all')}
              >
                Todo el Triage ({COCO_BABA_INTEGRATION_MATRIX.length})
              </button>
              <button
                type="button"
                className={
                  triageFilter === 'demo_kept' ? 'btn-filter active' : 'btn-filter'
                }
                onClick={() => setTriageFilter('demo_kept')}
              >
                ✓ Del Demo Base (3)
              </button>
              <button
                type="button"
                className={
                  triageFilter === 'ecosystem_new' ? 'btn-filter active' : 'btn-filter'
                }
                onClick={() => setTriageFilter('ecosystem_new')}
              >
                ✦ Nuevo del Ecosistema (2)
              </button>
              <button
                type="button"
                className={
                  triageFilter === 'governance_discarded'
                    ? 'btn-filter active'
                    : 'btn-filter'
                }
                onClick={() => setTriageFilter('governance_discarded')}
              >
                ✕ Filtrado / No va (1)
              </button>
            </div>
          </div>

          <div className="coco-baba-triage-grid">
            {filteredIntegrationItems.map((item) => {
              const badgeClass =
                item.category === 'demo_kept'
                  ? 'r5-state-badge r5-state-verificado'
                  : item.category === 'ecosystem_new'
                    ? 'r5-state-badge r5-state-publicado'
                    : 'r5-state-badge r5-state-rechazado';
              const badgeText =
                item.category === 'demo_kept'
                  ? 'Idea Rescatada del Demo Base'
                  : item.category === 'ecosystem_new'
                    ? 'Evolución Ecosistema General'
                    : 'Descartado por Gobernanza';

              return (
                <div key={item.id} className="coco-baba-triage-card">
                  <div className="event-row-top">
                    <span className={badgeClass}>{badgeText}</span>
                    <code>{item.verificationRef}</code>
                  </div>
                  <strong style={{ display: 'block', marginTop: '0.35rem' }}>
                    {item.title}
                  </strong>
                  <p className="territory-meta" style={{ margin: '0.3rem 0' }}>
                    <strong>Origen Demo:</strong> {item.demoOrigin}
                  </p>
                  <p className="territory-meta" style={{ margin: 0 }}>
                    <strong>Integración Actual:</strong> {item.ecosystemIntegration}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Feedback en vivo de Alertas Push FCM / Firestore disparadas desde el Cockpit */}
      {pushAlertFeedback && (
        <div
          className="custodian-alert-banner critical"
          style={{ marginBottom: '1rem' }}
          role="status"
        >
          <div className="event-row-top">
            <strong>🔔 Alerta Push FCM / Firestore Emitida a Custodios Territoriales</strong>
            <button
              type="button"
              className="btn-toggle"
              onClick={() => setPushAlertFeedback(null)}
            >
              Cerrar aviso
            </button>
          </div>
          <div className="territory-meta tabular-nums">{pushAlertFeedback}</div>
        </div>
      )}

      {/* Barra de Navegación de las 4 Vistas Canónicas del Demo Base Integradas */}
      <div
        className="cockpit-macro-tabs"
        role="tablist"
        aria-label="Vistas integradas del Demo Base y Ecosistema General"
      >
        <button
          type="button"
          role="tab"
          aria-selected={cockpitMacroView === 'federated_matrix'}
          className={
            cockpitMacroView === 'federated_matrix'
              ? 'cockpit-macro-tab active'
              : 'cockpit-macro-tab'
          }
          onClick={() => setCockpitMacroView('federated_matrix')}
        >
          <span className="tiny-label">Vista 1 · Demo Base + Soberanía</span>
          <strong>Vista Federada &amp; Matriz 7×3</strong>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={cockpitMacroView === 'node_explorer'}
          className={
            cockpitMacroView === 'node_explorer'
              ? 'cockpit-macro-tab active'
              : 'cockpit-macro-tab'
          }
          onClick={() => setCockpitMacroView('node_explorer')}
        >
          <span className="tiny-label">Vista 2 · Mapa + Reportar + Panel</span>
          <strong>Explorar Nodo ({activeNode.nombre})</strong>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={cockpitMacroView === 'compare_nodes'}
          className={
            cockpitMacroView === 'compare_nodes'
              ? 'cockpit-macro-tab active'
              : 'cockpit-macro-tab'
          }
          onClick={() => setCockpitMacroView('compare_nodes')}
        >
          <span className="tiny-label">Vista 3 · 7 Dominios Transversales</span>
          <strong>Comparar Nodos sin Homogeneizar</strong>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={cockpitMacroView === 'architecture_contract'}
          className={
            cockpitMacroView === 'architecture_contract'
              ? 'cockpit-macro-tab active'
              : 'cockpit-macro-tab'
          }
          onClick={() => setCockpitMacroView('architecture_contract')}
        >
          <span className="tiny-label">Vista 4 · 5 Pasos + JSON + events_raw</span>
          <strong>Arquitectura &amp; Contrato v2</strong>
        </button>
      </div>

      {/* Selector de los 3 Nodos Federados de San Juan (siempre visible con barra de proporción Activos vs Problemáticas) */}
      <div className="node-selector-grid" role="tablist" aria-label="Nodos territoriales de San Juan">
        {territorios.map((t) => {
          const isSelected = t.key === activeNode.key;
          const tLayers = layersByNode[t.key] ?? [];
          const tFeats = features.filter((f) => f.nodeKey === t.key);
          const tAssets = tFeats.filter((f) => f.type === 'asset').length;
          const tProblems = tFeats.filter((f) => f.type === 'problem').length;
          const tAssetsPct =
            tFeats.length > 0 ? Math.round((tAssets / tFeats.length) * 100) : 50;
          const tReports = reports.filter(
            (r) => r.nodeKey === t.key && r.status !== 'resolved',
          );
          const tSov = federalSovereignty.find((s) => s.nodeKey === t.key);
          const isDelegated =
            (tSov?.sovereigntyMode ?? 'delegacion_revocable_activa') ===
            'delegacion_revocable_activa';

          return (
            <div
              key={t.id}
              role="tab"
              tabIndex={0}
              aria-selected={isSelected}
              className={isSelected ? 'node-card active' : 'node-card'}
              onClick={() => onSelectNodeKey(t.key)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectNodeKey(t.key);
                }
              }}
            >
              <div className="node-card-header">
                <span
                  className="node-dot"
                  style={{ backgroundColor: t.color || 'var(--brand-primary)' }}
                />
                <strong>{t.nombre}</strong>
                <span className="node-subtitle">· {t.provincia}</span>
              </div>
              <div className="node-card-focus">{t.foco}</div>

              {/* Barra proporcional Activos vs. Problemáticas rescatada del Demo Base */}
              <div className="demo-ratio-block tabular-nums">
                <div className="demo-ratio-labels">
                  <span>Activos ({tAssets})</span>
                  <span>Problemáticas ({tProblems})</span>
                </div>
                <div className="demo-ratio-bar" aria-hidden="true">
                  <div
                    className="demo-ratio-fill-assets"
                    style={{ width: `${tAssetsPct}%` }}
                  />
                </div>
              </div>

              <div className="node-card-stats tabular-nums">
                <span>
                  <strong>{tLayers.length}</strong> capas
                </span>
                <span>
                  <strong>{tFeats.length}</strong> obs.
                </span>
                <span>
                  <strong>{tReports.length}</strong> rep. activos
                </span>
              </div>

              <div
                className="event-row-top"
                style={{
                  marginTop: '0.35rem',
                  paddingTop: '0.35rem',
                  borderTop: '1px solid var(--border-subtle)',
                }}
              >
                <span
                  className={
                    isDelegated
                      ? 'sovereignty-pill delegated'
                      : 'sovereignty-pill strict'
                  }
                >
                  {isDelegated ? '● Delegación Federal' : '🔒 Custodia Estricta'}
                </span>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <button
                    type="button"
                    className="btn-toggle"
                    style={{ fontSize: '0.72rem', padding: '0.2rem 0.45rem' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectNodeKey(t.key);
                      setCockpitMacroView('node_explorer');
                    }}
                  >
                    Explorar →
                  </button>
                  {onOpenNodeDetailModal && (
                    <button
                      type="button"
                      className="btn-toggle"
                      style={{ fontSize: '0.72rem', padding: '0.2rem 0.45rem' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectNodeKey(t.key);
                        onOpenNodeDetailModal(t.key);
                      }}
                    >
                      Ficha
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* =====================================================================
          VISTA 1: VISTA FEDERADA & MATRIZ 7 DOMINIOS × 3 NODOS (Del Demo Base)
         ===================================================================== */}
      {cockpitMacroView === 'federated_matrix' && (
        <div className="node-modal-section" style={{ marginTop: '1rem' }}>
          <div className="pane-header">
            <div>
              <span className="tiny-label">
                Principio Rector del Demo Base Integrado · Gobierno del Núcleo, Autonomía del Nodo
              </span>
              <h3 style={{ margin: '0.15rem 0 0', fontSize: '1.05rem' }}>
                Matriz de Capas por Nodo y Dominio Transversal (7 Dominios × 3 Departamentos de San Juan)
              </h3>
            </div>
            <span className="territory-meta">
              Hacé clic en cualquier capa declarada para abrirla en el Explorador del Nodo
            </span>
          </div>

          <p className="territory-meta" style={{ marginBottom: '0.85rem' }}>
            Cada departamento activa únicamente las capas que tienen sentido para su realidad
            urbana, periurbana o cordillerana. Cuando una celda indica{' '}
            <code>— No declarada por el nodo</code>, el sistema respeta la{' '}
            <strong>Soberanía Semántica</strong> sin forzar categorías artificiales.
          </p>

          <div className="matrix-table-wrap">
            <table className="demo-domain-matrix-table">
              <thead>
                <tr>
                  <th>Dominio Transversal</th>
                  {territorios.map((t) => (
                    <th key={t.id}>
                      <span
                        className="node-dot"
                        style={{
                          backgroundColor: t.color || 'var(--brand-primary)',
                          marginRight: '0.4rem',
                        }}
                      />
                      {t.nombre}
                      <div className="territory-meta" style={{ fontWeight: 400 }}>
                        {t.subtitulo}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DOMAINS.map((dom) => (
                  <tr key={dom.key}>
                    <td>
                      <strong>{dom.label}</strong>
                      <div className="territory-meta">
                        <code>{dom.key}</code>
                      </div>
                    </td>
                    {territorios.map((t) => {
                      const matchingLayers = (layersByNode[t.key] ?? []).filter(
                        (l) => l.domain === dom.key,
                      );
                      const matchingFeatsCount = features.filter(
                        (f) => f.nodeKey === t.key && f.domain === dom.key,
                      ).length;

                      return (
                        <td key={t.id}>
                          {matchingLayers.length === 0 ? (
                            <span className="matrix-empty-cell">
                              — No declarada por el nodo (Soberanía Semántica)
                            </span>
                          ) : (
                            <div className="matrix-layer-chips">
                              {matchingLayers.map((l) => (
                                <button
                                  key={l.key}
                                  type="button"
                                  className="matrix-layer-chip"
                                  onClick={() => {
                                    onSelectNodeKey(t.key);
                                    setCustodianFilter('all');
                                    setCockpitMacroView('node_explorer');
                                    setExplorerViewMode('map_and_layers');
                                  }}
                                  title={`Explorar capa ${l.name} en ${t.nombre}`}
                                >
                                  <strong>{l.name}</strong>
                                  <span className="territory-meta tabular-nums">
                                    <code>{l.geometry}</code> · {matchingFeatsCount} obs.
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Control rápido de Soberanía y Push FCM por Nodo desde la Vista Federada */}
          <div className="coco-baba-triage-grid" style={{ marginTop: '1rem' }}>
            {territorios.map((t) => {
              const sov = federalSovereignty.find((s) => s.nodeKey === t.key);
              const mode = sov?.sovereigntyMode ?? 'delegacion_revocable_activa';
              const isDelegated = mode === 'delegacion_revocable_activa';
              return (
                <div key={t.id} className="coco-baba-triage-card">
                  <div className="event-row-top">
                    <strong>Custodia Territorial · {t.nombre}</strong>
                    <span
                      className={
                        isDelegated
                          ? 'sovereignty-pill delegated'
                          : 'sovereignty-pill strict'
                      }
                    >
                      {isDelegated ? 'Delegación Activa' : 'Custodia Estricta'}
                    </span>
                  </div>
                  <p className="territory-meta" style={{ margin: '0.35rem 0' }}>
                    Tópico FCM: <code>sovereignty-alerts-{t.key}</code> · Merkle:{' '}
                    <code>{sov?.nodeMerkleRoot ?? `merkle-${t.key}-4326`}</code>
                  </p>
                  <button
                    type="button"
                    className="btn-toggle"
                    onClick={() => void handleTriggerCustodianPushForNode(t)}
                  >
                    🔔 Alternar Soberanía + Emitir Push FCM a Custodio
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          VISTA 2: EXPLORAR NODO (Sub-pestañas del Demo Base: Mapa · Reportar · Panel · Galería IA)
         ===================================================================== */}
      {cockpitMacroView === 'node_explorer' && (
        <>
          {/* Barra de Sub-Pestañas de Explorar Nodo (igual al Demo Base + Galería de Activos IA) */}
          <div
            className="pane-header"
            style={{
              marginTop: '0.85rem',
              paddingBottom: '0.65rem',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <div>
              <span className="tiny-label">
                Nodo Activo: {activeNode.nombre} ({activeNode.subtitulo}) · Pob.{' '}
                {(activeNode.poblacion ?? 15000).toLocaleString('es-AR')} hab.
              </span>
              <div className="territory-meta">
                Vocación: <strong>{activeNode.foco}</strong>
              </div>
            </div>

            <div
              className="filter-group"
              role="tablist"
              aria-label="Sub-vistas del explorador del nodo"
            >
              <button
                type="button"
                role="tab"
                aria-selected={explorerViewMode === 'map_and_layers'}
                className={
                  explorerViewMode === 'map_and_layers'
                    ? 'btn-filter active'
                    : 'btn-filter'
                }
                onClick={() => setExplorerViewMode('map_and_layers')}
              >
                🗺 Mapa + Capas ({nodeFeatures.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={explorerViewMode === 'report_flow'}
                className={
                  explorerViewMode === 'report_flow'
                    ? 'btn-filter active'
                    : 'btn-filter'
                }
                onClick={() => setExplorerViewMode('report_flow')}
              >
                📍 Reportar + Ciclo ({nodeReports.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={explorerViewMode === 'node_dashboard'}
                className={
                  explorerViewMode === 'node_dashboard'
                    ? 'btn-filter active'
                    : 'btn-filter'
                }
                onClick={() => setExplorerViewMode('node_dashboard')}
              >
                📊 Panel del Nodo + Copiloto Ético
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={explorerViewMode === 'gallery'}
                className={
                  explorerViewMode === 'gallery'
                    ? 'btn-filter active'
                    : 'btn-filter'
                }
                onClick={() => setExplorerViewMode('gallery')}
              >
                🖼 Galería Activos IA
              </button>
              <button
                type="button"
                className="btn-toggle"
                onClick={() => onFocusOnGoogleMap(activeNode.id)}
              >
                Ver en Google Maps
              </button>
            </div>
          </div>

          {explorerViewMode === 'gallery' ? (
            <div style={{ marginTop: '0.85rem' }}>
              <VerifiedAssetsGalleryView
                nodeKey={activeNode.key}
                nodeName={activeNode.nombre}
                features={features}
                layers={nodeLayers}
                onVisualValidateAsset={onVisualValidateAsset}
              />
            </div>
          ) : (
            <div className="explorer-grid" style={{ marginTop: '0.85rem' }}>
              {/* Columna Izquierda: Capas Explícitas del Nodo + Filtro por Custodio Tripartito (del Demo Base) */}
              <div className="explorer-layers-pane">
                <div className="pane-header">
                  <strong>Capas del nodo · {activeNode.nombre}</strong>
                  <span className="territory-meta">
                    {filteredNodeLayers.length}/{nodeLayers.length}
                  </span>
                </div>

                {/* Filtro por Actor Custodio Tripartito rescatado del Demo Base (Comunidad · Instituciones · Comercios) */}
                <div style={{ marginBottom: '0.65rem' }}>
                  <span className="tiny-label">Filtrar capas por actor custodio:</span>
                  <div
                    className="filter-group"
                    style={{ marginTop: '0.3rem' }}
                    role="group"
                    aria-label="Filtrar capas por actor custodio"
                  >
                    {CUSTODIAN_META.map((c) => (
                      <button
                        key={c.key}
                        type="button"
                        className={
                          custodianFilter === c.key
                            ? 'btn-filter active'
                            : 'btn-filter'
                        }
                        onClick={() => setCustodianFilter(c.key)}
                      >
                        {c.shortLabel}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="pane-hint">
                  Cada capa declara su geometría PostGIS (<code>SRID=4326</code>) y qué
                  actores locales la producen y custodian.
                </p>

                <ul className="layer-checklist">
                  {filteredNodeLayers.map((layer) => {
                    const checked = Boolean(enabledLayers[layer.key]);
                    const countInLayer = allNodeFeatures.filter(
                      (f) => f.layer === layer.key,
                    ).length;
                    return (
                      <li key={layer.key} className="layer-check-item">
                        <label className="layer-check-label">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleLayer(layer.key)}
                          />
                          <div className="layer-check-info">
                            <span className="layer-name">{layer.name}</span>
                            <span className="layer-meta tabular-nums">
                              <code>{layer.geometry}</code> · {countInLayer} obs. ·
                              Custodia:{' '}
                              {layer.producedBy
                                .map((p) =>
                                  p === 'community'
                                    ? 'Comunidad'
                                    : p === 'institutions'
                                      ? 'Instituciones'
                                      : 'Comercios/Prod.',
                                )
                                .join(', ')}
                            </span>
                          </div>
                        </label>
                      </li>
                    );
                  })}
                </ul>

                {/* Resumen de proporción Activos vs. Problemáticas del nodo */}
                <div className="node-kpis-mini tabular-nums">
                  <div className="mini-kpi">
                    <span className="tiny-label">Activos Verificados</span>
                    <strong>{assetsCount}</strong>
                  </div>
                  <div className="mini-kpi">
                    <span className="tiny-label">Problemáticas</span>
                    <strong>{problemsCount}</strong>
                  </div>
                  <div className="mini-kpi">
                    <span className="tiny-label">Geometrías WKT</span>
                    <strong>{nodeGeometries.length}</strong>
                  </div>
                </div>
              </div>

              {/* Columna Central: Lienzo Cartográfico Esquemático + Equivalencia R5-UI */}
              <div className="explorer-canvas-pane">
                <div className="pane-header">
                  <div>
                    <strong>
                      Lienzo Esquemático Multicapa · {activeNode.nombre}
                    </strong>
                    <div className="territory-meta">
                      {pickMode
                        ? 'Modo selección activo: hacé clic en el mapa para fijar coordenadas (x, y)'
                        : 'Hacé clic en cualquier punto para inspeccionar su estado epistémico y equivalencia R5-UI'}
                    </div>
                  </div>
                  <button
                    type="button"
                    className={pickMode ? 'btn-filter active' : 'btn-toggle'}
                    onClick={() => setPickMode((p) => !p)}
                  >
                    {pickMode
                      ? 'Cancelar selección en mapa'
                      : '📍 Elegir punto para reporte'}
                  </button>
                </div>

                <div className="schematic-map-wrapper">
                  <svg
                    viewBox="0 0 100 100"
                    className={
                      pickMode
                        ? 'schematic-svg pick-cursor'
                        : 'schematic-svg'
                    }
                    onClick={handleSvgClick}
                    role="img"
                    aria-label={`Mapa esquemático territorial de ${activeNode.nombre}`}
                  >
                    <defs>
                      <pattern
                        id="grid-pattern"
                        width="10"
                        height="10"
                        patternUnits="userSpaceOnUse"
                      >
                        <path
                          d="M 10 0 L 0 0 0 10"
                          fill="none"
                          stroke="rgba(148,163,184,0.14)"
                          strokeWidth="0.3"
                        />
                      </pattern>
                    </defs>
                    <rect width="100" height="100" fill="url(#grid-pattern)" />

                    {/* Traza hidrográfica / canal de riego y eje vial esquemático */}
                    <path
                      d="M 0 68 Q 35 55, 65 62 T 100 48"
                      fill="none"
                      stroke="rgba(56, 189, 248, 0.28)"
                      strokeWidth="2.2"
                    />
                    <path
                      d="M 12 0 L 48 100 M 0 36 L 100 42"
                      fill="none"
                      stroke="rgba(148, 163, 184, 0.22)"
                      strokeWidth="1.1"
                      strokeDasharray="2,2"
                    />

                    {/* Features activos en capas seleccionadas */}
                    {nodeFeatures.map((f) => {
                      const statusMeta =
                        STATUS_META[f.status] ?? STATUS_META.pending;
                      const isProblem = f.type === 'problem';
                      const isSelected = selectedFeature?.id === f.id;
                      return (
                        <g
                          key={f.id}
                          className="map-feature-node"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFeature(f);
                          }}
                        >
                          {isProblem && (
                            <circle
                              cx={f.x}
                              cy={f.y}
                              r={isSelected ? 5.2 : 4}
                              fill="none"
                              stroke={statusMeta.color}
                              strokeWidth="0.7"
                              strokeDasharray="1.2,1"
                            />
                          )}
                          <circle
                            cx={f.x}
                            cy={f.y}
                            r={isSelected ? 2.8 : 2.1}
                            fill={statusMeta.color}
                            stroke="#0b1020"
                            strokeWidth="0.6"
                          />
                        </g>
                      );
                    })}

                    {/* Marcador de coordenada elegida para nuevo reporte */}
                    <g>
                      <circle
                        cx={pickedCoords.x}
                        cy={pickedCoords.y}
                        r="3.2"
                        fill="none"
                        stroke="#f5c842"
                        strokeWidth="0.8"
                      />
                      <circle
                        cx={pickedCoords.x}
                        cy={pickedCoords.y}
                        r="1.3"
                        fill="#f5c842"
                      />
                    </g>
                  </svg>
                </div>

                {/* Leyenda Epistémica del Demo Base + Equivalencia R5-UI */}
                <div className="epistemic-legend">
                  {Object.entries(STATUS_META).map(([key, meta]) => (
                    <span key={key} className="legend-pill">
                      <span
                        className="legend-dot"
                        style={{ backgroundColor: meta.color }}
                      />
                      {meta.label}
                    </span>
                  ))}
                  <span className="legend-pill">
                    ● Activo · ◎ Problemática (halo)
                  </span>
                </div>

                {/* Inspector de observación seleccionada con estado R5-UI */}
                {selectedFeature ? (
                  <div className="feature-inspector-box">
                    <div className="feature-inspector-header">
                      <strong>{selectedFeature.title}</strong>
                      <span
                        className={
                          EPISTEMIC_TO_R5_UI[selectedFeature.status]?.tokenClass ??
                          'r5-state-badge r5-state-pendiente'
                        }
                      >
                        {EPISTEMIC_TO_R5_UI[selectedFeature.status]?.badgeLabel ??
                          selectedFeature.status}
                      </span>
                    </div>
                    <div className="territory-meta tabular-nums">
                      Capa: <code>{selectedFeature.layer}</code> · Dominio:{' '}
                      <code>{selectedFeature.domain}</code> · Tipo:{' '}
                      <strong>
                        {selectedFeature.type === 'problem'
                          ? 'Problemática'
                          : 'Activo Territorial'}
                      </strong>{' '}
                      · Fuente: {selectedFeature.sourceLabel} · Observado:{' '}
                      {selectedFeature.observedAt}
                    </div>
                  </div>
                ) : (
                  <div className="feature-inspector-box muted">
                    Seleccioná un punto en el mapa esquemático para inspeccionar su
                    trazabilidad, fuente y estado <code>R5-UI</code>.
                  </div>
                )}
              </div>

              {/* Columna Derecha Dinámica según Sub-Pestaña (Reportar vs. Panel Epistémico + Copiloto Ético) */}
              <div className="explorer-actions-pane">
                {explorerViewMode === 'node_dashboard' ? (
                  /* SUB-VISTA PANEL DEL NODO (Rescatada de subTab === 'dashboard' del Demo Base + Copiloto Ético) */
                  <>
                    <div className="report-box">
                      <strong>
                        Distribución por Estado Epistémico y R5-UI · {activeNode.nombre}
                      </strong>
                      <p className="pane-hint">
                        Proporción verificable de observaciones ({assetsRatioPct}% activos vs.{' '}
                        {100 - assetsRatioPct}% problemáticas) según su validación
                        comunitaria o institucional.
                      </p>
                      <div className="demo-ratio-block tabular-nums" style={{ marginBottom: '0.6rem' }}>
                        <div className="demo-ratio-labels">
                          <span>Activos ({assetsCount} · {assetsRatioPct}%)</span>
                          <span>Problemáticas ({problemsCount} · {100 - assetsRatioPct}%)</span>
                        </div>
                        <div className="demo-ratio-bar">
                          <div
                            className="demo-ratio-fill-assets"
                            style={{ width: `${assetsRatioPct}%` }}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gap: '0.55rem', marginTop: '0.5rem' }}>
                        {(Object.keys(STATUS_META) as EpistemicStatus[]).map((stKey) => {
                          const meta = STATUS_META[stKey];
                          const r5Meta = EPISTEMIC_TO_R5_UI[stKey];
                          const count = allNodeFeatures.filter(
                            (f) => f.status === stKey,
                          ).length;
                          const pct =
                            allNodeFeatures.length > 0
                              ? Math.round((count / allNodeFeatures.length) * 100)
                              : 0;
                          return (
                            <div key={stKey}>
                              <div
                                className="event-row-top tabular-nums"
                                style={{ fontSize: '0.78rem', marginBottom: '0.2rem' }}
                              >
                                <span style={{ color: meta.color, fontWeight: 600 }}>
                                  ● {meta.label}
                                </span>
                                <span>
                                  <strong>{count}</strong> ({pct}%) ·{' '}
                                  <code>{r5Meta.r5State}</code>
                                </span>
                              </div>
                              <div className="demo-ratio-bar">
                                <div
                                  style={{
                                    width: `${pct}%`,
                                    height: '100%',
                                    backgroundColor: meta.color,
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="ethical-contract-box">
                      <div className="pane-header">
                        <strong>
                          Copiloto IA · Contrato Ético Tripartito (ADR-004)
                        </strong>
                        <span className="badge-ethical">
                          requiresHumanReview: true
                        </span>
                      </div>
                      <div className="ethical-triad">
                        <div className="ethical-step">
                          <span className="tiny-label">1. DATO (Inmutable)</span>
                          <p>
                            En <strong>{activeNode.nombre}</strong> se registran{' '}
                            <strong>{allNodeFeatures.length}</strong> observaciones (
                            {assetsCount} activos, {problemsCount} problemáticas) y{' '}
                            <strong>{nodeReports.length}</strong> reportes en flujo.
                          </p>
                        </div>
                        <div className="ethical-step">
                          <span className="tiny-label">
                            2. INTERPRETACIÓN (Contextual)
                          </span>
                          <p>
                            La priorización en el foco{' '}
                            <em>«{activeNode.foco}»</em> articula el vocabulario local
                            con custodia tripartita sin homogeneizar la identidad del
                            departamento.
                          </p>
                        </div>
                        <div className="ethical-step">
                          <span className="tiny-label">
                            3. SUGERENCIA (Sujeta a revisión humana)
                          </span>
                          <p>
                            Convocar a la mesa local para validar los reportes en
                            evaluación antes de emitir paquetes federados hacia otros
                            departamentos.
                          </p>
                        </div>
                      </div>
                      <form
                        onSubmit={handleHumanReviewSubmit}
                        className="ethical-review-form"
                      >
                        <input
                          type="text"
                          value={reviewerNote}
                          onChange={(e) => setReviewerNote(e.target.value)}
                          placeholder={`Firmar acta de revisión humana en ${activeNode.nombre}...`}
                        />
                        <button
                          type="submit"
                          className="btn-toggle"
                          disabled={submittingReview}
                        >
                          {submittingReview
                            ? 'Firmando...'
                            : 'Registrar revisión humana'}
                        </button>
                      </form>
                    </div>
                  </>
                ) : (
                  /* SUB-VISTA REPORTAR Y FLUJO DE 4 ESTADOS (subTab === 'report' / 'map') */
                  <>
                    <form onSubmit={handleSubmitReport} className="report-box">
                      <strong>
                        Crear Reporte en {activeNode.nombre} (+ Push FCM Custodio)
                      </strong>
                      <p className="pane-hint">
                        Usa las categorías propias declaradas por este nodo, sella en{' '}
                        <code>events_raw</code> y alerta al custodio territorial.
                      </p>

                      <label className="field-label">
                        Categoría local ({nodeCategories.length} disponibles)
                        <select
                          value={reportCategory}
                          onChange={(e) => setReportCategory(e.target.value)}
                          className="select-input"
                        >
                          {nodeCategories.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.label} ({c.layer})
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="field-label">
                        Descripción de la observación
                        <input
                          type="text"
                          value={reportDesc}
                          onChange={(e) => setReportDesc(e.target.value)}
                          placeholder="Ej: Acequia con obstrucción parcial o luminaria sin servicio..."
                        />
                      </label>

                      <div className="coords-row tabular-nums">
                        <span>
                          Coordenada en lienzo:{' '}
                          <code>
                            ({pickedCoords.x}, {pickedCoords.y})
                          </code>
                        </span>
                        <button
                          type="submit"
                          disabled={submittingReport}
                          className="btn-confirm"
                        >
                          {submittingReport
                            ? 'Registrando...'
                            : 'Emitir reporte + Push FCM'}
                        </button>
                      </div>
                    </form>

                    {/* Lista de Reportes Activos del Nodo con Transición de Estado */}
                    <div className="reports-lifecycle-box">
                      <div className="pane-header">
                        <strong>
                          Ciclo de Vida de Reportes ({nodeReports.length})
                        </strong>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.45rem',
                          }}
                        >
                          <span className="territory-meta">4 estados</span>
                          {nodeReports.length > 0 && (
                            <button
                              type="button"
                              className="btn-toggle"
                              style={{
                                fontSize: '0.72rem',
                                padding: '0.2rem 0.5rem',
                              }}
                              onClick={() =>
                                setDriveExportTarget({
                                  mode: 'node-bundle',
                                  territorio: activeNode,
                                  reports: nodeReports,
                                  features: allNodeFeatures,
                                })
                              }
                            >
                              ☁ Exportar a Drive
                            </button>
                          )}
                        </div>
                      </div>
                      <ul className="reports-mini-list">
                        {nodeReports.map((rep) => {
                          const st = REPORT_STATUS_META[rep.status];
                          return (
                            <li key={rep.id} className="report-mini-item">
                              <div className="report-mini-top">
                                <strong>
                                  {rep.categoryLabel || rep.category}
                                </strong>
                                <span
                                  className="report-status-tag"
                                  style={{ color: st.color }}
                                >
                                  ● {st.label}
                                </span>
                              </div>
                              <p className="report-desc">{rep.description}</p>
                              <div className="report-mini-footer tabular-nums">
                                <span>
                                  <code>{rep.id}</code> · ({rep.picked.x},{' '}
                                  {rep.picked.y})
                                  {rep.humanReviewed && ' · ✓ Revisión humana'}
                                </span>
                                <div style={{ display: 'flex', gap: '0.35rem' }}>
                                  <button
                                    type="button"
                                    className="btn-toggle"
                                    onClick={() =>
                                      setDriveExportTarget({
                                        mode: 'single-report',
                                        report: rep,
                                        territorio: activeNode,
                                      })
                                    }
                                  >
                                    ☁ Drive
                                  </button>
                                  {rep.status !== 'resolved' && (
                                    <button
                                      type="button"
                                      className="btn-toggle"
                                      onClick={() => void onAdvanceReport(rep.id)}
                                    >
                                      Avanzar estado ➔
                                    </button>
                                  )}
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* =====================================================================
          VISTA 3: COMPARAR NODOS SIN HOMOGENEIZACIÓN (Integrada en el Cockpit)
         ===================================================================== */}
      {cockpitMacroView === 'compare_nodes' && (
        <div className="node-modal-section" style={{ marginTop: '1rem' }}>
          <div className="pane-header">
            <div>
              <span className="tiny-label">
                Comparabilidad sin Homogeneización · 7 Dominios Transversales
              </span>
              <h3 style={{ margin: '0.15rem 0 0', fontSize: '1.05rem' }}>
                Comparación Lado a Lado entre Departamentos de San Juan
              </h3>
            </div>
          </div>

          <div
            className="domain-pills-bar"
            role="group"
            aria-label="Seleccionar dominio transversal para comparar"
          >
            <span className="tiny-label">Dominio transversal:</span>
            {DOMAINS.map((d) => (
              <button
                key={d.key}
                type="button"
                className={
                  compareDomain === d.key ? 'btn-filter active' : 'btn-filter'
                }
                onClick={() => setCompareDomain(d.key)}
              >
                {d.label}
              </button>
            ))}
          </div>

          <div className="compare-grid">
            {[
              {
                node: compareNodeA,
                side: 'A',
                onChange: setCompareNodeKeyA,
                otherKey: compareNodeB?.key,
              },
              {
                node: compareNodeB,
                side: 'B',
                onChange: setCompareNodeKeyB,
                otherKey: compareNodeA?.key,
              },
            ].map(({ node, side, onChange, otherKey }) => {
              if (!node) return null;
              const layersInDomain = (layersByNode[node.key] ?? []).filter(
                (l) => l.domain === compareDomain,
              );
              const featuresInDomain = features.filter(
                (f) => f.nodeKey === node.key && f.domain === compareDomain,
              );
              const geomsInDomain = spatialGeometries.filter(
                (g) => g.nodeKey === node.key && g.domain === compareDomain,
              );
              const domainLabel =
                DOMAINS.find((d) => d.key === compareDomain)?.label ??
                compareDomain;

              return (
                <div key={side} className="compare-column">
                  <div className="compare-col-header">
                    <div className="node-card-header">
                      <span
                        className="node-dot"
                        style={{
                          background: node.color || 'var(--brand-primary)',
                        }}
                      />
                      <strong>{node.nombre}</strong>
                      <span className="node-subtitle">· {node.foco}</span>
                    </div>
                    <select
                      value={node.key}
                      onChange={(e) => onChange(e.target.value)}
                      className="compare-select"
                    >
                      {territorios
                        .filter((t) => t.key !== otherKey)
                        .map((t) => (
                          <option key={t.id} value={t.key}>
                            {t.nombre} ({t.provincia})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="compare-col-body">
                    <div className="compare-summary-row tabular-nums">
                      <span>
                        Dominio <strong>{domainLabel}</strong>:
                      </span>
                      <strong>
                        {layersInDomain.length} capa(s) ·{' '}
                        {featuresInDomain.length} obs. · {geomsInDomain.length}{' '}
                        WKT PostGIS
                      </strong>
                    </div>

                    {layersInDomain.length === 0 ? (
                      <div className="sovereignty-notice">
                        Este departamento no activa el dominio{' '}
                        <strong>«{domainLabel}»</strong>. La federación respeta el
                        vocabulario local: no se fuerza la capa ni se inventan
                        categorías.
                      </div>
                    ) : (
                      <div className="territory-meta">
                        Capas declaradas:{' '}
                        {layersInDomain.map((l, idx) => (
                          <span key={l.key}>
                            {idx > 0 ? ' · ' : ''}
                            <strong>{l.name}</strong> (<code>{l.geometry}</code>)
                          </span>
                        ))}
                      </div>
                    )}

                    {featuresInDomain.length > 0 && (
                      <ul
                        className="territory-list"
                        style={{ marginTop: '0.75rem' }}
                      >
                        {featuresInDomain.map((f) => {
                          const r5 = EPISTEMIC_TO_R5_UI[f.status];
                          return (
                            <li key={f.id} className="territory-item">
                              <div className="territory-info">
                                <span className="territory-name">{f.title}</span>
                                <span className="territory-meta">
                                  {f.sourceLabel} · <code>{f.layer}</code>
                                </span>
                              </div>
                              <span className={r5.tokenClass}>
                                {r5.badgeLabel}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          VISTA 4: ARQUECTURA EN 5 PASOS, CONTRATO JSON v2 & LOG events_raw
         ===================================================================== */}
      {cockpitMacroView === 'architecture_contract' && (
        <div className="node-modal-section" style={{ marginTop: '1rem' }}>
          <div className="pane-header">
            <div>
              <span className="tiny-label">
                Vista 4 del Demo Base Evolucionada · Trazabilidad Extremo a Extremo
              </span>
              <h3 style={{ margin: '0.15rem 0 0', fontSize: '1.05rem' }}>
                Flujo de 5 Pasos del Ecosistema General + Contrato Técnico JSON en Vivo ({activeNode.nombre})
              </h3>
            </div>
            <span className="territory-meta tabular-nums">
              Evidencias OK:{' '}
              <strong>
                {evidencias.filter((e) => e.status === 'ok').length}/
                {evidencias.length || 18}
              </strong>{' '}
              · Eventos en sesión: <strong>{eventsRaw.length}</strong>
            </span>
          </div>

          {/* Los 5 Pasos del Demo Base conectados con el Ecosistema General */}
          <div className="demo-five-steps-grid">
            {FIVE_STEP_ARCHITECTURE_FLOW.map((s) => (
              <div key={s.step} className="demo-step-card">
                <div className="event-row-top">
                  <span className="pillar-index tabular-nums">
                    Paso {s.step}
                  </span>
                  <code>{s.badge}</code>
                </div>
                <strong style={{ display: 'block', marginTop: '0.3rem' }}>
                  {s.title}
                </strong>
                <div
                  className="tiny-label"
                  style={{ marginTop: '0.15rem', marginBottom: '0.35rem' }}
                >
                  {s.subtitle}
                </div>
                <p className="territory-meta" style={{ margin: 0 }}>
                  {s.detail}
                </p>
              </div>
            ))}
          </div>

          {/* Grilla 2 Columnas: Contrato JSON del Nodo + Stream en vivo de events_raw */}
          <div
            className="compare-grid"
            style={{ marginTop: '1rem', alignItems: 'stretch' }}
          >
            <div className="compare-column">
              <div className="compare-col-header">
                <div>
                  <span className="tiny-label">
                    Contrato Técnico de Nodo Federado (Evolución de delocalsoy.node.v1 → v2)
                  </span>
                  <strong style={{ display: 'block' }}>
                    Esquema JSON en Vivo · {activeNode.nombre}
                  </strong>
                </div>
                <button
                  type="button"
                  className="btn-toggle"
                  onClick={handleCopyContractJson}
                >
                  {copiedContractJson ? '✓ JSON Copiado' : '📋 Copiar JSON'}
                </button>
              </div>
              <pre className="demo-contract-json-pre">{liveNodeContractJson}</pre>
            </div>

            <div className="compare-column">
              <div className="compare-col-header">
                <div>
                  <span className="tiny-label">
                    Libro Mayor Append-Only (events_raw · UNIQUE(hash))
                  </span>
                  <strong style={{ display: 'block' }}>
                    Últimos Eventos Auditables en Sesión ({eventsRaw.length})
                  </strong>
                </div>
              </div>
              <div className="compare-col-body">
                {eventsRaw.length === 0 ? (
                  <p className="empty-state">
                    Sin eventos cargados en memoria. Creá un reporte o alterná la
                    soberanía de un nodo para ver el sello SHA-256 en vivo.
                  </p>
                ) : (
                  <ul className="reports-mini-list">
                    {eventsRaw.slice(0, 8).map((ev) => (
                      <li key={ev.id} className="report-mini-item tabular-nums">
                        <div className="report-mini-top">
                          <strong>{ev.type}</strong>
                          <code>sha256:{ev.hash}</code>
                        </div>
                        <div className="territory-meta">
                          Nodo: <code>{ev.nodeId}</code> · Ocurrido:{' '}
                          {new Date(ev.occurred_at).toLocaleTimeString('es-AR')} ·
                          Origen:{' '}
                          <strong>
                            {ev.is_synthetic ? 'Semilla Demo' : 'Operativo'}
                          </strong>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <DriveReportExportModal
        target={driveExportTarget}
        onClose={() => setDriveExportTarget(null)}
        onExportVerified={onExportVerified}
      />
    </section>
  );
}
