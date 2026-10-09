import { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  authenticateWithGoogleDrive,
  deleteDriveFileById,
  exportDriveFileAsBlob,
  exportTerritorialReportToDrive,
  getDriveAccessToken,
  getFirebaseAppletDriveConfig,
  listDriveFiles,
  signOutFromGoogleDrive,
  subscribeToDriveAuth,
  type DriveFileRecord,
} from '../services/googleDriveService';
import {
  DriveReportExportModal,
  type DriveExportTarget,
} from './DriveReportExportModal';
import type { Territorio } from '../App';
import {
  QUARTERS,
  REPORT_STATUS_META,
  STATUS_META,
  SYNC_PACK_STATUS_META,
  SYNTHESIS_STATUS_META,
  type EvidenciaRecord,
  type InterNodeSyncPack,
  type LineageChainStep,
  type MultiScaleSynthesisItem,
  type SpatialGeometryRecord,
  type TemporalQuarterSnapshot,
  type TerritorialReport,
  type TerritorioFeature,
} from '../data/federatedModel';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  webViewLink?: string;
}

interface GoogleDocParagraphElement {
  textRun?: {
    content?: string;
  };
}

interface GoogleDocStructuralElement {
  paragraph?: {
    elements?: GoogleDocParagraphElement[];
  };
}

interface GoogleDocResponse {
  documentId: string;
  title: string;
  body?: {
    content?: GoogleDocStructuralElement[];
  };
}

export type ExportReportTemplateKey =
  | 'acta-integral'
  | 'reportes-h1'
  | 'postgis-federacion-h2'
  | 'sintesis-linaje-h3'
  | 'auditoria-hitub';

export type DriveUploadFormat = 'json' | 'csv' | 'md';

type PendingAction =
  | { type: 'delete-drive-file'; file: DriveFile }
  | { type: 'create-google-doc'; title: string; templateLabel: string; summaryCount: number }
  | {
      type: 'append-google-doc';
      docId: string;
      docTitle: string;
      templateLabel: string;
    }
  | {
      type: 'upload-drive-report';
      format: DriveUploadFormat;
      fileName: string;
      mimeType: string;
      templateLabel: string;
    };

export interface WorkspacePanelProps {
  territorios: Territorio[];
  features?: TerritorioFeature[];
  reports?: TerritorialReport[];
  spatialGeometries?: SpatialGeometryRecord[];
  syncPacks?: InterNodeSyncPack[];
  temporalSnapshots?: TemporalQuarterSnapshot[];
  multiScaleSyntheses?: MultiScaleSynthesisItem[];
  lineageChain?: LineageChainStep[];
  evidencias?: EvidenciaRecord[];
  onExportVerified?: (exportMeta: {
    channel: 'google-docs' | 'google-drive' | 'local-download';
    template: ExportReportTemplateKey;
    title: string;
    fileId?: string;
    webViewLink?: string;
  }) => Promise<void>;
}

const TEMPLATE_OPTIONS: Array<{
  key: ExportReportTemplateKey;
  label: string;
  defaultTitle: string;
  description: string;
}> = [
  {
    key: 'acta-integral',
    label: '01. Acta Territorial Pública Integral (H1 + H2 + H3 + HITUB)',
    defaultTitle: 'Acta Territorial Pública Integral — DELocalSoy.AR',
    description:
      'Incluye nodos federados, activos y problemáticas (H1), morfologías PostGIS y custodia cruzada (H2), síntesis multi-escala, linaje SHA-256 y evidencias EV-001..EV-014 (H3).',
  },
  {
    key: 'reportes-h1',
    label: '02. Reporte de Observaciones y Problemáticas Comunitarias (H1)',
    defaultTitle: 'Reporte de Relevamiento y Problemáticas (H1) — DELocalSoy.AR',
    description:
      'Detalle de activos comunitarios verificados, problemáticas reportadas, ciclo de vida operativo y custodios por nodo.',
  },
  {
    key: 'postgis-federacion-h2',
    label: '03. Informe de Morfologías PostGIS, Federación y Serie 2026-Q1..Q4 (H2)',
    defaultTitle: 'Informe Espacial PostGIS y Custodia Cruzada (H2) — DELocalSoy.AR',
    description:
      'Geometrías WKT (SRID=4326), corredores y cuencas, paquetes inter-nodos co-firmados y evolución trimestral 2026-Q1 a 2026-Q4.',
  },
  {
    key: 'sintesis-linaje-h3',
    label: '04. Dictamen de Síntesis Multi-Escala y Cadena de Linaje SHA-256 (H3)',
    defaultTitle: 'Dictamen Multi-Escala y Linaje Criptográfico (H3) — DELocalSoy.AR',
    description:
      'Cruces multi-escala bajo Contrato Ético Tripartito (Dato → Interpretación → Sugerencia), firmas humanas y cadena de hashes SHA-256.',
  },
  {
    key: 'auditoria-hitub',
    label: '05. Auditoría de Evidencias Ejecutables HITUB (EV-001 a EV-014)',
    defaultTitle: 'Auditoría de Verdad Técnica HITUB (EV-001..EV-014) — DELocalSoy.AR',
    description:
      'Estado de verificación técnica, resultados comprobables y marcas temporales de las 14 evidencias del monorepo.',
  },
];

export function WorkspacePanel({
  territorios,
  features = [],
  reports = [],
  spatialGeometries = [],
  syncPacks = [],
  temporalSnapshots = [],
  multiScaleSyntheses = [],
  lineageChain = [],
  evidencias = [],
  onExportVerified,
}: WorkspacePanelProps) {
  const [needsAuth, setNeedsAuth] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [driveLoading, setDriveLoading] = useState(false);
  const [driveSearch, setDriveSearch] = useState('');
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [workspaceNotice, setWorkspaceNotice] = useState<string | null>(null);
  const [lastCreatedLink, setLastCreatedLink] = useState<{
    label: string;
    url: string;
  } | null>(null);

  const [selectedDoc, setSelectedDoc] = useState<{
    id: string;
    title: string;
    text: string;
  } | null>(null);
  const [docLoading, setDocLoading] = useState(false);

  // Configuración de exportación de reportes (Google Docs + Google Drive + Local)
  const [reportTemplate, setReportTemplate] =
    useState<ExportReportTemplateKey>('acta-integral');
  const [nodeFilter, setNodeFilter] = useState<string>('todos');
  const [newDocTitle, setNewDocTitle] = useState(
    TEMPLATE_OPTIONS[0].defaultTitle,
  );
  const [showPreview, setShowPreview] = useState<boolean>(false);

  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [executingAction, setExecutingAction] = useState(false);
  const [driveExportTarget, setDriveExportTarget] =
    useState<DriveExportTarget | null>(null);
  const driveConfigMeta = useMemo(() => getFirebaseAppletDriveConfig(), []);

  const activeTemplateMeta = useMemo(
    () =>
      TEMPLATE_OPTIONS.find((t) => t.key === reportTemplate) ??
      TEMPLATE_OPTIONS[0],
    [reportTemplate],
  );

  const handleSelectTemplate = (key: ExportReportTemplateKey) => {
    setReportTemplate(key);
    const meta = TEMPLATE_OPTIONS.find((t) => t.key === key);
    if (meta) {
      const suffix =
        nodeFilter === 'todos'
          ? ''
          : ` [${territorios.find((n) => n.key === nodeFilter)?.nombre ?? nodeFilter}]`;
      setNewDocTitle(`${meta.defaultTitle}${suffix}`);
    }
  };

  const handleSelectNodeFilter = (nextNodeKey: string) => {
    setNodeFilter(nextNodeKey);
    const suffix =
      nextNodeKey === 'todos'
        ? ''
        : ` [${territorios.find((n) => n.key === nextNodeKey)?.nombre ?? nextNodeKey}]`;
    setNewDocTitle(`${activeTemplateMeta.defaultTitle}${suffix}`);
  };

  // Filtrado por nodo
  const filteredTerritorios = useMemo(
    () =>
      nodeFilter === 'todos'
        ? territorios
        : territorios.filter((t) => t.key === nodeFilter),
    [territorios, nodeFilter],
  );

  const filteredFeatures = useMemo(
    () =>
      nodeFilter === 'todos'
        ? features
        : features.filter((f) => f.nodeKey === nodeFilter),
    [features, nodeFilter],
  );

  const filteredReports = useMemo(
    () =>
      nodeFilter === 'todos'
        ? reports
        : reports.filter((r) => r.nodeKey === nodeFilter),
    [reports, nodeFilter],
  );

  const filteredGeometries = useMemo(
    () =>
      nodeFilter === 'todos'
        ? spatialGeometries
        : spatialGeometries.filter((g) => g.nodeKey === nodeFilter),
    [spatialGeometries, nodeFilter],
  );

  const filteredSyncPacks = useMemo(
    () =>
      nodeFilter === 'todos'
        ? syncPacks
        : syncPacks.filter(
            (sp) =>
              sp.sourceNodeKey === nodeFilter || sp.targetNodeKey === nodeFilter,
          ),
    [syncPacks, nodeFilter],
  );

  const filteredSnapshots = useMemo(
    () =>
      nodeFilter === 'todos'
        ? temporalSnapshots
        : temporalSnapshots.filter((s) => s.nodeKey === nodeFilter),
    [temporalSnapshots, nodeFilter],
  );

  const filteredSyntheses = useMemo(
    () =>
      nodeFilter === 'todos'
        ? multiScaleSyntheses
        : multiScaleSyntheses.filter((m) => m.involvedNodes.includes(nodeFilter)),
    [multiScaleSyntheses, nodeFilter],
  );

  // Generador de contenido estructurado para Google Docs / Markdown
  const buildReportDocumentText = useCallback((): string => {
    const fecha = new Date().toISOString();
    const scopeLabel =
      nodeFilter === 'todos'
        ? 'Agregado Federado (Todos los Nodos)'
        : `Nodo Federado: ${territorios.find((t) => t.key === nodeFilter)?.nombre ?? nodeFilter}`;

    const header = [
      `======================================================================`,
      `${newDocTitle.trim() || activeTemplateMeta.defaultTitle}`,
      `======================================================================`,
      `Plataforma: DELocalSoy.AR · Hub de Transformación e Innovación Territorial (HITUB)`,
      `Plantilla: ${activeTemplateMeta.label}`,
      `Alcance Territorial: ${scopeLabel}`,
      `Fecha de Emisión (UTC): ${fecha}`,
      `Contrato Ético Tripartito: requiresHumanReview = true`,
      `----------------------------------------------------------------------\n`,
    ].join('\n');

    const sectionTerritorios = [
      `1. NODOS TERRITORIALES FEDERADOS (${filteredTerritorios.length})`,
      ...filteredTerritorios.map(
        (t, idx) =>
          `   ${idx + 1}. ${t.nombre} (${t.subtitulo ?? 'Nodo'}) — Provincia: ${t.provincia} | Foco: ${t.foco ?? 'General'} | Población: ${(t.poblacion ?? 0).toLocaleString('es-AR')} hab. | Estado: ${t.activo ? 'ACTIVO' : 'EN VINCULACIÓN'} [ID: ${t.id}]`,
      ),
      '',
    ].join('\n');

    const sectionH1 = [
      `2. HORIZONTE 1 — RELEVAMIENTO MULTICAPA Y REPORTES COMUNITARIOS`,
      `   • Features / Observaciones registradas: ${filteredFeatures.length}`,
      ...filteredFeatures.map(
        (f, idx) =>
          `     [${idx + 1}] (${f.nodeKey.toUpperCase()} · ${f.layer} · ${f.type}) ${f.title} — Estado: ${STATUS_META[f.status]?.label ?? f.status} — Dominio: ${f.domain} — Fuente: ${f.sourceLabel} (${f.observedAt})`,
      ),
      `   • Reportes del Ciclo Operativo: ${filteredReports.length}`,
      ...filteredReports.map(
        (r, idx) =>
          `     (R-${idx + 1}) [${r.id}] Nodo: ${r.nodeKey.toUpperCase()} | Categoría: ${r.category} | Estado: ${REPORT_STATUS_META[r.status]?.label ?? r.status} | Nota: ${r.description}`,
      ),
      '',
    ].join('\n');

    const sectionH2 = [
      `3. HORIZONTE 2 — MORFOLOGÍAS POSTGIS (SRID=4326), CUSTODIA CRUZADA Y SERIE TRIMESTRAL`,
      `   • Geometrías PostGIS activas: ${filteredGeometries.length}`,
      ...filteredGeometries.map(
        (g, idx) =>
          `     [G-${idx + 1}] ${g.title} (${g.geometryType} · SRID=${g.srid}) — Nodo: ${g.nodeKey.toUpperCase()} — Métrica: ${g.metricLabel} — WKT: ${g.wkt}`,
      ),
      `   • Paquetes de Sincronización Inter-Nodos: ${filteredSyncPacks.length}`,
      ...filteredSyncPacks.map(
        (sp, idx) =>
          `     [PACK-${idx + 1}] ${sp.title} (${sp.sourceNodeKey.toUpperCase()} → ${sp.targetNodeKey.toUpperCase()}) — Estado: ${SYNC_PACK_STATUS_META[sp.status]?.label ?? sp.status} — Hash: ${sp.hash}`,
      ),
      `   • Evolución Multitemporal (2026-Q1 a 2026-Q4):`,
      ...QUARTERS.map((q) => {
        const snaps = filteredSnapshots.filter((s) => s.quarter === q);
        const activos = snaps.reduce((acc, s) => acc + s.activeAssets, 0);
        const abiertas = snaps.reduce((acc, s) => acc + s.openProblems, 0);
        const resueltas = snaps.reduce((acc, s) => acc + s.resolvedProblems, 0);
        const postgis = snaps.reduce((acc, s) => acc + s.postgisGeometries, 0);
        return `     - ${q}: Activos verificados=${activos} | Problemáticas abiertas=${abiertas} | Resueltas=${resueltas} | Geometrías PostGIS=${postgis}`;
      }),
      '',
    ].join('\n');

    const sectionH3 = [
      `4. HORIZONTE 3 — SÍNTESIS MULTI-ESCALA BAJO CONTRATO ÉTICO Y LINAJE SHA-256`,
      `   • Síntesis Multi-Escala generadas: ${filteredSyntheses.length}`,
      ...filteredSyntheses.map(
        (syn, idx) =>
          [
            `     [SÍNTESIS ${idx + 1}] ${syn.title} (${syn.id})`,
            `       - Nodos: ${syn.involvedNodes.join(', ')} | Estado: ${SYNTHESIS_STATUS_META[syn.status]?.label ?? syn.status}`,
            `       - [DATO]: ${syn.datoSummary}`,
            `       - [INTERPRETACIÓN]: ${syn.interpretacionProvisional}`,
            `       - [SUGERENCIA]: ${syn.sugerenciaAccion}`,
            `       - Firma Colegiada: ${syn.ratifiedBy ? `${syn.ratifiedBy} (${syn.ratifiedAt ?? ''}) — "${syn.ratifiedNote ?? ''}"` : 'Pendiente de ratificación humana (bloqueo ético activo)'}`,
            `       - Lineage Hash SHA-256: ${syn.lineageRootHash}`,
          ].join('\n'),
      ),
      `   • Cadena de Linaje Criptográfico SHA-256 (${lineageChain.length} eslabones):`,
      ...lineageChain.map(
        (step) =>
          `     #${step.stepIndex} [${step.horizon} · ${step.stageLabel}] ${step.summary} — Evento: ${step.eventType} — PrevHash: ${step.parentHash.slice(0, 12)}… → CurrentHash: ${step.currentHash}`,
      ),
      '',
    ].join('\n');

    const okEvCount = evidencias.filter((e) => e.status === 'ok').length;
    const sectionHitub = [
      `5. AUDITORÍA DE VERDAD TÉCNICA HITUB (${okEvCount}/${evidencias.length} EVIDENCIAS EN ESTADO OK)`,
      ...evidencias.map(
        (ev) =>
          `   • [${ev.code}] ${ev.title} — Estado: ${ev.status.toUpperCase()} ${ev.verified_at ? `(Verificada: ${ev.verified_at})` : '(Pendiente)'}`,
      ),
      '',
    ].join('\n');

    if (reportTemplate === 'reportes-h1') {
      return [header, sectionTerritorios, sectionH1].join('\n');
    }
    if (reportTemplate === 'postgis-federacion-h2') {
      return [header, sectionTerritorios, sectionH2].join('\n');
    }
    if (reportTemplate === 'sintesis-linaje-h3') {
      return [header, sectionTerritorios, sectionH3].join('\n');
    }
    if (reportTemplate === 'auditoria-hitub') {
      return [header, sectionHitub, sectionH3].join('\n');
    }

    return [
      header,
      sectionTerritorios,
      sectionH1,
      sectionH2,
      sectionH3,
      sectionHitub,
    ].join('\n');
  }, [
    nodeFilter,
    territorios,
    newDocTitle,
    activeTemplateMeta,
    filteredTerritorios,
    filteredFeatures,
    filteredReports,
    filteredGeometries,
    filteredSyncPacks,
    filteredSnapshots,
    filteredSyntheses,
    lineageChain,
    evidencias,
    reportTemplate,
  ]);

  // Generador de paquete JSON para Google Drive / Descarga
  const buildReportJsonString = useCallback((): string => {
    const tipHash =
      lineageChain.length > 0
        ? lineageChain[lineageChain.length - 1].currentHash
        : 'genesis-core001';
    const payload = {
      schema: 'delocalsoy.ar/federated-report/v3.0',
      exportedAt: new Date().toISOString(),
      title: newDocTitle.trim() || activeTemplateMeta.defaultTitle,
      template: reportTemplate,
      templateLabel: activeTemplateMeta.label,
      nodeScope: nodeFilter,
      ethicalContract: {
        requiresHumanReview: true,
        lineageTipHash: tipHash,
      },
      summaryMetrics: {
        territoriosCount: filteredTerritorios.length,
        featuresCount: filteredFeatures.length,
        reportsCount: filteredReports.length,
        spatialGeometriesCount: filteredGeometries.length,
        syncPacksCount: filteredSyncPacks.length,
        multiScaleSynthesesCount: filteredSyntheses.length,
        evidenciasOkCount: evidencias.filter((e) => e.status === 'ok').length,
        evidenciasTotalCount: evidencias.length,
      },
      territorios: filteredTerritorios,
      horizon1: {
        features: filteredFeatures,
        reports: filteredReports,
      },
      horizon2: {
        spatialGeometries: filteredGeometries,
        syncPacks: filteredSyncPacks,
        temporalSnapshots: filteredSnapshots,
      },
      horizon3: {
        multiScaleSyntheses: filteredSyntheses,
        lineageChain,
      },
      hitubEvidencias: evidencias,
    };
    return JSON.stringify(payload, null, 2);
  }, [
    lineageChain,
    newDocTitle,
    activeTemplateMeta,
    reportTemplate,
    nodeFilter,
    filteredTerritorios,
    filteredFeatures,
    filteredReports,
    filteredGeometries,
    filteredSyncPacks,
    filteredSnapshots,
    filteredSyntheses,
    evidencias,
  ]);

  // Generador de matriz CSV para Google Drive / Google Sheets
  const buildReportCsvString = useCallback((): string => {
    const escapeCsv = (val: string | number | boolean | null | undefined) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows: string[][] = [
      [
        'SECCION',
        'ID_CODIGO',
        'NODO',
        'TIPO_GEOMETRIA_O_ETAPA',
        'TITULO_O_CATEGORIA',
        'ESTADO',
        'DOMINIO_O_TRIMESTRE',
        'DETALLE_O_WKT',
        'HASH_O_VERIFICACION',
      ],
    ];

    for (const t of filteredTerritorios) {
      rows.push([
        'NODO_FEDERADO',
        t.id,
        t.key,
        'Nodo Territorial',
        t.nombre,
        t.activo ? 'activo' : 'inactivo',
        t.provincia,
        t.foco ?? '',
        `Poblacion: ${t.poblacion ?? 0}`,
      ]);
    }

    for (const f of filteredFeatures) {
      rows.push([
        'H1_FEATURE',
        f.id,
        f.nodeKey,
        `${f.layer} (${f.type})`,
        f.title,
        f.status,
        f.domain,
        f.sourceLabel,
        f.observedAt,
      ]);
    }

    for (const r of filteredReports) {
      rows.push([
        'H1_REPORTE',
        r.id,
        r.nodeKey,
        'Point',
        r.category,
        r.status,
        'reporte_comunitario',
        r.description,
        r.createdAt,
      ]);
    }

    for (const g of filteredGeometries) {
      rows.push([
        'H2_POSTGIS',
        g.id,
        g.nodeKey,
        `${g.geometryType} (SRID=${g.srid})`,
        g.title,
        g.status,
        g.domain,
        g.wkt,
        g.metricLabel,
      ]);
    }

    for (const s of filteredSnapshots) {
      rows.push([
        'H2_TRIMESTRE',
        `${s.nodeKey}-${s.quarter}`,
        s.nodeKey,
        'TemporalSnapshot',
        `Corte ${s.quarter}`,
        'verificado',
        s.quarter,
        `Activos=${s.activeAssets} | Abiertas=${s.openProblems} | Resueltas=${s.resolvedProblems} | PostGIS=${s.postgisGeometries}`,
        s.highlight,
      ]);
    }

    for (const syn of filteredSyntheses) {
      rows.push([
        'H3_SINTESIS',
        syn.id,
        syn.involvedNodes.join('+'),
        'MultiScaleSynthesis',
        syn.title,
        syn.status,
        syn.involvedDomains.join('+'),
        `DATO: ${syn.datoSummary} | SUGERENCIA: ${syn.sugerenciaAccion}`,
        syn.lineageRootHash,
      ]);
    }

    for (const ev of evidencias) {
      rows.push([
        'HITUB_EVIDENCIA',
        ev.code,
        'monorepo',
        'EvidenciaEjecutable',
        ev.title,
        ev.status,
        'CORE-001..H3',
        JSON.stringify(ev.result ?? {}),
        ev.verified_at ?? 'pendiente',
      ]);
    }

    return rows.map((r) => r.map(escapeCsv).join(',')).join('\n');
  }, [
    filteredTerritorios,
    filteredFeatures,
    filteredReports,
    filteredGeometries,
    filteredSnapshots,
    filteredSyntheses,
    evidencias,
  ]);

  const loadDriveFiles = useCallback(async (searchQuery = '') => {
    const token = await getDriveAccessToken();
    if (!token) {
      setNeedsAuth(true);
      return;
    }

    setDriveLoading(true);
    setWorkspaceError(null);
    try {
      const files: DriveFileRecord[] = await listDriveFiles(searchQuery, 15);
      setDriveFiles(files);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Sesión expirada') || msg.includes('Autenticación requerida')) {
        setNeedsAuth(true);
      }
      setWorkspaceError(msg);
    } finally {
      setDriveLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToDriveAuth(
      (loggedUser) => {
        setUser(loggedUser);
        setNeedsAuth(false);
        void loadDriveFiles();
      },
      () => {
        setUser(null);
        setNeedsAuth(true);
      },
    );
    return () => unsubscribe();
  }, [loadDriveFiles]);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setWorkspaceError(null);
    try {
      const result = await authenticateWithGoogleDrive();
      if (result) {
        setUser(result.user);
        setNeedsAuth(false);
        await loadDriveFiles(driveSearch);
      }
    } catch (err) {
      setWorkspaceError(
        err instanceof Error ? err.message : 'Error al iniciar sesión con Google',
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await signOutFromGoogleDrive();
    setUser(null);
    setNeedsAuth(true);
    setDriveFiles([]);
    setSelectedDoc(null);
    setLastCreatedLink(null);
  };

  const extractDocText = (doc: GoogleDocResponse): string => {
    const elements = doc.body?.content ?? [];
    const chunks: string[] = [];
    for (const el of elements) {
      const pElements = el.paragraph?.elements ?? [];
      for (const pe of pElements) {
        if (pe.textRun?.content) {
          chunks.push(pe.textRun.content);
        }
      }
    }
    return chunks.join('').trim() || '(Documento sin texto)';
  };

  const handleReadDoc = async (documentId: string) => {
    const token = await getDriveAccessToken();
    if (!token) {
      setNeedsAuth(true);
      return;
    }

    setDocLoading(true);
    setWorkspaceError(null);
    try {
      const res = await fetch(
        `https://docs.googleapis.com/v1/documents/${documentId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!res.ok) {
        throw new Error(`Google Docs API respondió HTTP ${res.status}`);
      }
      const doc = (await res.json()) as GoogleDocResponse;
      setSelectedDoc({
        id: doc.documentId,
        title: doc.title,
        text: extractDocText(doc),
      });
    } catch (err) {
      setWorkspaceError(err instanceof Error ? err.message : String(err));
    } finally {
      setDocLoading(false);
    }
  };

  // Exportar un Google Doc existente desde Drive como PDF o TXT
  const handleExportDriveDoc = async (
    fileId: string,
    fileName: string,
    exportMime: 'application/pdf' | 'text/plain',
  ) => {
    const token = await getDriveAccessToken();
    if (!token) {
      setNeedsAuth(true);
      return;
    }

    setWorkspaceError(null);
    try {
      const blob = await exportDriveFileAsBlob(fileId, exportMime);
      const ext = exportMime === 'application/pdf' ? 'pdf' : 'txt';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName.replace(/[^a-zA-Z0-9_-]+/g, '_')}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setWorkspaceNotice(
        `Documento "${fileName}" exportado desde Google Drive como .${ext.toUpperCase()}.`,
      );
    } catch (err) {
      setWorkspaceError(err instanceof Error ? err.message : String(err));
    }
  };

  // Descarga local inmediata (.md, .json, .csv)
  const handleLocalDownload = async (format: DriveUploadFormat) => {
    const baseSlug = (newDocTitle.trim() || activeTemplateMeta.defaultTitle)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    let content = '';
    let mime = 'text/plain;charset=utf-8';
    if (format === 'json') {
      content = buildReportJsonString();
      mime = 'application/json;charset=utf-8';
    } else if (format === 'csv') {
      content = buildReportCsvString();
      mime = 'text/csv;charset=utf-8';
    } else {
      content = buildReportDocumentText();
      mime = 'text/markdown;charset=utf-8';
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseSlug || 'reporte-territorial'}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setWorkspaceNotice(
      `Reporte "${newDocTitle.trim() || activeTemplateMeta.defaultTitle}" descargado localmente como .${format.toUpperCase()}.`,
    );

    if (onExportVerified) {
      await onExportVerified({
        channel: 'local-download',
        template: reportTemplate,
        title: `${baseSlug}.${format}`,
      });
    }
  };

// Preparar subida a Google Drive con confirmación obligatoria
  const requestDriveUpload = (format: DriveUploadFormat) => {
    const baseSlug = (newDocTitle.trim() || activeTemplateMeta.defaultTitle)
      .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ _.-]+/g, '')
      .trim();

    const formatMeta: Record<
      DriveUploadFormat,
      { ext: string; mime: string }
    > = {
      json: { ext: 'json', mime: 'application/json' },
      csv: { ext: 'csv', mime: 'text/csv' },
      md: { ext: 'md', mime: 'text/markdown' },
    };

    const chosen = formatMeta[format];
    setPendingAction({
      type: 'upload-drive-report',
      format,
      fileName: `${baseSlug || 'Reporte_Territorial_DELocalSoy'}.${chosen.ext}`,
      mimeType: chosen.mime,
      templateLabel: activeTemplateMeta.label,
    });
  };

  const executeConfirmedAction = async () => {
    if (!pendingAction) return;
    const token = await getDriveAccessToken();
    if (!token) {
      setNeedsAuth(true);
      setPendingAction(null);
      return;
    }

    setExecutingAction(true);
    setWorkspaceError(null);
    setWorkspaceNotice(null);

    try {
      if (pendingAction.type === 'delete-drive-file') {
        await deleteDriveFileById(pendingAction.file.id);
        if (selectedDoc?.id === pendingAction.file.id) {
          setSelectedDoc(null);
        }
        setWorkspaceNotice(
          `Archivo "${pendingAction.file.name}" eliminado de Google Drive.`,
        );
        await loadDriveFiles(driveSearch);
      } else if (pendingAction.type === 'create-google-doc') {
        const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: pendingAction.title,
          }),
        });
        if (!createRes.ok) {
          throw new Error(
            `Error al crear Google Doc (HTTP ${createRes.status})`,
          );
        }
        const createdDoc = (await createRes.json()) as GoogleDocResponse;
        const reportText = buildReportDocumentText();

        const updateRes = await fetch(
          `https://docs.googleapis.com/v1/documents/${createdDoc.documentId}:batchUpdate`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              requests: [
                {
                  insertText: {
                    location: { index: 1 },
                    text: reportText,
                  },
                },
              ],
            }),
          },
        );
        if (!updateRes.ok) {
          throw new Error(
            `Error al escribir contenido en Google Doc (HTTP ${updateRes.status})`,
          );
        }

        const docUrl = `https://docs.google.com/document/d/${createdDoc.documentId}/edit`;
        setLastCreatedLink({
          label: `Abrir "${createdDoc.title}" en Google Docs`,
          url: docUrl,
        });
        setWorkspaceNotice(
          `Reporte "${createdDoc.title}" exportado exitosamente a Google Docs (ID: ${createdDoc.documentId}).`,
        );
        await loadDriveFiles(driveSearch);
        await handleReadDoc(createdDoc.documentId);

        if (onExportVerified) {
          await onExportVerified({
            channel: 'google-docs',
            template: reportTemplate,
            title: createdDoc.title,
            fileId: createdDoc.documentId,
            webViewLink: docUrl,
          });
        }
      } else if (pendingAction.type === 'append-google-doc') {
        const reportText = `\n\n${buildReportDocumentText()}`;
        const updateRes = await fetch(
          `https://docs.googleapis.com/v1/documents/${pendingAction.docId}:batchUpdate`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              requests: [
                {
                  insertText: {
                    location: { index: 1 },
                    text: reportText,
                  },
                },
              ],
            }),
          },
        );
        if (!updateRes.ok) {
          throw new Error(
            `Error al actualizar Google Doc (HTTP ${updateRes.status})`,
          );
        }
        setWorkspaceNotice(
          `Reporte (${pendingAction.templateLabel}) insertado en "${pendingAction.docTitle}".`,
        );
        await handleReadDoc(pendingAction.docId);

        if (onExportVerified) {
          await onExportVerified({
            channel: 'google-docs',
            template: reportTemplate,
            title: pendingAction.docTitle,
            fileId: pendingAction.docId,
          });
        }
      } else if (pendingAction.type === 'upload-drive-report') {
        let fileContent = '';
        if (pendingAction.format === 'json') {
          fileContent = buildReportJsonString();
        } else if (pendingAction.format === 'csv') {
          fileContent = buildReportCsvString();
        } else {
          fileContent = buildReportDocumentText();
        }

        const uploadResult = await exportTerritorialReportToDrive({
          fileName: pendingAction.fileName,
          content: fileContent,
          format: pendingAction.format,
          description: `Exportado desde DELocalSoy.AR (${pendingAction.templateLabel})`,
        });

        const uploadedFile = uploadResult.file;
        const driveUrl = uploadResult.webViewLink;

        setLastCreatedLink({
          label: `Abrir "${uploadedFile.name}" en Google Drive`,
          url: driveUrl,
        });
        setWorkspaceNotice(
          `Archivo "${uploadedFile.name}" exportado y guardado en tu Google Drive (ID: ${uploadedFile.id}).`,
        );
        await loadDriveFiles(driveSearch);

        if (onExportVerified) {
          await onExportVerified({
            channel: 'google-drive',
            template: reportTemplate,
            title: uploadedFile.name,
            fileId: uploadedFile.id,
            webViewLink: driveUrl,
          });
        }
      }
    } catch (err) {
      setWorkspaceError(err instanceof Error ? err.message : String(err));
    } finally {
      setExecutingAction(false);
      setPendingAction(null);
    }
  };

  const totalItemsInSelectedReport =
    filteredTerritorios.length +
    filteredFeatures.length +
    filteredReports.length +
    filteredGeometries.length +
    filteredSyntheses.length;

  return (
    <section
      id="exportar-workspace"
      className="card"
      data-state={needsAuth ? 'checking' : 'ok'}
    >
      <div className="section-header">
        <div>
          <span className="kicker-text">
            05. Interoperabilidad Documental y Resguardo Externo (EV-014)
          </span>
          <h2>Exportación de Reportes Territoriales — Google Docs & Google Drive</h2>
          <p className="section-caption">
            Generá documentos estructurados en <strong>Google Docs</strong>, exportá paquetes verificables (<code>.JSON</code>, <code>.CSV</code>, <code>.MD</code>) a <strong>Google Drive</strong> o descargá copias locales con linaje SHA-256.
          </p>
        </div>
        {!needsAuth && user && (
          <div className="user-bar">
            <span className="user-email">{user.email ?? user.displayName}</span>
            <button
              type="button"
              className="btn-toggle"
              onClick={() => void handleLogout()}
            >
              Cerrar sesión
            </button>
          </div>
        )}
      </div>

      {/* Barra de diagnóstico de la capa de servicio firebase-applet-config.json */}
      <div
        className="territory-meta tabular-nums"
        style={{
          padding: '0.55rem 0.85rem',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '6px',
          marginBottom: '0.85rem',
        }}
      >
        Capa de Servicio Google Drive (<code>firebase-applet-config.json</code>) · Project ID:{' '}
        <code>{driveConfigMeta.projectId}</code> · Auth Domain:{' '}
        <code>{driveConfigMeta.authDomain}</code> · OAuth Client:{' '}
        <code>{driveConfigMeta.oAuthClientId.slice(0, 20)}…</code> · Scopes activos:{' '}
        <strong>{driveConfigMeta.scopes.length}</strong>
      </div>

      {/* Configurador del Reporte Territorial a Exportar (siempre disponible para previsualizar y descargar, o enviar a Docs/Drive) */}
      <div className="export-config-box">
        <div className="pane-header">
          <div>
            <span className="tiny-label">
              Configurador de Reporte Territorial Federado (Horizontes 1, 2 y 3)
            </span>
            <strong>{activeTemplateMeta.label}</strong>
          </div>
          <div className="territory-actions">
            <button
              type="button"
              className="btn-toggle"
              onClick={() => setShowPreview((prev) => !prev)}
            >
              {showPreview ? 'Ocultar vista previa' : 'Ver vista previa del reporte'}
            </button>
            <button
              type="button"
              className="btn-toggle"
              onClick={() => void handleLocalDownload('md')}
              title="Descargar acta en formato Markdown (.md)"
            >
              ↓ Descargar .MD
            </button>
            <button
              type="button"
              className="btn-toggle"
              onClick={() => void handleLocalDownload('json')}
              title="Descargar paquete federado verificable (.json)"
            >
              ↓ Descargar .JSON
            </button>
            <button
              type="button"
              className="btn-toggle"
              onClick={() => void handleLocalDownload('csv')}
              title="Descargar matriz tabular para planilla (.csv)"
            >
              ↓ Descargar .CSV
            </button>
          </div>
        </div>

        <p className="territory-meta" style={{ margin: '0.25rem 0 0' }}>
          {activeTemplateMeta.description}
        </p>

        <div className="export-controls-grid">
          <div className="form-field" style={{ marginTop: 0 }}>
            <label className="tiny-label" htmlFor="export-template-select">
              1. Plantilla de Reporte a Exportar
            </label>
            <select
              id="export-template-select"
              value={reportTemplate}
              onChange={(e) =>
                handleSelectTemplate(e.target.value as ExportReportTemplateKey)
              }
            >
              {TEMPLATE_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field" style={{ marginTop: 0 }}>
            <label className="tiny-label" htmlFor="export-node-select">
              2. Alcance / Nodo Federado
            </label>
            <select
              id="export-node-select"
              value={nodeFilter}
              onChange={(e) => handleSelectNodeFilter(e.target.value)}
            >
              <option value="todos">
                Todos los nodos federados ({territorios.length} territorios)
              </option>
              {territorios.map((t) => (
                <option key={t.id} value={t.key}>
                  {t.nombre} ({t.provincia})
                </option>
              ))}
            </select>
          </div>

          <div className="form-field" style={{ marginTop: 0 }}>
            <label className="tiny-label" htmlFor="export-doc-title">
              3. Título del Documento / Archivo en Docs y Drive
            </label>
            <input
              id="export-doc-title"
              type="text"
              className="export-title-input"
              placeholder="Título del reporte a exportar"
              value={newDocTitle}
              onChange={(e) => setNewDocTitle(e.target.value)}
            />
          </div>
        </div>

        <div className="territory-meta tabular-nums">
          Registros incluidos en esta exportación:{' '}
          <strong>{filteredTerritorios.length}</strong> nodo(s) ·{' '}
          <strong>{filteredFeatures.length}</strong> features H1 ·{' '}
          <strong>{filteredReports.length}</strong> reportes comunitarios ·{' '}
          <strong>{filteredGeometries.length}</strong> geometrías PostGIS H2 ·{' '}
          <strong>{filteredSyntheses.length}</strong> síntesis multi-escala H3 ·{' '}
          <strong>
            {evidencias.filter((e) => e.status === 'ok').length}/{evidencias.length}
          </strong>{' '}
          evidencias HITUB ok
        </div>

        {showPreview && (
          <div className="doc-viewer">
            <div className="tiny-label">
              Vista previa del contenido que se enviará a Google Docs / Google Drive
            </div>
            <pre className="doc-content">{buildReportDocumentText()}</pre>
          </div>
        )}

        {/* Exportación Rápida de Reportes Territoriales Individuales a Google Drive */}
        {filteredReports.length > 0 && (
          <div
            style={{
              marginTop: '0.85rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div className="pane-header">
              <span className="tiny-label">
                Exportación Directa de Reportes Territoriales Individuales a Google Drive ({filteredReports.length})
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.45rem',
                marginTop: '0.45rem',
              }}
            >
              {filteredReports.map((rep) => {
                const nodeObj = territorios.find((t) => t.key === rep.nodeKey);
                return (
                  <button
                    key={rep.id}
                    type="button"
                    className="btn-toggle"
                    onClick={() =>
                      setDriveExportTarget({
                        mode: 'single-report',
                        report: rep,
                        territorio: nodeObj,
                      })
                    }
                    title={`Exportar reporte ${rep.id} (${rep.description}) a Google Drive`}
                  >
                    ☁ {rep.nodeKey.toUpperCase()} · {rep.categoryLabel} (
                    <code>{rep.id}</code>) → Drive
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {workspaceError && <p className="error">Error: {workspaceError}</p>}
      {workspaceNotice && (
        <div className="workspace-feedback-bar">
          <span className="ok">{workspaceNotice}</span>
          {lastCreatedLink && (
            <a
              href={lastCreatedLink.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-confirm link-btn"
            >
              {lastCreatedLink.label} ↗
            </a>
          )}
        </div>
      )}

      {needsAuth ? (
        <div className="auth-box">
          <p className="hint">
            Iniciá sesión con tu cuenta de Google para exportar este reporte directamente a{' '}
            <strong>Google Docs</strong> o guardarlo en <strong>Google Drive</strong> (<code>.JSON</code>, <code>.CSV</code>, <code>.MD</code>), con tu permiso.
          </p>
          <button
            type="button"
            className="gsi-material-button"
            onClick={() => void handleLogin()}
            disabled={isLoggingIn}
          >
            <div className="gsi-material-button-state"></div>
            <div className="gsi-material-button-content-wrapper">
              <div className="gsi-material-button-icon">
                <svg
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 48 48"
                  xmlnsXlink="http://www.w3.org/1999/xlink"
                  style={{ display: 'block' }}
                >
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  ></path>
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  ></path>
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  ></path>
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  ></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
              </div>
              <span className="gsi-material-button-contents">
                {isLoggingIn ? 'Conectando…' : 'Sign in with Google'}
              </span>
              <span style={{ display: 'none' }}>Sign in with Google</span>
            </div>
          </button>
        </div>
      ) : (
        <div className="workspace-grid">
          {/* Columna 1: Exportación a Google Docs + Visor de Docs */}
          <div className="workspace-Pane">
            <div className="pane-header">
              <div>
                <span className="tiny-label">Canal 01 · Google Docs API</span>
                <h3>Exportar Reporte a Google Docs</h3>
              </div>
              <button
                type="button"
                className="btn-confirm"
                onClick={() =>
                  setPendingAction({
                    type: 'create-google-doc',
                    title:
                      newDocTitle.trim() || activeTemplateMeta.defaultTitle,
                    templateLabel: activeTemplateMeta.label,
                    summaryCount: totalItemsInSelectedReport,
                  })
                }
              >
                + Crear Google Doc con este Reporte
              </button>
            </div>

            <p className="territory-meta" style={{ marginTop: '0.35rem' }}>
              Crea un documento nativo en tu cuenta de <strong>Google Docs</strong> con todas las secciones del reporte seleccionado y el sello criptográfico SHA-256.
            </p>

            {docLoading && (
              <p className="hint">Leyendo contenido de Google Docs…</p>
            )}

            {selectedDoc ? (
              <div className="doc-viewer">
                <div className="section-header">
                  <div>
                    <strong>{selectedDoc.title}</strong>
                    <div className="territory-meta">
                      Document ID: <code>{selectedDoc.id}</code>
                    </div>
                  </div>
                  <div className="territory-actions">
                    <button
                      type="button"
                      className="btn-toggle"
                      onClick={() =>
                        setPendingAction({
                          type: 'append-google-doc',
                          docId: selectedDoc.id,
                          docTitle: selectedDoc.title,
                          templateLabel: activeTemplateMeta.label,
                        })
                      }
                    >
                      + Anexar reporte actual
                    </button>
                    <button
                      type="button"
                      className="btn-toggle"
                      onClick={() =>
                        void handleExportDriveDoc(
                          selectedDoc.id,
                          selectedDoc.title,
                          'application/pdf',
                        )
                      }
                    >
                      ↓ PDF
                    </button>
                    <a
                      href={`https://docs.google.com/document/d/${selectedDoc.id}/edit`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-toggle link-btn"
                    >
                      Abrir en Docs ↗
                    </a>
                  </div>
                </div>
                <pre className="doc-content">{selectedDoc.text}</pre>
              </div>
            ) : (
              <div className="sovereignty-notice">
                Hacé clic en <strong>"+ Crear Google Doc con este Reporte"</strong> para generar un nuevo documento en Google Docs, o seleccioná <strong>"Leer Doc"</strong> en cualquier documento de la lista de Google Drive.
              </div>
            )}
          </div>

          {/* Columna 2: Exportación a Google Drive (.JSON, .CSV, .MD) + Explorador Drive */}
          <div className="workspace-Pane">
            <div className="pane-header">
              <div>
                <span className="tiny-label">Canal 02 · Google Drive API</span>
                <h3>Exportar Paquetes a Google Drive</h3>
              </div>
              <div className="territory-actions">
                <button
                  type="button"
                  className="btn-confirm"
                  onClick={() => requestDriveUpload('json')}
                  title="Subir paquete JSON verificable a Google Drive"
                >
                  ↑ Subir .JSON a Drive
                </button>
                <button
                  type="button"
                  className="btn-toggle"
                  onClick={() => requestDriveUpload('csv')}
                  title="Subir matriz CSV a Google Drive"
                >
                  ↑ Subir .CSV a Drive
                </button>
                <button
                  type="button"
                  className="btn-toggle"
                  onClick={() => requestDriveUpload('md')}
                  title="Subir informe Markdown a Google Drive"
                >
                  ↑ Subir .MD a Drive
                </button>
              </div>
            </div>

            <div className="pane-header" style={{ marginTop: '0.85rem' }}>
              <span className="tiny-label">
                Archivos recientes en tu Google Drive ({driveFiles.length})
              </span>
              <div className="search-row">
                <input
                  type="text"
                  placeholder="Buscar archivo en Drive…"
                  value={driveSearch}
                  onChange={(e) => setDriveSearch(e.target.value)}
                />
                <button
                  type="button"
                  className="btn-filter"
                  onClick={() => void loadDriveFiles(driveSearch)}
                  disabled={driveLoading}
                >
                  {driveLoading ? '…' : 'Buscar'}
                </button>
              </div>
            </div>

            {driveLoading ? (
              <p className="hint">Cargando archivos de Google Drive…</p>
            ) : driveFiles.length === 0 ? (
              <p className="empty-state">No se encontraron archivos en Drive.</p>
            ) : (
              <ul className="territory-list">
                {driveFiles.map((file) => {
                  const isGoogleDoc =
                    file.mimeType === 'application/vnd.google-apps.document';
                  return (
                    <li key={file.id} className="territory-item">
                      <div className="territory-info">
                        <span className="territory-name">{file.name}</span>
                        <span className="territory-meta">
                          <code>{file.mimeType}</code>
                        </span>
                      </div>
                      <div className="territory-actions">
                        {isGoogleDoc && (
                          <>
                            <button
                              type="button"
                              className="btn-toggle"
                              onClick={() => void handleReadDoc(file.id)}
                            >
                              Leer Doc
                            </button>
                            <button
                              type="button"
                              className="btn-toggle"
                              onClick={() =>
                                void handleExportDriveDoc(
                                  file.id,
                                  file.name,
                                  'application/pdf',
                                )
                              }
                              title="Exportar Google Doc como PDF desde Drive"
                            >
                              PDF
                            </button>
                          </>
                        )}
                        {file.webViewLink && (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-toggle link-btn"
                          >
                            Abrir ↗
                          </a>
                        )}
                        <button
                          type="button"
                          className="btn-toggle btn-danger"
                          onClick={() =>
                            setPendingAction({ type: 'delete-drive-file', file })
                          }
                        >
                          Eliminar
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Modal de Confirmación Explícita para operaciones en Google Workspace */}
      {pendingAction && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <h3>Confirmar acción en Google Workspace</h3>
            {pendingAction.type === 'delete-drive-file' && (
              <p>
                ¿Estás seguro de que querés eliminar permanentemente el archivo{' '}
                <strong>"{pendingAction.file.name}"</strong> de tu Google Drive?
              </p>
            )}
            {pendingAction.type === 'create-google-doc' && (
              <p>
                ¿Confirmás la creación del documento{' '}
                <strong>"{pendingAction.title}"</strong> en tu cuenta de{' '}
                <strong>Google Docs</strong> con la plantilla{' '}
                <em>{pendingAction.templateLabel}</em> ({pendingAction.summaryCount}{' '}
                registros territoriales consolidados)?
              </p>
            )}
            {pendingAction.type === 'append-google-doc' && (
              <p>
                ¿Confirmás actualizar el documento de Google Docs{' '}
                <strong>"{pendingAction.docTitle}"</strong> insertando el reporte{' '}
                <em>{pendingAction.templateLabel}</em>?
              </p>
            )}
            {pendingAction.type === 'upload-drive-report' && (
              <p>
                ¿Confirmás subir el archivo{' '}
                <strong>"{pendingAction.fileName}"</strong> (
                <code>{pendingAction.mimeType}</code>) a tu{' '}
                <strong>Google Drive</strong> con los datos de{' '}
                <em>{pendingAction.templateLabel}</em>?
              </p>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="btn-toggle"
                onClick={() => setPendingAction(null)}
                disabled={executingAction}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={
                  pendingAction.type === 'delete-drive-file'
                    ? 'btn-confirm btn-danger-solid'
                    : 'btn-confirm'
                }
                onClick={() => void executeConfirmedAction()}
                disabled={executingAction}
              >
                {executingAction ? 'Procesando…' : 'Confirmar exportación'}
              </button>
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
