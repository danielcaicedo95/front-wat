"use client"
import { useState, useEffect } from 'react'
import { fetchWithAuth, API_URL } from '@/lib/fetchWithAuth'

type Driver = {
  id: string
  name: string
  phone_number: string
  created_at: string
}

const COUNTRY_CODES = [
  { code: '+57', name: 'Colombia (+57)' },
  { code: '+52', name: 'México (+52)' },
  { code: '+54', name: 'Argentina (+54)' },
  { code: '+56', name: 'Chile (+56)' },
  { code: '+51', name: 'Perú (+51)' },
  { code: '+593', name: 'Ecuador (+593)' },
  { code: '+1', name: 'US/Canada (+1)' },
  { code: '+34', name: 'España (+34)' },
]

export default function DeliveriesPage() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [name, setName] = useState('')
  const [countryCode, setCountryCode] = useState('+57')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchDrivers()
  }, [])

  const fetchDrivers = async () => {
    try {
      const res = await fetchWithAuth(`${API_URL}/drivers`)
      const data = await res.json()
      if (Array.isArray(data)) setDrivers(data)
    } catch (e) {
      console.error(e)
    }
  }

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !phoneNumber.trim()) return
    setLoading(true)

    // Format phone: remove spaces/dashes and add country code if it doesn't have a plus
    const cleanPhone = phoneNumber.replace(/\D/g, '')
    const fullPhone = `${countryCode}${cleanPhone}`

    try {
      const res = await fetchWithAuth(`${API_URL}/drivers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone_number: fullPhone })
      })
      if (res.ok) {
        setName('')
        setPhoneNumber('')
        fetchDrivers()
      } else {
        const err = await res.json()
        alert(`Error: ${err.detail || 'No se pudo agregar al repartidor'}`)
      }
    } catch (error) {
      console.error(error)
      alert("Error de conexión.")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, driverName: string) => {
    if (!confirm(`¿Estás seguro de eliminar a ${driverName}?`)) return
    
    try {
      const res = await fetchWithAuth(`${API_URL}/drivers/${id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchDrivers()
      } else {
        alert("Error al eliminar")
      }
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-8 border-b-2 border-gray-200 pb-4">
        <h2 className="text-3xl font-bold text-black border-l-4 border-indigo-500 pl-3">
          Sistema de Repartidores
        </h2>
        <p className="text-gray-500 mt-2 font-medium">
          Añade el número de WhatsApp de tus repartidores para enviarles despachos automáticamente desde tus ventas.
        </p>
      </div>

      <div className="bg-white rounded-2xl border-2 border-indigo-100 shadow-sm p-6 mb-8">
        <h3 className="text-xl font-black text-black mb-4">Añadir Nuevo Repartidor</h3>
        <form onSubmit={handleAddDriver} className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Nombre COMPLETO / ALIAS</label>
            <input 
              type="text" 
              required
              value={name} 
              onChange={e => setName(e.target.value)} 
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:ring-0 outline-none text-black font-semibold" 
              placeholder="Ejem: Carlos Moto 1"
            />
          </div>
          
          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">WhatsApp</label>
            <div className="flex gap-2">
              <select 
                value={countryCode} 
                onChange={e => setCountryCode(e.target.value)}
                className="w-[45%] lg:w-1/3 px-2 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 bg-gray-50 text-black font-bold outline-none cursor-pointer text-sm"
              >
                {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
              <input 
                type="tel" 
                required
                value={phoneNumber} 
                onChange={e => setPhoneNumber(e.target.value)} 
                className="w-[55%] lg:w-2/3 px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:ring-0 outline-none text-black font-semibold" 
                placeholder="315 000 0000"
              />
            </div>
          </div>
          
          <div className="flex items-end">
            <button 
              type="submit" 
              disabled={loading}
              className="h-[52px] px-8 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-xl transition-all shadow-md w-full sm:w-auto mt-auto disabled:opacity-50"
            >
              {loading ? "..." : "+ Agregar"}
            </button>
          </div>
        </form>
      </div>

      <h3 className="text-xl font-black text-black mb-4 px-1">Directorio Activo ({drivers.length})</h3>
      {drivers.length === 0 ? (
        <div className="bg-gray-50 rounded-2xl p-8 text-center border-2 border-dashed border-gray-200 text-gray-400 font-bold">
          Aún no tienes repartidores registrados.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {drivers.map(d => (
            <div key={d.id} className="bg-white border-2 border-gray-100 p-5 rounded-2xl flex flex-col hover:border-indigo-300 transition-colors shadow-sm group">
              <div className="flex justify-between items-start mb-2">
                <span className="text-3xl">🛵</span>
                <button 
                  onClick={() => handleDelete(d.id, d.name)}
                  className="w-8 h-8 rounded-full bg-red-50 text-red-500 font-bold text-sm lg:opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                  title="Eliminar"
                >
                  ✕
                </button>
              </div>
              <p className="font-black text-black text-xl mb-1 truncate">{d.name}</p>
              <p className="text-gray-500 font-bold font-mono">{d.phone_number}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
