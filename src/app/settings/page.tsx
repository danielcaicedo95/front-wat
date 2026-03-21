'use client';

import { useEffect, useState } from 'react';
import { useNotifications } from '@/hooks/useNotifications';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type CatalogMode = 'supabase' | 'meta' | 'hybrid';
type Tab = 'catalog' | 'messages' | 'notifications';

interface Settings {
  catalog_mode: CatalogMode;
  welcome_message: string;
  min_age: string;
  age_gate_question: string;
  age_yes_button: string;
  age_no_button: string;
  age_rejection_message: string;
}

const CATALOG_MODES: { id: CatalogMode; icon: string; label: string; description: string; badge?: string }[] = [
  { id: 'supabase', icon: '🗄️', label: 'Solo Supabase', description: 'Lista interactiva con todos tus productos desde la base de datos.' },
  { id: 'meta',     icon: '🛍️', label: 'Solo Meta Catalog', description: 'Catálogo nativo de WhatsApp. Solo muestra productos aprobados por Meta.' },
  { id: 'hybrid',   icon: '🔀', label: 'Híbrido', description: 'Meta para productos aprobados + Supabase para el resto. Recomendado.', badge: 'Recomendado' },
];

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'catalog',       label: 'Catálogo',       icon: '📦' },
  { id: 'messages',      label: 'Mensajes',        icon: '💬' },
  { id: 'notifications', label: 'Notificaciones',  icon: '🔔' },
];

const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all';

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-1.5">{hint}</p>}
      {children}
    </div>
  );
}

// ── Notificaciones ────────────────────────────────────────────────────────────
function NotificationsSection() {
  const { permission, subscribed, loading, subscribe } = useNotifications();
  const [testResult, setTestResult] = useState('');
  const [testLoading, setTestLoading] = useState(false);

  const handleSubscribe = async () => {
    const ok = await subscribe();
    setTestResult(ok ? '✅ ¡Listo! Recibirás alertas de ventas.' : '❌ No se pudo activar. Revisa permisos del navegador.');
  };

  const handleTest = async () => {
    setTestLoading(true); setTestResult('');
    try {
      const res = await fetch(`${API_BASE}/notifications/test-push`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: 'default' }),
      });
      if (res.ok) setTestResult('✅ Push de prueba enviado.');
      else { const e = await res.json(); setTestResult(`❌ ${e.detail || 'Error al enviar'}`); }
    } catch { setTestResult('❌ No se pudo conectar.'); }
    finally { setTestLoading(false); }
  };

  const isGranted = permission === 'granted';
  const isDenied  = permission === 'denied';

  return (
    <div className="p-6 space-y-5">
      <div className={`flex items-center gap-3 p-4 rounded-xl border ${isGranted ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
        <span className="text-2xl">{isGranted ? '✅' : '🔔'}</span>
        <div>
          <p className={`text-sm font-semibold ${isGranted ? 'text-green-800' : 'text-amber-800'}`}>
            {isGranted ? subscribed ? 'Notificaciones activas' : 'Permiso concedido — activa la suscripción' : isDenied ? 'Notificaciones bloqueadas' : 'Notificaciones no activadas'}
          </p>
          <p className={`text-xs mt-0.5 ${isGranted ? 'text-green-600' : 'text-amber-600'}`}>
            {isGranted ? 'Sonará cada vez que llegue una nueva venta.' : 'Activa para recibir alertas de ventas con sonido.'}
          </p>
        </div>
      </div>
      {isDenied && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold text-red-800">Cómo desbloquear:</p>
          <ul className="text-sm text-red-700 space-y-1 pl-1">
            <li>🖥️ <b>Chrome:</b> Haz clic en el 🔒 → Notificaciones → Permitir</li>
            <li>🤖 <b>Android:</b> Menú ⋮ → Conf. del sitio → Notificaciones → Permitir</li>
            <li>🍎 <b>Safari iPhone:</b> Ajustes → Safari → Notificaciones → Permitir</li>
          </ul>
        </div>
      )}
      {!isDenied && (
        <button onClick={handleSubscribe} disabled={loading || (isGranted && subscribed)}
          className={`w-full py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${isGranted && subscribed ? 'bg-green-100 text-green-700 cursor-default' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm active:scale-95 disabled:opacity-60'}`}>
          {loading ? <><span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> Activando...</> : isGranted && subscribed ? '✅ Activo en este dispositivo' : '🔔 Activar notificaciones'}
        </button>
      )}
      {testResult && (
        <p className={`text-sm font-medium px-4 py-2 rounded-lg ${testResult.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{testResult}</p>
      )}
      {isGranted && subscribed && (
        <div className="border-t border-gray-100 pt-5">
          <p className="text-sm font-medium text-gray-700 mb-2">Probar notificación</p>
          <p className="text-xs text-gray-400 mb-3">Envía un push de prueba ahora mismo.</p>
          <button onClick={handleTest} disabled={testLoading} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-60">
            {testLoading ? 'Enviando...' : '📤 Enviar prueba'}
          </button>
        </div>
      )}
      <p className="text-xs text-gray-400 text-center">Repite la activación en cada dispositivo donde quieras recibir alertas.</p>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('catalog');

  useEffect(() => {
    fetch(`${API_BASE}/api/settings`)
      .then((r) => r.json())
      .then((data) => { setSettings(data.settings); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true); setFeedback(null);
    try {
      const res = await fetch(`${API_BASE}/api/settings`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) setFeedback({ type: 'success', msg: '✅ Configuración guardada. Activa en ~60 segundos.' });
      else { const e = await res.json(); setFeedback({ type: 'error', msg: `❌ ${e.detail || 'No se pudo guardar'}` }); }
    } catch { setFeedback({ type: 'error', msg: '❌ Error de conexión.' }); }
    finally { setSaving(false); setTimeout(() => setFeedback(null), 6000); }
  };

  const patch = (key: keyof Settings, value: string) =>
    setSettings((s) => s ? { ...s, [key]: value } : s);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" /></div>;
  if (!settings) return <div className="p-8 text-red-500 text-sm">No se pudo cargar la configuración.</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">⚙️ Configuración</h1>
        <p className="text-sm text-gray-500 mt-1">Ajustes técnicos del catálogo, mensajes y notificaciones.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-full overflow-x-auto">
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-1 justify-center ${activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── Catálogo ── */}
      {activeTab === 'catalog' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800">Modo de Catálogo</h2>
            <p className="text-sm text-gray-500 mt-1">Define cómo se muestran los productos en WhatsApp.</p>
          </div>
          <div className="p-6 space-y-3">
            {CATALOG_MODES.map((mode) => {
              const isActive = settings.catalog_mode === mode.id;
              return (
                <button key={mode.id} onClick={() => patch('catalog_mode', mode.id)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${isActive ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{mode.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${isActive ? 'text-indigo-700' : 'text-gray-800'}`}>{mode.label}</span>
                          {mode.badge && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">{mode.badge}</span>}
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">{mode.description}</p>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isActive ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'}`}>
                      {isActive && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          {settings.catalog_mode === 'hybrid' && (
            <div className="mx-6 mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              <strong>💡 Modo Híbrido:</strong> Marca los productos aprobados en Meta desde Inventario.
            </div>
          )}
        </div>
      )}

      {/* ── Mensajes (Age Gate) ── */}
      {activeTab === 'messages' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800">Verificación de Edad (Age Gate)</h2>
            <p className="text-sm text-gray-500 mt-1">Mensajes de verificación de edad para productos regulados.</p>
          </div>
          <div className="p-6 space-y-5">
            <Field label="Edad mínima requerida">
              <input type="number" value={settings.min_age} onChange={(e) => patch('min_age', e.target.value)}
                className="w-32 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" min="13" max="25" />
              <p className="text-xs text-gray-400 mt-1">Colombia: 18 · USA: 21 · Suecia: 25</p>
            </Field>
            <Field label="Mensaje de bienvenida (gate de edad)">
              <textarea rows={3} value={settings.welcome_message} onChange={(e) => patch('welcome_message', e.target.value)} className={`${inp} resize-none`} />
            </Field>
            <Field label="Pregunta de verificación">
              <input type="text" value={settings.age_gate_question} onChange={(e) => patch('age_gate_question', e.target.value)} className={inp} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label={'Botón "Sí" (máx 20 chars)'}>
                <input type="text" maxLength={20} value={settings.age_yes_button} onChange={(e) => patch('age_yes_button', e.target.value)} className={inp} />
              </Field>
              <Field label={'Botón "No" (máx 20 chars)'}>
                <input type="text" maxLength={20} value={settings.age_no_button} onChange={(e) => patch('age_no_button', e.target.value)} className={inp} />
              </Field>
            </div>
            <Field label="Mensaje de rechazo (menores de edad)">
              <textarea rows={4} value={settings.age_rejection_message} onChange={(e) => patch('age_rejection_message', e.target.value)} className={`${inp} resize-none`} />
            </Field>
          </div>
        </div>
      )}

      {/* ── Notificaciones ── */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800">🔔 Notificaciones de ventas</h2>
            <p className="text-sm text-gray-500 mt-1">Recibe un aviso con sonido cada vez que llegue un pedido.</p>
          </div>
          <NotificationsSection />
        </div>
      )}

      {/* Feedback */}
      {feedback && activeTab !== 'notifications' && (
        <div className={`p-4 rounded-xl text-sm font-medium ${feedback.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {feedback.msg}
        </div>
      )}

      {/* Botón Guardar */}
      {activeTab !== 'notifications' && (
        <div className="flex justify-end pb-4">
          <button onClick={handleSave} disabled={saving}
            className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm">
            {saving ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />Guardando...</> : 'Guardar cambios'}
          </button>
        </div>
      )}
    </div>
  );
}
