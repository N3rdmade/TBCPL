self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('tbcpl-cache-v1').then(cache => {
      return cache.addAll([
        '404.html',
        'index.html',
        'logo.png',
        'manifest.json',
        '.htaccess',
        'banner.png',
        'dmca.html',
        'robots.txt',
        'SciFi2.CSS',
        'flash/minimal.css',
        'assets/404-SciFi.jpg',
        'assets/brave.png',
        'assets/qrcode.png',
        'assets/reddit.png',
        'assets/ublock.png',
        'js/nocheats.js',
        'js/smoothscroll.js'
      ]);
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
