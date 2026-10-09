export type DomainKey =
  | 'problems'
  | 'assets'
  | 'public_space'
  | 'health'
  | 'community'
  | 'production'
  | 'tourism';

export const SAN_JUAN_FOCAL_NODE_KEYS = ['capital', 'caucete', 'iglesia'] as const;
export type SanJuanFocalNodeKey = (typeof SAN_JUAN_FOCAL_NODE_KEYS)[number];

export type EpistemicStatus =
  | 'verified'
  | 'community_validated'
  | 'pending'
  | 'synthetic_demo';

export type ReportStatus = 'received' | 'evaluating' | 'in_progress' | 'resolved';

export interface TerritorioLayer {
  key: string;
  name: string;
  domain: DomainKey;
  geometry: 'Point' | 'LineString' | 'Polygon';
  defaultOn: boolean;
  producedBy: ('community' | 'institutions' | 'businesses')[];
}

export interface TerritorioCategory {
  code: string;
  label: string;
  layer: string;
}

export interface TerritorioFeature {
  id: string;
  nodeKey: string;
  layer: string;
  x: number;
  y: number;
  title: string;
  status: EpistemicStatus;
  observedAt: string;
  sourceLabel: string;
  isSynthetic: boolean;
  domain: DomainKey;
  type: 'asset' | 'problem';
}

export interface TerritorialReport {
  id: string;
  eventId: string;
  nodeKey: string;
  category: string;
  categoryLabel: string;
  description: string;
  status: ReportStatus;
  createdAt: string;
  isSynthetic: boolean;
  picked: { x: number; y: number };
  history: { status: ReportStatus; at: string }[];
  humanReviewed?: boolean;
  humanReviewerNote?: string;
}

export interface RawEventRecord {
  id: string;
  type: string;
  nodeId: string;
  hash: string;
  payload: Record<string, unknown>;
  occurred_at: string;
  ingested_at: string;
  is_synthetic: boolean;
}

export interface EvidenciaRecord {
  id: string;
  code: string;
  title: string;
  status: 'pendiente' | 'ok' | 'fallido';
  result: Record<string, unknown> | null;
  verified_at: string | null;
}

export interface FederatedNodeMeta {
  key: string;
  id: string;
  name: string;
  subtitle: string;
  provincia: string;
  population: number;
  focus: string;
  focusLong: string;
  color: string;
  searchQuery: string;
}

export const DOMAINS: { key: DomainKey; label: string }[] = [
  { key: 'problems', label: 'Problemáticas' },
  { key: 'assets', label: 'Activos' },
  { key: 'public_space', label: 'Espacio público' },
  { key: 'health', label: 'Salud' },
  { key: 'community', label: 'Comunidad' },
  { key: 'production', label: 'Producción' },
  { key: 'tourism', label: 'Turismo' },
];

export const STATUS_META: Record<
  EpistemicStatus,
  { label: string; color: string }
> = {
  verified: { label: 'Verificado (ejemplo)', color: '#2e9e5b' },
  community_validated: { label: 'Validación comunitaria (ejemplo)', color: '#4f8fcb' },
  pending: { label: 'Pendiente (ejemplo)', color: '#d99b26' },
  synthetic_demo: { label: 'Sintético (demo)', color: '#a67c37' },
};

export const REPORT_FLOW: ReportStatus[] = [
  'received',
  'evaluating',
  'in_progress',
  'resolved',
];

export const REPORT_STATUS_META: Record<
  ReportStatus,
  { label: string; color: string }
> = {
  received: { label: 'Recibido', color: '#8e9299' },
  evaluating: { label: 'En evaluación', color: '#d99b26' },
  in_progress: { label: 'En curso', color: '#4f8fcb' },
  resolved: { label: 'Resuelto', color: '#2e9e5b' },
};

// ============================================================================
// HORIZONTE 2: Geometrías PostGIS, Sincronización Inter-Nodos y Cortes Temporales
// ============================================================================

export type PostgisGeometryType = 'Point' | 'LineString' | 'Polygon';

export interface LatLngCoord {
  lat: number;
  lng: number;
}

export interface SchematicPoint {
  x: number;
  y: number;
}

export interface SpatialGeometryRecord {
  id: string;
  nodeKey: string;
  layerKey: string;
  domain: DomainKey;
  title: string;
  geometryType: PostgisGeometryType;
  srid: 4326;
  wkt: string;
  metricLabel: string; // ej. "4.8 km (ST_Length)" o "312 ha (ST_Area)"
  custodians: ('community' | 'institutions' | 'businesses')[];
  status: EpistemicStatus;
  quarter: '2026-Q1' | '2026-Q2' | '2026-Q3' | '2026-Q4';
  schematicPath: SchematicPoint[];
  realCoords: LatLngCoord[];
  color: string;
}

export type SyncPackStatus = 'proposed' | 'custodian_verified' | 'federated_active';

export interface InterNodeSyncPack {
  id: string;
  eventId: string;
  hash: string;
  sourceNodeKey: string;
  targetNodeKey: string;
  domain: DomainKey;
  title: string;
  sharedSummary: string;
  sourceVocabularyTerm: string;
  targetVocabularyMapping: string;
  geometryIds: string[];
  sourceCustodian: string;
  targetCustodianAck: string | null;
  status: SyncPackStatus;
  quarter: '2026-Q1' | '2026-Q2' | '2026-Q3' | '2026-Q4';
  createdAt: string;
  verifiedAt: string | null;
}

export interface TemporalQuarterSnapshot {
  quarter: '2026-Q1' | '2026-Q2' | '2026-Q3' | '2026-Q4';
  label: string;
  nodeKey: string;
  activeAssets: number;
  openProblems: number;
  resolvedProblems: number;
  postgisGeometries: number;
  interNodePacksActive: number;
  highlight: string;
}

export const QUARTERS: ('2026-Q1' | '2026-Q2' | '2026-Q3' | '2026-Q4')[] = [
  '2026-Q1',
  '2026-Q2',
  '2026-Q3',
  '2026-Q4',
];

export const SYNC_PACK_STATUS_META: Record<
  SyncPackStatus,
  { label: string; color: string }
> = {
  proposed: { label: 'Propuesto (Pendiente de custodio receptor)', color: '#d99b26' },
  custodian_verified: { label: 'Custodia cruzada verificada', color: '#38bdf8' },
  federated_active: { label: 'Sincronización federada activa', color: '#2e9e5b' },
};

// ============================================================================
// HORIZONTE 3: Síntesis Multi-Escala, Linaje Criptográfico y Observatorio Federal
// ============================================================================

export type SynthesisStatus =
  | 'draft_requires_human'
  | 'human_ratified'
  | 'sealed_in_observatory';

export interface MultiScaleSynthesisItem {
  id: string;
  code: string;
  title: string;
  involvedNodes: string[];
  involvedDomains: DomainKey[];
  // Contrato Ético Tripartito a escala inter-jurisdiccional
  datoImmutableRefs: {
    featureIds: string[];
    reportIds: string[];
    geometryIds: string[];
    syncPackIds: string[];
  };
  datoSummary: string;
  interpretacionRule: string;
  interpretacionProvisional: string;
  sugerenciaAccion: string;
  requiresHumanReview: true;
  status: SynthesisStatus;
  ratifiedBy: string | null;
  ratifiedNote: string | null;
  ratifiedAt: string | null;
  lineageRootHash: string;
  createdAt: string;
}

export interface LineageChainStep {
  stepIndex: number;
  horizon: 'H1' | 'H2' | 'H3' | 'H4';
  stageLabel: string;
  eventType: string;
  entityId: string;
  nodeKey: string;
  parentHash: string;
  currentHash: string;
  verified: boolean;
  summary: string;
}

export interface FederalSovereigntyRecord {
  nodeKey: string;
  nodeName: string;
  provincia: string;
  custodiansActive: string[];
  sharedLayersCount: number;
  postgisCount: number;
  syncPacksCount: number;
  sovereigntyMode: 'delegacion_revocable_activa' | 'custodia_local_estricta';
  nodeMerkleRoot: string;
  lastAuditAt: string;
}

export const SYNTHESIS_STATUS_META: Record<
  SynthesisStatus,
  { label: string; color: string }
> = {
  draft_requires_human: {
    label: 'Borrador bloqueado (Requiere ratificación humana)',
    color: '#d99b26',
  },
  human_ratified: {
    label: 'Ratificado por mesa humana colegiada',
    color: '#38bdf8',
  },
  sealed_in_observatory: {
    label: 'Sellado en Observatorio Federal (Linaje completo)',
    color: '#2e9e5b',
  },
};

// ============================================================================
// HORIZONTE 4: Consultas PostGIS ST_Intersects/Buffer, Campo Offline-First,
// Identidad Criptográfica Ed25519 por Custodio y Webhooks de Telemetría
// ============================================================================

export interface SpatialIntersectionResult {
  id: string;
  geometryId: string;
  geometryTitle: string;
  geometryType: PostgisGeometryType;
  nodeKey: string;
  bufferMeters: number;
  spatialOperator: 'ST_Intersects + ST_DWithin(SRID=4326)';
  impactedFeatureIds: string[];
  impactedFeatureTitles: string[];
  impactedReportIds: string[];
  computedHash: string;
  executedAt: string;
}

export interface OfflineFieldQueueItem {
  id: string;
  nodeKey: string;
  brigadeName: string;
  layerKey: string;
  categoryCode: string;
  title: string;
  notes: string;
  coords: { lat: number; lng: number };
  occurredAt: string; // Capturado offline en campo
  ingestedAt: string | null; // Sellado al reconciliar lote con el servidor
  clientHash: string;
  syncStatus: 'queued_offline' | 'synced_idempotent' | 'duplicate_rejected';
}

export interface AccreditedCustodianRecord {
  id: string;
  nodeKey: string;
  role: 'community' | 'institutions' | 'businesses';
  displayName: string;
  organization: string;
  algorithm: 'Ed25519-SHA256';
  publicKeyFingerprint: string;
  signaturesIssuedCount: number;
  lastSignedTarget: string | null;
  lastSignatureHex: string | null;
  lastSignedAt: string | null;
}

export interface TelemetryWebhookRecord {
  id: string;
  stationCode: string;
  nodeKey: string;
  stationName: string;
  parameter: string;
  unit: string;
  lastValue: number;
  thresholdWarning: number;
  status: 'normal' | 'alerta_umbral_revision_humana';
  requiresHumanReview: true;
  lastEventHash: string;
  lastReceivedAt: string;
}
