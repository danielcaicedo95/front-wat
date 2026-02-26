// src/hooks/useNotifications.ts
"use client";

import { useEffect, useRef, useState } from "react";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const uint8 = new Uint8Array([...rawData].map((c) => c.charCodeAt(0)));
    return uint8.buffer as ArrayBuffer;
}

export type NotificationPermission = "default" | "granted" | "denied";

export function useNotifications(tenantId: string = "default") {
    const [permission, setPermission] = useState<NotificationPermission>("default");
    const [subscribed, setSubscribed] = useState(false);
    const [loading, setLoading] = useState(false);
    const swRef = useRef<ServiceWorkerRegistration | null>(null);

    useEffect(() => {
        if (typeof window === "undefined" || !("Notification" in window)) return;
        setPermission(Notification.permission as NotificationPermission);

        // Verificar si ya hay una suscripción activa
        navigator.serviceWorker.ready.then((reg) => {
            swRef.current = reg;
            reg.pushManager.getSubscription().then((sub) => {
                setSubscribed(!!sub);
            });
        });
    }, []);

    const subscribe = async (): Promise<boolean> => {
        if (!VAPID_PUBLIC_KEY) {
            console.error("[Push] NEXT_PUBLIC_VAPID_PUBLIC_KEY no configurada");
            return false;
        }

        setLoading(true);
        try {
            // 1. Solicitar permiso al usuario
            const result = await Notification.requestPermission();
            setPermission(result as NotificationPermission);
            if (result !== "granted") return false;

            // 2. Registrar el Service Worker si no está activo
            const reg =
                swRef.current ||
                (await navigator.serviceWorker.register("/sw-push.js", { scope: "/" }));
            swRef.current = reg;

            // 3. Crear la suscripción push
            const subscription = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
            });

            // 4. Enviar la suscripción al backend para guardarla
            const res = await fetch(`${API_URL}/notifications/subscribe`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ subscription, tenant_id: tenantId }),
            });

            if (!res.ok) throw new Error("Error guardando suscripción en el backend");

            setSubscribed(true);
            return true;
        } catch (err) {
            console.error("[Push] Error al suscribir:", err);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const unsubscribe = async (): Promise<void> => {
        const reg = swRef.current || (await navigator.serviceWorker.ready);
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
            await sub.unsubscribe();
            setSubscribed(false);
        }
    };

    return { permission, subscribed, loading, subscribe, unsubscribe };
}
