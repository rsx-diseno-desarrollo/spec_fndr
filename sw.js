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

  // Si el recurso solicitado es la raíz o index.html
  if (requestUrl.pathname === '/' || requestUrl.pathname.endsWith('index.html')) {
    event.respondWith(
      fetch(event.request).catch(() => new Response(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <title>Sin conexión</title>
          <style>
            body {
              display:flex;
              flex-direction:column;
              justify-content:center;
              align-items:center;
              height:100vh;
              font-family:'Segoe UI', Tahoma, sans-serif;
              text-align:center;
              color:#424242;
              margin:0;
            }
            h2 { color:#f57c00; margin-bottom:10px; }
            p { font-size:1.5em; }
          </style>
        </head>
        <body>
          <h2>Sin conexión :(</h2>
          <p>No se puede cargar la aplicación. Conéctate a la red para continuar.</p>
        </body>
        </html>
      `, { headers: { 'Content-Type': 'text/html' } }))
    );
  } else {
    // Para todo lo demás: network-only
    event.respondWith(fetch(event.request));
  }
});
