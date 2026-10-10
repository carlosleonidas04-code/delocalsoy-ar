/**
 * DELocalSoy.AR — Modelo Territorial Federado (H1–H4): contratos de tipo del payload
 * de `GET /api/modelo-federado`.
 *
 * PROCEDENCIA (R4/R12 — reconstrucción derivada, divulgada):
 * Este módulo NO proviene verbatim de un lote de staging. Fue derivado por [agent: vibe]
 * a partir de dos fuentes acreditadas:
 *   1. Las formas de datos reales sembradas por el middleware del staging
 *      (`vite.config.ts`, M29 — seeds `initialLayers`, `initialCategories`, `initialFeatures`,
 *      `initialEvidencias`, `initialSpatialGeometries`, `initialSyncPacks`,
 *      `initialTemporalSnapshots`, `initialMultiScaleSyntheses`, `initialLineageChain`,
 *      `initialSpatialIntersections`, `initialOfflineFieldQueue`,
 *      `initialAccreditedCustodians`, `initialTelemetryWebhooks`,
 *      `buildFederalSovereignty()`, `reports`, `eventsRaw` y `GET /api/modelo-federado`).
 *   2. El uso exacto que hace `App.tsx` (M27, aterrizado en main vía PR #117) de estos tipos.
 * Si un lote autoritativo posterior de [agent: google] trae el `federatedModel` original,
 * ese lote prevalece y debe reemplazar este archivo (Staging propone, GitHub acredita — R1).
 *
 * Reglas respetadas: R5 (sin fallbacks silenciosos — los tipos reflejan el contrato real
 * del endpoint, incluidos los campos anulables `*_at`), R14 (soberanía: los modos y roles
 * se modelan como uniones explícitas) y ADR-004 (Contrato Ético: `requiresHumanReview`
 * es parte del contrato de datos, no un decorado).
 */

// ============================================================================
// Uniones canónicas del dominio (derivadas de los seeds H1–H4 del middleware)
// ============================================================================

/**
 * Dominios territoriales usados por capas (`layers[].domain`), features
 * (`features[].domain`) y síntesis (`multiScaleSyntheses[].involvedDomains`).
 */
export type DomainKey =
  | 'assets'
  | 'public_space'
  | 'problems'
  | 'health'
  | 'community'
  | 'production'
  | 'tourism';

/**
 * Tipos de geometría PostGIS gestionados por el motor espacial (SRID=4326).
 */
export type PostgisGeometryType = 'Point' | 'LineString' | 'Polygon';

/**
 * Régimen de soberanía por nodo (Horizonte 3 — toggle `/api/horizonte3/soberania/:nodeKey`).
 */
export type SovereigntyMode =
  | 'delegacion_revocable_activa'
  | 'custodia_local_estricta';

/**
 * Roles de custodia tripartita (Comunidad · Instituciones · Comercios).
 */
export type CustodianRole = 'community' | 'institutions' | 'businesses';

// ============================================================================
// H1 — Capas, categorías y observaciones primarias
// ============================================================================

/**
 * Capa temática de un nodo federado (seed `initialLayers`).
 */
export interface TerritorioLayer {
  key: string;
  name: string;
  domain: DomainKey;
  geometry: PostgisGeometryType;
  defaultOn: boolean;
  producedBy: CustodianRole[];
}

/**
 * Categoría de reporte dentro de una capa (seed `initialCategories`).
 */
export interface TerritorioCategory {
  code: string;
  label: string;
  layer: string;
}

/**
 * Observación puntual sobre una capa (seed `initialFeatures` vía `mkFeature`).
 * `x`/`y` son coordenadas esquemáticas 0–100 para el mapa de nodos.
 */
export interface TerritorioFeature {
  id: string;
  nodeKey: string;
  layer: string;
  x: number;
  y: number;
  title: string;
  status: string;
  observedAt: string;
  sourceLabel: string;
  isSynthetic: boolean;
  type: 'asset' | 'problem';
  domain: DomainKey;
}

/**
 * Reporte territorial con su historial de estados
 * (`received → evaluating → in_progress → resolved`).
 */
export interface TerritorialReport {
  id: string;
  eventId: string;
  nodeKey: string;
  category: string;
  categoryLabel: string;
  description: string;
  status: string;
  createdAt: string;
  isSynthetic: boolean;
  picked: { x: number; y: number };
  history: Array<{ status: string; at: string }>;
  humanReviewed: boolean;
}

/**
 * Evento crudo inmutable con hash idempotente (EV-005: duplicado → 409 Conflict).
 */
export interface RawEventRecord {
  id: string;
  type: string;
  nodeId: string;
  hash: string;
  payload: Record<string, unknown>;
  occurred_at: string;
  ingested_at: string | null;
  is_synthetic: boolean;
}

/**
 * Evidencia verificable del ciclo CORE/EV.
 */
export interface EvidenciaRecord {
  id: string;
  code: string;
  title: string;
  status: string;
  result: Record<string, unknown> | null;
  verified_at: string | null;
}

// ============================================================================
// H2 — Morfología espacial PostGIS y custodia cruzada
// ============================================================================

/**
 * Geometría PostGIS SRID=4326 con representación esquemática y coordenadas reales.
 */
export interface SpatialGeometryRecord {
  id: string;
  nodeKey: string;
  layerKey: string;
  domain: DomainKey;
  title: string;
  geometryType: PostgisGeometryType;
  srid: number;
  wkt: string;
  metricLabel: string;
  custodians: CustodianRole[];
  status: string;
  quarter: string;
  schematicPath: Array<{ x: number; y: number }>;
  realCoords: Array<{ lat: number; lng: number }>;
  color: string;
}

/**
 * Paquete de sincronización inter-nodos con mapeo explícito de vocabularios
 * (sin homogeneización semántica).
 */
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
  status: string;
  quarter: string;
  createdAt: string;
  verifiedAt: string | null;
}

/**
 * Snapshot multitemporal por trimestre (2026-Q1..Q4) y por nodo.
 */
export interface TemporalQuarterSnapshot {
  quarter: string;
  label: string;
  nodeKey: string;
  activeAssets: number;
  openProblems: number;
  resolvedProblems: number;
  postgisGeometries: number;
  interNodePacksActive: number;
  highlight: string;
}

// ============================================================================
// H3 — Síntesis multi-escala, linaje criptográfico y soberanía federal
// ============================================================================

/**
 * Síntesis multi-escala bajo Contrato Ético Tripartito (ADR-004):
 * Dato → Interpretación → Sugerencia, con `requiresHumanReview` como invariante
 * (EV-013) y referencias inmutables a los registros primarios que la sustentan.
 */
export interface MultiScaleSynthesisItem {
  id: string;
  code: string;
  title: string;
  involvedNodes: string[];
  involvedDomains: DomainKey[];
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
  requiresHumanReview: boolean;
  status: string;
  ratifiedBy: string | null;
  ratifiedNote: string | null;
  ratifiedAt: string | null;
  lineageRootHash: string;
  createdAt: string;
}

/**
 * Eslabón de la cadena de linaje SHA-256 (H1 → H2 → H3 → H4).
 */
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

/**
 * Registro de soberanía federal por nodo (derivado de `buildFederalSovereignty()`):
 * `nodeMerkleRoot` sella el estado (capas + geometrías + paquetes + modo).
 */
export interface FederalSovereigntyRecord {
  nodeKey: string;
  nodeName: string;
  provincia: string;
  custodiansActive: CustodianRole[];
  sharedLayersCount: number;
  postgisCount: number;
  syncPacksCount: number;
  sovereigntyMode: SovereigntyMode;
  nodeMerkleRoot: string;
  lastAuditAt: string | null;
}

// ============================================================================
// H4 — Operación en terreno: intersección espacial, campo offline-first,
//      firmas Ed25519 y telemetría hídrica/climática
// ============================================================================

/**
 * Resultado de una intersección espacial con buffer
 * (`ST_Intersects + ST_DWithin(SRID=4326)`, EV-015).
 */
export interface SpatialIntersectionResult {
  id: string;
  geometryId: string;
  geometryTitle: string;
  geometryType: PostgisGeometryType;
  nodeKey: string;
  bufferMeters: number;
  spatialOperator: string;
  impactedFeatureIds: string[];
  impactedFeatureTitles: string[];
  impactedReportIds: string[];
  computedHash: string;
  executedAt: string;
}

/**
 * Ítem de la cola de campo offline-first con hash cliente idempotente
 * (`occurred_at` en terreno vs `ingested_at` al recobrar cobertura, EV-016).
 */
export interface OfflineFieldQueueItem {
  id: string;
  nodeKey: string;
  brigadeName: string;
  layerKey: string;
  categoryCode: string;
  title: string;
  notes: string;
  coords: { lat: number; lng: number };
  occurredAt: string;
  ingestedAt: string | null;
  clientHash: string;
  syncStatus: string;
}

/**
 * Custodio acreditado con identidad criptográfica Ed25519-SHA256 (EV-017).
 */
export interface AccreditedCustodianRecord {
  id: string;
  nodeKey: string;
  role: CustodianRole;
  displayName: string;
  organization: string;
  algorithm: string;
  publicKeyFingerprint: string;
  signaturesIssuedCount: number;
  lastSignedTarget: string;
  lastSignatureHex: string;
  lastSignedAt: string;
}

/**
 * Estación de telemetría hídrica/climática ingerida por webhook bajo
 * Contrato Ético (EV-018: `requiresHumanReview === true`).
 */
export interface TelemetryWebhookRecord {
  id: string;
  stationCode: string;
  nodeKey: string;
  stationName: string;
  parameter: string;
  unit: string;
  lastValue: number;
  thresholdWarning: number;
  status: string;
  requiresHumanReview: boolean;
  lastEventHash: string;
  lastReceivedAt: string;
}
