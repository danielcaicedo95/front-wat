// src/components/inventory/InventoryManager.tsx
"use client"

import { useState, useCallback } from "react"
import InventoryList from "./InventoryList"
import InventoryForm from "./InventoryForm"
import CategoryManager from "./CategoryManager"

type Tab = "products" | "categories"

export default function InventoryManager() {
  const [activeTab, setActiveTab] = useState<Tab>("products")
  const [reloadKey, setReloadKey] = useState(0)
  const [showForm, setShowForm] = useState(false)

  const triggerReload = useCallback(() => {
    setReloadKey(k => k + 1)
  }, [])

  const handleAdded = useCallback(() => {
    triggerReload()
    setShowForm(false)
  }, [triggerReload])

  return (
    <div className="min-h-screen bg-[#f6f6f7]">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#008060] rounded-lg flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
                <path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Inventario</h1>
          </div>
          
          {/* Mobile add button (icon only) */}
          {activeTab === "products" && (
            <button
              onClick={() => setShowForm(true)}
              className="sm:hidden flex items-center justify-center w-8 h-8 bg-[#008060] hover:bg-[#006e52] text-white rounded-lg transition-colors shadow-sm shrink-0"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
        </div>

        {/* Tabs & Desktop Actions */}
        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
          <nav className="flex gap-1 bg-gray-100 rounded-lg p-1 shrink-0">
            <button
              onClick={() => setActiveTab("products")}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === "products"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
                }`}
            >
              Productos
            </button>
            <button
              onClick={() => setActiveTab("categories")}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === "categories"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
                }`}
            >
              Categorías
            </button>
          </nav>

          {/* Desktop add button */}
          {activeTab === "products" && (
            <button
              onClick={() => setShowForm(true)}
              className="hidden sm:flex items-center gap-2 bg-[#008060] hover:bg-[#006e52] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm shrink-0"
            >
              <span className="text-lg leading-none">+</span>
              Agregar producto
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 py-6">
        {activeTab === "products" && (
          <InventoryList reloadFlag={reloadKey} onAction={triggerReload} />
        )}
        {activeTab === "categories" && (
          <CategoryManager />
        )}
      </div>

      {/* Slide-in Drawer */}
      {showForm && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 z-40 animate-in fade-in duration-200"
            onClick={() => setShowForm(false)}
          />
          {/* Drawer Panel */}
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
              <h2 className="text-lg font-semibold text-gray-900">Nuevo Producto</h2>
              <button
                onClick={() => setShowForm(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 text-xl transition-colors"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <InventoryForm onAdd={handleAdded} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
