const CACHE_NAME = 'terminal-zero-v1';
const STATIC_ASSETS = ['/', '/trade', '/dashboard', '/offline'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Don't cache API calls or WebSocket connections
  if (event.request.url.includes('/api/') || event.request.url.includes('/ws')) {
    return;
  }

  event.respondWith(
    caches
      .match(event.request)
      .then(
        (cached) =>
          cached ||
          fetch(event.request).catch(() => caches.match('/offline'))
      )
  );
});
