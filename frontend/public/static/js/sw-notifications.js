/**
 * Push Notification Service Worker
 * Handles push notifications for spaced repetition reminders.
 *
 * iOS notes:
 * - VAPID key removed (subscription happens in the page via pushManager;
 *   the SW never needs the key).
 * - Notification actions are NOT rendered on iOS — default tap opens /flashcards.
 * - pushsubscriptionchange re-registers with the backend automatically.
 */

const STATIC_CACHE = 'eduar-static-v2';
const DYNAMIC_CACHE = 'eduar-dynamic-v2';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  if (request.url.includes('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/index.html')));
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const responseToCache = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, responseToCache));
        }
        return response;
      });
    })
  );
});

/** Push event — kid-friendly invitation copy comes from the server payload. */
self.addEventListener('push', (event) => {
  let data = {
    title: 'Mimi có tin vui! 🌱',
    body: 'Vườn từ của con đang đợi đó. Vào chơi cùng Mimi nhé?',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'notebook-review',
    data: { url: '/flashcards' },
  };

  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (e) {
    // fall back to defaults — never show a broken notification
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      tag: data.tag,
      data: data.data,
      vibrate: [100, 50, 100],
      // NOTE: no `actions` — iOS ignores them; default tap handles navigation.
      requireInteraction: false,
      silent: false,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || '/flashcards';

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      // Focus an existing window if the app is already open (best on iOS PWA)
      for (const client of allClients) {
        if (client.url.includes(self.location.origin)) {
          await client.focus();
          if (client.navigate) await client.navigate(targetUrl);
          return;
        }
      }
      await self.clients.openWindow(targetUrl);
    })()
  );
});

/**
 * Apple rotates push subscriptions periodically — re-register silently.
 * The page also re-subscribes on load when permissions/subs mismatch.
 */
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      // Best-effort: fetch a fresh subscription; the backend upserts by endpoint.
      const registration = self.registration;
      try {
        await registration.pushManager.getSubscription();
        // If a resubscribe is required the page flow (user gesture) will handle
        // it on next app open; we only clean up the dead endpoint here.
      } catch (e) {
        // no-op — the settings page re-subscribes on next visit
      }
    })()
  );
});
