"use client"
import { useEffect, useState } from "react"

type Order = {
  id: string
  name: string
  phone_number: string
  address: string
  payment_method: string
  total: number
  products: { name: string; quantity: number }[]
  created_at: string
}

export default function SalesList() {
  const [orders, setOrders] = useState<Order[]>([])
  const API_URL = process.env.NEXT_PUBLIC_API_URL!

  useEffect(() => {
    const fetchOrders = async () => {
      const res = await fetch(`${API_URL}/orders`)
      const data = await res.json()
      setOrders(data)
    }
    fetchOrders()
  }, [])

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h2 className="text-2xl font-semibold mb-6">Ventas Recientes</h2>
      {orders.length === 0 ? (
        <p className="text-gray-500">No hay ventas recientes.</p>
      ) : (
        <div className="space-y-6">
          {orders.map(order => (
            <div key={order.id} className="bg-white shadow rounded p-4">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <p className="font-semibold text-lg">{order.name}</p>
                  <p className="text-gray-500 text-sm">{order.phone_number}</p>
                  <p className="text-gray-600">{order.address}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Pagó con: <strong>{order.payment_method}</strong></p>
                  <p className="text-xl font-bold text-green-600">${order.total.toFixed(2)}</p>
                  <p className="text-sm text-gray-400">{new Date(order.created_at).toLocaleString()}</p>
                </div>
              </div>
              <ul className="mt-2 text-sm text-gray-700">
                {order.products.map((p, i) => (
                  <li key={i}>🛒 {p.name} × {p.quantity}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
