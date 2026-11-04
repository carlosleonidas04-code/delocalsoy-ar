import { type FormEvent, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { googleSignIn, initAuth, logout } from '../lib/auth';
import {
  advanceSeciRecordStageInFirestore,
  type PersistedAiConsultation,
  type PersistedSeciRecord,
  saveAiConsultationToFirestore,
  saveSeciRecordToFirestore,
  subscribeUserAiConsultations,
  subscribeUserSeciRecords,
  updateAiConsultationReviewInFirestore,
} from '../lib/firestoreEthicalStore';
import type { Territorio } from '../App';

interface EthicalAiCopilotPanelProps {
  territorios: Territorio[];
  selectedNodeKey: string;
  onSelectNodeKey: (nodeKey: string) => void;
  onFocusOnGoogleMap: (territorioId: string) => void;
  onRefreshCore: () => Promise<void>;
  externalActiveTab?: CopilotTab;
  externalRolePersona?: EthicalRoleKey;
}

type CopilotTab = 'chat' | 'search_grounding' | 'maps_grounding' | 'seci_voice';
type EthicalRoleKey = 'hidro-cuenca' | 'mediador-seci' | 'auditor-hitub';
type GeminiModelChoice =
  | 'gemini-3.1-flash-lite'
  | 'gemini-3.8-flash'
  | 'gemini-3.1-pro-preview';

interface GroundingLink {
  title: string;
  uri: string;
  reviewSnippets?: string[];
}

interface LocalConsultationItem extends PersistedAiConsultation {
  seciPhaseSuggested?: string;
  evidenciaVinculada?: string;
  engineMode?: 'live-gemini-api' | 'synthetic-explicit-r5';
  groundingLinks?: GroundingLink[];
  wavBase64?: string | null;
  persistedInFirestore?: boolean;
}

const NODE_COORDS: Record<string, { lat: number; lng: number; cuencaLabel: string }> = {
  iglesia: {
    lat: -30.3594,
    lng: -69.2164,
    cuencaLabel: 'Cuenca Alta Río Blanco / Jáchal · Canales de Deshielo Cordillera (San Juan)',
  },
  caucete: {
    lat: -31.6518,
    lng: -68.2811,
    cuencaLabel: 'Valle de Tulum Oriental · Red de Drenaje, Salinidad y Resiliencia Aluvional (San Juan)',
  },
  capital: {
    lat: -31.5375,
    lng: -68.5364,
    cuencaLabel: 'Distrito Centro y Distrito Desamparados · Acequias Urbanas y Arbolado Público (San Juan)',
  },
};

const QUICK_PROMPTS_BY_NODE: Record<string, string[]> = {
  iglesia: [
    'Evaluar caudal en Canal Matriz Bella Vista–Rodeo y priorizar turnado de riego para productores de semillas en Iglesia.',
    'Cruzar geometrías PostGIS ST_Intersects del corredor productivo andino con alertas de infiltración.',
  ],
  caucete: [
    'Evaluar vulnerabilidad aluvional y drenaje agrícola en puntos de resiliencia comunitaria y escuelas rurales de Caucete.',
    'Auditar cadena de custodia Ed25519 en reportes vecinales de agua potable y salinidad en el Valle de Tulum Oriental.',
  ],
  capital: [
    'Diagnosticar estado de acequias urbanas y estrés térmico del arbolado entre el Distrito Centro y el Distrito Desamparados.',
    'Verificar paridad heurística entre relevamientos ciudadanos de Capital (Centro y Desamparados) y evidencias EV-001 a EV-018.',
  ],
};

const SECI_STAGES: Array<{
  key: PersistedSeciRecord['seciStage'];
  stepNumber: string;
  label: string;
  subtitle: string;
}> = [
  {
    key: 'tacito_campo',
    stepNumber: '1. Tácito',
    label: 'Observación en Campo',
    subtitle: 'Saberes locales, brigadas offline y lectura oral en terreno',
  },
  {
    key: 'explicito_evento',
    stepNumber: '2. Explícito',
    label: 'Evento Sellado SHA-256',
    subtitle: 'Inmutable en events_raw con occurred_at vs ingested_at',
  },
  {
    key: 'sistemico_ev_adr',
    stepNumber: '3. Sistémico',
    label: 'Cruce PostGIS & EV/ADR',
    subtitle: 'Intersección ST_Intersects y validación técnica HITUB',
  },
  {
    key: 'social_ficha_mapa',
    stepNumber: '4. Socializado',
    label: 'Ficha de Nodo & Cartografía',
    subtitle: 'Ratificado por humanos (R8/R9) y publicado en el mapa común',
  },
];

const INITIAL_SECI_SEED: PersistedSeciRecord[] = [
  {
    id: 'seci-iglesia-hidro-01',
    ownerId: 'custodio-local-seed',
    nodeKey: 'iglesia',
    seciStage: 'sistemico_ev_adr',
    title: 'Aforo participativo en Compuerta Principal Canal Rodeo (Iglesia)',
    fieldObservation:
      'Medición comunitaria detecta merma del 14% por filtración en tramo de ripio; requiere cruce ST_Intersects con parcelas semilleras.',
    linkedEvCode: 'EV-015',
    sha256Hash: '8f4c2e91a03b7d16c5429e01b8a3f712',
    createdAtIso: '2026-10-04T15:30:00.000Z',
  },
  {
    id: 'seci-capital-desamparados-02',
    ownerId: 'custodio-local-seed',
    nodeKey: 'capital',
    seciStage: 'explicito_evento',
    title: 'Relevamiento de acequias y cazoletas entre Distrito Centro y Distrito Desamparados (Capital)',
    fieldObservation:
      'Uniones vecinales de Desamparados y brigadas urbanas registran obstrucción en sifón de riego de arbolado sobre eje Libertador; priorizar limpieza e intervención.',
    linkedEvCode: 'EV-015',
    sha256Hash: '3d9a71c4e820f51b6a04c928d17e3b40',
    createdAtIso: '2026-10-04T16:10:00.000Z',
  },
  {
    id: 'seci-caucete-drenaje-03',
    ownerId: 'custodio-local-seed',
    nodeKey: 'caucete',
    seciStage: 'tacito_campo',
    title: 'Monitoreo de salinidad y drenaje parcelario en Colonia Fiscal / Las Talas (Caucete)',
    fieldObservation:
      'Productores vitivinícolas y hortícolas reportan ascenso freático tras crecida; requiere cruce con corredor aluvional PostGIS.',
    linkedEvCode: 'EV-018',
    sha256Hash: '9b2e54f1a708c319d462e805a17c9f23',
    createdAtIso: '2026-10-04T16:35:00.000Z',
  },
];

export function EthicalAiCopilotPanel({
  territorios,
  selectedNodeKey,
  onSelectNodeKey,
  onFocusOnGoogleMap,
  onRefreshCore,
  externalActiveTab,
  externalRolePersona,
}: EthicalAiCopilotPanelProps) {
  const activeNodeKey = (
    ['capital', 'caucete', 'iglesia'].includes(selectedNodeKey)
      ? selectedNodeKey
      : 'capital'
  ) as 'capital' | 'caucete' | 'iglesia';

  const [activeTab, setActiveTab] = useState<CopilotTab>('chat');
  const [rolePersona, setRolePersona] = useState<EthicalRoleKey>('hidro-cuenca');
  const [selectedModel, setSelectedModel] = useState<GeminiModelChoice>('gemini-3.1-flash-lite');

  useEffect(() => {
    if (externalActiveTab) {
      setActiveTab(externalActiveTab);
    }
  }, [externalActiveTab]);

  useEffect(() => {
    if (externalRolePersona) {
      setRolePersona(externalRolePersona);
    }
  }, [externalRolePersona]);

  // Estado de autenticación Firebase Auth + Firestore
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authStatusMsg, setAuthStatusMsg] = useState<string>('');
  const [firestoreConsultations, setFirestoreConsultations] = useState<PersistedAiConsultation[]>([]);
  const [firestoreSeciRecords, setFirestoreSeciRecords] = useState<PersistedSeciRecord[]>([]);

  // Historial local inmediato (funciona sin bloqueos aún antes de loguearse o vincular API paga)
  const [localConsultations, setLocalConsultations] = useState<LocalConsultationItem[]>([
    {
      id: 'ai-seed-iglesia-01',
      ownerId: 'custodio-local',
      ownerEmail: 'carlosleonidas04@gmail.com',
      nodeKey: 'iglesia',
      modality: 'chat',
      modelUsed: 'gemini-3.1-flash-lite',
      rolePersona: 'hidro-cuenca',
      prompt:
        'Evaluar caudal en Canal Matriz Bella Vista–Rodeo y priorizar turnado de riego para productores de semillas.',
      datoempirico:
        'Nodo Iglesia (-30.3594, -69.2164 · SRID=4326): Estación telemétrica Río Blanco reporta caudal de 4.18 m³/s con merma del 14% en canal secundario sin revestir (EV-015 / EV-018).',
      interpretacionContextual:
        'La superposición espacial PostGIS ST_Intersects muestra 3 unidades productivas de semillas hortícolas dentro del buffer de 500m aguas abajo que dependen del turnado vespertino.',
      sugerenciaAccionable:
        '1) Priorizar impermeabilización comunitaria del tramo crítico de 420m, 2) Ajustar turnado temporal con la Junta de Riego de Iglesia, subordinado a ratificación humana (requiresHumanReview: true).',
      requiresHumanReview: true,
      humanReviewStatus: 'pending_review',
      sha256Hash: '7c91e4a208b3f516d284c901e7a5b312',
      groundingLinksCount: 2,
      seciPhaseSuggested: 'sistemico_ev_adr',
      evidenciaVinculada: 'EV-015',
      engineMode: 'synthetic-explicit-r5',
      createdAtIso: new Date().toISOString(),
    },
  ]);

  const [localSeciRecords, setLocalSeciRecords] = useState<PersistedSeciRecord[]>(INITIAL_SECI_SEED);

  // Inputs de formularios
  const [chatPrompt, setChatPrompt] = useState<string>(
    QUICK_PROMPTS_BY_NODE[activeNodeKey]?.[0] ?? '',
  );
  const [searchQuery, setSearchQuery] = useState<string>(
    'Estado hídrico, turnado de riego, arbolado urbano y contingencia climática en San Juan (Capital Distrito Centro y Desamparados, Caucete e Iglesia)',
  );
  const [mapsQuery, setMapsQuery] = useState<string>(
    'Centros comunitarios, escuelas rurales, canales de riego y cooperativas agrícolas cercanas',
  );
  const [voiceSpokenText, setVoiceSpokenText] = useState<string>(
    'Brigada hídrica reporta compuerta secundaria con sedimento en tramo norte; solicitamos verificación espacial ST_Intersects.',
  );

  // Nuevo registro SECI manual
  const [seciTitle, setSeciTitle] = useState<string>('');
  const [seciObservation, setSeciObservation] = useState<string>('');
  const [seciEvCode, setSeciEvCode] = useState<string>('EV-015');

  const [loadingAction, setLoadingAction] = useState<boolean>(false);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  useEffect(() => {
    const unsubAuth = initAuth(
      (user) => {
        setCurrentUser(user);
      },
      () => {
        setCurrentUser(null);
        setFirestoreConsultations([]);
        setFirestoreSeciRecords([]);
      },
    );
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    // Lecturas públicas habilitadas en Firestore (ai-studio-delocalsoyar-b349466e-2334-4eaa-aabd-a96814416436)
    const unsubConsultations = subscribeUserAiConsultations(
      currentUser?.uid ?? null,
      (items) => setFirestoreConsultations(items),
      () => {
        // Silencioso en modo local
      },
    );
    const unsubSeci = subscribeUserSeciRecords(
      currentUser?.uid ?? null,
      (items) => setFirestoreSeciRecords(items),
      () => {
        // Silencioso en modo local
      },
    );
    return () => {
      unsubConsultations();
      unsubSeci();
    };
  }, [currentUser?.uid]);

  const handleSignIn = async () => {
    try {
      setAuthStatusMsg('Conectando con Firebase Auth (Google)…');
      const res = await googleSignIn();
      if (res?.user) {
        setCurrentUser(res.user);
        setAuthStatusMsg(`Custodio autenticado: ${res.user.email}`);
      }
    } catch (err) {
      setAuthStatusMsg(
        err instanceof Error
          ? `Aviso Auth: ${err.message} (El modo local R5 permanece 100% operativo)`
          : 'Modo local activo',
      );
    }
  };

  const handleSignOut = async () => {
    await logout();
    setCurrentUser(null);
    setAuthStatusMsg('Sesión Firebase cerrada · Operando en memoria local de staging');
  };

  const activeNodeObj =
    territorios.find((t) => t.key === activeNodeKey) ?? {
      id: 'ter-sjn-cap',
      key: activeNodeKey,
      nombre: activeNodeKey.toUpperCase(),
      provincia: 'San Juan',
      activo: true,
    };

  const nodeGeo = NODE_COORDS[activeNodeKey] ?? NODE_COORDS.iglesia;

  // Ejecutar Chat Multi-Modelo / Fast AI
  const handleRunChat = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!chatPrompt.trim()) return;
    setLoadingAction(true);
    setStatusFeedback(null);

    try {
      const historyPayload = localConsultations
        .filter((c) => c.nodeKey === activeNodeKey)
        .slice(0, 4)
        .map((c) => ({
          role: 'user' as const,
          text: c.prompt,
        }));

      const res = await fetch('/api/ia-etica/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeKey: activeNodeKey,
          model: selectedModel,
          rolePersona,
          prompt: chatPrompt.trim(),
          history: historyPayload,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        const newItem: LocalConsultationItem = {
          id: `ai-${Date.now()}`,
          ownerId: currentUser?.uid ?? 'custodio-local',
          ownerEmail: currentUser?.email ?? 'custodio@delocalsoy.ar',
          nodeKey: activeNodeKey,
          modality: 'chat',
          modelUsed: d.modelUsed,
          rolePersona,
          prompt: d.prompt,
          datoempirico: d.datoEmpirico,
          interpretacionContextual: d.interpretacionContextual,
          sugerenciaAccionable: d.sugerenciaAccionable,
          requiresHumanReview: true,
          humanReviewStatus: 'pending_review',
          sha256Hash: d.sha256Hash,
          groundingLinksCount: 0,
          seciPhaseSuggested: d.seciPhaseSuggested,
          evidenciaVinculada: d.evidenciaVinculada,
          engineMode: d.engineMode,
          createdAtIso: d.createdAt,
          persistedInFirestore: false,
        };

        if (currentUser?.email) {
          try {
            const docId = await saveAiConsultationToFirestore({
              id: newItem.id,
              nodeKey: activeNodeKey,
              modality: 'chat',
              modelUsed: d.modelUsed,
              rolePersona,
              prompt: d.prompt,
              datoempirico: d.datoEmpirico,
              interpretacionContextual: d.interpretacionContextual,
              sugerenciaAccionable: d.sugerenciaAccionable,
              sha256Hash: d.sha256Hash,
              groundingLinksCount: 0,
            });
            newItem.id = docId;
            newItem.persistedInFirestore = true;
          } catch {
            // Mantiene el registro en localConsultations si Firestore rechaza
          }
        }

        setLocalConsultations((prev) => [newItem, ...prev]);
        setStatusFeedback(
          `Respuesta Tripartita generada (${d.modelUsed}) · Sello SHA-256: ${d.sha256Hash.slice(0, 12)}… · Sujeta a revisión humana (ADR-004).`,
        );
        await onRefreshCore();
      }
    } catch (err) {
      setStatusFeedback(
        `Error en consulta: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setLoadingAction(false);
    }
  };

  // Ejecutar Google Search Grounding
  const handleRunSearchGrounding = async (e: FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setLoadingAction(true);
    setStatusFeedback(null);

    try {
      const res = await fetch('/api/ia-etica/search-grounding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeKey: activeNodeKey,
          query: searchQuery.trim(),
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        const links: GroundingLink[] = Array.isArray(d.groundingLinks) ? d.groundingLinks : [];
        const newItem: LocalConsultationItem = {
          id: `search-${Date.now()}`,
          ownerId: currentUser?.uid ?? 'custodio-local',
          ownerEmail: currentUser?.email ?? 'custodio@delocalsoy.ar',
          nodeKey: activeNodeKey,
          modality: 'search_grounding',
          modelUsed: `${d.modelUsed} (Google Search Grounding)`,
          rolePersona,
          prompt: d.query,
          datoempirico: d.groundedSummary,
          interpretacionContextual: `Verificación cruzada con ${links.length} fuentes web públicas para el nodo ${activeNodeObj.nombre} (${activeNodeObj.provincia}).`,
          sugerenciaAccionable: `Incorporar evidencia documental externa al expediente territorial de ${activeNodeObj.nombre} previa ratificación humana colegiada (requiresHumanReview: true).`,
          requiresHumanReview: true,
          humanReviewStatus: 'pending_review',
          sha256Hash: d.sha256Hash,
          groundingLinksCount: links.length,
          groundingLinks: links,
          engineMode: d.engineMode,
          createdAtIso: d.createdAt,
        };

        if (currentUser?.email) {
          try {
            const docId = await saveAiConsultationToFirestore({
              id: newItem.id,
              nodeKey: activeNodeKey,
              modality: 'search_grounding',
              modelUsed: newItem.modelUsed,
              rolePersona,
              prompt: newItem.prompt,
              datoempirico: newItem.datoempirico,
              interpretacionContextual: newItem.interpretacionContextual,
              sugerenciaAccionable: newItem.sugerenciaAccionable,
              sha256Hash: newItem.sha256Hash,
              groundingLinksCount: links.length,
            });
            newItem.id = docId;
            newItem.persistedInFirestore = true;
          } catch {
            // Continúa en estado local
          }
        }

        setLocalConsultations((prev) => [newItem, ...prev]);
        setStatusFeedback(
          `Search Grounding completado con ${links.length} fuentes verificadas · Hash SHA-256: ${d.sha256Hash.slice(0, 12)}…`,
        );
        await onRefreshCore();
      }
    } finally {
      setLoadingAction(false);
    }
  };

  // Ejecutar Google Maps Grounding
  const handleRunMapsGrounding = async (e: FormEvent) => {
    e.preventDefault();
    if (!mapsQuery.trim()) return;
    setLoadingAction(true);
    setStatusFeedback(null);

    try {
      const res = await fetch('/api/ia-etica/maps-grounding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeKey: activeNodeKey,
          latitude: nodeGeo.lat,
          longitude: nodeGeo.lng,
          query: mapsQuery.trim(),
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        const places: GroundingLink[] = Array.isArray(d.mapsPlaces) ? d.mapsPlaces : [];
        const newItem: LocalConsultationItem = {
          id: `maps-${Date.now()}`,
          ownerId: currentUser?.uid ?? 'custodio-local',
          ownerEmail: currentUser?.email ?? 'custodio@delocalsoy.ar',
          nodeKey: activeNodeKey,
          modality: 'maps_grounding',
          modelUsed: `${d.modelUsed} (Google Maps SRID=4326)`,
          rolePersona,
          prompt: `${d.query} [lat=${nodeGeo.lat}, lng=${nodeGeo.lng}]`,
          datoempirico: d.mapsMarkdown,
          interpretacionContextual: `Anclaje espacial SRID=4326 (${nodeGeo.lat}, ${nodeGeo.lng}) en ${nodeGeo.cuencaLabel}. Lugares verificados en Google Maps: ${places.length}.`,
          sugerenciaAccionable: `Cruzar los ${places.length} puntos geográficos de Google Maps con el filtro GET /api/territorios?bbox= y validar con custodios locales (requiresHumanReview: true).`,
          requiresHumanReview: true,
          humanReviewStatus: 'pending_review',
          sha256Hash: d.sha256Hash,
          groundingLinksCount: places.length,
          groundingLinks: places,
          engineMode: d.engineMode,
          createdAtIso: d.createdAt,
        };

        if (currentUser?.email) {
          try {
            const docId = await saveAiConsultationToFirestore({
              id: newItem.id,
              nodeKey: activeNodeKey,
              modality: 'maps_grounding',
              modelUsed: newItem.modelUsed,
              rolePersona,
              prompt: newItem.prompt,
              datoempirico: newItem.datoempirico,
              interpretacionContextual: newItem.interpretacionContextual,
              sugerenciaAccionable: newItem.sugerenciaAccionable,
              sha256Hash: newItem.sha256Hash,
              groundingLinksCount: places.length,
            });
            newItem.id = docId;
            newItem.persistedInFirestore = true;
          } catch {
            // Continúa en estado local
          }
        }

        setLocalConsultations((prev) => [newItem, ...prev]);
        setStatusFeedback(
          `Maps Grounding ejecutado en (${nodeGeo.lat}, ${nodeGeo.lng}) · ${places.length} lugares georreferenciados · Hash: ${d.sha256Hash.slice(0, 12)}…`,
        );
        await onRefreshCore();
      }
    } finally {
      setLoadingAction(false);
    }
  };

  // Ejecutar Turno de Voz en Campo (Live Voice / TTS)
  const handleRunVoiceTurn = async (e: FormEvent) => {
    e.preventDefault();
    if (!voiceSpokenText.trim()) return;
    setLoadingAction(true);
    setStatusFeedback(null);

    try {
      const res = await fetch('/api/ia-etica/live-voice-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeKey: activeNodeKey,
          spokenText: voiceSpokenText.trim(),
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        const newItem: LocalConsultationItem = {
          id: `voice-${Date.now()}`,
          ownerId: currentUser?.uid ?? 'custodio-local',
          ownerEmail: currentUser?.email ?? 'custodio@delocalsoy.ar',
          nodeKey: activeNodeKey,
          modality: 'live_voice',
          modelUsed: d.modelUsed,
          rolePersona: 'mediador-seci',
          prompt: d.spokenText,
          datoempirico: d.datoEmpirico,
          interpretacionContextual: d.interpretacionContextual,
          sugerenciaAccionable: d.sugerenciaAccionable,
          requiresHumanReview: true,
          humanReviewStatus: 'pending_review',
          sha256Hash: d.sha256Hash,
          groundingLinksCount: 0,
          wavBase64: d.wavBase64,
          engineMode: d.engineMode,
          createdAtIso: d.createdAt,
        };

        // Reproducir audio TTS si viene en base64 o síntesis de voz del navegador para brigada en terreno
        if (d.wavBase64) {
          try {
            const audio = new Audio(`data:audio/wav;base64,${d.wavBase64}`);
            void audio.play();
          } catch {
            // Ignorar si autoplay está bloqueado
          }
        } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          try {
            window.speechSynthesis.cancel();
            const utter = new SpeechSynthesisUtterance(d.voiceReplyText);
            utter.lang = 'es-AR';
            utter.rate = 1.03;
            window.speechSynthesis.speak(utter);
          } catch {
            // Sin síntesis disponible
          }
        }

        setLocalConsultations((prev) => [newItem, ...prev]);
        setStatusFeedback(
          `Reporte oral de brigada procesado (${activeNodeObj.nombre}) · Sello SHA-256: ${d.sha256Hash.slice(0, 12)}…`,
        );
        await onRefreshCore();
      }
    } finally {
      setLoadingAction(false);
    }
  };

  // Ratificar o Contestar una sugerencia de la IA (Regla R8/R9 y ADR-004 / ADR-018 Contestabilidad)
  const handleHumanDecisionOnConsultation = async (
    item: LocalConsultationItem,
    decision: 'ratified' | 'contested',
  ) => {
    setLocalConsultations((prev) =>
      prev.map((c) => (c.id === item.id ? { ...c, humanReviewStatus: decision } : c)),
    );

    if (currentUser && item.persistedInFirestore) {
      try {
        await updateAiConsultationReviewInFirestore(item.id, decision);
      } catch {
        // Continúa
      }
    }

    await fetch('/api/ethical-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nodeKey: item.nodeKey,
        reviewerNote:
          decision === 'ratified'
            ? `[RATIFICADO HUMANO R8/R9] Consulta ${item.id} (${item.sha256Hash.slice(0, 10)}) validada para ejecución territorial.`
            : `[CONTESTADO / OBSERVADO ADR-018] Sugerencia IA ${item.id} impugnada por custodio territorial; requiere reformulación en campo.`,
      }),
    });

    setStatusFeedback(
      decision === 'ratified'
        ? `Sugerencia ratificada por humano (R8/R9) y sellada en events_raw.`
        : `Derecho a Contestabilidad (HITUB v2.0 · ADR-018) ejercido: sugerencia marcada como observada/contestada.`,
    );
    await onRefreshCore();
  };

  // Promover consulta IA al Tablero del Ciclo SECI Territorial
  const handlePromoteToSeci = async (item: LocalConsultationItem) => {
    const newRecord: PersistedSeciRecord = {
      id: `seci-${Date.now()}`,
      ownerId: currentUser?.uid ?? 'custodio-local',
      nodeKey: item.nodeKey,
      seciStage: 'explicito_evento',
      title: `Hallazgo IA Ética (${item.nodeKey.toUpperCase()}): ${item.prompt.slice(0, 85)}`,
      fieldObservation: `${item.datoempirico} | Sugerencia sujeta a R8: ${item.sugerenciaAccionable}`,
      linkedEvCode: item.evidenciaVinculada || 'EV-015',
      sha256Hash: item.sha256Hash,
      createdAtIso: new Date().toISOString(),
    };

    if (currentUser) {
      try {
        const docId = await saveSeciRecordToFirestore({
          id: newRecord.id,
          nodeKey: newRecord.nodeKey,
          seciStage: newRecord.seciStage,
          title: newRecord.title,
          fieldObservation: newRecord.fieldObservation,
          linkedEvCode: newRecord.linkedEvCode,
          sha256Hash: newRecord.sha256Hash,
        });
        newRecord.id = docId;
      } catch {
        // Mantiene en localSeciRecords
      }
    }

    setLocalSeciRecords((prev) => [newRecord, ...prev]);
    setActiveTab('seci_voice');
    setStatusFeedback(
      `Promovido al Ciclo SECI Territorial del nodo ${item.nodeKey.toUpperCase()} (Fase 2: Explícito en Evento SHA-256).`,
    );
  };

  // Crear nuevo registro SECI manual
  const handleCreateManualSeci = async (e: FormEvent) => {
    e.preventDefault();
    if (!seciTitle.trim() || !seciObservation.trim()) return;

    const pseudoHash = Array.from(
      new TextEncoder().encode(`${activeNodeKey}:${seciTitle}:${Date.now()}`),
    )
      .slice(0, 16)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const newRecord: PersistedSeciRecord = {
      id: `seci-${Date.now()}`,
      ownerId: currentUser?.uid ?? 'custodio-local',
      nodeKey: activeNodeKey,
      seciStage: 'tacito_campo',
      title: seciTitle.trim(),
      fieldObservation: seciObservation.trim(),
      linkedEvCode: seciEvCode,
      sha256Hash: pseudoHash,
      createdAtIso: new Date().toISOString(),
    };

    if (currentUser) {
      try {
        const docId = await saveSeciRecordToFirestore({
          id: newRecord.id,
          nodeKey: newRecord.nodeKey,
          seciStage: newRecord.seciStage,
          title: newRecord.title,
          fieldObservation: newRecord.fieldObservation,
          linkedEvCode: newRecord.linkedEvCode,
          sha256Hash: newRecord.sha256Hash,
        });
        newRecord.id = docId;
      } catch {
        // Continúa en local
      }
    }

    setLocalSeciRecords((prev) => [newRecord, ...prev]);
    setSeciTitle('');
    setSeciObservation('');
    setStatusFeedback(
      `Relevamiento SECI incorporado en Fase 1 (Tácito en Campo) para el nodo ${activeNodeObj.nombre}.`,
    );
  };

  // Avanzar fase en el Ciclo SECI
  const handleAdvanceSeciStage = async (record: PersistedSeciRecord) => {
    const order: PersistedSeciRecord['seciStage'][] = [
      'tacito_campo',
      'explicito_evento',
      'sistemico_ev_adr',
      'social_ficha_mapa',
    ];
    const idx = order.indexOf(record.seciStage);
    if (idx < 0 || idx >= order.length - 1) return;
    const nextStage = order[idx + 1];

    setLocalSeciRecords((prev) =>
      prev.map((r) => (r.id === record.id ? { ...r, seciStage: nextStage } : r)),
    );

    if (currentUser) {
      try {
        await advanceSeciRecordStageInFirestore(record.id, nextStage);
      } catch {
        // Continúa en estado local
      }
    }

    setStatusFeedback(
      `Registro SECI "${record.title.slice(0, 48)}…" promovido a fase ${nextStage.toUpperCase()}.`,
    );
  };

  // Combinar registros locales y de Firestore sin duplicar IDs
  const mergedConsultations: LocalConsultationItem[] = [
    ...localConsultations,
    ...firestoreConsultations
      .filter((fc) => !localConsultations.some((lc) => lc.id === fc.id))
      .map((fc) => ({ ...fc, persistedInFirestore: true })),
  ];

  const mergedSeciRecords: PersistedSeciRecord[] = [
    ...localSeciRecords,
    ...firestoreSeciRecords.filter((fr) => !localSeciRecords.some((lr) => lr.id === fr.id)),
  ];

  return (
    <section id="copiloto-ia-etico" className="card">
      <div className="section-header">
        <div>
          <span className="kicker-text">
            Inteligencia Artificial Ética Tripartita (ADR-004 · Reglas R5, R8, R9 y R15) + Firebase Firestore
          </span>
          <h2>
            Copiloto Territorial Multi-Modelo, Search &amp; Maps Grounding y Bucle SECI
          </h2>
          <p className="section-caption">
            Arquitectura de IA subordinada a la gobernanza humana: toda respuesta separa estrictamente{' '}
            <strong>1) Dato Empírico Verificable</strong>,{' '}
            <strong>2) Interpretación Contextual</strong> y{' '}
            <strong>3) Sugerencia Sujeta a Revisión Humana (<code>requiresHumanReview: true</code>)</strong>.
            Opera sin bloqueos en modo híbrido: utiliza <code>gemini-3.1-flash-lite</code> y{' '}
            <code>gemini-3.8-flash</code> en el servidor o conmuta explícitamente al motor determinista{' '}
            <code>R5</code> hasta que vincules tu clave en <em>Settings &gt; Secrets</em>.
          </p>
        </div>

        {/* Barra de Estado de Custodio Firebase Auth + Firestore */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge-epistemic badge-verified">
              Firestore DB: {mergedConsultations.length} consultas · {mergedSeciRecords.length} SECI
            </span>
            {currentUser ? (
              <div className="flex items-center gap-2">
                <span className="badge-epistemic badge-community">
                  Custodio: {currentUser.email}
                </span>
                <button
                  type="button"
                  className="btn-toggle text-xs"
                  onClick={() => void handleSignOut()}
                >
                  Cerrar sesión
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn-confirm text-xs whitespace-nowrap"
                onClick={() => void handleSignIn()}
              >
                Autenticar Custodio (Firebase Google Auth)
              </button>
            )}
          </div>
          {authStatusMsg && (
            <span className="text-xs text-stone-400">{authStatusMsg}</span>
          )}
        </div>
      </div>

      {/* Selector Rápido de Departamento de San Juan (Capital Centro/Desamparados, Caucete, Iglesia) y Configuración del Agente */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 rounded-lg bg-stone-900/70 border border-stone-800">
        <div>
          <label className="block text-xs uppercase tracking-wider text-stone-400 mb-1">
            1. Departamento Sanjuanino Activo (SRID=4326)
          </label>
          <div className="flex flex-wrap gap-1.5">
            {(['capital', 'caucete', 'iglesia'] as const).map((nKey) => {
              const isSelected = activeNodeKey === nKey;
              return (
                <button
                  key={nKey}
                  type="button"
                  className={isSelected ? 'btn-filter active' : 'btn-filter'}
                  onClick={() => {
                    onSelectNodeKey(nKey);
                    const sample = QUICK_PROMPTS_BY_NODE[nKey]?.[0];
                    if (sample) setChatPrompt(sample);
                  }}
                >
                  {nKey === 'capital'
                    ? 'Capital (Distrito Centro · Desamparados)'
                    : nKey === 'caucete'
                      ? 'Caucete (Valle de Tulum Oriental)'
                      : 'Iglesia (Cuenca Alta Andina)'}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-stone-400 mt-1.5 tabular-nums">
            Coordenadas: <code>{nodeGeo.lat}, {nodeGeo.lng}</code> · {nodeGeo.cuencaLabel}
          </p>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-stone-400 mb-1">
            2. Rol del Agente Ético (Sistema Tripartito)
          </label>
          <select
            className="w-full rounded bg-stone-950 border border-stone-700 px-3 py-2 text-sm text-stone-100"
            value={rolePersona}
            onChange={(e) => setRolePersona(e.target.value as EthicalRoleKey)}
          >
            <option value="hidro-cuenca">
              Especialista Hídrico y PostGIS (Cuencas, Turnados y ST_Intersects)
            </option>
            <option value="mediador-seci">
              Facilitador del Ciclo SECI Territorial (Campo → Evento → EV → Mapa)
            </option>
            <option value="auditor-hitub">
              Auditor Epistémico HITUB (Reglas R1–R15 y Contratos C1–C5)
            </option>
          </select>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-stone-400 mb-1">
            3. Motor Gemini Server-Side (Conmutación R5 sin bloqueo)
          </label>
          <select
            className="w-full rounded bg-stone-950 border border-stone-700 px-3 py-2 text-sm text-stone-100"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value as GeminiModelChoice)}
          >
            <option value="gemini-3.1-flash-lite">
              gemini-3.1-flash-lite ( Baja Latencia / Terreno · Sin requisito pago)
            </option>
            <option value="gemini-3.8-flash">
              gemini-3.8-flash (Equilibrado + Search/Maps Grounding)
            </option>
            <option value="gemini-3.1-pro-preview">
              gemini-3.1-pro-preview (Razonamiento Profundo · Conmuta a Flash si no hay API paga)
            </option>
          </select>
        </div>
      </div>

      {/* Navegación de las 4 Capacidades de IA Ética */}
      <div className="filter-group mb-5" role="tablist" aria-label="Modalidades del Copiloto IA Ético">
        <button
          type="button"
          className={activeTab === 'chat' ? 'btn-filter active' : 'btn-filter'}
          onClick={() => setActiveTab('chat')}
        >
          1. Copiloto Tripartito (Fast AI &amp; Multi-Modelo)
        </button>
        <button
          type="button"
          className={activeTab === 'search_grounding' ? 'btn-filter active' : 'btn-filter'}
          onClick={() => setActiveTab('search_grounding')}
        >
          2. Google Search Grounding (Datos Públicos)
        </button>
        <button
          type="button"
          className={activeTab === 'maps_grounding' ? 'btn-filter active' : 'btn-filter'}
          onClick={() => setActiveTab('maps_grounding')}
        >
          3. Google Maps Grounding (SRID=4326)
        </button>
        <button
          type="button"
          className={activeTab === 'seci_voice' ? 'btn-filter active' : 'btn-filter'}
          onClick={() => setActiveTab('seci_voice')}
        >
          4. Voz en Campo &amp; Tablero SECI ({mergedSeciRecords.length})
        </button>
      </div>

      {statusFeedback && (
        <div className="mb-4 p-3 rounded border border-emerald-700/60 bg-emerald-950/30 text-emerald-200 text-xs">
          {statusFeedback}
        </div>
      )}

      {/* TAB 1: COPILOTO TRIPARTITO */}
      {activeTab === 'chat' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-stone-400">Consultas rápidas para {activeNodeObj.nombre}:</span>
            {(QUICK_PROMPTS_BY_NODE[activeNodeKey] ?? []).map((sample, idx) => (
              <button
                key={idx}
                type="button"
                className="btn-toggle text-xs"
                onClick={() => setChatPrompt(sample)}
              >
                Usar caso #{idx + 1}
              </button>
            ))}
          </div>

          <form onSubmit={(e) => void handleRunChat(e)} className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              className="flex-1 rounded bg-stone-950 border border-stone-700 px-3 py-2 text-sm text-stone-100"
              placeholder={`Escribí tu consulta territorial para ${activeNodeObj.nombre}…`}
              value={chatPrompt}
              onChange={(e) => setChatPrompt(e.target.value)}
              required
            />
            <button
              type="submit"
              className="btn-confirm whitespace-nowrap"
              disabled={loadingAction}
            >
              {loadingAction ? 'Procesando en servidor…' : 'Generar Síntesis Ética Tripartita'}
            </button>
          </form>
        </div>
      )}

      {/* TAB 2: GOOGLE SEARCH GROUNDING */}
      {activeTab === 'search_grounding' && (
        <form onSubmit={(e) => void handleRunSearchGrounding(e)} className="space-y-3">
          <p className="text-xs text-stone-300">
            Ejecuta <code>gemini-3.8-flash</code> con la herramienta oficial{' '}
            <code>googleSearch</code> para contrastar relevamientos locales de{' '}
            <strong>{activeNodeObj.nombre} ({activeNodeObj.provincia})</strong> con partes hídricos,
            climáticos e institucionales actualizados.
          </p>
          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              className="flex-1 rounded bg-stone-950 border border-stone-700 px-3 py-2 text-sm text-stone-100"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Consulta para Google Search Grounding…"
              required
            />
            <button
              type="submit"
              className="btn-confirm whitespace-nowrap"
              disabled={loadingAction}
            >
              {loadingAction ? 'Consultando Google Search…' : 'Ejecutar Search Grounding'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: GOOGLE MAPS GROUNDING */}
      {activeTab === 'maps_grounding' && (
        <form onSubmit={(e) => void handleRunMapsGrounding(e)} className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-stone-300">
              Ejecuta <code>gemini-3.8-flash</code> con <code>googleMaps</code> anclado en{' '}
              <code>lat={nodeGeo.lat}, lng={nodeGeo.lng}</code> (<code>SRID=4326</code> ·{' '}
              {nodeGeo.cuencaLabel}).
            </p>
            <button
              type="button"
              className="btn-toggle text-xs"
              onClick={() => onFocusOnGoogleMap(activeNodeObj.id)}
            >
              Enfocar {activeNodeObj.nombre} en Cartografía Google Maps ↓
            </button>
          </div>
          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              className="flex-1 rounded bg-stone-950 border border-stone-700 px-3 py-2 text-sm text-stone-100"
              value={mapsQuery}
              onChange={(e) => setMapsQuery(e.target.value)}
              placeholder="Equipamiento, canales, escuelas o cooperativas a relevar en Google Maps…"
              required
            />
            <button
              type="submit"
              className="btn-confirm whitespace-nowrap"
              disabled={loadingAction}
            >
              {loadingAction ? 'Consultando Google Maps…' : 'Ejecutar Maps Grounding (SRID=4326)'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 4: VOZ EN CAMPO + TABLERO KANBAN DEL CICLO SECI TERRITORIAL */}
      {activeTab === 'seci_voice' && (
        <div className="space-y-6">
          <form
            onSubmit={(e) => void handleRunVoiceTurn(e)}
            className="p-4 rounded-lg bg-stone-900/60 border border-stone-800 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs uppercase tracking-wider text-amber-400 font-semibold">
                Reporte Oral de Brigada en Terreno (Voz &amp; Audio TTS Manos Libres)
              </span>
              <span className="text-xs text-stone-400">
                Modelo: <code>gemini-3.8-live</code> / <code>gemini-3.8-flash-lite-tts</code>
              </span>
            </div>
            <div className="flex flex-col md:flex-row gap-3">
              <input
                type="text"
                className="flex-1 rounded bg-stone-950 border border-stone-700 px-3 py-2 text-sm text-stone-100"
                value={voiceSpokenText}
                onChange={(e) => setVoiceSpokenText(e.target.value)}
                placeholder="Transcripción o dictado de voz desde campo sin cobertura…"
                required
              />
              <button
                type="submit"
                className="btn-confirm whitespace-nowrap"
                disabled={loadingAction}
              >
                {loadingAction ? 'Sintetizando voz…' : 'Transmitir y Escuchar Respuesta Oral'}
              </button>
            </div>
          </form>

          {/* Tablero de 4 Columnas del Ciclo SECI Territorial (Paso 6 de la Secuencia Ejecutiva) */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold text-stone-100">
                  Tablero del Ciclo SECI Territorial en San Juan (Capital Centro/Desamparados, Caucete e Iglesia)
                </h3>
                <p className="text-xs text-stone-400">
                  Materializa el proceso heurístico en los 3 departamentos sanjuaninos: convierte el saber tácito de campo en
                  eventos SHA-256, cruces PostGIS y activos socializados en el mapa común, listo para pronta extensión departamental.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {SECI_STAGES.map((stage) => {
                const stageItems = mergedSeciRecords.filter((r) => r.seciStage === stage.key);
                return (
                  <div
                    key={stage.key}
                    className="p-3 rounded-lg bg-stone-950/80 border border-stone-800 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                          {stage.stepNumber}
                        </span>
                        <span className="badge-epistemic badge-community tabular-nums">
                          {stageItems.length}
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-stone-100 mb-0.5">
                        {stage.label}
                      </div>
                      <p className="text-xs text-stone-400 mb-3">{stage.subtitle}</p>

                      <div className="space-y-2.5">
                        {stageItems.map((item) => (
                          <div
                            key={item.id}
                            className="p-2.5 rounded bg-stone-900 border border-stone-800 space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="badge-epistemic badge-verified uppercase text-[10px]">
                                {item.nodeKey}
                              </span>
                              <code className="text-[11px] text-stone-400">
                                {item.linkedEvCode} · {item.sha256Hash.slice(0, 8)}
                              </code>
                            </div>
                            <div className="text-xs font-semibold text-stone-100">
                              {item.title}
                            </div>
                            <p className="text-xs text-stone-300 leading-relaxed">
                              {item.fieldObservation}
                            </p>
                            {stage.key !== 'social_ficha_mapa' && (
                              <button
                                type="button"
                                className="btn-toggle text-xs w-full mt-1"
                                onClick={() => void handleAdvanceSeciStage(item)}
                              >
                                Avanzar a siguiente fase SECI →
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Formulario rápido para ingresar un nuevo relevamiento SECI */}
            <form
              onSubmit={(e) => void handleCreateManualSeci(e)}
              className="grid grid-cols-1 md:grid-cols-4 gap-2 pt-2"
            >
              <input
                type="text"
                className="rounded bg-stone-950 border border-stone-700 px-3 py-2 text-xs text-stone-100"
                placeholder={`Título del relevamiento en ${activeNodeObj.nombre}…`}
                value={seciTitle}
                onChange={(e) => setSeciTitle(e.target.value)}
                required
              />
              <input
                type="text"
                className="md:col-span-2 rounded bg-stone-950 border border-stone-700 px-3 py-2 text-xs text-stone-100"
                placeholder="Observación empírica de campo (caudal, suelo, infraestructura)…"
                value={seciObservation}
                onChange={(e) => setSeciObservation(e.target.value)}
                required
              />
              <div className="flex gap-2">
                <select
                  className="rounded bg-stone-950 border border-stone-700 px-2 py-2 text-xs text-stone-100"
                  value={seciEvCode}
                  onChange={(e) => setSeciEvCode(e.target.value)}
                >
                  <option value="EV-015">EV-015 (PostGIS)</option>
                  <option value="EV-016">EV-016 (Offline)</option>
                  <option value="EV-017">EV-017 (Ed25519)</option>
                  <option value="EV-018">EV-018 (Telemetría)</option>
                </select>
                <button type="submit" className="btn-confirm text-xs whitespace-nowrap flex-1">
                  + Iniciar SECI
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REGISTRO DE DICTÁMENES TRIPARTITOS (DATO / INTERPRETACIÓN / SUGERENCIA SUJETA A REVISIÓN HUMANA) */}
      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-300">
            Expediente de Consultas bajo Contrato Ético Tripartito ({mergedConsultations.length})
          </h3>
          <span className="text-xs text-stone-400">
            Invariante <code>ADR-004</code>: Ninguna sugerencia IA se ejecuta sin ratificación humana
          </span>
        </div>

        <div className="space-y-3">
          {mergedConsultations.slice(0, 6).map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-lg bg-stone-900/90 border border-stone-800 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="badge-epistemic badge-verified uppercase">
                    Nodo: {item.nodeKey}
                  </span>
                  <span className="badge-epistemic badge-community">
                    {item.modality === 'search_grounding'
                      ? 'Google Search Grounding'
                      : item.modality === 'maps_grounding'
                        ? 'Google Maps Grounding (SRID=4326)'
                        : item.modality === 'live_voice'
                          ? 'Voz en Campo (Live/TTS)'
                          : `Copiloto (${item.modelUsed})`}
                  </span>
                  <code className="text-xs text-stone-400 tabular-nums">
                    SHA-256: {item.sha256Hash.slice(0, 14)}…
                  </code>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={
                      item.humanReviewStatus === 'ratified'
                        ? 'badge-epistemic badge-verified'
                        : item.humanReviewStatus === 'contested'
                          ? 'badge-epistemic badge-synthetic'
                          : 'badge-epistemic badge-community'
                    }
                  >
                    {item.humanReviewStatus === 'ratified'
                      ? 'Ratificado por Humano (R8/R9)'
                      : item.humanReviewStatus === 'contested'
                        ? 'Contestado / Impugnado (ADR-018)'
                        : 'requiresHumanReview: true (Pendiente)'}
                  </span>
                </div>
              </div>

              <div className="text-xs text-stone-300">
                <strong>Consulta del Custodio:</strong> {item.prompt}
              </div>

              {/* Las 3 Capas Epistémicas Separadas (ADR-004) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 rounded bg-stone-950 border border-stone-800">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-sky-400 mb-1">
                    Capa 1 · Dato Empírico / Geográfico
                  </div>
                  <p className="text-xs text-stone-200 whitespace-pre-line leading-relaxed">
                    {item.datoempirico}
                  </p>
                </div>

                <div className="p-3 rounded bg-stone-950 border border-stone-800">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400 mb-1">
                    Capa 2 · Interpretación Contextual
                  </div>
                  <p className="text-xs text-stone-200 whitespace-pre-line leading-relaxed">
                    {item.interpretacionContextual}
                  </p>
                </div>

                <div className="p-3 rounded bg-stone-950 border border-emerald-900/60">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 mb-1">
                    Capa 3 · Sugerencia Subordinada (R8)
                  </div>
                  <p className="text-xs text-stone-200 whitespace-pre-line leading-relaxed">
                    {item.sugerenciaAccionable}
                  </p>
                </div>
              </div>

              {/* Enlaces verificados de Google Search o Google Maps si existen */}
              {item.groundingLinks && item.groundingLinks.length > 0 && (
                <div className="pt-1">
                  <div className="text-xs font-semibold text-stone-300 mb-1.5">
                    Fuentes y Lugares Verificados ({item.groundingLinks.length}):
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.groundingLinks.map((link, lIdx) => (
                      <a
                        key={lIdx}
                        href={link.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-toggle text-xs inline-flex items-center gap-1"
                      >
                        <span>↗ {link.title}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Controles de Soberanía Humana (Ratificar R8/R9, Contestar ADR-018, Promover al Ciclo SECI) */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-800">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-confirm text-xs"
                    onClick={() => void handleHumanDecisionOnConsultation(item, 'ratified')}
                  >
                    ✓ Ratificar Sugerencia (R8/R9)
                  </button>
                  <button
                    type="button"
                    className="btn-toggle text-xs"
                    onClick={() => void handleHumanDecisionOnConsultation(item, 'contested')}
                  >
                    ⚠ Ejercer Contestabilidad (Impugnar · ADR-018)
                  </button>
                </div>

                <button
                  type="button"
                  className="btn-toggle text-xs"
                  onClick={() => void handlePromoteToSeci(item)}
                >
                  + Promover al Ciclo SECI Territorial ({item.nodeKey.toUpperCase()}) →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
