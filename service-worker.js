self.addEventListener('install', (event) => {
    event.waitUntil(
      caches.open('tbcpl-cache-v1').then((cache) => {
        return cache.addAll([
          '/',
          '/index.html',
          '/404.html',
          '/robots.txt',
        '/manifest.json',
        '/logo.png',
        '.htaccess',
        '/flash/minimal.css',
        '/js/smoothscroll.js',
        '/js/nocheats.js',
        '/js/protected_devtoolsdetector.js'
        ]);
      })
    );
  });
  
  self.addEventListener('fetch', (event) => {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  });
  
