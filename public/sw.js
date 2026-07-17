const CACHE_NAME = 'mushroom-farm-pwa-v2027';

// On install, cache basic static root files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/manifest.json'
      ]).catch(err => console.log("SW Install cache.addAll error:", err));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Stale-while-revalidate strategy for same-origin and static requests
self.addEventListener('fetch', (event) => {
  const request = event.request;
  
  // Only cache GET requests
  if (request.method !== 'GET') return;
  
  // Skip browser extensions or dev server websockets
  if (request.url.includes('ws://') || request.url.includes('__vite_ping') || request.url.includes('chrome-extension')) return;

  // Bypass service worker cache for favicon, icons, and logo to guarantee fresh asset loading
  if (
    request.url.includes('favicon') || 
    request.url.includes('icon-') || 
    request.url.includes('apple-touch-icon') || 
    request.url.includes('icon.png') || 
    request.url.includes('icon.jpg') ||
    request.url.includes('logo')
  ) {
    return; // Let the browser fetch directly from the network
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          // Cache successful same-origin or HTTP GET requests
          if (networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        }).catch((err) => {
          // Network failed, we return cached response if available
          if (cachedResponse) return cachedResponse;
          throw err;
        });

        return cachedResponse || fetchPromise;
      });
    })
  );
});
