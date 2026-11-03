/**
 * Exportación de reportes territoriales — DELocalSoy.AR
 *
 * GOOGLE DRIVE DESHABILITADO por decisión de la Dirección Humana (2026-11-03):
 * los reportes territoriales no salen del territorio (soberanía del dato).
 * Este módulo conserva las firmas exportadas y los formateadores puros (json/
 * md/csv/gdoc) para la descarga local; toda operación de red contra Drive lanza
 * un error explícito. Nada se simula (R15).
 */

import type { User } from 'firebase/auth';
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
 * Configuración de Drive DESHABILITADA (decisión DH 2026-11-03):
 * `isConfigured: false` es la señal honesta para que las UI muestren la
 * exportación como no disponible; no hay credenciales de Google.
 */
export function getFirebaseAppletDriveConfig(): FirebaseAppletDriveConfig {
  return {
    projectId: '',
    appId: '',
    authDomain: '',
    storageBucket: '',
    oAuthClientId: '',
    scopes: [],
    isConfigured: false,
  };
}

/**
 * @deprecated No-op: no hay sesión de Google. Invoca `onAuthFailure` (si existe)
 * de inmediato y devuelve una desuscripción sin efecto.
 */
export function subscribeToDriveAuth(
  _onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void,
): () => void {
  if (onAuthFailure) onAuthFailure();
  return () => {};
}

/** @deprecated Deshabilitado (decisión DH 2026-11-03). Devuelve siempre `null`. */
export async function authenticateWithGoogleDrive(): Promise<{
  user: User;
  accessToken: string;
  config: FirebaseAppletDriveConfig;
} | null> {
  return null;
}

/** @deprecated Deshabilitado. Devuelve siempre `null`. */
export async function getDriveAccessToken(): Promise<string | null> {
  return null;
}

/** @deprecated No-op: no hay sesión de Google que cerrar. */
export async function signOutFromGoogleDrive(): Promise<void> {}

const DRIVE_DISABLED_ERROR =
  'Exportación a Google Drive deshabilitada en DELocalSoy.AR — decisión DH 2026-11-03 (soberanía del dato: los reportes territoriales no salen del territorio). Usá la descarga local.';
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

/** @deprecated Deshabilitado (decisión DH 2026-11-03): lanza error explícito. */
export async function exportTerritorialReportToDrive(
  _options: DriveUploadRequestOptions,
): Promise<DriveUploadResult> {
  throw new Error(DRIVE_DISABLED_ERROR);
}

/** @deprecated Deshabilitado (decisión DH 2026-11-03): lanza error explícito. */
export async function listDriveFiles(
  _searchQuery = '',
  _pageSize = 15,
): Promise<DriveFileRecord[]> {
  throw new Error(DRIVE_DISABLED_ERROR);
}

/** @deprecated Deshabilitado (decisión DH 2026-11-03): lanza error explícito. */
export async function exportDriveFileAsBlob(
  _fileId: string,
  _exportMime: 'application/pdf' | 'text/plain',
): Promise<Blob> {
  throw new Error(DRIVE_DISABLED_ERROR);
}

/** @deprecated Deshabilitado (decisión DH 2026-11-03): lanza error explícito. */
export async function deleteDriveFileById(_fileId: string): Promise<void> {
  throw new Error(DRIVE_DISABLED_ERROR);
}
