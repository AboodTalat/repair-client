/* Storefront PWA service worker — scope "/".
 *
 * Deliberately minimal: it makes the storefront installable (a registered SW +
 * manifest is the install criterion) without adding offline caching yet. It does
 * NOT handle push — customer push is out of scope for now (the admin console has
 * its own separate service worker, sw-admin.js, scoped to /r3pr-console/).
 *
 * Bump SW_VERSION to force-update this worker on clients.
 */
const SW_VERSION = "storefront-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// A fetch listener is part of the installability heuristic. Pass through to the
// network (no custom caching).
self.addEventListener("fetch", () => {});
