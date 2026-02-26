// src/components/inventory/InventoryList.tsx
"use client"

import { useEffect, useState, ChangeEvent } from "react"
import {
  getProducts,
  deleteProduct,
  deleteVariant,
  updateProductStock,
  updateVariantStock,
  Product
} from "@/lib/api"
import EditProductDrawer from "./EditProductDrawer"

interface Props {
  reloadFlag: number
  onAction: () => void
}

export default function InventoryList({ reloadFlag, onAction }: Props) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [adjustQty, setAdjustQty] = useState<Record<string, string>>({})
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  const formatCOP = (value: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(value || 0)

  useEffect(() => {
    setLoading(true)
    getProducts()
      .then(setProducts)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [reloadFlag])

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("¿Eliminar este producto y todas sus variantes?")) return
    setDeleting(id)
    try {
      await deleteProduct(id)
      onAction()
    } catch (err) {
      console.error(err)
      alert("Error al eliminar producto")
    } finally {
      setDeleting(null)
    }
  }

  const handleDeleteVariant = async (variantId: string) => {
    if (!confirm("¿Eliminar esta variante?")) return
    try {
      await deleteVariant(variantId)
      onAction()
    } catch (err) {
      console.error(err)
      alert("Error al eliminar variante")
    }
  }

  const handleAdjustStock = async (id: string, isVariant: boolean, currentStock: number) => {
    const qty = parseInt(adjustQty[id] || "0")
    if (!qty || qty <= 0) return alert("Ingresa una cantidad válida")
    if (currentStock - qty < 0) return alert("No puedes restar más del stock disponible")
    try {
      if (isVariant) await updateVariantStock(id, currentStock - qty)
      else await updateProductStock(id, currentStock - qty)
      setAdjustQty(prev => ({ ...prev, [id]: "" }))
      onAction()
    } catch (err) {
      console.error(err)
      alert("Error al ajustar stock")
    }
  }

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category?.name || "").toLowerCase().includes(search.toLowerCase())
  )

  const getThumbnail = (prod: Product) => {
    const imgs = (prod as any).product_images ?? []
    return imgs.find((i: any) => !i.variant_id)?.url || imgs[0]?.url || null
  }

  const getTotalStock = (prod: Product) => {
    const variants = (prod as any).product_variants ?? []
    if (variants.length === 0) return prod.stock
    return variants.reduce((sum: number, v: any) => sum + (v.stock ?? 0), 0)
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <div className="w-8 h-8 border-2 border-[#008060] border-t-transparent rounded-full animate-spin mb-3" />
          <span className="text-sm">Cargando inventario...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Productos", value: products.length, icon: "📦" },
          { label: "Con Stock", value: products.filter(p => getTotalStock(p) > 0).length, icon: "✅" },
          { label: "Sin Stock", value: products.filter(p => getTotalStock(p) === 0).length, icon: "⚠️" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4 flex items-center gap-4">
            <div className="text-2xl">{stat.icon}</div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Table Toolbar */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="relative flex-1 max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar productos..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008060]/30 focus:border-[#008060] transition-all"
            />
          </div>
          <p className="text-sm text-gray-500 ml-auto">{filtered.length} producto{filtered.length !== 1 ? "s" : ""}</p>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-gray-400">
            <div className="text-5xl mb-4">📭</div>
            <p className="font-medium text-gray-600">No hay productos</p>
            <p className="text-sm mt-1">Agrega tu primer producto usando el botón de arriba</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Producto</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Categoría</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Precio</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Variantes</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(prod => {
                const variants = (prod as any).product_variants ?? []
                const images = (prod as any).product_images ?? []
                const generalImages = images.filter((i: any) => !i.variant_id)
                const thumbnail = getThumbnail(prod)
                const totalStock = getTotalStock(prod)
                const isExpanded = expandedId === prod.id
                const stockBadgeColor = totalStock === 0
                  ? "bg-red-50 text-red-700 border-red-200"
                  : totalStock < 5
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-green-50 text-green-700 border-green-200"

                return (
                  <>
                    <tr
                      key={prod.id}
                      className={`hover:bg-gray-50/80 transition-colors cursor-pointer ${isExpanded ? "bg-gray-50/60" : ""}`}
                      onClick={() => setExpandedId(isExpanded ? null : prod.id)}
                    >
                      {/* Product cell */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          {thumbnail ? (
                            <img src={thumbnail} alt={prod.name} className="w-10 h-10 object-cover rounded-lg border border-gray-100 flex-shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 text-gray-400 text-xs">
                              IMG
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900 leading-tight">{prod.name}</p>
                            {prod.description && (
                              <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">{prod.description}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3.5">
                        {prod.category ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                            {prod.category.name}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>

                      {/* Price */}
                      <td className="px-4 py-3.5 text-right font-medium text-gray-700">
                        {variants.length > 0 ? (
                          <span className="text-xs text-gray-400">Desde {formatCOP(Math.min(...variants.map((v: any) => v.price || 0)))}</span>
                        ) : (
                          formatCOP(prod.price)
                        )}
                      </td>

                      {/* Stock */}
                      <td className="px-4 py-3.5 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${stockBadgeColor}`}>
                          {totalStock} uds
                        </span>
                      </td>

                      {/* Variants count */}
                      <td className="px-4 py-3.5 text-center">
                        {variants.length > 0 ? (
                          <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
                            {variants.length} variante{variants.length > 1 ? "s" : ""}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">Simple</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                            title="Ver detalles"
                            onClick={() => setExpandedId(isExpanded ? null : prod.id)}
                          >
                            <svg className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setEditingProduct(prod)}
                            className="p-1.5 text-gray-400 hover:text-[#008060] hover:bg-[#008060]/10 rounded-md transition-colors"
                            title="Editar producto"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(prod.id)}
                            disabled={deleting === prod.id}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Eliminar producto"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Row */}
                    {isExpanded && (
                      <tr key={`${prod.id}-expanded`}>
                        <td colSpan={6} className="bg-gray-50/80 border-b border-gray-100 px-5 py-5">
                          <div className="grid grid-cols-2 gap-6">
                            {/* Images */}
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Imágenes</p>
                              <div className="flex flex-wrap gap-2">
                                {generalImages.length === 0 ? (
                                  <div className="w-20 h-20 rounded-lg bg-white border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-xs">
                                    Sin imagen
                                  </div>
                                ) : (
                                  generalImages.map((img: any) => (
                                    <img key={img.id} src={img.url} alt="img" className="w-20 h-20 object-cover rounded-lg border border-gray-200 shadow-sm" />
                                  ))
                                )}
                              </div>
                            </div>

                            {/* Stock Adjustment */}
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                {variants.length > 0 ? "Ajustar Stock por Variante" : "Ajustar Stock"}
                              </p>

                              {variants.length === 0 ? (
                                <StockAdjuster
                                  id={prod.id}
                                  label={prod.name}
                                  currentStock={prod.stock}
                                  qty={adjustQty[prod.id] || ""}
                                  onQtyChange={val => setAdjustQty(prev => ({ ...prev, [prod.id]: val }))}
                                  onAdjust={() => handleAdjustStock(prod.id, false, prod.stock)}
                                />
                              ) : (
                                <div className="space-y-2">
                                  {variants.map((v: any) => {
                                    const opts = Object.entries(v.options || {}).map(([k, val]) => `${k}: ${val}`).join(", ")
                                    return (
                                      <div key={v.id} className="bg-white rounded-lg border border-gray-200 p-3">
                                        <div className="flex items-center justify-between mb-2">
                                          <div>
                                            <span className="text-sm font-medium text-gray-800">{opts || "Única"}</span>
                                            <span className="ml-2 text-xs text-gray-500">{formatCOP(v.price)}</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${v.stock === 0 ? "bg-red-50 text-red-600 border-red-200" :
                                              v.stock < 5 ? "bg-amber-50 text-amber-600 border-amber-200" :
                                                "bg-green-50 text-green-600 border-green-200"
                                              }`}>{v.stock} uds</span>
                                            <button
                                              onClick={() => handleDeleteVariant(v.id)}
                                              className="text-gray-300 hover:text-red-500 transition-colors"
                                              title="Eliminar variante"
                                            >
                                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                              </svg>
                                            </button>
                                          </div>
                                        </div>
                                        <StockAdjuster
                                          id={v.id}
                                          label=""
                                          currentStock={v.stock}
                                          qty={adjustQty[v.id] || ""}
                                          onQtyChange={val => setAdjustQty(prev => ({ ...prev, [v.id]: val }))}
                                          onAdjust={() => handleAdjustStock(v.id, true, v.stock)}
                                          compact
                                        />
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit Product Drawer */}
      {editingProduct && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setEditingProduct(null)}
          />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white shadow-2xl flex flex-col">
            <EditProductDrawer
              product={editingProduct}
              onClose={() => setEditingProduct(null)}
              onSaved={() => {
                setEditingProduct(null)
                onAction()
              }}
            />
          </div>
        </>
      )}
    </div>
  )
}

function StockAdjuster({
  id, label, currentStock, qty, onQtyChange, onAdjust, compact = false
}: {
  id: string; label: string; currentStock: number
  qty: string; onQtyChange: (v: string) => void; onAdjust: () => void; compact?: boolean
}) {
  return (
    <div className={`flex items-center gap-2 ${compact ? "" : "mt-1"}`}>
      {!compact && label && <span className="text-sm text-gray-600 min-w-0 truncate mr-1">{label}</span>}
      <input
        type="number"
        min={1}
        max={currentStock}
        placeholder="Cantidad"
        value={qty}
        onChange={e => onQtyChange(e.target.value)}
        className="w-24 px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition-all"
      />
      <button
        onClick={onAdjust}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
        Descontar
      </button>
    </div>
  )
}
