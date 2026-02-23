const CACHE_NAME = 'nudge-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/android-chrome-192x192.png',
  './assets/android-chrome-512x512.jpg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});