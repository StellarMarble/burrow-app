// Burrow service worker — cache-first shell, network-first feed.
const SHELL = "burrow-shell-v2";
const SHELL_FILES = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "icon-180.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== SHELL && k !== "burrow-feed").map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (url.pathname.endsWith("feed.json")) {
    // network-first, fall back to last cached feed (offline reads)
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const copy = res.clone();
          caches.open("burrow-feed").then(c => c.put("feed.json", copy));
          return res;
        })
        .catch(() => caches.open("burrow-feed").then(c => c.match("feed.json")))
    );
  } else {
    e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request)));
  }
});
