
const CACHE_NAME = 'specs-cache-v4'; // Cambia versión
const STATIC_FILES = [
  '/',
  '/index.html',
  '/styles.css',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_FILES))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (STATIC_FILES.includes(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then(response => response || fetch(event.request))
    );
  }
  // specs.json no se cachea, siempre va a la red
});
