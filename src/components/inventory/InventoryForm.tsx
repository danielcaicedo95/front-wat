// src/components/inventory/InventoryForm.tsx
"use client"

import { useState, useRef, ChangeEvent, useEffect } from "react"
import { createProduct, getCategories, Category } from "@/lib/api"

interface VariantInput {
  id: number
  optionKey: string
  optionValue: string
  price: string
  stock: string
  imageFile?: File
}

interface Props {
  onAdd: () => void
}

export default function InventoryForm({ onAdd }: Props) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [stock, setStock] = useState("")
  const [variants, setVariants] = useState<VariantInput[]>([])
  const [images, setImages] = useState<File[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryId, setCategoryId] = useState("")
  const [tagsInput, setTagsInput] = useState("")
  const [sku, setSku] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getCategories().then(setCategories).catch(console.error)
  }, [])

  const handlePriceChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPrice(e.target.value.replace(/\D/g, ""))
  }

  const addVariant = () => {
    setVariants(prev => [
      ...prev,
      { id: Date.now(), optionKey: "", optionValue: "", price: "", stock: "" }
    ])
  }

  const updateVariant = (id: number, field: keyof VariantInput, value: string | File | undefined) => {
    setVariants(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v))
  }

  const removeVariant = (id: number) => {
    setVariants(prev => prev.filter(v => v.id !== id))
  }

  const handleGeneralImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const files = Array.from(e.target.files).slice(0, 10 - images.length)
    setImages(prev => [...prev, ...files].slice(0, 10))
    if (fileRef.current) fileRef.current.value = ""
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (variants.length === 0) {
      if (!price || !stock) return alert("Precio y stock son obligatorios cuando no hay variantes")
    }

    setSubmitting(true)
    const formData = new FormData()
    formData.append("name", name)
    formData.append("description", description)
    formData.append("price", price || "0")
    formData.append("stock", stock || "0")
    formData.append("category_id", categoryId || "")
    formData.append("category", categories.find(c => c.id === categoryId)?.name || "")
    formData.append("sku", sku || "")
    formData.append("tags", JSON.stringify(tagsInput.split(",").map(t => t.trim()).filter(Boolean)))

    variants.forEach(v => {
      if ((v.optionKey && v.optionValue) || v.price || v.stock) {
        const opts: Record<string, string> = {}
        if (v.optionKey && v.optionValue) opts[v.optionKey] = v.optionValue
        const payload: any = { options: opts }
        const vp = parseInt(v.price || "")
        const vs = parseInt(v.stock || "")
        if (!isNaN(vp)) payload.price = vp
        if (!isNaN(vs)) payload.stock = vs
        formData.append("variants", JSON.stringify(payload))
      }
    })

    images.forEach(img => formData.append("images", img))
    variants.forEach(v => { if (v.imageFile) formData.append("images", v.imageFile) })

    try {
      await createProduct(formData)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
      setName(""); setDescription(""); setPrice(""); setStock("")
      setCategoryId(""); setTagsInput(""); setSku(""); setVariants([]); setImages([])
      if (fileRef.current) fileRef.current.value = ""
      onAdd()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : "Error al crear el producto")
    } finally {
      setSubmitting(false)
    }
  }

  const mainCategories = categories.filter(c => !c.parent_id)

  const InputClass = "w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008060]/30 focus:border-[#008060] transition-all placeholder:text-gray-300"
  const LabelClass = "block text-sm font-medium text-gray-700 mb-1.5"

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">

      {/* Basic Info */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Información Básica</h3>
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div>
            <label className={LabelClass}>
              Nombre del Producto <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className={InputClass}
              placeholder="Ej: Gatorade Frutos Rojos"
              required
            />
          </div>

          <div>
            <label className={LabelClass}>Descripción</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className={`${InputClass} resize-none`}
              rows={3}
              placeholder="Descripción breve del producto (ayuda al motor de búsqueda del chatbot)"
            />
          </div>
        </div>
      </section>

      {/* Category & Metadata */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Organización</h3>
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div>
            <label className={LabelClass}>Categoría</label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className={`${InputClass} bg-white cursor-pointer`}
            >
              <option value="">— Sin categoría —</option>
              {mainCategories.map(mainCat => (
                <optgroup key={mainCat.id} label={mainCat.name}>
                  <option value={mainCat.id}>{mainCat.name} (General)</option>
                  {categories.filter(sub => sub.parent_id === mainCat.id).map(subCat => (
                    <option key={subCat.id} value={subCat.id}>
                      ↳ {subCat.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LabelClass}>Etiquetas</label>
              <input
                type="text"
                value={tagsInput}
                onChange={e => setTagsInput(e.target.value)}
                className={InputClass}
                placeholder="oferta, importado, especial"
              />
              <p className="text-xs text-gray-400 mt-1">Separadas por comas</p>
            </div>
            <div>
              <label className={LabelClass}>SKU</label>
              <input
                type="text"
                value={sku}
                onChange={e => setSku(e.target.value)}
                className={InputClass}
                placeholder="Código interno"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Pricing & Stock */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Precio y Stock
          {variants.length > 0 && <span className="ml-2 text-xs font-normal text-amber-600 normal-case">Opcional (hay variantes)</span>}
        </h3>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LabelClass}>
                Precio (COP) {variants.length === 0 && <span className="text-red-500">*</span>}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  type="text"
                  value={price ? parseInt(price).toLocaleString("es-CO") : ""}
                  onChange={handlePriceChange}
                  className={`${InputClass} pl-7`}
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <label className={LabelClass}>
                Stock {variants.length === 0 && <span className="text-red-500">*</span>}
              </label>
              <input
                type="number"
                value={stock}
                onChange={e => setStock(e.target.value)}
                className={InputClass}
                placeholder="0"
                min={0}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Variants */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Variantes</h3>
          <button
            type="button"
            onClick={addVariant}
            className="flex items-center gap-1.5 text-sm font-medium text-[#008060] hover:text-[#006e52] transition-colors"
          >
            <span className="text-lg leading-none">+</span>
            Agregar variante
          </button>
        </div>

        {variants.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-200 p-6 text-center">
            <p className="text-sm text-gray-400">Sin variantes — el producto tendrá precio y stock únicos</p>
            <p className="text-xs text-gray-300 mt-1">Ej: si vendes una bebida en varios sabores, cada sabor es una variante</p>
          </div>
        ) : (
          <div className="space-y-3">
            {variants.map((v, idx) => (
              <div key={v.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-gray-700">Variante {idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeVariant(v.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Atributo</label>
                    <input
                      type="text"
                      placeholder="Ej: Sabor, Tamaño, Color"
                      className={InputClass}
                      value={v.optionKey}
                      onChange={e => updateVariant(v.id, "optionKey", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Valor</label>
                    <input
                      type="text"
                      placeholder="Ej: Rojo, 250ml, Mora"
                      className={InputClass}
                      value={v.optionValue}
                      onChange={e => updateVariant(v.id, "optionValue", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Precio COP</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <input
                        type="number"
                        placeholder="0"
                        value={v.price}
                        onChange={e => updateVariant(v.id, "price", e.target.value.replace(/\D/g, ""))}
                        className={`${InputClass} pl-7`}
                        min={0}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Stock</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={v.stock}
                      onChange={e => updateVariant(v.id, "stock", e.target.value)}
                      className={InputClass}
                      min={0}
                    />
                  </div>
                </div>

                {/* Variant Image */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Imagen de la variante</label>
                  {v.imageFile ? (
                    <div className="flex items-center gap-3">
                      <img src={URL.createObjectURL(v.imageFile)} alt="preview" className="w-12 h-12 object-cover rounded-lg border border-gray-200" />
                      <button
                        type="button"
                        onClick={() => updateVariant(v.id, "imageFile", undefined)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Quitar
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Subir imagen
                      </div>
                      <input type="file" accept="image/*" className="sr-only"
                        onChange={e => e.target.files?.[0] && updateVariant(v.id, "imageFile", e.target.files[0])} />
                    </label>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Product Images */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Imágenes del Producto</h3>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          {images.length > 0 && (
            <div className="grid grid-cols-5 gap-2 mb-4">
              {images.map((img, i) => (
                <div key={i} className="relative group">
                  <img
                    src={URL.createObjectURL(img)}
                    alt={`preview-${i}`}
                    className="w-full aspect-square object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <label className={`flex flex-col items-center justify-center gap-2 py-6 rounded-lg cursor-pointer transition-colors ${images.length >= 10
              ? "bg-gray-50 opacity-50 cursor-not-allowed"
              : "bg-gray-50 hover:bg-gray-100 border-2 border-dashed border-gray-200 hover:border-[#008060]/40"
            }`}>
            <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm text-gray-500">
              {images.length >= 10 ? "Máximo 10 imágenes" : "Clic para subir imágenes"}
            </span>
            <span className="text-xs text-gray-400">{images.length}/10 imágenes</span>
            {images.length < 10 && (
              <input
                ref={fileRef}
                type="file"
                multiple
                accept="image/*"
                className="sr-only"
                onChange={handleGeneralImageChange}
                disabled={images.length >= 10}
              />
            )}
          </label>
        </div>
      </section>

      {/* Submit */}
      <div className="pb-2">
        <button
          type="submit"
          disabled={submitting || success}
          className={`w-full py-3 px-6 rounded-xl text-base font-semibold transition-all shadow-sm ${success
              ? "bg-green-500 text-white"
              : submitting
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-[#008060] hover:bg-[#006e52] text-white"
            }`}
        >
          {success ? "✓ Producto creado" : submitting ? "Guardando..." : "Guardar Producto"}
        </button>
      </div>
    </form>
  )
}
