const VERSION = "streamivio-offline-v1";
const SHELL = ["/", "/offline", "/manifest.json", "/streamivio-icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await Promise.all(SHELL.map(async (url) => {
      try { const response = await fetch(url, { cache: "reload" }); if (response.ok) await cache.put(url, response); } catch {}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith("streamivio-") && key !== VERSION).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      const cache = await caches.open(VERSION);
      try {
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      } catch {
        return (await cache.match(request)) || (await cache.match("/")) || (await cache.match("/offline"));
      }
    })());
    return;
  }

  if (url.pathname.startsWith("/api/search")) {
    event.respondWith((async () => {
      const cache = await caches.open(VERSION);
      try {
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      } catch {
        return (await cache.match(request)) || Response.json({ results: [], offline: true, message: "Connect to the internet to refresh this catalogue." }, { headers: { "Content-Type": "application/json" } });
      }
    })());
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || /\.(?:css|js|svg|png|jpg|jpeg|webp|woff2?)$/i.test(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(VERSION);
      const cached = await cache.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      } catch { return new Response("", { status: 504, statusText: "Offline" }); }
    })());
  }
});
