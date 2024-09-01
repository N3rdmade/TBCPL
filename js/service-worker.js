const CACHE_NAME = 'tbcpl-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/404.html',
  '/robots.txt',
  '/manifest.json',
  '/logo.png',
  '.htaccess',
  '/css/flash.css',
  '/js/smoothscroll.js',
  '/js/nocheats.js',
  '/js/protected_devtoolsdetector.js'
];

// Install a Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Cache and return requests
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request);
      })
  );
});

// Update a Service Worker
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
