/**
 * Presencia offline - UX-003 (#226).
 * Banner + toast DOM vanilla (sin framework): estetica provisional que
 * converge en F3 con el componente OfflineBanner del inventario RFC-027.
 *
 * Regla R15: el toast de exito aparece SOLO con envios reales confirmados
 * (sincronizados > 0). Nunca hay exito simulado.
 */
export interface Superficie {
  actualizar(pendientes: number, enLinea: boolean): void;
  anunciarSincronizacion(sincronizados: number): void;
  alSolicitarSincronizar(cb: () => void): void;
  desmontar(): void;
}

function textoBanner(n: number): string {
  return (
    'Pendiente de sincronizar - ' +
    n +
    (n === 1 ? ' elemento' : ' elementos') +
    ' en su dispositivo'
  );
}

export function crearPresenciaOffline(doc: Document): Superficie {
  const banner = doc.createElement('div');
  banner.setAttribute('role', 'status');
  banner.setAttribute('aria-live', 'polite');
  banner.setAttribute('data-presencia-offline', 'banner');
  banner.style.cssText =
    'position:fixed;left:0;right:0;bottom:0;z-index:9999;background:#181410;' +
    'color:#F5F1E8;border-top:1px solid #332C22;padding:0.75rem 1rem;display:none;' +
    'gap:0.75rem;align-items:center;justify-content:space-between;' +
    'font:0.95rem system-ui,sans-serif';

  const texto = doc.createElement('span');
  banner.appendChild(texto);

  const boton = doc.createElement('button');
  boton.type = 'button';
  boton.textContent = 'Reintentar sincronizacion';
  boton.style.cssText =
    'background:#FFC72C;color:#0D0B08;border:none;border-radius:0.5rem;' +
    'padding:0.5rem 0.9rem;cursor:pointer;font:inherit;font-weight:600';
  banner.appendChild(boton);

  let solicitud: (() => void) | null = null;
  boton.addEventListener('click', () => {
    if (solicitud) solicitud();
  });

  const toast = doc.createElement('div');
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.setAttribute('data-presencia-offline', 'toast');
  toast.style.cssText =
    'position:fixed;right:1rem;bottom:4.5rem;z-index:9999;background:#181410;' +
    'color:#F5F1E8;border:1px solid #4ADE80;border-radius:0.5rem;' +
    'padding:0.6rem 0.9rem;display:none;font:0.95rem system-ui,sans-serif';

  const vista = doc.defaultView;
  doc.body.appendChild(banner);
  doc.body.appendChild(toast);

  return {
    actualizar(pendientes: number, enLinea: boolean): void {
      if (pendientes > 0) {
        texto.textContent = textoBanner(pendientes);
        banner.style.display = 'flex';
        boton.style.display = enLinea ? 'inline-block' : 'none';
      } else {
        banner.style.display = 'none';
      }
    },
    anunciarSincronizacion(sincronizados: number): void {
      // R15: solo exito real y confirmado.
      if (sincronizados <= 0) return;
      toast.textContent =
        'Sincronizado: ' +
        sincronizados +
        (sincronizados === 1 ? ' elemento' : ' elementos');
      toast.style.display = 'block';
      if (vista && typeof vista.setTimeout === 'function') {
        vista.setTimeout(() => {
          toast.style.display = 'none';
        }, 4000);
      }
    },
    alSolicitarSincronizar(cb: () => void): void {
      solicitud = cb;
    },
    desmontar(): void {
      banner.remove();
      toast.remove();
    },
  };
}
