/**
 * SW kill-switch: clears old caches and stops intercepting requests.
 * Safe to deploy. Does not affect Supabase PKCE.
 */
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch (e) {}
    await self.clients.claim();
  })());
});

// Do NOT intercept fetch; let network handle everything.
self.addEventListener("fetch", () => {});
