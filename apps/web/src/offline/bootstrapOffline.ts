/**
 * Bootstrap offline - UX-003 (#226). Se importa UNA vez desde main.tsx.
 * - Inserta <link rel="manifest"> y <meta name="theme-color"> (NO se toca
 *   index.html: es "diseno" para el scope-guard #134).
 * - Registra /sw.js (solo en contexto seguro).
 * - Monta banner/toast, sincroniza al volver la red y a pedido manual.
 *
 * Idempotente y seguro sin DOM (SSR/tests): el auto-run solo corre si
 * existen window y document (patron UX-002).
 */
import { crearActivo, sesionActiva } from '../activosApi';
import type { ActivoAltaInput } from '../activosApi';
import {
  crearAlmacenLocalStorage,
  crearColaRelevamiento,
} from './colaRelevamiento';
import { crearEstadoRed, dependenciasNavegador } from './estadoRed';
import { crearPresenciaOffline } from './presenciaOffline';

const CLAVE_ALMACEN = 'delocalsoy.cola-relevamiento.v1';

let iniciado = false;
let cola: ReturnType<typeof crearColaRelevamiento> | null = null;
let presencia: ReturnType<typeof crearPresenciaOffline> | null = null;

function refrescar(): void {
  if (!presencia || !cola) return;
  const enLinea =
    typeof navigator !== 'undefined' ? navigator.onLine : true;
  presencia.actualizar(cola.estado().total, enLinea);
}

/**
 * API publica para el futuro formulario de alta (fuera de alcance UX-003):
 * encola un relevamiento aunque no haya sesion - se enviara cuando alla
 * sesion activa y red.
 */
export function encolarRelevamiento(payload: ActivoAltaInput): void {
  if (!iniciado) iniciarOffline();
  cola?.encolar(payload);
  refrescar();
}

export function iniciarOffline(): void {
  if (iniciado) return;
  iniciado = true;
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const doc = document;

  // Manifest + theme-color dinamicos (index.html intacto).
  if (!doc.querySelector('link[rel="manifest"]')) {
    const link = doc.createElement('link');
    link.setAttribute('rel', 'manifest');
    link.setAttribute('href', '/manifest.webmanifest');
    doc.head.appendChild(link);
  }
  if (!doc.querySelector('meta[name="theme-color"]')) {
    const meta = doc.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    meta.setAttribute('content', '#0D0B08');
    doc.head.appendChild(meta);
  }

  // Service worker: solo contexto seguro; los fallos no se simulan.
  const nav = navigator as Navigator & {
    serviceWorker?: { register(url: string): Promise<unknown> };
  };
  const hostLocal =
    location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if (nav.serviceWorker && (location.protocol === 'https:' || hostLocal)) {
    nav.serviceWorker.register('/sw.js').catch(() => undefined);
  }

  // Cola + presencia.
  cola = crearColaRelevamiento(
    crearAlmacenLocalStorage(CLAVE_ALMACEN),
    crearActivo
  );
  presencia = crearPresenciaOffline(doc);

  const estadoRed = crearEstadoRed(dependenciasNavegador());
  estadoRed.suscribir((enLinea) => {
    refrescar();
    if (enLinea) void sincronizarAhora();
  });

  presencia.alSolicitarSincronizar(() => {
    void sincronizarAhora();
  });

  refrescar();
}

async function sincronizarAhora(): Promise<void> {
  if (!cola) return;
  // La sesion JWT vive en memoria (activosApi): sin sesion activa no alla
  // envio posible - la cola queda pendiente, sin exito simulado.
  if (!sesionActiva()) {
    refrescar();
    return;
  }
  const resultado = await cola.sincronizar();
  if (presencia) presencia.anunciarSincronizacion(resultado.sincronizados);
  refrescar();
}

// Auto-run solo con DOM real.
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  iniciarOffline();
}
