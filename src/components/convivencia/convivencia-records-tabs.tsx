"use client"

import { useState, useTransition, useMemo } from "react"
import { createConvivenciaRecord, resolveConvivenciaRecord } from "@/app/(dashboard)/registros-convivencia/actions"
import { toast } from "sonner"
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer
} from "recharts"
import { ClipboardList, Plus, History, TrendingUp, TrendingDown, Minus, CheckCircle, ChevronDown, ChevronUp, Search, X } from "lucide-react"

// ── Constants ──────────────────────────────────────────────────────────────────
const RECORD_TYPES: { value: string; label: string }[] = [
    { value: "pelea", label: "Pelea" },
    { value: "fuga", label: "Fuga / Escapada" },
    { value: "daño_material", label: "Daño Material" },
    { value: "amenaza", label: "Amenaza" },
    { value: "acoso", label: "Acoso" },
    { value: "consumo", label: "Consumo de Sustancias" },
    { value: "conflicto_grupal", label: "Conflicto Grupal" },
    { value: "otro", label: "Otro" },
]

const SEVERITIES = [
    { value: "leve", label: "Leve", color: "bg-yellow-100 text-yellow-700 border-yellow-300" },
    { value: "moderada", label: "Moderada", color: "bg-orange-100 text-orange-700 border-orange-300" },
    { value: "grave", label: "Grave", color: "bg-red-100 text-red-700 border-red-300" },
]

const ACTIONS_OPTIONS = [
    "Contacto con apoderado",
    "Derivación a convivencia",
    "Derivación a dupla psicosocial",
    "Derivación a dirección",
    "Citación a apoderado",
    "Acompañamiento en patio",
    "Mediación entre partes",
    "Parte policial",
    "Suspensión",
]

const SEVERITY_COLORS: { [key: string]: string } = {
    leve: "bg-yellow-100 text-yellow-700",
    moderada: "bg-orange-100 text-orange-700",
    grave: "bg-red-100 text-red-700",
}

// ── Types ──────────────────────────────────────────────────────────────────────
interface Student {
    id: string
    name: string
    last_name: string
    rut?: string | null
    courses?: { name: string } | null
}

interface InvolvedStudent {
    student_id: string
    students: { id: string; name: string; last_name: string } | null
}

interface ConvivenciaRecord {
    id: string
    type: string
    severity: string
    location: string | null
    description: string
    involved_count: number
    actions_taken: string[]
    resolved: boolean
    resolution_notes?: string | null
    incident_date: string
    convivencia_record_students?: InvolvedStudent[]
}

interface Props {
    initialRecords: ConvivenciaRecord[]
    students: Student[]
    reporterName: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function getWeekKey(dateStr: string): string {
    const d = new Date(dateStr)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    const mon = new Date(d)
    mon.setDate(diff)
    return mon.toLocaleDateString("es-CL", { day: "numeric", month: "short" })
}

function buildWeeklyChart(records: ConvivenciaRecord[]) {
    const weekMap: { [key: string]: number } = {}
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now)
        d.setDate(now.getDate() - i * 7)
        weekMap[getWeekKey(d.toISOString())] = 0
    }
    for (const r of records) {
        const key = getWeekKey(r.incident_date)
        if (key in weekMap) weekMap[key]++
    }
    return Object.entries(weekMap).map(([semana, casos]) => ({ semana, casos: casos as number }))
}

// ── Student Picker ─────────────────────────────────────────────────────────────
function StudentPicker({
    allStudents,
    selected,
    onChange,
}: {
    allStudents: Student[]
    selected: Student[]
    onChange: (s: Student[]) => void
}) {
    const [query, setQuery] = useState("")
    const [open, setOpen] = useState(false)

    const filtered = useMemo(() => {
        if (!query.trim()) return []
        const q = query.toLowerCase()
        return allStudents
            .filter(s => !selected.find(x => x.id === s.id))
            .filter(s =>
                `${s.name} ${s.last_name}`.toLowerCase().includes(q) ||
                (s.rut ?? "").toLowerCase().includes(q)
            )
            .slice(0, 8)
    }, [query, allStudents, selected])

    function pick(s: Student) {
        onChange([...selected, s])
        setQuery("")
        setOpen(false)
    }

    function remove(id: string) {
        onChange(selected.filter(s => s.id !== id))
    }

    return (
        <div>
            <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Search className="w-4 h-4 text-slate-400" />
                </div>
                <input
                    type="text"
                    value={query}
                    onChange={e => { setQuery(e.target.value); setOpen(true) }}
                    onFocus={() => setOpen(true)}
                    placeholder="Buscar por nombre o RUT..."
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                {open && filtered.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                        {filtered.map(s => (
                            <button
                                type="button"
                                key={s.id}
                                onClick={() => pick(s)}
                                className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 transition-colors flex items-center justify-between gap-2"
                            >
                                <span className="text-sm font-medium text-slate-800">
                                    {s.last_name}, {s.name}
                                </span>
                                <div className="flex items-center gap-2 shrink-0">
                                    {s.rut && <span className="text-xs text-slate-400">{s.rut}</span>}
                                    {(s.courses as any)?.name && (
                                        <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                                            {(s.courses as any).name}
                                        </span>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {selected.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                    {selected.map(s => (
                        <span key={s.id} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium">
                            {s.last_name}, {s.name}
                            <button type="button" onClick={() => remove(s.id)} className="hover:text-red-500 transition-colors">
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    )
}

// ── Resolve Row ────────────────────────────────────────────────────────────────
function ResolveRow({ record, onResolved }: {
    record: ConvivenciaRecord
    onResolved: (id: string, notes: string) => void
}) {
    const [open, setOpen] = useState(false)
    const [notes, setNotes] = useState(record.resolution_notes ?? "")
    const [pending, startTransition] = useTransition()

    if (record.resolved) {
        return (
            <div className="mt-2 pl-2 border-l-2 border-emerald-300">
                <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Resuelto
                </p>
                {record.resolution_notes && (
                    <p className="text-xs text-slate-500 mt-0.5">{record.resolution_notes}</p>
                )}
            </div>
        )
    }

    return (
        <div className="mt-2">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-indigo-600 transition-colors"
            >
                {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {open ? "Cerrar" : "Registrar resolución / medidas tomadas"}
            </button>

            {open && (
                <div className="mt-2 space-y-2">
                    <textarea
                        rows={3}
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Describe cómo se resolvió el caso, qué medidas se tomaron, acuerdos, sanciones, etc."
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                    />
                    <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                            startTransition(async () => {
                                const result = await resolveConvivenciaRecord(record.id, notes.trim())
                                if (result?.error) {
                                    toast.error(result.error)
                                } else {
                                    toast.success("Caso marcado como resuelto")
                                    onResolved(record.id, notes.trim())
                                    setOpen(false)
                                }
                            })
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    >
                        <CheckCircle className="w-3.5 h-3.5" />
                        {pending ? "Guardando..." : "Marcar como resuelto"}
                    </button>
                </div>
            )}
        </div>
    )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function ConvivenciaRecordsTabs({ initialRecords, students, reporterName }: Props) {
    const [tab, setTab] = useState<"nuevo" | "historial">("nuevo")
    const [records, setRecords] = useState<ConvivenciaRecord[]>(initialRecords)
    const [pending, startTransition] = useTransition()

    // Form state
    const [type, setType] = useState("")
    const [severity, setSeverity] = useState("moderada")
    const [location, setLocation] = useState("")
    const [description, setDescription] = useState("")
    const [involvedStudents, setInvolvedStudents] = useState<Student[]>([])
    const [actions, setActions] = useState<string[]>([])
    const [otherAction, setOtherAction] = useState("")
    const [incidentDate, setIncidentDate] = useState(new Date().toISOString().slice(0, 16))

    // Stats
    const last30 = useMemo(() => {
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() - 30)
        return records.filter((r: ConvivenciaRecord) => new Date(r.incident_date) >= cutoff)
    }, [records])

    const lastWeek = useMemo(() => {
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() - 7)
        return records.filter((r: ConvivenciaRecord) => new Date(r.incident_date) >= cutoff)
    }, [records])

    const prevWeek = useMemo(() => {
        const from = new Date()
        from.setDate(from.getDate() - 14)
        const to = new Date()
        to.setDate(to.getDate() - 7)
        return records.filter((r: ConvivenciaRecord) => {
            const d = new Date(r.incident_date)
            return d >= from && d < to
        })
    }, [records])

    const weekDiff = lastWeek.length - prevWeek.length
    const weekPct = prevWeek.length > 0 ? Math.abs(Math.round((weekDiff / prevWeek.length) * 100)) : null

    const topType = useMemo(() => {
        if (last30.length === 0) return null
        const counts: { [key: string]: number } = {}
        for (const r of last30) counts[r.type] = (counts[r.type] ?? 0) + 1
        const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
        return RECORD_TYPES.find(t => t.value === top[0]) ?? null
    }, [last30])

    const weeklyData = useMemo(() => buildWeeklyChart(records), [records])

    function toggleAction(a: string) {
        setActions(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a])
    }

    function handleResolved(id: string, notes: string) {
        setRecords(prev => prev.map(r => r.id === id ? { ...r, resolved: true, resolution_notes: notes } : r))
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!type) { toast.error("Selecciona el tipo de caso"); return }
        if (!description.trim()) { toast.error("La descripción es obligatoria"); return }

        const allActions = [...actions, ...(otherAction.trim() ? [otherAction.trim()] : [])]
        const parsedDate = new Date(incidentDate).toISOString()

        startTransition(async () => {
            const result = await createConvivenciaRecord({
                type,
                severity,
                location: location.trim(),
                description: description.trim(),
                involved_count: Math.max(involvedStudents.length, 1),
                student_ids: involvedStudents.map(s => s.id),
                actions_taken: allActions,
                incident_date: parsedDate,
            })

            if (result?.error) {
                toast.error(result.error)
            } else {
                toast.success("Registro creado correctamente")

                // Optimistic update
                const newRecord: ConvivenciaRecord = {
                    id: (result as any).id ?? crypto.randomUUID(),
                    type,
                    severity,
                    location: location.trim() || null,
                    description: description.trim(),
                    involved_count: Math.max(involvedStudents.length, 1),
                    actions_taken: allActions,
                    resolved: false,
                    resolution_notes: null,
                    incident_date: parsedDate,
                    convivencia_record_students: involvedStudents.map(s => ({
                        student_id: s.id,
                        students: { id: s.id, name: s.name, last_name: s.last_name },
                    })),
                }
                setRecords(prev => [newRecord, ...prev])

                // Reset
                setType(""); setSeverity("moderada"); setLocation("")
                setDescription(""); setInvolvedStudents([])
                setActions([]); setOtherAction("")
                setIncidentDate(new Date().toISOString().slice(0, 16))
                setTab("historial")
            }
        })
    }

    return (
        <div className="space-y-6">
            {/* Tab switcher */}
            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
                {[
                    { key: "nuevo", label: "Nuevo Registro", icon: Plus },
                    { key: "historial", label: "Historial", icon: History },
                ].map(({ key, label, icon: Icon }) => (
                    <button
                        key={key}
                        onClick={() => setTab(key as "nuevo" | "historial")}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === key
                            ? "bg-white text-slate-800 shadow-sm"
                            : "text-slate-500 hover:text-slate-700"}`}
                    >
                        <Icon className="w-4 h-4" />
                        {label}
                        {key === "historial" && records.length > 0 && (
                            <span className="ml-1 bg-indigo-100 text-indigo-600 text-xs rounded-full px-1.5 py-0.5 font-semibold">
                                {records.length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* ── FORM ── */}
            {tab === "nuevo" && (
                <form onSubmit={handleSubmit} className="bg-white rounded-2xl border shadow-sm p-6 space-y-6">
                    {/* Tipo */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-3">
                            Tipo de Caso <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {RECORD_TYPES.map(t => (
                                <button type="button" key={t.value} onClick={() => setType(t.value)}
                                    className={`px-3 py-2.5 rounded-xl border text-center text-xs font-medium transition-all ${type === t.value
                                        ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                                        : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"}`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Gravedad */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-3">Gravedad</label>
                        <div className="flex gap-2 flex-wrap">
                            {SEVERITIES.map(s => (
                                <button type="button" key={s.value} onClick={() => setSeverity(s.value)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${severity === s.value
                                        ? s.color + " shadow-sm"
                                        : "bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300"}`}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Fecha */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Fecha y hora del suceso</label>
                        <input type="datetime-local" value={incidentDate} onChange={e => setIncidentDate(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                    </div>

                    {/* Lugar */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Lugar del establecimiento</label>
                        <input type="text" value={location} onChange={e => setLocation(e.target.value)}
                            placeholder="Ej: Patio central, Sala 3B, Baños..."
                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                    </div>

                    {/* Estudiantes involucrados */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Estudiantes involucrados
                            {involvedStudents.length > 0 && (
                                <span className="ml-2 text-xs font-normal text-indigo-600">{involvedStudents.length} seleccionados</span>
                            )}
                        </label>
                        <StudentPicker
                            allStudents={students}
                            selected={involvedStudents}
                            onChange={setInvolvedStudents}
                        />
                        {involvedStudents.length === 0 && (
                            <p className="mt-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                                ⚠️ Si no asignas estudiantes, el caso <strong>no aparecerá en el perfil de ningún estudiante</strong>. Busca y selecciona los involucrados para vincularlos.
                            </p>
                        )}
                    </div>

                    {/* Descripción */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Descripción del suceso <span className="text-red-500">*</span>
                        </label>
                        <textarea rows={4} value={description} onChange={e => setDescription(e.target.value)}
                            placeholder="Describe detalladamente qué ocurrió, quiénes participaron y el contexto..."
                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                        />
                    </div>

                    {/* Acciones */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-3">Acciones tomadas de inmediato</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {ACTIONS_OPTIONS.map(a => (
                                <label key={a} className="flex items-center gap-2.5 cursor-pointer">
                                    <input type="checkbox" checked={actions.includes(a)} onChange={() => toggleAction(a)}
                                        className="w-4 h-4 rounded accent-indigo-600"
                                    />
                                    <span className="text-sm text-slate-700">{a}</span>
                                </label>
                            ))}
                        </div>
                        <input type="text" value={otherAction} onChange={e => setOtherAction(e.target.value)}
                            placeholder="Otra acción tomada..."
                            className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                    </div>

                    <div className="pt-2">
                        <button type="submit" disabled={pending}
                            className="w-full sm:w-auto px-8 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {pending ? "Registrando..." : "Registrar Caso"}
                        </button>
                    </div>
                </form>
            )}

            {/* ── HISTORIAL ── */}
            {tab === "historial" && (
                <div className="space-y-6">
                    {/* Stat cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white rounded-2xl border p-4 shadow-sm">
                            <p className="text-xs font-medium text-slate-500">Últimos 30 días</p>
                            <p className="text-3xl font-bold text-slate-800 mt-1">{last30.length}</p>
                            <p className="text-xs text-slate-400 mt-1">casos registrados</p>
                        </div>
                        <div className="bg-white rounded-2xl border p-4 shadow-sm">
                            <p className="text-xs font-medium text-slate-500">Esta semana</p>
                            <div className="flex items-center gap-1.5 mt-1">
                                <p className="text-3xl font-bold text-slate-800">{lastWeek.length}</p>
                                {weekDiff > 0 && <TrendingUp className="w-5 h-5 text-red-500" />}
                                {weekDiff < 0 && <TrendingDown className="w-5 h-5 text-emerald-500" />}
                                {weekDiff === 0 && <Minus className="w-5 h-5 text-slate-400" />}
                            </div>
                            <p className="text-xs mt-1">
                                {weekPct !== null
                                    ? <span className={weekDiff > 0 ? "text-red-500" : "text-emerald-500"}>{weekDiff > 0 ? "+" : "-"}{weekPct}% vs semana pasada</span>
                                    : <span className="text-slate-400">Sin datos previos</span>}
                            </p>
                        </div>
                        <div className="bg-white rounded-2xl border p-4 shadow-sm">
                            <p className="text-xs font-medium text-slate-500">Tipo más frecuente</p>
                            {topType
                                ? <p className="text-sm font-semibold text-slate-700 mt-2">{topType.label}</p>
                                : <p className="text-slate-400 text-sm mt-1">Sin datos</p>}
                        </div>
                        <div className="bg-white rounded-2xl border p-4 shadow-sm">
                            <p className="text-xs font-medium text-slate-500">Casos graves</p>
                            <p className="text-3xl font-bold text-red-600 mt-1">{last30.filter(r => r.severity === "grave").length}</p>
                            <p className="text-xs text-slate-400 mt-1">últimos 30 días</p>
                        </div>
                    </div>

                    {/* Chart */}
                    <div className="bg-white rounded-2xl border shadow-sm p-6">
                        <h3 className="text-sm font-semibold text-slate-700 mb-4">Casos por semana (últimas 6 semanas)</h3>
                        <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={weeklyData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="semana" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px" }} formatter={(v) => [v, "Casos"]} />
                                <Bar dataKey="casos" fill="#6366f1" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* List */}
                    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b">
                            <h3 className="font-semibold text-slate-800">Todos los registros</h3>
                            <p className="text-xs text-slate-400 mt-0.5">
                                {records.length} en total · {records.filter(r => r.resolved).length} resueltos
                            </p>
                        </div>

                        {records.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                                <ClipboardList className="w-12 h-12 mb-3 opacity-30" />
                                <p className="text-sm font-medium">No hay registros aún</p>
                                <button onClick={() => setTab("nuevo")} className="mt-3 text-xs text-indigo-600 hover:underline">
                                    Registrar el primer caso →
                                </button>
                            </div>
                        ) : (
                            <div className="divide-y">
                                {records.map(r => {
                                    const rtype = RECORD_TYPES.find(t => t.value === r.type)
                                    const involvedList = (r.convivencia_record_students ?? [])
                                        .map(rs => rs.students)
                                        .filter(Boolean)

                                    return (
                                        <div key={r.id} className={`px-6 py-4 hover:bg-slate-50 transition-colors ${r.resolved ? "opacity-70" : ""}`}>
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-semibold text-slate-800 text-sm">{rtype?.label ?? r.type}</span>
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SEVERITY_COLORS[r.severity] ?? ""}`}>
                                                            {r.severity}
                                                        </span>
                                                        {r.resolved && (
                                                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                                                                Resuelto
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{r.description}</p>
                                                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-slate-400">
                                                        {r.location && <span>📍 {r.location}</span>}
                                                        <span>👥 {r.involved_count} persona{r.involved_count > 1 ? "s" : ""}</span>
                                                    </div>
                                                    {/* Involved students */}
                                                    {involvedList.length > 0 && (
                                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                                            {involvedList.map((s: any) => (
                                                                <span key={s.id} className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs">
                                                                    {s.last_name}, {s.name}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-xs text-slate-400">
                                                        {new Date(r.incident_date).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" })}
                                                    </p>
                                                    <p className="text-xs text-slate-300 mt-0.5">
                                                        {new Date(r.incident_date).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
                                                    </p>
                                                </div>
                                            </div>

                                            {r.actions_taken?.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {r.actions_taken.map(a => (
                                                        <span key={a} className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-xs">{a}</span>
                                                    ))}
                                                </div>
                                            )}

                                            <ResolveRow record={r} onResolved={handleResolved} />
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
