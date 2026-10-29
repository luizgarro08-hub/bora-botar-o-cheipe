const C = "neongym-v1";
const ARQ = ["/", "/index.html", "/manifest.json", "/icon-192.png", "/icon-512.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(C).then(c => c.addAll(ARQ))); self.skipWaiting(); });
self.addEventListener("activate", e => e.waitUntil(
  caches.keys().then(k => Promise.all(k.filter(n => n !== C).map(n => caches.delete(n)))).then(() => self.clients.claim())
));
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin || u.pathname.startsWith("/api/")) return;
  e.respondWith(
    fetch(e.request).then(r => { const cp = r.clone(); caches.open(C).then(c => c.put(e.request, cp)); return r; })
      .catch(() => caches.match(e.request).then(m => m || caches.match("/index.html")))
  );
});
