"use client"

import { useState, useMemo } from "react"
import { ActivityFormModal } from "@/components/activities/ActivityFormModal"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
    Plus, ChevronLeft, ChevronRight,
    Clock, MapPin, Users, BookOpen, X,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function computeStatus(start: string, end: string) {
    const now = new Date()
    if (now < new Date(start)) return "programada"
    if (now > new Date(end)) return "finalizada"
    return "en_desarrollo"
}

const STATUS_META = {
    programada: { label: "Programada", dot: "bg-indigo-500", badge: "bg-indigo-100 text-indigo-700" },
    en_desarrollo: { label: "En desarrollo", dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700" },
    finalizada: { label: "Finalizada", dot: "bg-slate-400", badge: "bg-slate-100 text-slate-600" },
}

const TYPE_LABELS: Record<string, string> = {
    taller: "Taller", charla: "Charla", evento: "Evento",
    ceremonia: "Ceremonia", deportivo: "Deportivo", otro: "Otro",
}

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
const MONTHS = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

const fmtDateTime = (dt: string) =>
    new Date(dt).toLocaleDateString("es-CL", {
        weekday: "long", day: "numeric", month: "long",
        hour: "2-digit", minute: "2-digit",
    })

const fmtTime = (dt: string) =>
    new Date(dt).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })

// ─── Types ────────────────────────────────────────────────────────────────────
interface Course { id: string; name: string; section: string | null }
interface Props {
    activities: any[]
    courses: Course[]
    userId: string
    userRole: string
    institutionId: string
    canManage: boolean
}

// ─── Detail panel (reutilizado en desktop y mobile) ──────────────────────────
function ActivityDetail({
    activity,
    canManage,
    onClose,
    onEdit,
}: {
    activity: any
    canManage: boolean
    onClose: () => void
    onEdit: (a: any) => void
}) {
    const status = computeStatus(activity.start_datetime, activity.end_datetime)
    const meta = STATUS_META[status as keyof typeof STATUS_META]
    const activityCourses = (activity.activity_courses ?? [])
        .map((ac: any) => ac.courses?.name)
        .filter(Boolean)

    const materials: string[] = Array.isArray(activity.materials)
        ? activity.materials
        : typeof activity.materials === "string" && activity.materials.trim()
            ? activity.materials.split(",").map((m: string) => m.trim())
            : []

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-3">
                <h2 className="text-base font-semibold text-slate-900 leading-snug">
                    {activity.title}
                </h2>
                <button
                    onClick={onClose}
                    className="shrink-0 p-1 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-1.5 mb-4">
                <Badge className={cn("text-[11px]", meta.badge)}>
                    {meta.label}
                </Badge>
                {activity.activity_type && (
                    <Badge variant="outline" className="text-[11px]">
                        {TYPE_LABELS[activity.activity_type] ?? activity.activity_type}
                    </Badge>
                )}
                {activity.target === "general" && (
                    <Badge variant="outline" className="text-[11px]">
                        Toda la institución
                    </Badge>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 overflow-y-auto space-y-3">
                {/* Fecha/hora */}
                <div className="flex items-start gap-2.5 text-sm text-slate-600">
                    <Clock className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
                    <div>
                        <p className="capitalize">{fmtDateTime(activity.start_datetime)}</p>
                        {activity.end_datetime && (
                            <p className="text-xs text-slate-400 mt-0.5">
                                Hasta las {fmtTime(activity.end_datetime)}
                            </p>
                        )}
                    </div>
                </div>

                {/* Lugar */}
                {activity.location && (
                    <div className="flex items-center gap-2.5 text-sm text-slate-600">
                        <MapPin className="w-4 h-4 shrink-0 text-slate-400" />
                        <span>{activity.location}</span>
                    </div>
                )}

                {/* Cursos */}
                {activityCourses.length > 0 && (
                    <div className="flex items-start gap-2.5 text-sm text-slate-600">
                        <Users className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
                        <div className="flex flex-wrap gap-1">
                            {activityCourses.map((c: string) => (
                                <span key={c} className="bg-slate-100 rounded-full px-2 py-0.5 text-xs">
                                    {c}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Descripción */}
                {activity.description && (
                    <div className="rounded-lg bg-slate-50 border p-3 space-y-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            Descripción
                        </p>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">
                            {activity.description}
                        </p>
                    </div>
                )}

                {/* Materiales */}
                {materials.length > 0 && (
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                Materiales
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {materials.map((m) => (
                                <span key={m} className="bg-indigo-50 text-indigo-700 rounded-full px-2 py-0.5 text-xs">
                                    {m}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Acciones admin */}
            {canManage && (
                <div className="border-t pt-3 mt-3">
                    <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => onEdit(activity)}
                    >
                        Editar actividad
                    </Button>
                </div>
            )}
        </div>
    )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function ActivitiesClient({
    activities: initialActivities,
    courses, userId, userRole, institutionId, canManage,
}: Props) {
    const [activities, setActivities] = useState(initialActivities)
    const [currentDate, setCurrentDate] = useState(new Date())
    const [selectedActivity, setSelectedActivity] = useState<any | null>(null)
    const [mobileOpen, setMobileOpen] = useState(false)
    const [showForm, setShowForm] = useState(false)
    const [editActivity, setEditActivity] = useState<any | null>(null)

    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    // ── Construir grilla del mes ───────────────────────────────────────────────
    const calendarDays = useMemo(() => {
        const firstDay = new Date(year, month, 1)
        const startOffset = (firstDay.getDay() + 6) % 7  // Lunes = 0
        const daysInMonth = new Date(year, month + 1, 0).getDate()
        const days: (number | null)[] = []

        for (let i = 0; i < startOffset; i++) days.push(null)
        for (let i = 1; i <= daysInMonth; i++) days.push(i)
        while (days.length % 7 !== 0) days.push(null)

        return days
    }, [year, month])

    // ── Actividades por día del mes actual ────────────────────────────────────
    const activitiesByDay = useMemo(() => {
        const map: Record<number, any[]> = {}
        activities.forEach(a => {
            const d = new Date(a.start_datetime)
            if (d.getFullYear() === year && d.getMonth() === month) {
                const day = d.getDate()
                if (!map[day]) map[day] = []
                map[day].push(a)
            }
        })
        return map
    }, [activities, year, month])

    const today = new Date()
    const isToday = (day: number) =>
        day === today.getDate() &&
        month === today.getMonth() &&
        year === today.getFullYear()

    const handleSelect = (activity: any) => {
        setSelectedActivity(activity)
        setMobileOpen(true)
    }

    const handleClose = () => {
        setSelectedActivity(null)
        setMobileOpen(false)
    }

    const handleEdit = (activity: any) => {
        const courseIds = (activity.activity_courses ?? [])
            .map((ac: any) => ac.course_id).filter(Boolean)
        setEditActivity({ ...activity, courseIds })
        setShowForm(true)
        setMobileOpen(false)
    }

    const handleSaved = (saved: any) => {
        setActivities(prev => {
            const exists = prev.find(a => a.id === saved.id)
            return exists ? prev.map(a => a.id === saved.id ? saved : a) : [saved, ...prev]
        })
    }

    const handleDeleted = (id: string) => {
        setActivities(prev => prev.filter(a => a.id !== id))
        if (selectedActivity?.id === id) handleClose()
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Actividades</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Talleres, eventos y actividades de la institución
                    </p>
                </div>
                {canManage && (
                    <Button
                        size="sm"
                        onClick={() => { setEditActivity(null); setShowForm(true) }}
                        className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 shrink-0"
                    >
                        <Plus className="w-4 h-4" />
                        Nueva actividad
                    </Button>
                )}
            </div>

            {/* Leyenda de estados */}
            <div className="flex flex-wrap gap-3">
                {Object.entries(STATUS_META).map(([key, val]) => (
                    <div key={key} className="flex items-center gap-1.5 text-xs text-slate-500">
                        <span className={cn("w-2 h-2 rounded-full", val.dot)} />
                        {val.label}
                    </div>
                ))}
            </div>

            {/* Layout: Calendario + Panel detalle */}
            <div className="flex gap-4 items-start">

                {/* ── Calendario ──────────────────────────────────────────── */}
                <div className="flex-1 bg-white rounded-xl border shadow-sm overflow-hidden min-w-0">
                    {/* Navegación mes */}
                    <div className="flex items-center justify-between px-4 py-3 border-b">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-sm font-semibold text-slate-900 min-w-[150px] text-center">
                                {MONTHS[month]} {year}
                            </span>
                            <button
                                onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                        <button
                            onClick={() => setCurrentDate(new Date())}
                            className="text-xs font-medium text-indigo-600 hover:text-indigo-700 px-2 py-1 rounded hover:bg-indigo-50 transition-colors"
                        >
                            Hoy
                        </button>
                    </div>

                    {/* Nombres de días */}
                    <div className="grid grid-cols-7 border-b bg-slate-50/50">
                        {DAYS.map(d => (
                            <div key={d} className="py-2 text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                                {d}
                            </div>
                        ))}
                    </div>

                    {/* Grilla de días */}
                    <div className="grid grid-cols-7">
                        {calendarDays.map((day, i) => {
                            const dayActs = day ? (activitiesByDay[day] ?? []) : []

                            return (
                                <div
                                    key={i}
                                    className={cn(
                                        "min-h-[72px] sm:min-h-[90px] p-1 sm:p-1.5 border-b border-r",
                                        !day && "bg-slate-50/40",
                                        // Última fila sin borde inferior
                                        i >= calendarDays.length - 7 && "border-b-0"
                                    )}
                                >
                                    {day && (
                                        <>
                                            {/* Número del día */}
                                            <span className={cn(
                                                "inline-flex w-5 h-5 sm:w-6 sm:h-6 items-center justify-center rounded-full text-[11px] sm:text-xs font-medium mb-0.5",
                                                isToday(day)
                                                    ? "bg-indigo-600 text-white font-bold"
                                                    : "text-slate-600"
                                            )}>
                                                {day}
                                            </span>

                                            {/* Pills de actividades */}
                                            <div className="space-y-0.5">
                                                {dayActs.slice(0, 2).map(a => {
                                                    const status = computeStatus(a.start_datetime, a.end_datetime)
                                                    const dot = STATUS_META[status as keyof typeof STATUS_META]?.dot
                                                    const isSelected = selectedActivity?.id === a.id

                                                    return (
                                                        <button
                                                            key={a.id}
                                                            onClick={() => handleSelect(a)}
                                                            className={cn(
                                                                "w-full text-left rounded px-1 py-0.5 text-[10px] font-medium truncate transition-all flex items-center gap-1",
                                                                isSelected
                                                                    ? "bg-indigo-100 text-indigo-800 ring-1 ring-indigo-300"
                                                                    : "bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"
                                                            )}
                                                        >
                                                            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dot)} />
                                                            <span className="truncate hidden sm:inline">{a.title}</span>
                                                        </button>
                                                    )
                                                })}
                                                {dayActs.length > 2 && (
                                                    <button
                                                        onClick={() => handleSelect(dayActs[2])}
                                                        className="w-full text-left text-[10px] text-indigo-400 hover:text-indigo-600 px-1 font-medium"
                                                    >
                                                        +{dayActs.length - 2}
                                                    </button>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* ── Panel detalle — Desktop ──────────────────────────────── */}
                {selectedActivity && (
                    <div className="hidden md:flex flex-col w-[270px] shrink-0 bg-white rounded-xl border shadow-sm p-4 sticky top-4 max-h-[calc(100vh-140px)]">
                        <ActivityDetail
                            activity={selectedActivity}
                            canManage={canManage}
                            onClose={handleClose}
                            onEdit={handleEdit}
                        />
                    </div>
                )}
            </div>

            {/* ── Panel detalle — Mobile (Sheet desde abajo) ───────────────── */}
            <Sheet open={mobileOpen} onOpenChange={(o) => { if (!o) handleClose() }}>
                <SheetContent side="bottom" className="h-[75vh] rounded-t-2xl p-4 md:hidden overflow-y-auto">
                    <SheetHeader className="sr-only">
                        <SheetTitle>Detalle de actividad</SheetTitle>
                    </SheetHeader>
                    {selectedActivity && (
                        <ActivityDetail
                            activity={selectedActivity}
                            canManage={canManage}
                            onClose={handleClose}
                            onEdit={handleEdit}
                        />
                    )}
                </SheetContent>
            </Sheet>

            {/* Form modal */}
            {showForm && (
                <ActivityFormModal
                    institutionId={institutionId}
                    userId={userId}
                    courses={courses}
                    editActivity={editActivity}
                    onClose={() => { setShowForm(false); setEditActivity(null) }}
                    onSaved={handleSaved}
                />
            )}
        </div>
    )
}
