import { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import type { Territorio } from '../App';
import type {
  TerritorialReport,
  TerritorioFeature,
} from '../data/federatedModel';
import type { ExportReportTemplateKey } from './WorkspacePanel';
import {
  authenticateWithGoogleDrive,
  exportTerritorialReportToDrive,
  formatNodeTerritorialReportsBundle,
  formatSingleTerritorialReport,
  getDriveAccessToken,
  getFirebaseAppletDriveConfig,
  resolveDriveFormatMeta,
  signOutFromGoogleDrive,
  subscribeToDriveAuth,
  type DriveReportFileFormat,
} from '../services/googleDriveService';

export type DriveExportTarget =
  | {
      mode: 'single-report';
      report: TerritorialReport;
      territorio?: Territorio;
    }
  | {
      mode: 'node-bundle';
      territorio: Territorio;
      reports: TerritorialReport[];
      features: TerritorioFeature[];
    };

interface DriveReportExportModalProps {
  target: DriveExportTarget | null;
  onClose: () => void;
  onExportVerified?: (exportMeta: {
    channel: 'google-docs' | 'google-drive' | 'local-download';
    template: ExportReportTemplateKey;
    title: string;
    fileId?: string;
    webViewLink?: string;
  }) => Promise<void>;
}

const FORMAT_OPTIONS: Array<{
  key: DriveReportFileFormat;
  shortLabel: string;
  description: string;
}> = [
  {
    key: 'json',
    shortLabel: 'Paquete .JSON',
    description:
      'Estructura verificable con linaje de eventos, coordenadas esquemáticas y metadatos de firebase-applet-config.json.',
  },
  {
    key: 'md',
    shortLabel: 'Acta .MD',
    description:
      'Documento técnico en Markdown legible para actas públicas, repositorios y auditoría.',
  },
  {
    key: 'csv',
    shortLabel: 'Matriz .CSV',
    description:
      'Tabla compatible con Google Sheets y herramientas SIG para análisis tabular.',
  },
  {
    key: 'gdoc',
    shortLabel: 'Google Doc Nativo',
    description:
      'Convierte automáticamente el reporte en un documento editable de Google Docs dentro de tu Google Drive.',
  },
];

export function DriveReportExportModal({
  target,
  onClose,
  onExportVerified,
}: DriveReportExportModalProps) {
  const configMeta = useMemo(() => getFirebaseAppletDriveConfig(), []);

  const [user, setUser] = useState<User | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const [format, setFormat] = useState<DriveReportFileFormat>('json');
  const [customFileName, setCustomFileName] = useState('');
  const [showPreview, setShowPreview] = useState(true);
  const [confirmStep, setConfirmStep] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<{
    fileName: string;
    fileId: string;
    webViewLink: string;
  } | null>(null);

  useEffect(() => {
    const unsub = subscribeToDriveAuth(
      (loggedUser) => {
        setUser(loggedUser);
        setNeedsAuth(false);
      },
      () => {
        setUser(null);
        setNeedsAuth(true);
      },
    );
    void getDriveAccessToken().then((token) => {
      if (token) setNeedsAuth(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!target) return;
    setErrorMsg(null);
    setUploadSuccess(null);
    setConfirmStep(false);

    if (target.mode === 'single-report') {
      const slug = target.report.categoryLabel
        .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ _-]+/g, '')
        .trim()
        .replace(/\s+/g, '_');
      setCustomFileName(
        `Reporte_${target.report.nodeKey.toUpperCase()}_${target.report.id}_${slug}`,
      );
    } else {
      const slug = target.territorio.nombre
        .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ _-]+/g, '')
        .trim()
        .replace(/\s+/g, '_');
      setCustomFileName(`Dossier_Reportes_Nodo_${slug}_DELocalSoy`);
    }
  }, [target]);

  const generatedContent = useMemo(() => {
    if (!target) return '';
    if (target.mode === 'single-report') {
      return formatSingleTerritorialReport(
        target.report,
        target.territorio,
        format,
      );
    }
    return formatNodeTerritorialReportsBundle(
      target.territorio,
      target.reports,
      target.features,
      format,
    );
  }, [target, format]);

  if (!target) return null;

  const formatMeta = resolveDriveFormatMeta(format);
  const effectiveFileName =
    format === 'gdoc'
      ? customFileName.trim() || 'Reporte_Territorial_DELocalSoy'
      : `${(customFileName.trim() || 'Reporte_Territorial_DELocalSoy').replace(/\.(json|csv|md|gdoc)$/i, '')}.${formatMeta.extension}`;

  const handleGoogleLogin = async () => {
    setIsSigningIn(true);
    setErrorMsg(null);
    try {
      const res = await authenticateWithGoogleDrive();
      if (res) {
        setUser(res.user);
        setNeedsAuth(false);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Error al autenticar con Google Drive API',
      );
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    await signOutFromGoogleDrive();
    setUser(null);
    setNeedsAuth(true);
    setConfirmStep(false);
  };

  const handleConfirmUploadToDrive = async () => {
    setIsUploading(true);
    setErrorMsg(null);
    try {
      const description =
        target.mode === 'single-report'
          ? `Reporte Territorial ${target.report.id} (${target.report.categoryLabel}) — Nodo ${target.report.nodeKey.toUpperCase()} — DELocalSoy.AR`
          : `Dossier de Reportes Territoriales del Nodo ${target.territorio.nombre} — DELocalSoy.AR`;

      const result = await exportTerritorialReportToDrive({
        fileName: customFileName.trim() || 'Reporte_Territorial_DELocalSoy',
        content: generatedContent,
        format,
        description,
      });

      setUploadSuccess({
        fileName: result.file.name,
        fileId: result.file.id,
        webViewLink: result.webViewLink,
      });
      setConfirmStep(false);

      if (onExportVerified) {
        await onExportVerified({
          channel: format === 'gdoc' ? 'google-docs' : 'google-drive',
          template: 'reportes-h1',
          title: result.file.name,
          fileId: result.file.id,
          webViewLink: result.webViewLink,
        });
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'No se pudo completar la exportación a Google Drive.',
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleLocalFallbackDownload = async () => {
    const ext = format === 'gdoc' ? 'md' : formatMeta.extension;
    const blob = new Blob([generatedContent], {
      type: `${formatMeta.contentMimeType};charset=utf-8`,
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(customFileName.trim() || 'Reporte_Territorial').replace(/\.(json|csv|md|gdoc)$/i, '')}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (onExportVerified) {
      await onExportVerified({
        channel: 'local-download',
        template: 'reportes-h1',
        title: a.download,
      });
    }
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drive-export-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isUploading) {
          onClose();
        }
      }}
    >
      <div
        className="modal-card"
        style={{ maxWidth: '760px', width: '94vw', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="section-header" style={{ marginBottom: '0.65rem' }}>
          <div>
            <span className="kicker-text">
              Servicio Google Drive API v3 · Configuración{' '}
              <code>firebase-applet-config.json</code>
            </span>
            <h3 id="drive-export-modal-title" style={{ margin: '0.2rem 0 0' }}>
              {target.mode === 'single-report'
                ? `Exportar Reporte Territorial (${target.report.id}) a Google Drive`
                : `Exportar Dossier de Reportes de ${target.territorio.nombre} a Google Drive`}
            </h3>
          </div>
          <button
            type="button"
            className="btn-toggle"
            onClick={onClose}
            disabled={isUploading}
          >
            ✕ Cerrar
          </button>
        </div>

        {/* Estado de Configuración leída de firebase-applet-config.json */}
        <div
          className="territory-meta tabular-nums"
          style={{
            padding: '0.55rem 0.75rem',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '6px',
            marginBottom: '0.85rem',
          }}
        >
          Proyecto Firebase: <code>{configMeta.projectId}</code> · Auth Domain:{' '}
          <code>{configMeta.authDomain}</code> · OAuth Client:{' '}
          <code>{configMeta.oAuthClientId.slice(0, 18)}…</code> · Estado:{' '}
          <strong style={{ color: configMeta.isConfigured ? '#2e9e5b' : '#d99b26' }}>
            {configMeta.isConfigured ? 'Configuración OAuth Activa' : 'Incompleta'}
          </strong>
        </div>

        {/* Bloque de Autenticación con Google Drive API */}
        <div
          style={{
            padding: '0.75rem',
            background: 'rgba(46, 158, 91, 0.06)',
            border: '1px solid rgba(46, 158, 91, 0.25)',
            borderRadius: '6px',
            marginBottom: '0.9rem',
          }}
        >
          {needsAuth ? (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
              }}
            >
              <div style={{ flex: '1 1 280px' }}>
                <strong style={{ display: 'block', fontSize: '0.88rem' }}>
                  Autenticación con Google Drive requerida
                </strong>
                <span className="territory-meta">
                  Iniciá sesión con tu cuenta de Google para autorizar la creación del archivo en tu Google Drive, con tu permiso.
                </span>
              </div>
              <button
                type="button"
                className="gsi-material-button"
                onClick={() => void handleGoogleLogin()}
                disabled={isSigningIn}
              >
                <div className="gsi-material-button-state"></div>
                <div className="gsi-material-button-content-wrapper">
                  <div className="gsi-material-button-icon">
                    <svg
                      version="1.1"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 48 48"
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
                    {isSigningIn ? 'Conectando…' : 'Sign in with Google'}
                  </span>
                </div>
              </button>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem',
              }}
            >
              <span className="territory-meta">
                ● Conectado a Google Drive API como{' '}
                <strong style={{ color: '#2e9e5b' }}>
                  {user?.email ?? user?.displayName ?? 'Usuario autenticado'}
                </strong>
              </span>
              <button
                type="button"
                className="btn-toggle"
                onClick={() => void handleGoogleLogout()}
              >
                Cambiar cuenta / Cerrar sesión
              </button>
            </div>
          )}
        </div>

        {/* Selector de formato y nombre de archivo */}
        <div className="form-field" style={{ marginTop: 0 }}>
          <label className="tiny-label">
            1. Formato de Archivo Destino en Google Drive
          </label>
          <div
            className="filter-group"
            style={{ marginTop: '0.35rem', flexWrap: 'wrap' }}
          >
            {FORMAT_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                className={
                  format === opt.key ? 'btn-filter active' : 'btn-filter'
                }
                onClick={() => {
                  setFormat(opt.key);
                  setConfirmStep(false);
                }}
              >
                {opt.shortLabel}
              </button>
            ))}
          </div>
          <span className="territory-meta" style={{ marginTop: '0.3rem', display: 'block' }}>
            {FORMAT_OPTIONS.find((o) => o.key === format)?.description} · MIME destino:{' '}
            <code>{formatMeta.driveTargetMimeType}</code>
          </span>
        </div>

        <div className="form-field" style={{ marginTop: '0.75rem' }}>
          <label className="tiny-label" htmlFor="drive-export-filename">
            2. Nombre del Archivo a Crear en Google Drive
          </label>
          <input
            id="drive-export-filename"
            type="text"
            className="export-title-input"
            value={customFileName}
            onChange={(e) => {
              setCustomFileName(e.target.value);
              setConfirmStep(false);
            }}
          />
          <span className="territory-meta" style={{ marginTop: '0.25rem', display: 'block' }}>
            Nombre final en Drive: <code>{effectiveFileName}</code>
          </span>
        </div>

        {/* Vista previa del contenido */}
        <div style={{ marginTop: '0.75rem' }}>
          <div className="pane-header">
            <span className="tiny-label">
              3. Vista Previa del Contenido a Exportar ({generatedContent.length} bytes)
            </span>
            <button
              type="button"
              className="btn-toggle"
              onClick={() => setShowPreview((p) => !p)}
            >
              {showPreview ? 'Ocultar vista previa' : 'Mostrar vista previa'}
            </button>
          </div>
          {showPreview && (
            <pre
              className="doc-content"
              style={{
                maxHeight: '190px',
                overflowY: 'auto',
                marginTop: '0.4rem',
                fontSize: '0.76rem',
              }}
            >
              {generatedContent}
            </pre>
          )}
        </div>

        {errorMsg && (
          <p className="error" style={{ marginTop: '0.75rem' }}>
            Error: {errorMsg}
          </p>
        )}

        {uploadSuccess && (
          <div
            className="workspace-feedback-bar"
            style={{ marginTop: '0.85rem' }}
          >
            <span className="ok">
              ✓ Archivo <strong>"{uploadSuccess.fileName}"</strong> exportado exitosamente a tu Google Drive (ID: <code>{uploadSuccess.fileId}</code>).
            </span>
            <a
              href={uploadSuccess.webViewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-confirm link-btn"
            >
              Abrir en Google Drive ↗
            </a>
          </div>
        )}

        {/* Paso de confirmación explícita obligatoria antes de mutar Google Drive */}
        {confirmStep && !needsAuth && (
          <div
            style={{
              marginTop: '0.85rem',
              padding: '0.8rem',
              background: 'rgba(245, 200, 66, 0.08)',
              border: '1px solid rgba(245, 200, 66, 0.35)',
              borderRadius: '6px',
            }}
          >
            <strong style={{ display: 'block', fontSize: '0.9rem' }}>
              Confirmar creación de archivo en Google Drive
            </strong>
            <p className="territory-meta" style={{ margin: '0.35rem 0 0.65rem' }}>
              ¿Confirmás subir y crear el archivo{' '}
              <strong>"{effectiveFileName}"</strong> (
              <code>{formatMeta.driveTargetMimeType}</code>) en la cuenta de Google Drive de{' '}
              <strong>{user?.email ?? 'tu usuario'}</strong>?
            </p>
            <div className="territory-actions">
              <button
                type="button"
                className="btn-toggle"
                onClick={() => setConfirmStep(false)}
                disabled={isUploading}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-confirm"
                onClick={() => void handleConfirmUploadToDrive()}
                disabled={isUploading}
              >
                {isUploading
                  ? 'Subiendo a Google Drive…'
                  : '✓ Confirmar y subir a Google Drive'}
              </button>
            </div>
          </div>
        )}

        {/* Botonera inferior */}
        <div className="modal-actions" style={{ marginTop: '1rem' }}>
          <button
            type="button"
            className="btn-toggle"
            onClick={() => void handleLocalFallbackDownload()}
          >
            ↓ Descargar copia local (.{format === 'gdoc' ? 'md' : formatMeta.extension})
          </button>

          {!confirmStep && (
            <button
              type="button"
              className="btn-confirm"
              disabled={needsAuth || isUploading}
              onClick={() => setConfirmStep(true)}
              title={
                needsAuth
                  ? 'Iniciá sesión con Google arriba para habilitar la subida a Google Drive'
                  : 'Preparar exportación a Google Drive'
              }
            >
              ☁ Exportar a Google Drive ({formatMeta.extension.toUpperCase()})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
