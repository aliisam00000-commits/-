/* ==========================================================
 * Service Worker: سوق الولي الإلكتروني (Souq Al-Wali PWA)
 * Version: 1.0.1
 * ========================================================== */

const CACHE_NAME = 'souq-alwali-v1.0.1';
const DYNAMIC_CACHE = 'souq-alwali-dynamic-v1.0.1';

// Core static assets to cache during installation
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/manifest.json',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png'
];

// Install Event: precache core shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[SW] Pre-caching offline shell and assets');
      try {
        await cache.addAll(PRECACHE_ASSETS);
      } catch (err) {
        console.warn('[SW] Some assets failed to precache initially:', err);
      }
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: cleanup old caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME && cache !== DYNAMIC_CACHE) {
            console.log('[SW] Removing old cache version:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Intelligent Strategy per Request Type
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET requests (POST, PUT, DELETE)
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome extension schemes and non-http(s)
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // 1. Navigation (HTML Pages) -> Network First with Cached Index Fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const fallback = await caches.match('/index.html');
          if (fallback) return fallback;

          // Ultimate offline fallback response if everything else fails
          return new Response(
            `<!DOCTYPE html>
            <html lang="ar" dir="rtl">
              <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>سوق الولي الإلكتروني - العمل بدون اتصال</title>
                <style>
                  body { font-family: system-ui, -apple-system, sans-serif; background: #0d3b66; color: #ffffff; text-align: center; padding: 40px 20px; direction: rtl; margin: 0; }
                  .card { background: #132238; border: 1px solid rgba(212,175,55,0.4); border-radius: 24px; padding: 32px 24px; max-width: 460px; margin: 40px auto; box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
                  .icon { font-size: 54px; margin-bottom: 16px; }
                  h1 { font-size: 22px; color: #f4d068; margin-bottom: 8px; font-weight: 900; }
                  p { font-size: 14px; color: #cbd5e1; line-height: 1.6; margin-bottom: 24px; }
                  button { background: #d4af37; color: #0d3b66; font-weight: bold; border: none; padding: 12px 28px; border-radius: 12px; font-size: 14px; cursor: pointer; }
                </style>
              </head>
              <body>
                <div class="card">
                  <div class="icon">🛒</div>
                  <h1>سوق الولي الإلكتروني</h1>
                  <p>أنت حالياً غير متصل بالإنترنت. يرجى التأكد من اتصال شبكة الهاتف أو الواي فاي لتحديث الإعلانات.</p>
                  <button onclick="window.location.reload()">إعادة المحاولة 🔄</button>
                </div>
              </body>
            </html>`,
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        })
    );
    return;
  }

  // 2. API requests -> Network First with Dynamic Cache Fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          return new Response(JSON.stringify({ success: false, offline: true, message: 'تعذر الاتصال بالسيرفر - تم التحويل لوضع عدم الاتصال' }), {
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  // 3. Static Assets, JS, CSS, Fonts, Images -> Network First with Cache Fallback
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) return cachedResponse;
        throw new Error('Offline and asset not cached');
      })
  );
});

// Support Skip Waiting trigger
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
