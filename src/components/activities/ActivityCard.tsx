"use client"

import { useState } from "react"
import {
    MapPin, Calendar, Paperclip, Users,
    Pencil, Trash2, Clock, ChevronDown, ChevronUp
} from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

export type ActivityStatus = "programada" | "en_desarrollo" | "finalizada"

const STATUS_CONFIG: Record<ActivityStatus, { label: string; badge: string; dot: string; bar: string }> = {
    programada: { label: "Programada", badge: "text-blue-700 bg-blue-50 border-blue-200", dot: "bg-blue-400", bar: "bg-blue-400" },
    en_desarrollo: { label: "En desarrollo", badge: "text-green-700 bg-green-50 border-green-200", dot: "bg-green-500", bar: "bg-green-500" },
    finalizada: { label: "Finalizada", badge: "text-slate-500 bg-slate-50 border-slate-200", dot: "bg-slate-400", bar: "bg-slate-300" },
}

const ACTIVITY_TYPE_EMOJI: Record<string, string> = {
    taller: "🎨", charla: "🎤", deporte: "⚽", cultural: "🎭",
    academico: "📚", reunion: "🤝", otro: "📌",
}

export function computeStatus(start: string | null, end: string | null): ActivityStatus {
    if (!start) return "programada"
    const now = new Date()
    const startDate = new Date(start)
    const endDate = end ? new Date(end) : null
    if (now < startDate) return "programada"
    if (!endDate || now <= endDate) return "en_desarrollo"
    return "finalizada"
}

function formatDate(dt: string | null) {
    if (!dt) return "—"
    return new Date(dt).toLocaleDateString("es-CL", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
    })
}

function formatTime(dt: string | null) {
    if (!dt) return "—"
    return new Date(dt).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })
}

function formatDuration(start: string | null, end: string | null) {
    if (!start || !end) return null
    const diff = new Date(end).getTime() - new Date(start).getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    if (hours === 0) return `${minutes} min`
    if (minutes === 0) return `${hours} hr${hours > 1 ? "s" : ""}`
    return `${hours} hr${hours > 1 ? "s" : ""} ${minutes} min`
}

function CountdownBadge({ start, end }: { start: string | null; end: string | null }) {
    if (!start) return null
    const now = new Date()
    const startDate = new Date(start)
    const endDate = end ? new Date(end) : null

    // En desarrollo — tiempo restante para terminar
    if (endDate && now >= startDate && now <= endDate) {
        const diff = endDate.getTime() - now.getTime()
        const hours = Math.floor(diff / (1000 * 60 * 60))
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        return (
            <span className="text-[10px] font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                Termina en {hours > 0 ? `${hours}h ` : ""}{mins}min
            </span>
        )
    }

    // Programada — tiempo para empezar
    if (now < startDate) {
        const diff = startDate.getTime() - now.getTime()
        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        if (days > 0) return (
            <span className="text-[10px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                En {days} día{days > 1 ? "s" : ""}
            </span>
        )
        return (
            <span className="text-[10px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                En {hours}h
            </span>
        )
    }

    return null
}

interface ActivityCardProps {
    activity: {
        id: string
        title: string
        description: string | null
        location: string | null
        start_datetime: string | null
        end_datetime: string | null
        materials: string | null
        target: string
        activity_type: string | null
        created_by: string
        activity_courses?: {
            course_id: string
            courses: { id: string; name: string; section: string | null } | null
        }[]
    }
    canManage: boolean
    userId: string
    userRole: string
    onEdit: (activity: any) => void
    onDeleted: (id: string) => void
}

export function ActivityCard({
    activity, canManage, userId, userRole, onEdit, onDeleted
}: ActivityCardProps) {
    const supabase = createClient()
    const [deleting, setDeleting] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [expanded, setExpanded] = useState(false)

    const status = computeStatus(activity.start_datetime, activity.end_datetime)
    const cfg = STATUS_CONFIG[status]
    const emoji = ACTIVITY_TYPE_EMOJI[activity.activity_type ?? ""] ?? "📌"
    const duration = formatDuration(activity.start_datetime, activity.end_datetime)

    const canEdit = canManage && (
        activity.created_by === userId ||
        ["admin", "director"].includes(userRole)
    )

    const courseNames = (activity.activity_courses ?? [])
        .map(ac => ac.courses
            ? `${ac.courses.name}${ac.courses.section ? ` ${ac.courses.section}` : ""}`.trim()
            : null
        )
        .filter(Boolean) as string[]

    const sameDay = activity.start_datetime && activity.end_datetime &&
        new Date(activity.start_datetime).toDateString() ===
        new Date(activity.end_datetime).toDateString()

    const handleDelete = async () => {
        setDeleting(true)
        try {
            const { error } = await supabase
                .from("activities").update({ active: false }).eq("id", activity.id)
            if (error) throw error
            toast.success("Actividad eliminada.")
            onDeleted(activity.id)
        } catch {
            toast.error("No se pudo eliminar la actividad.")
        } finally {
            setDeleting(false)
            setConfirmDelete(false)
        }
    }

    return (
        <div className={cn(
            "rounded-2xl border bg-white shadow-sm overflow-hidden transition-all",
            status === "en_desarrollo" && "border-green-200",
            status === "finalizada" && "opacity-70"
        )}>
            {/* Barra de estado superior */}
            <div className={cn("h-1 w-full", cfg.bar)} />

            <div className="p-5 space-y-4">
                {/* Header */}
                <div className="flex items-start gap-3">
                    <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0",
                        status === "programada" && "bg-blue-50",
                        status === "en_desarrollo" && "bg-green-50",
                        status === "finalizada" && "bg-slate-50",
                    )}>
                        {emoji}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-slate-900 text-sm leading-snug">
                                {activity.title}
                            </h3>
                            <span className={cn(
                                "text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0",
                                cfg.badge
                            )}>
                                {cfg.label}
                            </span>
                            <CountdownBadge
                                start={activity.start_datetime}
                                end={activity.end_datetime}
                            />
                        </div>

                        {/* Audiencia */}
                        <div className="flex items-center gap-1.5 mt-1">
                            <Users className="w-3 h-3 text-slate-400" />
                            {activity.target === "general" ? (
                                <span className="text-xs text-indigo-600 font-medium">Todo el colegio</span>
                            ) : courseNames.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                    {courseNames.map((name, i) => (
                                        <span key={i} className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-1.5 py-0.5 rounded-full text-[10px] font-medium">
                                            {name}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <span className="text-xs text-slate-400">Sin cursos asignados</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* ─── Fecha y hora (siempre visible) ─── */}
                {activity.start_datetime && (
                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 space-y-2">
                        {/* Fecha */}
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
                            <span className="text-xs font-semibold text-slate-700 capitalize">
                                {formatDate(activity.start_datetime)}
                            </span>
                        </div>

                        {/* Horario */}
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-indigo-500 shrink-0" />
                            <div className="flex items-center gap-1.5 text-xs text-slate-700">
                                <span className="font-semibold">{formatTime(activity.start_datetime)}</span>
                                {activity.end_datetime && (
                                    <>
                                        <span className="text-slate-400">→</span>
                                        <span className="font-semibold">
                                            {sameDay
                                                ? formatTime(activity.end_datetime)
                                                : `${formatDate(activity.end_datetime)} ${formatTime(activity.end_datetime)}`
                                            }
                                        </span>
                                    </>
                                )}
                                {duration && (
                                    <span className="text-slate-400 ml-1">({duration})</span>
                                )}
                            </div>
                        </div>

                        {/* Lugar */}
                        {activity.location && (
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-indigo-500 shrink-0" />
                                <span className="text-xs font-medium text-slate-700">{activity.location}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* ─── Ver más / menos ─── */}
                <button
                    onClick={() => setExpanded(p => !p)}
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                >
                    {expanded ? (
                        <><ChevronUp className="w-3.5 h-3.5" /> Ver menos</>
                    ) : (
                        <><ChevronDown className="w-3.5 h-3.5" /> Ver más detalles</>
                    )}
                </button>

                {/* ─── Detalles expandidos ─── */}
                {expanded && (
                    <div className="space-y-3 border-t border-slate-100 pt-3">
                        {/* Descripción */}
                        {activity.description && (
                            <div className="space-y-1">
                                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Descripción</p>
                                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                                    {activity.description}
                                </p>
                            </div>
                        )}

                        {/* Materiales */}
                        {activity.materials && (
                            <div className="space-y-1">
                                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Materiales necesarios</p>
                                <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                                    <Paperclip className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                                    <p className="text-xs text-amber-800 leading-relaxed">{activity.materials}</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ─── Acciones (solo para quien puede gestionar) ─── */}
                {canEdit && (
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                        {confirmDelete ? (
                            <>
                                <p className="text-xs text-red-600 flex-1">¿Eliminar esta actividad?</p>
                                <button onClick={() => setConfirmDelete(false)}
                                    className="text-xs text-slate-500 px-2 py-1 rounded hover:bg-slate-100 transition-colors">
                                    Cancelar
                                </button>
                                <button onClick={handleDelete} disabled={deleting}
                                    className="text-xs text-red-600 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors">
                                    {deleting ? "Eliminando..." : "Confirmar"}
                                </button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => onEdit(activity)}
                                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100 transition-colors">
                                    <Pencil className="w-3.5 h-3.5" /> Editar
                                </button>
                                <button onClick={() => setConfirmDelete(true)}
                                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" /> Eliminar
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
