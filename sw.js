const CACHE = 'nudge-v2';
const ASSETS = ['./', './index.html', './manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached =>
      cached || fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => cached)
    )
  );
});

// ── Background nudge alarm ──────────────────────────────────────────
let scheduled = [];
let alarmTimer = null;

function startAlarm() {
  if (alarmTimer) return;
  alarmTimer = setInterval(tick, 30000);
}

function tick() {
  const hhmm = new Date().toTimeString().slice(0, 5);
  scheduled.forEach(n => {
    if (n.time === hhmm && !n.fired) {
      n.fired = true;
      self.registration.showNotification(n.title, {
        body: n.body,
        tag: n.tag || 'nudge',
        icon: './icon-192.png',
        badge: './icon-192.png',
        vibrate: [120, 60, 120],
        renotify: true,
        actions: [
          { action: 'add',  title: '➕ Add something'   },
          { action: 'done', title: '✅ Already handled'  },
          { action: 'skip', title: '⏭ Not today'        },
        ],
        data: { anchor: n.anchor, url: './' },
      });
    }
  });
  if (hhmm === '00:01') scheduled.forEach(n => { n.fired = false; });
}

self.addEventListener('message', e => {
  if (!e.data) return;
  if (e.data.type === 'SCHEDULE_NUDGES') {
    scheduled = (e.data.nudges || []).map(n => ({ ...n, fired: false }));
    startAlarm();
  }
  if (e.data.type === 'FIRE_TEST') {
    self.registration.showNotification(e.data.title, {
      body: e.data.body,
      tag: 'nudge-test',
      icon: './icon-192.png',
      vibrate: [100, 50, 100],
      actions: [
        { action: 'add',  title: '➕ Add something'  },
        { action: 'done', title: '✅ Already handled' },
        { action: 'skip', title: '⏭ Not today'       },
      ],
      data: { anchor: e.data.anchor, url: './' },
    });
  }
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const { action } = e;
  const data = e.notification.data || {};
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const win = list.find(c => c.url.includes('index'));
      if (win) { win.focus(); win.postMessage({ type: 'NOTIF_ACTION', action, anchor: data.anchor }); }
      else clients.openWindow(data.url || './').then(w => w && w.postMessage({ type: 'NOTIF_ACTION', action, anchor: data.anchor }));
    })
  );
});

self.addEventListener('periodicsync', e => {
  if (e.tag === 'nudge-check') e.waitUntil(tick());
});

startAlarm();
