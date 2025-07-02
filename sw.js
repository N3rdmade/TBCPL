const CACHE_NAME = 'tbcpl-cache-v5'; // increment version when you update files
const FILES_TO_CACHE = [
  '404.html',
  'index.html',
  'logo.png',
  'manifest.json',
  '.htaccess',
  'banner.png',
  'dmca.html',
  'robots.txt',
  'new_styles.css',
  'flash/minimal.css',
  'assets/404-SciFi.jpg',
  'assets/brave.png',
  'assets/qrcode.png',
  'assets/reddit.png',
  'assets/ublock.png',
  'js/nocheats.js',
  'js/smoothscroll.js'
];

// Install: cache files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting(); // Activate worker immediately
});

// Activate: delete old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(name => {
          if (name !== CACHE_NAME) {
            return caches.delete(name); // delete old caches
          }
        })
      );
    })
  );
  self.clients.claim(); // Take control of all clients immediately
});

// Fetch: respond with cache first, fallback to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      return cachedResponse || fetch(event.request);
    })
  );
});
