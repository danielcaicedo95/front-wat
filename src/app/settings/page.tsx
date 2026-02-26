'use client';

import { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type CatalogMode = 'supabase' | 'meta' | 'hybrid';

interface Settings {
  catalog_mode: CatalogMode;
  business_name: string;
  welcome_message: string;
  min_age: string;
  age_gate_question: string;
  age_yes_button: string;
  age_no_button: string;
  age_rejection_message: string;
}

const CATALOG_MODES: { id: CatalogMode; icon: string; label: string; description: string; badge?: string }[] = [
  {
    id: 'supabase',
    icon: '🗄️',
    label: 'Solo Supabase',
    description: 'Lista interactiva con todos tus productos desde la base de datos. Ideal para licorería.',
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

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'catalog' | 'messages'>('catalog');

  useEffect(() => {
    fetch(`${API_BASE}/api/settings`)
      .then((r) => r.json())
      .then((data) => {
        setSettings(data.settings);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch(`${API_BASE}/api/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setFeedback({ type: 'success', msg: '✅ Configuración guardada. Activa en máximo 60 segundos.' });
      } else {
        const err = await res.json();
        setFeedback({ type: 'error', msg: `❌ Error: ${err.detail || 'No se pudo guardar'}` });
      }
    } catch {
      setFeedback({ type: 'error', msg: '❌ Error de conexión con el servidor.' });
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-8 text-red-500">
        No se pudo cargar la configuración. Verifica que el backend esté corriendo.
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">⚙️ Configuración del Bot</h1>
        <p className="text-sm text-gray-500 mt-1">
          Los cambios se aplican automáticamente en máximo 60 segundos.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {(['catalog', 'messages'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'catalog' ? '📦 Modo de Catálogo' : '💬 Mensajes'}
          </button>
        ))}
      </div>

      {/* Tab: Catalog Mode */}
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
                  onClick={() => setSettings({ ...settings, catalog_mode: mode.id })}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                    isActive
                      ? 'border-blue-500 bg-blue-50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{mode.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${isActive ? 'text-blue-700' : 'text-gray-800'}`}>
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
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        isActive ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                      }`}
                    >
                      {isActive && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Info box for hybrid */}
          {settings.catalog_mode === 'hybrid' && (
            <div className="mx-6 mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              <strong>💡 Modo Híbrido:</strong> Para que funcione correctamente, marca los productos
              aprobados en Meta desde el panel de Inventario (campo &quot;En catálogo Meta&quot;).
            </div>
          )}
        </div>
      )}

      {/* Tab: Messages */}
      {activeTab === 'messages' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800">Mensajes del Bot</h2>
            <p className="text-sm text-gray-500 mt-1">
              Personaliza los textos que ve el usuario. Usa \n para saltos de línea.
            </p>
          </div>
          <div className="p-6 space-y-5">
            {/* Business Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre del negocio
              </label>
              <input
                type="text"
                value={settings.business_name}
                onChange={(e) => setSettings({ ...settings, business_name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Licorera El Barril"
              />
            </div>

            {/* Min Age */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Edad mínima requerida
              </label>
              <input
                type="number"
                value={settings.min_age}
                onChange={(e) => setSettings({ ...settings, min_age: e.target.value })}
                className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="13"
                max="25"
              />
              <p className="text-xs text-gray-400 mt-1">Colombia: 18 · USA: 21 · Suecia: 25</p>
            </div>

            {/* Welcome Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mensaje de bienvenida (gate de edad)
              </label>
              <textarea
                rows={3}
                value={settings.welcome_message}
                onChange={(e) => setSettings({ ...settings, welcome_message: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Age Gate Question */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pregunta de verificación de edad
              </label>
              <input
                type="text"
                value={settings.age_gate_question}
                onChange={(e) => setSettings({ ...settings, age_gate_question: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Botón &quot;Sí&quot; (máx 20 chars)
                </label>
                <input
                  type="text"
                  maxLength={20}
                  value={settings.age_yes_button}
                  onChange={(e) => setSettings({ ...settings, age_yes_button: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Botón &quot;No&quot; (máx 20 chars)
                </label>
                <input
                  type="text"
                  maxLength={20}
                  value={settings.age_no_button}
                  onChange={(e) => setSettings({ ...settings, age_no_button: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Rejection Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mensaje de rechazo (menores de edad)
              </label>
              <textarea
                rows={4}
                value={settings.age_rejection_message}
                onChange={(e) => setSettings({ ...settings, age_rejection_message: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-sm font-medium ${
            feedback.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {feedback.msg}
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              Guardando...
            </>
          ) : (
            'Guardar cambios'
          )}
        </button>
      </div>
    </div>
  );
}
