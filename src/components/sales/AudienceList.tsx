"use client";
import { useEffect, useState } from "react";

type AudienceSession = {
  phone_number: string;
  cart?: { products: any[]; subtotal: number };
  conversation_context?: { history: any[] };
  updated_at: string;
};

export default function AudienceList({ type }: { type: 'abandoned' | 'leads' }) {
  const [sessions, setSessions] = useState<AudienceSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<AudienceSession | null>(null);

  // CRM Pipeline state
  const [showPipelineModal, setShowPipelineModal] = useState(false);
  const [crmBoards, setCrmBoards] = useState<any[]>([]);
  const [crmStages, setCrmStages] = useState<any[]>([]);
  const [crmBoardId, setCrmBoardId] = useState("");
  const [crmStageId, setCrmStageId] = useState("");
  const [sendingToCrm, setSendingToCrm] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL!;

  useEffect(() => {
    fetchAudiences();
    fetchCrmBoards();
  }, [type]);

  const fetchAudiences = async () => {
    setLoading(true);
    try {
      const endpoint = type === 'abandoned' ? '/audiences/abandoned-carts' : '/audiences/leads';
      const res = await fetch(`${API_URL}${endpoint}`);
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching audiences:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCrmBoards = async () => {
    try {
      const res = await fetch(`${API_URL}/crm/boards`);
      const data = await res.json();
      if (Array.isArray(data)) setCrmBoards(data);
    } catch (e) {}
  };

  const fetchCrmStages = async (boardId: string) => {
    setCrmStages([]);
    setCrmStageId("");
    if (!boardId) return;
    try {
      const res = await fetch(`${API_URL}/crm/boards/${boardId}/stages`);
      const data = await res.json();
      if (Array.isArray(data)) setCrmStages(data);
    } catch (e) {}
  };

  const handleBoardChange = (boardId: string) => {
    setCrmBoardId(boardId);
    fetchCrmStages(boardId);
  };

  const handleSendToPipeline = async () => {
    if (!selectedSession || !crmBoardId || !crmStageId) return;
    setSendingToCrm(true);
    
    // Generar las notas según el tipo de audiencia
    let notes = `Origen: ${type === 'abandoned' ? 'Carrito Abandonado 🛒' : 'Lead / Preguntó 💬'}\n\n`;
    if (type === 'abandoned' && selectedSession.cart?.products?.length) {
      notes += "Productos de interés:\n";
      selectedSession.cart.products.forEach(p => {
        notes += `- ${p.name} (x${p.quantity})\n`;
      });
      notes += `\nSubtotal proyectado: $${selectedSession.cart.subtotal.toLocaleString()}`;
    }

    try {
      const res = await fetch(`${API_URL}/crm/deals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          board_id: crmBoardId,
          stage_id: crmStageId,
          name: `Lead ${selectedSession.phone_number}`, // Nombre genérico ya que no sabemos el nombre a veces
          phone_number: selectedSession.phone_number,
          value: selectedSession.cart?.subtotal || 0,
          notes: notes,
        }),
      });
      if (res.ok) {
        alert("✅ Enviado al Pipeline correctamente. Ahora escríbele para cerrar la venta!");
        setShowPipelineModal(false);
      } else {
        alert("Error al enviar al Pipeline. Revisa backend.");
      }
    } finally {
      setSendingToCrm(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500 font-bold">Cargando datos de audiencia...</div>;
  }

  if (sessions.length === 0) {
    return (
      <div className="bg-gray-50 rounded-2xl p-8 text-center border-2 border-dashed border-gray-200 text-black font-medium text-lg mt-4">
        {type === 'abandoned' 
          ? 'No hay carritos abandonados recientes.'
          : 'No hay usuarios curiosos recientes en el bot.'}
      </div>
    );
  }

  return (
    <div className="mt-6">
      {/* TABLA ESTILO SHOPIFY PARA AUDIENCIAS */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-gray-50 border-b-2 border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
              <th className="p-4 font-bold">Contacto</th>
              <th className="p-4 font-bold">Etapa</th>
              <th className="p-4 font-bold">Última Actividad</th>
              <th className="p-4 font-bold">Interés Principal</th>
              <th className="p-4 font-bold text-right">Valor Proyectado</th>
              <th className="p-4 font-bold text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sessions.map((session) => (
              <tr 
                key={session.phone_number}
                onClick={() => setSelectedSession(session)}
                className="transition-colors group hover:bg-gray-50 cursor-pointer bg-white"
              >
                <td className="p-4">
                  <p className="font-extrabold text-sm text-gray-900 border border-gray-200 px-2 py-1 rounded-lg inline-block bg-gray-50">
                    📞 {session.phone_number}
                  </p>
                </td>
                
                <td className="p-4">
                  {type === 'abandoned' ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold leading-4 bg-orange-100 text-orange-800 border-2 border-orange-200">
                      🛒 Carrito Abandonado
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold leading-4 bg-purple-100 text-purple-800 border-2 border-purple-200">
                      💬 Lead Fresco
                    </span>
                  )}
                </td>

                <td className="p-4">
                  <p className="text-sm font-medium text-gray-700">
                    {new Date(session.updated_at).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(session.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </p>
                </td>

                <td className="p-4">
                  {type === 'abandoned' && session.cart?.products && session.cart.products.length > 0 ? (
                    <div className="flex items-center gap-1.5 truncate max-w-[200px]" title={session.cart.products.map(p => p.name).join(', ')}>
                      <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200 truncate">
                        {session.cart.products[0].name}
                      </span>
                      {session.cart.products.length > 1 && (
                        <span className="text-xs font-bold text-gray-500">+{session.cart.products.length - 1}</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs font-medium text-gray-400 italic">Conversación en curso...</span>
                  )}
                </td>

                <td className="p-4 text-right">
                  <span className="font-black text-sm text-gray-900">
                    ${(session.cart?.subtotal || 0).toLocaleString()}
                  </span>
                </td>

                <td className="p-4 text-right">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setSelectedSession(session); }}
                    className="text-indigo-600 hover:text-indigo-900 text-xs font-bold hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-indigo-100"
                  >
                    Detalles &rarr;
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal / Ficha de la sesión */}
      {selectedSession && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition-opacity" onClick={() => setSelectedSession(null)}>
          <div 
            className="bg-white rounded-[2rem] w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-gray-100 px-6 py-4 border-b-2 border-gray-200 flex justify-between items-center sticky top-0 z-10 flex-shrink-0">
              <h3 className="text-2xl font-black text-black">Oportunidad de Venta</h3>
              <button onClick={() => setSelectedSession(null)} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-300 text-black font-black hover:bg-red-500 hover:text-white transition-all transform hover:scale-105">✕</button>
            </div>

            <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1">
              <div>
                <p className="text-xs font-black text-black uppercase tracking-widest mb-3 opacity-70">Contacto</p>
                <div className="p-5 rounded-2xl border-2 shadow-sm border-indigo-100 border-l-8 border-l-indigo-600 bg-white flex flex-wrap items-center justify-between gap-3">
                  <span className="bg-gray-100 border border-gray-200 text-black font-bold px-3 py-2 rounded-lg text-xl">📞 {selectedSession.phone_number}</span>
                  <a href={`https://wa.me/${selectedSession.phone_number.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" className="bg-[#25D366] text-white font-bold px-5 py-2.5 rounded-xl hover:bg-green-600 transition-colors shadow-sm w-full sm:w-auto text-center flex-1 sm:flex-none">
                    Hablarle al WhatsApp
                  </a>
                </div>
              </div>

              {type === 'abandoned' && selectedSession.cart && selectedSession.cart.products.length > 0 && (
                <div>
                  <p className="text-xs font-black text-black uppercase tracking-widest mb-3 opacity-70">Carrito que dejó</p>
                  <ul className="bg-white border-2 border-gray-200 rounded-2xl divide-y-2 divide-gray-100 text-black font-medium shadow-sm overflow-hidden">
                    {selectedSession.cart.products.map((p, i) => (
                      <li key={i} className="flex items-center px-5 py-4 hover:bg-gray-50 transition-colors">
                        <span className="text-xl mr-4">🛒</span>
                        <span className="flex-1 text-lg font-bold">{p.name}</span>
                        <span className="font-black text-xl bg-gray-200 border border-gray-300 px-3 py-1 rounded-xl">× {p.quantity || 1}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <p className="text-xs font-black text-black uppercase tracking-widest mb-3 opacity-70">Últimos Mensajes (Contexto)</p>
                <div className="bg-gray-50 rounded-2xl border-2 border-gray-200 shadow-inner p-4 max-h-64 overflow-y-auto space-y-3">
                  {selectedSession.conversation_context?.history?.slice(-6).map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`p-3 rounded-2xl max-w-[85%] ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white border border-gray-200 text-black rounded-tl-sm'}`}>
                        <p className="font-medium text-sm whitespace-pre-wrap">{msg.text || msg.parts?.[0]?.text || "..."}</p>
                      </div>
                    </div>
                  ))}
                  {(!selectedSession.conversation_context?.history || selectedSession.conversation_context.history.length === 0) && (
                    <p className="text-center text-gray-500 font-medium py-4">No hay historial visible de conversación.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-gray-100 border-t-2 border-gray-200 p-4 shrink-0 flex justify-end">
              <button
                onClick={() => setShowPipelineModal(true)}
                className="bg-indigo-600 border-2 border-indigo-700 hover:bg-indigo-700 active:scale-95 transition-all text-white px-5 py-3 rounded-xl font-bold shadow-md w-full sm:w-auto"
              >
                📋 Enviar al Pipeline CRM
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ENVIAR A PIPELINE CRM */}
      {showPipelineModal && selectedSession && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowPipelineModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 animate-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-black text-black mb-1">📋 Enviar al Pipeline</h3>
            <p className="text-sm text-gray-500 mb-5 font-medium">
              Contacto: <span className="font-bold text-black">{selectedSession.phone_number}</span>
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">1. Selecciona el Tablero</label>
                {crmBoards.length === 0 ? (
                  <p className="text-sm text-red-500 font-bold">No tienes tableros creados. Ve a Pipeline y crea uno primero.</p>
                ) : (
                  <select value={crmBoardId} onChange={(e) => handleBoardChange(e.target.value)} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 outline-none text-black font-bold bg-white">
                    <option value="">-- Elige un tablero --</option>
                    {crmBoards.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                )}
              </div>
              {crmBoardId && (
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">2. Selecciona la Etapa Inicial</label>
                  {crmStages.length === 0 ? (
                    <p className="text-sm text-orange-500 font-bold">Este tablero no tiene etapas.</p>
                  ) : (
                    <select value={crmStageId} onChange={(e) => setCrmStageId(e.target.value)} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 outline-none text-black font-bold bg-white">
                      <option value="">-- Elige una etapa --</option>
                      {crmStages.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  )}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowPipelineModal(false); setCrmBoardId(""); setCrmStageId(""); setCrmStages([]); }} className="flex-1 py-3 rounded-xl border-2 border-gray-200 font-bold text-gray-700 hover:bg-gray-50 transition-colors">Cancelar</button>
                <button onClick={handleSendToPipeline} disabled={!crmBoardId || !crmStageId || sendingToCrm} className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors disabled:opacity-50">
                  {sendingToCrm ? "Enviando..." : "Enviar ✓"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
