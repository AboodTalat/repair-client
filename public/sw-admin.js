/* Admin console PWA service worker — registered with scope "/r3pr-console/".
 *
 * Completely separate from the storefront worker (sw.js): its own scope,
 * manifest (manifest.admin.webmanifest), icons, and push subscriptions. Handles
 * Web Push (VAPID) so the admin console can receive order / message / stock /
 * low-stock alerts — including on iOS 16.4+ when installed to the home screen.
 *
 * Bump SW_VERSION to force-update this worker on clients.
 */
const SW_VERSION = "admin-v1";
const DEFAULT_URL = "/r3pr-console/dashboard";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {});

// Push — the server sends a JSON payload { title, body, url, tag, ... }.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "Repair Console", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Repair Console";
  const options = {
    body: data.body || "",
    icon: data.icon || "/icons/admin-192.png",
    badge: data.badge || "/icons/badge-96.png",
    // A tag collapses repeats of the same event; renotify still alerts.
    tag: data.tag || undefined,
    renotify: Boolean(data.tag),
    data: { url: data.url || DEFAULT_URL },
    timestamp: Date.now(),
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Click — focus an existing console tab (and navigate it) or open a new one.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || DEFAULT_URL;
  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clientList) {
        if (client.url.includes("/r3pr-console")) {
          await client.focus();
          if ("navigate" in client) {
            try {
              await client.navigate(targetUrl);
            } catch (e) {
              /* cross-origin or not allowed — ignore */
            }
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })()
  );
});
