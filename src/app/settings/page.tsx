'use client';

import { useEffect, useRef, useState } from 'react';
import { useNotifications } from '@/hooks/useNotifications';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ── Tipos ──────────────────────────────────────────────────────────────────────
type CatalogMode = 'supabase' | 'meta' | 'hybrid';
type Tab = 'brand' | 'catalog' | 'messages' | 'notifications';

interface Settings {
  // Técnico
  catalog_mode: CatalogMode;
  // Age gate
  welcome_message: string;
  min_age: string;
  age_gate_question: string;
  age_yes_button: string;
  age_no_button: string;
  age_rejection_message: string;
  // Marca / WhatsApp Business Profile
  business_name: string;
  business_logo_url: string;
  business_description: string;
  business_category: string;
  business_address: string;
  business_city: string;
  business_website: string;
  business_website_2: string;
  business_email: string;
  business_phone: string;
  business_hours: string;
  // Mensajes chatbot
  chatbot_greeting: string;
  chatbot_farewell: string;
  // Servicio
  delivery_info: string;
  payment_methods: string;
}

// ── Categorías de WhatsApp Business ───────────────────────────────────────────
const WA_CATEGORIES = [
  'Automotive',
  'Beauty, Spa and Salon',
  'Clothing and Apparel',
  'Education',
  'Entertainment',
  'Event Planning and Service',
  'Finance and Banking',
  'Food and Grocery',
  'Hotel and Lodging',
  'Medical and Health',
  'Non-profit',
  'Professional Services',
  'Public Service',
  'Restaurant',
  'Retail',
  'Travel and Transportation',
  'Other',
];

const CATALOG_MODES: { id: CatalogMode; icon: string; label: string; description: string; badge?: string }[] = [
  {
    id: 'supabase',
    icon: '🗄️',
    label: 'Solo Supabase',
    description: 'Lista interactiva con todos tus productos desde la base de datos.',
  },
  {
    id: 'meta',
    icon: '🛍️',
    label: 'Solo Meta Catalog',
    description: 'Catálogo nativo de WhatsApp. Solo muestra productos aprobados por Meta.',
  },
  {
    id: 'hybrid',
    icon: '🔀',
    label: 'Híbrido',
    description: 'Meta para productos aprobados + Supabase para el resto. Recomendado.',
    badge: 'Recomendado',
  },
];

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'brand',         label: 'Mi Marca',       icon: '🏪' },
  { id: 'catalog',       label: 'Catálogo',        icon: '📦' },
  { id: 'messages',      label: 'Mensajes',         icon: '💬' },
  { id: 'notifications', label: 'Notificaciones',   icon: '🔔' },
];

// ── Componente de campo ───────────────────────────────────────────────────────
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-1.5">{hint}</p>}
      {children}
    </div>
  );
}

const inputCls =
  'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all bg-white placeholder:text-gray-300';

// ── Sección de Notificaciones ─────────────────────────────────────────────────
function NotificationsSection() {
  const { permission, subscribed, loading, subscribe } = useNotifications();
  const [testResult, setTestResult] = useState('');
  const [testLoading, setTestLoading] = useState(false);

  const handleSubscribe = async () => {
    const ok = await subscribe();
    setTestResult(ok
      ? '✅ ¡Listo! Recibirás una notificación cada vez que entre una venta.'
      : '❌ No se pudo activar. Revisa los permisos del navegador.'
    );
  };

  const handleTest = async () => {
    setTestLoading(true); setTestResult('');
    try {
      const res = await fetch(`${API_BASE}/notifications/test-push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: 'default' }),
      });
      if (res.ok) setTestResult('✅ Push de prueba enviado. Deberías recibirlo en segundos.');
      else { const err = await res.json(); setTestResult(`❌ ${err.detail || 'Error al enviar'}`); }
    } catch { setTestResult('❌ No se pudo conectar al servidor.'); }
    finally { setTestLoading(false); }
  };

  const isGranted = permission === 'granted';
  const isDenied = permission === 'denied';

  return (
    <div className="p-6 space-y-5">
      <div className={`flex items-center gap-3 p-4 rounded-xl border ${isGranted ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
        <span className="text-2xl">{isGranted ? '✅' : '🔔'}</span>
        <div>
          <p className={`text-sm font-semibold ${isGranted ? 'text-green-800' : 'text-amber-800'}`}>
            {isGranted
              ? subscribed ? 'Notificaciones activas en este dispositivo' : 'Permiso concedido — activa la suscripción'
              : isDenied ? 'Notificaciones bloqueadas en este navegador' : 'Notificaciones no activadas aún'}
          </p>
          <p className={`text-xs mt-0.5 ${isGranted ? 'text-green-600' : 'text-amber-600'}`}>
            {isGranted
              ? 'Sonará y vibrará cada vez que llegue una nueva venta.'
              : 'Activa las notificaciones para recibir alertas de ventas con sonido.'}
          </p>
        </div>
      </div>
      {isDenied && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold text-red-800">Cómo desbloquear:</p>
          <ul className="text-sm text-red-700 space-y-1 pl-1">
            <li>🖥️ <b>Chrome desktop:</b> Haz clic en el 🔒 en la barra de direcciones → Notificaciones → Permitir</li>
            <li>🤖 <b>Chrome Android:</b> Menú ⋮ → Conf. del sitio → Notificaciones → Permitir</li>
            <li>🍎 <b>Safari iPhone:</b> Ajustes → Safari → Notificaciones → Permitir para este sitio</li>
          </ul>
        </div>
      )}
      {!isDenied && (
        <button
          onClick={handleSubscribe}
          disabled={loading || (isGranted && subscribed)}
          className={`w-full py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${isGranted && subscribed
            ? 'bg-green-100 text-green-700 cursor-default'
            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm active:scale-95 disabled:opacity-60'}`}
        >
          {loading ? (<><span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> Activando...</>)
            : isGranted && subscribed ? '✅ Activo en este dispositivo'
            : '🔔 Activar notificaciones en este dispositivo'}
        </button>
      )}
      {testResult && (
        <p className={`text-sm font-medium px-4 py-2 rounded-lg ${testResult.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {testResult}
        </p>
      )}
      {isGranted && subscribed && (
        <div className="border-t border-gray-100 pt-5">
          <p className="text-sm font-medium text-gray-700 mb-2">Probar notificación</p>
          <p className="text-xs text-gray-400 mb-3">Envía un push de prueba ahora mismo a este dispositivo.</p>
          <button
            onClick={handleTest}
            disabled={testLoading}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
          >
            {testLoading ? 'Enviando...' : '📤 Enviar prueba'}
          </button>
        </div>
      )}
      <p className="text-xs text-gray-400 text-center pt-1">
        Repite la activación en cada dispositivo donde quieras recibir alertas.
      </p>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('brand');

  // Logo upload state
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoFeedback, setLogoFeedback] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // WhatsApp sync state
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    status: 'ok' | 'partial' | 'error';
    message: string;
    profile_text?: string;
    profile_photo?: string;
  } | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/settings`)
      .then((r) => r.json())
      .then((data) => { setSettings(data.settings); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // ── Logo upload ──
  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview local inmediata
    setLogoPreview(URL.createObjectURL(file));
    setLogoUploading(true);
    setLogoFeedback(null);

    try {
      const form = new FormData();
      form.append('image', file);
      const res = await fetch(`${API_BASE}/api/settings/logo`, { method: 'POST', body: form });
      if (res.ok) {
        const data = await res.json();
        setSettings((s) => s ? { ...s, business_logo_url: data.url } : s);
        setLogoFeedback('✅ Logo actualizado');
      } else {
        const err = await res.json().catch(() => ({}));
        setLogoFeedback(`❌ ${err.detail || 'Error al subir el logo'}`);
        setLogoPreview(null);
      }
    } catch {
      setLogoFeedback('❌ Error de conexión');
      setLogoPreview(null);
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  // ── Sync WhatsApp Business profile ──
  const handleSyncWhatsApp = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/settings/sync-whatsapp`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSyncResult({
          status: data.status,
          message: data.message,
          profile_text: data.profile_text,
          profile_photo: data.profile_photo,
        });
      } else {
        setSyncResult({ status: 'error', message: `❌ ${data.detail || 'Error al sincronizar'}` });
      }
    } catch {
      setSyncResult({ status: 'error', message: '❌ No se pudo conectar al servidor.' });
    } finally {
      setSyncing(false);
    }
  };

  // ── Save settings ──
  const handleSave = async () => {
    if (!settings) return;
    setSaving(true); setFeedback(null);
    try {
      const res = await fetch(`${API_BASE}/api/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setFeedback({ type: 'success', msg: '✅ Configuración guardada. Activa en ~60 segundos.' });
      } else {
        const err = await res.json();
        setFeedback({ type: 'error', msg: `❌ ${err.detail || 'No se pudo guardar'}` });
      }
    } catch {
      setFeedback({ type: 'error', msg: '❌ Error de conexión con el servidor.' });
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 6000);
    }
  };

  const patch = (key: keyof Settings, value: string) =>
    setSettings((s) => s ? { ...s, [key]: value } : s);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }
  if (!settings) {
    return <div className="p-8 text-red-500 text-sm">No se pudo cargar la configuración. Verifica que el backend esté corriendo.</div>;
  }

  const logoSrc = logoPreview || settings.business_logo_url || null;
  const descLen = settings.business_description?.length ?? 0;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">⚙️ Configuración</h1>
        <p className="text-sm text-gray-500 mt-1">
          Personaliza tu negocio, el chatbot y tus notificaciones.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-full overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-1 justify-center ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ══════════ TAB: MARCA ══════════ */}
      {activeTab === 'brand' && (
        <div className="space-y-5">

          {/* Sección: Perfil de WhatsApp Business */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center gap-3">
              <span className="text-2xl">🏪</span>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Perfil de WhatsApp Business</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Esta información aparece en tu perfil de negocio en WhatsApp.
                </p>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Logo / Foto de perfil */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Foto de perfil del negocio
                </label>
                <div className="flex items-center gap-5">
                  {/* Avatar */}
                  <div
                    onClick={() => logoInputRef.current?.click()}
                    className="relative w-24 h-24 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 overflow-hidden flex items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all group flex-shrink-0"
                  >
                    {logoSrc ? (
                      <img src={logoSrc} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl">🏪</span>
                    )}
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                      {logoUploading
                        ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <span className="text-white text-xs font-bold">Cambiar</span>
                      }
                    </div>
                  </div>
                  {/* Instrucciones */}
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 mb-2">
                      Sube el logo o foto de tu negocio. Recomendado: cuadrada, mínimo 640×640px.
                    </p>
                    <p className="text-xs text-gray-400 mb-3">JPG, PNG, WEBP · Máx 5MB</p>
                    <label className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl cursor-pointer hover:bg-indigo-700 transition-colors">
                      {logoUploading ? (
                        <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Subiendo...</>
                      ) : (
                        <><span>📸</span> Subir foto</>
                      )}
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        onChange={handleLogoChange}
                        disabled={logoUploading}
                      />
                    </label>
                    {logoFeedback && (
                      <p className={`mt-2 text-xs font-medium ${logoFeedback.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>
                        {logoFeedback}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Nombre del negocio */}
              <Field label="Nombre del negocio" hint="Aparece exactamente así en el perfil de WhatsApp Business.">
                <input
                  type="text"
                  value={settings.business_name}
                  onChange={(e) => patch('business_name', e.target.value)}
                  className={inputCls}
                  placeholder="Ej: Licorera El Barril"
                  maxLength={100}
                />
              </Field>

              {/* Descripción */}
              <Field
                label={`Descripción del negocio (${descLen}/256)`}
                hint="Aparece en tu perfil de WhatsApp y también le da contexto al chatbot para responder mejor."
              >
                <textarea
                  rows={3}
                  value={settings.business_description}
                  onChange={(e) => patch('business_description', e.target.value)}
                  className={`${inputCls} resize-none`}
                  placeholder="Ej: Somos una licorera con entrega rápida en Bogotá. Ofrecemos ron, whisky, aguardiente y más."
                  maxLength={256}
                />
                {descLen > 230 && (
                  <p className={`text-xs mt-1 ${descLen >= 256 ? 'text-red-500' : 'text-amber-500'}`}>
                    {256 - descLen} caracteres restantes
                  </p>
                )}
              </Field>

              {/* Categoría de negocio */}
              <Field label="Categoría del negocio" hint="Categoría oficial de WhatsApp Business — ayuda a que los clientes te encuentren.">
                <select
                  value={settings.business_category}
                  onChange={(e) => patch('business_category', e.target.value)}
                  className={`${inputCls} cursor-pointer`}
                >
                  {WA_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </Field>

              {/* Dirección */}
              <Field label="Dirección física" hint="Dirección de tu tienda o bodega (opcional).">
                <input
                  type="text"
                  value={settings.business_address}
                  onChange={(e) => patch('business_address', e.target.value)}
                  className={inputCls}
                  placeholder="Ej: Calle 80 #45-32, Bogotá"
                />
              </Field>

              {/* Ciudad */}
              <Field label="Ciudad / País">
                <input
                  type="text"
                  value={settings.business_city}
                  onChange={(e) => patch('business_city', e.target.value)}
                  className={inputCls}
                  placeholder="Ej: Bogotá, Colombia"
                />
              </Field>

              {/* Horario */}
              <Field label="Horario de atención" hint="Se lo comunica el chatbot a los clientes que pregunten.">
                <input
                  type="text"
                  value={settings.business_hours}
                  onChange={(e) => patch('business_hours', e.target.value)}
                  className={inputCls}
                  placeholder="Ej: Lunes a Sábado, 9am – 9pm"
                />
              </Field>

              {/* Email */}
              <Field label="Email de contacto" hint="Visible en tu perfil de WhatsApp Business.">
                <input
                  type="email"
                  value={settings.business_email}
                  onChange={(e) => patch('business_email', e.target.value)}
                  className={inputCls}
                  placeholder="Ej: ventas@milicorera.com"
                />
              </Field>

              {/* Teléfono */}
              <Field label="Teléfono de contacto alternativo">
                <input
                  type="tel"
                  value={settings.business_phone}
                  onChange={(e) => patch('business_phone', e.target.value)}
                  className={inputCls}
                  placeholder="Ej: +57 321 000 0000"
                />
              </Field>

              {/* Sitios web */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Sitio web" hint="WhatsApp Business admite hasta 2 sitios web.">
                  <input
                    type="url"
                    value={settings.business_website}
                    onChange={(e) => patch('business_website', e.target.value)}
                    className={inputCls}
                    placeholder="https://milicorera.com"
                  />
                </Field>
                <Field label="Sitio web 2 (opcional)">
                  <input
                    type="url"
                    value={settings.business_website_2}
                    onChange={(e) => patch('business_website_2', e.target.value)}
                    className={inputCls}
                    placeholder="https://link.bio/milicorera"
                  />
                </Field>
              </div>
            </div>
          </div>

          {/* Sección: Servicio */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">🚚 Servicio y Pagos</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                El chatbot usará esta información para responder preguntas sobre domicilios y pagos.
              </p>
            </div>
            <div className="p-6 space-y-5">
              <Field label="Métodos de pago aceptados">
                <input
                  type="text"
                  value={settings.payment_methods}
                  onChange={(e) => patch('payment_methods', e.target.value)}
                  className={inputCls}
                  placeholder="Ej: Efectivo, Nequi, Daviplata, Transferencia"
                />
              </Field>
              <Field label="Información de domicilios" hint="Zonas, costos y tiempo de entrega.">
                <textarea
                  rows={3}
                  value={settings.delivery_info}
                  onChange={(e) => patch('delivery_info', e.target.value)}
                  className={`${inputCls} resize-none`}
                  placeholder="Ej: Hacemos domicilios en toda Bogotá. Tiempo promedio: 45 min. Domicilio gratis en compras mayores a $80.000."
                />
              </Field>
            </div>
          </div>

          {/* Sección: Mensajes del chatbot */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">💬 Mensajes del Chatbot</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Puedes usar <code className="bg-gray-100 px-1 rounded text-xs">{'{business_name}'}</code> para insertar el nombre del negocio automáticamente.
              </p>
            </div>
            <div className="p-6 space-y-5">
              <Field label="Saludo inicial" hint="Primer mensaje que ve el cliente al escribir al chatbot.">
                <textarea
                  rows={2}
                  value={settings.chatbot_greeting}
                  onChange={(e) => patch('chatbot_greeting', e.target.value)}
                  className={`${inputCls} resize-none`}
                  placeholder="¡Hola! 👋 Bienvenido a {business_name}. ¿En qué te puedo ayudar?"
                />
              </Field>
              <Field label="Mensaje de despedida" hint="Se envía cuando se completa un pedido.">
                <textarea
                  rows={2}
                  value={settings.chatbot_farewell}
                  onChange={(e) => patch('chatbot_farewell', e.target.value)}
                  className={`${inputCls} resize-none`}
                  placeholder="¡Gracias por tu pedido! 🎉 En breve lo procesamos."
                />
              </Field>
            </div>
          </div>
          {/* ── Panel: Sincronizar con WhatsApp Business ── */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-200 shadow-sm overflow-hidden">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
                  <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-green-900">Sincronizar con WhatsApp Business</h3>
                  <p className="text-sm text-green-700 mt-1">
                    Presiona para enviar todos los datos del perfil directamente a WhatsApp.
                    Actualiza descripción, categoría, dirección, email, sitios web y foto de perfil.
                  </p>
                  <p className="text-xs text-green-600 mt-1.5">
                    ⚡ Recuerda hacer clic en <strong>Guardar cambios</strong> primero si editaste algo.
                  </p>
                </div>
              </div>

              <button
                onClick={handleSyncWhatsApp}
                disabled={syncing}
                className="mt-5 w-full py-3 bg-green-600 hover:bg-green-700 active:scale-95 text-white font-bold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {syncing ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Sincronizando con WhatsApp...</>
                ) : (
                  <>📲 Enviar perfil a WhatsApp Business</>
                )}
              </button>

              {/* Resultado de la sincronización */}
              {syncResult && (
                <div className={`mt-4 p-4 rounded-xl border text-sm space-y-2 ${
                  syncResult.status === 'ok'
                    ? 'bg-green-100 border-green-300 text-green-800'
                    : syncResult.status === 'partial'
                    ? 'bg-amber-50 border-amber-300 text-amber-800'
                    : 'bg-red-50 border-red-300 text-red-800'
                }`}>
                  <p className="font-semibold">{syncResult.message}</p>
                  {syncResult.profile_text && (
                    <p className="text-xs">📝 Texto del perfil: {syncResult.profile_text}</p>
                  )}
                  {syncResult.profile_photo && (
                    <p className="text-xs">📸 Foto de perfil: {syncResult.profile_photo}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════ TAB: CATÁLOGO ══════════ */}
      {activeTab === 'catalog' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800">Modo de Catálogo</h2>
            <p className="text-sm text-gray-500 mt-1">
              Define cómo se muestran los productos a los clientes en WhatsApp.
            </p>
          </div>
          <div className="p-6 space-y-3">
            {CATALOG_MODES.map((mode) => {
              const isActive = settings.catalog_mode === mode.id;
              return (
                <button
                  key={mode.id}
                  onClick={() => patch('catalog_mode', mode.id)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                    isActive ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{mode.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${isActive ? 'text-indigo-700' : 'text-gray-800'}`}>
                            {mode.label}
                          </span>
                          {mode.badge && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                              {mode.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">{mode.description}</p>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      isActive ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'
                    }`}>
                      {isActive && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          {settings.catalog_mode === 'hybrid' && (
            <div className="mx-6 mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              <strong>💡 Modo Híbrido:</strong> Para que funcione, marca los productos aprobados en Meta desde Inventario.
            </div>
          )}
        </div>
      )}

      {/* ══════════ TAB: MENSAJES ══════════ */}
      {activeTab === 'messages' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800">Verificación de Edad (Age Gate)</h2>
            <p className="text-sm text-gray-500 mt-1">
              Personaliza los mensajes de verificación de edad para productos regulados.
            </p>
          </div>
          <div className="p-6 space-y-5">
            <Field label="Edad mínima requerida">
              <input
                type="number"
                value={settings.min_age}
                onChange={(e) => patch('min_age', e.target.value)}
                className="w-32 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                min="13" max="25"
              />
              <p className="text-xs text-gray-400 mt-1">Colombia: 18 · USA: 21 · Suecia: 25</p>
            </Field>
            <Field label="Mensaje de bienvenida (gate de edad)">
              <textarea
                rows={3}
                value={settings.welcome_message}
                onChange={(e) => patch('welcome_message', e.target.value)}
                className={`${inputCls} resize-none`}
              />
            </Field>
            <Field label="Pregunta de verificación">
              <input
                type="text"
                value={settings.age_gate_question}
                onChange={(e) => patch('age_gate_question', e.target.value)}
                className={inputCls}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label={'Botón "Sí" (máx 20 chars)'}>
                <input
                  type="text" maxLength={20}
                  value={settings.age_yes_button}
                  onChange={(e) => patch('age_yes_button', e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label={'Botón "No" (máx 20 chars)'}>
                <input
                  type="text" maxLength={20}
                  value={settings.age_no_button}
                  onChange={(e) => patch('age_no_button', e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>
            <Field label="Mensaje de rechazo (menores de edad)">
              <textarea
                rows={4}
                value={settings.age_rejection_message}
                onChange={(e) => patch('age_rejection_message', e.target.value)}
                className={`${inputCls} resize-none`}
              />
            </Field>
          </div>
        </div>
      )}

      {/* ══════════ TAB: NOTIFICACIONES ══════════ */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800">🔔 Notificaciones de ventas</h2>
            <p className="text-sm text-gray-500 mt-1">
              Recibe un aviso con sonido cada vez que llegue un pedido nuevo.
            </p>
          </div>
          <NotificationsSection />
        </div>
      )}

      {/* Feedback global */}
      {feedback && activeTab !== 'notifications' && (
        <div className={`p-4 rounded-xl text-sm font-medium ${
          feedback.type === 'success'
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {feedback.msg}
        </div>
      )}

      {/* Botón Guardar — no se muestra en notificaciones */}
      {activeTab !== 'notifications' && (
        <div className="flex justify-end pb-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
          >
            {saving ? (
              <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />Guardando...</>
            ) : (
              'Guardar cambios'
            )}
          </button>
        </div>
      )}
    </div>
  );
}
