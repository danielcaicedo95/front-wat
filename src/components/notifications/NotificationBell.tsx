// src/components/notifications/NotificationBell.tsx
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import { createClient } from "@supabase/supabase-js";
import { playCoinSound } from "@/lib/coinSound";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Order {
    id: string;
    name: string;
    total: number;
    created_at: string;
    phone_number: string;
}

export default function NotificationBell() {
    const { permission, subscribed, loading, subscribe } = useNotifications();
    const [unreadCount, setUnreadCount] = useState(0);
    const [recentOrders, setRecentOrders] = useState<Order[]>([]);
    const [open, setOpen] = useState(false);
    const [showInstallBanner, setShowInstallBanner] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    // Para desbloquear el AudioContext en el primer clic del usuario
    const audioUnlocked = useRef(false);

    // Escuchar el evento de instalación de PWA
    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowInstallBanner(true);
        };
        window.addEventListener("beforeinstallprompt", handler);
        return () => window.removeEventListener("beforeinstallprompt", handler);
    }, []);

    // Desbloquear AudioContext en el primer clic (requerido por navegadores)
    useEffect(() => {
        const unlock = () => {
            if (!audioUnlocked.current) {
                audioUnlocked.current = true;
                // Reproducir silencio para desbloquear el contexto de audio
                playCoinSound(0.001);
            }
        };
        document.addEventListener("click", unlock, { once: true });
        return () => document.removeEventListener("click", unlock);
    }, []);

    // Escuchar mensajes del service worker (push llegó con la app en background)
    useEffect(() => {
        const handleSWMessage = (event: MessageEvent) => {
            if (event.data?.type === 'SALE_SOUND') {
                playCoinSound(0.7);
                setUnreadCount(prev => prev + 1);
            }
        };
        navigator.serviceWorker?.addEventListener('message', handleSWMessage);
        return () => navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
    }, []);

    const installApp = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") setShowInstallBanner(false);
        setDeferredPrompt(null);
    };

    // Cargar órdenes recientes (últimas 24h)
    const loadRecentOrders = useCallback(async () => {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data } = await supabase
            .from("orders")
            .select("id, name, total, created_at, phone_number")
            .gte("created_at", since)
            .order("created_at", { ascending: false })
            .limit(10);

        if (data) {
            setRecentOrders(data);
            // Contar las no vistas (guardamos el timestamp del último visto en localStorage)
            const lastSeen = localStorage.getItem("lastSeenOrders") || "0";
            const unseen = data.filter((o) => o.created_at > lastSeen).length;
            setUnreadCount(unseen);
        }
    }, []);

    useEffect(() => {
        loadRecentOrders();
    }, [loadRecentOrders]);

    // Supabase Realtime: escuchar nuevas órdenes en tiempo real
    useEffect(() => {
        const channel = supabase
            .channel("orders-realtime")
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "orders" },
                (payload) => {
                    const newOrder = payload.new as Order;
                    setRecentOrders((prev) => [newOrder, ...prev].slice(0, 10));
                    setUnreadCount((prev) => prev + 1);

                    // 🪙 Sonido de moneda sintetizado + vibración en móvil
                    playCoinSound(0.7);
                    if ('vibrate' in navigator) {
                        navigator.vibrate([100, 50, 200, 50, 100]);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const markAllRead = () => {
        localStorage.setItem("lastSeenOrders", new Date().toISOString());
        setUnreadCount(0);
        setOpen(false);
    };

    const formatPrice = (n: number) =>
        `$${n?.toLocaleString("es-CO")}`;

    const formatTime = (iso: string) => {
        const d = new Date(iso);
        const now = new Date();
        const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
        if (diffMin < 1) return "ahora mismo";
        if (diffMin < 60) return `hace ${diffMin}m`;
        const diffH = Math.floor(diffMin / 60);
        if (diffH < 24) return `hace ${diffH}h`;
        return d.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
    };

    return (
        <div className="flex items-center gap-3">
            {/* Banner instalar PWA */}
            {showInstallBanner && (
                <button
                    onClick={installApp}
                    className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    📲 Instalar app
                </button>
            )}

            {/* Botón activar notificaciones si no están activas */}
            {permission !== "granted" && (
                <button
                    onClick={subscribe}
                    disabled={loading}
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
                >
                    🔔 {loading ? "Activando..." : "Activar alertas"}
                </button>
            )}

            {/* Campana de notificaciones */}
            <div className="relative">
                <button
                    onClick={() => { setOpen(!open); if (!open) loadRecentOrders(); }}
                    className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors"
                    aria-label="Notificaciones"
                >
                    <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                        />
                    </svg>
                    {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    )}
                </button>

                {/* Panel desplegable de notificaciones */}
                {open && (
                    <>
                        <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
                        <div className="absolute right-0 top-11 z-40 w-80 rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden">
                            {/* Header */}
                            <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">Ventas recientes</p>
                                    <p className="text-xs text-gray-500">Últimas 24 horas</p>
                                </div>
                                {unreadCount > 0 && (
                                    <button onClick={markAllRead} className="text-xs text-indigo-600 hover:underline font-medium">
                                        Marcar todas leídas
                                    </button>
                                )}
                            </div>

                            {/* Lista de órdenes */}
                            <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                                {recentOrders.length === 0 ? (
                                    <div className="py-8 text-center text-sm text-gray-400">
                                        <p className="text-2xl mb-2">🛒</p>
                                        <p>Sin ventas en las últimas 24h</p>
                                    </div>
                                ) : (
                                    recentOrders.map((order) => (
                                        <div
                                            key={order.id}
                                            className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                                        >
                                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-sm">
                                                🛍️
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">
                                                    {order.name || "Cliente"}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {order.phone_number} · {formatTime(order.created_at)}
                                                </p>
                                            </div>
                                            <span className="text-sm font-semibold text-green-600 whitespace-nowrap">
                                                {formatPrice(order.total)}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Footer */}
                            <div className="px-4 py-2.5 border-t bg-gray-50">
                                <a href="/sales" onClick={() => setOpen(false)} className="text-xs text-indigo-600 hover:underline font-medium">
                                    Ver todas las ventas →
                                </a>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
