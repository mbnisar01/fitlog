const CACHE = 'fitlog-v2';
const SHELL = [
  './',
  'index.html',
  'styles.css',
  'manifest.json',
  'js/app.js',
  'js/logic.js',
  'js/storage.js',
  'js/render.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon-180.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  // Navigations: network-first so updates show, fall back to cached shell offline.
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('index.html')));
    return;
  }
  // Other assets: cache-first, fall back to network.
  event.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});
