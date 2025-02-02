// service-worker.js

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open('tbcpl-cache-v1').then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/logo.png',
        '/manifest.json'
      ]);
    })
  );
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
