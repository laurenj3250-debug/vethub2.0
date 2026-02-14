// VetHub 2.0 Service Worker
// Provides offline support for critical workflows during hospital rounds

const CACHE_NAME = 'vethub-v1';
const STATIC_CACHE = 'vethub-static-v1';
const API_CACHE = 'vethub-api-v1';

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/rounding',
  '/mri-builder',
  '/neuro-exam',
];

// API routes to cache with network-first strategy
const API_ROUTES = [
  '/api/patients',
  '/api/tasks',
  '/api/quick-insert-options',
  '/api/problem-options',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== API_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  // Take control of all pages immediately
  self.clients.claim();
});

// Fetch event - handle requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip external requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // API requests: Network-first with cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithCache(event.request, API_CACHE));
    return;
  }

  // Static/page requests: Cache-first with network fallback
  if (isStaticAsset(url.pathname) || isPageRequest(event.request)) {
    event.respondWith(cacheFirstWithNetwork(event.request, STATIC_CACHE));
    return;
  }

  // Default: Network only
  event.respondWith(fetch(event.request));
});

// Network-first strategy with cache fallback
async function networkFirstWithCache(request, cacheName) {
  try {
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      console.log('[SW] Serving from cache (offline):', request.url);
      return cachedResponse;
    }

    // Return offline JSON response for API requests
    return new Response(
      JSON.stringify({
        error: 'offline',
        message: 'You are offline. Data may be stale.',
        cached: false
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Cache-first strategy with network fallback
async function cacheFirstWithNetwork(request, cacheName) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    // Return cached response immediately
    // Also update cache in background
    fetchAndCache(request, cacheName);
    return cachedResponse;
  }

  // Not in cache, fetch from network
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    // Return offline page
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>VetHub - Offline</title>
          <style>
            body { font-family: system-ui; padding: 40px; text-align: center; }
            h1 { color: #059669; }
          </style>
        </head>
        <body>
          <h1>You're Offline</h1>
          <p>VetHub needs an internet connection to load this page.</p>
          <p>Check your wifi and try again.</p>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}

// Background cache update
async function fetchAndCache(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response);
    }
  } catch (error) {
    // Silently fail - we already served cached version
  }
}

// Check if request is for a static asset
function isStaticAsset(pathname) {
  return pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/);
}

// Check if request is for a page (HTML)
function isPageRequest(request) {
  return request.headers.get('accept')?.includes('text/html');
}

// Message handler for cache updates
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }

  if (event.data === 'clearCache') {
    caches.keys().then((names) => {
      names.forEach((name) => caches.delete(name));
    });
  }
});
