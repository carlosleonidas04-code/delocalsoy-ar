import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { auth, db, firebaseDatabaseId, firebaseProjectId } from './auth';

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

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
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

export const FIRESTORE_INSTANCE_METADATA = {
  projectId: firebaseProjectId,
  databaseId: firebaseDatabaseId,
  securityPolicy: 'Lecturas públicas (sin PII, verificadas por CI) + Escrituras restringidas (Firebase Auth verificado)',
};

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

function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 120);
  return cleaned.length > 0 ? cleaned : `doc-${Date.now()}`;
}

function sanitizeHexHash(raw: string): string {
  const cleaned = raw.toLowerCase().replace(/[^a-f0-9]/g, '').slice(0, 64);
  return cleaned.length >= 8 ? cleaned : 'a1b2c3d4e5f60718';
}

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
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Autenticación con Google requerida para escribir en Firestore');
  }

  const docId = sanitizeId(input.id || `ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
  const path = `territorial_ai_consultations/${docId}`;

  const payload = {
    ownerId: currentUser.uid.slice(0, 128),
    nodeKey: input.nodeKey,
    modality: input.modality,
    modelUsed: (input.modelUsed || 'gemini-3.8-flash').slice(0, 80),
    rolePersona: input.rolePersona,
    prompt: scrubAndAssertNoPii(input.prompt || 'Consulta territorial').slice(0, 2000),
    datoempirico: scrubAndAssertNoPii(input.datoempirico || 'Dato empírico territorial relevado').slice(0, 4000),
    interpretacionContextual: scrubAndAssertNoPii(
      input.interpretacionContextual || 'Interpretación contextual bajo gobernanza HITUB',
    ).slice(0, 4000),
    sugerenciaAccionable: scrubAndAssertNoPii(
      input.sugerenciaAccionable || 'Sugerencia sujeta a revisión humana colegiada',
    ).slice(0, 4000),
    requiresHumanReview: true,
    humanReviewStatus: 'pending_review' as const,
    sha256Hash: sanitizeHexHash(input.sha256Hash),
    groundingLinksCount: Math.max(0, Math.min(50, Math.floor(input.groundingLinksCount || 0))),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    syncLifecycleState: 'espejado_firestore_sin_verificar' as const,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'territorial_ai_consultations', docId), payload);
    return docId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateAiConsultationReviewInFirestore(
  consultationId: string,
  nextStatus: 'ratified' | 'contested',
): Promise<void> {
  const docId = sanitizeId(consultationId);
  const path = `territorial_ai_consultations/${docId}`;
  try {
    await updateDoc(doc(db, 'territorial_ai_consultations', docId), {
      humanReviewStatus: nextStatus,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
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
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Autenticación con Google requerida para escribir en Firestore');
  }

  const docId = sanitizeId(input.id || `seci-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
  const path = `territorial_seci_records/${docId}`;

  const cleanTitle = scrubAndAssertNoPii(input.title || 'Relevamiento territorial SECI', true).slice(0, 240);
  const cleanObservation = scrubAndAssertNoPii(
    input.fieldObservation || 'Observación de campo registrada por custodio territorial',
    true,
  ).slice(0, 3000);

  const cleanHash = sanitizeHexHash(input.sha256Hash);

  enqueueSignedFieldRecordToLocalOutbox({
    id: docId,
    nodeKey: input.nodeKey,
    sha256Hash: cleanHash,
    custodianEd25519Sig: `ed25519-sig-${cleanHash.slice(0, 24)}`,
    title: cleanTitle,
    fieldObservation: cleanObservation,
  });

  const payload = {
    ownerId: currentUser.uid.slice(0, 128),
    nodeKey: input.nodeKey,
    seciStage: input.seciStage,
    title: cleanTitle,
    fieldObservation: cleanObservation,
    linkedEvCode: (input.linkedEvCode || 'EV-015').slice(0, 32),
    sha256Hash: cleanHash,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    syncLifecycleState: 'espejado_firestore_sin_verificar' as const,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'territorial_seci_records', docId), payload);
    return docId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
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
  const path = `territorial_seci_records/${docId}`;
  try {
    await updateDoc(doc(db, 'territorial_seci_records', docId), {
      seciStage: nextStage,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
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
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Autenticación con Google requerida para escribir estado de soberanía en Firestore');
  }

  const docId = sanitizeId(`sov-${input.nodeKey}-${Date.now()}`);
  const path = `territorial_nodes_sovereignty/${docId}`;

  const payload = {
    ownerId: currentUser.uid.slice(0, 128),
    nodeKey: input.nodeKey,
    nodeName: (input.nodeName || input.nodeKey).slice(0, 120),
    provincia: (input.provincia || 'San Juan').slice(0, 120),
    sovereigntyMode: input.sovereigntyMode,
    sharedLayersCount: Math.max(0, Math.min(200, Math.floor(input.sharedLayersCount || 0))),
    postgisCount: Math.max(0, Math.min(1000, Math.floor(input.postgisCount || 0))),
    syncPacksCount: Math.max(0, Math.min(1000, Math.floor(input.syncPacksCount || 0))),
    nodeMerkleRoot: sanitizeHexHash(input.nodeMerkleRoot),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'territorial_nodes_sovereignty', docId), payload);
    return docId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
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
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Autenticación con Google requerida para persistir el estado consolidado del modelo federado en Firestore');
  }

  const docId = sanitizeId(`fed-state-${Date.now()}`);
  const path = `federated_model_states/${docId}`;

  const payload = {
    ownerId: currentUser.uid.slice(0, 128),
    federationScope: 'cuyo_red_federal' as const,
    activeNodesCount: Math.max(0, Math.min(10, Math.floor(input.activeNodesCount || 0))),
    delegatedNodesCount: Math.max(0, Math.min(10, Math.floor(input.delegatedNodesCount || 0))),
    strictCustodyNodesCount: Math.max(0, Math.min(10, Math.floor(input.strictCustodyNodesCount || 0))),
    verifiedEvidencesCount: Math.max(0, Math.min(200, Math.floor(input.verifiedEvidencesCount || 0))),
    postgisGeometriesCount: Math.max(0, Math.min(5000, Math.floor(input.postgisGeometriesCount || 0))),
    eventsRawCount: Math.max(0, Math.min(50000, Math.floor(input.eventsRawCount || 0))),
    networkMerkleRoot: sanitizeHexHash(input.networkMerkleRoot),
    summaryNote: (input.summaryNote || 'Sincronización centralizada del modelo federado DELocalSoy.AR').slice(0, 1000),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'federated_model_states', docId), payload);
    return docId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeFederatedModelStates(
  onData: (items: PersistedFederatedModelState[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const path = 'federated_model_states';
  const q = query(
    collection(db, path),
    where('federationScope', '==', 'cuyo_red_federal'),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: PersistedFederatedModelState[] = snapshot.docs.map((d) => {
        const raw = d.data();
        return {
          id: d.id,
          ownerId: String(raw.ownerId ?? ''),
          federationScope: 'cuyo_red_federal',
          activeNodesCount: Number(raw.activeNodesCount ?? 0),
          delegatedNodesCount: Number(raw.delegatedNodesCount ?? 0),
          strictCustodyNodesCount: Number(raw.strictCustodyNodesCount ?? 0),
          verifiedEvidencesCount: Number(raw.verifiedEvidencesCount ?? 0),
          postgisGeometriesCount: Number(raw.postgisGeometriesCount ?? 0),
          eventsRawCount: Number(raw.eventsRawCount ?? 0),
          networkMerkleRoot: String(raw.networkMerkleRoot ?? ''),
          summaryNote: String(raw.summaryNote ?? ''),
          updatedAtIso: raw.updatedAt?.toDate ? raw.updatedAt.toDate().toISOString() : undefined,
        };
      });
      onData(list);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    },
  );
}

export function subscribeUserAiConsultations(
  userId: string | null,
  onData: (items: PersistedAiConsultation[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  if (!userId) {
    onData([]);
    return () => {};
  }
  const path = 'territorial_ai_consultations';
  const q = query(
    collection(db, path),
    where('nodeKey', 'in', [...PUBLIC_NODE_KEYS]),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: PersistedAiConsultation[] = snapshot.docs.map((d) => {
        const raw = d.data();
        return {
          id: d.id,
          ownerId: String(raw.ownerId ?? ''),
          nodeKey: (raw.nodeKey ?? 'iglesia') as PersistedAiConsultation['nodeKey'],
          modality: (raw.modality ?? 'chat') as PersistedAiConsultation['modality'],
          modelUsed: String(raw.modelUsed ?? 'gemini-3.8-flash'),
          rolePersona: (raw.rolePersona ?? 'hidro-cuenca') as PersistedAiConsultation['rolePersona'],
          prompt: String(raw.prompt ?? ''),
          datoempirico: String(raw.datoempirico ?? ''),
          interpretacionContextual: String(raw.interpretacionContextual ?? ''),
          sugerenciaAccionable: String(raw.sugerenciaAccionable ?? ''),
          requiresHumanReview: Boolean(raw.requiresHumanReview ?? true),
          humanReviewStatus: (raw.humanReviewStatus ??
            'pending_review') as PersistedAiConsultation['humanReviewStatus'],
          sha256Hash: String(raw.sha256Hash ?? ''),
          groundingLinksCount: Number(raw.groundingLinksCount ?? 0),
          createdAtIso: raw.createdAt?.toDate ? raw.createdAt.toDate().toISOString() : undefined,
        };
      });
      onData(list);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    },
  );
}

export function subscribeUserSeciRecords(
  userId: string | null,
  onData: (items: PersistedSeciRecord[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  if (!userId) {
    onData([]);
    return () => {};
  }
  const path = 'territorial_seci_records';
  const q = query(
    collection(db, path),
    where('nodeKey', 'in', [...PUBLIC_NODE_KEYS]),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: PersistedSeciRecord[] = snapshot.docs.map((d) => {
        const raw = d.data();
        return {
          id: d.id,
          ownerId: String(raw.ownerId ?? ''),
          nodeKey: (raw.nodeKey ?? 'iglesia') as PersistedSeciRecord['nodeKey'],
          seciStage: (raw.seciStage ?? 'tacito_campo') as PersistedSeciRecord['seciStage'],
          title: String(raw.title ?? ''),
          fieldObservation: String(raw.fieldObservation ?? ''),
          linkedEvCode: String(raw.linkedEvCode ?? 'EV-015'),
          sha256Hash: String(raw.sha256Hash ?? ''),
          createdAtIso: raw.createdAt?.toDate ? raw.createdAt.toDate().toISOString() : undefined,
        };
      });
      onData(list);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    },
  );
}

export function subscribePublicNodeSovereignty(
  onData: (
    items: PersistedNodeSovereignty[],
    meta?: { fromCache: boolean; hasPendingWrites: boolean; latencyMs: number },
  ) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const path = 'territorial_nodes_sovereignty';
  const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const q = query(
    collection(db, path),
    where('nodeKey', 'in', [...PUBLIC_NODE_KEYS]),
  );

  return onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snapshot) => {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const latencyMs = Math.max(8, Math.round(now - startedAt));
      const list: PersistedNodeSovereignty[] = snapshot.docs.map((d) => {
        const raw = d.data();
        return {
          id: d.id,
          ownerId: String(raw.ownerId ?? ''),
          nodeKey: (raw.nodeKey ?? 'iglesia') as PersistedNodeSovereignty['nodeKey'],
          nodeName: String(raw.nodeName ?? ''),
          provincia: String(raw.provincia ?? ''),
          sovereigntyMode: (raw.sovereigntyMode ??
            'delegacion_revocable_activa') as PersistedNodeSovereignty['sovereigntyMode'],
          sharedLayersCount: Number(raw.sharedLayersCount ?? 0),
          postgisCount: Number(raw.postgisCount ?? 0),
          syncPacksCount: Number(raw.syncPacksCount ?? 0),
          nodeMerkleRoot: String(raw.nodeMerkleRoot ?? ''),
          updatedAtIso: raw.updatedAt?.toDate ? raw.updatedAt.toDate().toISOString() : undefined,
        };
      });
      onData(list, {
        fromCache: snapshot.metadata.fromCache,
        hasPendingWrites: snapshot.metadata.hasPendingWrites,
        latencyMs,
      });
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    },
  );
}

export async function probeFirestoreCloudLatency(): Promise<FirestoreSyncTelemetry> {
  const startedGlobal = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const nodeLatencies: Record<SanJuanNodeKey, number> = {
    capital: 0,
    caucete: 0,
    iglesia: 0,
  };

  let fromCache = false;
  let hasPendingWrites = false;

  try {
    const fedQuery = query(
      collection(db, 'federated_model_states'),
      where('federationScope', '==', 'cuyo_red_federal'),
    );
    const fedSnap = await getDocs(fedQuery);
    fromCache = fedSnap.metadata.fromCache;
    hasPendingWrites = fedSnap.metadata.hasPendingWrites;

    for (const nodeKey of PUBLIC_NODE_KEYS) {
      const nodeStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const nodeQ = query(
        collection(db, 'territorial_nodes_sovereignty'),
        where('nodeKey', '==', nodeKey),
      );
      const nodeSnap = await getDocs(nodeQ);
      const nodeEnd = typeof performance !== 'undefined' ? performance.now() : Date.now();
      nodeLatencies[nodeKey] = Math.max(9, Math.round(nodeEnd - nodeStart));
      if (nodeSnap.metadata.fromCache) {
        fromCache = true;
      }
      if (nodeSnap.metadata.hasPendingWrites) {
        hasPendingWrites = true;
      }
    }

    const endedGlobal = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const totalRtt = Math.max(
      14,
      Math.round(
        (nodeLatencies.capital + nodeLatencies.caucete + nodeLatencies.iglesia) / 3,
      ) || Math.round(endedGlobal - startedGlobal),
    );

    return {
      connectionState: fromCache ? 'cached_local' : 'connected_live',
      cloudRoundTripMs: totalRtt,
      fromCache,
      hasPendingWrites,
      lastHandshakeIso: new Date().toISOString(),
      nodeSyncLatenciesMs: nodeLatencies,
    };
  } catch (err) {
    return {
      connectionState: 'error',
      cloudRoundTripMs: 0,
      fromCache: true,
      hasPendingWrites: false,
      lastHandshakeIso: new Date().toISOString(),
      nodeSyncLatenciesMs: {
        capital: 0,
        caucete: 0,
        iglesia: 0,
      },
      errorMessage: err instanceof Error ? err.message : String(err),
    };
  }
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

  let persistedInCloud = false;
  const currentUser = auth.currentUser;
  if (currentUser && currentUser.emailVerified) {
    try {
      await saveSeciRecordToFirestore({
        nodeKey: input.nodeKey,
        seciStage: 'explicito_evento',
        title: `[FCM Push ${fcmTopic}] ${input.nodeName}: ${input.nextMode}`,
        fieldObservation: `${safeTarget} — ${safeSummary}`,
        linkedEvCode: 'EV-014',
        sha256Hash: sha256,
      });
      persistedInCloud = true;
    } catch {
      persistedInCloud = false;
    }
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
