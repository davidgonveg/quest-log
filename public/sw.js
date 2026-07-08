// Service worker mínimo: hace la app instalable. Sin cache offline en v1
// (la app es local/self-hosted; la red es el propio servidor).
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
