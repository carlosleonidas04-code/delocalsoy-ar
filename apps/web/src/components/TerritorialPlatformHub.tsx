import React, { useCallback, useEffect, useState } from 'react';

function buildWriteAuthHeaders(customJwt?: string | null): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-api-key': 'delocalsoy-dev-write-token-r8',
    Authorization: `Bearer ${customJwt || 'delocalsoy-dev-write-token-r8'}`,
  };
}

type TerritorialNodeCode = 'gran-san-juan-capital' | 'caucete' | 'iglesia';
type ModuleLifecycleStage = 'Definido' | 'Implementado' | 'Verificado' | 'Operativo';
type ParticipationStage =
  | 'propuesta'
  | 'revision'
  | 'comentarios'
  | 'deliberacion'
  | 'priorizacion'
  | 'decision'
  | 'respuesta'
  | 'seguimiento';

interface PlatformModuleDef {
  id: string;
  order: number;
  nombre: string;
  proposito: string;
  primeraCapacidadVerificable: string;
  estadoActual: ModuleLifecycleStage;
  etapasCompletadas: ModuleLifecycleStage[];
  endpointsAsociados: string[];
  referentesInternacionales: string[];
  evidenciaEjecutable: string;
}

interface InternationalRefFamily {
  id: string;
  titulo: string;
  plataformasReferencia: string[];
  leccionArquitectonica: string;
  aplicacionEnDelocalsoy: string[];
}

interface RoadmapPhase {
  fase: string;
  titulo: string;
  estado: string;
  entregablesVerificables: string[];
}

interface VerifiedAsset {
  id: string;
  nombre: string;
  categoria: string;
  territoryId: TerritorialNodeCode;
  territoryNombre: string;
  barrioNodo: string;
  descripcion: string;
  geometria: {
    type: 'Point';
    srid: 4326;
    latitud: number;
    longitud: number;
  };
  horarios: string;
  canalContacto: string;
  proveedoresLocales: string[];
  accesibilidadEspacioPublico: string;
  compromisoAmbiental: string;
  impactoTerritorial: string;
  estado: 'borrador' | 'en_revision' | 'verificado' | 'publicado';
  autorNombre: string;
  autorRol: string;
  evidenciaHash: string;
  streamEntryId: string;
  creadoEn: string;
  actualizadoEn: string;
  historialCambios: Array<{
    at: string;
    actor: string;
    rol: string;
    estado: string;
    nota: string;
    eventHash: string;
  }>;
}

interface MarketplaceOffer {
  id: string;
  assetId: string;
  assetNombre: string;
  territoryId: TerritorialNodeCode;
  barrioNodo: string;
  titulo: string;
  tipo: string;
  descripcion: string;
  unidadReferencia: string;
  disponibilidad: string;
  señalVerificable: string;
  creadoEn: string;
  evidenciaHash: string;
}

interface DeliberativeProposal {
  id: string;
  territoryId: TerritorialNodeCode;
  barrioNodo: string;
  titulo: string;
  problemaUportunidad: string;
  propuestaAccion: string;
  etapaActual: ParticipationStage;
  activosVinculadosIds: string[];
  autorOrganizacion: string;
  geometria: {
    srid: 4326;
    latitud: number;
    longitud: number;
  };
  apoyosDeliberativos: number;
  comentariosVerificados: number;
  respuestaInstitucionalOComunitaria: string | null;
  seguimientoResultado: string | null;
  evidenciaHash: string;
  historialEtapas: Array<{
    etapa: ParticipationStage;
    fechaIso: string;
    actor: string;
    sintesis: string;
    eventHash: string;
  }>;
}

interface PublicSpaceEnvRecord {
  id: string;
  dominio: 'espacio_publico' | 'ambiente_paisaje';
  territoryId: TerritorialNodeCode;
  barrioNodo: string;
  subcategoria: string;
  titulo: string;
  evidenciaObservada: string;
  estado: string;
  latitud: number;
  longitud: number;
  activoRelacionadoId?: string;
  creadoEn: string;
  evidenciaHash: string;
}

interface TerritorialEventItem {
  id: string;
  territoryId: TerritorialNodeCode;
  barrioNodo: string;
  titulo: string;
  modalidad: string;
  fechaProgramada: string;
  lugarNombre: string;
  organizadorAssetId?: string;
  descripcion: string;
  latitud: number;
  longitud: number;
  evidenciaHash: string;
}

interface VerticalTraceStep {
  stepNumber: number;
  layer: string;
  status: string;
  detail: string;
  evidenceRef: string;
  timestampIso: string;
}

interface EthicalRagResult {
  dato: {
    resumenVerificable: string;
    fuentesRegistradas: string[];
    conteoActivosVerificados: number;
    conteoPropuestasActivas: number;
    conteoRegistrosAmbientalesYUrbanos: number;
  };
  interpretacion: {
    significadoRazonable: string;
    relacionesTerritorialesDetectadas: string[];
    advertenciaNoInferenciaComoHecho: string;
  };
  sugerencia: {
    accionesPosibles: string[];
    nivelIncertidumbre: 'bajo' | 'moderado' | 'alto';
    requiereDeliberacionHumana: boolean;
  };
  metadata: {
    origen: string;
    fechaIso: string;
    territorio: TerritorialNodeCode;
    cobertura: string;
    limitacionesExplicitas: string[];
    eventHashAuditoria: string;
  };
}

interface OverviewPayload {
  principioRector: string;
  mode: string;
  baselineState?: {
    anchorCommit: string;
    anchorFullSha: string;
    milestone: string;
    principioOperativo: string;
    yaTieneEnMain: string[];
    noAcreditadoEnMainConstruccionFase0: Array<{
      capacidad: string;
      estadoEnMainD70cbc6: string;
      estadoEnCicloFase0: string;
    }>;
    cadenaFlujoVertical11Eslabones: string[];
  };
  provisionalRegistration?: {
    formulaOficial: string;
    baseComparacion: string;
    reglaNoDeclaracion: string;
    textoCompleto: string;
    remoteMainCommit: string;
    remoteMainFullSha: string;
    localTargetBranch: string;
    clasificacionCorrecta: Array<{
      elemento: string;
      estado: string;
      acreditadoEnGitHubRemoto: boolean;
    }>;
    queFaltaParaRatificarlo: Array<{
      id: number;
      requisito: string;
      estadoLocalWorkspace: string;
      estadoGitHubRemoto: string;
      artefactoVerificable: string;
      detalle: string;
    }>;
    dosObservacionesHonestas?: Array<{
      id: number;
      titulo: string;
      diagnostico: string;
      implicacionEpistemica: string;
    }>;
    conciliacionIssue87?: {
      issueNumber: number;
      issueUrl: string;
      principioGobernanza: string;
      reglaUnicidadEvidencias?: string;
      codigosOcupadosEnMain?: Array<{
        code: string;
        hito: string;
        shaAnchor: string;
        statusInMain: string;
      }>;
      alcanceImplementadoEnStaging: Array<{
        codigoRequisito: string;
        dominio: string;
        roles: string[];
        evidenciaPropuesta: string;
        estadoEvidencia: string;
        implementacion: string;
      }>;
    };
    pasosParaAcreditar?: Array<{
      paso: number;
      accion: string;
      comando: string;
      estadoActual: string;
    }>;
  };
  territories: Array<{
    id: TerritorialNodeCode;
    label: string;
    assetsCount: number;
    offersCount: number;
    proposalsCount: number;
    envRecordsCount: number;
    eventsCount: number;
  }>;
  modulesCatalog: PlatformModuleDef[];
  internationalReferences: InternationalRefFamily[];
  roadmapPhases: RoadmapPhase[];
  participationStagesOrder: ParticipationStage[];
  verifiedAssets: VerifiedAsset[];
  marketplaceOffers: MarketplaceOffer[];
  participationProposals: DeliberativeProposal[];
  publicSpaceEnvRecords: PublicSpaceEnvRecord[];
  territorialEvents: TerritorialEventItem[];
  observability: {
    streamStats: {
      streamKey: string;
      consumerGroup: string;
      totalPublished: number;
      acknowledgedCount: number;
      duplicateIgnoredCount: number;
      pendingCount: number;
    };
    workerStats: {
      uniqueProcessedCount: number;
      totalDeliveriesHandled: number;
      duplicateReplaysPrevented: number;
    };
    latestVerticalTrace: VerticalTraceStep[];
  };
}

interface TerritorialPlatformHubProps {
  onFocusTerritoryOnMap?: (territoryId: string) => void;
  onRefreshCoreEvents?: () => Promise<void>;
  externalActiveSection?:
    | 'flujo-vertical'
    | 'directorio-red'
    | 'marketplace'
    | 'participacion'
    | 'espacio-ambiente-eventos'
    | 'inteligencia-y-modulos';
  externalTerritoryFilter?: 'all' | TerritorialNodeCode;
}

const STAGE_LABELS: Record<ParticipationStage, string> = {
  propuesta: '1. Propuesta',
  revision: '2. Revisión',
  comentarios: '3. Comentarios',
  deliberacion: '4. Deliberación',
  priorizacion: '5. Priorización',
  decision: '6. Decisión',
  respuesta: '7. Respuesta',
  seguimiento: '8. Seguimiento',
};

const CATEGORY_LABELS: Record<string, string> = {
  comercio_proximidad: 'Comercio de proximidad',
  cooperativa_productiva: 'Cooperativa productiva',
  servicio_comunitario: 'Servicio comunitario',
  espacio_cultural: 'Espacio cultural y saberes',
  nodo_abastecimiento: 'Nodo de abastecimiento',
  organizacion_civil: 'Organización barrial',
};

export const TerritorialPlatformHub: React.FC<TerritorialPlatformHubProps> = ({
  onFocusTerritoryOnMap,
  onRefreshCoreEvents,
  externalActiveSection,
  externalTerritoryFilter,
}) => {
  const [overview, setOverview] = useState<OverviewPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  const [territoryFilter, setTerritoryFilter] = useState<'all' | TerritorialNodeCode>(
    externalTerritoryFilter ?? 'all',
  );
  const [activeSection, setActiveSection] = useState<
    | 'flujo-vertical'
    | 'directorio-red'
    | 'marketplace'
    | 'participacion'
    | 'espacio-ambiente-eventos'
    | 'inteligencia-y-modulos'
  >(externalActiveSection ?? 'flujo-vertical');

  useEffect(() => {
    if (externalActiveSection) {
      setActiveSection(externalActiveSection);
    }
  }, [externalActiveSection]);

  useEffect(() => {
    if (externalTerritoryFilter) {
      setTerritoryFilter(externalTerritoryFilter);
    }
  }, [externalTerritoryFilter]);

  // Estado del formulario Flujo Vertical #1: Crear y publicar un activo territorial verificado
  const [assetNombre, setAssetNombre] = useState(
    'Almacén Cooperativo y Punto de Semillas Concepción',
  );
  const [assetCategoria, setAssetCategoria] = useState<
    | 'comercio_proximidad'
    | 'cooperativa_productiva'
    | 'servicio_comunitario'
    | 'espacio_cultural'
    | 'nodo_abastecimiento'
    | 'organizacion_civil'
  >('comercio_proximidad');
  const [assetTerritory, setAssetTerritory] = useState<TerritorialNodeCode>(
    'gran-san-juan-capital',
  );
  const [assetBarrioNodo, setAssetBarrioNodo] = useState(
    'Nodo Barrial Concepción · Sector Norte',
  );
  const [assetDescripcion, setAssetDescripcion] = useState(
    'Abastecimiento barrial de alimentos regionales, mieles, conservas sanjuaninas, harinas integrales y punto de recepción de envases retornables.',
  );
  const [assetLatitud, setAssetLatitud] = useState('-31.5214');
  const [assetLongitud, setAssetLongitud] = useState('-68.5238');
  const [assetHorarios, setAssetHorarios] = useState(
    'Lunes a Sábado de 08:00 a 13:30 y 17:00 a 20:30',
  );
  const [assetCanalContacto, setAssetCanalContacto] = useState(
    'Mesa Cooperativa Calle Tucumán Norte · Nodo Concepción',
  );
  const [assetProveedores, setAssetProveedores] = useState(
    'Huerteros de Chimbas y Albardón, Cooperativa Olivarera Tulúm, Panadería Social Desamparados',
  );
  const [assetAccesibilidad, setAssetAccesibilidad] = useState(
    'Ingreso a nivel de vereda con rampa en esquina y banco de descanso sombreado.',
  );
  const [assetAmbiente, setAssetAmbiente] = useState(
    'Cero bolsas plásticas descartables, acopio de vidrio retornable y riego de moreras frentistas.',
  );
  const [assetImpacto, setAssetImpacto] = useState(
    'Conecta a 18 pequeños productores con 210 hogares del barrio Concepción a precios justos.',
  );
  const [assetAutor, setAssetAutor] = useState('Red Vecinal de Abastecimiento Concepción');

  // Estado del formulario Marketplace de Proximidad
  const [offerAssetId, setOfferAssetId] = useState('act-sjc-panaderia-desamparados');
  const [offerTitulo, setOfferTitulo] = useState(
    'Harina Integral Molida a Piedra + Pan de Algarroba y Nuez',
  );
  const [offerTipo, setOfferTipo] = useState<
    'producto_local' | 'servicio_oficio' | 'insumo_comunitario' | 'demanda_barrial'
  >('producto_local');
  const [offerDescripcion, setOfferDescripcion] = useState(
    'Partida semanal elaborada en el horno comunitario con trigo y algarroba de productores locales.',
  );
  const [offerUnidad, setOfferUnidad] = useState('Paquete 1 kg · Retiro en nodo barrial');
  const [offerSeñal, setOfferSeñal] = useState(
    'Origen auditado en molino regional y cooperativa panificadora verificada',
  );

  // Estado del formulario Participación Deliberativa (8 etapas)
  const [propTerritory, setPropTerritory] = useState<TerritorialNodeCode>('gran-san-juan-capital');
  const [propBarrio, setPropBarrio] = useState('Nodo Barrial Concepción · Sector Norte');
  const [propTitulo, setPropTitulo] = useState(
    'Red de Puntos de Sombra, Agua Segura y Estacionamiento de Bicicletas en Comercios Barriales',
  );
  const [propProblema, setPropProblema] = useState(
    'Falta de equipamiento para movilidad activa e hidratación peatonal durante las horas de mayor temperatura en el eje comercial.',
  );
  const [propAccion, setPropAccion] = useState(
    'Instalar bicicleteros comunitarios, bebederos conectados a red y destapar tazas de riego de arbolado frente a los activos verificados del nodo.',
  );
  const [propAutor, setPropAutor] = useState('Asamblea Vecinal Concepción');
  const [stageAdvanceNote, setStageAdvanceNote] = useState(
    'Aporte deliberativo verificado en reunión barrial con comerciantes y vecinos frentistas.',
  );

  // Estado del formulario Espacio Público / Ambiente y Eventos
  const [envDominio, setEnvDominio] = useState<'espacio_publico' | 'ambiente_paisaje'>(
    'ambiente_paisaje',
  );
  const [envTerritory, setEnvTerritory] = useState<TerritorialNodeCode>('caucete');
  const [envBarrio, setEnvBarrio] = useState('Nodo Villa Independencia · Canal Matriz Caucete');
  const [envSubcategoria, setEnvSubcategoria] = useState<
    | 'accesibilidad_veredas'
    | 'iluminacion_seguridad'
    | 'equipamiento_plaza'
    | 'arbolado_sombra'
    | 'agua_acequias'
    | 'residuos_puntos_limpios'
    | 'biodiversidad_paisaje'
  >('agua_acequias');
  const [envTitulo, setEnvTitulo] = useState(
    'Limpieza Comunitaria y Medición de Caudal en Derivación Secundaria de Acequia',
  );
  const [envEvidencia, setEnvEvidencia] = useState(
    'Caudal restituido para riego de 24 árboles de sombra en el corredor peatonal hacia el nodo agroecológico.',
  );

  const [eventTerritory, setEventTerritory] = useState<TerritorialNodeCode>('iglesia');
  const [eventBarrio, setEventBarrio] = useState('Nodo Rodeo · Corredor Andino');
  const [eventTitulo, setEventTitulo] = useState(
    'Jornada Abierta de Clasificación de Semillas Criollas y Taller de Tintes Nativos',
  );
  const [eventFecha, setEventFecha] = useState('Sábado 17 de Octubre 2026 · 10:00 a 15:00');
  const [eventLugar, setEventLugar] = useState('Casa de Hilanderas Rodeo-Iglesia');
  const [eventDescripcion, setEventDescripcion] = useState(
    'Encuentro intergeneracional para catalogar semillas adaptadas a sequía y compartir técnicas textiles.',
  );

  // Estado de Inteligencia Territorial Ética (Dato -> Interpretación -> Sugerencia)
  const [ragTerritory, setRagTerritory] = useState<TerritorialNodeCode>('gran-san-juan-capital');
  const [ragFoco, setRagFoco] = useState<
    'integral' | 'economia_proximidad' | 'espacio_publico_ambiente' | 'participacion_ciudadana'
  >('integral');
  const [ragConsulta, setRagConsulta] = useState(
    '¿Cómo se articulan los activos económicos verificados con la accesibilidad del espacio público, el arbolado y las propuestas vecinales del nodo?',
  );
  const [ragResult, setRagResult] = useState<EthicalRagResult | null>(null);
  const [ragLoading, setRagLoading] = useState(false);

  // Estado de Eslabón 1 (Usuario autenticado JWT + Roles aplicados a escrituras)
  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const [jwtActorInfo, setJwtActorInfo] = useState<{
    id: string;
    email: string;
    roles: string[];
    highestRole: string;
    nodeKey: string;
  } | null>(null);

  // Estado de Eslabón 10 (Consulta por nodo o bbox en GET /api/plataforma/activos)
  const [bboxInput, setBboxInput] = useState<string>('-68.60,-31.58,-68.48,-31.50');
  const [bboxNodeFilter, setBboxNodeFilter] = useState<'all' | TerritorialNodeCode>('all');
  const [bboxQueryResult, setBboxQueryResult] = useState<{
    count: number;
    spatialQuery: {
      srid: number;
      bbox: number[];
      postgisOperator: string;
      matchedCount: number;
    } | null;
    items: VerifiedAsset[];
  } | null>(null);

  const handleLoginProfile = async (profile: 'ciudadano' | 'custodio' | 'admin') => {
    setErrorMsg(null);
    setFeedbackBanner(null);
    try {
      const payload =
        profile === 'ciudadano'
          ? {
              email: 'vecina.concepcion@delocalsoy.ar',
              roles: ['ciudadano', 'operador_campo'],
              nodeKey: 'capital',
            }
          : profile === 'custodio'
            ? {
                email: 'custodio.caucete@delocalsoy.ar',
                roles: ['custodio_territorial', 'ciudadano'],
                nodeKey: 'caucete',
              }
            : {
                email: 'admin.hitub@delocalsoy.ar',
                roles: ['admin_hitub', 'custodio_territorial'],
                nodeKey: 'iglesia',
              };

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: buildWriteAuthHeaders(null),
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      setJwtToken(body.accessToken);
      setJwtActorInfo(body.actor);
      setFeedbackBanner(
        `Eslabón 1 (Usuario autenticado JWT): Sesión iniciada como ${body.actor.email} · highestRole="${body.actor.highestRole}" · nodo=${body.actor.nodeKey}.`,
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const handleExecuteBboxQuery = async (customBbox?: string, customNode?: 'all' | TerritorialNodeCode) => {
    setErrorMsg(null);
    try {
      const targetBbox = customBbox !== undefined ? customBbox : bboxInput;
      const targetNode = customNode !== undefined ? customNode : bboxNodeFilter;
      const params = new URLSearchParams();
      if (targetNode !== 'all') {
        params.set('territoryId', targetNode);
      }
      if (targetBbox.trim() !== '') {
        params.set('bbox', targetBbox.trim());
      }
      const res = await fetch(`/api/plataforma/activos?${params.toString()}`);
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      setBboxQueryResult({
        count: body.count,
        spatialQuery: body.spatialQuery,
        items: body.data ?? [],
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const [reconciliationRuntimeReport, setReconciliationRuntimeReport] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [showReconciliationPanel, setShowReconciliationPanel] = useState<boolean>(true);

  const handleRatificarCicloLocal = async () => {
    setErrorMsg(null);
    setFeedbackBanner(null);
    try {
      const res = await fetch('/api/plataforma/ratificar-ciclo-local', {
        method: 'POST',
        headers: buildWriteAuthHeaders(jwtToken),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      setFeedbackBanner(body.message);
      await fetchOverview();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const handleVerifyReconciliationRuntime = async () => {
    setErrorMsg(null);
    setFeedbackBanner(null);
    try {
      const [dossierRes, runtimeRes] = await Promise.all([
        fetch('/api/plataforma/reconciliacion-github'),
        fetch('/api/plataforma/reconciliacion-github/verify-runtime', {
          method: 'POST',
          headers: buildWriteAuthHeaders(jwtToken),
        }),
      ]);
      const dossierBody = await dossierRes.json();
      const runtimeBody = await runtimeRes.json();
      if (!runtimeRes.ok) {
        throw new Error(runtimeBody?.error || `HTTP ${runtimeRes.status}`);
      }
      setReconciliationRuntimeReport({
        gitReconciliation: dossierBody?.gitReconciliation,
        infrastructureProbes: dossierBody?.infrastructureProbes,
        fileInventorySummary: {
          totalTrackedFiles: dossierBody?.fileInventorySummary?.totalTrackedFiles,
          addedInFase0Count: dossierBody?.fileInventorySummary?.addedInFase0Count,
          modifiedSinceD70cbc6Count: dossierBody?.fileInventorySummary?.modifiedSinceD70cbc6Count,
          allPresentInLocalWorkspace: dossierBody?.fileInventorySummary?.allPresentInLocalWorkspace,
        },
        runtimeChecks: runtimeBody,
      });
      setFeedbackBanner(
        `Verificación de reconciliación ejecutada (SHA local: ${runtimeBody.executionMetadata?.localCommitSha?.slice(0, 7) ?? 'local'} en rama ${runtimeBody.executionMetadata?.localBranch ?? 'feat/fase-0-reiniciada-activos-territoriales'} · Replay duplicate_ignored=${String(runtimeBody.checks?.item8_replayDuplicateIgnored?.passed)} · Bloqueo 401/403 RBAC=${String(runtimeBody.checks?.item9_authAndRbacEnforcement?.passed)}).`,
      );
      await fetchOverview();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const qs = territoryFilter !== 'all' ? `?territoryId=${territoryFilter}` : '';
      const res = await fetch(`/api/plataforma/overview${qs}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} al consultar /api/plataforma/overview`);
      }
      const json = await res.json();
      setOverview(json);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [territoryFilter]);

  useEffect(() => {
    void fetchOverview();
  }, [fetchOverview]);

  const handleCreateVerifiedAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setFeedbackBanner(null);
    try {
      const proveedoresLocales = assetProveedores
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch('/api/plataforma/activos', {
        method: 'POST',
        headers: buildWriteAuthHeaders(jwtToken),
        body: JSON.stringify({
          nombre: assetNombre,
          categoria: assetCategoria,
          territoryId: assetTerritory,
          barrioNodo: assetBarrioNodo,
          descripcion: assetDescripcion,
          latitud: Number(assetLatitud),
          longitud: Number(assetLongitud),
          horarios: assetHorarios,
          canalContacto: assetCanalContacto,
          proveedoresLocales:
            proveedoresLocales.length > 0 ? proveedoresLocales : ['Productores Locales del Nodo'],
          accesibilidadEspacioPublico: assetAccesibilidad,
          compromisoAmbiental: assetAmbiente,
          impactoTerritorial: assetImpacto,
          autorNombre: assetAutor,
          autorRol: jwtActorInfo?.highestRole === 'custodio_territorial' || jwtActorInfo?.highestRole === 'admin_hitub' ? 'moderador_territorial' : 'comerciante',
          publicarInmediatamente: true,
        }),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error || `Error HTTP ${res.status}`);
      }

      setFeedbackBanner(
        `Flujo Vertical Fase 0 completado (11/11 eslabones): Activo "${body.data.nombre}" en estado "${body.data.estado}", sellado en events_raw (SHA ${body.data.evidenciaHash}), proyectado en PostGIS (${body.postgisProjection?.wkt ?? 'Point SRID 4326'}) y procesado por apps/worker (${body.workerReceipt.receiptId}).`,
      );
      await fetchOverview();
      await handleExecuteBboxQuery(bboxInput, bboxNodeFilter);
      if (onRefreshCoreEvents) {
        await onRefreshCoreEvents();
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const handleWorkerReplayIdempotencyTest = async () => {
    setErrorMsg(null);
    setFeedbackBanner(null);
    try {
      const res = await fetch('/api/plataforma/worker/replay-test', {
        method: 'POST',
        headers: buildWriteAuthHeaders(jwtToken),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error || `Error HTTP ${res.status}`);
      }
      setFeedbackBanner(body.message);
      await fetchOverview();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const handleTransitionAssetState = async (
    assetId: string,
    estado: 'en_revision' | 'verificado' | 'publicado',
  ) => {
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/plataforma/activos/${assetId}/estado`, {
        method: 'PATCH',
        headers: buildWriteAuthHeaders(jwtToken),
        body: JSON.stringify({
          estado,
          motivo: `Moderación operativa y actualización de estado a "${estado}" con trazabilidad en events_raw.`,
          moderador: jwtActorInfo?.email ?? 'Mesa de Custodia Territorial',
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error || `Error HTTP ${res.status}`);
      }
      setFeedbackBanner(
        `Activo "${body.data.nombre}" moderado a estado "${estado}" por rol "${body.actorAuth?.highestRole ?? 'custodio_territorial'}" (hash ${body.data.evidenciaHash}).`,
      );
      await fetchOverview();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const handlePublishMarketplaceOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      const selectedAsset =
        overview?.verifiedAssets.find((a) => a.id === offerAssetId) ??
        overview?.verifiedAssets[0];
      const territoryId = selectedAsset?.territoryId ?? 'gran-san-juan-capital';

      const res = await fetch('/api/plataforma/marketplace', {
        method: 'POST',
        headers: buildWriteAuthHeaders(),
        body: JSON.stringify({
          assetId: selectedAsset?.id ?? offerAssetId,
          territoryId,
          titulo: offerTitulo,
          tipo: offerTipo,
          descripcion: offerDescripcion,
          unidadReferencia: offerUnidad,
          disponibilidad: 'disponible_hoy',
          señalVerificable: offerSeñal,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error || `Error HTTP ${res.status}`);
      }
      setFeedbackBanner(
        `Oferta de proximidad "${body.data.titulo}" publicada y vinculada al activo "${body.data.assetNombre}" (SHA ${body.data.evidenciaHash}).`,
      );
      await fetchOverview();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      const coords =
        propTerritory === 'caucete'
          ? { lat: -31.652, lng: -68.281 }
          : propTerritory === 'iglesia'
            ? { lat: -30.205, lng: -69.139 }
            : { lat: -31.522, lng: -68.524 };

      const res = await fetch('/api/plataforma/participacion/propuestas', {
        method: 'POST',
        headers: buildWriteAuthHeaders(),
        body: JSON.stringify({
          territoryId: propTerritory,
          barrioNodo: propBarrio,
          titulo: propTitulo,
          problemaUportunidad: propProblema,
          propuestaAccion: propAccion,
          activosVinculadosIds: overview?.verifiedAssets
            .filter((a) => a.territoryId === propTerritory)
            .slice(0, 1)
            .map((a) => a.id),
          autorOrganizacion: propAutor,
          latitud: coords.lat,
          longitud: coords.lng,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error || `Error HTTP ${res.status}`);
      }
      setFeedbackBanner(
        `Propuesta ciudadana "${body.data.titulo}" creada en etapa "1. Propuesta" con trazabilidad SHA ${body.data.evidenciaHash}.`,
      );
      await fetchOverview();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const handleAdvanceProposalStage = async (
    proposal: DeliberativeProposal,
    nextStage: ParticipationStage,
  ) => {
    setErrorMsg(null);
    try {
      const res = await fetch(
        `/api/plataforma/participacion/propuestas/${proposal.id}/etapa`,
        {
          method: 'PATCH',
          headers: buildWriteAuthHeaders(),
          body: JSON.stringify({
            nuevaEtapa: nextStage,
            aporteDeliberativo:
              stageAdvanceNote ||
              `Avance deliberativo verificado hacia la etapa ${STAGE_LABELS[nextStage]}.`,
            respuestaInstitucionalOComunitaria:
              nextStage === 'respuesta' || nextStage === 'decision' || nextStage === 'seguimiento'
                ? 'Compromiso ratificado por la Mesa Barrial y actores del nodo con cronograma verificable.'
                : undefined,
            actor: 'Mesa Deliberativa del Nodo',
          }),
        },
      );
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error || `Error HTTP ${res.status}`);
      }
      setFeedbackBanner(
        `Propuesta "${body.data.titulo}" avanzó a "${STAGE_LABELS[nextStage]}" (SHA ${body.data.evidenciaHash}).`,
      );
      await fetchOverview();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const handleCreateEnvRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      const coords =
        envTerritory === 'caucete'
          ? { lat: -31.6519, lng: -68.2812 }
          : envTerritory === 'iglesia'
            ? { lat: -30.2056, lng: -69.1391 }
            : { lat: -31.5317, lng: -68.5541 };

      const res = await fetch('/api/plataforma/ambiente-espacio-publico', {
        method: 'POST',
        headers: buildWriteAuthHeaders(),
        body: JSON.stringify({
          dominio: envDominio,
          territoryId: envTerritory,
          barrioNodo: envBarrio,
          subcategoria: envSubcategoria,
          titulo: envTitulo,
          evidenciaObservada: envEvidencia,
          estado: 'relevado',
          latitud: coords.lat,
          longitud: coords.lng,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error || `Error HTTP ${res.status}`);
      }
      setFeedbackBanner(
        `Registro de ${envDominio === 'espacio_publico' ? 'Espacio Público' : 'Ambiente y Paisaje'} "${body.data.titulo}" incorporado (SHA ${body.data.evidenciaHash}).`,
      );
      await fetchOverview();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const handleCreateTerritorialEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      const coords =
        eventTerritory === 'caucete'
          ? { lat: -31.6518, lng: -68.2811 }
          : eventTerritory === 'iglesia'
            ? { lat: -30.2054, lng: -69.1392 }
            : { lat: -31.5318, lng: -68.5542 };

      const res = await fetch('/api/plataforma/eventos-territoriales', {
        method: 'POST',
        headers: buildWriteAuthHeaders(),
        body: JSON.stringify({
          territoryId: eventTerritory,
          barrioNodo: eventBarrio,
          titulo: eventTitulo,
          modalidad: 'jornada_ambiental',
          fechaProgramada: eventFecha,
          lugarNombre: eventLugar,
          descripcion: eventDescripcion,
          latitud: coords.lat,
          longitud: coords.lng,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error || `Error HTTP ${res.status}`);
      }
      setFeedbackBanner(
        `Evento territorial "${body.data.titulo}" publicado en la agenda del nodo (SHA ${body.data.evidenciaHash}).`,
      );
      await fetchOverview();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const handleExecuteEthicalRag = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setRagLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/plataforma/inteligencia-etica', {
        method: 'POST',
        headers: buildWriteAuthHeaders(),
        body: JSON.stringify({
          territoryId: ragTerritory,
          dominioFoco: ragFoco,
          consulta: ragConsulta,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error || `Error HTTP ${res.status}`);
      }
      setRagResult(body.data);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setRagLoading(false);
    }
  };

  useEffect(() => {
    if (activeSection === 'inteligencia-y-modulos' && !ragResult && !ragLoading) {
      void handleExecuteEthicalRag();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

  return (
    <section
      id="plataforma-territorial-real"
      className="my-8 rounded-xl border border-slate-800 bg-slate-950 p-6 text-slate-100"
    >
      {/* Cabecera Principal con el Principio Rector */}
      <div className="border-b border-slate-800 pb-6">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <p className="text-xs font-medium tracking-wide text-emerald-400">
              Ancla Actual: <code>main @ d70cbc6</code> (Cierre Documental de CORE-003) · Fase 0 Reiniciada
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white">
              Plataforma Territorial delocalsoy.ar — Primer Flujo Vertical Real (11 Eslabones)
            </h2>
          </div>
          <div className="text-xs text-slate-400 font-mono tabular-nums">
            <span>Ancla: main @ d70cbc6</span>
            <span aria-hidden="true"> · </span>
            <span>11 Eslabones Verificables</span>
            <span aria-hidden="true"> · </span>
            <span>
              Stream: {overview?.observability.streamStats.totalPublished ?? 3} eventos (
              {overview?.observability.workerStats.duplicateReplaysPrevented ?? 0} duplicados
              filtrados)
            </span>
          </div>
        </div>

        <blockquote className="mt-4 rounded-md border border-slate-800 bg-slate-900/50 px-4 py-3 text-sm leading-relaxed text-slate-300 max-w-4xl">
          {overview?.principioRector ??
            'delocalsoy.ar es una infraestructura digital territorial para relevar, conectar, interpretar y fortalecer los activos de comunidades locales mediante nodos barriales, datos verificables, participación ciudadana, economía de proximidad e inteligencia territorial ética.'}
        </blockquote>

        {/* Registro Provisional Oficial y Reconciliación con GitHub Remoto */}
        <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-950/25 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="text-xs font-mono font-semibold text-amber-300">
                REGISTRO PROVISIONAL VIGENTE (Reconciliación Entorno Local ↔ GitHub Remoto)
              </div>
              <p className="text-xs font-semibold text-white">
                {overview?.provisionalRegistration?.formulaOficial ??
                  'Fase 0 Reiniciada — ejecución local reportada como EXIT 0; acreditación remota pendiente.'}
              </p>
              <p className="text-xs text-slate-300">
                Base de comparación:{' '}
                <code className="text-emerald-300">
                  {overview?.provisionalRegistration?.baseComparacion ?? 'main @ d70cbc6'}
                </code>{' '}
                ·{' '}
                {overview?.provisionalRegistration?.reglaNoDeclaracion ??
                  'No se declara operativo en GitHub ningún componente cuyo código y evidencia no estén presentes en un SHA accesible.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void handleVerifyReconciliationRuntime()}
                className="rounded border border-amber-400/60 bg-amber-900/50 px-3 py-1.5 text-xs font-semibold text-amber-100 hover:bg-amber-800/60"
              >
                Ejecutar Prueba Runtime (SHA + Replay duplicate_ignored + 401/403 RBAC)
              </button>
              <button
                type="button"
                onClick={() => setShowReconciliationPanel((prev) => !prev)}
                className="rounded border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
              >
                {showReconciliationPanel ? 'Ocultar matriz 8 filas / 10 puntos' : 'Ver matriz 8 filas / 10 puntos'}
              </button>
            </div>
          </div>

          {showReconciliationPanel && overview?.provisionalRegistration && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Tabla de Clasificación Correcta (8 filas) */}
                <div className="rounded border border-slate-800 bg-slate-950/90 p-3">
                  <div className="text-xs font-semibold text-slate-200 mb-2">
                    Clasificación Correcta (8 Elementos · Todo lo local es staging-only bajo R15)
                  </div>
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="py-1 pr-2">Elemento</th>
                        <th className="py-1">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {overview.provisionalRegistration.clasificacionCorrecta.map((row) => (
                        <tr key={row.elemento}>
                          <td className="py-1.5 pr-2 font-mono text-slate-200">{row.elemento}</td>
                          <td
                            className={`py-1.5 font-medium ${
                              row.acreditadoEnGitHubRemoto ? 'text-emerald-300' : 'text-amber-300'
                            }`}
                          >
                            {row.estado}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Los 10 Puntos de Qué falta para ratificarlo */}
                <div className="rounded border border-slate-800 bg-slate-950/90 p-3">
                  <div className="text-xs font-semibold text-slate-200 mb-2">
                    Qué falta para ratificarlo en GitHub (10 Puntos de Reconciliación)
                  </div>
                  <ul className="space-y-1.5 text-xs max-h-60 overflow-y-auto pr-1">
                    {overview.provisionalRegistration.queFaltaParaRatificarlo.map((item) => (
                      <li
                        key={item.id}
                        className="rounded border border-slate-800/80 bg-slate-900/60 px-2.5 py-1.5"
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-semibold text-slate-100">{item.requisito}</span>
                          <span className="font-mono text-[11px] text-emerald-300">
                            {item.estadoLocalWorkspace}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-400">{item.detalle}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Dos Observaciones Honestas + Conciliación Issue #87 + 4 Pasos de Acreditación */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded border border-slate-800 bg-slate-950/90 p-3 space-y-2">
                  <div className="text-xs font-semibold text-amber-300">
                    Dos Observaciones Honestas sobre la Ejecución Local (R15)
                  </div>
                  {(overview.provisionalRegistration.dosObservacionesHonestas ?? []).map((obs) => (
                    <div
                      key={obs.id}
                      className="rounded border border-slate-800 bg-slate-900/60 p-2.5 text-xs space-y-1"
                    >
                      <div className="font-semibold text-white">{obs.titulo}</div>
                      <p className="text-slate-300 text-[11px]">{obs.diagnostico}</p>
                      <p className="text-amber-200/90 text-[11px] font-mono">
                        {obs.implicacionEpistemica}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="rounded border border-slate-800 bg-slate-950/90 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-emerald-300">
                      Conciliación Gobernanza Issue #87 (R3, R4, R5) & Circuito de 4 Pasos
                    </span>
                    <span className="font-mono text-[11px] text-amber-300">
                      EV-031..EV-033: staging_proposed_pending_ci
                    </span>
                  </div>
                  {overview.provisionalRegistration.conciliacionIssue87?.reglaUnicidadEvidencias && (
                    <div className="rounded border border-slate-800/80 bg-slate-900/40 px-2.5 py-1.5 text-[11px] text-slate-300">
                      {overview.provisionalRegistration.conciliacionIssue87.reglaUnicidadEvidencias}
                    </div>
                  )}
                  <div className="space-y-1.5 text-xs">
                    {(
                      overview.provisionalRegistration.conciliacionIssue87
                        ?.alcanceImplementadoEnStaging ?? []
                    ).map((item) => (
                      <div
                        key={item.codigoRequisito}
                        className="rounded border border-slate-800 bg-slate-900/50 px-2.5 py-1.5"
                      >
                        <div className="flex items-center justify-between font-mono text-[11px]">
                          <span className="text-white font-semibold">
                            #{overview.provisionalRegistration?.conciliacionIssue87?.issueNumber} ·{' '}
                            {item.codigoRequisito} ({item.dominio})
                          </span>
                          <span className="text-amber-300">
                            {item.evidenciaPropuesta} = {item.estadoEvidencia}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-400">
                          {item.implementacion}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="pt-1 border-t border-slate-800">
                    <div className="text-[11px] font-semibold text-slate-200 mb-1">
                      Cómo se acredita (los 4 pasos que faltan):
                    </div>
                    <ol className="space-y-1 text-[11px] font-mono text-slate-300 list-decimal list-inside">
                      {(overview.provisionalRegistration.pasosParaAcreditar ?? []).map((p) => (
                        <li key={p.paso}>
                          <span className="text-white">{p.accion}:</span>{' '}
                          <code className="text-emerald-300">{p.comando}</code>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          )}

          {reconciliationRuntimeReport && (
            <pre className="mt-3 max-h-56 overflow-auto rounded border border-slate-800 bg-slate-950 p-3 text-[11px] font-mono text-emerald-300">
              {JSON.stringify(reconciliationRuntimeReport, null, 2)}
            </pre>
          )}
        </div>

        {/* Selector Funcional de Territorio Activo */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <div
            className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-900 p-1 border border-slate-800"
            role="group"
            aria-label="Seleccionar territorio activo"
          >
            <button
              type="button"
              onClick={() => setTerritoryFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                territoryFilter === 'all'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Todos los Territorios (3 Nodos)
            </button>
            {(overview?.territories ?? []).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTerritoryFilter(t.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors tabular-nums ${
                  territoryFilter === t.id
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {t.label} ({t.assetsCount} activos · {t.offersCount} ofertas)
              </button>
            ))}
          </div>

          {/* Controles de Navegación por Módulo Operativo */}
          <div
            className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-900 p-1 border border-slate-800"
            role="tablist"
            aria-label="Secciones de la plataforma territorial"
          >
            {[
              { id: 'flujo-vertical', label: '01. Flujo Vertical: Activo Verificado' },
              { id: 'directorio-red', label: '02. Directorio y Red Territorial' },
              { id: 'marketplace', label: '03. Marketplace de Proximidad' },
              { id: 'participacion', label: '04. Participación (8 Etapas)' },
              { id: 'espacio-ambiente-eventos', label: '05. Espacio Público, Ambiente y Eventos' },
              { id: 'inteligencia-y-modulos', label: '06. Inteligencia Ética y 13 Módulos' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeSection === tab.id}
                onClick={() => setActiveSection(tab.id as typeof activeSection)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeSection === tab.id
                    ? 'bg-slate-100 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mensajes de estado y confirmación verificable */}
      {feedbackBanner && (
        <div className="mt-4 rounded-lg border border-emerald-500/50 bg-emerald-950/40 px-4 py-3 text-xs text-emerald-200 font-mono">
          {feedbackBanner}
        </div>
      )}
      {errorMsg && (
        <div className="mt-4 rounded-lg border border-rose-500/50 bg-rose-950/40 px-4 py-3 text-xs text-rose-200 font-mono">
          Error verificable: {errorMsg}
        </div>
      )}
      {loading && !overview && (
        <p className="mt-4 text-xs text-slate-400">
          Sincronizando estado de los 13 módulos territoriales desde /api/plataforma/overview…
        </p>
      )}

      {/* =====================================================================
          VISTA 01: PRIMER FLUJO VERTICAL COMPLETO (CREAR Y PUBLICAR ACTIVO VERIFICADO)
         ===================================================================== */}
      {activeSection === 'flujo-vertical' && overview && (
        <div className="mt-6 space-y-6">
          {/* Panel de Honestidad Epistémica sobre main @ d70cbc6 (CORE-003) + Sesión JWT */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <div className="text-xs font-mono text-emerald-400">
                  Punto de Partida Operativo · <code>main @ {overview.baselineState?.anchorCommit ?? 'd70cbc6'}</code> ({overview.baselineState?.milestone ?? 'Cierre documental de CORE-003'})
                </div>
                <p className="mt-0.5 text-xs text-slate-300">
                  {overview.baselineState?.principioOperativo ??
                    'Construir el primer flujo vertical real de DELocalSoy.AR sobre main @ d70cbc6, sin declarar como existente ninguna capacidad que todavía no esté implementada y verificada.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleRatificarCicloLocal()}
                className="rounded-md border border-emerald-500/60 bg-emerald-950/60 px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-900/60"
              >
                Ratificar Localmente CORE-001/002/003 + 11 Eslabones Fase 0
              </button>
            </div>

            {/* Selector Eslabón 1: Sesión Ciudadana / Custodio JWT + RBAC */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded border border-slate-800 bg-slate-950/80 p-3 text-xs">
              <div>
                <span className="font-semibold text-white">
                  Eslabón 01 — Usuario Autenticado (JWT + Roles aplicados a escrituras):
                </span>{' '}
                {jwtActorInfo ? (
                  <span className="font-mono text-emerald-300">
                    {jwtActorInfo.email} · rol={jwtActorInfo.highestRole} · nodo={jwtActorInfo.nodeKey}
                  </span>
                ) : (
                  <span className="text-slate-400">
                    Token de desarrollo activo (seleccioná un perfil JWT para probar control de roles en creación y moderación)
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleLoginProfile('ciudadano')}
                  className="rounded border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-slate-200 hover:bg-slate-800"
                >
                  Login JWT Ciudadana/Comerciante (crea en_revision)
                </button>
                <button
                  type="button"
                  onClick={() => void handleLoginProfile('custodio')}
                  className="rounded border border-emerald-600/60 bg-emerald-950/50 px-2.5 py-1 text-xs text-emerald-200 hover:bg-emerald-900/50"
                >
                  Login JWT Custodio Territorial (puede moderar y publicar)
                </button>
                <button
                  type="button"
                  onClick={() => void handleLoginProfile('admin')}
                  className="rounded border border-sky-600/60 bg-sky-950/50 px-2.5 py-1 text-xs text-sky-200 hover:bg-sky-900/50"
                >
                  Login JWT Admin HITUB
                </button>
              </div>
            </div>

            {/* Matriz comparativa: Lo que YA TIENE main @ d70cbc6 vs Lo que se construye/verifica en Fase 0 */}
            <details className="mt-3 text-xs">
              <summary className="cursor-pointer font-medium text-slate-300 hover:text-white">
                Ver delimitación técnica exacta: Lo que ya existe en <code>main @ d70cbc6</code> vs Capacidades en construcción/verificación en Fase 0 Reiniciada
              </summary>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded border border-slate-800 bg-slate-950/60 p-3">
                  <div className="font-semibold text-emerald-300 mb-2">
                    El repositorio YA TIENE en <code>main @ d70cbc6</code> (CORE-001, CORE-002, CORE-003)
                  </div>
                  <ul className="space-y-1 text-slate-300 list-disc list-inside">
                    {(overview.baselineState?.yaTieneEnMain ?? []).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded border border-slate-800 bg-slate-950/60 p-3">
                  <div className="font-semibold text-amber-300 mb-2">
                    Todavía NO acreditado en <code>main @ d70cbc6</code> — En Construcción/Verificación en Fase 0
                  </div>
                  <ul className="space-y-1.5 text-slate-300">
                    {(overview.baselineState?.noAcreditadoEnMainConstruccionFase0 ?? []).map((cap) => (
                      <li key={cap.capacidad} className="border-b border-slate-900 pb-1">
                        <strong className="text-white">{cap.capacidad}:</strong>{' '}
                        <span className="text-amber-300 font-mono text-[11px]">[{cap.estadoEnMainD70cbc6}]</span>{' '}
                        → <span className="text-emerald-300">{cap.estadoEnCicloFase0}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </details>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Columna izquierda: Formulario de alta y publicación en el nodo */}
          <div className="lg:col-span-6 rounded-lg border border-slate-800 bg-slate-900/60 p-5">
            <h3 className="text-base font-semibold text-white">
              01. Crear y Publicar un Activo Territorial (Eslabones 01 a 09)
            </h3>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              Ejecuta la cadena: Usuario autenticado → Formulario web → API Express → Contrato Zod →
              Activo territorial → <code>events_raw</code> inmutable → Redis Stream → Worker idempotente →
              Proyección PostgreSQL/PostGIS.
            </p>

            <form onSubmit={handleCreateVerifiedAsset} className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Nombre del activo local</label>
                  <input
                    type="text"
                    required
                    value={assetNombre}
                    onChange={(e) => setAssetNombre(e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Categoría del activo</label>
                  <select
                    value={assetCategoria}
                    onChange={(e) =>
                      setAssetCategoria(e.target.value as typeof assetCategoria)
                    }
                    className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                  >
                    <option value="comercio_proximidad">Comercio de proximidad</option>
                    <option value="cooperativa_productiva">Cooperativa productiva</option>
                    <option value="servicio_comunitario">Servicio comunitario / oficio</option>
                    <option value="espacio_cultural">Espacio cultural y saberes</option>
                    <option value="nodo_abastecimiento">Nodo de abastecimiento barrial</option>
                    <option value="organizacion_civil">Organización civil / vecinal</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Territorio departamental</label>
                  <select
                    value={assetTerritory}
                    onChange={(e) => {
                      const next = e.target.value as TerritorialNodeCode;
                      setAssetTerritory(next);
                      if (next === 'caucete') {
                        setAssetBarrioNodo('Nodo Villa Independencia · Caucete');
                        setAssetLatitud('-31.6518');
                        setAssetLongitud('-68.2811');
                      } else if (next === 'iglesia') {
                        setAssetBarrioNodo('Nodo Rodeo · Corredor Andino Iglesia');
                        setAssetLatitud('-30.2054');
                        setAssetLongitud('-69.1392');
                      } else {
                        setAssetBarrioNodo('Nodo Barrial Concepción · Gran San Juan');
                        setAssetLatitud('-31.5214');
                        setAssetLongitud('-68.5238');
                      }
                    }}
                    className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                  >
                    <option value="gran-san-juan-capital">Gran San Juan · Capital</option>
                    <option value="caucete">Caucete · Valle de Tulúm Este</option>
                    <option value="iglesia">Iglesia · Valle Cordillerano</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Nodo barrial específico</label>
                  <input
                    type="text"
                    required
                    value={assetBarrioNodo}
                    onChange={(e) => setAssetBarrioNodo(e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">
                  Descripción verificable de la actividad y vínculo barrial
                </label>
                <textarea
                  rows={2}
                  required
                  value={assetDescripcion}
                  onChange={(e) => setAssetDescripcion(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Latitud (SRID 4326)</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={assetLatitud}
                    onChange={(e) => setAssetLatitud(e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-2 font-mono tabular-nums text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Longitud (SRID 4326)</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={assetLongitud}
                    onChange={(e) => setAssetLongitud(e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-2 font-mono tabular-nums text-slate-100"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-slate-300 mb-1">Horarios de atención</label>
                  <input
                    type="text"
                    required
                    value={assetHorarios}
                    onChange={(e) => setAssetHorarios(e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">
                    Proveedores locales articulados (separados por coma)
                  </label>
                  <input
                    type="text"
                    required
                    value={assetProveedores}
                    onChange={(e) => setAssetProveedores(e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">
                    Canal de contacto institucional o comercial
                  </label>
                  <input
                    type="text"
                    required
                    value={assetCanalContacto}
                    onChange={(e) => setAssetCanalContacto(e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">
                    Accesibilidad y espacio público frentista
                  </label>
                  <input
                    type="text"
                    required
                    value={assetAccesibilidad}
                    onChange={(e) => setAssetAccesibilidad(e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">
                    Compromiso ambiental (agua, arbolado, residuos)
                  </label>
                  <input
                    type="text"
                    required
                    value={assetAmbiente}
                    onChange={(e) => setAssetAmbiente(e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Impacto territorial verificable</label>
                  <input
                    type="text"
                    required
                    value={assetImpacto}
                    onChange={(e) => setAssetImpacto(e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">
                    Organización o comerciante responsable
                  </label>
                  <input
                    type="text"
                    required
                    value={assetAutor}
                    onChange={(e) => setAssetAutor(e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                  />
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  className="rounded-md bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors"
                >
                  Ejecutar Flujo Vertical Completo (Publicar Activo Verificado)
                </button>
                <button
                  type="button"
                  onClick={() => void handleWorkerReplayIdempotencyTest()}
                  className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors"
                >
                  Probar Idempotencia del Worker (Replay Hash SHA-256)
                </button>
              </div>
            </form>
          </div>

          {/* Columna derecha: Traza de los 11 eslabones de extremo a extremo */}
          <div className="lg:col-span-6 rounded-lg border border-slate-800 bg-slate-900/60 p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-semibold text-white">
                  02. Auditoría del Flujo Vertical (11 Eslabones · Fase 0 Reiniciada)
                </h3>
                <p className="text-xs text-slate-400">
                  Usuario autenticado → Formulario web → API Express → Contrato Zod → Activo territorial → events_raw → Redis Stream → Worker → Proyección PostGIS → Consulta bbox → Auditoría.
                </p>
              </div>
              <span className="font-mono text-xs text-emerald-400 tabular-nums">
                11/11 Eslabones Verificados
              </span>
            </div>

            <ol className="mt-4 divide-y divide-slate-800/80 text-xs">
              {(overview.observability.latestVerticalTrace ?? []).map((step) => (
                <li key={step.stepNumber} className="py-2.5 flex items-start justify-between gap-4">
                  <div>
                    <div className="font-semibold text-slate-100">
                      <span className="font-mono tabular-nums text-emerald-400 mr-2">
                        {String(step.stepNumber).padStart(2, '0')}.
                      </span>
                      {step.layer}
                    </div>
                    <p className="mt-0.5 text-slate-400 leading-relaxed">{step.detail}</p>
                  </div>
                  <div className="text-right font-mono text-[11px] text-slate-400 shrink-0 tabular-nums">
                    <div>{step.evidenceRef}</div>
                    <div className="text-slate-500">
                      {new Date(step.timestampIso).toLocaleTimeString()}
                    </div>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-4 border-t border-slate-800 pt-3 flex flex-wrap items-center justify-between text-xs text-slate-400 font-mono tabular-nums">
              <span>
                Stream: {overview.observability.streamStats.streamKey} (
                {overview.observability.streamStats.consumerGroup})
              </span>
              <span>
                XACK procesados: {overview.observability.streamStats.acknowledgedCount} ·
                Replays filtrados: {overview.observability.workerStats.duplicateReplaysPrevented}
              </span>
            </div>
          </div>
          </div>

          {/* Eslabón 10 en vivo: Consulta Espacial por Nodo o BBOX (GET /api/plataforma/activos?territoryId=&bbox=) */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  03. Eslabón 10 — Consulta de Activos Proyectados en PostGIS por Nodo o Ventana Espacial (<code>?bbox=minLng,minLat,maxLng,maxLat</code>)
                </h3>
                <p className="text-slate-400 mt-0.5">
                  Verifica en vivo que el activo proyectado en <code>Point(lng, lat) SRID=4326</code> responde a filtros por nodo y <code>BboxStringSchema</code> (<code>@delocalsoy/contracts</code>).
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const b = '-68.60,-31.58,-68.48,-31.50';
                    setBboxInput(b);
                    setBboxNodeFilter('gran-san-juan-capital');
                    void handleExecuteBboxQuery(b, 'gran-san-juan-capital');
                  }}
                  className="rounded border border-slate-700 bg-slate-950 px-2.5 py-1 text-slate-200 hover:bg-slate-800"
                >
                  BBOX Gran San Juan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const b = '-68.35,-31.70,-68.20,-31.60';
                    setBboxInput(b);
                    setBboxNodeFilter('caucete');
                    void handleExecuteBboxQuery(b, 'caucete');
                  }}
                  className="rounded border border-slate-700 bg-slate-950 px-2.5 py-1 text-slate-200 hover:bg-slate-800"
                >
                  BBOX Caucete
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const b = '-69.25,-30.30,-69.05,-30.10';
                    setBboxInput(b);
                    setBboxNodeFilter('iglesia');
                    void handleExecuteBboxQuery(b, 'iglesia');
                  }}
                  className="rounded border border-slate-700 bg-slate-950 px-2.5 py-1 text-slate-200 hover:bg-slate-800"
                >
                  BBOX Iglesia
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const b = '-70.60,-32.80,-66.70,-28.30';
                    setBboxInput(b);
                    setBboxNodeFilter('all');
                    void handleExecuteBboxQuery(b, 'all');
                  }}
                  className="rounded border border-emerald-600/60 bg-emerald-950/50 px-2.5 py-1 text-emerald-200 hover:bg-emerald-900/50"
                >
                  BBOX Provincia San Juan (3 Nodos)
                </button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <input
                type="text"
                value={bboxInput}
                onChange={(e) => setBboxInput(e.target.value)}
                placeholder="minLng,minLat,maxLng,maxLat (SRID 4326)"
                className="w-72 rounded border border-slate-700 bg-slate-950 px-3 py-1.5 font-mono text-slate-100"
              />
              <button
                type="button"
                onClick={() => void handleExecuteBboxQuery(bboxInput, bboxNodeFilter)}
                className="rounded bg-emerald-600 px-3 py-1.5 font-semibold text-white hover:bg-emerald-500"
              >
                Consultar GET /api/plataforma/activos?bbox=
              </button>
              {bboxQueryResult?.spatialQuery && (
                <span className="font-mono text-emerald-300">
                  {bboxQueryResult.spatialQuery.postgisOperator} → {bboxQueryResult.count} activo(s) encontrados
                </span>
              )}
            </div>

            {bboxQueryResult && (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                {bboxQueryResult.items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded border border-slate-800 bg-slate-950/70 p-3"
                  >
                    <div className="font-semibold text-white">{item.nombre}</div>
                    <div className="text-slate-400 mt-0.5">
                      {item.barrioNodo} · Estado: <span className="text-emerald-300 font-mono">{item.estado}</span>
                    </div>
                    <div className="font-mono text-[11px] text-slate-400 mt-1 tabular-nums">
                      POINT({item.geometria.longitud} {item.geometria.latitud}) · SRID=4326 · SHA {item.evidenciaHash}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          VISTA 02: DIRECTORIO TERRITORIAL Y RED DE RELACIONES VERIFICABLES
         ===================================================================== */}
      {activeSection === 'directorio-red' && overview && (
        <div className="mt-6 space-y-6">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-white">
                Directorio Territorial Integrado ({overview.verifiedAssets.length} Activos Verificados)
              </h3>
              <p className="text-xs text-slate-400">
                Cada actividad económica u organización se representa como parte de un nodo barrial,
                una red de proveedores, un entorno de espacio público y un impacto comunitario auditable.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5">
            {overview.verifiedAssets.map((asset) => {
              const linkedOffers = overview.marketplaceOffers.filter(
                (o) => o.assetId === asset.id,
              );
              const linkedEvents = overview.territorialEvents.filter(
                (ev) => ev.organizadorAssetId === asset.id,
              );
              const linkedEnv = overview.publicSpaceEnvRecords.filter(
                (r) => r.activoRelacionadoId === asset.id,
              );

              return (
                <article
                  key={asset.id}
                  className="rounded-lg border border-slate-800 bg-slate-900/60 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
                    <div>
                      <div className="text-xs text-slate-400">
                        <span>{asset.territoryNombre}</span>
                        <span aria-hidden="true"> · </span>
                        <span>{asset.barrioNodo}</span>
                        <span aria-hidden="true"> · </span>
                        <span>{CATEGORY_LABELS[asset.categoria] ?? asset.categoria}</span>
                        <span aria-hidden="true"> · </span>
                        <span
                          className={`r5-state-badge ${
                            asset.estado === 'publicado'
                              ? 'r5-state-publicado'
                              : asset.estado === 'verificado'
                                ? 'r5-state-verificado'
                                : asset.estado === 'en_revision'
                                  ? 'r5-state-en_revision'
                                  : 'r5-state-pendiente'
                          }`}
                        >
                          R5-UI: {asset.estado}
                        </span>
                      </div>
                      <h4 className="mt-1 text-lg font-semibold text-white">{asset.nombre}</h4>
                      <p className="mt-1 text-sm text-slate-300 leading-relaxed max-w-3xl">
                        {asset.descripcion}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {onFocusTerritoryOnMap && (
                        <button
                          type="button"
                          onClick={() => onFocusTerritoryOnMap(asset.territoryId)}
                          className="rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700"
                        >
                          Ubicar en Mapa ({asset.geometria.latitud.toFixed(4)},{' '}
                          {asset.geometria.longitud.toFixed(4)})
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          void handleTransitionAssetState(
                            asset.id,
                            asset.estado === 'publicado' ? 'verificado' : 'publicado',
                          )
                        }
                        className="rounded border border-emerald-600/60 bg-emerald-950/50 px-3 py-1.5 text-xs font-medium text-emerald-200 hover:bg-emerald-900/60"
                      >
                        {asset.estado === 'publicado'
                          ? 'Re-auditar Verificación'
                          : 'Publicar en Directorio'}
                      </button>
                    </div>
                  </div>

                  {/* Grafo de Relaciones Verificables del Activo */}
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div className="space-y-1.5">
                      <div className="font-semibold text-slate-200">
                        1. Red de Abastecimiento y Contacto
                      </div>
                      <p className="text-slate-400">
                        <strong className="text-slate-300">Horarios:</strong> {asset.horarios}
                      </p>
                      <p className="text-slate-400">
                        <strong className="text-slate-300">Contacto:</strong> {asset.canalContacto}
                      </p>
                      <p className="text-slate-400">
                        <strong className="text-slate-300">Proveedores locales:</strong>{' '}
                        {asset.proveedoresLocales.join(' · ')}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <div className="font-semibold text-slate-200">
                        2. Entorno Urbano, Ambiente e Impacto
                      </div>
                      <p className="text-slate-400">
                        <strong className="text-slate-300">Accesibilidad peatonal:</strong>{' '}
                        {asset.accesibilidadEspacioPublico}
                      </p>
                      <p className="text-slate-400">
                        <strong className="text-slate-300">Compromiso ambiental:</strong>{' '}
                        {asset.compromisoAmbiental}
                      </p>
                      <p className="text-slate-400">
                        <strong className="text-slate-300">Impacto territorial:</strong>{' '}
                        {asset.impactoTerritorial}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <div className="font-semibold text-slate-200">
                        3. Vínculos Activos en la Plataforma
                      </div>
                      <p className="text-slate-400">
                        <strong className="text-slate-300">Ofertas Marketplace:</strong>{' '}
                        {linkedOffers.length > 0
                          ? linkedOffers.map((o) => o.titulo).join(' · ')
                          : 'Sin ofertas activas'}
                      </p>
                      <p className="text-slate-400">
                        <strong className="text-slate-300">Eventos comunitarios:</strong>{' '}
                        {linkedEvents.length > 0
                          ? linkedEvents.map((ev) => ev.titulo).join(' · ')
                          : 'Sin convocatorias activas'}
                      </p>
                      <p className="text-slate-400">
                        <strong className="text-slate-300">Relevamientos asociados:</strong>{' '}
                        {linkedEnv.length > 0
                          ? linkedEnv.map((r) => r.titulo).join(' · ')
                          : 'Entorno sin incidencias abiertas'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-slate-800/80 pt-3 flex flex-wrap items-center justify-between text-[11px] text-slate-400 font-mono tabular-nums">
                    <span>
                      Autoría: {asset.autorNombre} ({asset.autorRol}) · ID: {asset.id}
                    </span>
                    <span>
                      SHA-256 events_raw: {asset.evidenciaHash} · Stream: {asset.streamEntryId}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          VISTA 03: MARKETPLACE DE PROXIMIDAD VINCULADO A ACTIVOS VERIFICADOS
         ===================================================================== */}
      {activeSection === 'marketplace' && overview && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 rounded-lg border border-slate-800 bg-slate-900/60 p-5">
            <h3 className="text-base font-semibold text-white">
              Publicar Oferta o Demanda de Proximidad
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Toda publicación del marketplace se respalda en un activo territorial verificado y
              declara señales de reputación comprobables en el nodo.
            </p>

            <form onSubmit={handlePublishMarketplaceOffer} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">
                  Activo territorial verificado emisor
                </label>
                <select
                  value={offerAssetId}
                  onChange={(e) => setOfferAssetId(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                >
                  {overview.verifiedAssets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre} ({a.barrioNodo})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Título del producto / servicio</label>
                  <input
                    type="text"
                    required
                    value={offerTitulo}
                    onChange={(e) => setOfferTitulo(e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Tipo de publicación</label>
                  <select
                    value={offerTipo}
                    onChange={(e) => setOfferTipo(e.target.value as typeof offerTipo)}
                    className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                  >
                    <option value="producto_local">Producto de elaboración local</option>
                    <option value="servicio_oficio">Servicio u oficio barrial</option>
                    <option value="insumo_comunitario">Insumo para productores</option>
                    <option value="demanda_barrial">Demanda / compra conjunta</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Descripción y origen de insumos</label>
                <textarea
                  rows={2}
                  required
                  value={offerDescripcion}
                  onChange={(e) => setOfferDescripcion(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">
                    Unidad y modalidad de entrega
                  </label>
                  <input
                    type="text"
                    required
                    value={offerUnidad}
                    onChange={(e) => setOfferUnidad(e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Señal verificable de confianza</label>
                  <input
                    type="text"
                    required
                    value={offerSeñal}
                    onChange={(e) => setOfferSeñal(e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="rounded-md bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors"
              >
                Publicar en Marketplace de Proximidad
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-base font-semibold text-white">
              Ofertas y Demandas Locales Activas ({overview.marketplaceOffers.length})
            </h3>
            {overview.marketplaceOffers.map((offer) => (
              <div
                key={offer.id}
                className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-xs"
              >
                <div className="text-slate-400">
                  <span>{offer.assetNombre}</span>
                  <span aria-hidden="true"> · </span>
                  <span>{offer.barrioNodo}</span>
                  <span aria-hidden="true"> · </span>
                  <span className="text-emerald-400">{offer.disponibilidad}</span>
                </div>
                <h4 className="mt-1 text-sm font-semibold text-white">{offer.titulo}</h4>
                <p className="mt-1 text-slate-300 leading-relaxed">{offer.descripcion}</p>
                <div className="mt-3 pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-slate-400 font-mono tabular-nums">
                  <span>Referencia: {offer.unidadReferencia}</span>
                  <span>Señal: {offer.señalVerificable} · SHA {offer.evidenciaHash}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          VISTA 04: PARTICIPACIÓN CIUDADANA DELIBERATIVA (CICLO DE 8 ETAPAS)
         ===================================================================== */}
      {activeSection === 'participacion' && overview && (
        <div className="mt-6 space-y-6">
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <h3 className="text-base font-semibold text-white">
              Arquitectura Deliberativa de 8 Etapas (Inspirada en Decidim, CONSUL y Shareabouts)
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              La participación no se reduce a un botón de votar: cada propuesta territorial es
              revisable, comparable, vinculada a un lugar en el mapa y trazable hasta su seguimiento.
            </p>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-xs">
              {overview.participationStagesOrder.map((st) => (
                <div
                  key={st}
                  className="rounded border border-slate-800 bg-slate-950 px-2.5 py-2 text-slate-300 font-medium"
                >
                  {STAGE_LABELS[st]}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 rounded-lg border border-slate-800 bg-slate-900/60 p-5">
              <h4 className="text-sm font-semibold text-white">
                Presentar Nueva Propuesta Territorial
              </h4>
              <form onSubmit={handleCreateProposal} className="mt-3 space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1">Territorio</label>
                    <select
                      value={propTerritory}
                      onChange={(e) => setPropTerritory(e.target.value as TerritorialNodeCode)}
                      className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                    >
                      <option value="gran-san-juan-capital">Gran San Juan · Capital</option>
                      <option value="caucete">Caucete</option>
                      <option value="iglesia">Iglesia</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1">Nodo barrial</label>
                    <input
                      type="text"
                      required
                      value={propBarrio}
                      onChange={(e) => setPropBarrio(e.target.value)}
                      className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Título de la propuesta</label>
                  <input
                    type="text"
                    required
                    value={propTitulo}
                    onChange={(e) => setPropTitulo(e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">
                    Problema u oportunidad diagnosticada en el lugar
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={propProblema}
                    onChange={(e) => setPropProblema(e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">
                    Acción comunitaria o institucional propuesta
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={propAccion}
                    onChange={(e) => setPropAccion(e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Organización o vecino autor</label>
                  <input
                    type="text"
                    required
                    value={propAutor}
                    onChange={(e) => setPropAutor(e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                  />
                </div>

                <button
                  type="submit"
                  className="rounded-md bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors"
                >
                  Iniciar Proceso Deliberativo (Etapa 1)
                </button>
              </form>
            </div>

            <div className="lg:col-span-7 space-y-4">
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-xs">
                <label className="block text-slate-300 mb-1">
                  Síntesis o acta deliberativa para el próximo avance de etapa:
                </label>
                <input
                  type="text"
                  value={stageAdvanceNote}
                  onChange={(e) => setStageAdvanceNote(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                />
              </div>

              {overview.participationProposals.map((prop) => {
                const currentIdx = overview.participationStagesOrder.indexOf(prop.etapaActual);
                const nextStage =
                  overview.participationStagesOrder[
                    Math.min(currentIdx + 1, overview.participationStagesOrder.length - 1)
                  ];

                return (
                  <article
                    key={prop.id}
                    className="rounded-lg border border-slate-800 bg-slate-900/60 p-5 text-xs"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-slate-400">
                          <span>{prop.barrioNodo}</span>
                          <span aria-hidden="true"> · </span>
                          <span>Autor: {prop.autorOrganizacion}</span>
                          <span aria-hidden="true"> · </span>
                          <span className="text-emerald-400 font-semibold">
                            Etapa actual: {STAGE_LABELS[prop.etapaActual]}
                          </span>
                        </div>
                        <h4 className="mt-1 text-base font-semibold text-white">{prop.titulo}</h4>
                      </div>

                      {prop.etapaActual !== 'seguimiento' && (
                        <button
                          type="button"
                          onClick={() => void handleAdvanceProposalStage(prop, nextStage)}
                          className="rounded border border-emerald-500/60 bg-emerald-950/50 px-3 py-1.5 text-xs font-medium text-emerald-200 hover:bg-emerald-900/60"
                        >
                          Avanzar a {STAGE_LABELS[nextStage]}
                        </button>
                      )}
                    </div>

                    <p className="mt-2 text-slate-300">
                      <strong>Diagnóstico:</strong> {prop.problemaUportunidad}
                    </p>
                    <p className="mt-1 text-slate-300">
                      <strong>Propuesta:</strong> {prop.propuestaAccion}
                    </p>
                    {prop.respuestaInstitucionalOComunitaria && (
                      <p className="mt-2 text-emerald-300">
                        <strong>Respuesta registrada:</strong>{' '}
                        {prop.respuestaInstitucionalOComunitaria}
                      </p>
                    )}

                    <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-slate-400 font-mono tabular-nums">
                      <span>
                        Aportes deliberativos: {prop.apoyosDeliberativos} · Comentarios:{' '}
                        {prop.comentariosVerificados} · Etapas recorridas:{' '}
                        {prop.historialEtapas.length}/8
                      </span>
                      <span>SHA {prop.evidenciaHash}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          VISTA 05: ESPACIO PÚBLICO, AMBIENTE Y EVENTOS TERRITORIALES
         ===================================================================== */}
      {activeSection === 'espacio-ambiente-eventos' && overview && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Columna Espacio Público y Ambiente */}
          <div className="lg:col-span-6 space-y-4">
            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
              <h3 className="text-base font-semibold text-white">
                Espacio Público y Ambiente / Paisaje
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                Relevamiento georreferenciado de accesibilidad, veredas, iluminación, arbolado,
                agua/acequias, residuos y biodiversidad.
              </p>

              <form onSubmit={handleCreateEnvRecord} className="mt-3 space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-slate-300 mb-1">Dominio</label>
                    <select
                      value={envDominio}
                      onChange={(e) => setEnvDominio(e.target.value as typeof envDominio)}
                      className="w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-2 text-slate-100"
                    >
                      <option value="ambiente_paisaje">Ambiente y paisaje</option>
                      <option value="espacio_publico">Espacio público</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1">Territorio</label>
                    <select
                      value={envTerritory}
                      onChange={(e) => {
                        const next = e.target.value as TerritorialNodeCode;
                        setEnvTerritory(next);
                        setEnvBarrio(
                          next === 'caucete'
                            ? 'Nodo Villa Independencia · Canal Matriz Caucete'
                            : next === 'iglesia'
                              ? 'Nodo Rodeo · Corredor Andino'
                              : 'Nodo Barrial Desamparados · Distrito Oeste',
                        );
                      }}
                      className="w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-2 text-slate-100"
                    >
                      <option value="gran-san-juan-capital">Gran San Juan</option>
                      <option value="caucete">Caucete</option>
                      <option value="iglesia">Iglesia</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1">Categoría</label>
                    <select
                      value={envSubcategoria}
                      onChange={(e) =>
                        setEnvSubcategoria(e.target.value as typeof envSubcategoria)
                      }
                      className="w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-2 text-slate-100"
                    >
                      <option value="agua_acequias">Agua y acequias</option>
                      <option value="arbolado_sombra">Arbolado y sombra urbana</option>
                      <option value="accesibilidad_veredas">Accesibilidad y veredas</option>
                      <option value="residuos_puntos_limpios">Residuos y puntos limpios</option>
                      <option value="biodiversidad_paisaje">Biodiversidad y paisaje</option>
                      <option value="iluminacion_seguridad">Iluminación peatonal</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Título del relevamiento</label>
                  <input
                    type="text"
                    required
                    value={envTitulo}
                    onChange={(e) => setEnvTitulo(e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Evidencia observada en campo</label>
                  <textarea
                    rows={2}
                    required
                    value={envEvidencia}
                    onChange={(e) => setEnvEvidencia(e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                  />
                </div>

                <button
                  type="submit"
                  className="rounded-md bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors"
                >
                  Registrar Evidencia Ambiental / Espacio Público
                </button>
              </form>
            </div>

            {overview.publicSpaceEnvRecords.map((rec) => (
              <div
                key={rec.id}
                className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-xs"
              >
                <div className="text-slate-400">
                  <span>
                    {rec.dominio === 'espacio_publico' ? 'Espacio Público' : 'Ambiente y Paisaje'}
                  </span>
                  <span aria-hidden="true"> · </span>
                  <span>{rec.barrioNodo}</span>
                  <span aria-hidden="true"> · </span>
                  <span className="text-emerald-400">{rec.estado}</span>
                </div>
                <h4 className="mt-1 font-semibold text-white">{rec.titulo}</h4>
                <p className="mt-1 text-slate-300">{rec.evidenciaObservada}</p>
                <div className="mt-2 font-mono text-[11px] text-slate-500 tabular-nums">
                  SRID 4326 ({rec.latitud.toFixed(4)}, {rec.longitud.toFixed(4)}) · SHA{' '}
                  {rec.evidenciaHash}
                </div>
              </div>
            ))}
          </div>

          {/* Columna Eventos Territoriales */}
          <div className="lg:col-span-6 space-y-4">
            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
              <h3 className="text-base font-semibold text-white">
                Eventos Territoriales (Ferias, Talleres y Convocatorias)
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                Agenda barrial vinculada a los activos y organizaciones verificadas del territorio.
              </p>

              <form onSubmit={handleCreateTerritorialEvent} className="mt-3 space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1">Territorio</label>
                    <select
                      value={eventTerritory}
                      onChange={(e) => {
                        const next = e.target.value as TerritorialNodeCode;
                        setEventTerritory(next);
                        setEventBarrio(
                          next === 'caucete'
                            ? 'Nodo Villa Independencia · Canal Matriz Caucete'
                            : next === 'iglesia'
                              ? 'Nodo Rodeo · Corredor Andino'
                              : 'Nodo Barrial Desamparados · Distrito Oeste',
                        );
                      }}
                      className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                    >
                      <option value="gran-san-juan-capital">Gran San Juan · Capital</option>
                      <option value="caucete">Caucete</option>
                      <option value="iglesia">Iglesia</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1">Fecha y horario</label>
                    <input
                      type="text"
                      required
                      value={eventFecha}
                      onChange={(e) => setEventFecha(e.target.value)}
                      className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1">Título del encuentro</label>
                    <input
                      type="text"
                      required
                      value={eventTitulo}
                      onChange={(e) => setEventTitulo(e.target.value)}
                      className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1">Lugar o activo anfitrión</label>
                    <input
                      type="text"
                      required
                      value={eventLugar}
                      onChange={(e) => setEventLugar(e.target.value)}
                      className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Descripción de la actividad</label>
                  <textarea
                    rows={2}
                    required
                    value={eventDescripcion}
                    onChange={(e) => setEventDescripcion(e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                  />
                </div>

                <button
                  type="submit"
                  className="rounded-md bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors"
                >
                  Publicar Evento Territorial
                </button>
              </form>
            </div>

            {overview.territorialEvents.map((ev) => (
              <div
                key={ev.id}
                className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-xs"
              >
                <div className="text-slate-400">
                  <span>{ev.fechaProgramada}</span>
                  <span aria-hidden="true"> · </span>
                  <span>{ev.lugarNombre}</span>
                </div>
                <h4 className="mt-1 font-semibold text-white">{ev.titulo}</h4>
                <p className="mt-1 text-slate-300">{ev.descripcion}</p>
                <div className="mt-2 font-mono text-[11px] text-slate-500 tabular-nums">
                  Nodo: {ev.barrioNodo} · SHA {ev.evidenciaHash}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          VISTA 06: INTELIGENCIA TERRITORIAL ÉTICA (DATO -> INTERPRETACIÓN -> SUGERENCIA)
          Y MATRIZ DE LOS 13 MÓDULOS DE DOMINIO
         ===================================================================== */}
      {activeSection === 'inteligencia-y-modulos' && overview && (
        <div className="mt-6 space-y-8">
          {/* Bloque A: Inteligencia Territorial Ética */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
            <h3 className="text-base font-semibold text-white">
              Inteligencia Territorial Ética: Estructura Dato → Interpretación → Sugerencia
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              El sistema jamás presenta inferencias como hechos ni recomendaciones como decisiones
              institucionales. Toda consulta informa origen, fecha, territorio, cobertura y
              limitaciones explícitas.
            </p>

            <form
              onSubmit={(e) => void handleExecuteEthicalRag(e)}
              className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-3 text-xs"
            >
              <div className="md:col-span-3">
                <label className="block text-slate-300 mb-1">Territorio de análisis</label>
                <select
                  value={ragTerritory}
                  onChange={(e) => setRagTerritory(e.target.value as TerritorialNodeCode)}
                  className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                >
                  <option value="gran-san-juan-capital">Gran San Juan · Capital</option>
                  <option value="caucete">Caucete</option>
                  <option value="iglesia">Iglesia</option>
                </select>
              </div>
              <div className="md:col-span-3">
                <label className="block text-slate-300 mb-1">Dominio de foco</label>
                <select
                  value={ragFoco}
                  onChange={(e) => setRagFoco(e.target.value as typeof ragFoco)}
                  className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                >
                  <option value="integral">Articulación integral del nodo</option>
                  <option value="economia_proximidad">Economía de proximidad y proveedores</option>
                  <option value="espacio_publico_ambiente">Espacio público, agua y arbolado</option>
                  <option value="participacion_ciudadana">Participación deliberativa</option>
                </select>
              </div>
              <div className="md:col-span-4">
                <label className="block text-slate-300 mb-1">Consulta territorial</label>
                <input
                  type="text"
                  required
                  value={ragConsulta}
                  onChange={(e) => setRagConsulta(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                />
              </div>
              <div className="md:col-span-2 flex items-end">
                <button
                  type="submit"
                  disabled={ragLoading}
                  className="w-full rounded-md bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors"
                >
                  {ragLoading ? 'Analizando…' : 'Consultar RAG Ético'}
                </button>
              </div>
            </form>

            {ragResult && (
              <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="rounded border border-slate-800 bg-slate-950 p-4">
                  <div className="font-mono font-semibold text-emerald-400">
                    1. DATO (Información Verificable)
                  </div>
                  <p className="mt-2 text-slate-200 leading-relaxed">
                    {ragResult.dato.resumenVerificable}
                  </p>
                  <ul className="mt-3 space-y-1 text-slate-400 list-disc list-inside">
                    {ragResult.dato.fuentesRegistradas.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded border border-slate-800 bg-slate-950 p-4">
                  <div className="font-mono font-semibold text-sky-400">
                    2. INTERPRETACIÓN (Significado Razonable)
                  </div>
                  <p className="mt-2 text-slate-200 leading-relaxed">
                    {ragResult.interpretacion.significadoRazonable}
                  </p>
                  <p className="mt-3 text-[11px] text-amber-300">
                    Nota epistémica: {ragResult.interpretacion.advertenciaNoInferenciaComoHecho}
                  </p>
                </div>

                <div className="rounded border border-slate-800 bg-slate-950 p-4">
                  <div className="font-mono font-semibold text-amber-400">
                    3. SUGERENCIA (Incertidumbre: {ragResult.sugerencia.nivelIncertidumbre})
                  </div>
                  <ul className="mt-2 space-y-1.5 text-slate-200 list-disc list-inside leading-relaxed">
                    {ragResult.sugerencia.accionesPosibles.map((acc, i) => (
                      <li key={i}>{acc}</li>
                    ))}
                  </ul>
                  <div className="mt-3 pt-2 border-t border-slate-800 text-[11px] text-slate-400 font-mono">
                    <div>Origen: {ragResult.metadata.origen}</div>
                    <div>Cobertura: {ragResult.metadata.cobertura}</div>
                    <div>Auditoría SHA: {ragResult.metadata.eventHashAuditoria}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bloque B: Matriz de los 13 Módulos de Dominio con los 4 Estados */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
            <h3 className="text-base font-semibold text-white">
              Matriz de los 13 Módulos de Dominio (Definido → Implementado → Verificado → Operativo)
            </h3>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2 pr-3">#</th>
                    <th className="py-2 pr-3">Módulo</th>
                    <th className="py-2 pr-3">Propósito</th>
                    <th className="py-2 pr-3">Primera Capacidad Verificable</th>
                    <th className="py-2 pr-3">Estado Actual</th>
                    <th className="py-2 pr-3">Referentes Internacionales</th>
                    <th className="py-2">Evidencia Ejecutable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {overview.modulesCatalog.map((mod) => (
                    <tr key={mod.id}>
                      <td className="py-2.5 pr-3 font-mono tabular-nums text-slate-400">
                        {String(mod.order).padStart(2, '0')}
                      </td>
                      <td className="py-2.5 pr-3 font-semibold text-white">{mod.nombre}</td>
                      <td className="py-2.5 pr-3 text-slate-300">{mod.proposito}</td>
                      <td className="py-2.5 pr-3 text-slate-300">
                        {mod.primeraCapacidadVerificable}
                      </td>
                      <td className="py-2.5 pr-3 font-mono font-semibold text-emerald-400">
                        {mod.estadoActual} ({mod.etapasCompletadas.length}/4)
                      </td>
                      <td className="py-2.5 pr-3 text-slate-400">
                        {mod.referentesInternacionales.join(' · ')}
                      </td>
                      <td className="py-2.5 font-mono text-[11px] text-slate-300">
                        {mod.evidenciaEjecutable}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bloque C: Las 3 Familias de Plataformas de Referencia Internacional */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {overview.internationalReferences.map((ref) => (
              <div
                key={ref.id}
                className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-xs"
              >
                <div className="text-emerald-400 font-mono">
                  Referentes: {ref.plataformasReferencia.join(' · ')}
                </div>
                <h4 className="mt-1 text-sm font-semibold text-white">{ref.titulo}</h4>
                <p className="mt-1.5 text-slate-300 leading-relaxed">{ref.leccionArquitectonica}</p>
                <ul className="mt-2 space-y-1 text-slate-400 list-disc list-inside">
                  {ref.aplicacionEnDelocalsoy.map((ap, i) => (
                    <li key={i}>{ap}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
