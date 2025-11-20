const CACHE_NAME = 'specs-cache-v6';
const STATIC_FILES = [
  './',
  'index.html',
  'styles.css',
  'manifest.json',
  'img/icon-192.png',
  'img/icon-512.png'
];

self.addEventListener('install', event => {
  self.skipWaiting(); // Activa el nuevo SW inmediatamente
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_FILES))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
});

 const requestUrl = new URL(event.request.url);

  // Solo cache-first para archivos estáticos
  if (STATIC_FILES.includes(requestUrl.pathname) || requestUrl.pathname === '/') {
    event.respondWith(
      caches.match(event.request).then(response => response || fetch(event.request))
    );
  } else {
    // Para todo lo demás (incluyendo specs.xlsx): network-only
    event.respondWith(fetch(event.request));
  }
});
