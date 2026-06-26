'use client';

/**
 * Configuración de impresora térmica — simplificada.
 * 3 opciones: activar impresora, cuántas copias, conectar + test.
 */

import { useState, useEffect } from 'react';
import { usePrinter } from '@/hooks/usePrinter';
import { getPrinterDiagnosticInfo } from '@/lib/printer';

const COPY_OPTIONS = [
  { value: 1, label: '1 copia', sub: 'Solo para el cliente' },
  { value: 2, label: '2 copias', sub: 'Cocina + Cliente', recommended: true },
  { value: 3, label: '3 copias', sub: 'Cocina + Barra + Cliente' },
];

export default function PrinterSettingsPage() {
  const {
    config,
    saveConfig,
    connect,
    disconnect,
    isConnected,
    serialSupported,
    testPrint,
    printing,
  } = usePrinter();

  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [diag, setDiag] = useState<{ webSerialSupported: boolean; authorizedPorts: number; isConnected: boolean; portInfo?: string } | null>(null);

  const refreshDiag = async () => {
    const info = await getPrinterDiagnosticInfo();
    setDiag(info);
  };

  useEffect(() => {
    refreshDiag();
  }, [isConnected]);

  const handleConnect = async () => {
    setConnecting(true);
    setTestMsg(null);
    const result = await connect();
    setConnecting(false);
    await refreshDiag();
    setTestMsg({
      ok: result.ok,
      text: result.ok ? '✅ Impresora conectada y lista para imprimir' : `❌ ${result.error || 'No se pudo conectar'}`,
    });
  };

  const handleTest = async () => {
    setTestMsg(null);
    const result = await testPrint();
    setTestMsg({
      ok: result.ok,
      text: result.ok ? '✅ Ticket de prueba enviado a la impresora' : `❌ ${result.error}`,
    });
  };

  const inp = 'w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition-all';

  return (
    <div className="max-w-xl mx-auto p-6 space-y-5 pb-12">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-600 flex items-center justify-center text-3xl shadow-lg">
          🖨️
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900">Impresora de Tickets</h1>
          <p className="text-sm text-gray-500 mt-0.5">Configura cómo se imprimen los pedidos al ser aprobados</p>
        </div>
      </div>

      {/* ── 1. ¿Tiene impresora? (ON/OFF) ─────────────────────────────── */}
      <div className={`bg-white rounded-3xl border-2 p-6 transition-all ${
        config.autoprint ? 'border-indigo-300 shadow-md shadow-indigo-50' : 'border-gray-100 shadow-sm'
      }`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-colors ${
              config.autoprint ? 'bg-indigo-600' : 'bg-gray-100'
            }`}>
              {config.autoprint ? '✅' : '🖨️'}
            </div>
            <div>
              <p className="font-black text-gray-900 text-base">
                Imprimir al aprobar pedidos
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {config.autoprint
                  ? 'Cada vez que apruebes un pedido, se imprimirá automáticamente'
                  : 'Puedes imprimir manualmente desde la ficha de cada pedido'}
              </p>
            </div>
          </div>

          {/* Toggle grande y claro */}
          <button
            onClick={() => saveConfig({ autoprint: !config.autoprint })}
            className={`relative w-16 h-8 rounded-full transition-all duration-300 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 ${
              config.autoprint ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
            role="switch"
            aria-checked={config.autoprint}
          >
            <span className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${
              config.autoprint ? 'left-9' : 'left-1'
            }`} />
          </button>
        </div>

        {config.autoprint && (
          <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-indigo-700 bg-indigo-50 rounded-2xl px-4 py-3 flex items-start gap-2">
            <span>⚡</span>
            <span>El ticket se imprimirá <strong>{config.copies} {config.copies === 1 ? 'vez' : 'veces'}</strong> de forma automática cada vez que toques <strong>"✅ Aceptar Pedido"</strong>.</span>
          </div>
        )}
      </div>

      {/* ── 2. ¿Cuántas copias? ────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-xl">📄</span>
          <h2 className="font-black text-gray-900">¿Cuántas copias imprimir?</h2>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {COPY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => saveConfig({ copies: opt.value })}
              className={`relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all focus:outline-none ${
                config.copies === opt.value
                  ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              {opt.recommended && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-green-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full whitespace-nowrap">
                  RECOMENDADO
                </span>
              )}
              <span className={`text-3xl font-black mb-1 ${
                config.copies === opt.value ? 'text-indigo-600' : 'text-gray-700'
              }`}>{opt.value}</span>
              <span className={`text-xs font-bold ${
                config.copies === opt.value ? 'text-indigo-700' : 'text-gray-500'
              }`}>{opt.label}</span>
              <span className="text-[10px] text-gray-400 text-center mt-0.5 leading-tight">{opt.sub}</span>
            </button>
          ))}
        </div>

        {/* Preview de etiquetas por copia */}
        <div className="flex flex-wrap gap-2">
          {['🍴 COCINA', '🧾 CLIENTE', '📋 ADMIN'].slice(0, config.copies).map((label, i) => (
            <span key={i} className="px-3 py-1.5 bg-gray-100 rounded-xl text-xs font-bold text-gray-600 border border-gray-200 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              Copia {i + 1}: {label}
            </span>
          ))}
        </div>
      </div>

      {/* ── 3. Texto del encabezado del ticket ───────────────────────── */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-xl">🏷️</span>
          <div>
            <h2 className="font-black text-gray-900">Encabezado del ticket</h2>
            <p className="text-xs text-gray-500">Aparece en la parte superior de cada impresión</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Nombre del negocio</label>
            <input
              type="text"
              value={config.businessName}
              onChange={e => saveConfig({ businessName: e.target.value })}
              className={inp}
              placeholder="Restaurante El Buen Sabor"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Teléfono / WhatsApp (opcional)</label>
            <input
              type="text"
              value={config.businessPhone}
              onChange={e => saveConfig({ businessPhone: e.target.value })}
              className={inp}
              placeholder="+57 300 000 0000"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Mensaje al pie</label>
            <input
              type="text"
              value={config.footerText}
              onChange={e => saveConfig({ footerText: e.target.value })}
              className={inp}
              placeholder="¡Gracias por tu pedido! 🙏"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Ancho del papel</label>
            <div className="flex gap-3">
              {([80, 58] as const).map(w => (
                <button
                  key={w}
                  onClick={() => saveConfig({ paperWidth: w })}
                  className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${
                    config.paperWidth === w
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {w}mm {w === 80 ? '(Q22)' : '(compacta)'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. Conexión USB ───────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xl">🔌</span>
            <div>
              <h2 className="font-black text-gray-900">Conexión con la impresora</h2>
              <p className="text-xs text-gray-500">
                {serialSupported
                  ? 'Conexión USB directa — solo Chrome/Edge'
                  : '⚠️ Tu navegador no soporta USB directo. Usa Chrome o Edge.'}
              </p>
            </div>
          </div>

          {/* Indicador de estado */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${
            isConnected
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-gray-50 border-gray-200 text-gray-400'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
            {isConnected ? 'Conectada' : 'Sin conectar'}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {!isConnected ? (
            <button
              onClick={handleConnect}
              disabled={connecting || !serialSupported}
              className="flex-1 sm:flex-none bg-gray-900 hover:bg-gray-700 active:scale-95 disabled:opacity-50 text-white font-bold px-5 py-3 rounded-2xl text-sm transition-all flex items-center justify-center gap-2"
            >
              {connecting
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Conectando...</>
                : '🔌 Conectar impresora USB'}
            </button>
          ) : (
            <button
              onClick={disconnect}
              className="border-2 border-gray-200 text-gray-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600 font-bold px-5 py-3 rounded-2xl text-sm transition-all"
            >
              Desconectar
            </button>
          )}

          <button
            onClick={handleTest}
            disabled={printing}
            className="flex-1 sm:flex-none border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 text-gray-700 hover:text-indigo-700 font-bold px-5 py-3 rounded-2xl text-sm transition-all flex items-center justify-center gap-2"
          >
            {printing
              ? <><div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />Imprimiendo...</>
              : '🧪 Ticket de prueba'}
          </button>
        </div>

        {testMsg && (
          <div className={`text-sm font-medium px-4 py-3 rounded-2xl border-2 animate-in fade-in slide-in-from-bottom-1 ${
            testMsg.ok
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {testMsg.text}
          </div>
        )}

        <p className="text-xs text-gray-400 leading-relaxed">
          💡 <strong>SAT PCS Q22</strong>: conecta el cable USB, abre Chrome, haz clic en{' '}
          <em>Conectar impresora</em> y selecciona el puerto COM que aparezca. Si no aparece ningún puerto,
          instala el driver <strong>CH340</strong> (incluido en el CD de la impresora).
        </p>

        {/* ── Panel de Diagnóstico ── */}
        {diag && (
          <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-slate-600 font-bold text-xs uppercase tracking-wider">🛠️ Diagnóstico del Sistema</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between border-b border-slate-200 pb-1">
                <span className="text-slate-500">API Soportada:</span>
                <span className="font-bold text-slate-700">{diag.webSerialSupported ? 'Sí ✅' : 'No ❌'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1">
                <span className="text-slate-500">Puertos Guardados:</span>
                <span className="font-bold text-slate-700">{diag.authorizedPorts}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1">
                <span className="text-slate-500">Estado Serial:</span>
                <span className="font-bold text-slate-700">{diag.isConnected ? 'Conectado 🟢' : 'Desconectado 🔴'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1">
                <span className="text-slate-500">Info Dispositivo:</span>
                <span className="font-bold text-slate-700">{diag.portInfo || 'N/A'}</span>
              </div>
            </div>
            {diag.authorizedPorts === 0 && diag.webSerialSupported && (
              <div className="mt-3 text-[11px] text-orange-700 bg-orange-50 p-2 rounded-lg border border-orange-100">
                ⚠️ Chrome no tiene permisos para usar la impresora aún. Haz clic en "Conectar impresora USB". Si no aparece ninguna opción en la lista emergente, <strong>tienes que instalar el driver USB-Serial (CH340)</strong>.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Vista previa del ticket ───────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-xl">👁️</span>
          <h2 className="font-black text-gray-900">Vista previa del ticket</h2>
        </div>

        {/* Simulación visual del ticket térmico */}
        <div className="flex justify-center">
          <div
            className="bg-white border border-gray-200 shadow-md rounded-sm p-4 text-center"
            style={{ fontFamily: 'monospace', fontSize: '11px', width: config.paperWidth === 80 ? '280px' : '200px', lineHeight: '1.6' }}
          >
            <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '2px' }}>
              {config.businessName || 'Nombre del negocio'}
            </div>
            {config.businessPhone && (
              <div style={{ color: '#555', marginBottom: '4px' }}>{config.businessPhone}</div>
            )}
            <div style={{ borderTop: '1px dashed #999', margin: '6px 0' }} />
            <div style={{ textAlign: 'left' }}>
              <div><strong>🍴 COCINA</strong></div>
              <div>Pedido #A1B2C3</div>
              <div>12/01/2026 · 07:30 pm</div>
            </div>
            <div style={{ borderTop: '1px dashed #999', margin: '6px 0' }} />
            <div style={{ textAlign: 'left' }}>
              <strong>CLIENTE</strong><br />
              Juan García<br />
              Tel: +57 300 000 0000<br />
              Calle 123 # 45-67
            </div>
            <div style={{ borderTop: '1px dashed #999', margin: '6px 0' }} />
            <div style={{ textAlign: 'left' }}>
              <strong>PRODUCTOS</strong><br />
              Bandeja Paisa &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; x1<br />
              Limonada Natural &nbsp;&nbsp;&nbsp; x2
            </div>
            <div style={{ borderTop: '1px dashed #999', margin: '6px 0' }} />
            <div style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '14px' }}>
              TOTAL: $35,000
            </div>
            <div style={{ textAlign: 'left', fontSize: '10px' }}>Pago: Efectivo</div>
            <div style={{ borderTop: '1px dashed #999', margin: '6px 0' }} />
            <div style={{ color: '#555', fontSize: '10px' }}>
              {config.footerText || '¡Gracias por tu pedido! 🙏'}
            </div>
          </div>
        </div>
        <p className="text-xs text-center text-gray-400">
          El ticket impreso tendrá exactamente este formato con los datos reales del pedido
        </p>
      </div>

    </div>
  );
}
