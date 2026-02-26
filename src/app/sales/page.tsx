// app/sales/page.tsx
"use client"

import SalesList from "@/components/sales/SalesList"

export default function SalesPage() {
  return (
    <main className="p-6">
      <h1 className="text-3xl font-bold mb-4">Ventas</h1>
      <SalesList />
    </main>
  )
}
