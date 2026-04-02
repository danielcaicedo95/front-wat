'use client';

import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ── Tipos ──────────────────────────────────────────────────────────────────────
type Gateway = 'wompi' | 'mercadopago';
type PayMode = 'disabled' | 'optional' | 'required';

interface GatewayRecord {
  id: string;
  gateway: Gateway;
  label: string;
  is_active: boolean;
  sandbox_mode: boolean;
  public_key: string;
}

interface ConnectForm {
  gateway: Gateway;
  label: string;
  sandbox_mode: boolean;
  public_key: string;
  private_key: string;
  events_key: string;
}

const EMPTY_FORM: ConnectForm = {
  gateway: 'wompi',
  label: '',
  sandbox_mode: true,
  public_key: '',
  private_key: '',
  events_key: '',
};

// ── Metadata de pasarelas ──────────────────────────────────────────────────────
const GW_META: Record<Gateway, {
  name: string; icon: string; color: string; bg: string; border: string;
  fields: { key: keyof ConnectForm; label: string; hint: string; placeholder: string; type: string }[];
  docsUrl: string; docsLabel: string;
}> = {
  wompi: {
    name: 'Wompi',
    icon: '🇨🇴',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    docsUrl: 'https://comercios.wompi.co/',
    docsLabel: 'Abrir panel de Wompi',
    fields: [
      {
        key: 'public_key',
        label: 'Public Key',
        hint: 'Empieza con pub_test_ (sandbox) o pub_prod_ (producción)',
        placeholder: 'pub_test_xxxxxxxxxxxxxxxxxxxx',
        type: 'text',
      },
      {
        key: 'private_key',
        label: 'Private Key',
        hint: 'Empieza con priv_test_ o priv_prod_ — NUNCA la compartas',
        placeholder: 'priv_test_xxxxxxxxxxxxxxxxxxxx',
        type: 'password',
      },
      {
        key: 'events_key',
        label: 'Events Key (Webhooks)',
        hint: 'Empieza con test_events_ o prod_events_ — para validar notificaciones',
        placeholder: 'test_events_xxxxxxxxxxxxxxxxxxxx',
        type: 'password',
      },
    ],
  },
  mercadopago: {
    name: 'MercadoPago',
    icon: '💙',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    docsUrl: 'https://www.mercadopago.com.co/developers/es/docs',
    docsLabel: 'Abrir panel de MercadoPago',
    fields: [
      {
        key: 'private_key',
        label: 'Access Token',
        hint: 'TEST-xxx... (sandbox) o APP_USR-xxx... (producción). Encuéntralo en Mis credenciales.',
        placeholder: 'TEST-xxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        type: 'password',
      },
    ],
  },
};

const PAY_MODES: { id: PayMode; icon: string; label: string; desc: string }[] = [
  {
    id: 'disabled',
    icon: '🚫',
    label: 'Desactivado',
    desc: 'El bot no genera links de pago. El cliente elige el método manualmente (efectivo, nequi, etc.).',
  },
  {
    id: 'optional',
    icon: '🔀',
    label: 'Opcional',
    desc: 'La factura muestra todos los métodos disponibles + un botón "Pagar en línea 💳". El cliente elige.',
  },
  {
    id: 'required',
    icon: '💳',
    label: 'Solo Online',
    desc: 'El bot genera y envía el link de pago automáticamente al confirmar el pedido. No hay otras opciones.',
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function Badge({ active, sandbox }: { active: boolean; sandbox: boolean }) {
  if (!active) return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Inactiva</span>;
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sandbox ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
      {sandbox ? '🧪 Sandbox' : '🟢 Producción'}
    </span>
  );
}

function Spinner() {
  return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />;
}

function Alert({ msg, type }: { msg: string; type: 'success' | 'error' | 'info' }) {
  const styles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-700',
    info: 'bg-blue-50 border-blue-200 text-blue-700',
  };
  return (
    <div className={`p-3 rounded-xl border text-sm font-medium ${styles[type]}`}>{msg}</div>
  );
}

// ── Componente de tarjeta de pasarela configurada ──────────────────────────────
function GatewayCard({
  record,
  onTest,
  onToggle,
  onDelete,
}: {
  record: GatewayRecord;
  onTest: (id: string) => void;
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string, name: string) => void;
}) {
  const meta = GW_META[record.gateway];
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState('');

  const handleTest = async () => {
    setTesting(true);
    setTestResult('');
    try {
      const res = await fetch(`${API}/api/payments/gateways/${record.id}/test`, { method: 'POST' });
      const data = await res.json();
      setTestResult(data.message || (res.ok ? '✅ Conexión exitosa' : '❌ Error de conexión'));
    } catch {
      setTestResult('❌ No se pudo conectar al servidor');
    } finally {
      setTesting(false);
    }
    onTest(record.id);
  };

  return (
    <div className={`rounded-2xl border-2 ${record.is_active ? meta.border : 'border-gray-200'} overflow-hidden transition-all`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-5 py-4 ${record.is_active ? meta.bg : 'bg-gray-50'}`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{meta.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <p className={`font-bold text-sm ${record.is_active ? meta.color : 'text-gray-500'}`}>{meta.name}</p>
              <Badge active={record.is_active} sandbox={record.sandbox_mode} />
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{record.label}</p>
          </div>
        </div>
        {/* Toggle activo/inactivo */}
        <button
          onClick={() => onToggle(record.id, !record.is_active)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${record.is_active ? 'bg-green-500' : 'bg-gray-300'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${record.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      {/* Acciones */}
      {record.is_active && (
        <div className="px-5 py-3 bg-white border-t border-gray-100 flex items-center gap-3 flex-wrap">
          <button
            onClick={handleTest}
            disabled={testing}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors disabled:opacity-60"
          >
            {testing ? <Spinner /> : '⚡'}
            {testing ? 'Probando...' : 'Probar conexión'}
          </button>

          <a
            href={meta.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
          >
            🔗 {meta.docsLabel}
          </a>

          <button
            onClick={() => onDelete(record.id, meta.name)}
            className="ml-auto text-xs font-medium text-red-500 hover:text-red-700 transition-colors"
          >
            Desconectar
          </button>
        </div>
      )}

      {testResult && (
        <div className="px-5 pb-3 bg-white">
          <Alert
            msg={testResult}
            type={testResult.startsWith('✅') ? 'success' : 'error'}
          />
        </div>
      )}
    </div>
  );
}

// ── Formulario de conexión ─────────────────────────────────────────────────────
function ConnectForm({
  targetGateway,
  onSuccess,
  onCancel,
}: {
  targetGateway: Gateway;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<ConnectForm>({ ...EMPTY_FORM, gateway: targetGateway });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const meta = GW_META[targetGateway];

  const patch = (key: keyof ConnectForm, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/payments/gateways`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gateway: form.gateway,
          label: form.label || meta.name,
          sandbox_mode: form.sandbox_mode,
          public_key: form.public_key || undefined,
          private_key: form.private_key,
          events_key: form.events_key || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onSuccess();
      } else {
        setError(data.detail || '❌ Error guardando la pasarela');
      }
    } catch {
      setError('❌ No se pudo conectar al servidor');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`rounded-2xl border-2 ${meta.border} overflow-hidden`}>
      {/* Header */}
      <div className={`flex items-center gap-3 px-5 py-4 ${meta.bg}`}>
        <span className="text-2xl">{meta.icon}</span>
        <div>
          <p className={`font-bold text-sm ${meta.color}`}>Conectar {meta.name}</p>
          <p className="text-xs text-gray-500">Ingresa tus credenciales del panel de {meta.name}</p>
        </div>
      </div>

      <div className="p-5 space-y-4 bg-white">
        {/* Nombre del perfil */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Nombre del perfil <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <input
            type="text"
            value={form.label}
            onChange={(e) => patch('label', e.target.value)}
            placeholder={`Mi cuenta ${meta.name}`}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        {/* Toggle Sandbox / Producción */}
        <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {form.sandbox_mode ? '🧪 Modo Sandbox (pruebas)' : '🟢 Modo Producción'}
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              {form.sandbox_mode
                ? 'Usa claves de prueba. Los pagos son simulados.'
                : 'Usa claves reales. Los pagos serán cobrados.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => patch('sandbox_mode', !form.sandbox_mode)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${!form.sandbox_mode ? 'bg-green-500' : 'bg-amber-400'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${!form.sandbox_mode ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        {/* Campos específicos de la pasarela */}
        {meta.fields.map((field) => (
          <div key={field.key}>
            <label className="block text-xs font-semibold text-gray-600 mb-1">{field.label}</label>
            <p className="text-xs text-gray-400 mb-1.5">{field.hint}</p>
            <input
              type={field.type}
              value={String(form[field.key] ?? '')}
              onChange={(e) => patch(field.key, e.target.value)}
              placeholder={field.placeholder}
              required={field.key === 'private_key'}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50"
            />
          </div>
        ))}

        {/* Aviso de seguridad */}
        <div className="flex items-start gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <span className="text-base">🔒</span>
          <p className="text-xs text-slate-600">
            <strong>Almacenamiento seguro:</strong> Las claves privadas se cifran con AES-256 antes de guardarse.
            Nunca se envían al navegador ni se muestran de nuevo.
          </p>
        </div>

        {error && <Alert msg={error} type="error" />}

        {/* Acciones */}
        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {saving ? <><Spinner /> Conectando...</> : '🔗 Conectar pasarela'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </form>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ─── Página principal ─────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export default function PaymentsPage() {
  const [gateways, setGateways] = useState<GatewayRecord[]>([]);
  const [payMode, setPayMode] = useState<PayMode>('disabled');
  const [loading, setLoading] = useState(true);
  const [connectingGw, setConnectingGw] = useState<Gateway | null>(null);
  const [savingMode, setSavingMode] = useState(false);
  const [modeFeedback, setModeFeedback] = useState('');

  // ── Carga inicial ────────────────────────────────────────────────────────
  const reload = async () => {
    setLoading(true);
    try {
      const [gwRes, settingsRes] = await Promise.all([
        fetch(`${API}/api/payments/gateways`),
        fetch(`${API}/api/settings`),
      ]);
      if (gwRes.ok) {
        const data = await gwRes.json();
        setGateways(data.gateways || []);
      }
      if (settingsRes.ok) {
        const data = await settingsRes.json();
        const mode = data.settings?.payment_gateway_mode as PayMode;
        if (mode) setPayMode(mode);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  // ── Guardar modo ─────────────────────────────────────────────────────────
  const saveMode = async (newMode: PayMode) => {
    setSavingMode(true);
    setModeFeedback('');
    setPayMode(newMode);
    try {
      const res = await fetch(`${API}/api/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_gateway_mode: newMode }),
      });
      setModeFeedback(res.ok ? '✅ Modo guardado' : '❌ Error guardando');
    } catch {
      setModeFeedback('❌ Error de conexión');
    } finally {
      setSavingMode(false);
      setTimeout(() => setModeFeedback(''), 3000);
    }
  };

  // ── Toggle activo ────────────────────────────────────────────────────────
  const handleToggle = async (id: string, newActive: boolean) => {
    setGateways((gs) => gs.map((g) => (g.id === id ? { ...g, is_active: newActive } : g)));
    await fetch(`${API}/api/payments/gateways/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: newActive }),
    });
  };

  // ── Eliminar ─────────────────────────────────────────────────────────────
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Desconectar ${name}? Se eliminarán las credenciales guardadas.`)) return;
    await fetch(`${API}/api/payments/gateways/${id}`, { method: 'DELETE' });
    setGateways((gs) => gs.filter((g) => g.id !== id));
  };

  const connectedGateways = new Set(gateways.map((g) => g.gateway));
  const hasAnyGateway = gateways.length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-80">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">💳 Pasarelas de Pago</h1>
        <p className="text-sm text-gray-500 mt-1">
          Conecta tu cuenta de Wompi o MercadoPago. El bot generará links de pago automáticamente al confirmar pedidos.
        </p>
      </div>

      {/* ── Sección 1: Modo de pago ──────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Modo de pago</h2>
          {savingMode && <div className="flex items-center gap-1.5 text-xs text-gray-400"><Spinner /> Guardando...</div>}
          {modeFeedback && <span className={`text-xs font-medium ${modeFeedback.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>{modeFeedback}</span>}
        </div>

        {PAY_MODES.map((mode) => {
          const isSelected = payMode === mode.id;
          const isDisabled = mode.id !== 'disabled' && !hasAnyGateway;
          return (
            <button
              key={mode.id}
              type="button"
              disabled={isDisabled}
              onClick={() => saveMode(mode.id)}
              className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                  : isDisabled
                  ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'
                  }`}
                >
                  {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{mode.icon}</span>
                    <span className={`text-sm font-semibold ${isSelected ? 'text-indigo-700' : 'text-gray-800'}`}>
                      {mode.label}
                    </span>
                    {isDisabled && (
                      <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-lg">
                        Conecta una pasarela primero
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{mode.desc}</p>
                </div>
              </div>
            </button>
          );
        })}
      </section>

      {/* ── Sección 2: Pasarelas conectadas ──────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Pasarelas configuradas</h2>

        {gateways.length === 0 && !connectingGw && (
          <div className="p-8 border-2 border-dashed border-gray-200 rounded-2xl text-center space-y-2">
            <p className="text-3xl">💳</p>
            <p className="text-sm font-medium text-gray-600">Aún no tienes pasarelas conectadas</p>
            <p className="text-xs text-gray-400">Conecta Wompi o MercadoPago para empezar a recibir pagos en línea.</p>
          </div>
        )}

        {gateways.map((gw) => (
          <GatewayCard
            key={gw.id}
            record={gw}
            onTest={() => {}}
            onToggle={handleToggle}
            onDelete={handleDelete}
          />
        ))}
      </section>

      {/* ── Sección 3: Agregar pasarela ───────────────────────────────────── */}
      {connectingGw ? (
        <ConnectForm
          targetGateway={connectingGw}
          onSuccess={() => { setConnectingGw(null); reload(); }}
          onCancel={() => setConnectingGw(null)}
        />
      ) : (
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Agregar pasarela</h2>
          <div className="grid grid-cols-2 gap-3">
            {/* Wompi */}
            <button
              onClick={() => setConnectingGw('wompi')}
              disabled={connectedGateways.has('wompi')}
              className={`group p-4 rounded-2xl border-2 text-left transition-all ${
                connectedGateways.has('wompi')
                  ? 'border-emerald-200 bg-emerald-50 opacity-70 cursor-default'
                  : 'border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-sm active:scale-[0.98]'
              }`}
            >
              <div className="text-2xl mb-2">🇨🇴</div>
              <p className="font-bold text-sm text-gray-800">Wompi</p>
              <p className="text-xs text-gray-400 mt-0.5">Colombia — COP</p>
              {connectedGateways.has('wompi') ? (
                <span className="mt-2 inline-block text-xs text-emerald-600 font-medium">✅ Conectado</span>
              ) : (
                <span className="mt-2 inline-block text-xs text-indigo-600 font-medium group-hover:underline">Conectar →</span>
              )}
            </button>

            {/* MercadoPago */}
            <button
              onClick={() => setConnectingGw('mercadopago')}
              disabled={connectedGateways.has('mercadopago')}
              className={`group p-4 rounded-2xl border-2 text-left transition-all ${
                connectedGateways.has('mercadopago')
                  ? 'border-blue-200 bg-blue-50 opacity-70 cursor-default'
                  : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm active:scale-[0.98]'
              }`}
            >
              <div className="text-2xl mb-2">💙</div>
              <p className="font-bold text-sm text-gray-800">MercadoPago</p>
              <p className="text-xs text-gray-400 mt-0.5">LATAM — Multi-moneda</p>
              {connectedGateways.has('mercadopago') ? (
                <span className="mt-2 inline-block text-xs text-blue-600 font-medium">✅ Conectado</span>
              ) : (
                <span className="mt-2 inline-block text-xs text-indigo-600 font-medium group-hover:underline">Conectar →</span>
              )}
            </button>
          </div>
        </section>
      )}

      {/* ── Sección 4: Webhooks info ─────────────────────────────────────── */}
      {hasAnyGateway && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Configurar Webhooks</h2>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <p className="text-xs text-slate-600">
              Para recibir confirmaciones de pago automáticas, configura estas URLs en el panel de tu pasarela:
            </p>
            {connectedGateways.has('wompi') && (
              <div>
                <p className="text-xs font-semibold text-slate-700 mb-1">Wompi — Events URL:</p>
                <code className="block text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono break-all select-all">
                  {API}/api/payments/webhook/wompi
                </code>
              </div>
            )}
            {connectedGateways.has('mercadopago') && (
              <div>
                <p className="text-xs font-semibold text-slate-700 mb-1">MercadoPago — Webhook URL:</p>
                <code className="block text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono break-all select-all">
                  {API}/api/payments/webhook/mercadopago
                </code>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
