"use client"
import { useState, useEffect, useCallback, useMemo } from "react"
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd"

type Board = { id: string; name: string; color: string }
type Stage = { id: string; board_id: string; name: string; order_index: number; color: string }
type Deal = {
  id: string; board_id: string; stage_id: string; order_id?: string
  name: string; phone_number?: string; email?: string; notes?: string; value: number
  created_at: string; updated_at?: string
}

type KanbanBoardProps = { board: Board; onBack: () => void; apiUrl: string }

const STAGE_COLORS = [
  "#9ca3af", "#6366f1", "#0ea5e9", "#10b981",
  "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899",
]

const FREEZE_DAYS = 3 // días sin actividad = congelado

function daysSince(dateStr?: string): number {
  if (!dateStr) return 0
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function isFrozen(deal: Deal): boolean {
  return daysSince(deal.updated_at || deal.created_at) >= FREEZE_DAYS
}

/* ─── METRICS PANEL ─────────────────────────────────────── */
function MetricsPanel({ stages, deals }: { stages: Stage[]; deals: Deal[] }) {
  const totalValue = deals.reduce((s, d) => s + (d.value || 0), 0)
  const frozen = deals.filter(isFrozen).length
  const contactable = deals.filter((d) => d.phone_number).length

  return (
    <div className="flex flex-wrap gap-3 px-5 py-3 bg-gray-50 border-b-2 border-gray-200">
      {/* Valor total */}
      <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2.5 border-2 border-gray-100 shadow-sm min-w-0">
        <span className="text-xl">💰</span>
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Pipeline Total</p>
          <p className="text-lg font-black text-black leading-tight">${totalValue.toLocaleString()}</p>
        </div>
      </div>

      {/* Deals */}
      <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2.5 border-2 border-gray-100 shadow-sm">
        <span className="text-xl">🎯</span>
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Deals</p>
          <p className="text-lg font-black text-black leading-tight">{deals.length}</p>
        </div>
      </div>

      {/* Congelados */}
      <div className={`flex items-center gap-2 rounded-xl px-4 py-2.5 border-2 shadow-sm ${frozen > 0 ? "bg-orange-50 border-orange-200" : "bg-white border-gray-100"}`}>
        <span className="text-xl">🧊</span>
        <div>
          <p className={`text-[10px] font-black uppercase tracking-widest leading-none ${frozen > 0 ? "text-orange-500" : "text-gray-400"}`}>
            Congelados +{FREEZE_DAYS}d
          </p>
          <p className={`text-lg font-black leading-tight ${frozen > 0 ? "text-orange-600" : "text-black"}`}>{frozen}</p>
        </div>
      </div>

      {/* Contactables */}
      <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2.5 border-2 border-gray-100 shadow-sm">
        <span className="text-xl">📱</span>
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Con WhatsApp</p>
          <p className="text-lg font-black text-black leading-tight">{contactable}</p>
        </div>
      </div>

      {/* Embudo visual */}
      {deals.length > 0 && stages.length > 0 && (
        <div className="flex-1 min-w-[200px] bg-white rounded-xl px-4 py-2.5 border-2 border-gray-100 shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Embudo</p>
          <div className="space-y-1">
            {stages.map((s) => {
              const count = deals.filter((d) => d.stage_id === s.id).length
              const pct = deals.length > 0 ? Math.round((count / deals.length) * 100) : 0
              return (
                <div key={s.id} className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-gray-500 w-20 truncate flex-shrink-0">{s.name}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: s.color }}
                    />
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

/* ─── BLAST MODAL ─────────────────────────────────────────── */
function BlastModal({
  stage, apiUrl, onClose
}: { stage: Stage; apiUrl: string; onClose: () => void }) {
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ sent: number; contactable: number; errors: any[] } | null>(null)

  const handleSend = async () => {
    if (!message.trim()) return
    if (!confirm(`¿Enviar este mensaje a todos los contactos de "${stage.name}"?`)) return
    setSending(true)
    try {
      const res = await fetch(`${apiUrl}/crm/stages/${stage.id}/blast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      })
      const data = await res.json()
      setResult(data)
    } catch (e) {
      alert("Error de conexión al enviar.")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-gray-100 flex-shrink-0">
          <div>
            <p className="text-xs font-black text-green-600 uppercase tracking-widest">WhatsApp Masivo</p>
            <h3 className="text-xl font-black text-black">
              📨 Blast — {stage.name}
            </h3>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-red-100 hover:text-red-600 font-black text-gray-500 transition-all">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {result ? (
            /* ── Resultado del envío ── */
            <div className="space-y-4">
              <div className={`p-4 rounded-2xl text-center ${result.sent > 0 ? "bg-green-50 border-2 border-green-200" : "bg-red-50 border-2 border-red-200"}`}>
                <p className="text-4xl mb-2">{result.sent > 0 ? "✅" : "⚠️"}</p>
                <p className="text-2xl font-black text-black">{result.sent} / {result.contactable} enviados</p>
                <p className="text-sm text-gray-500 mt-1">de los contactos con número en esta etapa</p>
              </div>
              {result.errors.length > 0 && (
                <div className="bg-red-50 rounded-xl p-3 border border-red-200">
                  <p className="text-xs font-black text-red-600 mb-2">Errores ({result.errors.length})</p>
                  {result.errors.map((e, i) => (
                    <p key={i} className="text-xs text-red-700">• {e.name}: {e.error}</p>
                  ))}
                </div>
              )}
              <button onClick={onClose}
                className="w-full py-3 rounded-xl bg-gray-800 text-white font-bold transition-colors hover:bg-gray-700">
                Cerrar
              </button>
            </div>
          ) : (
            /* ── Formulario de mensaje ── */
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                <p className="text-xs font-black text-blue-700 mb-1">💡 Variable disponible</p>
                <p className="text-xs text-blue-600">
                  Escribe <code className="bg-white px-1 py-0.5 rounded font-mono font-bold">{"{nombre}"}</code> para personalizar con el nombre del deal.
                </p>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">
                  Mensaje *
                </label>
                <textarea
                  rows={5}
                  autoFocus
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={`Hola {nombre} 👋\n\nTe escribimos desde nuestro equipo de ventas para hacerte seguimiento a tu pedido...`}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-400 outline-none text-black resize-none font-medium text-sm"
                />
                <p className="text-xs text-gray-400 mt-1 text-right">{message.length} caracteres</p>
              </div>

              <div className="flex gap-3">
                <button onClick={onClose}
                  className="flex-1 py-3 rounded-xl border-2 border-gray-200 font-bold text-gray-700 hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={handleSend}
                  disabled={!message.trim() || sending}
                  className="flex-1 py-3 rounded-xl bg-[#25D366] hover:bg-green-600 text-white font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {sending ? (
                    <><span className="animate-spin">⟳</span> Enviando...</>
                  ) : (
                    <>📨 Enviar</>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── MAIN KANBAN BOARD ─────────────────────────────────── */
export default function KanbanBoard({ board, onBack, apiUrl }: KanbanBoardProps) {
  const [stages, setStages] = useState<Stage[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)

  // NEW STAGE form
  const [showNewStage, setShowNewStage] = useState(false)
  const [stageName, setStageName] = useState("")
  const [stageColor, setStageColor] = useState(STAGE_COLORS[0])
  const [creatingStage, setCreatingStage] = useState(false)

  // NEW DEAL form (per stage)
  const [addDealStageId, setAddDealStageId] = useState<string | null>(null)
  const [dealName, setDealName] = useState("")
  const [dealPhone, setDealPhone] = useState("")
  const [dealValue, setDealValue] = useState("")

  // BLAST modal
  const [blastStage, setBlastStage] = useState<Stage | null>(null)

  // DEAL DETAIL modal
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)
  const [editNotes, setEditNotes] = useState("")
  const [editValue, setEditValue] = useState("")
  const [savingDeal, setSavingDeal] = useState(false)
  const [creatingDeal, setCreatingDeal] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [stagesRes, dealsRes] = await Promise.all([
        fetch(`${apiUrl}/crm/boards/${board.id}/stages`),
        fetch(`${apiUrl}/crm/boards/${board.id}/deals`),
      ])
      const stagesData = await stagesRes.json()
      const dealsData = await dealsRes.json()
      if (Array.isArray(stagesData)) setStages(stagesData)
      if (Array.isArray(dealsData)) setDeals(dealsData)
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [apiUrl, board.id])

  useEffect(() => { fetchData() }, [fetchData])

  // ── DRAG & DROP ──
  const onDragEnd = async (result: DropResult) => {
    const { destination, draggableId } = result
    if (!destination) return
    const newStageId = destination.droppableId
    const deal = deals.find((d) => d.id === draggableId)
    if (!deal || deal.stage_id === newStageId) return

    const now = new Date().toISOString()
    setDeals((prev) => prev.map((d) => d.id === draggableId ? { ...d, stage_id: newStageId, updated_at: now } : d))

    try {
      await fetch(`${apiUrl}/crm/deals/${draggableId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage_id: newStageId }),
      })
    } catch (e) { console.error(e); fetchData() }
  }

  // ── CREATE STAGE ──
  const handleCreateStage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stageName.trim()) return
    setCreatingStage(true)
    try {
      const res = await fetch(`${apiUrl}/crm/stages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ board_id: board.id, name: stageName, color: stageColor, order_index: stages.length }),
      })
      if (res.ok) { setStageName(""); setStageColor(STAGE_COLORS[0]); setShowNewStage(false); fetchData() }
    } finally { setCreatingStage(false) }
  }

  const handleDeleteStage = async (stageId: string) => {
    if (!confirm("¿Eliminar esta etapa y todos sus deals?")) return
    await fetch(`${apiUrl}/crm/stages/${stageId}`, { method: "DELETE" })
    fetchData()
  }

  // ── CREATE DEAL ──
  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dealName.trim() || !addDealStageId) return
    setCreatingDeal(true)
    try {
      const res = await fetch(`${apiUrl}/crm/deals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          board_id: board.id, stage_id: addDealStageId,
          name: dealName, phone_number: dealPhone,
          value: parseFloat(dealValue) || 0,
        }),
      })
      if (res.ok) {
        setDealName(""); setDealPhone(""); setDealValue("")
        setAddDealStageId(null); fetchData()
      }
    } finally { setCreatingDeal(false) }
  }

  const handleDeleteDeal = async (dealId: string) => {
    if (!confirm("¿Eliminar este deal?")) return
    await fetch(`${apiUrl}/crm/deals/${dealId}`, { method: "DELETE" })
    setSelectedDeal(null); fetchData()
  }

  const handleSaveDeal = async () => {
    if (!selectedDeal) return
    setSavingDeal(true)
    try {
      await fetch(`${apiUrl}/crm/deals/${selectedDeal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: editNotes, value: parseFloat(editValue) || 0 }),
      })
      setSelectedDeal({ ...selectedDeal, notes: editNotes, value: parseFloat(editValue) || 0 })
      fetchData()
    } finally { setSavingDeal(false) }
  }

  const openDeal = (deal: Deal) => {
    setSelectedDeal(deal); setEditNotes(deal.notes || ""); setEditValue(deal.value?.toString() || "0")
  }

  const dealsInStage = (stageId: string) => deals.filter((d) => d.stage_id === stageId)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-screen bg-gray-50">
      {/* TOP BAR */}
      <div className="flex items-center gap-4 px-5 py-3 border-b-2 border-gray-200 bg-white flex-shrink-0"
        style={{ borderTop: `4px solid ${board.color}` }}>
        <button onClick={onBack}
          className="w-9 h-9 flex items-center justify-center rounded-xl border-2 border-gray-200 text-gray-600 hover:bg-gray-100 font-bold transition-colors flex-shrink-0">
          ←
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-black text-black truncate">{board.name}</h2>
          <p className="text-xs text-gray-500 font-medium">{stages.length} etapas · {deals.length} deals</p>
        </div>
        <button onClick={() => setShowNewStage(true)}
          className="px-4 py-2 rounded-xl text-sm font-bold border-2 border-dashed border-gray-300 text-gray-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all whitespace-nowrap">
          + Etapa
        </button>
      </div>

      {/* METRICS PANEL */}
      <MetricsPanel stages={stages} deals={deals} />

      {/* KANBAN AREA */}
      <div className="flex-1 overflow-x-auto p-5">
        {stages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-4xl mb-3">🗂️</p>
            <p className="text-lg font-bold text-gray-600">No hay etapas en este tablero</p>
            <p className="text-gray-400 text-sm mt-1">Crea tu primera etapa para comenzar.</p>
            <button onClick={() => setShowNewStage(true)}
              className="mt-5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all">
              + Agregar Primera Etapa
            </button>
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-4 h-full items-start pb-4" style={{ minWidth: `${stages.length * 290}px` }}>
              {stages.map((stage) => {
                const stageDeals = dealsInStage(stage.id)
                const stageTotal = stageDeals.reduce((s, d) => s + (d.value || 0), 0)
                const frozenCount = stageDeals.filter(isFrozen).length
                const contactableCount = stageDeals.filter((d) => d.phone_number).length

                return (
                  <div key={stage.id}
                    className="flex flex-col w-[272px] flex-shrink-0 bg-white rounded-2xl border-2 border-gray-200 overflow-hidden shadow-sm"
                    style={{ borderTop: `3px solid ${stage.color}` }}>

                    {/* Column Header */}
                    <div className="px-3 py-2.5 bg-white border-b border-gray-100">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color }} />
                          <span className="font-black text-black truncate text-sm">{stage.name}</span>
                          <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                            {stageDeals.length}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {/* Blast button */}
                          <button
                            onClick={() => setBlastStage(stage)}
                            title={`Enviar WhatsApp a ${contactableCount} contacto(s)`}
                            className={`w-7 h-7 rounded-lg text-xs transition-all flex items-center justify-center font-bold
                              ${contactableCount > 0
                                ? "text-green-600 bg-green-50 hover:bg-green-500 hover:text-white"
                                : "text-gray-200 cursor-not-allowed"}`}
                            disabled={contactableCount === 0}
                          >
                            📨
                          </button>
                          <button onClick={() => handleDeleteStage(stage.id)}
                            className="w-7 h-7 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 text-xs transition-colors flex items-center justify-center">
                            ✕
                          </button>
                        </div>
                      </div>

                      {/* Stage sub-stats */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {stageTotal > 0 && (
                          <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                            ${stageTotal.toLocaleString()}
                          </span>
                        )}
                        {frozenCount > 0 && (
                          <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full animate-pulse">
                            🧊 {frozenCount} congelado{frozenCount > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Deal Cards */}
                    <Droppable droppableId={stage.id}>
                      {(provided, snapshot) => (
                        <div ref={provided.innerRef} {...provided.droppableProps}
                          className={`flex-1 p-2 space-y-2 min-h-[120px] transition-colors ${snapshot.isDraggingOver ? "bg-indigo-50/60" : ""}`}>
                          {stageDeals.map((deal, index) => {
                            const frozen = isFrozen(deal)
                            const days = daysSince(deal.updated_at || deal.created_at)
                            return (
                              <Draggable key={deal.id} draggableId={deal.id} index={index}>
                                {(prov, snap) => (
                                  <div
                                    ref={prov.innerRef}
                                    {...prov.draggableProps}
                                    {...prov.dragHandleProps}
                                    onClick={() => openDeal(deal)}
                                    className={`bg-white rounded-xl p-3 cursor-pointer transition-all group
                                      ${snap.isDragging ? "shadow-xl rotate-1 scale-105 border-2 border-indigo-400" :
                                        frozen
                                          ? "border-2 border-orange-300 hover:border-orange-400 shadow-sm hover:shadow-md"
                                          : "border-2 border-gray-100 hover:border-indigo-300 shadow-sm hover:shadow-md"
                                      }`}
                                  >
                                    {/* Frozen alert */}
                                    {frozen && (
                                      <div className="flex items-center gap-1 mb-2 bg-orange-50 rounded-lg px-2 py-1">
                                        <span className="text-[10px]">🧊</span>
                                        <span className="text-[10px] font-black text-orange-600">
                                          {days}d sin actividad
                                        </span>
                                      </div>
                                    )}

                                    <div className="flex items-start gap-2">
                                      <div className="flex-1 min-w-0">
                                        <p className="font-bold text-black text-sm truncate">{deal.name}</p>
                                        {deal.phone_number && (
                                          <p className="text-xs text-gray-500 font-mono mt-0.5 truncate">{deal.phone_number}</p>
                                        )}
                                      </div>
                                      {deal.order_id && (
                                        <span className="flex-shrink-0 text-[10px] bg-orange-100 text-orange-600 font-black px-1.5 py-0.5 rounded-md">
                                          VENTA
                                        </span>
                                      )}
                                    </div>

                                    {deal.value > 0 && (
                                      <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between items-center">
                                        <span className="text-xs font-black text-green-700 bg-green-50 px-2 py-0.5 rounded-lg">
                                          ${deal.value.toLocaleString()}
                                        </span>
                                        <span className="text-[10px] text-gray-400">
                                          {new Date(deal.created_at).toLocaleDateString()}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </Draggable>
                            )
                          })}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>

                    {/* Add Deal */}
                    <div className="p-2 border-t border-gray-100">
                      {addDealStageId === stage.id ? (
                        <form onSubmit={handleCreateDeal} className="space-y-2">
                          <input required autoFocus value={dealName} onChange={(e) => setDealName(e.target.value)}
                            placeholder="Nombre del cliente *"
                            className="w-full text-sm px-3 py-2 rounded-lg border-2 border-indigo-300 focus:border-indigo-500 outline-none text-black font-semibold" />
                          <input value={dealPhone} onChange={(e) => setDealPhone(e.target.value)}
                            placeholder="WhatsApp (opcional)"
                            className="w-full text-sm px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-indigo-400 outline-none text-black" />
                          <input type="number" min="0" value={dealValue} onChange={(e) => setDealValue(e.target.value)}
                            placeholder="Valor $ (opcional)"
                            className="w-full text-sm px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-indigo-400 outline-none text-black" />
                          <div className="flex gap-2">
                            <button type="button"
                              onClick={() => { setAddDealStageId(null); setDealName(""); setDealPhone(""); setDealValue("") }}
                              className="flex-1 py-2 text-xs font-bold rounded-lg border-2 border-gray-200 text-gray-600 hover:bg-gray-50">
                              Cancelar
                            </button>
                            <button type="submit" disabled={creatingDeal}
                              className="flex-1 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50">
                              {creatingDeal ? "..." : "Agregar"}
                            </button>
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

              {/* Add Stage CTA */}
              <button onClick={() => setShowNewStage(true)}
                className="flex-shrink-0 w-[272px] h-16 rounded-2xl border-2 border-dashed border-gray-300 text-gray-400 hover:border-indigo-400 hover:text-indigo-500 hover:bg-indigo-50/50 font-bold text-sm transition-all flex items-center justify-center gap-2">
                + Nueva Etapa
              </button>
            </div>
          </DragDropContext>
        )}
      </div>

      {/* MODAL: NUEVA ETAPA */}
      {showNewStage && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowNewStage(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-black text-black mb-5">Nueva Etapa</h3>
            <form onSubmit={handleCreateStage} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Nombre *</label>
                <input required autoFocus value={stageName} onChange={(e) => setStageName(e.target.value)}
                  placeholder="Ej: En seguimiento"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 outline-none text-black font-semibold" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {STAGE_COLORS.map((c) => (
                    <button key={c} type="button" onClick={() => setStageColor(c)}
                      className={`w-7 h-7 rounded-full transition-all ${stageColor === c ? "ring-4 ring-offset-2 ring-gray-400 scale-110" : "hover:scale-110"}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowNewStage(false)}
                  className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 font-bold text-gray-700 hover:bg-gray-50">
                  Cancelar
                </button>
                <button type="submit" disabled={creatingStage}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold disabled:opacity-50">
                  {creatingStage ? "..." : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DETALLE DEL DEAL */}
      {selectedDeal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setSelectedDeal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b-2 border-gray-100 flex-shrink-0">
              <div>
                <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">Deal</span>
                <h3 className="text-xl font-black text-black">{selectedDeal.name}</h3>
              </div>
              <button onClick={() => setSelectedDeal(null)}
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-red-100 hover:text-red-600 font-black text-gray-500 transition-all">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Frozen warning in detail */}
              {isFrozen(selectedDeal) && (
                <div className="bg-orange-50 border-2 border-orange-200 rounded-xl px-4 py-3 flex items-center gap-3">
                  <span className="text-2xl">🧊</span>
                  <div>
                    <p className="text-sm font-black text-orange-700">Deal congelado</p>
                    <p className="text-xs text-orange-500">
                      Lleva {daysSince(selectedDeal.updated_at || selectedDeal.created_at)} días sin actividad. ¡Haz follow-up!
                    </p>
                  </div>
                </div>
              )}

              {selectedDeal.phone_number && (
                <div>
                  <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">Teléfono</p>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-black font-mono">{selectedDeal.phone_number}</span>
                    <a href={`https://wa.me/${selectedDeal.phone_number.replace(/\D/g, "")}`}
                      target="_blank" rel="noopener noreferrer"
                      className="bg-[#25D366] text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-green-600 transition-colors">
                      WhatsApp
                    </a>
                  </div>
                </div>
              )}

              {selectedDeal.order_id && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
                  <p className="text-xs font-black text-orange-600 uppercase tracking-widest">🛒 Tiene venta vinculada</p>
                  <p className="text-xs text-gray-500 mt-0.5 font-mono truncate">{selectedDeal.order_id}</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">Valor ($)</label>
                <input type="number" min="0" value={editValue} onChange={(e) => setEditValue(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-indigo-500 outline-none text-black font-bold" />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">Notas Internas</label>
                <textarea rows={4} value={editNotes} onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Agrega notas sobre este cliente..."
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 outline-none text-black resize-none" />
              </div>
              <p className="text-xs text-gray-400">Creado: {new Date(selectedDeal.created_at).toLocaleString()}</p>
              {selectedDeal.updated_at && (
                <p className="text-xs text-gray-400">Actualizado: {new Date(selectedDeal.updated_at).toLocaleString()}</p>
              )}
            </div>

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
          </div>
        </div>
      )}

      {/* MODAL: BLAST WHATSAPP */}
      {blastStage && (
        <BlastModal stage={blastStage} apiUrl={apiUrl} onClose={() => setBlastStage(null)} />
      )}
    </div>
  )
}
