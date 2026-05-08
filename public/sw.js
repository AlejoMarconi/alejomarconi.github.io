/* Service Worker for Tren Urquiza PWA.
 *
 * Goals:
 *   1. Cache the app shell so the page works offline once installed.
 *   2. Schedule alarm notifications via setTimeout INSIDE the SW so the
 *      notification can fire even when the page's JS runtime is suspended
 *      (iOS in background, locked phone, etc.). The SW stays alive for a
 *      while after the page closes — varies by platform but typically
 *      a few minutes on iOS, longer on Chromium. For short alarms
 *      ("5 min before") this means the alarm rings even with the phone
 *      locked. For long alarms (hours away) the SW will eventually be
 *      killed; in that case the alarm rings the next time the user opens
 *      the app, which is the same behavior as before.
 *   3. Bring focus to an open client when a notification is clicked.
 *
 * Limits: truly reliable background notifications when the app has been
 * closed for hours requires a server-side Web Push subscription, which
 * isn't implemented here.
 */

const CACHE_VERSION = 'urquiza-v2';
const ASSETS = ['./', './index.html', './manifest.json', './favicon.ico'];

// alarm.id -> timeoutId scheduled in this SW
const scheduledTimers = new Map();

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(ASSETS).catch(() => {})),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('./'))),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
    }),
  );
});

function scheduleOne(alarm) {
  if (!alarm || !alarm.fireEpoch || alarm.fired) return;
  const delay = alarm.fireEpoch - Date.now();
  if (delay <= 0) return;

  const previous = scheduledTimers.get(alarm.id);
  if (previous) clearTimeout(previous);

  const t = setTimeout(() => {
    const dirLabel =
      alarm.direction === 'a_lemos' ? 'a Gral. Lemos' : 'a F. Lacroze';
    self.registration
      .showNotification(`Tren ${dirLabel} en ${alarm.minutesBefore} min`, {
        body: `${alarm.stationName} · sale ${alarm.trainTime}`,
        icon: './logo192.png',
        badge: './logo192.png',
        tag: `alarm-${alarm.id}`,
        vibrate: [200, 100, 200, 100, 400],
        requireInteraction: false,
      })
      .catch(() => {});
    scheduledTimers.delete(alarm.id);
    // Tell any open client the alarm fired so it can mark it as fired
    // in localStorage and not double-ring.
    self.clients.matchAll({ includeUncontrolled: true }).then((all) => {
      all.forEach((c) => c.postMessage({ type: 'alarm-fired', id: alarm.id }));
    });
  }, delay);

  scheduledTimers.set(alarm.id, t);
}

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'schedule-alarms') {
    // Replace the entire timer set: clear everything, re-schedule the
    // pending alarms the page sent. This is the simplest way to keep the
    // SW state in sync with the page's source of truth.
    scheduledTimers.forEach((t) => clearTimeout(t));
    scheduledTimers.clear();
    (data.alarms || []).forEach(scheduleOne);
  } else if (data.type === 'cancel-alarm') {
    const t = scheduledTimers.get(data.id);
    if (t) {
      clearTimeout(t);
      scheduledTimers.delete(data.id);
    }
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      const existing = wins.find((w) => w.url && w.focus);
      if (existing) return existing.focus();
      return clients.openWindow('./');
    }),
  );
});
