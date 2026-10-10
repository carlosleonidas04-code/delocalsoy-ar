/**
 * DELocalSoy.AR â Modelo Territorial Federado (H1âH4): contratos de tipo del payload
 * de `GET /api/modelo-federado`.
 *
 * PROCEDENCIA (R4/R12 â reconstrucciÃ³n derivada, divulgada):
 * Este mÃ³dulo NO proviene verbatim de un lote de staging. Fue derivado por [agent: vibe]
 * a partir de dos fuentes acreditadas:
 *   1. Las formas de datos reales sembradas por el middleware del staging
 *      (`vite.config.ts`, M29 â seeds `initialLayers`, `initialCategories`, `initialFeatures`,
 *      `initialEvidencias`, `initialSpatialGeometries`, `initialSyncPacks`,
 *      `initialTemporalSnapshots`, `initialMultiScaleSyntheses`, `initialLineageChain`,
 *      `initialSpatialIntersections`, `initialOfflineFieldQueue`,
 *      `initialAccreditedCustodians`, `initialTelemetryWebhooks`,
 *      `buildFederalSovereignty()`, `reports`, `eventsRaw` y `GET /api/modelo-federado`).
 *   2. El uso exacto que hace `App.tsx` (M27, aterrizado en main vÃ­a PR #117) de estos tipos.
 * Si un lote autoritativo posterior de [agent: google] trae el `federatedModel` original,
 * ese lote prevalece y debe reemplazar este archivo (Staging propone, GitHub acredita â R1).
 *
 * Reglas respetadas: R5 (sin fallbacks silenciosos â los tipos reflejan el contrato real
 * del endpoint, incluidos los campos anulables `*_at`), R14 (soberanÃ­a: los modos y roles
 * se modelan como uniones explÃ­citas) y ADR-004 (Contrato Ãtico: `requiresHumanReview`
 * es parte del contrato de datos, no un decorado).
 */

// ============================================================================
// Uniones canÃ³nicas del dominio (derivadas de los seeds H1âH4 del middleware)
// ============================================================================

/**
 * Dominios territoriales usados por capas (`layers[].domain`), features
 * (`features[].domain`) y sÃ­ntesis (`multiScaleSyntheses[].involvedDomains`).
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
 * Tipos de geometrÃ­a PostGIS gestionados por el motor espacial (SRID=4326).
 */
export type PostgisGeometryType = 'Point' | 'LineString' | 'Polygon';

/**
 * RÃ©gimen de soberanÃ­a por nodo (Horizonte 3 â toggle `/api/horizonte3/soberania/:nodeKey`).
 */
export type SovereigntyMode =
  | 'delegacion_revocable_activa'
  | 'custodia_local_estricta';

/**
 * Roles de custodia tripartita (Comunidad Â· Instituciones Â· Comercios).
 */
export type CustodianRole = 'community' | 'institutions' | 'businesses';

// ============================================================================
// H1 â Capas, categorÃ­as y observaciones primarias
// ============================================================================

/**
 * Capa temÃ¡tica de un nodo federado (seed `initialLayers`).
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
 * CategorÃ­a de reporte dentro de una capa (seed `initialCategories`).
 */
export interface TerritorioCategory {
  code: string;
  label: string;
  layer: string;
}

/**
 * ObservaciÃ³n puntual sobre una capa (seed `initialFeatures` vÃ­a `mkFeature`).
 * `x`/`y` son coordenadas esquemÃ¡ticas 0â100 para el mapa de nodos.
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
 * (`received â evaluating â in_progress â resolved`).
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
 * Evento crudo inmutable con hash idempotente (EV-005: duplicado â 409 Conflict).
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
// H2 â MorfologÃ­a espacial PostGIS y custodia cruzada
// ============================================================================

/**
 * GeometrÃ­a PostGIS SRID=4326 con representaciÃ³n esquemÃ¡tica y coordenadas reales.
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
 * Paquete de sincronizaciÃ³n inter-nodos con mapeo explÃ­cito de vocabularios
 * (sin homogeneizaciÃ³n semÃ¡ntica).
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
// H3 â SÃ­ntesis multi-escala, linaje criptogrÃ¡fico y soberanÃ­a federal
// ============================================================================

/**
 * SÃ­ntesis multi-escala bajo Contrato Ãtico Tripartito (ADR-004):
 * Dato â InterpretaciÃ³n â Sugerencia, con `requiresHumanReview` como invariante
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
 * EslabÃ³n de la cadena de linaje SHA-256 (H1 â H2 â H3 â H4).
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
 * Registro de soberanÃ­a federal por nodo (derivado de `buildFederalSovereignty()`):
 * `nodeMerkleRoot` sella el estado (capas + geometrÃ­as + paquetes + modo).
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
// H4 â OperaciÃ³n en terreno: intersecciÃ³n espacial, campo offline-first,
//      firmas Ed25519 y telemetrÃ­a hÃ­drica/climÃ¡tica
// ============================================================================

/**
 * Resultado de una intersecciÃ³n espacial con buffer
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
 * Ãtem de la cola de campo offline-first con hash cliente idempotente
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
 * Custodio acreditado con identidad criptogrÃ¡fica Ed25519-SHA256 (EV-017).
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
 * EstaciÃ³n de telemetrÃ­a hÃ­drica/climÃ¡tica ingerida por webhook bajo
 * Contrato Ãtico (EV-018: `requiresHumanReview === true`).
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

// ============================================================================
// TRAMO 2 — Vocabularios de presentación del modelo federado
// (AÑADIDO por [agent: vibe] junto al aterrizaje de los 13 componentes UI,
// lotes M12–M26 del staging — PR posterior a #118)
//
// PROCEDENCIA (R4/R12 — reconstrucción derivada, divulgada):
// Ningún lote de staging trajo el `federatedModel` original con estas
// exportaciones. Este tramo fue derivado por [agent: vibe] a partir de:
//   1. Los imports EXACTOS de los componentes acreditados del staging:
//      `DOMAINS`, `QUARTERS`, `STATUS_META`, `REPORT_STATUS_META`,
//      `SYNC_PACK_STATUS_META`, `SYNTHESIS_STATUS_META` y `type EpistemicStatus`.
//   2. Los VALORES de estado acreditados por los seeds del middleware
//      (`vite.config.ts` M29, ya en main vía PR #117): features/geometrías
//      `verified | community_validated | pending | synthetic_demo`; reportes
//      `received → evaluating → in_progress → resolved` (REPORT_FLOW);
//      syncPacks `federated_active | custodian_verified | proposed`;
//      síntesis `human_ratified | draft_requires_human | sealed_in_observatory`;
//      trimestres `2026-Q1..Q4` con etiquetas `T1..T4`.
//   3. El USO de cada exportación en los componentes (`.label`, `.color`,
//      `DOMAINS.find(d => d.key === …)`, `QUARTERS.map(q => …)`).
// Los textos de etiqueta y los colores hex son elección editorial derivada
// (paleta en uso en los propios componentes: #2e9e5b ok, #38bdf8 info,
// #d99b26 pendiente, #cbd5e1 sintético, #f59e0b en gestión); si el lote
// autoritativo trae los originales, prevalece y reemplaza (R1/R12).
// ============================================================================

/**
 * Estado epistémico de una observación/activo territorial (mapea 1:1 con las
 * claves de `EPISTEMIC_TO_R5_UI` en FederatedNodeExplorer y los seeds H1 de
 * `vite.config.ts`).
 */
export type EpistemicStatus =
  | 'verified'
  | 'community_validated'
  | 'pending'
  | 'synthetic_demo';

/**
 * Dominios transversales de la plataforma (botoneras de M12/M16/M20/M24).
 */
export const DOMAINS: Array<{ key: DomainKey; label: string }> = [
  { key: 'assets', label: 'Activos y comercios' },
  { key: 'public_space', label: 'Espacio público' },
  { key: 'problems', label: 'Problemáticas urbanas' },
  { key: 'health', label: 'Salud y resiliencia' },
  { key: 'community', label: 'Comunidad y educación' },
  { key: 'production', label: 'Producción local' },
  { key: 'tourism', label: 'Turismo y patrimonio' },
];

/**
 * Trimestres del ciclo 2026 (EV-009 · serie multitemporal H2).
 */
export const QUARTERS: string[] = [
  '2026-Q1',
  '2026-Q2',
  '2026-Q3',
  '2026-Q4',
];

export interface StatusMetaEntry {
  label: string;
  color: string;
}

/**
 * Meta de estado epistémico para features y geometrías PostGIS
 * (`STATUS_META[status]?.label / ?.color`; fallback estándar `STATUS_META.pending`).
 */
export const STATUS_META: Record<string, StatusMetaEntry> = {
  verified: { label: 'Verificado', color: '#2e9e5b' },
  community_validated: { label: 'Validación comunitaria', color: '#38bdf8' },
  pending: { label: 'Pendiente de validación', color: '#d99b26' },
  synthetic_demo: { label: 'Demo sintética (R5)', color: '#cbd5e1' },
};

/**
 * Meta de estado del flujo de reportes ciudadanos
 * (`received → evaluating → in_progress → resolved`, REPORT_FLOW en M29).
 */
export const REPORT_STATUS_META: Record<string, StatusMetaEntry> = {
  received: { label: 'Recibido', color: '#38bdf8' },
  evaluating: { label: 'En evaluación', color: '#d99b26' },
  in_progress: { label: 'En gestión', color: '#f59e0b' },
  resolved: { label: 'Resuelto', color: '#2e9e5b' },
};

/**
 * Meta de estado de los paquetes de sincronización inter-nodos (H2 · EV-008).
 */
export const SYNC_PACK_STATUS_META: Record<string, StatusMetaEntry> = {
  federated_active: { label: 'Federación activa', color: '#2e9e5b' },
  custodian_verified: { label: 'Verificado por custodios', color: '#38bdf8' },
  proposed: { label: 'Propuesta (sin ACK)', color: '#d99b26' },
};

/**
 * Meta de estado de las síntesis multi-escala bajo Contrato Ético (H3 · EV-011/EV-013).
 */
export const SYNTHESIS_STATUS_META: Record<string, StatusMetaEntry> = {
  human_ratified: { label: 'Ratificada por revisión humana', color: '#2e9e5b' },
  draft_requires_human: {
    label: 'Borrador — requiere revisión humana',
    color: '#d99b26',
  },
  sealed_in_observatory: {
    label: 'Sellada en observatorio (H3)',
    color: '#38bdf8',
  },
};
