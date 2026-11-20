// Trang web Tree Ebook không dùng service worker ở thư mục gốc (app có service worker riêng trong /app/).
// Tệp này chỉ để gỡ service worker cũ của bản app trước kia từng nằm ở thư mục gốc.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) await caches.delete(k);
    await self.registration.unregister();
    for (const c of await self.clients.matchAll({ type: 'window' })) c.navigate(c.url).catch(() => {});
  })());
});
