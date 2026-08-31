/* The No-Cook Kitchen — offline shell.
   Network-first for the page itself (so updates arrive), cache-first for fonts and static files.
   Sharing still goes through the Google Sheet bridge when online. */
const CACHE = 'no-cook-kitchen-v1';
self.addEventListener('install', function (event) {
  event.waitUntil(caches.open(CACHE).then(function (cache) {
    return Promise.all(['./', './index.html', './manifest.webmanifest', './icon.svg'].map(function (url) {
      return cache.add(url).catch(function () {});
    }));
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (event) {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.indexOf('script.google.com') > -1 || url.hostname.indexOf('googleusercontent.com') > -1) return;
  if (req.mode === 'navigate' || url.origin === self.location.origin) {
    event.respondWith(fetch(req).then(function (res) {
      const copy = res.clone();
      caches.open(CACHE).then(function (cache) { cache.put(req, copy); });
      return res;
    }).catch(function () {
      return caches.match(req).then(function (hit) { return hit || caches.match('./index.html') || caches.match('./'); });
    }));
    return;
  }
  if (url.hostname.indexOf('fonts.g') > -1) {
    event.respondWith(caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (res) {
        const copy = res.clone();
        caches.open(CACHE).then(function (cache) { cache.put(req, copy); });
        return res;
      });
    }));
  }
});
