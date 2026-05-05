// public/sw-push.js
// Service Worker personalizado para Web Push Notifications
// Soporte para notificaciones de aprobación de pedidos (Aceptar / Rechazar)

// ─── Leer las variables de entorno inyectadas desde el frontend ───────────────
// NOTA: El SW no tiene acceso a process.env. La URL del API y la key se leen
// desde el localStorage del cliente vía BroadcastChannel (ver useNotifications).
// Si no están disponibles, se navega al dashboard en su lugar.
// ─────────────────────────────────────────────────────────────────────────────

self.addEventListener('push', function (event) {
    if (!event.data) return;

    let data = {};
    try {
        data = event.data.json();
    } catch {
        data = { title: 'Intelliqbot', body: event.data.text() };
    }

    const title = data.title || '💰 Nueva Venta';
    const requiresApproval = data.requiresApproval === true;

    // Acciones: si el pedido requiere aprobación, mostrar Aceptar/Rechazar
    // Si es una venta normal, mostrar Ver pedido / Ignorar
    const actions = requiresApproval
        ? [
            { action: 'approve', title: '✅ Aceptar' },
            { action: 'reject',  title: '❌ Rechazar' },
          ]
        : [
            { action: 'view',    title: '👁️ Ver pedido' },
            { action: 'dismiss', title: 'Ignorar' },
          ];

    const options = {
        body: data.body || 'Tienes una nueva venta en tu tienda',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        vibrate: [100, 50, 200, 50, 100],
        data: {
            url: data.url || '/sales',
            orderId: data.orderId || null,
            requiresApproval,
            apiUrl: data.apiUrl || null,    // inyectado por el backend si está configurado
            apiKey: data.apiKey || null,
        },
        actions,
        requireInteraction: true,
        silent: false,
        tag: requiresApproval ? `approval-${data.orderId}` : 'sale-notification',
        renotify: true,
    };

    // 📢 Avisar a todas las pestañas abiertas para que reproduzcan el sonido
    const broadcastPromise = clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
            clientList.forEach((client) => {
                client.postMessage({
                    type: requiresApproval ? 'ORDER_APPROVAL_NEEDED' : 'SALE_SOUND',
                    orderId: data.orderId,
                    total: data.total,
                    customer: data.customer,
                    requiresApproval,
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

    const notifData = event.notification.data || {};
    const { orderId, requiresApproval, url } = notifData;
    const action = event.action;

    // ── Acciones de aprobación (tap en Aceptar / Rechazar) ────────────────────
    if (requiresApproval && orderId && (action === 'approve' || action === 'reject')) {
        event.waitUntil(
            (async () => {
                // Intentar leer API URL y key desde una pestaña abierta del dashboard
                const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
                let apiUrl = null;
                let apiKey = null;

                for (const client of clientList) {
                    // Pedir las credenciales al cliente vía postMessage y esperar respuesta
                    try {
                        const credentials = await new Promise((resolve) => {
                            const channel = new MessageChannel();
                            channel.port1.onmessage = (e) => resolve(e.data);
                            client.postMessage({ type: 'GET_API_CREDENTIALS' }, [channel.port2]);
                            setTimeout(() => resolve(null), 1500); // timeout 1.5s
                        });
                        if (credentials && credentials.apiUrl) {
                            apiUrl = credentials.apiUrl;
                            apiKey = credentials.apiKey;
                            break;
                        }
                    } catch (e) {}
                }

                if (apiUrl && orderId) {
                    try {
                        await fetch(`${apiUrl}/orders/${orderId}/review`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                ...(apiKey ? { 'X-API-Key': apiKey } : {}),
                            },
                            body: JSON.stringify({ action, tenant_id: 'default' }),
                        });
                        // Actualizar el badge en pestañas abiertas
                        clientList.forEach(c => c.postMessage({
                            type: 'ORDER_REVIEWED',
                            orderId,
                            action,
                        }));
                    } catch (e) {
                        console.error('[SW] Error enviando revisión:', e);
                    }
                }

                // Navegar al dashboard sin importar si el fetch tuvo éxito
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        client.navigate('/sales');
                        return client.focus();
                    }
                }
                if (clients.openWindow) return clients.openWindow('/sales');
            })()
        );
        return;
    }

    // ── Acción dismiss: solo cerrar ───────────────────────────────────────────
    if (action === 'dismiss') return;

    // ── Acción view / tap en el cuerpo: navegar al dashboard ─────────────────
    const targetUrl = url || '/sales';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.navigate(targetUrl);
                    return client.focus();
                }
            }
            if (clients.openWindow) return clients.openWindow(targetUrl);
        })
    );
});
