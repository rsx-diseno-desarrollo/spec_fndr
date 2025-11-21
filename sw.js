const CACHE_NAME = 'specs-cache-v10';
const STATIC_FILES = [
  'img/icon-192.png',
  'img/icon-512.png',
  'manifest.json'
];
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
  const requestUrl = new URL(event.request.url);

  // Instalar SW y cachear íconos
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_FILES))
  );
});

// Activar SW y limpiar caches antiguos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      network-first para todo, fallback solo para íconos
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  if (STATIC_FILES.includes(requestUrl.pathname)) {
    // Íconos → cache-first
    event.respondWith(
      caches.match(event.request).then(response => response || fetch(event.request))
    );
  } else {
    // Para todo lo demás: network-only
    event.respondWith(fetch(event.request));
  }
});
