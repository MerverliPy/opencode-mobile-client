const CACHE_NAME = 'opencode-mobile-shell-v2';
const APP_SHELL_ASSETS = ['/', '/index.html', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png'];

async function getInstallAssets() {
  const indexResponse = await fetch('/index.html', { cache: 'no-store' });
  const indexHtml = await indexResponse.text();
  const discoveredAssets = [...indexHtml.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
    .map((match) => match[1])
    .filter((value) => value.startsWith('/assets/'));

  return [...new Set([...APP_SHELL_ASSETS, ...discoveredAssets])];
}

function isCacheableRequest(requestUrl) {
  return requestUrl.origin === self.location.origin && requestUrl.pathname.startsWith('/assets/');
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const installAssets = await getInstallAssets();
      await cache.addAll(installAssets);
    })(),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          if (isCacheableRequest(new URL(event.request.url))) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }

          return response;
        })
        .catch(() => (event.request.mode === 'navigate' ? caches.match('/') : Response.error()));
    }),
  );
});
