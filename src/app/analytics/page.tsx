'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ─── Types ───────────────────────────────────────────────────────────────────
interface KPI { revenue_today: number; orders_today: number; active_users: number; conversion_rate: number; }
interface FunnelStep { step: string; label: string; count: number; conversion_from_prev?: number; }
interface RevenueDay { date: string; revenue: number; orders: number; }
interface Product { name: string; units_sold: number; revenue: number; }
interface Customer { phone_display: string; name: string; total_spent: number; order_count: number; type: string; last_order: string; }
interface FailedSearch { query: string; frequency: number; }

const FUNNEL_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#ef4444', '#10b981'];

function formatCOP(n: number) {
    return `$${n.toLocaleString('es-CO')}`;
}

function KpiCard({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon: string }) {
    return (
        <div className="bg-white rounded-2xl shadow p-5 flex items-start gap-4">
            <span className="text-3xl">{icon}</span>
            <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
                <p className="text-2xl font-bold text-gray-800 mt-0.5">{value}</p>
                {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
    const [days, setDays] = useState(7);
    const [loading, setLoading] = useState(true);

    const [kpis, setKpis] = useState<KPI>({ revenue_today: 0, orders_today: 0, active_users: 0, conversion_rate: 0 });
    const [funnel, setFunnel] = useState<FunnelStep[]>([]);
    const [revenue, setRevenue] = useState<{ data: RevenueDay[]; total: number; total_orders: number; avg_order_value: number }>({ data: [], total: 0, total_orders: 0, avg_order_value: 0 });
    const [topProducts, setTopProducts] = useState<Product[]>([]);
    const [customers, setCustomers] = useState<{ customers: Customer[]; summary: { total: number; new: number; returning: number } }>({ customers: [], summary: { total: 0, new: 0, returning: 0 } });
    const [searches, setSearches] = useState<{ performance: { success_rate: number; total_searches: number; avg_response_time_ms: number }; failed_searches: FailedSearch[] }>({ performance: { success_rate: 0, total_searches: 0, avg_response_time_ms: 0 }, failed_searches: [] });

    const TENANT = 'default';

    const loadAll = useCallback(async () => {
        setLoading(true);
        try {
            const [kpiRes, funnelRes, revenueRes, topRes, custRes, searchRes] = await Promise.all([
                fetch(`${API}/analytics/kpis?tenant_id=${TENANT}`),
                fetch(`${API}/analytics/funnel?tenant_id=${TENANT}&days=${days}`),
                fetch(`${API}/analytics/revenue?tenant_id=${TENANT}&days=${days}`),
                fetch(`${API}/analytics/top-products?tenant_id=${TENANT}&limit=8`),
                fetch(`${API}/analytics/customers?tenant_id=${TENANT}&limit=20`),
                fetch(`${API}/analytics/searches?tenant_id=${TENANT}&days=${days}`),
            ]);
            const [k, f, r, tp, c, s] = await Promise.all([
                kpiRes.json(), funnelRes.json(), revenueRes.json(),
                topRes.json(), custRes.json(), searchRes.json(),
            ]);
            setKpis(k);
            setFunnel(f.funnel || []);
            setRevenue(r);
            setTopProducts(Array.isArray(tp) ? tp : []);
            setCustomers(c);
            setSearches(s);
        } catch (e) {
            console.error('Error cargando analytics:', e);
        } finally {
            setLoading(false);
        }
    }, [days]);

    useEffect(() => { loadAll(); }, [loadAll]);

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">📊 Analytics</h1>
                    <p className="text-sm text-gray-500">Métricas de tu chatbot en tiempo real</p>
                </div>
                <div className="flex items-center gap-2">
                    {[7, 14, 30].map(d => (
                        <button
                            key={d}
                            onClick={() => setDays(d)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${days === d ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}
                        >
                            {d}d
                        </button>
                    ))}
                    <button onClick={loadAll} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white border hover:bg-gray-50">
                        🔄
                    </button>
                </div>
            </div>

            {loading && (
                <div className="flex justify-center py-16">
                    <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
                </div>
            )}

            {!loading && (
                <>
                    {/* KPIs */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <KpiCard label="Ingresos hoy" value={formatCOP(kpis.revenue_today)} icon="💰" />
                        <KpiCard label="Pedidos hoy" value={String(kpis.orders_today)} icon="📦" />
                        <KpiCard label="Usuarios activos" value={String(kpis.active_users)} sub="sesiones del día" icon="👥" />
                        <KpiCard label="Conversión" value={`${kpis.conversion_rate}%`} sub="sesión → compra" icon="🎯" />
                    </div>

                    {/* Revenue + Funnel */}
                    <div className="grid lg:grid-cols-2 gap-4">
                        {/* Revenue chart */}
                        <div className="bg-white rounded-2xl shadow p-5">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h2 className="font-semibold text-gray-800">Ingresos — últimos {days} días</h2>
                                    <p className="text-xs text-gray-400">{formatCOP(revenue.total)} total · {revenue.total_orders} pedidos · ticket promedio {formatCOP(revenue.avg_order_value)}</p>
                                </div>
                            </div>
                            <ResponsiveContainer width="100%" height={200}>
                                <LineChart data={revenue.data}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={v => v?.slice(5) || ''} />
                                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                                    <Tooltip formatter={(v: number) => formatCOP(v)} labelFormatter={l => `Fecha: ${l}`} />
                                    <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Funnel */}
                        <div className="bg-white rounded-2xl shadow p-5">
                            <h2 className="font-semibold text-gray-800 mb-4">Embudo de conversión</h2>
                            <div className="space-y-2">
                                {funnel.map((step, i) => {
                                    const pct = funnel[0]?.count > 0 ? Math.round((step.count / funnel[0].count) * 100) : 0;
                                    return (
                                        <div key={step.step}>
                                            <div className="flex justify-between text-xs text-gray-500 mb-0.5">
                                                <span>{step.label}</span>
                                                <span className="font-medium text-gray-700">{step.count.toLocaleString()}{step.conversion_from_prev !== undefined && ` · ${step.conversion_from_prev}% desde anterior`}</span>
                                            </div>
                                            <div className="bg-gray-100 rounded-full h-3 overflow-hidden">
                                                <div
                                                    className="h-3 rounded-full transition-all duration-500"
                                                    style={{ width: `${pct}%`, backgroundColor: FUNNEL_COLORS[i] || '#6366f1' }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Top products + Searches */}
                    <div className="grid lg:grid-cols-2 gap-4">
                        {/* Top Products */}
                        <div className="bg-white rounded-2xl shadow p-5">
                            <h2 className="font-semibold text-gray-800 mb-4">🏆 Top productos vendidos</h2>
                            {topProducts.length === 0 ? (
                                <p className="text-gray-400 text-sm text-center py-8">Sin ventas en el período</p>
                            ) : (
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart data={topProducts} layout="vertical" margin={{ left: 10 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                        <XAxis type="number" tick={{ fontSize: 11 }} />
                                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                                        <Tooltip formatter={(v: number) => [`${v} unidades`, 'Vendidas']} />
                                        <Bar dataKey="units_sold" radius={[0, 4, 4, 0]}>
                                            {topProducts.map((_, i) => (
                                                <Cell key={i} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>

                        {/* Failed Searches */}
                        <div className="bg-white rounded-2xl shadow p-5">
                            <h2 className="font-semibold text-gray-800 mb-1">🔍 Motor de búsqueda</h2>
                            <div className="flex gap-4 mb-4">
                                <div className="text-center">
                                    <p className="text-xl font-bold text-indigo-600">{searches.performance?.total_searches || 0}</p>
                                    <p className="text-xs text-gray-400">Búsquedas</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xl font-bold text-emerald-600">{((searches.performance?.success_rate || 0) * 100).toFixed(0)}%</p>
                                    <p className="text-xs text-gray-400">Éxito</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xl font-bold text-gray-700">{Math.round(searches.performance?.avg_response_time_ms || 0)}ms</p>
                                    <p className="text-xs text-gray-400">Tiempo avg</p>
                                </div>
                            </div>
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Sin resultado (oportunidades de inventario):</p>
                            {searches.failed_searches?.length === 0 ? (
                                <p className="text-gray-400 text-sm">¡Todas las búsquedas encuentran resultados! 🎉</p>
                            ) : (
                                <div className="space-y-1 max-h-32 overflow-y-auto">
                                    {searches.failed_searches?.map((fs, i) => (
                                        <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-50">
                                            <span className="text-gray-700">"{fs.query}"</span>
                                            <span className="text-red-500 font-medium">{fs.frequency}x</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Customers */}
                    <div className="bg-white rounded-2xl shadow p-5">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="font-semibold text-gray-800">👥 Clientes</h2>
                            <div className="flex gap-3 text-sm">
                                <span className="text-gray-500">Total: <b>{customers.summary?.total}</b></span>
                                <span className="text-blue-500">🆕 Nuevos: <b>{customers.summary?.new}</b></span>
                                <span className="text-green-600">🔄 Recurrentes: <b>{customers.summary?.returning}</b></span>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-xs text-gray-400 uppercase border-b">
                                        <th className="pb-2">Teléfono</th>
                                        <th className="pb-2">Nombre</th>
                                        <th className="pb-2">Tipo</th>
                                        <th className="pb-2 text-right">Pedidos</th>
                                        <th className="pb-2 text-right">Total gastado</th>
                                        <th className="pb-2 text-right">Última compra</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {customers.customers?.map((c, i) => (
                                        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                                            <td className="py-2 font-mono text-gray-500">{c.phone_display}</td>
                                            <td className="py-2">{c.name || '—'}</td>
                                            <td className="py-2">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.type === 'recurrente' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {c.type === 'recurrente' ? '🔄 Recurrente' : '🆕 Nuevo'}
                                                </span>
                                            </td>
                                            <td className="py-2 text-right">{c.order_count}</td>
                                            <td className="py-2 text-right font-semibold">{formatCOP(c.total_spent)}</td>
                                            <td className="py-2 text-right text-gray-400 text-xs">{c.last_order?.slice(0, 10)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {customers.customers?.length === 0 && (
                                <p className="text-center text-gray-400 py-8">Sin clientes registrados aún</p>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
