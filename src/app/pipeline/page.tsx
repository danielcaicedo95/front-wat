"use client"
import { useState, useEffect } from "react"
import KanbanBoard from "@/components/pipeline/KanbanBoard"
import ContactsDirectory from "./contacts/page"
import { fetchWithAuth, API_URL } from "@/lib/fetchWithAuth"

type Board = {
  id: string
  name: string
  description?: string
  color: string
  created_at: string
}

const BOARD_COLORS = [
  "#4f46e5", "#0ea5e9", "#10b981", "#f59e0b",
  "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6",
]

export default function PipelinePage() {
  const [tab, setTab]                     = useState<"boards" | "contacts">("boards")
  const [boards, setBoards]               = useState<Board[]>([])
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null)
  const [showNewBoard, setShowNewBoard]   = useState(false)
  const [newName, setNewName]             = useState("")
  const [newDesc, setNewDesc]             = useState("")
  const [newColor, setNewColor]           = useState(BOARD_COLORS[0])
  const [creating, setCreating]           = useState(false)
  const [deletingId, setDeletingId]       = useState<string | null>(null)


  useEffect(() => { fetchBoards() }, [])

  const fetchBoards = async () => {
    try {
      const res = await fetchWithAuth(`${API_URL}/crm/boards`)
      const data = await res.json()
      if (Array.isArray(data)) setBoards(data)
    } catch (e) { console.error(e) }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    try {
      const res = await fetchWithAuth(`${API_URL}/crm/boards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, description: newDesc, color: newColor }),
      })
      if (res.ok) {
        setNewName(""); setNewDesc(""); setNewColor(BOARD_COLORS[0])
        setShowNewBoard(false)
        fetchBoards()
      }
    } finally { setCreating(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este tablero y todos sus datos?")) return
    setDeletingId(id)
    try {
      await fetchWithAuth(`${API_URL}/crm/boards/${id}`, { method: "DELETE" })
      if (selectedBoard?.id === id) setSelectedBoard(null)
      fetchBoards()
    } finally { setDeletingId(null) }
  }

  // ---- Si hay tablero seleccionado, mostrar Kanban ----
  if (selectedBoard) {
    return (
      <KanbanBoard
        board={selectedBoard}
        onBack={() => { setSelectedBoard(null); fetchBoards() }}
        apiUrl={API_URL}
      />
    )
  }

  // ---- Vista de lista de tableros ----
  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 border-b-2 border-gray-200 pb-5 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-black border-l-4 border-indigo-500 pl-3">
            Pipeline CRM
          </h2>
          <p className="text-gray-500 mt-1 font-medium text-sm">
            Gestiona tus campañas y el seguimiento de clientes.
          </p>
        </div>
        {tab === "boards" && (
          <button
            onClick={() => setShowNewBoard(true)}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-xl shadow transition-all whitespace-nowrap"
          >
            + Nueva Campaña
          </button>
        )}
      </div>

      {/* TABS */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-2xl w-fit mb-8">
        {(["boards", "contacts"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-xl text-sm font-black transition-all
              ${tab === t ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            {t === "boards" ? "📋 Tableros" : "📇 Contactos"}
          </button>
        ))}
      </div>

      {/* CONTACTS VIEW */}
      {tab === "contacts" && <ContactsDirectory />}

      {/* MODAL: CREAR TABLERO */}
      {showNewBoard && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowNewBoard(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-black text-black mb-5">Nueva Campaña</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                  Nombre *
                </label>
                <input
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ej: Campaña Meta Q2"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 outline-none text-black font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                  Descripción (opcional)
                </label>
                <input
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Descripción rápida"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 outline-none text-black"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Color del Tablero
                </label>
                <div className="flex gap-2 flex-wrap">
                  {BOARD_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewColor(c)}
                      className={`w-8 h-8 rounded-full transition-all ${newColor === c ? "ring-4 ring-offset-2 ring-gray-400 scale-110" : "hover:scale-110"}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewBoard(false)}
                  className="flex-1 py-3 rounded-xl border-2 border-gray-200 font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors disabled:opacity-50"
                >
                  {creating ? "Creando..." : "Crear Tablero"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GRID DE TABLEROS */}
      {tab === "boards" && (boards.length === 0 ? (
        <div className="bg-gray-50 rounded-2xl p-12 text-center border-2 border-dashed border-gray-200">
          <p className="text-5xl mb-4">📋</p>
          <p className="text-xl font-bold text-gray-700">No tienes campañas aún</p>
          <p className="text-gray-400 mt-1">Crea tu primera campaña para empezar a organizar tus clientes.</p>
          <button
            onClick={() => setShowNewBoard(true)}
            className="mt-6 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow transition-all"
          >
            + Crear Primera Campaña
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {boards.map((board) => (
            <div
              key={board.id}
              className="bg-white border-2 border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group flex flex-col"
            >
              {/* Color bar */}
              <div className="h-2 w-full" style={{ backgroundColor: board.color }} />
              <div className="p-5 flex flex-col flex-1">
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-sm flex-shrink-0"
                    style={{ backgroundColor: board.color }}
                  >
                    {board.name.charAt(0).toUpperCase()}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(board.id) }}
                    disabled={deletingId === board.id}
                    className="w-8 h-8 rounded-full bg-red-50 text-red-400 font-bold text-sm lg:opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white disabled:opacity-50"
                    title="Eliminar tablero"
                  >
                    ✕
                  </button>
                </div>
                <p className="font-black text-xl text-black truncate">{board.name}</p>
                {board.description && (
                  <p className="text-gray-500 text-sm mt-1 line-clamp-2">{board.description}</p>
                )}
                <p className="text-xs text-gray-400 font-medium mt-2">
                  {new Date(board.created_at).toLocaleDateString()}
                </p>
                <button
                  onClick={() => setSelectedBoard(board)}
                  className="mt-4 w-full py-2.5 rounded-xl text-sm font-bold border-2 transition-all"
                  style={{ borderColor: board.color, color: board.color }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget
                    el.style.backgroundColor = board.color
                    el.style.color = "#fff"
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget
                    el.style.backgroundColor = ""
                    el.style.color = board.color
                  }}
                >
                  Abrir Tablero →
                </button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
