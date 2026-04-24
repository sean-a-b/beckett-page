const CACHE_NAME = "journal-cache-v1";

const FILES_TO_CACHE = [
  "/pwa/",
  "/pwa/index.html",
  "/pwa/style.css",
  "/pwa/app.js",
  "/pwa/db.js",
  "/pwa/manifest.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});