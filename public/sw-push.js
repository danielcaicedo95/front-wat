// public/sw-push.js
// Service Worker personalizado para Web Push Notifications

self.addEventListener('push', function (event) {
    if (!event.data) return;

    let data = {};
    try {
        data = event.data.json();
    } catch {
        data = { title: 'Intelliqbot', body: event.data.text() };
    }

    const title = data.title || '🛒 Nueva Venta';
    const options = {
        body: data.body || 'Tienes una nueva venta en tu tienda',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        vibrate: [200, 100, 200],
        data: {
            url: data.url || '/',
            orderId: data.orderId || null,
        },
        actions: [
            { action: 'view', title: 'Ver pedido' },
            { action: 'dismiss', title: 'Ignorar' },
        ],
        requireInteraction: true, // La notificación no desaparece sola
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    if (event.action === 'dismiss') return;

    const targetUrl = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Si ya hay una pestaña abierta, enfocarla
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.navigate(targetUrl);
                    return client.focus();
                }
            }
            // Si no hay pestaña abierta, abrir una nueva
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
