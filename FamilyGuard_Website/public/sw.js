// FamilyGuard shell worker: intentionally does not cache sensitive API responses.
self.addEventListener('install', event => { self.skipWaiting(); });
self.addEventListener('activate', event => { event.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', event => {
 if (event.request.method === 'GET' && new URL(event.request.url).origin === self.location.origin && !new URL(event.request.url).pathname.startsWith('/api/')) {
   event.respondWith(fetch(event.request));
 }
});
