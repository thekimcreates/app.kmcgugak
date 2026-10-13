const VERSION = "kmc-web-shell-v3-desktop";
const SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./desktop.css",
  "./manifest.webmanifest",
  "./js/app.js",
  "./js/models.js",
  "./js/ui.js",
  "./js/chat.js",
  "./js/config.js",
  "./js/firebase.js",
  "./js/demo.js",
  "./assets/branding/kmc-gugak-circlelogo.png",
  "./assets/branding/kmc-gugak-full-logo.png",
  "./privacy.html",
  "./assets/icon.svg",
];
self.addEventListener("install", (event) =>
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(SHELL))),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) => key.startsWith("kmc-web-shell-") && key !== VERSION,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  ),
);
// Only the public app shell is cached. Private chat requests, photos, files,
// Firebase endpoints, and member records never enter this service-worker cache.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin)
    return;
  const base = new URL("./", self.location);
  const relative = url.pathname.slice(base.pathname.length);
  const known = SHELL.some((path) => path.replace(/^\.\//, "") === relative);
  if (
    event.request.mode === "navigate" &&
    (relative === "" || relative === "index.html")
  ) {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(new URL("index.html", base).href),
      ),
    );
  } else if (known) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok && response.type === "basic") {
            const copy = response.clone();
            caches
              .open(VERSION)
              .then((cache) =>
                cache.put(new Request(url.origin + url.pathname), copy),
              );
          }
          return response;
        })
        .catch(() => caches.match(url.origin + url.pathname)),
    );
  }
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windows) => {
        if (windows[0]) return windows[0].focus();
        return self.clients.openWindow(new URL("./#chat", self.location).href);
      }),
  );
});
