"use client"
import { useState, useEffect, useCallback } from "react"
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd"

type Board  = { id: string; name: string; color: string }
type Stage  = { id: string; board_id: string; name: string; order_index: number; color: string }
type Deal   = {
  id: string; board_id: string; stage_id: string; order_id?: string; contact_id?: string
  name: string; phone_number?: string; email?: string; notes?: string; value: number
  created_at: string; updated_at?: string
}
type DealEvent = {
  id: string; deal_id: string; from_stage_id?: string; to_stage_id: string
  created_at: string
  from_stage?: { name: string; color: string } | null
  to_stage?: { name: string; color: string }
}

type KanbanBoardProps = { board: Board; onBack: () => void; apiUrl: string }

const STAGE_COLORS = ["#9ca3af","#6366f1","#0ea5e9","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899"]
const FREEZE_DAYS  = 3

function daysSince(d?: string) {
  if (!d) return 0
  return Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000)
}
const isFrozen = (deal: Deal) => daysSince(deal.updated_at || deal.created_at) >= FREEZE_DAYS

/* ─── METRICS PANEL ─────────────────────────────────────── */
function MetricsPanel({ stages, deals }: { stages: Stage[]; deals: Deal[] }) {
  const totalValue  = deals.reduce((s, d) => s + (d.value || 0), 0)
  const frozen      = deals.filter(isFrozen).length
  const contactable = deals.filter(d => d.phone_number).length

  return (
    <div className="flex flex-wrap gap-3 px-5 py-3 bg-gray-50 border-b-2 border-gray-200">
      <Stat icon="💰" label="Pipeline Total" value={`$${totalValue.toLocaleString()}`} />
      <Stat icon="🎯" label="Deals" value={deals.length} />
      <Stat icon="🧊" label={`Congelados +${FREEZE_DAYS}d`} value={frozen}
        alert={frozen > 0} />
      <Stat icon="📱" label="Con WhatsApp" value={contactable} />

      {deals.length > 0 && stages.length > 0 && (
        <div className="flex-1 min-w-[200px] bg-white rounded-xl px-4 py-2.5 border-2 border-gray-100 shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Embudo</p>
          <div className="space-y-1">
            {stages.map(s => {
              const count = deals.filter(d => d.stage_id === s.id).length
              const pct   = deals.length > 0 ? Math.round((count / deals.length) * 100) : 0
              return (
                <div key={s.id} className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-gray-500 w-20 truncate flex-shrink-0">{s.name}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className="h-2 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: s.color }} />
                  </div>
                  <span className="text-[10px] font-black text-gray-600 w-6 text-right flex-shrink-0">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ icon, label, value, alert }: { icon: string; label: string; value: any; alert?: boolean }) {
  return (
    <div className={`flex items-center gap-2 rounded-xl px-4 py-2.5 border-2 shadow-sm
      ${alert ? "bg-orange-50 border-orange-200" : "bg-white border-gray-100"}`}>
      <span className="text-xl">{icon}</span>
      <div>
        <p className={`text-[10px] font-black uppercase tracking-widest leading-none ${alert ? "text-orange-500" : "text-gray-400"}`}>{label}</p>
        <p className={`text-lg font-black leading-tight ${alert ? "text-orange-600" : "text-black"}`}>{value}</p>
      </div>
    </div>
  )
}

/* ─── BLAST MODAL ─────────────────────────────────────────── */
function BlastModal({ stage, apiUrl, onClose }: { stage: Stage; apiUrl: string; onClose: () => void }) {
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [result, setResult]   = useState<any>(null)

  const handleSend = async () => {
    if (!message.trim()) return
    if (!confirm(`¿Enviar este mensaje a todos los contactos de "${stage.name}"?`)) return
    setSending(true)
    try {
      const res  = await fetch(`${apiUrl}/crm/stages/${stage.id}/blast`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      })
      setResult(await res.json())
    } catch { alert("Error de conexión.") }
    finally { setSending(false) }
  }

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-gray-100 flex-shrink-0">
          <div>
            <p className="text-xs font-black text-green-600 uppercase tracking-widest">WhatsApp Masivo</p>
            <h3 className="text-xl font-black text-black">📨 {stage.name}</h3>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-gray-100 hover:bg-red-100 hover:text-red-600 font-black text-gray-500 transition-all">✕</button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {result ? (
            <div className="space-y-4">
              <div className={`p-4 rounded-2xl text-center ${result.sent > 0 ? "bg-green-50 border-2 border-green-200" : "bg-red-50 border-2 border-red-200"}`}>
                <p className="text-4xl mb-2">{result.sent > 0 ? "✅" : "⚠️"}</p>
                <p className="text-2xl font-black text-black">{result.sent} / {result.contactable} enviados</p>
                <p className="text-sm text-gray-500 mt-1">de los contactos con número</p>
              </div>
              {result.errors?.length > 0 && (
                <div className="bg-red-50 rounded-xl p-3 border border-red-200">
                  <p className="text-xs font-black text-red-600 mb-1">Errores ({result.errors.length})</p>
                  {result.errors.map((e: any, i: number) => (
                    <p key={i} className="text-xs text-red-700">• {e.name}: {e.error}</p>
                  ))}
                </div>
              )}
              <button onClick={onClose} className="w-full py-3 rounded-xl bg-gray-800 text-white font-bold hover:bg-gray-700 transition-colors">Cerrar</button>
            </div>
          ) : (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                <p className="text-xs font-black text-blue-700 mb-1">💡 Variable disponible</p>
                <p className="text-xs text-blue-600">Usa <code className="bg-white px-1 rounded font-mono font-bold">{"{nombre}"}</code> para personalizar.</p>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">Mensaje *</label>
                <textarea rows={5} autoFocus value={message} onChange={e => setMessage(e.target.value)}
                  placeholder={`Hola {nombre} 👋\n\nTe escribimos para hacerte seguimiento...`}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-400 outline-none text-black resize-none text-sm" />
                <p className="text-xs text-gray-400 mt-1 text-right">{message.length} caracteres</p>
              </div>
              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 py-3 rounded-xl border-2 border-gray-200 font-bold text-gray-700 hover:bg-gray-50 transition-colors">Cancelar</button>
                <button onClick={handleSend} disabled={!message.trim() || sending}
                  className="flex-1 py-3 rounded-xl bg-[#25D366] hover:bg-green-600 text-white font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {sending ? <><span className="animate-spin">⟳</span> Enviando...</> : <>📨 Enviar</>}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── HISTORY TIMELINE ───────────────────────────────────── */
function HistoryTimeline({ dealId, apiUrl }: { dealId: string; apiUrl: string }) {
  const [events, setEvents]   = useState<DealEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${apiUrl}/crm/deals/${dealId}/history`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setEvents(d) })
      .finally(() => setLoading(false))
  }, [dealId, apiUrl])

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>
  if (events.length === 0) return (
    <div className="text-center py-8 text-gray-400">
      <p className="text-3xl mb-2">📭</p>
      <p className="font-bold">Sin movimientos registrados</p>
    </div>
  )

  return (
    <div className="space-y-0">
      {events.map((ev, i) => {
        const isFirst = i === 0
        const isLast  = i === events.length - 1
        const next    = events[i + 1]
        const durationMs = next
          ? new Date(next.created_at).getTime() - new Date(ev.created_at).getTime()
          : Date.now() - new Date(ev.created_at).getTime()
        const durationDays = Math.floor(durationMs / 86_400_000)
        const durationHrs  = Math.floor((durationMs % 86_400_000) / 3_600_000)

        return (
          <div key={ev.id} className="flex gap-3">
            {/* Timeline spine */}
            <div className="flex flex-col items-center flex-shrink-0 w-6">
              <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-1 ring-2 ring-white shadow`}
                style={{ backgroundColor: ev.to_stage?.color || "#9ca3af" }} />
              {!isLast && <div className="flex-1 w-0.5 bg-gray-200 my-1 min-h-[24px]" />}
            </div>
            {/* Event content */}
            <div className="pb-4 min-w-0 flex-1">
              <div className="flex items-center flex-wrap gap-1.5 mb-0.5">
                {ev.from_stage ? (
                  <>
                    <span className="text-xs font-bold text-gray-400 line-through">{ev.from_stage.name}</span>
                    <span className="text-gray-300 text-xs">→</span>
                  </>
                ) : (
                  <span className="text-xs bg-indigo-50 text-indigo-500 font-black px-1.5 py-0.5 rounded">INICIO</span>
                )}
                <span className="text-xs font-black text-black"
                  style={{ color: ev.to_stage?.color }}>
                  {ev.to_stage?.name}
                </span>
              </div>
              <p className="text-[11px] text-gray-400">
                {new Date(ev.created_at).toLocaleString()}
                {!isLast && (
                  <span className="ml-2 font-bold text-gray-500">
                    · {durationDays > 0 ? `${durationDays}d ` : ""}{durationHrs}h en esta etapa
                  </span>
                )}
                {isLast && (
                  <span className="ml-2 font-bold text-indigo-600">
                    · {durationDays > 0 ? `${durationDays}d ` : ""}{durationHrs}h ← aquí ahora
                  </span>
                )}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ─── MAIN KANBAN BOARD ─────────────────────────────────── */
export default function KanbanBoard({ board, onBack, apiUrl }: KanbanBoardProps) {
  const [stages, setStages]         = useState<Stage[]>([])
  const [deals,  setDeals]          = useState<Deal[]>([])
  const [loading, setLoading]       = useState(true)

  const [showNewStage, setShowNewStage]   = useState(false)
  const [stageName, setStageName]         = useState("")
  const [stageColor, setStageColor]       = useState(STAGE_COLORS[0])
  const [creatingStage, setCreatingStage] = useState(false)

  const [addDealStageId, setAddDealStageId] = useState<string | null>(null)
  const [dealName,  setDealName]            = useState("")
  const [dealPhone, setDealPhone]           = useState("")
  const [dealValue, setDealValue]           = useState("")
  const [creatingDeal, setCreatingDeal]     = useState(false)

  const [blastStage, setBlastStage]       = useState<Stage | null>(null)
  const [selectedDeal, setSelectedDeal]   = useState<Deal | null>(null)
  const [dealTab, setDealTab]             = useState<"info" | "history">("info")
  const [editNotes, setEditNotes]         = useState("")
  const [editValue, setEditValue]         = useState("")
  const [savingDeal, setSavingDeal]       = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [sr, dr] = await Promise.all([
        fetch(`${apiUrl}/crm/boards/${board.id}/stages`),
        fetch(`${apiUrl}/crm/boards/${board.id}/deals`),
      ])
      const s = await sr.json(); const d = await dr.json()
      if (Array.isArray(s)) setStages(s)
      if (Array.isArray(d)) setDeals(d)
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [apiUrl, board.id])

  useEffect(() => { fetchData() }, [fetchData])

  const onDragEnd = async (result: DropResult) => {
    const { destination, draggableId } = result
    if (!destination) return
    const newStageId = destination.droppableId
    const deal = deals.find(d => d.id === draggableId)
    if (!deal || deal.stage_id === newStageId) return
    const now = new Date().toISOString()
    setDeals(prev => prev.map(d => d.id === draggableId ? { ...d, stage_id: newStageId, updated_at: now } : d))
    try {
      await fetch(`${apiUrl}/crm/deals/${draggableId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage_id: newStageId }),
      })
    } catch { fetchData() }
  }

  const handleCreateStage = async (e: React.FormEvent) => {
    e.preventDefault(); if (!stageName.trim()) return
    setCreatingStage(true)
    try {
      const res = await fetch(`${apiUrl}/crm/stages`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ board_id: board.id, name: stageName, color: stageColor, order_index: stages.length }),
      })
      if (res.ok) { setStageName(""); setStageColor(STAGE_COLORS[0]); setShowNewStage(false); fetchData() }
    } finally { setCreatingStage(false) }
  }

  const handleDeleteStage = async (id: string) => {
    if (!confirm("¿Eliminar esta etapa y todos sus deals?")) return
    await fetch(`${apiUrl}/crm/stages/${id}`, { method: "DELETE" }); fetchData()
  }

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault(); if (!dealName.trim() || !addDealStageId) return
    setCreatingDeal(true)
    try {
      const res = await fetch(`${apiUrl}/crm/deals`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ board_id: board.id, stage_id: addDealStageId, name: dealName, phone_number: dealPhone, value: parseFloat(dealValue) || 0 }),
      })
      if (res.ok) { setDealName(""); setDealPhone(""); setDealValue(""); setAddDealStageId(null); fetchData() }
    } finally { setCreatingDeal(false) }
  }

  const handleDeleteDeal = async (id: string) => {
    if (!confirm("¿Eliminar este deal?")) return
    await fetch(`${apiUrl}/crm/deals/${id}`, { method: "DELETE" })
    setSelectedDeal(null); fetchData()
  }

  const handleSaveDeal = async () => {
    if (!selectedDeal) return
    setSavingDeal(true)
    try {
      await fetch(`${apiUrl}/crm/deals/${selectedDeal.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: editNotes, value: parseFloat(editValue) || 0 }),
      })
      setSelectedDeal({ ...selectedDeal, notes: editNotes, value: parseFloat(editValue) || 0 })
      fetchData()
    } finally { setSavingDeal(false) }
  }

  const openDeal = (deal: Deal) => {
    setSelectedDeal(deal); setEditNotes(deal.notes || ""); setEditValue(deal.value?.toString() || "0"); setDealTab("info")
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
    </div>
  )

  return (
    <div className="flex flex-col h-full min-h-screen bg-gray-50">
      {/* TOP BAR */}
      <div className="flex items-center gap-4 px-5 py-3 border-b-2 border-gray-200 bg-white flex-shrink-0"
        style={{ borderTop: `4px solid ${board.color}` }}>
        <button onClick={onBack}
          className="w-9 h-9 flex items-center justify-center rounded-xl border-2 border-gray-200 text-gray-600 hover:bg-gray-100 font-bold transition-colors flex-shrink-0">←</button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-black text-black truncate">{board.name}</h2>
          <p className="text-xs text-gray-500 font-medium">{stages.length} etapas · {deals.length} deals</p>
        </div>
        <button onClick={() => setShowNewStage(true)}
          className="px-4 py-2 rounded-xl text-sm font-bold border-2 border-dashed border-gray-300 text-gray-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all whitespace-nowrap">
          + Etapa
        </button>
      </div>

      <MetricsPanel stages={stages} deals={deals} />

      {/* KANBAN */}
      <div className="flex-1 overflow-x-auto p-5">
        {stages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-4xl mb-3">🗂️</p>
            <p className="text-lg font-bold text-gray-600">No hay etapas aún</p>
            <button onClick={() => setShowNewStage(true)}
              className="mt-5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all">
              + Agregar Primera Etapa
            </button>
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-4 items-start pb-4" style={{ minWidth: `${stages.length * 290}px` }}>
              {stages.map(stage => {
                const sd = deals.filter(d => d.stage_id === stage.id)
                const sv = sd.reduce((s, d) => s + (d.value || 0), 0)
                const fc = sd.filter(isFrozen).length
                const cc = sd.filter(d => d.phone_number).length
                return (
                  <div key={stage.id}
                    className="flex flex-col w-[272px] flex-shrink-0 bg-white rounded-2xl border-2 border-gray-200 overflow-hidden shadow-sm"
                    style={{ borderTop: `3px solid ${stage.color}` }}>
                    {/* Header */}
                    <div className="px-3 py-2.5 bg-white border-b border-gray-100">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color }} />
                          <span className="font-black text-black truncate text-sm">{stage.name}</span>
                          <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0">{sd.length}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setBlastStage(stage)} disabled={cc === 0}
                            title={`Enviar WA a ${cc} contacto(s)`}
                            className={`w-7 h-7 rounded-lg text-xs transition-all flex items-center justify-center font-bold
                              ${cc > 0 ? "text-green-600 bg-green-50 hover:bg-green-500 hover:text-white" : "text-gray-200 cursor-not-allowed"}`}>
                            📨
                          </button>
                          <button onClick={() => handleDeleteStage(stage.id)}
                            className="w-7 h-7 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 text-xs transition-colors flex items-center justify-center">✕</button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {sv > 0 && <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">${sv.toLocaleString()}</span>}
                        {fc > 0 && <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full animate-pulse">🧊 {fc} congelado{fc > 1 ? "s" : ""}</span>}
                      </div>
                    </div>
                    {/* Cards */}
                    <Droppable droppableId={stage.id}>
                      {(prov, snap) => (
                        <div ref={prov.innerRef} {...prov.droppableProps}
                          className={`flex-1 p-2 space-y-2 min-h-[120px] transition-colors ${snap.isDraggingOver ? "bg-indigo-50/60" : ""}`}>
                          {sd.map((deal, idx) => {
                            const frozen = isFrozen(deal)
                            const days   = daysSince(deal.updated_at || deal.created_at)
                            return (
                              <Draggable key={deal.id} draggableId={deal.id} index={idx}>
                                {(dp, ds) => (
                                  <div ref={dp.innerRef} {...dp.draggableProps} {...dp.dragHandleProps}
                                    onClick={() => openDeal(deal)}
                                    className={`bg-white rounded-xl p-3 cursor-pointer transition-all group
                                      ${ds.isDragging ? "shadow-xl rotate-1 scale-105 border-2 border-indigo-400"
                                        : frozen ? "border-2 border-orange-300 hover:border-orange-400 shadow-sm hover:shadow-md"
                                        : "border-2 border-gray-100 hover:border-indigo-300 shadow-sm hover:shadow-md"}`}>
                                    {frozen && (
                                      <div className="flex items-center gap-1 mb-2 bg-orange-50 rounded-lg px-2 py-1">
                                        <span className="text-[10px]">🧊</span>
                                        <span className="text-[10px] font-black text-orange-600">{days}d sin actividad</span>
                                      </div>
                                    )}
                                    <div className="flex items-start gap-2">
                                      <div className="flex-1 min-w-0">
                                        <p className="font-bold text-black text-sm truncate">{deal.name}</p>
                                        {deal.phone_number && <p className="text-xs text-gray-500 font-mono mt-0.5 truncate">{deal.phone_number}</p>}
                                      </div>
                                      <div className="flex flex-col gap-1 items-end flex-shrink-0">
                                        {deal.order_id && <span className="text-[10px] bg-orange-100 text-orange-600 font-black px-1.5 py-0.5 rounded-md">VENTA</span>}
                                        {deal.contact_id && <span className="text-[10px] bg-indigo-100 text-indigo-600 font-black px-1.5 py-0.5 rounded-md">📇</span>}
                                      </div>
                                    </div>
                                    {deal.value > 0 && (
                                      <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between items-center">
                                        <span className="text-xs font-black text-green-700 bg-green-50 px-2 py-0.5 rounded-lg">${deal.value.toLocaleString()}</span>
                                        <span className="text-[10px] text-gray-400">{new Date(deal.created_at).toLocaleDateString()}</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </Draggable>
                            )
                          })}
                          {prov.placeholder}
                        </div>
                      )}
                    </Droppable>
                    {/* Add Deal */}
                    <div className="p-2 border-t border-gray-100">
                      {addDealStageId === stage.id ? (
                        <form onSubmit={handleCreateDeal} className="space-y-2">
                          <input required autoFocus value={dealName} onChange={e => setDealName(e.target.value)}
                            placeholder="Nombre del cliente *"
                            className="w-full text-sm px-3 py-2 rounded-lg border-2 border-indigo-300 focus:border-indigo-500 outline-none text-black font-semibold" />
                          <input value={dealPhone} onChange={e => setDealPhone(e.target.value)} placeholder="WhatsApp (opcional)"
                            className="w-full text-sm px-3 py-2 rounded-lg border-2 border-gray-200 outline-none text-black" />
                          <input type="number" min="0" value={dealValue} onChange={e => setDealValue(e.target.value)} placeholder="Valor $ (opcional)"
                            className="w-full text-sm px-3 py-2 rounded-lg border-2 border-gray-200 outline-none text-black" />
                          <div className="flex gap-2">
                            <button type="button" onClick={() => { setAddDealStageId(null); setDealName(""); setDealPhone(""); setDealValue("") }}
                              className="flex-1 py-2 text-xs font-bold rounded-lg border-2 border-gray-200 text-gray-600 hover:bg-gray-50">Cancelar</button>
                            <button type="submit" disabled={creatingDeal}
                              className="flex-1 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50">
                              {creatingDeal ? "..." : "Agregar"}</button>
                          </div>
                        </form>
                      ) : (
                        <button onClick={() => setAddDealStageId(stage.id)}
                          className="w-full py-2 text-xs font-bold text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center justify-center gap-1">
                          <span className="text-base leading-none">+</span> Agregar Deal
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
              <button onClick={() => setShowNewStage(true)}
                className="flex-shrink-0 w-[272px] h-16 rounded-2xl border-2 border-dashed border-gray-300 text-gray-400 hover:border-indigo-400 hover:text-indigo-500 hover:bg-indigo-50/50 font-bold text-sm transition-all flex items-center justify-center gap-2">
                + Nueva Etapa
              </button>
            </div>
          </DragDropContext>
        )}
      </div>

      {/* MODAL: Nueva Etapa */}
      {showNewStage && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowNewStage(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 animate-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-black text-black mb-5">Nueva Etapa</h3>
            <form onSubmit={handleCreateStage} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Nombre *</label>
                <input required autoFocus value={stageName} onChange={e => setStageName(e.target.value)} placeholder="Ej: En seguimiento"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 outline-none text-black font-semibold" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {STAGE_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setStageColor(c)}
                      className={`w-7 h-7 rounded-full transition-all ${stageColor === c ? "ring-4 ring-offset-2 ring-gray-400 scale-110" : "hover:scale-110"}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowNewStage(false)} className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 font-bold text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={creatingStage} className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold disabled:opacity-50">
                  {creatingStage ? "..." : "Crear"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Deal Detail */}
      {selectedDeal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedDeal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b-2 border-gray-100 flex-shrink-0">
              <div>
                <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">Deal</span>
                <h3 className="text-xl font-black text-black">{selectedDeal.name}</h3>
              </div>
              <button onClick={() => setSelectedDeal(null)} className="w-9 h-9 rounded-full bg-gray-100 hover:bg-red-100 hover:text-red-600 font-black text-gray-500 transition-all">✕</button>
            </div>
            {/* Tabs */}
            <div className="flex border-b-2 border-gray-100 flex-shrink-0">
              {(["info", "history"] as const).map(tab => (
                <button key={tab} onClick={() => setDealTab(tab)}
                  className={`flex-1 py-2.5 text-sm font-black transition-colors ${dealTab === tab ? "text-indigo-600 border-b-2 border-indigo-600 -mb-0.5" : "text-gray-400 hover:text-gray-600"}`}>
                  {tab === "info" ? "📋 Información" : "📅 Historial"}
                </button>
              ))}
            </div>
            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {dealTab === "info" ? (
                <div className="space-y-5">
                  {isFrozen(selectedDeal) && (
                    <div className="bg-orange-50 border-2 border-orange-200 rounded-xl px-4 py-3 flex items-center gap-3">
                      <span className="text-2xl">🧊</span>
                      <div>
                        <p className="text-sm font-black text-orange-700">Deal congelado</p>
                        <p className="text-xs text-orange-500">{daysSince(selectedDeal.updated_at || selectedDeal.created_at)} días sin actividad. ¡Haz follow-up!</p>
                      </div>
                    </div>
                  )}
                  {selectedDeal.phone_number && (
                    <div>
                      <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">Teléfono</p>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-black font-mono">{selectedDeal.phone_number}</span>
                        <a href={`https://wa.me/${selectedDeal.phone_number.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                          className="bg-[#25D366] text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-green-600 transition-colors">WhatsApp</a>
                      </div>
                    </div>
                  )}
                  {selectedDeal.contact_id && (
                    <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
                      <p className="text-xs font-black text-indigo-600">📇 Contacto vinculado al directorio</p>
                      <p className="text-xs text-gray-500 mt-0.5 font-mono truncate">{selectedDeal.contact_id}</p>
                    </div>
                  )}
                  {selectedDeal.order_id && (
                    <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
                      <p className="text-xs font-black text-orange-600">🛒 Venta vinculada</p>
                      <p className="text-xs text-gray-500 mt-0.5 font-mono truncate">{selectedDeal.order_id}</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">Valor ($)</label>
                    <input type="number" min="0" value={editValue} onChange={e => setEditValue(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-indigo-500 outline-none text-black font-bold" />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">Notas Internas</label>
                    <textarea rows={4} value={editNotes} onChange={e => setEditNotes(e.target.value)}
                      placeholder="Agrega notas sobre este cliente..."
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 outline-none text-black resize-none" />
                  </div>
                  <p className="text-xs text-gray-400">Creado: {new Date(selectedDeal.created_at).toLocaleString()}</p>
                </div>
              ) : (
                <HistoryTimeline dealId={selectedDeal.id} apiUrl={apiUrl} />
              )}
            </div>
            {/* Footer */}
            {dealTab === "info" && (
              <div className="flex items-center justify-between gap-3 px-6 py-4 border-t-2 border-gray-100 flex-shrink-0">
                <button onClick={() => handleDeleteDeal(selectedDeal.id)}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold bg-red-50 text-red-600 hover:bg-red-100 border-2 border-red-100 transition-colors">
                  🗑️ Eliminar
                </button>
                <button onClick={handleSaveDeal} disabled={savingDeal}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50">
                  {savingDeal ? "Guardando..." : "💾 Guardar"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BLAST MODAL */}
      {blastStage && <BlastModal stage={blastStage} apiUrl={apiUrl} onClose={() => setBlastStage(null)} />}
    </div>
  )
}
