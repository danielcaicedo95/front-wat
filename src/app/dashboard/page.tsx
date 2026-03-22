'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ── WhatsApp Business Categories ─────────────────────────────────────────────
const WA_CATEGORIES = [
  'Automotive', 'Beauty, Spa and Salon', 'Clothing and Apparel', 'Education',
  'Entertainment', 'Event Planning and Service', 'Finance and Banking',
  'Food and Grocery', 'Hotel and Lodging', 'Medical and Health', 'Non-profit',
  'Professional Services', 'Public Service', 'Restaurant', 'Retail',
  'Travel and Transportation', 'Other',
];

interface Brand {
  business_name: string;
  business_logo_url: string;
  business_description: string;
  business_category: string;
  business_address: string;
  business_city: string;
  business_hours: string;
  business_email: string;
  business_phone: string;
  business_website: string;
  business_website_2: string;
  payment_methods: string;
  delivery_info: string;
  chatbot_greeting: string;
  chatbot_farewell: string;
}

const defaultBrand: Brand = {
  business_name: '',
  business_logo_url: '',
  business_description: '',
  business_category: 'Retail',
  business_address: '',
  business_city: '',
  business_hours: '',
  business_email: '',
  business_phone: '',
  business_website: '',
  business_website_2: '',
  payment_methods: '',
  delivery_info: '',
  chatbot_greeting: '',
  chatbot_farewell: '',
};

// ── Campo genérico ────────────────────────────────────────────────────────────
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-semibold text-gray-700">{label}</label>
      {hint && <p className="text-xs text-gray-400 leading-relaxed">{hint}</p>}
      {children}
    </div>
  );
}

const inp = 'w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent focus:bg-white transition-all';

// ── Completion dots ───────────────────────────────────────────────────────────
function ProfileComplete({ brand }: { brand: Brand }) {
  const fields = [
    brand.business_name, brand.business_logo_url, brand.business_description,
    brand.business_address, brand.business_hours, brand.business_email,
    brand.business_website, brand.payment_methods,
  ];
  const filled = fields.filter(Boolean).length;
  const pct = Math.round((filled / fields.length) * 100);
  const color = pct < 40 ? 'bg-red-400' : pct < 80 ? 'bg-amber-400' : 'bg-green-500';

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-gray-500 w-10 text-right">{pct}%</span>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function HomePage() {
  const [brand, setBrand] = useState<Brand>(defaultBrand);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null);
  const [syncResult, setSyncResult] = useState<{ status: string; profile_text?: string; profile_photo?: string; message: string } | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  // ── Voice note module state ────────────────────────────────────────────────
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceLang, setVoiceLang]       = useState('es-CO');
  const [voiceNotify, setVoiceNotify]   = useState(false);
  const [voiceFlow, setVoiceFlow]       = useState<object[]>([]); // full flow for save
  const [voiceSaving, setVoiceSaving]   = useState(false);

  const showToast = (type: 'success' | 'error' | 'info', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 5000);
  };

  // ── Load voice_note module state ──────────────────────────────────────────
  const loadVoiceNote = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/modules/flow?tenant_id=default`);
      const data = await res.json();
      const flow: object[] = data.flow ?? [];
      setVoiceFlow(flow);
      const vm = (flow as Array<{module_id:string; enabled:boolean; config:Record<string,unknown>}>)
        .find((m) => m.module_id === 'voice_note');
      if (vm) {
        setVoiceEnabled(vm.enabled);
        setVoiceLang((vm.config?.language as string) ?? 'es-CO');
        setVoiceNotify((vm.config?.notify_transcription as boolean) ?? false);
      }
    } catch { /* silent */ }
  }, []);

  // ── Toggle voice_note active state & save immediately ──────────────────────
  const handleVoiceToggle = async (newEnabled: boolean, newLang?: string, newNotify?: boolean) => {
    setVoiceSaving(true);
    try {
      const lang    = newLang    ?? voiceLang;
      const notify  = newNotify  ?? voiceNotify;
      const enabled = newEnabled;

      // Build updated flow – replace or add voice_note
      const flowBase = (voiceFlow as Array<{module_id:string; enabled:boolean; position:number; config:Record<string,unknown>}>);
      let updated = flowBase.map((m) =>
        m.module_id === 'voice_note'
          ? { ...m, enabled, config: { language: lang, notify_transcription: notify } }
          : m
      );
      if (!updated.find((m) => m.module_id === 'voice_note')) {
        updated = [...updated, { module_id: 'voice_note', enabled, position: updated.length + 1, config: { language: lang, notify_transcription: notify } }];
      }

      const res = await fetch(`${API_BASE}/api/modules/flow`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: 'default', modules: updated }),
      });
      if (res.ok) {
        setVoiceEnabled(enabled);
        setVoiceLang(lang);
        setVoiceNotify(notify);
        setVoiceFlow(updated);
        showToast('success', enabled ? '🎙️ Notas de voz activadas' : '🔇 Notas de voz desactivadas');
      } else {
        showToast('error', '❌ No se pudo guardar la configuración');
      }
    } catch { showToast('error', '❌ Error de conexión'); }
    finally { setVoiceSaving(false); }
  };

  // ── Load settings ─────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_BASE}/api/settings`)
      .then((r) => r.json())
      .then((data) => {
        const s = data.settings || {};
        setBrand({
          business_name:        s.business_name || '',
          business_logo_url:    s.business_logo_url || '',
          business_description: s.business_description || '',
          business_category:    s.business_category || 'Retail',
          business_address:     s.business_address || '',
          business_city:        s.business_city || '',
          business_hours:       s.business_hours || '',
          business_email:       s.business_email || '',
          business_phone:       s.business_phone || '',
          business_website:     s.business_website || '',
          business_website_2:   s.business_website_2 || '',
          payment_methods:      s.payment_methods || '',
          delivery_info:        s.delivery_info || '',
          chatbot_greeting:     s.chatbot_greeting || '',
          chatbot_farewell:     s.chatbot_farewell || '',
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
    loadVoiceNote();
  }, [loadVoiceNote]);

  const patch = (key: keyof Brand, value: string) =>
    setBrand((b) => ({ ...b, [key]: value }));

  // ── Upload logo ───────────────────────────────────────────────────────────
  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    const preview = URL.createObjectURL(file);
    setBrand((b) => ({ ...b, business_logo_url: preview }));
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await fetch(`${API_BASE}/api/settings/logo`, { method: 'POST', body: form });
      if (res.ok) {
        const data = await res.json();
        setBrand((b) => ({ ...b, business_logo_url: data.url }));
        showToast('success', '✅ Foto de perfil actualizada');
      } else {
        const err = await res.json().catch(() => ({}));
        showToast('error', `❌ ${err.detail || 'Error al subir la foto'}`);
        setBrand((b) => ({ ...b, business_logo_url: '' }));
      }
    } catch {
      showToast('error', '❌ Error de conexión');
      setBrand((b) => ({ ...b, business_logo_url: '' }));
    } finally {
      setLogoUploading(false);
      if (logoRef.current) logoRef.current.value = '';
    }
  };

  // ── Save to Supabase ──────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(brand),
      });
      if (res.ok) showToast('success', '✅ Información guardada correctamente');
      else { const e = await res.json(); showToast('error', `❌ ${e.detail || 'Error al guardar'}`); }
    } catch { showToast('error', '❌ Error de conexión'); }
    finally { setSaving(false); }
  };

  // ── Sync to WhatsApp ──────────────────────────────────────────────────────
  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/settings/sync-whatsapp`, { method: 'POST' });
      const data = await res.json();
      setSyncResult(data);
      showToast(data.status === 'ok' ? 'success' : 'info', data.message);
    } catch { showToast('error', '❌ No se pudo conectar al servidor'); }
    finally { setSyncing(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-400">Cargando tu información...</p>
        </div>
      </div>
    );
  }

  const descLen = brand.business_description.length;
  const avatarSrc = brand.business_logo_url;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold transition-all animate-in slide-in-from-top-2 ${
          toast.type === 'success' ? 'bg-green-500 text-white'
          : toast.type === 'error' ? 'bg-red-500 text-white'
          : 'bg-indigo-500 text-white'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* ── HERO: Identidad visual ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600 rounded-3xl p-8 shadow-xl">
        {/* Decoración */}
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-violet-400/20 rounded-full blur-xl" />

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Logo / Avatar */}
          <div
            onClick={() => logoRef.current?.click()}
            className="group relative w-24 h-24 rounded-3xl overflow-hidden cursor-pointer flex-shrink-0 shadow-2xl border-4 border-white/30 hover:border-white/60 transition-all"
          >
            {avatarSrc && !avatarSrc.startsWith('blob:') ? (
              <img src={avatarSrc} alt="Logo" className="w-full h-full object-cover" />
            ) : avatarSrc.startsWith('blob:') ? (
              <img src={avatarSrc} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-white/20 flex items-center justify-center">
                <span className="text-4xl">🏪</span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {logoUploading
                ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <span className="text-white text-xs font-bold text-center">📸<br/>Cambiar</span>
              }
            </div>
          </div>
          <input ref={logoRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handleLogoChange} />

          {/* Nombre + descripción corta */}
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={brand.business_name}
              onChange={(e) => patch('business_name', e.target.value)}
              placeholder="Nombre de tu negocio"
              className="bg-transparent border-none outline-none text-white text-2xl sm:text-3xl font-extrabold placeholder:text-white/40 w-full caret-white"
            />
            <input
              type="text"
              value={brand.business_city}
              onChange={(e) => patch('business_city', e.target.value)}
              placeholder="Ciudad, País"
              className="bg-transparent border-none outline-none text-white/70 text-sm font-medium placeholder:text-white/30 w-full caret-white mt-1"
            />
            <div className="mt-4">
              <p className="text-white/60 text-xs mb-1 font-medium">Completitud del perfil de WhatsApp</p>
              <ProfileComplete brand={brand} />
            </div>
          </div>
        </div>
      </div>

      {/* ── GRID de secciones ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Card: Perfil WA Business */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-5 lg:col-span-2">
          <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
            <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center text-lg flex-shrink-0">💼</div>
            <div>
              <h2 className="text-base font-bold text-gray-800">Perfil de WhatsApp Business</h2>
              <p className="text-xs text-gray-400">Esta información aparece en tu página de negocio en WhatsApp</p>
            </div>
          </div>

          {/* Descripción */}
          <Field label={`Descripción (${descLen}/256)`} hint="Se muestra en tu perfil de WhatsApp y da contexto al chatbot.">
            <textarea
              rows={3}
              value={brand.business_description}
              onChange={(e) => patch('business_description', e.target.value)}
              className={`${inp} resize-none`}
              placeholder="Ej: Somos una licorera con entrega rápida en toda Bogotá. Ofrecemos ron, whisky, aguardiente y más."
              maxLength={256}
            />
            {descLen > 230 && (
              <p className={`text-xs mt-1 ${descLen >= 256 ? 'text-red-500' : 'text-amber-500'}`}>
                {256 - descLen} caracteres restantes
              </p>
            )}
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Categoría */}
            <Field label="Categoría de negocio" hint="Categoría oficial de WhatsApp Business.">
              <select value={brand.business_category} onChange={(e) => patch('business_category', e.target.value)} className={`${inp} cursor-pointer`}>
                {WA_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            {/* Horario */}
            <Field label="Horario de atención">
              <input type="text" value={brand.business_hours} onChange={(e) => patch('business_hours', e.target.value)} className={inp} placeholder="Ej: Lun – Sáb, 9am – 9pm" />
            </Field>
            {/* Dirección */}
            <Field label="Dirección física">
              <input type="text" value={brand.business_address} onChange={(e) => patch('business_address', e.target.value)} className={inp} placeholder="Ej: Calle 80 #45-32, Bogotá" />
            </Field>
            {/* Email */}
            <Field label="Email de contacto">
              <input type="email" value={brand.business_email} onChange={(e) => patch('business_email', e.target.value)} className={inp} placeholder="ventas@tu-tienda.com" />
            </Field>
            {/* Teléfono */}
            <Field label="Teléfono alternativo">
              <input type="tel" value={brand.business_phone} onChange={(e) => patch('business_phone', e.target.value)} className={inp} placeholder="+57 321 000 0000" />
            </Field>
          </div>

          {/* Sitios web */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Sitio web" hint="WhatsApp admite hasta 2 sitios web.">
              <input type="url" value={brand.business_website} onChange={(e) => patch('business_website', e.target.value)} className={inp} placeholder="https://tu-tienda.com" />
            </Field>
            <Field label="Sitio web 2 (opcional)">
              <input type="url" value={brand.business_website_2} onChange={(e) => patch('business_website_2', e.target.value)} className={inp} placeholder="https://link.bio/tu-tienda" />
            </Field>
          </div>
        </div>

        {/* Card: Servicio */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-5">
          <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-lg flex-shrink-0">🚚</div>
            <div>
              <h2 className="text-base font-bold text-gray-800">Servicio y Pagos</h2>
              <p className="text-xs text-gray-400">El chatbot usa esto para responder preguntas</p>
            </div>
          </div>
          <Field label="Métodos de pago">
            <input type="text" value={brand.payment_methods} onChange={(e) => patch('payment_methods', e.target.value)} className={inp} placeholder="Efectivo, Nequi, Daviplata..." />
          </Field>
          <Field label="Info de domicilios" hint="Zonas, costo y tiempo de entrega.">
            <textarea rows={3} value={brand.delivery_info} onChange={(e) => patch('delivery_info', e.target.value)} className={`${inp} resize-none`} placeholder="Hacemos domicilios en toda Bogotá. Tiempo: 30-45 min." />
          </Field>
        </div>

        {/* Card: Mensajes chatbot */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-5">
          <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-lg flex-shrink-0">💬</div>
            <div>
              <h2 className="text-base font-bold text-gray-800">Mensajes del Chatbot</h2>
              <p className="text-xs text-gray-400">Usa <code className="bg-gray-100 px-1 rounded">{'{business_name}'}</code> para el nombre</p>
            </div>
          </div>
          <Field label="Saludo inicial" hint="Primer mensaje que ve el cliente.">
            <textarea rows={2} value={brand.chatbot_greeting} onChange={(e) => patch('chatbot_greeting', e.target.value)} className={`${inp} resize-none`} placeholder="¡Hola! 👋 Bienvenido a {business_name}. ¿En qué te ayudo?" />
          </Field>
          <Field label="Mensaje de despedida" hint="Se envía al completar un pedido.">
            <textarea rows={2} value={brand.chatbot_farewell} onChange={(e) => patch('chatbot_farewell', e.target.value)} className={`${inp} resize-none`} placeholder="¡Gracias por tu pedido! 🎉 En breve lo procesamos." />
          </Field>
        </div>

        {/* ── Card: Funciones del Chatbot ────────────────────────────────── */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4 lg:col-span-2">
          <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
            <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center text-lg flex-shrink-0">🧩</div>
            <div className="flex-1">
              <h2 className="text-base font-bold text-gray-800">Funciones del Chatbot</h2>
              <p className="text-xs text-gray-400">Activa o desactiva capacidades opcionales de tu bot</p>
            </div>
          </div>

          {/* Voice note toggle */}
          <div className={`flex items-start gap-4 p-4 rounded-2xl border-2 transition-all duration-200 ${
            voiceEnabled ? 'border-violet-200 bg-violet-50' : 'border-gray-100 bg-gray-50'
          }`}>
            {/* Icon */}
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 transition-colors ${
              voiceEnabled ? 'bg-violet-200' : 'bg-gray-200'
            }`}>🎙️</div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-gray-800 text-sm">Notas de Voz</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Transcribe audios de WhatsApp con Google Gemini y los procesa como texto
                  </p>
                </div>
                {/* Main toggle */}
                <button
                  type="button"
                  disabled={voiceSaving}
                  onClick={() => handleVoiceToggle(!voiceEnabled)}
                  className={`relative flex-shrink-0 w-12 h-6 rounded-full transition-colors duration-200 disabled:opacity-50 ${
                    voiceEnabled ? 'bg-violet-500' : 'bg-gray-300'
                  }`}
                >
                  {voiceSaving
                    ? <div className="absolute inset-0 flex items-center justify-center"><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /></div>
                    : <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                        voiceEnabled ? 'translate-x-7' : 'translate-x-1'
                      }`} />
                  }
                </button>
              </div>

              {/* Sub-options (only when enabled) */}
              {voiceEnabled && (
                <div className="mt-3 pt-3 border-t border-violet-200 space-y-3">
                  {/* Language selector */}
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-1.5">Idioma de transcripción</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: 'es-CO', flag: '🇨🇴', label: 'Colombia' },
                        { value: 'es-ES', flag: '🇪🇸', label: 'España' },
                        { value: 'es-MX', flag: '🇲🇽', label: 'México' },
                        { value: 'en-US', flag: '🇺🇸', label: 'English' },
                        { value: 'pt-BR', flag: '🇧🇷', label: 'Português' },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          disabled={voiceSaving}
                          onClick={() => handleVoiceToggle(true, opt.value)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                            voiceLang === opt.value
                              ? 'border-violet-400 bg-violet-100 text-violet-700'
                              : 'border-gray-200 bg-white text-gray-500 hover:border-violet-300'
                          }`}
                        >
                          {opt.flag} {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notify user toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-700">Confirmar transcripción</p>
                      <p className="text-xs text-gray-400">Envía «🎙️ Escuché: ...» antes de responder</p>
                    </div>
                    <button
                      type="button"
                      disabled={voiceSaving}
                      onClick={() => handleVoiceToggle(true, undefined, !voiceNotify)}
                      className={`relative flex-shrink-0 w-10 h-5 rounded-full transition-colors disabled:opacity-50 ${
                        voiceNotify ? 'bg-violet-500' : 'bg-gray-300'
                      }`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        voiceNotify ? 'translate-x-5' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Barra de acciones ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
        {/* Guardar */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 sm:flex-none px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-sm font-bold rounded-2xl transition-all shadow-md shadow-indigo-200 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {saving
            ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Guardando...</>
            : '💾 Guardar cambios'}
        </button>

        {/* Separador */}
        <div className="hidden sm:block h-8 w-px bg-gray-200" />

        {/* Sync WhatsApp */}
        <button
          onClick={handleSync}
          disabled={syncing || saving}
          className="flex-1 sm:flex-none px-8 py-3.5 bg-green-600 hover:bg-green-700 active:scale-95 text-white text-sm font-bold rounded-2xl transition-all shadow-md shadow-green-200 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {syncing
            ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Sincronizando...</>
            : <><svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>Enviar a WhatsApp Business</>
          }
        </button>
      </div>

      {/* Resultado sync */}
      {syncResult && (
        <div className={`p-5 rounded-2xl border text-sm space-y-2 ${
          syncResult.status === 'ok' ? 'bg-green-50 border-green-200 text-green-800'
          : 'bg-amber-50 border-amber-200 text-amber-800'
        }`}>
          <p className="font-bold">{syncResult.message}</p>
          {syncResult.profile_text && <p className="text-xs">📝 {syncResult.profile_text}</p>}
          {syncResult.profile_photo && <p className="text-xs">📸 {syncResult.profile_photo}</p>}
        </div>
      )}

      {/* Nota al pie */}
      <p className="text-xs text-gray-400 text-center pb-2">
        💡 Guarda primero los cambios, luego haz clic en <strong>Enviar a WhatsApp Business</strong> para sincronizar el perfil.
      </p>
    </div>
  );
}
