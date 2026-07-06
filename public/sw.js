// Service worker del portal AFUSAMUT — instalabilidad (PWA) + tolerancia
// básica a cortes de red. Estrategia: red primero y caché como respaldo,
// así la app siempre está fresca tras cada deploy.
const CACHE = 'afusamut-v1';
const SHELL = [
  '/', '/index.html', '/login.html', '/portal.html',
  '/css/styles.css', '/img/logo.png', '/img/icon-192.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL))
      .catch(() => {}) // sin red en la instalación: se cachea sobre la marcha
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Solo GET del mismo origen. Jamás interceptar el handler de auth de
  // Firebase (/__/*) ni SDKs/APIs externas: romperían el login por redirect.
  if (e.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/__/')) return;

  e.respondWith((async () => {
    try {
      const resp = await fetch(e.request);
      if (resp.ok && resp.type === 'basic') {
        const copia = resp.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copia)).catch(() => {});
      }
      return resp;
    } catch {
      const cacheada = await caches.match(e.request);
      if (cacheada) return cacheada;
      // Navegación sin red y sin caché exacto: servir el shell del portal
      if (e.request.mode === 'navigate') {
        const shell = await caches.match('/portal.html');
        if (shell) return shell;
      }
      throw new Error('offline');
    }
  })());
});
