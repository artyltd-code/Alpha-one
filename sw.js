const CACHE_NAME="alpha-one-v2.0.0";
const ASSETS=["./","./index.html","./css/style.css","./js/storage.js","./js/market.js","./js/app.js","./manifest.json","./assets/icon-192.svg","./assets/icon-512.svg"];
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(ASSETS)))});
self.addEventListener("fetch",event=>{event.respondWith(fetch(event.request).catch(()=>caches.match(event.request)))});
