/**
 * Service worker - UX-003 (#226): PWA instalable + offline honesto.
 * Vanilla: sin Workbox ni dependencias (no se toca el lockfile).
 *
 * Honestidad (R15):
 * - /api/* NUNCA se cachea: el dato territorial no se sirve de cache.
 * - POST/PUT/DELETE jamas se interceptan.
 * - Ante fallo de red en una navegacion se cae al shell precacheado,
 *   nunca a una pantalla que simule datos.
 */
const VERSION = 'delocalsoy-ux003-v1';
const SHELL = [
  '/',
  '/manifest.webmanifest',
  '/icono-delocalsoy.svg',
  '/icono-delocalsoy-maskable.svg',
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(VERSION).then((cache) =>
      Promise.allSettled(SHELL.map((ruta) => cache.add(ruta)))
    )
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((claves) =>
        Promise.all(claves.filter((c) => c !== VERSION).map((c) => caches.delete(c)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (evento) => {
  const req = evento.request;
  if (req.method !== 'GET') return; // POST/PUT/DELETE: nunca interceptados
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // solo same-origin
  if (url.pathname.startsWith('/api/')) return; // dato honesto: sin cache

  if (req.mode === 'navigate') {
    // Navegacion: red primero, fallback al shell precacheado.
    evento.respondWith(
      fetch(req).catch(() =>
        caches.match('/').then((r) => r || Response.error())
      )
    );
    return;
  }

  // Estaticos: cache primero, luego red (y se llena la cache al acierto).
  evento.respondWith(
    caches.match(req).then((enCache) => {
      if (enCache) return enCache;
      return fetch(req).then((res) => {
        if (res && res.ok && res.type === 'basic') {
          const copia = res.clone();
          caches.open(VERSION).then((cache) => cache.put(req, copia));
        }
        return res;
      });
    })
  );
});
