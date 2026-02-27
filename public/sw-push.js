// public/sw-push.js
// Service Worker personalizado para Web Push Notifications
// Con sonido de moneda vía BroadcastChannel + vibración en móvil

self.addEventListener('push', function (event) {
    if (!event.data) return;

    let data = {};
    try {
        data = event.data.json();
    } catch {
        data = { title: 'Intelliqbot', body: event.data.text() };
    }

    const title = data.title || '💰 Nueva Venta';
    const options = {
        body: data.body || 'Tienes una nueva venta en tu tienda',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        // Patrón de vibración: vibra-pausa-vibra-pausa-vibra (como moneda)
        vibrate: [100, 50, 200, 50, 100],
        data: {
            url: data.url || '/sales',
            orderId: data.orderId || null,
        },
        actions: [
            { action: 'view', title: '👁️ Ver pedido' },
            { action: 'dismiss', title: 'Ignorar' },
        ],
        requireInteraction: true, // No desaparece sola — el dueño debe verla
        silent: false,            // Usa el sonido del sistema del celular/computador
        tag: 'sale-notification', // Agrupa notificaciones (no spam)
        renotify: true,           // Suena aunque ya haya una notificación anterior
    };

    // 📢 Avisar a todas las pestañas abiertas para que reproduzcan el sonido
    const broadcastPromise = clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
            clientList.forEach((client) => {
                client.postMessage({
                    type: 'SALE_SOUND',
                    orderId: data.orderId,
                    total: data.total,
                    customer: data.customer,
                });
            });
        });

    event.waitUntil(
        Promise.all([
            self.registration.showNotification(title, options),
            broadcastPromise,
        ])
    );
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    if (event.action === 'dismiss') return;

    const targetUrl = event.notification.data?.url || '/sales';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Si ya hay una pestaña abierta, navegar a /sales y enfocarla
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
