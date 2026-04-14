const CACHE_NAME = 'maintainhome-v3';

// Core app shell assets to precache
const APP_SHELL = [
  '/',
  '/images/logo-icon.png',
  '/images/logo.png',
  '/images/logo-white.png',
  '/images/maintly_thumb.png',
  '/images/maintly_point.png',
  '/images/maintly_wrench.png',
  '/manifest.json',
];

// ── Install: cache app shell ────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(APP_SHELL.map((url) => new Request(url, { cache: 'reload' })))
        .catch(() => {
          // If any asset fails (e.g. logo variants missing), still install
        })
    )
  );
  self.skipWaiting();
});

// ── Activate: clean up old caches ──────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: smart strategy ──────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, cross-origin, and API requests (always network)
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // Static assets (images, fonts, manifests) — cache-first
  const isStaticAsset =
    url.pathname.startsWith('/images/') ||
    url.pathname.startsWith('/fonts/') ||
    url.pathname === '/manifest.json' ||
    /\.(png|jpg|jpeg|svg|ico|woff2?|ttf)$/.test(url.pathname);

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // JS/CSS bundles — stale-while-revalidate
  const isBundle = /\.(js|css)(\?.*)?$/.test(url.pathname);
  if (isBundle) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(request).then((cached) => {
          const network = fetch(request).then((response) => {
            if (response && response.status === 200) {
              cache.put(request, response.clone());
            }
            return response;
          });
          return cached || network;
        })
      )
    );
    return;
  }

  // HTML navigation — network-first, fall back to cached app shell
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/').then((r) => r || new Response('Offline', { status: 503 })))
    );
  }
});
