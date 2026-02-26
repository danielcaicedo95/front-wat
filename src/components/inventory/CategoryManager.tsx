// src/components/inventory/CategoryManager.tsx
"use client"

import { useState, useEffect } from "react"
import { getCategories, createCategory, updateCategory, deleteCategory, Category } from "@/lib/api"

export default function CategoryManager() {
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [name, setName] = useState("")
    const [parentId, setParentId] = useState("none")
    const [creating, setCreating] = useState(false)
    const [error, setError] = useState("")

    // Inline edit state
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editName, setEditName] = useState("")
    const [editParentId, setEditParentId] = useState("")
    const [editSaving, setEditSaving] = useState(false)

    const fetchCategories = async () => {
        setLoading(true)
        try { setCategories(await getCategories()) }
        catch { setError("Error al cargar categorías") }
        finally { setLoading(false) }
    }

    useEffect(() => { fetchCategories() }, [])

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return
        setCreating(true); setError("")
        try {
            await createCategory({ name: name.trim(), parent_id: parentId === "none" ? undefined : parentId })
            setName(""); setParentId("none")
            fetchCategories()
        } catch { setError("No se pudo crear la categoría") }
        finally { setCreating(false) }
    }

    const startEdit = (cat: Category) => {
        setEditingId(cat.id)
        setEditName(cat.name)
        setEditParentId(cat.parent_id || "none")
    }

    const cancelEdit = () => { setEditingId(null); setEditName(""); setEditParentId("") }

    const saveEdit = async (id: string) => {
        if (!editName.trim()) return
        setEditSaving(true)
        try {
            await updateCategory(id, {
                name: editName.trim(),
                parent_id: editParentId === "none" ? undefined : editParentId,
            })
            cancelEdit()
            fetchCategories()
        } catch { setError("No se pudo actualizar la categoría") }
        finally { setEditSaving(false) }
    }

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`¿Eliminar "${name}"? Los productos en esta categoría quedarán sin categoría.`)) return
        try { await deleteCategory(id); fetchCategories() }
        catch { setError("No se pudo eliminar la categoría") }
    }

    const mainCategories = categories.filter(c => !c.parent_id)
    const getSubcategories = (pid: string) => categories.filter(c => c.parent_id === pid)
    const otherMainCategories = (currentId: string) => mainCategories.filter(c => c.id !== currentId)

    const InputClass = "px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008060]/30 focus:border-[#008060] transition-all bg-white"

    return (
        <div className="space-y-6 max-w-3xl">
            {/* Create Form */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-base font-semibold text-gray-800">Nueva Categoría</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Organiza tus productos en categorías y subcategorías</p>
                </div>
                <form onSubmit={handleCreate} className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className={`w-full ${InputClass}`}
                                placeholder="Ej: Bebidas, Licores..."
                                required
                            />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Categoría Padre <span className="font-normal text-gray-400">(opcional)</span>
                            </label>
                            <select
                                value={parentId}
                                onChange={e => setParentId(e.target.value)}
                                className={`w-full ${InputClass} cursor-pointer`}
                            >
                                <option value="none">— Categoría principal —</option>
                                {mainCategories.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button
                                type="submit"
                                disabled={creating || !name.trim()}
                                className="w-full py-2.5 px-4 bg-[#008060] hover:bg-[#006e52] disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                {creating ? "Creando..." : "Crear"}
                            </button>
                        </div>
                    </div>
                    {error && (
                        <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
                    )}
                </form>
            </div>

            {/* Category Tree */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-semibold text-gray-800">Estructura del Catálogo</h2>
                        <p className="text-sm text-gray-500 mt-0.5">{categories.length} categorías en total</p>
                    </div>
                    {!loading && (
                        <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
                            {mainCategories.length} principales · {categories.length - mainCategories.length} subcategorías
                        </span>
                    )}
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="w-6 h-6 border-2 border-[#008060] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : categories.length === 0 ? (
                    <div className="flex flex-col items-center py-16 text-gray-400">
                        <div className="text-4xl mb-3">🗂️</div>
                        <p className="font-medium text-gray-600">Sin categorías</p>
                        <p className="text-sm mt-1 text-gray-400">Crea la primera categoría para organizar tu catálogo</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {mainCategories.map(mainCat => {
                            const subs = getSubcategories(mainCat.id)
                            const isEditing = editingId === mainCat.id
                            return (
                                <div key={mainCat.id}>
                                    {/* Main Category Row */}
                                    <div className={`flex items-center justify-between px-6 py-4 group transition-colors ${isEditing ? "bg-[#008060]/5 border-l-2 border-[#008060]" : "hover:bg-gray-50/60"}`}>
                                        {isEditing ? (
                                            /* Edit mode */
                                            <div className="flex items-center gap-3 flex-1">
                                                <input
                                                    autoFocus
                                                    value={editName}
                                                    onChange={e => setEditName(e.target.value)}
                                                    className={`flex-1 max-w-xs ${InputClass}`}
                                                    placeholder="Nombre de la categoría"
                                                />
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => saveEdit(mainCat.id)}
                                                        disabled={editSaving}
                                                        className="px-3 py-1.5 text-xs font-semibold text-white bg-[#008060] hover:bg-[#006e52] disabled:bg-gray-300 rounded-lg transition-colors"
                                                    >
                                                        {editSaving ? "..." : "Guardar"}
                                                    </button>
                                                    <button
                                                        onClick={cancelEdit}
                                                        className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                                    >
                                                        Cancelar
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            /* View mode */
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-[#008060]/10 flex items-center justify-center text-[#008060] font-bold text-sm flex-shrink-0">
                                                    {mainCat.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-800">{mainCat.name}</p>
                                                    {subs.length > 0 && (
                                                        <p className="text-xs text-gray-400">{subs.length} subcategoría{subs.length > 1 ? "s" : ""}</p>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {!isEditing && (
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => startEdit(mainCat)}
                                                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#008060] bg-[#008060]/10 hover:bg-[#008060]/20 rounded-lg transition-colors"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                    Editar
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(mainCat.id, mainCat.name)}
                                                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                    Eliminar
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Subcategories */}
                                    {subs.length > 0 && (
                                        <div className="bg-gray-50/40">
                                            {subs.map((sub, idx) => {
                                                const isEditingSub = editingId === sub.id
                                                return (
                                                    <div
                                                        key={sub.id}
                                                        className={`flex items-center justify-between pl-16 pr-6 py-3 group transition-colors ${isEditingSub ? "bg-[#008060]/5 border-l-2 border-[#008060]" : "hover:bg-gray-50"
                                                            } ${idx !== subs.length - 1 ? "border-b border-gray-100/80" : ""}`}
                                                    >
                                                        {isEditingSub ? (
                                                            <div className="flex items-center gap-3 flex-1">
                                                                <input
                                                                    autoFocus
                                                                    value={editName}
                                                                    onChange={e => setEditName(e.target.value)}
                                                                    className={`flex-1 max-w-xs ${InputClass}`}
                                                                />
                                                                <select
                                                                    value={editParentId}
                                                                    onChange={e => setEditParentId(e.target.value)}
                                                                    className={`${InputClass} text-xs`}
                                                                >
                                                                    <option value="none">Sin padre</option>
                                                                    {otherMainCategories(sub.id).map(c => (
                                                                        <option key={c.id} value={c.id}>{c.name}</option>
                                                                    ))}
                                                                </select>
                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        onClick={() => saveEdit(sub.id)}
                                                                        disabled={editSaving}
                                                                        className="px-3 py-1.5 text-xs font-semibold text-white bg-[#008060] hover:bg-[#006e52] disabled:bg-gray-300 rounded-lg"
                                                                    >
                                                                        {editSaving ? "..." : "Guardar"}
                                                                    </button>
                                                                    <button onClick={cancelEdit} className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg">
                                                                        Cancelar
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div className="flex items-center gap-2.5 relative">
                                                                    <div className="absolute -left-7 top-1/2 w-5 h-px bg-gray-300" />
                                                                    <div className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center text-gray-400 text-xs flex-shrink-0">↳</div>
                                                                    <span className="text-sm font-medium text-gray-700">{sub.name}</span>
                                                                    <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Sub</span>
                                                                </div>
                                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button
                                                                        onClick={() => startEdit(sub)}
                                                                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#008060] bg-[#008060]/10 hover:bg-[#008060]/20 rounded-lg transition-colors"
                                                                    >
                                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                        </svg>
                                                                        Editar
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDelete(sub.id, sub.name)}
                                                                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-500 bg-white hover:bg-red-50 border border-red-100 rounded-lg transition-all shadow-sm"
                                                                    >
                                                                        Eliminar
                                                                    </button>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
