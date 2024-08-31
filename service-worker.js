self.addEventListener('install', (event) => {
    event.waitUntil(
      caches.open('tbcpl-cache-v1').then((cache) => {
        return cache.addAll([
          '/',
          '/index.html',     
          '/404.html',
          '/.htaccess',
          '/js/protected_devtoolsdetector.js',
          '/js/nocheats.js',
          '/js/smoothscroll.js',
          '/css/flash.css',
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
  
