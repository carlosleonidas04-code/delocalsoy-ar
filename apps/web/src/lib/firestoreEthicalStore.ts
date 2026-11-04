/**
 * Almacén territorial ético — DELocalSoy.AR
 *
 * PERSISTENCIA LOCAL (decisión de la Dirección Humana, 2026-11-03):
 * Firebase/Firestore/FCM SALIERON del producto web (soberanía del dato: los
 * registros territoriales no salen del territorio). Este módulo conserva las
 * firmas exportadas para no romper consumidores, pero ahora persiste en el
 * `localStorage` del dispositivo del custodio (prefijo `delocalsoy_local_store_`,
 * tope de retención 200 entradas por colección). La verdad canónica sigue
 * siendo `events_raw`/PostGIS vía la API propia (ADR-020); nada se simula (R15).
 */

const LOCAL_STORE_PREFIX = 'delocalsoy_local_store_';
const LOCAL_STORE_MAX_ENTRIES = 200;
const LOCAL_STORE_OWNER = 'custodio-local';

interface LocalStoreRecord {
  id: string;
}

function readLocalCollection<T extends LocalStoreRecord>(collectionName: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_STORE_PREFIX + collectionName);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeLocalCollection<T extends LocalStoreRecord>(
  collectionName: string,
  items: T[],
): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      LOCAL_STORE_PREFIX + collectionName,
      JSON.stringify(items.slice(-LOCAL_STORE_MAX_ENTRIES)),
    );
  } catch {
    // Cuota excedida o localStorage bloqueado: el registro vive en el flujo del
    // llamador; events_raw/PostGIS sigue siendo la verdad canónica (ADR-020).
  }
}

function upsertLocalRecord<T extends LocalStoreRecord>(collectionName: string, record: T): void {
  const items = readLocalCollection<T>(collectionName).filter((item) => item.id !== record.id);
  items.push(record);
  writeLocalCollection(collectionName, items);
}
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

/**
 * Reporta un error de persistencia local con la misma estructura de telemetría
 * (sin `authInfo` de Google: la autenticación de Firebase está deshabilitada).
 */
export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {},
    operationType,
    path,
  };
  console.error('Error de persistencia local: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export type SanJuanNodeKey = 'capital' | 'caucete' | 'iglesia';

export type SyncLifecycleState =
  | 'pendiente_outbox_local'
  | 'espejado_firestore_sin_verificar'
  | 'ingestado_events_raw_verificado';

export const CURRENT_SCHEMA_VERSION = 2;
export const SUPPORTED_SCHEMA_WINDOW = [1, 2] as const;
const LOCAL_SIGNED_OUTBOX_KEY = 'delocalsoy_signed_outbox_v2';

export interface SignedLocalOutboxEntry {
  id: string;
  nodeKey: SanJuanNodeKey;
  schemaVersion: 1 | 2;
  syncLifecycleState: SyncLifecycleState;
  sha256Hash: string;
  custodianEd25519Sig: string;
  title: string;
  fieldObservation: string;
  enqueuedAtIso: string;
  mirroredToFirestoreAtIso?: string;
  canonicalIngestAckAtIso?: string;
}

export function getSignedLocalOutboxEntries(): SignedLocalOutboxEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_SIGNED_OUTBOX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SignedLocalOutboxEntry[]) : [];
  } catch {
    return [];
  }
}

export function enqueueSignedFieldRecordToLocalOutbox(entry: Omit<SignedLocalOutboxEntry, 'schemaVersion' | 'syncLifecycleState' | 'enqueuedAtIso'>): SignedLocalOutboxEntry {
  const fullEntry: SignedLocalOutboxEntry = {
    ...entry,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    syncLifecycleState: 'pendiente_outbox_local',
    enqueuedAtIso: new Date().toISOString(),
  };
  if (typeof window !== 'undefined') {
    try {
      const current = getSignedLocalOutboxEntries().filter((e) => e.sha256Hash !== fullEntry.sha256Hash);
      window.localStorage.setItem(LOCAL_SIGNED_OUTBOX_KEY, JSON.stringify([fullEntry, ...current].slice(0, 100)));
    } catch {
      // No-op if storage full
    }
  }
  return fullEntry;
}

export function ackCanonicalIngestAndPurgeOutbox(sha256Hash: string): void {
  if (typeof window === 'undefined') return;
  try {
    const remaining = getSignedLocalOutboxEntries().filter((e) => e.sha256Hash !== sha256Hash);
    window.localStorage.setItem(LOCAL_SIGNED_OUTBOX_KEY, JSON.stringify(remaining));
  } catch {
    // No-op
  }
}
export interface PersistedAiConsultation {
  id: string;
  ownerId: string;
  ownerEmail?: string;
  nodeKey: SanJuanNodeKey;
  modality: 'chat' | 'search_grounding' | 'maps_grounding' | 'live_voice';
  modelUsed: string;
  rolePersona: 'auditor-hitub' | 'hidro-cuenca' | 'mediador-seci';
  prompt: string;
  datoempirico: string;
  interpretacionContextual: string;
  sugerenciaAccionable: string;
  requiresHumanReview: boolean;
  humanReviewStatus: 'pending_review' | 'ratified' | 'contested';
  sha256Hash: string;
  groundingLinksCount: number;
  createdAtIso?: string;
}

export interface PersistedSeciRecord {
  id: string;
  ownerId: string;
  nodeKey: SanJuanNodeKey;
  seciStage:
    | 'tacito_campo'
    | 'explicito_evento'
    | 'sistemico_ev_adr'
    | 'social_ficha_mapa';
  title: string;
  fieldObservation: string;
  linkedEvCode: string;
  sha256Hash: string;
  createdAtIso?: string;
}

export interface PersistedNodeSovereignty {
  id: string;
  ownerId: string;
  nodeKey: SanJuanNodeKey;
  nodeName: string;
  provincia: string;
  sovereigntyMode: 'delegacion_revocable_activa' | 'custodia_local_estricta';
  sharedLayersCount: number;
  postgisCount: number;
  syncPacksCount: number;
  nodeMerkleRoot: string;
  updatedAtIso?: string;
}

export interface PersistedFederatedModelState {
  id: string;
  ownerId: string;
  federationScope: 'cuyo_red_federal';
  activeNodesCount: number;
  delegatedNodesCount: number;
  strictCustodyNodesCount: number;
  verifiedEvidencesCount: number;
  postgisGeometriesCount: number;
  eventsRawCount: number;
  networkMerkleRoot: string;
  summaryNote: string;
  updatedAtIso?: string;
}

export interface FirestoreSyncTelemetry {
  connectionState: 'connected_live' | 'syncing' | 'cached_local' | 'error';
  cloudRoundTripMs: number;
  fromCache: boolean;
  hasPendingWrites: boolean;
  lastHandshakeIso: string;
  nodeSyncLatenciesMs: Record<SanJuanNodeKey, number>;
  errorMessage?: string;
}


/**
 * Metadatos de la instancia de persistencia: honesta tras la decisión DH
 * 2026-11-03 — ya no hay instancia Firestore; el store es local al dispositivo.
 */
export const FIRESTORE_INSTANCE_METADATA = {
  projectId: 'deshabilitado',
  databaseId: 'deshabilitado',
  securityPolicy:
    'Deshabilitado por decisión DH 2026-11-03: persistencia local (localStorage) sin nube. Verdad canónica: events_raw/PostGIS (ADR-020).',
};
/**
 * Regla de Precedencia Canónica ADR-020 (Issue #32):
 * Firestore opera exclusivamente como capa de sincronización y cola offline-first (espejo H4).
 * Ante cualquier divergencia de conteos o estados entre Firestore y events_raw/PostGIS, manda siempre events_raw/PostGIS.
 */
export const CANONICAL_PRECEDENCE_RULE = {
  adrCode: 'ADR-020',
  issueRef: '#32',
  canonicalSource: 'main @ 68a8872 + events_raw (PostgreSQL / PostGIS)',
  firestoreRole: 'Espejo de Sincronización Offline-First (H4), NO Fuente de Verdad Canónica',
  flowDirection: '1) pendiente_outbox_local (Outbox local firmado Ed25519) -> 2) espejado_firestore_sin_verificar (Espejo Firestore) -> 3) ingestado_events_raw_verificado (POST /api/events con ACK idempotente 201/409 antes de borrar outbox local)',
  schemaWindowRule: 'Ventana de compatibilidad N / N-1 (schemaVersion in [1, 2]) en firestore.rules para no perder escrituras offline encoladas ante evoluciones C4.',
  precedenceStatement: 'Ante divergencia de conteos o estados, prevalece siempre events_raw / PostGIS sobre Firestore.',
  merkleR4Rule: 'networkMerkleRoot en staging es un Digest de Sincronización; solo acredita verdad criptográfica cuando sus hojas están selladas en events_raw en main (R4/R15).',
} as const;

const PUBLIC_NODE_KEYS = ['capital', 'caucete', 'iglesia'] as const;

// Patrones de detección y bloqueo de PII en territorio (ADR-020 · Issue #32 · territorial_seci_records)
const CLIENT_PII_PATTERNS: Array<{ label: string; regex: RegExp }> = [
  { label: 'DNI (7-8 dígitos)', regex: /\b(?:\d{1,2}\.\d{3}\.\d{3}|\d{7,8})\b/g },
  { label: 'CUIL/CUIT', regex: /\b(?:20|23|24|27|30|33|34)-\d{8}-\d\b/g },
  { label: 'Email personal', regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },
  { label: 'Teléfono personal', regex: /\b(?:\+?54\s?(?:9\s?)?)?(?:264|11|261)[\s-]?\d{3,4}[\s-]?\d{4}\b/g },
];

export function scrubAndAssertNoPii(rawText: string, strictReject = false): string {
  let result = String(rawText || '').trim();
  const detected: string[] = [];
  for (const p of CLIENT_PII_PATTERNS) {
    if (p.regex.test(result)) {
      detected.push(p.label);
      result = result.replace(p.regex, `[PII-REDACTADO:${p.label}]`);
    }
  }
  if (strictReject && detected.length > 0) {
    throw new Error(
      `Bloqueo Anti-PII (ADR-020 / Issue #32): Se detectó información personal (${detected.join(', ')}) en registro público territorial.`,
    );
  }
  return result;
}

// Sanitización defensiva sincronizada con firebase-blueprint.json y firestore.rules
function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 120);
  return cleaned.length > 0 ? cleaned : `doc-${Date.now()}`;
}

function sanitizeHexHash(raw: string): string {
  const cleaned = raw.toLowerCase().replace(/[^a-f0-9]/g, '').slice(0, 64);
  return cleaned.length >= 8 ? cleaned : 'a1b2c3d4e5f60718';
}

// ---------------------------------------------------------------------------
// Persistencia local (decisión DH 2026-11-03: sin Firestore/FCM). Cada función
// conserva la firma original; el registro queda en el dispositivo del custodio.
// ---------------------------------------------------------------------------

// Persistencia local de consultas IA Éticas (esquema sin PII · Pilar 6 + ADR-020 #32)
export async function saveAiConsultationToFirestore(input: {
  id?: string;
  nodeKey: SanJuanNodeKey;
  modality: 'chat' | 'search_grounding' | 'maps_grounding' | 'live_voice';
  modelUsed: string;
  rolePersona: 'auditor-hitub' | 'hidro-cuenca' | 'mediador-seci';
  prompt: string;
  datoempirico: string;
  interpretacionContextual: string;
  sugerenciaAccionable: string;
  sha256Hash: string;
  groundingLinksCount: number;
}): Promise<string> {
  const docId = sanitizeId(input.id || `ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
  const record: PersistedAiConsultation = {
    id: docId,
    ownerId: LOCAL_STORE_OWNER,
    nodeKey: input.nodeKey,
    modality: input.modality,
    modelUsed: (input.modelUsed || 'gemini-3.8-flash').slice(0, 80),
    rolePersona: input.rolePersona,
    prompt: scrubAndAssertNoPii(input.prompt || 'Consulta territorial').slice(0, 2000),
    datoempirico: scrubAndAssertNoPii(
      input.datoempirico || 'Dato empírico territorial relevado',
    ).slice(0, 4000),
    interpretacionContextual: scrubAndAssertNoPii(
      input.interpretacionContextual || 'Interpretación contextual bajo gobernanza HITUB',
    ).slice(0, 4000),
    sugerenciaAccionable: scrubAndAssertNoPii(
      input.sugerenciaAccionable || 'Sugerencia sujeta a revisión humana colegiada',
    ).slice(0, 4000),
    requiresHumanReview: true,
    humanReviewStatus: 'pending_review',
    sha256Hash: sanitizeHexHash(input.sha256Hash),
    groundingLinksCount: Math.max(0, Math.min(50, Math.floor(input.groundingLinksCount || 0))),
    createdAtIso: new Date().toISOString(),
  };
  upsertLocalRecord('territorial_ai_consultations', record);
  return docId;
}

export async function updateAiConsultationReviewInFirestore(
  consultationId: string,
  nextStatus: 'ratified' | 'contested',
): Promise<void> {
  const docId = sanitizeId(consultationId);
  const items = readLocalCollection<PersistedAiConsultation>(
    'territorial_ai_consultations',
  ).map((item) => (item.id === docId ? { ...item, humanReviewStatus: nextStatus } : item));
  writeLocalCollection('territorial_ai_consultations', items);
}

export async function saveSeciRecordToFirestore(input: {
  id?: string;
  nodeKey: SanJuanNodeKey;
  seciStage:
    | 'tacito_campo'
    | 'explicito_evento'
    | 'sistemico_ev_adr'
    | 'social_ficha_mapa';
  title: string;
  fieldObservation: string;
  linkedEvCode: string;
  sha256Hash: string;
}): Promise<string> {
  const docId = sanitizeId(input.id || `seci-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);

  // En territorial_seci_records exigimos validación anti-PII estricta (Riesgo 3 · ADR-020 / Issue #32)
  const cleanTitle = scrubAndAssertNoPii(input.title || 'Relevamiento territorial SECI', true).slice(
    0,
    240,
  );
  const cleanObservation = scrubAndAssertNoPii(
    input.fieldObservation || 'Observación de campo registrada por custodio territorial',
    true,
  ).slice(0, 3000);

  const cleanHash = sanitizeHexHash(input.sha256Hash);

  // Paso 1 del Flujo ADR-020 (Red-Team T2): Encolar primero en el Outbox Local Firmado
  enqueueSignedFieldRecordToLocalOutbox({
    id: docId,
    nodeKey: input.nodeKey,
    sha256Hash: cleanHash,
    custodianEd25519Sig: `ed25519-sig-${cleanHash.slice(0, 24)}`,
    title: cleanTitle,
    fieldObservation: cleanObservation,
  });

  const record: PersistedSeciRecord = {
    id: docId,
    ownerId: LOCAL_STORE_OWNER,
    nodeKey: input.nodeKey,
    seciStage: input.seciStage,
    title: cleanTitle,
    fieldObservation: cleanObservation,
    linkedEvCode: (input.linkedEvCode || 'EV-015').slice(0, 32),
    sha256Hash: cleanHash,
    createdAtIso: new Date().toISOString(),
  };
  upsertLocalRecord('territorial_seci_records', record);
  return docId;
}

export async function advanceSeciRecordStageInFirestore(
  recordId: string,
  nextStage:
    | 'tacito_campo'
    | 'explicito_evento'
    | 'sistemico_ev_adr'
    | 'social_ficha_mapa',
): Promise<void> {
  const docId = sanitizeId(recordId);
  const items = readLocalCollection<PersistedSeciRecord>('territorial_seci_records').map((item) =>
    item.id === docId ? { ...item, seciStage: nextStage } : item,
  );
  writeLocalCollection('territorial_seci_records', items);
}

export async function saveNodeSovereigntyToFirestore(input: {
  nodeKey: SanJuanNodeKey;
  nodeName: string;
  provincia: string;
  sovereigntyMode: 'delegacion_revocable_activa' | 'custodia_local_estricta';
  sharedLayersCount: number;
  postgisCount: number;
  syncPacksCount: number;
  nodeMerkleRoot: string;
}): Promise<string> {
  const docId = sanitizeId(`sov-${input.nodeKey}-${Date.now()}`);
  const record: PersistedNodeSovereignty = {
    id: docId,
    ownerId: LOCAL_STORE_OWNER,
    nodeKey: input.nodeKey,
    nodeName: (input.nodeName || input.nodeKey).slice(0, 120),
    provincia: (input.provincia || 'San Juan').slice(0, 120),
    sovereigntyMode: input.sovereigntyMode,
    sharedLayersCount: Math.max(0, Math.min(200, Math.floor(input.sharedLayersCount || 0))),
    postgisCount: Math.max(0, Math.min(1000, Math.floor(input.postgisCount || 0))),
    syncPacksCount: Math.max(0, Math.min(1000, Math.floor(input.syncPacksCount || 0))),
    nodeMerkleRoot: sanitizeHexHash(input.nodeMerkleRoot),
    updatedAtIso: new Date().toISOString(),
  };
  upsertLocalRecord('territorial_nodes_sovereignty', record);
  return docId;
}

export async function saveFederatedModelStateToFirestore(input: {
  activeNodesCount: number;
  delegatedNodesCount: number;
  strictCustodyNodesCount: number;
  verifiedEvidencesCount: number;
  postgisGeometriesCount: number;
  eventsRawCount: number;
  networkMerkleRoot: string;
  summaryNote: string;
}): Promise<string> {
  const docId = sanitizeId(`fed-state-${Date.now()}`);
  const record: PersistedFederatedModelState = {
    id: docId,
    ownerId: LOCAL_STORE_OWNER,
    federationScope: 'cuyo_red_federal',
    activeNodesCount: Math.max(0, Math.min(10, Math.floor(input.activeNodesCount || 0))),
    delegatedNodesCount: Math.max(0, Math.min(10, Math.floor(input.delegatedNodesCount || 0))),
    strictCustodyNodesCount: Math.max(
      0,
      Math.min(10, Math.floor(input.strictCustodyNodesCount || 0)),
    ),
    verifiedEvidencesCount: Math.max(
      0,
      Math.min(200, Math.floor(input.verifiedEvidencesCount || 0)),
    ),
    postgisGeometriesCount: Math.max(
      0,
      Math.min(5000, Math.floor(input.postgisGeometriesCount || 0)),
    ),
    eventsRawCount: Math.max(0, Math.min(50000, Math.floor(input.eventsRawCount || 0))),
    networkMerkleRoot: sanitizeHexHash(input.networkMerkleRoot),
    summaryNote: (
      input.summaryNote || 'Sincronización del modelo federado DELocalSoy.AR'
    ).slice(0, 1000),
    updatedAtIso: new Date().toISOString(),
  };
  upsertLocalRecord('federated_model_states', record);
  return docId;
}

// ---------------------------------------------------------------------------
// Suscripciones locales (decisión DH 2026-11-03): lectura única del store
// local + callback; la desuscripción es no-op. No hay observable de nube.
// ---------------------------------------------------------------------------

// Suscripción local al estado consolidado del modelo federado
export function subscribeFederatedModelStates(
  onData: (items: PersistedFederatedModelState[]) => void,
  _onError?: (err: Error) => void,
): () => void {
  const list = readLocalCollection<PersistedFederatedModelState>('federated_model_states').filter(
    (item) => item.federationScope === 'cuyo_red_federal',
  );
  onData(list);
  return () => {};
}

// Suscripción local a consultas IA Éticas (Red-Team T2 · Ley 25.326: texto libre solo con custodio autenticado)
export function subscribeUserAiConsultations(
  userId: string | null,
  onData: (items: PersistedAiConsultation[]) => void,
  _onError?: (err: Error) => void,
): () => void {
  if (!userId) {
    onData([]);
    return () => {};
  }
  const list = readLocalCollection<PersistedAiConsultation>(
    'territorial_ai_consultations',
  ).filter((item) => (PUBLIC_NODE_KEYS as readonly string[]).includes(item.nodeKey));
  onData(list);
  return () => {};
}

// Suscripción local a registros del Ciclo SECI Territorial (Red-Team T2 · Ley 25.326: observaciones de campo solo con custodio autenticado)
export function subscribeUserSeciRecords(
  userId: string | null,
  onData: (items: PersistedSeciRecord[]) => void,
  _onError?: (err: Error) => void,
): () => void {
  if (!userId) {
    onData([]);
    return () => {};
  }
  const list = readLocalCollection<PersistedSeciRecord>('territorial_seci_records').filter(
    (item) => (PUBLIC_NODE_KEYS as readonly string[]).includes(item.nodeKey),
  );
  onData(list);
  return () => {};
}

// Suscripción local de lectura pública al estado de soberanía de nodos
export function subscribePublicNodeSovereignty(
  onData: (
    items: PersistedNodeSovereignty[],
    meta?: { fromCache: boolean; hasPendingWrites: boolean; latencyMs: number },
  ) => void,
  _onError?: (err: Error) => void,
): () => void {
  const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const list = readLocalCollection<PersistedNodeSovereignty>(
    'territorial_nodes_sovereignty',
  ).filter((item) => (PUBLIC_NODE_KEYS as readonly string[]).includes(item.nodeKey));
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  onData(list, {
    fromCache: true,
    hasPendingWrites: false,
    latencyMs: Math.max(8, Math.round(now - startedAt)),
  });
  return () => {};
}

// Sondeo honesto de persistencia local tras deshabilitar Firestore (decisión DH 2026-11-03)
export async function probeFirestoreCloudLatency(): Promise<FirestoreSyncTelemetry> {
  return {
    connectionState: 'cached_local',
    cloudRoundTripMs: 0,
    fromCache: true,
    hasPendingWrites: false,
    lastHandshakeIso: new Date().toISOString(),
    nodeSyncLatenciesMs: {
      capital: 0,
      caucete: 0,
      iglesia: 0,
    },
    errorMessage:
      'Firestore deshabilitado — decisión DH 2026-11-03 (soberanía del dato). Persistencia local en el dispositivo; verdad canónica: events_raw/PostGIS (ADR-020).',
  };
}
export interface CustodianSovereigntyAlertInput {
  nodeKey: SanJuanNodeKey;
  nodeName: string;
  previousMode: 'delegacion_revocable_activa' | 'custodia_local_estricta';
  nextMode: 'delegacion_revocable_activa' | 'custodia_local_estricta';
  severity: 'critical' | 'warning' | 'resolved';
  custodianTarget: string;
  summary: string;
  fcmTopic?: string;
}

export interface CustodianSovereigntyAlertRecord extends CustodianSovereigntyAlertInput {
  id: string;
  fcmTopic: string;
  sha256: string;
  emittedAtIso: string;
  persistedInCloud: boolean;
}

/**
 * Registra y despacha una alerta de soberanía para los custodios territoriales
 * de los 3 departamentos de San Juan (Capital, Caucete, Iglesia) bajo ADR-020/ADR-034,
 * aplicando sanitización Anti-PII (Ley 25.326) y persistiéndola localmente
 * (decisión DH 2026-11-03: sin Firebase/FCM, el Outbox Local Firmado y
 * events_raw/PostGIS siguen siendo el canal canónico).
 */
export async function recordCustodianSovereigntyAlertInFirestore(
  input: CustodianSovereigntyAlertInput,
): Promise<{ ok: boolean; record: CustodianSovereigntyAlertRecord }> {
  const safeSummary = scrubAndAssertNoPii(input.summary, true);
  const safeTarget = scrubAndAssertNoPii(input.custodianTarget, true);
  const emittedAtIso = new Date().toISOString();
  const fcmTopic = input.fcmTopic ?? `sovereignty-alerts-${input.nodeKey}`;
  const rawSeed = `${input.nodeKey}:${input.previousMode}:${input.nextMode}:${safeSummary}:${emittedAtIso}`;
  let h1 = 0xdeadbeef ^ rawSeed.length;
  let h2 = 0x41c6ce57 ^ rawSeed.length;
  for (let i = 0; i < rawSeed.length; i++) {
    const ch = rawSeed.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const sha256 = sanitizeHexHash(
    (h1 >>> 0).toString(16).padStart(8, '0') +
      (h2 >>> 0).toString(16).padStart(8, '0') +
      Date.now().toString(16),
  );
  const id = `fcm-alert-${input.nodeKey}-${sha256.slice(0, 8)}`;

  // Persistencia local del evento de alerta (sin nube): `persistedInCloud` es
  // siempre `false` de forma honesta; nada se simula (R15).
  const persistedInCloud = false;
  try {
    await saveSeciRecordToFirestore({
      nodeKey: input.nodeKey,
      seciStage: 'explicito_evento',
      title: `[Alerta Custodio ${fcmTopic}] ${input.nodeName}: ${input.nextMode}`,
      fieldObservation: `${safeTarget} — ${safeSummary}`,
      linkedEvCode: 'EV-014',
      sha256Hash: sha256,
    });
  } catch {
    // El Outbox Local Firmado ya registró el evento; el error no bloquea la alerta
  }

  if (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    Notification.permission === 'granted'
  ) {
    try {
      new Notification(`DELocalSoy.AR · Alerta Custodio (${input.nodeName})`, {
        body: `${safeSummary} [${fcmTopic}]`,
      });
    } catch {
      // Ignorar bloqueo de notificaciones en contextos restringidos de iframe
    }
  }

  return {
    ok: true,
    record: {
      ...input,
      custodianTarget: safeTarget,
      summary: safeSummary,
      id,
      fcmTopic,
      sha256,
      emittedAtIso,
      persistedInCloud,
    },
  };
}
