'use client';

import { useState, useEffect } from 'react';
import { useNotifications } from '@/hooks/useNotifications';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export default function NotificationsSetupPage() {
    const { permission, subscribed, loading, subscribe } = useNotifications();
    const [swStatus, setSwStatus] = useState<'checking' | 'ok' | 'error'>('checking');
    const [vapidOk, setVapidOk] = useState<boolean | null>(null);
    const [testResult, setTestResult] = useState<string>('');
    const [testLoading, setTestLoading] = useState(false);
    const [subCount, setSubCount] = useState<number | null>(null);

    // Verificar estado del service worker
    useEffect(() => {
        if (typeof window === 'undefined') return;
        navigator.serviceWorker.getRegistrations().then((regs) => {
            const hasPushSW = regs.some((r) => r.active?.scriptURL?.includes('sw-push'));
            setSwStatus(hasPushSW ? 'ok' : 'error');
        }).catch(() => setSwStatus('error'));

        // Verificar VAPID
        setVapidOk(!!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
    }, []);

    // Comprobar cuántas suscripciones hay en el backend
    useEffect(() => {
        fetch(`${API_URL}/notifications/subscriptions-count?tenant_id=default`)
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d?.count !== undefined) setSubCount(d.count); })
            .catch(() => { });
    }, [subscribed]);

    const handleSubscribe = async () => {
        const ok = await subscribe();
        if (ok) {
            setTestResult('✅ ¡Suscripción activada! Ahora recibirás notificaciones.');
        } else {
            setTestResult('❌ No se pudo activar. Revisa los permisos del navegador.');
        }
    };

    const handleTestPush = async () => {
        setTestLoading(true);
        setTestResult('');
        try {
            const res = await fetch(`${API_URL}/notifications/test-push`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tenant_id: 'default' }),
            });
            if (res.ok) {
                setTestResult('✅ Push de prueba enviado. Deberías recibir la notificación en segundos.');
            } else {
                const err = await res.json();
                setTestResult(`❌ Error: ${err.detail || res.statusText}`);
            }
        } catch (e) {
            setTestResult(`❌ No se pudo conectar al backend: ${e}`);
        } finally {
            setTestLoading(false);
        }
    };

    const steps = [
        {
            id: 1,
            label: 'VAPID keys configuradas',
            ok: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
            help: 'Agrega NEXT_PUBLIC_VAPID_PUBLIC_KEY en las variables de entorno de Vercel',
        },
        {
            id: 2,
            label: 'Service Worker activo',
            ok: swStatus === 'ok',
            help: 'Recarga la página. Si persiste, verifica que sw-push.js está en /public',
        },
        {
            id: 3,
            label: 'Permiso del navegador',
            ok: permission === 'granted',
            help: permission === 'denied'
                ? '⚠️ Bloqueaste las notificaciones. Ve a Configuración del navegador → Notificaciones → Permitir para este sitio'
                : 'Toca el botón "Activar notificaciones" abajo',
        },
        {
            id: 4,
            label: 'Suscripción guardada en backend',
            ok: subscribed && (subCount === null || subCount > 0),
            help: 'Presiona Activar notificaciones para guardar la suscripción',
        },
    ];

    const allOk = steps.every(s => s.ok);
    const pendingStep = steps.find(s => !s.ok);

    return (
        <div className="p-6 max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-800">🔔 Configurar Notificaciones</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Recibe una alerta con sonido cada vez que entre una nueva venta — en el celular y el computador.
                </p>
            </div>

            {/* Estado general */}
            <div className={`rounded-2xl p-4 border-2 ${allOk ? 'border-green-300 bg-green-50' : 'border-amber-300 bg-amber-50'}`}>
                <p className={`font-semibold text-sm ${allOk ? 'text-green-700' : 'text-amber-700'}`}>
                    {allOk ? '✅ Todo configurado correctamente. Las notificaciones están activas.' : `⚠️ Paso pendiente: ${pendingStep?.label}`}
                </p>
                {!allOk && pendingStep && (
                    <p className="text-xs text-amber-600 mt-1">{pendingStep.help}</p>
                )}
            </div>

            {/* Checklist */}
            <div className="bg-white rounded-2xl shadow divide-y">
                {steps.map(step => (
                    <div key={step.id} className="flex items-start gap-3 px-5 py-4">
                        <span className={`mt-0.5 text-lg ${step.ok ? 'text-green-500' : 'text-gray-300'}`}>
                            {step.ok ? '✅' : '⭕'}
                        </span>
                        <div className="flex-1">
                            <p className={`text-sm font-medium ${step.ok ? 'text-gray-800' : 'text-gray-500'}`}>
                                Paso {step.id}: {step.label}
                            </p>
                            {!step.ok && (
                                <p className="text-xs text-amber-600 mt-0.5">{step.help}</p>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Acción principal */}
            {!allOk && permission !== 'denied' && (
                <button
                    onClick={handleSubscribe}
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <><span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> Activando...</>
                    ) : (
                        '🔔 Activar notificaciones en este dispositivo'
                    )}
                </button>
            )}

            {permission === 'denied' && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                    <p className="font-semibold mb-1">🚫 Notificaciones bloqueadas en este navegador</p>
                    <p>Para desbloquear:</p>
                    <ul className="list-disc pl-4 mt-1 space-y-1">
                        <li><b>Chrome desktop:</b> Haz clic en el 🔒 candado en la barra de dirección → Notificaciones → Permitir</li>
                        <li><b>Chrome Android:</b> Menú ⋮ → Configuración del sitio → Notificaciones → Permitir</li>
                        <li><b>Safari iPhone:</b> Ajustes del iPhone → Safari → Notificaciones → Permitir para este sitio</li>
                    </ul>
                </div>
            )}

            {/* Prueba de notificación */}
            {allOk && (
                <div className="bg-white rounded-2xl shadow p-5 space-y-3">
                    <h2 className="font-semibold text-gray-800">🧪 Probar notificación</h2>
                    <p className="text-sm text-gray-500">Envía una notificación de prueba a este dispositivo ahora mismo.</p>
                    <button
                        onClick={handleTestPush}
                        disabled={testLoading}
                        className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-60"
                    >
                        {testLoading ? 'Enviando...' : '📤 Enviar notificación de prueba'}
                    </button>
                    {testResult && (
                        <p className={`text-sm font-medium ${testResult.startsWith('✅') ? 'text-emerald-600' : 'text-red-600'}`}>
                            {testResult}
                        </p>
                    )}
                </div>
            )}

            {/* Info de dispositivos */}
            <div className="bg-white rounded-2xl shadow p-5">
                <h2 className="font-semibold text-gray-800 mb-3">📱 ¿Cómo llega a cada dispositivo?</h2>
                <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex gap-2"><span>🤖</span><span><b>Android:</b> Llega a la barra de notificaciones igual que WhatsApp, con vibración y sonido.</span></div>
                    <div className="flex gap-2"><span>🍎</span><span><b>iPhone:</b> Guarda la app en pantalla de inicio (Safari → "Añadir a pantalla de inicio") → activa desde la app instalada.</span></div>
                    <div className="flex gap-2"><span>💻</span><span><b>Computador:</b> Aparece en la esquina de la pantalla con el sonido de moneda.</span></div>
                    <div className="flex gap-2"><span>⚠️</span><span><b>Importante:</b> Debes activar en cada dispositivo donde quieras recibirlas.</span></div>
                </div>
            </div>
        </div>
    );
}
