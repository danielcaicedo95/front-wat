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
  status?: string // 'pending', 'completed', 'cancelled'
}

const ITEMS_PER_PAGE = 30;

const renderTextWithLinksAndBreaks = (text: string) => {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.split(urlRegex).map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 bg-blue-600 text-white hover:bg-blue-700 font-bold px-4 py-2 rounded-xl transition-all shadow-sm">
          📍📍 Mapa Exacto de Entrega
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
};

export default function SalesList() {
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  
  // CRM States
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  
  // DRIVER States
  const [drivers, setDrivers] = useState<any[]>([])
  const [selectedDriverId, setSelectedDriverId] = useState("")
  const [dispatching, setDispatching] = useState(false)
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL!

  useEffect(() => {
    fetchOrders()
    fetchDrivers()
  }, [])

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${API_URL}/orders`)
      const data = await res.json()
      setOrders(data)
    } catch (error) {
      console.error("Error fetching orders:", error)
    }
  }

  const fetchDrivers = async () => {
    try {
      const res = await fetch(`${API_URL}/drivers`)
      const data = await res.json()
      if (Array.isArray(data)) setDrivers(data)
    } catch(e){}
  }

  const handleDispatch = async () => {
    if (!selectedDriverId || !selectedOrder) return;
    const driver = drivers.find(d => d.id === selectedDriverId);
    if (!driver) return;
    
    setDispatching(true);
    try {
      const res = await fetch(`${API_URL}/drivers/dispatch/${selectedOrder.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driver_phone: driver.phone_number })
      });
      if (res.ok) {
        alert(`¡Domicilio enviado exitosamente al WhatsApp de ${driver.name}!`);
      } else {
        alert("Error al enviar domicilio. Revisa log backend.");
      }
    } catch(e) {
      alert("Error de conexión al asignar repartidor.");
    } finally {
      setDispatching(false);
    }
  }

  // Paginación
  const totalPages = Math.ceil(orders.length / ITEMS_PER_PAGE) || 1;
  const currentOrders = orders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Checkboxes
  const toggleSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation() // no abrir ficha
    const newSet = new Set(selectedOrderIds)
    if (newSet.has(id)) newSet.delete(id)
    else newSet.add(id)
    setSelectedOrderIds(newSet)
  }

  const toggleSelectAll = () => {
    if (selectedOrderIds.size === currentOrders.length && currentOrders.length > 0) {
      // Deselect all in this page
      const newSet = new Set(selectedOrderIds)
      currentOrders.forEach(o => newSet.delete(o.id))
      setSelectedOrderIds(newSet)
    } else {
      // Select all in this page
      const newSet = new Set(selectedOrderIds)
      currentOrders.forEach(o => newSet.add(o.id))
      setSelectedOrderIds(newSet)
    }
  }

  // Acciones de Datos
  const updateStatus = async (ids: string[], status: string) => {
    if (!ids.length) return;
    try {
      await fetch(`${API_URL}/orders/bulk-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_ids: ids, status })
      });
      // Actualizar vista
      setOrders(prev => prev.map(o => ids.includes(o.id) ? { ...o, status } : o));
      if (selectedOrder && ids.includes(selectedOrder.id)) {
        setSelectedOrder({ ...selectedOrder, status });
      }
      setSelectedOrderIds(new Set()); // limpiar selección después de acción masiva
    } catch (error) {
       console.error("Error actualizando estados:", error)
    }
  }

  const handleExportXML = () => {
    const ordersToExport = orders.filter(o => selectedOrderIds.has(o.id));
    if (ordersToExport.length === 0) return;
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<Ventas>\n`;
    ordersToExport.forEach(o => {
      xml += `  <Venta id="${o.id}">\n`;
      xml += `    <Cliente><![CDATA[${o.name}]]></Cliente>\n`;
      xml += `    <Telefono>${o.phone_number}</Telefono>\n`;
      xml += `    <Estado>${o.status || 'pending'}</Estado>\n`;
      xml += `    <Total>${o.total}</Total>\n`;
      xml += `    <MetodoPago>${o.payment_method}</MetodoPago>\n`;
      xml += `    <Fecha>${o.created_at}</Fecha>\n`;
      xml += `    <Productos>\n`;
      o.products.forEach(p => {
        xml += `      <Producto nombre="${p.name}" cantidad="${p.quantity}" />\n`;
      });
      xml += `    </Productos>\n`;
      xml += `  </Venta>\n`;
    });
    xml += `</Ventas>`;
    
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Export_CRM_${new Date().toISOString().split('T')[0]}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const isAllCurrentSelected = currentOrders.length > 0 && currentOrders.every(o => selectedOrderIds.has(o.id));

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* HEADER CRM */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-6 border-b-2 border-gray-200 pb-4 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-black border-l-4 border-indigo-500 pl-3">
            CRM de Ventas
          </h2>
          <p className="text-sm font-medium text-gray-500 mt-2">
            Gestiona tus pedidos. Total histórico: {orders.length}
          </p>
        </div>
        
        {/* BARRA FLOTANTE DE ACCIONES MASIVAS (Aparece sólo si hay items checkeados) */}
        {selectedOrderIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 bg-indigo-50 border border-indigo-200 p-2 rounded-xl animate-in slide-in-from-top-2 shadow-sm">
            <span className="font-bold text-indigo-800 text-sm px-2">
              {selectedOrderIds.size} {selectedOrderIds.size === 1 ? 'seleccionado' : 'seleccionados'}
            </span>
            <div className="bg-gray-300 w-px h-6 mx-1" />
            
            <button onClick={() => updateStatus(Array.from(selectedOrderIds), 'completed')} className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs px-3 py-2 rounded-lg transition-colors shadow">
              ✅ Marcar Realizada
            </button>
            <button onClick={() => updateStatus(Array.from(selectedOrderIds), 'cancelled')} className="bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 font-bold text-xs px-3 py-2 rounded-lg transition-colors">
              ⛔ Cancelar
            </button>
            <button onClick={handleExportXML} className="bg-white border-2 border-gray-200 text-black hover:bg-gray-50 font-bold text-xs px-3 py-2 rounded-lg transition-colors ml-auto sm:ml-0 flex items-center gap-1">
              📥 XML
            </button>
          </div>
        )}
      </div>

      {orders.length === 0 ? (
        <div className="bg-gray-50 rounded-2xl p-8 text-center border-2 border-dashed border-gray-200 text-black font-medium text-lg">
          No hay ventas registradas aún en el sistema.
        </div>
      ) : (
        <>
          {/* HEADER DE LISTA (SELECCIONAR TODOS) */}
          <div className="flex justify-between items-center mb-4 px-2">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={isAllCurrentSelected} 
                onChange={toggleSelectAll}
                className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="text-sm font-bold text-gray-700 group-hover:text-black transition-colors">Seleccionar todos en esta página</span>
            </label>
            <div className="text-sm font-bold text-gray-500">
              Página {currentPage} de {totalPages}
            </div>
          </div>

          {/* GRID DE PEDIDOS */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {currentOrders.map(order => {
              const checked = selectedOrderIds.has(order.id);
              const isCancelled = order.status === 'cancelled';
              const isCompleted = order.status === 'completed';
              
              return (
              <div 
                key={order.id} 
                onClick={() => setSelectedOrder(order)}
                className={`
                  relative border-2 shadow-sm rounded-2xl p-6 cursor-pointer transition-all flex flex-col justify-between group
                  hover:-translate-y-1 hover:shadow-xl
                  ${checked ? 'border-indigo-400 bg-indigo-50/20' : 'border-gray-200 bg-white'}
                  ${isCancelled ? 'opacity-80' : ''}
                `}
              >
                {/* STATUS INDICATOR ABSOLUTE */}
                {isCancelled && (
                  <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2">
                    <span className="relative flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 shadow" title="Cancelada"></span>
                    </span>
                  </div>
                )}
                {isCompleted && (
                  <div className="absolute top-[-10px] right-[-10px] bg-green-500 text-white text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full shadow-md z-10 border-2 border-white">
                    Realizada
                  </div>
                )}

                <div className="flex justify-between items-start mb-4 gap-3">
                  <div className="mt-1" onClick={e => toggleSelection(order.id, e)}>
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer pointer-events-none" 
                      checked={checked} 
                      readOnly
                    />
                  </div>
                  <div className="flex-1 pr-1 truncate">
                    <p className={`font-extrabold text-xl truncate ${isCancelled ? 'line-through text-gray-500' : 'text-black'}`} title={order.name}>
                      {order.name}
                    </p>
                    <p className="text-gray-900 font-medium text-sm mt-1">{new Date(order.created_at).toLocaleDateString()} • {new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                  </div>
                  <div className={`border px-3 py-1.5 rounded-xl text-sm font-black shadow-sm whitespace-nowrap ${isCancelled ? 'bg-gray-100 text-gray-400 border-gray-200 line-through' : 'bg-green-100 text-green-900 border-green-200'}`}>
                    ${order.total.toLocaleString()}
                  </div>
                </div>
                
                <div className="flex justify-between items-end mt-4 pt-4 border-t-2 border-gray-100">
                  <span className="text-xs font-black text-black uppercase tracking-wider bg-gray-100 px-2 py-1 rounded-lg">
                    {order.payment_method}
                  </span>
                  <span className="text-indigo-600 bg-indigo-50 px-3 py-1 rounded-xl text-sm font-bold flex items-center gap-1 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    Ver ficha <span className="text-lg">→</span>
                  </span>
                </div>
              </div>
            )})}
          </div>
          
          {/* CONTROL DE PAGINACIÓN */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center mt-10 gap-2 mb-10">
              <button 
                onClick={() => setCurrentPage(c => Math.max(1, c - 1))}
                disabled={currentPage === 1}
                className="bg-white border-2 border-gray-200 text-black font-bold px-4 py-2 rounded-xl disabled:opacity-50 hover:bg-gray-50 transition-colors"
              >
                ← Atrás
              </button>
              {Array.from({length: totalPages}).map((_, i) => (
                <button 
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-10 h-10 font-bold rounded-xl border-2 transition-colors ${currentPage === i + 1 ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-200 text-black hover:bg-gray-50'}`}
                >
                  {i + 1}
                </button>
              ))}
              <button 
                onClick={() => setCurrentPage(c => Math.min(totalPages, c + 1))}
                disabled={currentPage === totalPages}
                className="bg-white border-2 border-gray-200 text-black font-bold px-4 py-2 rounded-xl disabled:opacity-50 hover:bg-gray-50 transition-colors"
              >
                Siguiente →
              </button>
            </div>
          )}
        </>
      )}

      {/* MODAL / FICHA INDIVIDUAL DEL PEDIDO */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition-opacity" onClick={() => setSelectedOrder(null)}>
          <div 
            className="bg-white rounded-[2rem] w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div className="bg-gray-100 px-6 py-4 border-b-2 border-gray-200 flex justify-between items-center sticky top-0 z-10 flex-shrink-0">
              <div className="flex items-center gap-3">
                <h3 className="text-2xl font-black text-black tracking-tight">Ficha del Pedido</h3>
                {selectedOrder.status === 'completed' && <span className="bg-green-500 text-white text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full shadow-md">Realizada</span>}
                {selectedOrder.status === 'cancelled' && <span className="bg-red-500 text-white text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full shadow-md">Cancelada</span>}
              </div>
              <button 
                onClick={() => setSelectedOrder(null)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-300 text-black font-black hover:bg-red-500 hover:text-white transition-all transform hover:scale-105"
                title="Cerrar"
              >
                ✕
              </button>
            </div>

            {/* Contenido Scrolleable */}
            <div className="p-6 md:p-8 overflow-y-auto space-y-8 flex-1">
              {/* Bloque: Cliente */}
              <div>
                <p className="text-xs font-black text-black uppercase tracking-widest mb-3 opacity-70">Datos del Cliente</p>
                <div className={`p-5 rounded-2xl border-2 shadow-sm border-l-8 ${selectedOrder.status === 'cancelled' ? 'bg-red-50 border-red-200 border-l-red-500' : 'bg-white border-indigo-100 border-l-indigo-600'}`}>
                  <p className={`font-black text-2xl ${selectedOrder.status==='cancelled'? 'line-through text-red-800' : 'text-black'}`}>{selectedOrder.name}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <span className="bg-gray-100 border border-gray-200 text-black font-bold px-3 py-1.5 rounded-lg text-lg">📞 {selectedOrder.phone_number}</span>
                    <a href={`https://wa.me/${selectedOrder.phone_number.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" className="bg-[#25D366] text-white font-bold px-4 py-1.5 rounded-lg hover:bg-green-600 transition-colors flex items-center shadow-sm" title="Abrir chat en WhatsApp">
                      Enlazar a WhatsApp
                    </a>
                  </div>
                </div>
              </div>

              {/* Bloque: Envío */}
              <div className={selectedOrder.status === 'cancelled' ? 'opacity-60 grayscale' : ''}>
                <p className="text-xs font-black text-black uppercase tracking-widest mb-3 opacity-70">Dirección y Entrega</p>
                <div className="bg-[#f0f9ff] p-5 rounded-2xl border-2 border-[#bae6fd] shadow-sm">
                  <p className="text-black font-bold whitespace-pre-wrap text-lg leading-relaxed">
                    {renderTextWithLinksAndBreaks(selectedOrder.address)}
                  </p>
                </div>
              </div>

              {/* Bloque: Pago */}
              <div className="flex flex-col sm:flex-row gap-4">
                 <div className="flex-1 bg-gray-50 p-5 rounded-2xl border-2 border-gray-200 shadow-sm">
                   <p className="text-xs font-black text-black uppercase tracking-widest opacity-70">Método de Pago</p>
                   <p className="font-black text-black text-xl mt-1">{selectedOrder.payment_method}</p>
                 </div>
                 <div className="flex-1 bg-gray-50 p-5 rounded-2xl border-2 border-gray-200 shadow-sm">
                   <p className="text-xs font-black text-black uppercase tracking-widest opacity-70">Fecha del Pedido</p>
                   <p className="font-bold text-black text-lg mt-1">
                     {new Date(selectedOrder.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short'})}
                   </p>
                 </div>
              </div>

              {/* Bloque: Productos */}
              <div className={selectedOrder.status === 'cancelled' ? 'opacity-60 grayscale' : ''}>
                <p className="text-xs font-black text-black uppercase tracking-widest mb-3 opacity-70">Productos Adquiridos</p>
                <ul className="bg-white border-2 border-gray-200 rounded-2xl divide-y-2 divide-gray-100 text-black font-medium shadow-sm overflow-hidden">
                  {selectedOrder.products.map((p, i) => (
                    <li key={i} className="flex items-center px-5 py-4 hover:bg-gray-50 transition-colors">
                      <span className="text-xl mr-4">🛒</span>
                      <span className="flex-1 text-lg font-bold">{p.name}</span>
                      <span className="font-black text-xl bg-gray-200 border border-gray-300 px-3 py-1 rounded-xl">× {p.quantity}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {/* Bloque: Logística de Envío */}
              <div className={selectedOrder.status === 'cancelled' ? 'opacity-60 grayscale' : ''}>
                <p className="text-xs font-black text-black uppercase tracking-widest mb-3 opacity-70">Logística de Envío</p>
                <div className="bg-orange-50 p-5 rounded-2xl border-2 border-orange-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center">
                  <select 
                    value={selectedDriverId}
                    onChange={e => setSelectedDriverId(e.target.value)}
                    className="flex-1 w-full px-4 py-3 rounded-xl border-2 border-orange-300 focus:border-orange-500 outline-none text-black font-bold bg-white"
                  >
                    <option value="">-- Selecciona un Repartidor --</option>
                    {drivers.map(d => <option key={d.id} value={d.id}>{d.name} ({d.phone_number})</option>)}
                  </select>
                  <button 
                    onClick={handleDispatch}
                    disabled={dispatching || !selectedDriverId}
                    className="w-full sm:w-auto px-6 py-3 bg-orange-500 hover:bg-orange-600 active:scale-95 disabled:opacity-50 text-white font-black rounded-xl shadow-md transition-all whitespace-nowrap flex items-center justify-center gap-2"
                  >
                    {dispatching ? "Enviando..." : "🚀 Despachar a Moto"}
                  </button>
                </div>
              </div>
            </div>

            {/* Footer / Toolbar de Ficha */}
            <div className="bg-gray-100 border-t-2 border-gray-200 p-4 shrink-0 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button onClick={() => updateStatus([selectedOrder.id], 'completed')} className="bg-green-600 hover:bg-green-700 active:scale-95 transition-all text-white px-4 py-2.5 rounded-xl font-bold shadow disabled:opacity-50">
                   ✅ Realizada
                </button>
                <button onClick={() => updateStatus([selectedOrder.id], 'cancelled')} className="bg-white border-2 border-red-200 text-red-600 hover:bg-red-50 active:scale-95 transition-all px-4 py-2.5 rounded-xl font-bold shadow-sm disabled:opacity-50">
                   ⛔ Cancelar
                </button>
                <button onClick={() => { setSelectedOrderIds(new Set([selectedOrder.id])); setTimeout(handleExportXML, 100); }} className="bg-white border-2 border-gray-200 text-gray-800 hover:bg-gray-50 active:scale-95 transition-all p-2.5 rounded-xl font-bold shadow-sm" title="Descargar como XML">
                   📥
                </button>
              </div>
              
              <div className="text-right ml-auto bg-gray-900 px-5 py-2.5 rounded-xl shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
                <span className="text-green-400 text-2xl font-black tabular-nums">
                  ${selectedOrder.total.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
