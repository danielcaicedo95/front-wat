"use client"
import { useState, useEffect } from "react"
import { fetchWithAuth, API_URL } from "@/lib/fetchWithAuth"

type Contact = {
  id: string
  name: string
  phone_number?: string
  email?: string
  notes?: string
  tags?: string[]
  created_at: string
  updated_at?: string
  deals?: { count: number }[] // from Supabase count embed
}

type ContactDeal = {
  id: string
  name: string
  value: number
  created_at: string
  stage?: { name: string; color: string }
  board?: { name: string; color: string }
}

type ContactDetail = Contact & { deals: ContactDeal[] }


export default function ContactsDirectory() {
  const [contacts, setContacts]           = useState<Contact[]>([])
  const [loading, setLoading]             = useState(true)
  const [search, setSearch]               = useState("")
  const [selected, setSelected]           = useState<ContactDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [editMode, setEditMode]           = useState(false)
  const [editName, setEditName]           = useState("")
  const [editNotes, setEditNotes]         = useState("")
  const [editEmail, setEditEmail]         = useState("")
  const [saving, setSaving]               = useState(false)

  const fetchContacts = async () => {
    setLoading(true)
    try {
      const res  = await fetchWithAuth(`${API_URL}/crm/contacts`)
      const data = await res.json()
      if (Array.isArray(data)) setContacts(data)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  useEffect(() => { fetchContacts() }, [])

  const openContact = async (id: string) => {
    setLoadingDetail(true)
    setSelected(null)
    setEditMode(false)
    try {
      const res  = await fetchWithAuth(`${API_URL}/crm/contacts/${id}`)
      const data = await res.json()
      setSelected(data)
      setEditName(data.name || "")
      setEditEmail(data.email || "")
      setEditNotes(data.notes || "")
    } catch { alert("Error cargando contacto.") }
    setLoadingDetail(false)
  }

  const handleSave = async () => {
    if (!selected) return
    setSaving(true)
    try {
      await fetchWithAuth(`${API_URL}/crm/contacts/${selected.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, email: editEmail, notes: editNotes }),
      })
      setSelected({ ...selected, name: editName, email: editEmail, notes: editNotes })
      setEditMode(false)
      fetchContacts()
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!selected) return
    if (!confirm(`¿Eliminar a ${selected.name} del directorio? Los deals quedarán sin contacto vinculado.`)) return
    await fetch(`${API_URL}/crm/contacts/${selected.id}`, { method: "DELETE" })
    setSelected(null)
    fetchContacts()
  }

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone_number || "").includes(search) ||
    (c.email || "").toLowerCase().includes(search.toLowerCase())
  )

  const dealCount = (c: Contact) => c.deals?.[0]?.count ?? 0

  return (
    <div className="flex h-full min-h-screen">
      {/* LEFT: Contact list */}
      <div className="flex flex-col w-full max-w-sm flex-shrink-0 border-r-2 border-gray-200 bg-white h-screen sticky top-0">
        {/* Search header */}
        <div className="p-4 border-b-2 border-gray-100">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
            Directorio · {contacts.length} contactos
          </p>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Buscar nombre, tel, email..."
            className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-indigo-400 outline-none text-black font-medium text-sm"
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <p className="text-3xl mb-2">📭</p>
              <p className="font-bold text-sm">
                {search ? "Sin resultados" : "No hay contactos aún"}
              </p>
              {!search && <p className="text-xs mt-1">Se crean automáticamente al agregar deals con número de teléfono.</p>}
            </div>
          ) : (
            filtered.map(c => (
              <button
                key={c.id}
                onClick={() => openContact(c.id)}
                className={`w-full text-left px-4 py-3.5 hover:bg-gray-50 transition-colors flex items-center gap-3
                  ${selected?.id === c.id ? "bg-indigo-50 border-r-2 border-indigo-500" : ""}`}
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-black text-lg flex-shrink-0">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-black text-sm truncate">{c.name}</p>
                  {c.phone_number && <p className="text-xs text-gray-500 font-mono truncate">{c.phone_number}</p>}
                  {!c.phone_number && c.email && <p className="text-xs text-gray-500 truncate">{c.email}</p>}
                </div>
                {dealCount(c) > 0 && (
                  <span className="flex-shrink-0 text-[10px] font-black bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                    {dealCount(c)} deal{dealCount(c) > 1 ? "s" : ""}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* RIGHT: Contact detail */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {loadingDetail ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
          </div>
        ) : !selected ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 p-8">
            <p className="text-6xl mb-4">📇</p>
            <p className="text-xl font-bold text-gray-600">Selecciona un contacto</p>
            <p className="text-sm mt-1">Los contactos se crean automáticamente desde el Pipeline cuando añades un deal con número de teléfono.</p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto p-6 space-y-6">
            {/* Contact header card */}
            <div className="bg-white rounded-2xl border-2 border-gray-100 shadow-sm overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-indigo-500 to-purple-500" />
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-black text-3xl shadow-md">
                      {selected.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      {editMode ? (
                        <input value={editName} onChange={e => setEditName(e.target.value)}
                          className="text-2xl font-black text-black border-b-2 border-indigo-400 outline-none bg-transparent w-full" />
                      ) : (
                        <h2 className="text-2xl font-black text-black">{selected.name}</h2>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        Registrado: {new Date(selected.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {editMode ? (
                      <>
                        <button onClick={() => setEditMode(false)}
                          className="px-3 py-2 rounded-xl text-sm font-bold border-2 border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                          Cancelar
                        </button>
                        <button onClick={handleSave} disabled={saving}
                          className="px-4 py-2 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50">
                          {saving ? "..." : "💾 Guardar"}
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => setEditMode(true)}
                          className="px-3 py-2 rounded-xl text-sm font-bold border-2 border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                          ✏️ Editar
                        </button>
                        <button onClick={handleDelete}
                          className="px-3 py-2 rounded-xl text-sm font-bold bg-red-50 text-red-500 border-2 border-red-100 hover:bg-red-100 transition-colors">
                          🗑️
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Contact details */}
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {selected.phone_number && (
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">WhatsApp</p>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-black font-mono text-sm">{selected.phone_number}</span>
                        <a href={`https://wa.me/${selected.phone_number.replace(/\D/g, "")}`}
                          target="_blank" rel="noopener noreferrer"
                          className="bg-[#25D366] text-white text-[10px] font-black px-2 py-1 rounded-lg hover:bg-green-600 transition-colors">
                          WA
                        </a>
                      </div>
                    </div>
                  )}
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Email</p>
                    {editMode ? (
                      <input value={editEmail} onChange={e => setEditEmail(e.target.value)}
                        placeholder="email@ejemplo.com"
                        className="w-full font-medium text-black text-sm border-b border-gray-300 outline-none bg-transparent" />
                    ) : (
                      <span className="font-medium text-black text-sm">{selected.email || <span className="text-gray-400 italic">Sin email</span>}</span>
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div className="mt-4">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Notas</p>
                  {editMode ? (
                    <textarea rows={3} value={editNotes} onChange={e => setEditNotes(e.target.value)}
                      placeholder="Notas sobre este contacto..."
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-400 outline-none text-black resize-none text-sm" />
                  ) : (
                    <p className="text-sm text-gray-600 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100 min-h-[56px]">
                      {selected.notes || <span className="text-gray-400 italic">Sin notas</span>}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Deals across boards */}
            <div>
              <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3 px-1">
                Deals vinculados ({selected.deals?.length || 0})
              </p>
              {!selected.deals || selected.deals.length === 0 ? (
                <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center text-gray-400">
                  <p className="font-bold">Sin deals vinculados</p>
                  <p className="text-xs mt-1">Los deals se vinculan automáticamente por número de teléfono.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selected.deals.map((deal: ContactDeal) => (
                    <div key={deal.id}
                      className="bg-white rounded-2xl border-2 border-gray-100 p-4 shadow-sm flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-black truncate">{deal.name}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {deal.board && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-white"
                              style={{ backgroundColor: deal.board.color }}>
                              {deal.board.name}
                            </span>
                          )}
                          {deal.stage && (
                            <span className="text-[10px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full"
                              style={{ borderLeft: `3px solid ${deal.stage.color}` }}>
                              {deal.stage.name}
                            </span>
                          )}
                          <span className="text-[10px] text-gray-400">{new Date(deal.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      {deal.value > 0 && (
                        <span className="flex-shrink-0 text-sm font-black text-green-700 bg-green-50 px-3 py-1.5 rounded-xl">
                          ${deal.value.toLocaleString()}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
