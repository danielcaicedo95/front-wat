// src/components/inventory/EditProductDrawer.tsx
"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import {
    updateProduct, updateVariant, deleteVariant,
    addProductImage, deleteProductImage,
    addVariantToProduct, setVariantImage,
    getCategories, Category, Product, Variant, ImageRecord
} from "@/lib/api"

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExistingVariantDraft {
    id: string
    optionKey: string
    optionValue: string
    price: string
    stock: string
    // image management
    currentImageId?: string       // existing image record id
    currentImageUrl?: string      // existing image URL
    newImageFile?: File           // new file staged for upload
    deleteImage?: boolean         // flag to delete current image
    markedForDelete?: boolean     // flag to delete the whole variant
}

interface NewVariantDraft {
    localId: number
    optionKey: string
    optionValue: string
    price: string
    stock: string
    imageFile?: File
}

type Tab = "info" | "images" | "variants"

interface Props {
    product: Product & { product_variants?: Variant[]; product_images?: ImageRecord[] }
    onClose: () => void
    onSaved: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EditProductDrawer({ product, onClose, onSaved }: Props) {
    /* ── Basic fields ── */
    const [name, setName] = useState(product.name)
    const [description, setDescription] = useState(product.description || "")
    const [price, setPrice] = useState(String(product.price || ""))
    const [stock, setStock] = useState(String(product.stock ?? ""))
    const [categoryId, setCategoryId] = useState(product.category?.id || "")
    const [categories, setCategories] = useState<Category[]>([])

    /* ── Tab ── */
    const [activeTab, setActiveTab] = useState<Tab>("info")

    /* ── General images ── */
    const allImages: ImageRecord[] = (product as any).product_images || []
    const generalImages = allImages.filter(img => !img.variant_id)
    const [deletedImageIds, setDeletedImageIds] = useState<string[]>([])
    const [newGeneralImages, setNewGeneralImages] = useState<File[]>([])
    const generalFileRef = useRef<HTMLInputElement>(null)

    /* ── Existing variants ── */
    const rawVariants: Variant[] = (product as any).product_variants || []

    const buildExistingDraft = useCallback((v: Variant): ExistingVariantDraft => {
        const opts = Object.entries(v.options || {})
        const varImages = allImages.filter(img => img.variant_id === v.id)
        const img = varImages[0]
        return {
            id: v.id,
            optionKey: opts[0]?.[0] || "",
            optionValue: opts[0]?.[1] || "",
            price: String(v.price || ""),
            stock: String(v.stock ?? ""),
            currentImageId: img?.id,
            currentImageUrl: img?.url,
            newImageFile: undefined,
            deleteImage: false,
            markedForDelete: false,
        }
    }, [allImages])

    const [existingDrafts, setExistingDrafts] = useState<ExistingVariantDraft[]>(
        () => rawVariants.map(buildExistingDraft)
    )

    /* ── New variants ── */
    const [newVariantDrafts, setNewVariantDrafts] = useState<NewVariantDraft[]>([])

    /* ── Save state ── */
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState("")

    useEffect(() => {
        getCategories().then(setCategories).catch(console.error)
    }, [])

    const mainCategories = categories.filter(c => !c.parent_id)
    const formatCOP = (v: number | string) =>
        new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(Number(v) || 0)

    // ── Derived counts ──
    const liveVariants = existingDrafts.filter(d => !d.markedForDelete)
    const totalVariants = liveVariants.length + newVariantDrafts.length
    const visibleGeneralImages = generalImages.filter(img => !deletedImageIds.includes(img.id))
    const totalImages = visibleGeneralImages.length + newGeneralImages.length

    // ── Existing variant helpers ──
    const patchDraft = (id: string, patch: Partial<ExistingVariantDraft>) => {
        setExistingDrafts(prev => prev.map(d => d.id === id ? { ...d, ...patch } : d))
    }

    // ── New variant helpers ──
    const addNewVariant = () => {
        setNewVariantDrafts(prev => [...prev, { localId: Date.now(), optionKey: "", optionValue: "", price: "", stock: "" }])
        setActiveTab("variants")
    }

    const patchNew = (localId: number, patch: Partial<NewVariantDraft>) => {
        setNewVariantDrafts(prev => prev.map(d => d.localId === localId ? { ...d, ...patch } : d))
    }

    const removeNew = (localId: number) => {
        setNewVariantDrafts(prev => prev.filter(d => d.localId !== localId))
    }

    // ─── Save ─────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        setSaving(true); setError("")
        try {
            // 1· Update product basic fields
            await updateProduct(product.id, {
                name: name.trim() || undefined,
                description: description.trim() || undefined,
                price: price ? parseFloat(price) : undefined,
                stock: stock !== "" ? parseInt(stock) : undefined,
                category_id: categoryId || undefined,
            })

            // 2· Delete removed general images
            if (deletedImageIds.length > 0) {
                await Promise.all(deletedImageIds.map(id => deleteProductImage(id)))
            }

            // 3· Upload new general images
            for (const file of newGeneralImages) {
                await addProductImage(product.id, file)
            }

            // 4· Handle existing variants
            for (const draft of existingDrafts) {
                if (draft.markedForDelete) {
                    await deleteVariant(draft.id)
                    continue
                }
                // Update variant fields
                const opts: Record<string, string> = {}
                if (draft.optionKey && draft.optionValue) opts[draft.optionKey] = draft.optionValue
                await updateVariant(draft.id, {
                    options: Object.keys(opts).length > 0 ? opts : undefined,
                    price: draft.price ? parseFloat(draft.price) : undefined,
                    stock: draft.stock !== "" ? parseInt(draft.stock) : undefined,
                })
                // Delete image if flagged
                if (draft.deleteImage && draft.currentImageId) {
                    await deleteProductImage(draft.currentImageId)
                }
                // Upload new variant image
                if (draft.newImageFile) {
                    await setVariantImage(draft.id, product.id, draft.newImageFile)
                }
            }

            // 5· Create new variants
            for (const draft of newVariantDrafts) {
                if (!draft.optionKey.trim() || !draft.optionValue.trim()) continue
                await addVariantToProduct(product.id, {
                    option_key: draft.optionKey.trim(),
                    option_value: draft.optionValue.trim(),
                    price: draft.price ? parseFloat(draft.price) : 0,
                    stock: draft.stock !== "" ? parseInt(draft.stock) : 0,
                    image: draft.imageFile,
                })
            }

            onSaved()
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al guardar los cambios")
        } finally {
            setSaving(false)
        }
    }

    // ─── Styles ───────────────────────────────────────────────────────────────
    const InputClass = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008060]/25 focus:border-[#008060] transition-all bg-white placeholder:text-gray-300"
    const LabelClass = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5"

    const TabBtn = ({ id, label, count }: { id: Tab; label: string; count?: number }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${activeTab === id
                    ? "border-[#008060] text-[#008060]"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
        >
            {label}
            {count !== undefined && count > 0 && (
                <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === id ? "bg-[#008060]/10 text-[#008060]" : "bg-gray-100 text-gray-500"
                    }`}>{count}</span>
            )}
        </button>
    )

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col h-full bg-white">

            {/* ── Header ── */}
            <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-gray-900 leading-tight">Editar Producto</h2>
                    <p className="text-sm text-gray-400 truncate mt-0.5">{product.name}</p>
                </div>
                <button onClick={onClose} className="ml-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-xl transition-colors shrink-0">×</button>
            </div>

            {/* ── Tabs ── */}
            <div className="flex border-b border-gray-100 shrink-0 px-2">
                <TabBtn id="info" label="Info & Precio" />
                <TabBtn id="images" label="Imágenes" count={totalImages} />
                <TabBtn id="variants" label="Variantes" count={totalVariants} />
            </div>

            {/* ── Body ── */}
            <div className="flex-1 overflow-y-auto">

                {/* ══════════ INFO TAB ══════════ */}
                {activeTab === "info" && (
                    <div className="p-6 space-y-5">
                        <div>
                            <label className={LabelClass}>Nombre del Producto</label>
                            <input value={name} onChange={e => setName(e.target.value)} className={InputClass} placeholder="Nombre visible al cliente" />
                        </div>
                        <div>
                            <label className={LabelClass}>Descripción</label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                className={`${InputClass} resize-none`}
                                rows={4}
                                placeholder="Describe el producto — esto mejora el motor de búsqueda del chatbot"
                            />
                            <p className="text-xs text-gray-400 mt-1">💡 Una buena descripción mejora la búsqueda en el chatbot</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={LabelClass}>
                                    Precio (COP)
                                    {totalVariants > 0 && <span className="ml-1 font-normal text-amber-500 normal-case">Opcional</span>}
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">$</span>
                                    <input
                                        type="number" value={price} onChange={e => setPrice(e.target.value)}
                                        className={`${InputClass} pl-7`} min={0} placeholder="0"
                                    />
                                </div>
                                {price && <p className="text-xs text-gray-400 mt-1">{formatCOP(price)}</p>}
                            </div>
                            <div>
                                <label className={LabelClass}>
                                    Stock
                                    {totalVariants > 0 && <span className="ml-1 font-normal text-amber-500 normal-case">Opcional</span>}
                                </label>
                                <input
                                    type="number" value={stock} onChange={e => setStock(e.target.value)}
                                    className={InputClass} min={0} placeholder="0"
                                />
                            </div>
                        </div>
                        <div>
                            <label className={LabelClass}>Categoría</label>
                            <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className={`${InputClass} cursor-pointer`}>
                                <option value="">— Sin categoría —</option>
                                {mainCategories.map(main => (
                                    <optgroup key={main.id} label={main.name}>
                                        <option value={main.id}>{main.name} (General)</option>
                                        {categories.filter(s => s.parent_id === main.id).map(sub => (
                                            <option key={sub.id} value={sub.id}>↳ {sub.name}</option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                {/* ══════════ IMAGES TAB ══════════ */}
                {activeTab === "images" && (
                    <div className="p-6 space-y-6">
                        <div>
                            <p className={LabelClass}>Imágenes actuales del producto</p>
                            {visibleGeneralImages.length === 0 && newGeneralImages.length === 0 ? (
                                <p className="text-sm text-gray-400 py-4">Sin imágenes generales aún.</p>
                            ) : (
                                <div className="grid grid-cols-5 gap-2 mb-3">
                                    {visibleGeneralImages.map(img => (
                                        <div key={img.id} className="relative group">
                                            <img src={img.url} alt="" className="w-full aspect-square object-cover rounded-lg border border-gray-200" />
                                            <button
                                                onClick={() => setDeletedImageIds(prev => [...prev, img.id])}
                                                className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs shadow"
                                            >×</button>
                                        </div>
                                    ))}
                                    {newGeneralImages.map((f, i) => (
                                        <div key={i} className="relative group">
                                            <img src={URL.createObjectURL(f)} alt="" className="w-full aspect-square object-cover rounded-lg border-2 border-dashed border-[#008060]/40" />
                                            <div className="absolute top-1 left-1 bg-[#008060] text-white text-[10px] px-1.5 py-0.5 rounded font-bold">NEW</div>
                                            <button
                                                onClick={() => setNewGeneralImages(prev => prev.filter((_, idx) => idx !== i))}
                                                className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs shadow"
                                            >×</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <label className="flex flex-col items-center gap-2 py-5 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-[#008060]/40 hover:bg-[#008060]/5 transition-all">
                                <svg className="w-7 h-7 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                                </svg>
                                <span className="text-sm text-gray-500 font-medium">Agregar imágenes</span>
                                <span className="text-xs text-gray-400">JPG, PNG, WEBP · máx 10MB c/u</span>
                                <input
                                    ref={generalFileRef} type="file" multiple accept="image/*" className="sr-only"
                                    onChange={e => {
                                        if (!e.target.files) return
                                        setNewGeneralImages(prev => [...prev, ...Array.from(e.target.files!)].slice(0, 10))
                                        if (generalFileRef.current) generalFileRef.current.value = ""
                                    }}
                                />
                            </label>
                        </div>
                    </div>
                )}

                {/* ══════════ VARIANTS TAB ══════════ */}
                {activeTab === "variants" && (
                    <div className="p-6 space-y-4">

                        {/* Section header */}
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold text-gray-700">
                                    {totalVariants === 0 ? "Sin variantes" : `${totalVariants} variante${totalVariants > 1 ? "s" : ""}`}
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5">Cada variante puede tener precio, stock e imagen propios</p>
                            </div>
                            <button
                                onClick={addNewVariant}
                                className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-[#008060] hover:bg-[#006e52] rounded-lg transition-colors shadow-sm"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                                </svg>
                                Nueva variante
                            </button>
                        </div>

                        {totalVariants === 0 && (
                            <div className="flex flex-col items-center py-10 border-2 border-dashed border-gray-200 rounded-xl text-gray-400">
                                <div className="text-3xl mb-2">🎨</div>
                                <p className="font-medium text-gray-500">Sin variantes</p>
                                <p className="text-sm mt-1">Agrega variantes para ofrecer diferentes opciones (sabor, color, tamaño…)</p>
                                <button onClick={addNewVariant} className="mt-4 px-4 py-2 text-sm font-medium text-[#008060] bg-[#008060]/10 rounded-lg hover:bg-[#008060]/20 transition-colors">
                                    + Agregar primera variante
                                </button>
                            </div>
                        )}

                        {/* ── Existing variants ── */}
                        {liveVariants.map((draft, idx) => (
                            <VariantCard
                                key={draft.id}
                                index={idx}
                                title={`${draft.optionKey}: ${draft.optionValue}`}
                                isNew={false}

                                optionKey={draft.optionKey}
                                optionValue={draft.optionValue}
                                price={draft.price}
                                stock={draft.stock}
                                currentImageUrl={draft.deleteImage ? undefined : (draft.newImageFile ? URL.createObjectURL(draft.newImageFile) : draft.currentImageUrl)}
                                hasImage={!!(draft.currentImageUrl || draft.newImageFile)}
                                isPendingNewImage={!!draft.newImageFile}

                                onChangeKey={v => patchDraft(draft.id, { optionKey: v })}
                                onChangeValue={v => patchDraft(draft.id, { optionValue: v })}
                                onChangePrice={v => patchDraft(draft.id, { price: v })}
                                onChangeStock={v => patchDraft(draft.id, { stock: v })}
                                onSetImage={file => patchDraft(draft.id, { newImageFile: file, deleteImage: false })}
                                onDeleteImage={() => patchDraft(draft.id, { deleteImage: true, newImageFile: undefined })}
                                onDelete={() => patchDraft(draft.id, { markedForDelete: true })}

                                formatCOP={formatCOP}
                                InputClass={InputClass}
                            />
                        ))}

                        {/* ── New variant drafts ── */}
                        {newVariantDrafts.map((draft, idx) => (
                            <VariantCard
                                key={draft.localId}
                                index={liveVariants.length + idx}
                                title="Nueva variante"
                                isNew={true}

                                optionKey={draft.optionKey}
                                optionValue={draft.optionValue}
                                price={draft.price}
                                stock={draft.stock}
                                currentImageUrl={draft.imageFile ? URL.createObjectURL(draft.imageFile) : undefined}
                                hasImage={!!draft.imageFile}
                                isPendingNewImage={!!draft.imageFile}

                                onChangeKey={v => patchNew(draft.localId, { optionKey: v })}
                                onChangeValue={v => patchNew(draft.localId, { optionValue: v })}
                                onChangePrice={v => patchNew(draft.localId, { price: v })}
                                onChangeStock={v => patchNew(draft.localId, { stock: v })}
                                onSetImage={file => patchNew(draft.localId, { imageFile: file })}
                                onDeleteImage={() => patchNew(draft.localId, { imageFile: undefined })}
                                onDelete={() => removeNew(draft.localId)}

                                formatCOP={formatCOP}
                                InputClass={InputClass}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* ── Footer ── */}
            <div className="shrink-0 border-t border-gray-100 px-6 py-4 bg-white space-y-3">
                {error && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-lg">
                        <span className="text-red-500 mt-0.5">⚠️</span>
                        <p className="text-sm text-red-600">{error}</p>
                    </div>
                )}

                {/* Pending changes summary */}
                {(deletedImageIds.length > 0 || newGeneralImages.length > 0 || newVariantDrafts.length > 0 ||
                    existingDrafts.some(d => d.markedForDelete || d.newImageFile || d.deleteImage)) && (
                        <div className="flex flex-wrap gap-1.5">
                            {newGeneralImages.length > 0 && <PillBadge color="green" label={`+${newGeneralImages.length} imagen${newGeneralImages.length > 1 ? "es" : ""}`} />}
                            {deletedImageIds.length > 0 && <PillBadge color="red" label={`-${deletedImageIds.length} imagen${deletedImageIds.length > 1 ? "es" : ""}`} />}
                            {newVariantDrafts.length > 0 && <PillBadge color="blue" label={`+${newVariantDrafts.length} variante${newVariantDrafts.length > 1 ? "s" : ""} nueva${newVariantDrafts.length > 1 ? "s" : ""}`} />}
                            {existingDrafts.filter(d => d.markedForDelete).length > 0 && <PillBadge color="red" label={`-${existingDrafts.filter(d => d.markedForDelete).length} variante${existingDrafts.filter(d => d.markedForDelete).length > 1 ? "s" : ""}`} />}
                        </div>
                    )}

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 px-4 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 py-2.5 px-4 text-sm font-semibold text-white bg-[#008060] hover:bg-[#006e52] disabled:bg-gray-300 rounded-lg transition-colors shadow-sm"
                    >
                        {saving ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Guardando...
                            </span>
                        ) : "Guardar Cambios"}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── VariantCard ──────────────────────────────────────────────────────────────

function VariantCard({
    index, title, isNew,
    optionKey, optionValue, price, stock,
    currentImageUrl, hasImage, isPendingNewImage,
    onChangeKey, onChangeValue, onChangePrice, onChangeStock,
    onSetImage, onDeleteImage, onDelete,
    formatCOP, InputClass,
}: {
    index: number; title: string; isNew: boolean
    optionKey: string; optionValue: string; price: string; stock: string
    currentImageUrl?: string; hasImage: boolean; isPendingNewImage: boolean
    onChangeKey: (v: string) => void; onChangeValue: (v: string) => void
    onChangePrice: (v: string) => void; onChangeStock: (v: string) => void
    onSetImage: (f: File) => void; onDeleteImage: () => void; onDelete: () => void
    formatCOP: (v: number | string) => string; InputClass: string
}) {
    const imgRef = useRef<HTMLInputElement>(null)

    return (
        <div className={`rounded-xl border overflow-hidden ${isNew ? "border-[#008060]/30 bg-[#008060]/5" : "border-gray-200 bg-white"}`}>
            {/* Card header */}
            <div className={`flex items-center justify-between px-4 py-3 border-b ${isNew ? "border-[#008060]/20 bg-[#008060]/10" : "border-gray-100 bg-gray-50"}`}>
                <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${isNew ? "bg-[#008060] text-white" : "bg-gray-300 text-gray-700"}`}>
                        {index + 1}
                    </span>
                    <span className="text-sm font-semibold text-gray-700">{title || "Nueva variante"}</span>
                    {isNew && <span className="text-xs font-bold text-[#008060] bg-[#008060]/10 px-1.5 py-0.5 rounded">NUEVA</span>}
                </div>
                <button
                    onClick={onDelete}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded-md transition-colors"
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7M10 11v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    {isNew ? "Quitar" : "Eliminar"}
                </button>
            </div>

            {/* Card body */}
            <div className="p-4 space-y-3">
                {/* Options row */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1 font-medium">Atributo <span className="text-gray-300">(ej: Sabor)</span></label>
                        <input
                            value={optionKey}
                            onChange={e => onChangeKey(e.target.value)}
                            className={InputClass}
                            placeholder="Sabor, Color, Tamaño…"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1 font-medium">Valor <span className="text-gray-300">(ej: Mora)</span></label>
                        <input
                            value={optionValue}
                            onChange={e => onChangeValue(e.target.value)}
                            className={InputClass}
                            placeholder="Mora, Rojo, 250ml…"
                        />
                    </div>
                </div>

                {/* Price/Stock row */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1 font-medium">Precio COP</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">$</span>
                            <input
                                type="number" value={price}
                                onChange={e => onChangePrice(e.target.value)}
                                className={`${InputClass} pl-6`} min={0} placeholder="0"
                            />
                        </div>
                        {price && <p className="text-xs text-gray-400 mt-0.5">{formatCOP(price)}</p>}
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1 font-medium">Stock</label>
                        <input
                            type="number" value={stock}
                            onChange={e => onChangeStock(e.target.value)}
                            className={InputClass} min={0} placeholder="0"
                        />
                    </div>
                </div>

                {/* Image */}
                <div>
                    <label className="block text-xs text-gray-500 mb-2 font-medium">
                        Imagen de la variante
                        {isPendingNewImage && <span className="ml-1.5 text-[#008060] font-bold">· Nueva imagen pendiente</span>}
                    </label>
                    {currentImageUrl ? (
                        <div className="flex items-start gap-3">
                            <div className="relative group">
                                <img src={currentImageUrl} alt="variant" className={`w-20 h-20 object-cover rounded-lg border-2 ${isPendingNewImage ? "border-dashed border-[#008060]" : "border-gray-200"}`} />
                                {isPendingNewImage && (
                                    <div className="absolute inset-0 bg-[#008060]/20 rounded-lg flex items-center justify-center">
                                        <span className="text-[10px] font-bold text-[#008060] bg-white px-1 rounded">NUEVA</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    Cambiar
                                    <input type="file" accept="image/*" className="sr-only"
                                        onChange={e => e.target.files?.[0] && onSetImage(e.target.files[0])} />
                                </label>
                                <button
                                    onClick={onDeleteImage}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    Quitar imagen
                                </button>
                            </div>
                        </div>
                    ) : (
                        <label className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-[#008060]/40 hover:bg-[#008060]/5 transition-all group">
                            <svg className="w-5 h-5 text-gray-300 group-hover:text-[#008060]/50 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-sm text-gray-400">Sin imagen · clic para subir</span>
                            <input ref={imgRef} type="file" accept="image/*" className="sr-only"
                                onChange={e => e.target.files?.[0] && onSetImage(e.target.files[0])} />
                        </label>
                    )}
                </div>
            </div>
        </div>
    )
}

// ─── PillBadge ────────────────────────────────────────────────────────────────
function PillBadge({ color, label }: { color: "green" | "red" | "blue"; label: string }) {
    const cls = {
        green: "bg-green-50 text-green-700 border-green-200",
        red: "bg-red-50 text-red-600 border-red-200",
        blue: "bg-blue-50 text-blue-700 border-blue-200",
    }[color]
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
            {label}
        </span>
    )
}
