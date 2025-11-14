

const CACHE_NAME = 'specs-cache-v4';
const STATIC_FILES = [
  './', './index.html', './styles.css', './manifest.json',
  './img/icon-192.png', './img/icon-512.png'
];


self.addEventListener('install', event => {
  self.skipWaiting(); // Activa el nuevo SW inmediatamente
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_FILES);
    })
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

self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  // Estrategia network-first para specs.json
  if (requestUrl.pathname.endsWith('/specs.json')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, response.clone());
            return response;
          });
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Estrategia cache-first para archivos estáticos
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
