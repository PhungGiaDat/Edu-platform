/**
 * Push Notification Service Worker
 * Handles push notifications for spaced repetition reminders
 */

// VAPID public key (for web push)
const VAPID_PUBLIC_KEY = 'BCkbs2z3qXwWGqT7GkhDJVQeJzN3R8mQ9Q5Y5Q5Y5Q5Y5Q5Y5Q5Y5Q5Y5Q5Y5Q5Y5Q5Y5Q5Y5Q5Y5Q5Y5Q5Y5Q5Y=';

// Cache names
const STATIC_CACHE = 'eduar-static-v2';
const DYNAMIC_CACHE = 'eduar-dynamic-v2';

// Static assets to cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

/**
 * Install event - cache static assets
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

/**
 * Activate event - clean old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

/**
 * Fetch event - serve from cache, fallback to network
 */
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Skip non-GET and cross-origin requests.
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  // Skip API requests
  if (request.url.includes('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
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

/**
 * Push event - show notification
 */
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');

  let data = {
    title: 'EduAR - Học tập',
    body: 'Đã đến lúc ôn tập từ vựng!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'notebook-review',
    data: {},
  };

  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch (e) {
    console.error('[SW] Error parsing push data:', e);
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    data: data.data,
    vibrate: [100, 50, 100],
    actions: [
      {
        action: 'practice',
        title: '📖 Luyện tập ngay',
      },
      {
        action: 'snooze',
        title: '⏰ Nhắc lại sau',
      },
    ],
    requireInteraction: true,
    silent: false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

/**
 * Notification click event
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);

  event.notification.close();

  const practiceUrl = '/flashcards';
  const snoozeMinutes = 30;

  if (event.action === 'practice') {
    // Open flashcards screen
    event.waitUntil(
      clients.openWindow(practiceUrl)
    );
  } else if (event.action === 'snooze') {
    // Schedule another notification in 30 minutes
    event.waitUntil(
      scheduleSnooze(snoozeMinutes)
    );
  } else {
    // Default: open home page
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

/**
 * Schedule a snooze notification
 */
async function scheduleSnooze(minutes) {
  const now = Date.now();
  const snoozeTime = now + minutes * 60 * 1000;

  // Store snooze time in IndexedDB
  const db = await openDB();
  await db.put('notification-schedule', {
    id: 'snooze',
    type: 'snooze',
    time: snoozeTime,
  });

  // Schedule with Notification API
  if ('showTrigger' in Notification.prototype) {
    const registration = self.registration;
    // Cancel existing snooze
    const pending = await registration.getNotifications({ tag: 'snooze' });
    pending.forEach((n) => n.close());

    // Schedule new snooze
    const trigger = new TimestampTrigger(snoozeTime);
    registration.showNotification('EduAR - Nhắc nhở ôn tập', {
      body: 'Đã đến lúc ôn tập từ vựng!',
      tag: 'snooze',
      requireInteraction: true,
      showTrigger: trigger,
    });
  }
}

/**
 * Open IndexedDB
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('EduARNotifications', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('notification-schedule')) {
        db.createObjectStore('notification-schedule', { keyPath: 'id' });
      }
    };
  });
}

/**
 * Background sync for offline review data
 */
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'sync-review-data') {
    event.waitUntil(syncReviewData());
  }
});

/**
 * Sync review data when back online
 */
async function syncReviewData() {
  // Get pending reviews from IndexedDB
  const db = await openDB();
  const pending = await db.getAll('pending-reviews');

  if (pending.length === 0) return;

  // Send to backend
  try {
    await fetch('/api/v1/notebook/reviews/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviews: pending }),
    });

    // Clear pending
    const tx = db.transaction('pending-reviews', 'readwrite');
    tx.objectStore('pending-reviews').clear();
  } catch (error) {
    console.error('[SW] Sync failed:', error);
  }
}
