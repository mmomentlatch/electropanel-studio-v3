const SCOPE = new URL(self.registration.scope);
const CACHE_PREFIX = `electropanel-studio-v3-${encodeURIComponent(SCOPE.pathname)}-`;
const CACHE = `${CACHE_PREFIX}v242`;
const INDEX_URL = new URL("index.html", SCOPE).href;
const ASSETS = [
  "./",
  "./index.html",
  "./viewer.html",
  "./viewer.js",
  "./snapshot-codec.js",
  "./language.js?v=242",
  "./language-data.js?v=242",
  "./boot.js?v=242",
  "./runtime-uk.js?v=242",
  "./runtime-en.js?v=242",
  "./runtime-ru.js?v=242",
  "./language.css?v=242",
  "./workspace-tools.css?v=242",
  "./site.css?v=242",
  "./assets/brand/logo.svg?v=242",
  "./assets/brand/social-card.png?v=242",
  "./robots.txt",
  "./sitemap.xml",
  "./404.html",
  "./README.md",
  "./styles.css?v=242",
  "./buttons.css?v=242",
  "./wiring.css?v=242",
  "./templates.css?v=242",
  "./mechanical.css?v=242",
  "./schematic.css?v=242",
  "./floor-plan.css?v=242",
  "./manifest.webmanifest",
  "./assets/devices/mcb-1p.png",
  "./assets/devices/rccb-2p.png",
  "./assets/devices/spd-2p.png",
  "./assets/devices/contactor.png",
  "./assets/devices/voltage-relay.png",
  "./assets/devices/energy-meter.png",
  "./assets/devices/terminal-block.png",
  "./assets/devices/power-supply.svg",
  "./assets/devices/control-relay.svg",
  "./assets/devices/timer-relay.svg",
  "./assets/devices/contactor-2p.svg",
  "./assets/devices/contactor-3p.svg",
  "./assets/devices/motor-protection.svg",
  "./assets/devices/indicator.svg",
  "./assets/devices/outlet.svg",
  "./assets/devices/rccb-2p.svg",
  "./assets/devices/rccb-4p.svg",
  "./assets/devices/rcbo.svg",
  "./assets/devices/rcbo-afdd.svg",
  "./uk/index.html",
  "./uk/panel-designer/index.html",
  "./uk/single-line-diagram/index.html",
  "./uk/wiring-plan/index.html",
  "./uk/cable-schedule/index.html",
  "./uk/circuit-breaker-and-cable/index.html",
  "./en/index.html",
  "./en/panel-designer/index.html",
  "./en/single-line-diagram/index.html",
  "./en/wiring-plan/index.html",
  "./en/cable-schedule/index.html",
  "./en/circuit-breaker-and-cable/index.html",
  "./ru/index.html",
  "./ru/panel-designer/index.html",
  "./ru/single-line-diagram/index.html",
  "./ru/wiring-plan/index.html",
  "./ru/cable-schedule/index.html",
  "./ru/circuit-breaker-and-cable/index.html"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== SCOPE.origin || !url.pathname.startsWith(SCOPE.pathname)) return;
  if (url.pathname.startsWith(new URL("api/", SCOPE).pathname)) return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).then((response) => {
      if (response.ok && (url.pathname === SCOPE.pathname || url.href === INDEX_URL)) { const copy = response.clone(); event.waitUntil(caches.open(CACHE).then((cache) => cache.put(INDEX_URL, copy))); }
      return response;
    }).catch(() => caches.open(CACHE).then(async (cache) => {
      const entry = url.pathname === SCOPE.pathname || url.pathname === new URL(INDEX_URL).pathname;
      if (entry) return cache.match(INDEX_URL);
      const page = new URL(url.href); page.search = ""; page.hash = "";
      if (page.pathname.endsWith("/")) page.pathname += "index.html";
      const cached = await cache.match(page.href);
      if (cached) return cached;
      const missing = await cache.match(new URL("404.html", SCOPE).href);
      return new Response(missing ? await missing.text() : "Offline", { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } });
    })));
    return;
  }
  event.respondWith(caches.open(CACHE).then((cache) => cache.match(event.request)).then((cached) => cached || fetch(event.request).then((response) => {
    if (response.ok) { const copy = response.clone(); event.waitUntil(caches.open(CACHE).then((cache) => cache.put(event.request, copy))); }
    return response;
  })));
});
