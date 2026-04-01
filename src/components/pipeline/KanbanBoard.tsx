"use client"
import { useState, useEffect, useCallback } from "react"
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd"

type Board = { id: string; name: string; color: string }
type Stage = { id: string; board_id: string; name: string; order_index: number; color: string }
type Deal = {
  id: string; board_id: string; stage_id: string; order_id?: string
  name: string; phone_number?: string; email?: string; notes?: string; value: number
  created_at: string
}

type KanbanBoardProps = {
  board: Board
  onBack: () => void
  apiUrl: string
}

const STAGE_COLORS = [
  "#9ca3af", "#6366f1", "#0ea5e9", "#10b981",
  "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899",
]

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
  const [dealNotes, setDealNotes] = useState("")
  const [creatingDeal, setCreatingDeal] = useState(false)

  // DEAL DETAIL modal
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)
  const [editNotes, setEditNotes] = useState("")
  const [editValue, setEditValue] = useState("")
  const [savingDeal, setSavingDeal] = useState(false)

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

  // ---- DRAG & DROP ----
  const onDragEnd = async (result: DropResult) => {
    const { destination, draggableId } = result
    if (!destination) return
    const newStageId = destination.droppableId
    const deal = deals.find((d) => d.id === draggableId)
    if (!deal || deal.stage_id === newStageId) return

    // Optimistic update
    setDeals((prev) => prev.map((d) => d.id === draggableId ? { ...d, stage_id: newStageId } : d))

    // Persist
    try {
      await fetch(`${apiUrl}/crm/deals/${draggableId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage_id: newStageId }),
      })
    } catch (e) {
      console.error(e)
      fetchData() // Revert on error
    }
  }

  // ---- CREATE STAGE ----
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

  // ---- CREATE DEAL ----
  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dealName.trim() || !addDealStageId) return
    setCreatingDeal(true)
    try {
      const res = await fetch(`${apiUrl}/crm/deals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          board_id: board.id,
          stage_id: addDealStageId,
          name: dealName,
          phone_number: dealPhone,
          value: parseFloat(dealValue) || 0,
          notes: dealNotes,
        }),
      })
      if (res.ok) {
        setDealName(""); setDealPhone(""); setDealValue(""); setDealNotes("")
        setAddDealStageId(null)
        fetchData()
      }
    } finally { setCreatingDeal(false) }
  }

  const handleDeleteDeal = async (dealId: string) => {
    if (!confirm("¿Eliminar este deal?")) return
    await fetch(`${apiUrl}/crm/deals/${dealId}`, { method: "DELETE" })
    setSelectedDeal(null)
    fetchData()
  }

  // ---- SAVE DEAL NOTES ----
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
    setSelectedDeal(deal)
    setEditNotes(deal.notes || "")
    setEditValue(deal.value?.toString() || "0")
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
      <div
        className="flex items-center gap-4 px-5 py-3 border-b-2 border-gray-200 bg-white flex-shrink-0"
        style={{ borderTop: `4px solid ${board.color}` }}
      >
        <button
          onClick={onBack}
          className="w-9 h-9 flex items-center justify-center rounded-xl border-2 border-gray-200 text-gray-600 hover:bg-gray-100 font-bold transition-colors flex-shrink-0"
          title="Volver"
        >
          ←
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-black text-black truncate">{board.name}</h2>
          <p className="text-xs text-gray-500 font-medium">{stages.length} etapas · {deals.length} deals</p>
        </div>
        <button
          onClick={() => setShowNewStage(true)}
          className="px-4 py-2 rounded-xl text-sm font-bold border-2 border-dashed border-gray-300 text-gray-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all whitespace-nowrap"
        >
          + Etapa
        </button>
      </div>

      {/* KANBAN AREA */}
      <div className="flex-1 overflow-x-auto p-5">
        {stages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-4xl mb-3">🗂️</p>
            <p className="text-lg font-bold text-gray-600">No hay etapas en este tablero</p>
            <p className="text-gray-400 text-sm mt-1">Crea tu primera etapa para comenzar.</p>
            <button
              onClick={() => setShowNewStage(true)}
              className="mt-5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all"
            >
              + Agregar Primera Etapa
            </button>
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-4 h-full items-start pb-4" style={{ minWidth: `${stages.length * 290}px` }}>
              {stages.map((stage) => {
                const stageDeals = dealsInStage(stage.id)
                const stageTotal = stageDeals.reduce((s, d) => s + (d.value || 0), 0)
                return (
                  <div
                    key={stage.id}
                    className="flex flex-col w-[272px] flex-shrink-0 bg-white rounded-2xl border-2 border-gray-200 overflow-hidden shadow-sm"
                    style={{ borderTop: `3px solid ${stage.color}` }}
                  >
                    {/* Column Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: stage.color }}
                        />
                        <span className="font-black text-black truncate text-sm">{stage.name}</span>
                        <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                          {stageDeals.length}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteStage(stage.id)}
                        className="w-6 h-6 rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50 text-xs transition-colors flex-shrink-0 flex items-center justify-center"
                        title="Eliminar etapa"
                      >
                        ✕
                      </button>
                    </div>

                    {stageTotal > 0 && (
                      <div className="px-4 py-1.5 bg-gray-50 border-b border-gray-100">
                        <span className="text-xs font-bold text-gray-500">
                          Total: <span className="text-green-600">${stageTotal.toLocaleString()}</span>
                        </span>
                      </div>
                    )}

                    {/* Deal Cards */}
                    <Droppable droppableId={stage.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`flex-1 p-2 space-y-2 min-h-[100px] transition-colors ${snapshot.isDraggingOver ? "bg-indigo-50/60" : ""}`}
                        >
                          {stageDeals.map((deal, index) => (
                            <Draggable key={deal.id} draggableId={deal.id} index={index}>
                              {(prov, snap) => (
                                <div
                                  ref={prov.innerRef}
                                  {...prov.draggableProps}
                                  {...prov.dragHandleProps}
                                  onClick={() => openDeal(deal)}
                                  className={`bg-white border-2 border-gray-100 rounded-xl p-3 cursor-pointer transition-all hover:border-indigo-300 hover:shadow-md group
                                    ${snap.isDragging ? "shadow-xl border-indigo-400 rotate-1 scale-105" : ""}`}
                                >
                                  <div className="flex items-start gap-2">
                                    <div className="flex-1 min-w-0">
                                      <p className="font-bold text-black text-sm truncate">{deal.name}</p>
                                      {deal.phone_number && (
                                        <p className="text-xs text-gray-500 font-mono mt-0.5 truncate">{deal.phone_number}</p>
                                      )}
                                    </div>
                                    {deal.order_id && (
                                      <span className="flex-shrink-0 text-[10px] bg-orange-100 text-orange-600 font-black px-1.5 py-0.5 rounded-md" title="Tiene venta vinculada">
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
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>

                    {/* Add Deal Button */}
                    <div className="p-2 border-t border-gray-100">
                      {addDealStageId === stage.id ? (
                        <form onSubmit={handleCreateDeal} className="space-y-2">
                          <input
                            required autoFocus
                            value={dealName}
                            onChange={(e) => setDealName(e.target.value)}
                            placeholder="Nombre del cliente *"
                            className="w-full text-sm px-3 py-2 rounded-lg border-2 border-indigo-300 focus:border-indigo-500 outline-none text-black font-semibold"
                          />
                          <input
                            value={dealPhone}
                            onChange={(e) => setDealPhone(e.target.value)}
                            placeholder="Teléfono (opcional)"
                            className="w-full text-sm px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-indigo-400 outline-none text-black"
                          />
                          <input
                            type="number" min="0" value={dealValue}
                            onChange={(e) => setDealValue(e.target.value)}
                            placeholder="Valor $ (opcional)"
                            className="w-full text-sm px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-indigo-400 outline-none text-black"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => { setAddDealStageId(null); setDealName(""); setDealPhone(""); setDealValue("") }}
                              className="flex-1 py-2 text-xs font-bold rounded-lg border-2 border-gray-200 text-gray-600 hover:bg-gray-50"
                            >
                              Cancelar
                            </button>
                            <button
                              type="submit"
                              disabled={creatingDeal}
                              className="flex-1 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
                            >
                              {creatingDeal ? "..." : "Agregar"}
                            </button>
                          </div>
                        </form>
                      ) : (
                        <button
                          onClick={() => setAddDealStageId(stage.id)}
                          className="w-full py-2 text-xs font-bold text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center justify-center gap-1"
                        >
                          <span className="text-base leading-none">+</span> Agregar Deal
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Add Stage CTA at end */}
              <button
                onClick={() => setShowNewStage(true)}
                className="flex-shrink-0 w-[272px] h-16 rounded-2xl border-2 border-dashed border-gray-300 text-gray-400 hover:border-indigo-400 hover:text-indigo-500 hover:bg-indigo-50/50 font-bold text-sm transition-all flex items-center justify-center gap-2"
              >
                + Nueva Etapa
              </button>
            </div>
          </DragDropContext>
        )}
      </div>

      {/* MODAL: NUEVA ETAPA */}
      {showNewStage && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowNewStage(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-black text-black mb-5">Nueva Etapa</h3>
            <form onSubmit={handleCreateStage} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                  Nombre *
                </label>
                <input
                  required autoFocus
                  value={stageName}
                  onChange={(e) => setStageName(e.target.value)}
                  placeholder="Ej: En seguimiento"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 outline-none text-black font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Color
                </label>
                <div className="flex gap-2 flex-wrap">
                  {STAGE_COLORS.map((c) => (
                    <button
                      key={c} type="button"
                      onClick={() => setStageColor(c)}
                      className={`w-7 h-7 rounded-full transition-all ${stageColor === c ? "ring-4 ring-offset-2 ring-gray-400 scale-110" : "hover:scale-110"}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowNewStage(false)}
                  className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 font-bold text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingStage}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold disabled:opacity-50"
                >
                  {creatingStage ? "..." : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DETALLE DEL DEAL */}
      {selectedDeal && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setSelectedDeal(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b-2 border-gray-100 flex-shrink-0">
              <div>
                <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">Deal</span>
                <h3 className="text-xl font-black text-black">{selectedDeal.name}</h3>
              </div>
              <button
                onClick={() => setSelectedDeal(null)}
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-red-100 hover:text-red-600 font-black text-gray-500 transition-all"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {selectedDeal.phone_number && (
                <div>
                  <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">Teléfono</p>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-black font-mono">{selectedDeal.phone_number}</span>
                    <a
                      href={`https://wa.me/${selectedDeal.phone_number.replace(/\D/g, "")}`}
                      target="_blank" rel="noopener noreferrer"
                      className="bg-[#25D366] text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-green-600 transition-colors"
                    >
                      WhatsApp
                    </a>
                  </div>
                </div>
              )}
              {selectedDeal.order_id && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
                  <p className="text-xs font-black text-orange-600 uppercase tracking-widest">
                    🛒 Tiene venta vinculada
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 font-mono truncate">{selectedDeal.order_id}</p>
                </div>
              )}
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">
                  Valor ($)
                </label>
                <input
                  type="number" min="0"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-indigo-500 outline-none text-black font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">
                  Notas Internas
                </label>
                <textarea
                  rows={4}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Agrega notas sobre este cliente..."
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 outline-none text-black resize-none"
                />
              </div>
              <p className="text-xs text-gray-400">
                Creado: {new Date(selectedDeal.created_at).toLocaleString()}
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-t-2 border-gray-100 flex-shrink-0">
              <button
                onClick={() => handleDeleteDeal(selectedDeal.id)}
                className="px-4 py-2.5 rounded-xl text-sm font-bold bg-red-50 text-red-600 hover:bg-red-100 border-2 border-red-100 transition-colors"
              >
                🗑️ Eliminar
              </button>
              <button
                onClick={handleSaveDeal}
                disabled={savingDeal}
                className="px-6 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50"
              >
                {savingDeal ? "Guardando..." : "💾 Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
