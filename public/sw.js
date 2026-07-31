const CACHE_NAME = "batchflix-v2";
// Only the unauthenticated entry point is precached. Precaching /library,
// /lists and /stats fetched them without a session, so the cache could end up
// holding an auth redirect instead of the real page. Authenticated pages are
// cached at runtime once they have actually been loaded by a signed-in user.
const SHELL_URLS = ["/"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Network-first for API routes
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: "Offline" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        })
      )
    );
    return;
  }

  // Cache-first for static assets
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|ico|woff|woff2)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
    return;
  }

  // Network-first for pages, fallback to cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Only store real, same-origin page responses. Caching redirects (an
        // expired session bouncing to /auth/login) or error pages would pin
        // them as the offline version of a route the user can actually see.
        const cacheable =
          request.method === "GET" &&
          response.ok &&
          !response.redirected &&
          response.type === "basic";
        if (cacheable) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
