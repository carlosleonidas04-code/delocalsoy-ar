import type { User } from 'firebase/auth';
import firebaseConfig from '../lib/firebaseConfig';
import {
  SCOPES,
  getAccessToken,
  googleSignIn,
  initAuth,
  logout,
} from '../lib/auth';
import type { Territorio } from '../App';
import {
  REPORT_STATUS_META,
  STATUS_META,
  type TerritorialReport,
  type TerritorioFeature,
} from '../data/federatedModel';

export interface FirebaseAppletDriveConfig {
  projectId: string;
  appId: string;
  authDomain: string;
  storageBucket: string;
  oAuthClientId: string;
  scopes: string[];
  isConfigured: boolean;
}

export interface DriveFileRecord {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  webViewLink?: string;
}

export type DriveReportFileFormat = 'json' | 'md' | 'csv' | 'gdoc';

export interface DriveUploadRequestOptions {
  fileName: string;
  content: string;
  format: DriveReportFileFormat;
  description?: string;
}

export interface DriveUploadResult {
  file: DriveFileRecord;
  webViewLink: string;
  exportedAt: string;
  projectId: string;
}

/**
 * Obtiene y valida los metadatos de configuración provistos en `firebase-applet-config.json`
 * para la autenticación OAuth 2.0 con Google Drive API.
 */
export function getFirebaseAppletDriveConfig(): FirebaseAppletDriveConfig {
  const projectId = firebaseConfig.projectId || '';
  const appId = firebaseConfig.appId || '';
  const authDomain = firebaseConfig.authDomain || '';
  const storageBucket = firebaseConfig.storageBucket || '';
  const oAuthClientId = firebaseConfig.oAuthClientId || '';

  return {
    projectId,
    appId,
    authDomain,
    storageBucket,
    oAuthClientId,
    scopes: SCOPES,
    isConfigured: Boolean(projectId && appId && authDomain && oAuthClientId),
  };
}

/**
 * Suscribe el estado de autenticación de Firebase Auth + Google Drive API
 * manteniendo el token OAuth únicamente en memoria (`cachedAccessToken`).
 */
export function subscribeToDriveAuth(
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void,
): () => void {
  return initAuth(onAuthSuccess, onAuthFailure);
}

/**
 * Inicia el flujo de autenticación con Google Drive API utilizando las credenciales
 * de `firebase-applet-config.json`.
 */
export async function authenticateWithGoogleDrive(): Promise<{
  user: User;
  accessToken: string;
  config: FirebaseAppletDriveConfig;
} | null> {
  const result = await googleSignIn();
  if (!result) return null;
  return {
    user: result.user,
    accessToken: result.accessToken,
    config: getFirebaseAppletDriveConfig(),
  };
}

/**
 * Obtiene el token de acceso OAuth en memoria para llamadas a Google Drive API.
 */
export async function getDriveAccessToken(): Promise<string | null> {
  return getAccessToken();
}

/**
 * Cierra la sesión de Firebase Auth y limpia el token OAuth en memoria.
 */
export async function signOutFromGoogleDrive(): Promise<void> {
  await logout();
}

/**
 * Resuelve el MIME type de origen y destino en Google Drive según el formato elegido.
 */
export function resolveDriveFormatMeta(format: DriveReportFileFormat): {
  extension: string;
  contentMimeType: string;
  driveTargetMimeType: string;
  label: string;
} {
  switch (format) {
    case 'json':
      return {
        extension: 'json',
        contentMimeType: 'application/json',
        driveTargetMimeType: 'application/json',
        label: 'Paquete JSON Verificable (.json)',
      };
    case 'csv':
      return {
        extension: 'csv',
        contentMimeType: 'text/csv',
        driveTargetMimeType: 'text/csv',
        label: 'Matriz Tabular CSV (.csv)',
      };
    case 'gdoc':
      return {
        extension: 'gdoc',
        contentMimeType: 'text/plain',
        driveTargetMimeType: 'application/vnd.google-apps.document',
        label: 'Documento Nativo de Google Drive / Docs',
      };
    case 'md':
    default:
      return {
        extension: 'md',
        contentMimeType: 'text/markdown',
        driveTargetMimeType: 'text/markdown',
        label: 'Acta Técnica Markdown (.md)',
      };
  }
}

/**
 * Construye el contenido de un Reporte Territorial individual (`TerritorialReport`)
 * en el formato solicitado (`.json`, `.md`, `.csv` o `gdoc`).
 */
export function formatSingleTerritorialReport(
  report: TerritorialReport,
  territorio: Territorio | undefined,
  format: DriveReportFileFormat,
): string {
  const config = getFirebaseAppletDriveConfig();
  const exportedAt = new Date().toISOString();
  const statusLabel = REPORT_STATUS_META[report.status]?.label ?? report.status;
  const nodeName = territorio?.nombre ?? report.nodeKey.toUpperCase();
  const provincia = territorio?.provincia ?? 'Región Cuyo';

  if (format === 'json') {
    return JSON.stringify(
      {
        schema: 'delocalsoy.ar/territorial-report-item/v1.0',
        exportedAt,
        firebaseProjectId: config.projectId,
        ethicalContract: {
          requiresHumanReview: true,
          humanReviewed: Boolean(report.humanReviewed),
        },
        node: {
          key: report.nodeKey,
          name: nodeName,
          provincia,
          id: territorio?.id ?? `node-${report.nodeKey}`,
        },
        report: {
          id: report.id,
          category: report.category,
          categoryLabel: report.categoryLabel,
          description: report.description,
          status: report.status,
          statusLabel,
          coordinatesSchematic: report.picked,
          createdAt: report.createdAt,
          eventId: report.eventId,
          history: report.history,
        },
      },
      null,
      2,
    );
  }

  if (format === 'csv') {
    const escapeCsv = (val: string | number | boolean | null | undefined) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headers = [
      'REPORTE_ID',
      'NODO_KEY',
      'NODO_NOMBRE',
      'PROVINCIA',
      'CATEGORIA_CODIGO',
      'CATEGORIA_LABEL',
      'ESTADO',
      'DESCRIPCION',
      'COORD_X',
      'COORD_Y',
      'EVENTO_INMUTABLE',
      'REVISION_HUMANA',
      'HISTORIAL_ESTADOS',
      'FECHA_CREACION',
    ];
    const row = [
      report.id,
      report.nodeKey,
      nodeName,
      provincia,
      report.category,
      report.categoryLabel,
      statusLabel,
      report.description,
      report.picked.x,
      report.picked.y,
      report.eventId,
      report.humanReviewed ? 'VERIFICADA' : 'PENDIENTE',
      report.history
        .map((h) => `${REPORT_STATUS_META[h.status]?.label ?? h.status} (${h.at})`)
        .join(' -> '),
      report.createdAt,
    ];
    return [headers.join(','), row.map(escapeCsv).join(',')].join('\n');
  }

  // Formato Markdown / Google Doc
  return [
    `======================================================================`,
    `REPORTE TERRITORIAL FEDERADO — ${report.categoryLabel.toUpperCase()}`,
    `======================================================================`,
    `Plataforma: DELocalSoy.AR · Hub de Transformación e Innovación Territorial (HITUB)`,
    `Proyecto Firebase / GCP: ${config.projectId} (${config.authDomain})`,
    `Fecha de Exportación (UTC): ${exportedAt}`,
    `Contrato Ético Tripartito: requiresHumanReview = true`,
    `----------------------------------------------------------------------`,
    ``,
    `1. IDENTIFICACIÓN DEL NODO Y REPORTE`,
    `   • ID del Reporte: ${report.id}`,
    `   • Nodo Territorial: ${nodeName} (${provincia}) [Clave: ${report.nodeKey}]`,
    `   • Categoría Vernácula: ${report.categoryLabel} (${report.category})`,
    `   • Estado Operativo Actual: ${statusLabel} (${report.status})`,
    `   • Revisión Humana Responsable: ${report.humanReviewed ? 'Verificada en events_raw' : 'Pendiente de firma colegiada'}`,
    ``,
    `2. OBSERVACIÓN TERRITORIAL (DATO INMUTABLE)`,
    `   "${report.description}"`,
    `   • Coordenada Esquemática Local: X=${report.picked.x}, Y=${report.picked.y}`,
    `   • Fecha de Relevamiento: ${report.createdAt}`,
    `   • Evento Inmutable Asociado (events_raw): ${report.eventId}`,
    ``,
    `3. TRAZABILIDAD DEL CICLO DE VIDA`,
    ...report.history.map(
      (h, idx) =>
        `   [${idx + 1}] ${REPORT_STATUS_META[h.status]?.label ?? h.status} — Fecha: ${h.at}`,
    ),
    ``,
  ].join('\n');
}

/**
 * Construye un paquete consolidado con todos los reportes territoriales y activos
 * de un nodo federado para su exportación a Google Drive.
 */
export function formatNodeTerritorialReportsBundle(
  territorio: Territorio,
  reports: TerritorialReport[],
  features: TerritorioFeature[],
  format: DriveReportFileFormat,
): string {
  const config = getFirebaseAppletDriveConfig();
  const exportedAt = new Date().toISOString();
  const nodeReports = reports.filter((r) => r.nodeKey === territorio.key);
  const nodeFeatures = features.filter((f) => f.nodeKey === territorio.key);

  if (format === 'json') {
    return JSON.stringify(
      {
        schema: 'delocalsoy.ar/node-territorial-reports-bundle/v1.0',
        exportedAt,
        firebaseProjectId: config.projectId,
        ethicalContract: {
          requiresHumanReview: true,
        },
        territorio: {
          id: territorio.id,
          key: territorio.key,
          nombre: territorio.nombre,
          provincia: territorio.provincia,
          foco: territorio.foco,
          poblacion: territorio.poblacion,
        },
        summary: {
          totalReports: nodeReports.length,
          activeReports: nodeReports.filter((r) => r.status !== 'resolved').length,
          resolvedReports: nodeReports.filter((r) => r.status === 'resolved').length,
          totalFeatures: nodeFeatures.length,
          verifiedAssets: nodeFeatures.filter(
            (f) =>
              f.type === 'asset' &&
              (f.status === 'verified' || f.status === 'community_validated'),
          ).length,
        },
        reports: nodeReports,
        features: nodeFeatures,
      },
      null,
      2,
    );
  }

  if (format === 'csv') {
    const escapeCsv = (val: string | number | boolean | null | undefined) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows: string[][] = [
      [
        'TIPO_REGISTRO',
        'ID',
        'NODO',
        'CATEGORIA_O_CAPA',
        'TITULO_O_DESCRIPCION',
        'ESTADO',
        'COORDENADAS',
        'EVENTO_O_FUENTE',
        'FECHA',
      ],
    ];

    for (const r of nodeReports) {
      rows.push([
        'REPORTE_TERRITORIAL',
        r.id,
        territorio.nombre,
        r.categoryLabel,
        r.description,
        REPORT_STATUS_META[r.status]?.label ?? r.status,
        `(${r.picked.x}, ${r.picked.y})`,
        r.eventId,
        r.createdAt,
      ]);
    }

    for (const f of nodeFeatures) {
      rows.push([
        f.type === 'asset' ? 'ACTIVO_TERRITORIAL' : 'PROBLEMATICA_CARTOGRAFIADA',
        f.id,
        territorio.nombre,
        f.layer,
        f.title,
        STATUS_META[f.status]?.label ?? f.status,
        `(${f.x}, ${f.y})`,
        f.sourceLabel,
        f.observedAt,
      ]);
    }

    return rows.map((row) => row.map(escapeCsv).join(',')).join('\n');
  }

  return [
    `======================================================================`,
    `DOSSIER DE REPORTES TERRITORIALES — NODO ${territorio.nombre.toUpperCase()}`,
    `======================================================================`,
    `Plataforma: DELocalSoy.AR · Hub de Transformación e Innovación Territorial (HITUB)`,
    `Proyecto Firebase / GCP: ${config.projectId} (${config.authDomain})`,
    `Nodo Federado: ${territorio.nombre} (${territorio.provincia}) · ID: ${territorio.id}`,
    `Vocación Territorial: ${territorio.foco ?? 'Relevamiento comunitario y activos locales'}`,
    `Fecha de Exportación (UTC): ${exportedAt}`,
    `Contrato Ético Tripartito: requiresHumanReview = true`,
    `----------------------------------------------------------------------`,
    ``,
    `1. REPORTES TERRITORIALES DEL NODO (${nodeReports.length})`,
    ...(nodeReports.length === 0
      ? ['   (Sin reportes territoriales registrados en este corte)']
      : nodeReports.map(
          (r, idx) =>
            `   [${idx + 1}] ${r.categoryLabel} (${r.id}) — Estado: ${REPORT_STATUS_META[r.status]?.label ?? r.status}\n       Descripción: "${r.description}"\n       Coordenada: (${r.picked.x}, ${r.picked.y}) · Creado: ${r.createdAt} · Evento: ${r.eventId}`,
        )),
    ``,
    `2. ACTIVOS Y OBSERVACIONES GEORREFERENCIADAS (${nodeFeatures.length})`,
    ...nodeFeatures.map(
      (f, idx) =>
        `   [${idx + 1}] (${f.type === 'asset' ? 'ACTIVO' : 'PROBLEMÁTICA'} · ${f.layer}) ${f.title} — Estado: ${STATUS_META[f.status]?.label ?? f.status} — Fuente: ${f.sourceLabel} (${f.observedAt})`,
    ),
    ``,
  ].join('\n');
}

/**
 * Sube y exporta un reporte territorial directamente a Google Drive API v3 (`multipart/related`),
 * utilizando el token OAuth obtenido mediante la configuración de `firebase-applet-config.json`.
 */
export async function exportTerritorialReportToDrive(
  options: DriveUploadRequestOptions,
): Promise<DriveUploadResult> {
  const token = await getDriveAccessToken();
  if (!token) {
    throw new Error(
      'No hay una sesión activa con Google Drive. Iniciá sesión con Google para autorizar la exportación.',
    );
  }

  const config = getFirebaseAppletDriveConfig();
  const formatMeta = resolveDriveFormatMeta(options.format);

  const cleanBaseName = options.fileName
    .replace(/\.(json|csv|md|gdoc|txt)$/i, '')
    .trim();
  const finalFileName =
    options.format === 'gdoc'
      ? cleanBaseName
      : `${cleanBaseName}.${formatMeta.extension}`;

  const metadata = {
    name: finalFileName,
    mimeType: formatMeta.driveTargetMimeType,
    description:
      options.description ||
      `Reporte territorial exportado desde DELocalSoy.AR (Proyecto: ${config.projectId})`,
  };

  const boundary = 'delocalsoy_drive_service_boundary_2026';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelim = `\r\n--${boundary}--`;

  const multipartBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${formatMeta.contentMimeType}; charset=UTF-8\r\n\r\n` +
    options.content +
    closeDelim;

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,modifiedTime,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    },
  );

  if (uploadRes.status === 401 || uploadRes.status === 403) {
    throw new Error(
      'Sesión expirada o permisos insuficientes en Google Drive API. Volvé a iniciar sesión con Google.',
    );
  }

  if (!uploadRes.ok) {
    throw new Error(
      `Google Drive API respondió HTTP ${uploadRes.status} al exportar el reporte.`,
    );
  }

  const uploadedFile = (await uploadRes.json()) as DriveFileRecord;
  const webViewLink =
    uploadedFile.webViewLink ||
    (uploadedFile.mimeType === 'application/vnd.google-apps.document'
      ? `https://docs.google.com/document/d/${uploadedFile.id}/edit`
      : `https://drive.google.com/file/d/${uploadedFile.id}/view`);

  return {
    file: uploadedFile,
    webViewLink,
    exportedAt: new Date().toISOString(),
    projectId: config.projectId,
  };
}

/**
 * Lista archivos de la cuenta de Google Drive del usuario autenticado.
 */
export async function listDriveFiles(
  searchQuery = '',
  pageSize = 15,
): Promise<DriveFileRecord[]> {
  const token = await getDriveAccessToken();
  if (!token) {
    throw new Error('Autenticación requerida para listar archivos de Google Drive.');
  }

  const qParts = ['trashed = false'];
  if (searchQuery.trim()) {
    const escaped = searchQuery.trim().replace(/'/g, "\\'");
    qParts.push(`name contains '${escaped}'`);
  }

  const params = new URLSearchParams({
    pageSize: String(pageSize),
    fields: 'files(id,name,mimeType,modifiedTime,webViewLink)',
    orderBy: 'modifiedTime desc',
    q: qParts.join(' and '),
  });

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (res.status === 401 || res.status === 403) {
    throw new Error(
      'Sesión expirada o permisos insuficientes. Volvé a iniciar sesión con Google.',
    );
  }

  if (!res.ok) {
    throw new Error(`Google Drive API respondió HTTP ${res.status}`);
  }

  const data = (await res.json()) as { files?: DriveFileRecord[] };
  return data.files ?? [];
}

/**
 * Exporta un documento de Google Drive (por ejemplo un Google Doc) como Blob (PDF o TXT).
 */
export async function exportDriveFileAsBlob(
  fileId: string,
  exportMime: 'application/pdf' | 'text/plain',
): Promise<Blob> {
  const token = await getDriveAccessToken();
  if (!token) {
    throw new Error('Autenticación requerida para exportar desde Google Drive.');
  }

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export?mimeType=${encodeURIComponent(exportMime)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!res.ok) {
    throw new Error(
      `No se pudo exportar el documento desde Google Drive (HTTP ${res.status})`,
    );
  }

  return res.blob();
}

/**
 * Elimina un archivo de Google Drive previa confirmación explícita del usuario.
 */
export async function deleteDriveFileById(fileId: string): Promise<void> {
  const token = await getDriveAccessToken();
  if (!token) {
    throw new Error('Autenticación requerida para eliminar archivos en Google Drive.');
  }

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!res.ok) {
    throw new Error(`No se pudo eliminar el archivo de Google Drive (HTTP ${res.status})`);
  }
}
