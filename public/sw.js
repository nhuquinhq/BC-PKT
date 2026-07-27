/* Service worker tối giản cho PWA — không cache dữ liệu báo cáo
   (số liệu luôn lấy mạng để đảm bảo realtime). */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
