'use client';

import { useEffect, useState, useCallback } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConfigSchemaField {
    key: string;
    label: string;
    type: 'text' | 'textarea' | 'number' | 'boolean' | 'multiselect' | 'tags' | 'select';
    default: unknown;
    options?: { value: string; label: string }[];
    min?: number;
    max?: number;
    maxLength?: number;
    help?: string;
}

interface AvailableModule {
    id: string;
    name: string;
    icon: string;
    description: string;
    category: string;
    is_required: boolean;
    config_schema: ConfigSchemaField[];
    example_businesses: string[];
}

interface FlowModule {
    module_id: string;
    enabled: boolean;
    position: number;
    config: Record<string, unknown>;
    // enriched fields
    name?: string;
    icon?: string;
    description?: string;
    is_required?: boolean;
    config_schema?: ConfigSchemaField[];
}

const CATEGORY_COLORS: Record<string, string> = {
    core: 'bg-blue-100 text-blue-700',
    commerce: 'bg-green-100 text-green-700',
    compliance: 'bg-orange-100 text-orange-700',
    custom: 'bg-purple-100 text-purple-700',
};

const CATEGORY_LABELS: Record<string, string> = {
    core: 'Núcleo',
    commerce: 'Comercio',
    compliance: 'Cumplimiento',
    custom: 'Personalizado',
};

// ─── Config field renderer ─────────────────────────────────────────────────────

function ConfigField({
    field,
    value,
    onChange,
}: {
    field: ConfigSchemaField;
    value: unknown;
    onChange: (val: unknown) => void;
}) {
    const inputClass =
        'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400';

    if (field.type === 'boolean') {
        return (
            <label className="flex items-center gap-3 cursor-pointer">
                <div
                    onClick={() => onChange(!value)}
                    className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 cursor-pointer ${value ? 'bg-indigo-500' : 'bg-gray-300'}`}
                >
                    <div
                        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`}
                    />
                </div>
                <span className="text-sm text-gray-700">{field.label}</span>
            </label>
        );
    }

    if (field.type === 'textarea') {
        return (
            <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{field.label}</label>
                <textarea
                    rows={3}
                    value={(value as string) ?? ''}
                    onChange={(e) => onChange(e.target.value)}
                    className={`${inputClass} resize-none`}
                />
                {field.help && <p className="text-xs text-gray-400 mt-1">{field.help}</p>}
            </div>
        );
    }

    if (field.type === 'number') {
        return (
            <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{field.label}</label>
                <input
                    type="number"
                    min={field.min}
                    max={field.max}
                    value={(value as number) ?? field.default}
                    onChange={(e) => onChange(Number(e.target.value))}
                    className={`${inputClass} w-32`}
                />
                {field.help && <p className="text-xs text-gray-400 mt-1">{field.help}</p>}
            </div>
        );
    }

    if (field.type === 'multiselect') {
        const selected = (value as string[]) ?? (field.default as string[]) ?? [];
        return (
            <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">{field.label}</label>
                <div className="flex flex-wrap gap-2">
                    {(field.options ?? []).map((opt) => {
                        const isSelected = selected.includes(opt.value);
                        return (
                            <button
                                key={opt.value}
                                onClick={() => {
                                    const next = isSelected
                                        ? selected.filter((v) => v !== opt.value)
                                        : [...selected, opt.value];
                                    onChange(next);
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${isSelected
                                    ? 'bg-indigo-500 text-white border-indigo-500'
                                    : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-300'
                                    }`}
                            >
                                {opt.label}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    if (field.type === 'tags') {
        const tags = (value as string[]) ?? (field.default as string[]) ?? [];
        const [input, setInput] = useState('');
        return (
            <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{field.label}</label>
                <div className="flex flex-wrap gap-2 mb-2">
                    {tags.map((tag, i) => (
                        <span
                            key={i}
                            className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs px-2.5 py-1 rounded-full"
                        >
                            {tag}
                            <button
                                onClick={() => onChange(tags.filter((_, idx) => idx !== i))}
                                className="text-indigo-400 hover:text-indigo-700 leading-none ml-0.5"
                            >
                                ×
                            </button>
                        </span>
                    ))}
                </div>
                <input
                    type="text"
                    value={input}
                    placeholder={field.help ?? 'Escribe y presiona Enter'}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && input.trim()) {
                            onChange([...tags, input.trim()]);
                            setInput('');
                            e.preventDefault();
                        }
                    }}
                    className={inputClass}
                />
            </div>
        );
    }

    if (field.type === 'select') {
        return (
            <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{field.label}</label>
                <select
                    value={(value as string) ?? (field.default as string) ?? ''}
                    onChange={(e) => onChange(e.target.value)}
                    className={`${inputClass} bg-white`}
                >
                    {(field.options ?? []).map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
                {field.help && <p className="text-xs text-gray-400 mt-1">{field.help}</p>}
            </div>
        );
    }

    // Default: text
    return (
        <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{field.label}</label>
            <input
                type="text"
                maxLength={field.maxLength}
                value={(value as string) ?? ''}
                onChange={(e) => onChange(e.target.value)}
                className={inputClass}
            />
            {field.help && <p className="text-xs text-gray-400 mt-1">{field.help}</p>}
        </div>
    );
}

// ─── Module Card in the flow ───────────────────────────────────────────────────

function FlowCard({
    mod,
    index,
    total,
    onToggle,
    onMoveUp,
    onMoveDown,
    onConfigChange,
}: {
    mod: FlowModule;
    index: number;
    total: number;
    onToggle: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onConfigChange: (key: string, val: unknown) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const schema = mod.config_schema ?? [];

    return (
        <div
            className={`rounded-xl border-2 transition-all duration-200 ${mod.enabled
                ? 'border-indigo-200 bg-white shadow-sm'
                : 'border-dashed border-gray-200 bg-gray-50 opacity-60'
                }`}
        >
            {/* Header */}
            <div className="flex items-center gap-3 p-4">
                {/* Drag handle / position */}
                <div className="flex flex-col gap-0.5">
                    <button
                        onClick={onMoveUp}
                        disabled={index === 0}
                        className="text-gray-300 hover:text-gray-600 disabled:opacity-20 disabled:cursor-not-allowed text-xs leading-none"
                    >
                        ▲
                    </button>
                    <button
                        onClick={onMoveDown}
                        disabled={index === total - 1}
                        className="text-gray-300 hover:text-gray-600 disabled:opacity-20 disabled:cursor-not-allowed text-xs leading-none"
                    >
                        ▼
                    </button>
                </div>

                {/* Position badge */}
                <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {index + 1}
                </div>

                {/* Icon + name */}
                <span className="text-2xl">{mod.icon ?? '⚙️'}</span>
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{mod.name ?? mod.module_id}</p>
                    <p className="text-xs text-gray-400 truncate">{mod.description ?? ''}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    {schema.length > 0 && (
                        <button
                            onClick={() => setExpanded(!expanded)}
                            className="text-xs text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded hover:bg-indigo-50 transition-colors font-medium"
                        >
                            {expanded ? '▲ Cerrar' : '⚙️ Config'}
                        </button>
                    )}
                    {!mod.is_required && (
                        <button
                            onClick={onToggle}
                            className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${mod.enabled ? 'bg-indigo-500' : 'bg-gray-300'}`}
                        >
                            <div
                                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${mod.enabled ? 'translate-x-5' : 'translate-x-0.5'}`}
                            />
                        </button>
                    )}
                </div>
            </div>

            {/* Config panel */}
            {expanded && schema.length > 0 && (
                <div className="border-t border-gray-100 p-4 space-y-4 bg-gray-50 rounded-b-xl">
                    {schema.map((f) => (
                        <ConfigField
                            key={f.key}
                            field={f}
                            value={mod.config[f.key] ?? f.default}
                            onChange={(val) => onConfigChange(f.key, val)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Main Flow Builder Page ────────────────────────────────────────────────────

export default function FlowBuilderPage() {
    const [flow, setFlow] = useState<FlowModule[]>([]);
    const [available, setAvailable] = useState<AvailableModule[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
    const TENANT_ID = 'default';

    // Load available modules + current flow
    useEffect(() => {
        Promise.all([
            fetch(`${API_BASE}/api/modules/available`).then((r) => r.json()),
            fetch(`${API_BASE}/api/modules/flow?tenant_id=${TENANT_ID}`).then((r) => r.json()),
        ])
            .then(([avail, flowData]) => {
                setAvailable(avail.modules ?? []);
                setFlow(flowData.flow ?? []);
            })
            .catch(() => setFeedback({ type: 'error', msg: '❌ No se pudo conectar al servidor.' }))
            .finally(() => setLoading(false));
    }, []);

    const moveModule = useCallback((index: number, direction: 'up' | 'down') => {
        setFlow((prev) => {
            const next = [...prev];
            const swapIdx = direction === 'up' ? index - 1 : index + 1;
            if (swapIdx < 0 || swapIdx >= next.length) return prev;
            [next[index], next[swapIdx]] = [next[swapIdx], next[index]];
            return next.map((m, i) => ({ ...m, position: i + 1 }));
        });
    }, []);

    const toggleModule = useCallback((index: number) => {
        setFlow((prev) =>
            prev.map((m, i) => (i === index ? { ...m, enabled: !m.enabled } : m))
        );
    }, []);

    const updateConfig = useCallback((index: number, key: string, val: unknown) => {
        setFlow((prev) =>
            prev.map((m, i) =>
                i === index ? { ...m, config: { ...m.config, [key]: val } } : m
            )
        );
    }, []);

    const addModule = useCallback(
        (mod: AvailableModule) => {
            const alreadyInFlow = flow.some((f) => f.module_id === mod.id);
            if (alreadyInFlow) return;
            const defaults: Record<string, unknown> = {};
            (mod.config_schema ?? []).forEach((f) => { defaults[f.key] = f.default; });
            setFlow((prev) => [
                ...prev,
                {
                    module_id: mod.id,
                    name: mod.name,
                    icon: mod.icon,
                    description: mod.description,
                    is_required: mod.is_required,
                    config_schema: mod.config_schema,
                    enabled: true,
                    position: prev.length + 1,
                    config: defaults,
                },
            ]);
        },
        [flow]
    );

    const handleSave = async () => {
        setSaving(true);
        setFeedback(null);
        try {
            const payload = {
                tenant_id: TENANT_ID,
                modules: flow.map((m, i) => ({
                    module_id: m.module_id,
                    enabled: m.enabled,
                    position: i + 1,
                    config: m.config,
                })),
            };
            const res = await fetch(`${API_BASE}/api/modules/flow`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                setFeedback({ type: 'success', msg: '✅ Flujo guardado. Los cambios aplican en máximo 60 segundos.' });
            } else {
                const err = await res.json();
                setFeedback({ type: 'error', msg: `❌ ${err.detail ?? 'Error al guardar'}` });
            }
        } catch {
            setFeedback({ type: 'error', msg: '❌ Error de conexión.' });
        } finally {
            setSaving(false);
            setTimeout(() => setFeedback(null), 6000);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
            </div>
        );
    }

    // Group available modules by category (only modules not already in flow)
    const flowIds = new Set(flow.map((f) => f.module_id));
    const groupedAvailable = available.reduce<Record<string, AvailableModule[]>>((acc, m) => {
        if (flowIds.has(m.id)) return acc;
        const cat = m.category ?? 'custom';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(m);
        return acc;
    }, {});

    return (
        <div className="min-h-screen bg-[#f6f6f7]">
            {/* Top Bar */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">🧩 Flow Builder</h1>
                    <p className="text-xs text-gray-400 mt-0.5">
                        Arrastra, activa o configura los módulos de tu chatbot
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {feedback && (
                        <p
                            className={`text-sm font-medium px-4 py-2 rounded-lg ${feedback.type === 'success'
                                ? 'bg-green-50 text-green-700'
                                : 'bg-red-50 text-red-600'
                                }`}
                        >
                            {feedback.msg}
                        </p>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving ? (
                            <>
                                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                Guardando...
                            </>
                        ) : (
                            'Guardar flujo'
                        )}
                    </button>
                </div>
            </div>

            <div className="flex gap-6 p-6 max-w-6xl mx-auto">
                {/* ── Left: Current flow ────────────────────────────────────────── */}
                <div className="flex-1 min-w-0">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                        Flujo activo ({flow.length} módulos)
                    </h2>

                    {flow.length === 0 && (
                        <div className="border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center text-gray-400">
                            <p className="text-4xl mb-2">📭</p>
                            <p className="text-sm">Agrega módulos desde el panel de la derecha</p>
                        </div>
                    )}

                    <div className="space-y-3">
                        {flow.map((mod, index) => (
                            <FlowCard
                                key={mod.module_id}
                                mod={mod}
                                index={index}
                                total={flow.length}
                                onToggle={() => toggleModule(index)}
                                onMoveUp={() => moveModule(index, 'up')}
                                onMoveDown={() => moveModule(index, 'down')}
                                onConfigChange={(key, val) => updateConfig(index, key, val)}
                            />
                        ))}
                    </div>
                </div>

                {/* ── Right: Available modules ───────────────────────────────────── */}
                <div className="w-72 flex-shrink-0">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                        Módulos disponibles
                    </h2>

                    {Object.keys(groupedAvailable).length === 0 && (
                        <div className="text-center text-gray-400 text-sm py-6">
                            <p>✅ Todos los módulos están en el flujo</p>
                        </div>
                    )}

                    <div className="space-y-4">
                        {Object.entries(groupedAvailable).map(([category, mods]) => (
                            <div key={category}>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                                    {CATEGORY_LABELS[category] ?? category}
                                </p>
                                <div className="space-y-2">
                                    {mods.map((mod) => (
                                        <button
                                            key={mod.id}
                                            onClick={() => addModule(mod)}
                                            className="w-full text-left bg-white border border-gray-200 rounded-xl p-3 hover:border-indigo-300 hover:bg-indigo-50 transition-all group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl">{mod.icon}</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-gray-800 group-hover:text-indigo-700 truncate">
                                                        {mod.name}
                                                    </p>
                                                    <p className="text-xs text-gray-400 truncate">{mod.description}</p>
                                                </div>
                                                <span className="text-indigo-500 text-lg leading-none opacity-0 group-hover:opacity-100 transition-opacity">
                                                    +
                                                </span>
                                            </div>
                                            <div className="flex gap-1 mt-2 flex-wrap">
                                                <span
                                                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[mod.category] ?? 'bg-gray-100 text-gray-600'}`}
                                                >
                                                    {CATEGORY_LABELS[mod.category] ?? mod.category}
                                                </span>
                                                {mod.example_businesses.slice(0, 2).map((b) => (
                                                    <span key={b} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                                                        {b}
                                                    </span>
                                                ))}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Legend */}
                    <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                        <p className="text-xs font-semibold text-amber-800 mb-2">💡 Cómo funciona</p>
                        <ul className="text-xs text-amber-700 space-y-1">
                            <li>• El bot ejecuta cada módulo en orden</li>
                            <li>• Desactiva módulos sin eliminarlos</li>
                            <li>• Reordena con las flechas ▲▼</li>
                            <li>• Configura con el botón ⚙️ Config</li>
                            <li>• Guarda para aplicar los cambios</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
