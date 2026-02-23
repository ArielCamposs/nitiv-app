"use client"

import { useState, useMemo } from "react"
import { ActivityCard, computeStatus } from "@/components/activities/ActivityCard"
import { ActivityFormModal } from "@/components/activities/ActivityFormModal"
import { Button } from "@/components/ui/button"
import { Plus, CalendarDays } from "lucide-react"
import { cn } from "@/lib/utils"

type StatusFilter = "todas" | "programada" | "en_desarrollo" | "finalizada"

const FILTER_TABS: { value: StatusFilter; label: string }[] = [
    { value: "todas", label: "Todas" },
    { value: "programada", label: "Programadas" },
    { value: "en_desarrollo", label: "En desarrollo" },
    { value: "finalizada", label: "Finalizadas" },
]

interface Course { id: string; name: string; section: string | null }

interface Props {
    activities: any[]
    courses: Course[]
    userId: string
    userRole: string
    institutionId: string
    canManage: boolean
}

export function ActivitiesClient({
    activities: initialActivities,
    courses, userId, userRole, institutionId, canManage,
}: Props) {
    const [activities, setActivities] = useState(initialActivities)
    const [filter, setFilter] = useState<StatusFilter>("todas")
    const [showForm, setShowForm] = useState(false)
    const [editActivity, setEditActivity] = useState<any | null>(null)

    const counts = useMemo(() => {
        const c: Record<string, number> = {
            todas: activities.length,
            programada: 0, en_desarrollo: 0, finalizada: 0,
        }
        activities.forEach(a => { c[computeStatus(a.start_datetime, a.end_datetime)]++ })
        return c
    }, [activities])

    const filtered = useMemo(() => {
        if (filter === "todas") return activities
        return activities.filter(a => computeStatus(a.start_datetime, a.end_datetime) === filter)
    }, [activities, filter])

    const handleSaved = (saved: any) => {
        setActivities(prev => {
            const exists = prev.find(a => a.id === saved.id)
            return exists ? prev.map(a => a.id === saved.id ? saved : a) : [saved, ...prev]
        })
    }

    const handleDeleted = (id: string) => setActivities(prev => prev.filter(a => a.id !== id))

    const handleEdit = (activity: any) => {
        const courseIds = (activity.activity_courses ?? [])
            .map((ac: any) => ac.course_id)
            .filter(Boolean)
        setEditActivity({ ...activity, courseIds })
        setShowForm(true)
    }

    const handleCloseForm = () => {
        setShowForm(false)
        setEditActivity(null)
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Actividades</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Talleres, eventos y actividades de la institución
                    </p>
                </div>
                {canManage && (
                    <Button size="sm" onClick={() => { setEditActivity(null); setShowForm(true) }}
                        className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 shrink-0">
                        <Plus className="w-4 h-4" />
                        Nueva actividad
                    </Button>
                )}
            </div>

            {/* Filtros con contadores */}
            <div className="flex gap-2 overflow-x-auto pb-1">
                {FILTER_TABS.map(tab => (
                    <button key={tab.value} onClick={() => setFilter(tab.value)}
                        className={cn(
                            "flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-medium whitespace-nowrap transition-all shrink-0",
                            filter === tab.value
                                ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                        )}>
                        {tab.label}
                        <span className={cn(
                            "rounded-full px-1.5 py-0.5 text-[10px] font-bold min-w-[18px] text-center",
                            filter === tab.value ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"
                        )}>
                            {counts[tab.value]}
                        </span>
                    </button>
                ))}
            </div>

            {/* Lista */}
            {filtered.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center">
                    <CalendarDays className="w-8 h-8 mx-auto mb-3 text-slate-300" />
                    <p className="text-sm font-medium text-slate-500">
                        {filter === "todas"
                            ? "No hay actividades publicadas aún"
                            : `No hay actividades ${filter === "programada" ? "programadas" : filter === "en_desarrollo" ? "en desarrollo" : "finalizadas"}`
                        }
                    </p>
                    {canManage && filter === "todas" && (
                        <p className="text-xs text-slate-400 mt-1">Crea la primera con el botón de arriba</p>
                    )}
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {filtered.map(activity => (
                        <ActivityCard
                            key={activity.id}
                            activity={activity}
                            canManage={canManage}
                            userId={userId}
                            userRole={userRole}
                            onEdit={handleEdit}
                            onDeleted={handleDeleted}
                        />
                    ))}
                </div>
            )}

            {/* Modal */}
            {showForm && (
                <ActivityFormModal
                    institutionId={institutionId}
                    userId={userId}
                    courses={courses}
                    editActivity={editActivity}
                    onClose={handleCloseForm}
                    onSaved={handleSaved}
                />
            )}
        </div>
    )
}
