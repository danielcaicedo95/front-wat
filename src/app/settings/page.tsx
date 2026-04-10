'use client';

import { useEffect, useRef, useState } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { fetchWithAuth, API_URL as API_BASE } from '@/lib/fetchWithAuth';

type CatalogMode = 'supabase' | 'meta' | 'hybrid';
type Tab = 'catalog' | 'messages' | 'notifications';
type FarewellAction = 'catalog' | 'nothing' | 'custom';

interface Settings {
  // Catálogo
  catalog_mode: CatalogMode;
  // Age gate
  welcome_message: string;
  min_age: string;
  age_gate_question: string;
  age_yes_button: string;
  age_no_button: string;
  age_rejection_message: string;
  // Mensajes del bot
  msg_welcome: string;
  msg_welcome_image_url: string;
  msg_product_found: string;
  msg_product_not_found: string;
  msg_added_to_cart: string;
  msg_invoice_footer: string;
  msg_order_confirmed: string;
  msg_order_confirmed_image_url: string;
  msg_farewell_action: FarewellAction;
  msg_farewell_custom: string;
  msg_location_optional: string;
  msg_location_required: string;
  msg_location_skip_button: string;
  msg_delivering_data_request: string;
  // Mensajes de pago
  msg_payment_choice: string;
  msg_payment_choice_cod_btn: string;
  msg_payment_choice_online_btn: string;
  msg_payment_link: string;
  msg_payment_link_required: string;
  msg_payment_change_confirm: string;
  msg_payment_change_confirm_yes_btn: string;
  msg_payment_change_confirm_no_btn: string;
  msg_payment_cod_choice: string;
  msg_payment_cod_confirmed: string;
}

const MSG_DEFAULTS: Record<string, string> = {
  msg_welcome: '¡Hola! 👋 ¿Qué te gustaría pedir hoy?',
  msg_product_found: 'Aquí tienes las opciones para *{{producto}}*:',
  msg_product_not_found: 'Lo siento, no encontré *{{producto}}* en nuestro catálogo. ¿Quieres buscar otra cosa?',
  msg_added_to_cart: '✅ *¡Agregado!* Tu carrito actualizado:',
  msg_invoice_footer: '¡Gracias por tu pedido! 🎉 Te confirmamos en breve.',
  msg_order_confirmed: '✅ ¡Pedido confirmado! Estamos preparando tu domicilio. 🛵',
  msg_farewell_action: 'catalog',
  msg_farewell_custom: '¡Gracias! Escríbenos cuando quieras pedir de nuevo 😊',
  msg_location_optional: '📍 ¿Quieres compartir tu ubicación para facilitar la entrega? 🙂',
  msg_location_required: '📍 Para continuar necesitas confirmar tu ubicación de entrega.',
  msg_location_skip_button: 'Estoy en otro lugar',
  msg_delivering_data_request: 'Para finalizar, por favor comparte tu *nombre*, *dirección*, *teléfono* y *método de pago*.',
};

// Variables disponibles por campo
const VARS: Record<string, { label: string; key: string }[]> = {
  msg_product_found:     [{ label: '{{producto}}', key: '{{producto}}' }],
  msg_product_not_found: [{ label: '{{producto}}', key: '{{producto}}' }],
  msg_added_to_cart:     [{ label: '{{producto}}', key: '{{producto}}' }, { label: '{{total}}', key: '{{total}}' }],
  msg_invoice_footer:    [{ label: '{{nombre}}', key: '{{nombre}}' }, { label: '{{total}}', key: '{{total}}' }, { label: '{{tiempo_entrega}}', key: '{{tiempo_entrega}}' }],
  msg_order_confirmed:   [{ label: '{{nombre}}', key: '{{nombre}}' }, { label: '{{total}}', key: '{{total}}' }],
  msg_farewell_custom:   [{ label: '{{nombre}}', key: '{{nombre}}' }],
};

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

const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all bg-white';

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-1.5">{hint}</p>}
      {children}
    </div>
  );
}

// ── Chip de variable dinámica ─────────────────────────────────────────────────
function VarChip({ varKey, onClick }: { varKey: string; onClick: (v: string) => void }) {
  return (
    <button type="button" onClick={() => onClick(varKey)}
      className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs rounded-lg hover:bg-indigo-100 transition-colors font-mono">
      {varKey}
    </button>
  );
}

// ── Campo editable con variables y reset ──────────────────────────────────────
function MsgField({
  label, hint, fieldKey, value, onChange, multiline = true, imageUrl, onImageChange,
}: {
  label: string; hint?: string; fieldKey: string; value: string;
  onChange: (key: string, val: string) => void; multiline?: boolean;
  imageUrl?: string; onImageChange?: (url: string) => void;
}) {
  const vars = VARS[fieldKey] || [];
  const def  = MSG_DEFAULTS[fieldKey] || '';
  const isDirty = value !== def && value !== '';
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const insertVar = (v: string) => onChange(fieldKey, (value || '') + v);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImageChange) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await fetchWithAuth(`${API_BASE}/api/settings/logo`, { method: 'POST', body: form });
      if (res.ok) {
        const data = await res.json();
        onImageChange(data.url);
      }
    } finally { setUploading(false); }
  };

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100">
        <span className="text-xs font-semibold text-gray-600">{label}</span>
        <div className="flex items-center gap-2">
          {isDirty && (
            <button type="button" onClick={() => onChange(fieldKey, def)}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors">↩ Restaurar</button>
          )}
          {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Modificado" />}
        </div>
      </div>
      {/* Input */}
      <div className="px-3 pt-2 pb-1">
        {hint && <p className="text-xs text-gray-400 mb-1.5">{hint}</p>}
        {multiline ? (
          <textarea rows={3} value={value} onChange={(e) => onChange(fieldKey, e.target.value)}
            placeholder={def}
            className="w-full text-sm focus:outline-none resize-none text-gray-800 placeholder:text-gray-300 bg-white" />
        ) : (
          <input type="text" value={value} onChange={(e) => onChange(fieldKey, e.target.value)}
            placeholder={def}
            className="w-full text-sm focus:outline-none text-gray-800 placeholder:text-gray-300 bg-white" />
        )}
      </div>
      {/* Variables */}
      {vars.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3 pb-2">
          <span className="text-xs text-gray-400 self-center">Insertar:</span>
          {vars.map((v) => <VarChip key={v.key} varKey={v.key} onClick={insertVar} />)}
        </div>
      )}
      {/* Imagen opcional */}
      {onImageChange !== undefined && (
        <div className="border-t border-gray-100 px-3 py-2 bg-gray-50 flex items-center gap-3">
          {imageUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="preview" className="h-10 w-10 rounded-lg object-cover border border-gray-200" />
              <button type="button" onClick={() => onImageChange('')}
                className="text-xs text-red-400 hover:text-red-600 transition-colors">Quitar imagen</button>
            </>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="text-xs text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1">
              {uploading ? '⏳ Subiendo...' : '🖼️ Añadir imagen (opcional)'}
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        </div>
      )}
    </div>
  );
}

// ── Sección de acordeón ───────────────────────────────────────────────────────
function Section({ icon, title, description, children }: {
  icon: string; title: string; description: string; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition-colors">
        <span className="text-xl">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 text-sm">{title}</p>
          <p className="text-xs text-gray-400 truncate">{description}</p>
        </div>
        <span className={`text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`}>›</span>
      </button>
      {open && <div className="border-t border-gray-100 p-4 space-y-4 bg-white">{children}</div>}
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
      const res = await fetchWithAuth(`${API_BASE}/notifications/test-push`, {
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
      .then((data) => {
        const s = data.settings || {};
        setSettings({
          catalog_mode:                  s.catalog_mode          || 'hybrid',
          welcome_message:               s.welcome_message        || '',
          min_age:                       s.min_age               || '18',
          age_gate_question:             s.age_gate_question     || '',
          age_yes_button:                s.age_yes_button        || '',
          age_no_button:                 s.age_no_button         || '',
          age_rejection_message:         s.age_rejection_message || '',
          msg_welcome:                   s.msg_welcome                   || '',
          msg_welcome_image_url:         s.msg_welcome_image_url         || '',
          msg_product_found:             s.msg_product_found             || '',
          msg_product_not_found:         s.msg_product_not_found         || '',
          msg_added_to_cart:             s.msg_added_to_cart             || '',
          msg_invoice_footer:            s.msg_invoice_footer            || '',
          msg_order_confirmed:           s.msg_order_confirmed           || '',
          msg_order_confirmed_image_url: s.msg_order_confirmed_image_url || '',
          msg_farewell_action:           (s.msg_farewell_action as FarewellAction) || 'catalog',
          msg_farewell_custom:           s.msg_farewell_custom           || '',
          msg_location_optional:         s.msg_location_optional         || '',
          msg_location_required:         s.msg_location_required         || '',
          msg_location_skip_button:      s.msg_location_skip_button      || '',
          msg_delivering_data_request:   s.msg_delivering_data_request   || '',
          // Mensajes de pago
          msg_payment_choice:                s.msg_payment_choice                || '',
          msg_payment_choice_cod_btn:        s.msg_payment_choice_cod_btn        || '',
          msg_payment_choice_online_btn:     s.msg_payment_choice_online_btn     || '',
          msg_payment_link:                  s.msg_payment_link                  || '',
          msg_payment_link_required:         s.msg_payment_link_required         || '',
          msg_payment_change_confirm:        s.msg_payment_change_confirm        || '',
          msg_payment_change_confirm_yes_btn: s.msg_payment_change_confirm_yes_btn || '',
          msg_payment_change_confirm_no_btn:  s.msg_payment_change_confirm_no_btn  || '',
          msg_payment_cod_choice:            s.msg_payment_cod_choice            || '',
          msg_payment_cod_confirmed:         s.msg_payment_cod_confirmed         || '',
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true); setFeedback(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/settings`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) setFeedback({ type: 'success', msg: '✅ Configuración guardada.' });
      else { const e = await res.json(); setFeedback({ type: 'error', msg: `❌ ${e.detail || 'No se pudo guardar'}` }); }
    } catch { setFeedback({ type: 'error', msg: '❌ Error de conexión.' }); }
    finally { setSaving(false); setTimeout(() => setFeedback(null), 6000); }
  };

  const patch = (key: keyof Settings, value: string) =>
    setSettings((s) => s ? { ...s, [key]: value } : s);
  // Widened alias for MsgField (accepts any string key)
  const patchStr = (key: string, value: string) => patch(key as keyof Settings, value);


  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" /></div>;
  if (!settings) return <div className="p-8 text-red-500 text-sm">No se pudo cargar la configuración.</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">⚙️ Configuración</h1>
        <p className="text-sm text-gray-500 mt-1">Ajustes del catálogo, mensajes del bot y notificaciones.</p>
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

      {/* ── Mensajes del Bot ── */}
      {activeTab === 'messages' && (
        <div className="space-y-4">
          {/* Leyenda de variables */}
          <div className="flex items-start gap-2 p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-700">
            <span className="text-base">💡</span>
            <div>
              <strong>Variables dinámicas:</strong> Haz clic en las etiquetas para insertarlas en el texto. El bot las reemplazará automáticamente con el valor real.
              <span className="ml-1 opacity-70">Ej: &#123;&#123;nombre&#125;&#125; → &quot;Daniel&quot;</span>
            </div>
          </div>

          {/* Verificación de Edad */}
          <Section icon="🔞" title="Verificación de Edad" description="Mensajes del age gate para productos regulados">
            <Field label="Edad mínima requerida">
              <input type="number" value={settings.min_age} onChange={(e) => patch('min_age', e.target.value)}
                className="w-32 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" min="13" max="25" />
              <p className="text-xs text-gray-400 mt-1">Colombia: 18 · USA: 21 · Suecia: 25</p>
            </Field>
            <Field label="Mensaje de bienvenida / verificación">
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
              <textarea rows={3} value={settings.age_rejection_message} onChange={(e) => patch('age_rejection_message', e.target.value)} className={`${inp} resize-none`} />
            </Field>
          </Section>

          {/* Bienvenida */}
          <Section icon="👋" title="Bienvenida" description="Primer mensaje cuando alguien escribe al bot">
            <MsgField label="Mensaje de bienvenida" fieldKey="msg_welcome"
              value={settings.msg_welcome} onChange={patchStr} multiline
              imageUrl={settings.msg_welcome_image_url}
              onImageChange={(url) => patch('msg_welcome_image_url', url)} />
          </Section>

          {/* Búsqueda de productos */}
          <Section icon="🔍" title="Búsqueda de Productos" description="Mensajes al mostrar o no encontrar productos">
            <MsgField label="Cuando encuentra productos" hint='El texto que aparece antes de mostrar la tarjeta del producto. Usa {{producto}} para el nombre buscado.'
              fieldKey="msg_product_found" value={settings.msg_product_found} onChange={patchStr} multiline={false} />
            <MsgField label="Cuando NO encuentra productos" hint='Mensaje cuando la búsqueda no arroja resultados.'
              fieldKey="msg_product_not_found" value={settings.msg_product_not_found} onChange={patchStr} />
          </Section>

          {/* Carrito */}
          <Section icon="🛒" title="Carrito" description="Mensajes al agregar o actualizar productos">
            <MsgField label="Encabezado al agregar/actualizar carrito" hint='Aparece sobre la lista de productos del carrito. Usa {{producto}} y {{total}}.'
              fieldKey="msg_added_to_cart" value={settings.msg_added_to_cart} onChange={patchStr} multiline={false} />
          </Section>

          {/* Datos de entrega */}
          <Section icon="📋" title="Datos de Entrega" description="Solicitud de nombre, dirección y método de pago">
            <MsgField label="Solicitud de datos al finalizar la compra"
              fieldKey="msg_delivering_data_request" value={settings.msg_delivering_data_request} onChange={patchStr} />

            {/* Vista previa de la factura */}
            <div className="rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
              <div className="px-3 py-2 border-b border-gray-200 bg-gray-100">
                <span className="text-xs font-semibold text-gray-500">Vista previa de la factura</span>
              </div>
              <div className="p-3 space-y-1 text-xs text-gray-500 font-mono">
                <p className="text-gray-700 font-semibold">📋 *Tu pedido:*</p>
                <p>• 2x Producto A — $52.000 <span className="text-gray-300">(automático)</span></p>
                <p>• 1x Producto B — $18.000 <span className="text-gray-300">(automático)</span></p>
                <p className="border-t border-gray-200 pt-1">💰 *Total: $70.000* <span className="text-gray-300">(automático)</span></p>
                <p className="border-t border-gray-200 pt-1">📦 *Dirección:* Calle 18... <span className="text-gray-300">(automático)</span></p>
                <p>💳 *Pago:* Nequi <span className="text-gray-300">(automático)</span></p>
                <p className="border-t border-gray-200 pt-1 text-indigo-600">👇 <em>Mensaje editable abajo</em></p>
              </div>
            </div>
            <MsgField label="Texto al final de la factura (editable)" hint='Aparece al final de la factura de confirmación. Puedes incluir info de entrega, agradecimiento, etc.'
              fieldKey="msg_invoice_footer" value={settings.msg_invoice_footer} onChange={patchStr} />
          </Section>

          {/* Confirmación del pedido */}
          <Section icon="✅" title="Confirmación de Pedido" description="Mensaje tras confirmar la compra">
            <MsgField label="Mensaje de confirmación" hint='Se envía cuando el cliente presiona ✅ Finalizar Compra.'
              fieldKey="msg_order_confirmed" value={settings.msg_order_confirmed} onChange={patchStr}
              imageUrl={settings.msg_order_confirmed_image_url}
              onImageChange={(url) => patch('msg_order_confirmed_image_url', url)} />
          </Section>

          {/* Despedida post-pedido */}
          <Section icon="👋" title="Despedida (post-pedido)" description="Qué enviar después de confirmar el pedido">
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">¿Qué enviar después del pedido?</p>
              <div className="space-y-2">
                {([
                  { id: 'catalog', label: '📦 Catálogo de productos', desc: 'Muestra las categorías para que siga comprando.' },
                  { id: 'nothing', label: '🚫 Nada', desc: 'No se envía ningún mensaje adicional.' },
                  { id: 'custom',  label: '✏️ Mensaje personalizado', desc: 'Escribe el texto que quieres enviar.' },
                ] as { id: FarewellAction; label: string; desc: string }[]).map((opt) => (
                  <button key={opt.id} type="button"
                    onClick={() => patch('msg_farewell_action', opt.id)}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-all ${settings.msg_farewell_action === opt.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className="flex items-start gap-2">
                      <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${settings.msg_farewell_action === opt.id ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'}`}>
                        {settings.msg_farewell_action === opt.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{opt.label}</p>
                        <p className="text-xs text-gray-400">{opt.desc}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            {settings.msg_farewell_action === 'custom' && (
              <MsgField label="Mensaje personalizado de despedida" fieldKey="msg_farewell_custom"
                value={settings.msg_farewell_custom} onChange={patchStr} />
            )}
          </Section>

          {/* Ubicación */}
          <Section icon="📍" title="Ubicación" description="Mensajes al solicitar la ubicación del cliente">
            <MsgField label="Texto al pedir ubicación (opcional)" hint='Se muestra con dos botones: [Enviar ubicación] y el botón de skip.'
              fieldKey="msg_location_optional" value={settings.msg_location_optional} onChange={patchStr} />
            <MsgField label="Botón de omitir ubicación (máx 20 chars)" hint='Texto del botón para no compartir ubicación.'
              fieldKey="msg_location_skip_button" value={settings.msg_location_skip_button} onChange={patchStr} multiline={false} />
            <MsgField label="Texto al pedir ubicación (obligatoria)" hint='Se muestra con solo el botón de enviar ubicación. No tiene opción de saltar.'
              fieldKey="msg_location_required" value={settings.msg_location_required} onChange={patchStr} />
          </Section>

          {/* Mensajes de Pago Online — solo visibles si hay modo de pago activo */}
          <Section icon="💳" title="Mensajes de Pago Online" description="Textos del flujo de pago con pasarela (Wompi / MercadoPago)">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
              <strong>💡 Variables disponibles:</strong>&nbsp;
              <code className="bg-blue-100 px-1 rounded">{'{{link}}'}</code> → URL de pago &nbsp;
              <code className="bg-blue-100 px-1 rounded">{'{{total}}'}</code> → Monto &nbsp;
              <code className="bg-blue-100 px-1 rounded">{'{{metodo}}'}</code> → Método elegido
            </div>

            <MsgField label="[Modo opcional] Mensaje de elección de pago"
              hint='Aparece con 2 botones: contraentrega y pagar ahora.'
              fieldKey="msg_payment_choice" value={settings.msg_payment_choice} onChange={patchStr} />
            <div className="grid grid-cols-2 gap-4">
              <MsgField label="Botón: Contraentrega (máx 20 chars)" hint='Ej: Pago contraentrega 🏠'
                fieldKey="msg_payment_choice_cod_btn" value={settings.msg_payment_choice_cod_btn} onChange={patchStr} multiline={false} />
              <MsgField label="Botón: Pagar ahora (máx 20 chars)" hint='Ej: Pagar ahora 💳'
                fieldKey="msg_payment_choice_online_btn" value={settings.msg_payment_choice_online_btn} onChange={patchStr} multiline={false} />
            </div>

            <MsgField label="[Modo opcional] Mensaje con link de pago"
              hint='Se envía después de que el cliente presiona "Pagar ahora". Usa {{link}} y {{total}}.'
              fieldKey="msg_payment_link" value={settings.msg_payment_link} onChange={patchStr} />

            <MsgField label="[Modo obligatorio] Mensaje con link de pago"
              hint='Se envía automáticamente al confirmar el pedido. Usa {{link}} y {{total}}.'
              fieldKey="msg_payment_link_required" value={settings.msg_payment_link_required} onChange={patchStr} />

            <MsgField label="Mensaje: ¿Cambiar método de pago?"
              hint='Pregunta al cliente si quiere cambiar después de ver el link.'
              fieldKey="msg_payment_change_confirm" value={settings.msg_payment_change_confirm} onChange={patchStr} multiline={false} />
            <div className="grid grid-cols-2 gap-4">
              <MsgField label="Botón: Sí, cambiar (máx 20 chars)"
                fieldKey="msg_payment_change_confirm_yes_btn" value={settings.msg_payment_change_confirm_yes_btn} onChange={patchStr} multiline={false} />
              <MsgField label="Botón: No, está bien (máx 20 chars)"
                fieldKey="msg_payment_change_confirm_no_btn" value={settings.msg_payment_change_confirm_no_btn} onChange={patchStr} multiline={false} />
            </div>

            <MsgField label="Mensaje: Elección de método contraentrega"
              hint='Aparece cuando el cliente elige pagar al recibir.'
              fieldKey="msg_payment_cod_choice" value={settings.msg_payment_cod_choice} onChange={patchStr} multiline={false} />

            <MsgField label="Mensaje: Confirmación de pago contraentrega"
              hint='Se envía cuando el cliente elige su método contraentrega. Usa {{metodo}} y {{total}}.'
              fieldKey="msg_payment_cod_confirmed" value={settings.msg_payment_cod_confirmed} onChange={patchStr} />
          </Section>

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
