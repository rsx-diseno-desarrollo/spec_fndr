// sw.js
self.addEventListener('install', event => {
  self.skipWaiting(); // Activa el nuevo SW inmediatamente
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key))))
  );
});

self.addEventListener('fetch', event => {
  // Network-only: siempre intenta cargar desde la red
  event.respondWith(fetch(event.request));
});
