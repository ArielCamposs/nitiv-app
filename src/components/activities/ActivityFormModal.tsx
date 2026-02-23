"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { X, MapPin, Paperclip } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const formSchema = z.object({
    title: z.string().min(3, "Mínimo 3 caracteres"),
    description: z.string().min(10, "Mínimo 10 caracteres"),
    location: z.string().min(2, "Indica el lugar"),
    start_datetime: z.string().min(1, "Indica la fecha de inicio"),
    end_datetime: z.string().min(1, "Indica la fecha de término"),
    materials: z.string().optional(),
    target: z.enum(["general", "por_curso"]),
    course_ids: z.array(z.string()).optional(),
    activity_type: z.enum(["taller", "charla", "deporte", "cultural", "academico", "reunion", "otro"]).optional(),
}).refine(data => {
    if (!data.start_datetime || !data.end_datetime) return true
    return new Date(data.end_datetime) > new Date(data.start_datetime)
}, { message: "La fecha de término debe ser posterior al inicio", path: ["end_datetime"] })

type FormValues = z.infer<typeof formSchema>

interface Course { id: string; name: string; section: string | null }

interface Props {
    institutionId: string
    userId: string
    courses: Course[]
    editActivity?: {
        id: string
        title: string
        description: string | null
        location: string | null
        start_datetime: string | null
        end_datetime: string | null
        materials: string | null
        target: string
        activity_type: string | null
        courseIds: string[]
    } | null
    onClose: () => void
    onSaved: (activity: any) => void
}

export function ActivityFormModal({
    institutionId, userId, courses,
    editActivity, onClose, onSaved
}: Props) {
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const isEdit = !!editActivity

    const toLocalInput = (dt: string | null) => {
        if (!dt) return ""
        // Convertir a formato datetime-local (YYYY-MM-DDTHH:MM)
        return new Date(dt).toISOString().slice(0, 16)
    }

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: editActivity?.title ?? "",
            description: editActivity?.description ?? "",
            location: editActivity?.location ?? "",
            start_datetime: toLocalInput(editActivity?.start_datetime ?? null),
            end_datetime: toLocalInput(editActivity?.end_datetime ?? null),
            materials: editActivity?.materials ?? "",
            target: (editActivity?.target as "general" | "por_curso") ?? "general",
            course_ids: editActivity?.courseIds ?? [],
            activity_type: (editActivity?.activity_type as any) ?? undefined,
        },
    })

    const target = form.watch("target")
    const selectedCourses = form.watch("course_ids") ?? []

    const toggleCourse = (courseId: string) => {
        const current = form.getValues("course_ids") ?? []
        form.setValue("course_ids",
            current.includes(courseId)
                ? current.filter(id => id !== courseId)
                : [...current, courseId]
        )
    }

    const onSubmit = async (values: FormValues) => {
        setLoading(true)
        try {
            const payload = {
                institution_id: institutionId,
                created_by: userId,
                title: values.title,
                description: values.description,
                location: values.location,
                start_datetime: new Date(values.start_datetime).toISOString(),
                end_datetime: new Date(values.end_datetime).toISOString(),
                materials: values.materials?.trim() || null,
                target: values.target,
                activity_type: values.activity_type ?? null,
                active: true,
            }

            let activityId: string

            if (isEdit && editActivity) {
                const { error } = await supabase
                    .from("activities").update(payload).eq("id", editActivity.id)
                if (error) throw error
                activityId = editActivity.id
                await supabase.from("activity_courses").delete().eq("activity_id", activityId)
            } else {
                const { data, error } = await supabase
                    .from("activities").insert(payload).select("id").single()
                if (error) throw error
                activityId = data.id
            }

            // Insertar cursos si aplica
            if (values.target === "por_curso" && values.course_ids && values.course_ids.length > 0) {
                await supabase.from("activity_courses").insert(
                    values.course_ids.map(courseId => ({ activity_id: activityId, course_id: courseId }))
                )
            }

            // Fetch completo para refrescar en UI
            const { data: saved } = await supabase
                .from("activities")
                .select("*, activity_courses(course_id, courses(id, name, section))")
                .eq("id", activityId)
                .single()

            toast.success(isEdit ? "Actividad actualizada." : "Actividad publicada.")
            onSaved(saved)
            onClose()
        } catch (e) {
            console.error(e)
            toast.error("No se pudo guardar la actividad.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 overflow-y-auto">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl my-auto">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h2 className="text-base font-semibold text-slate-900">
                        {isEdit ? "Editar actividad" : "Nueva actividad"}
                    </h2>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                        <X className="w-4 h-4 text-slate-500" />
                    </button>
                </div>

                <form onSubmit={form.handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
                    {/* Título */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-800">Título</label>
                        <input {...form.register("title")} placeholder="Nombre de la actividad"
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                        {form.formState.errors.title && (
                            <p className="text-xs text-red-500">{form.formState.errors.title.message}</p>
                        )}
                    </div>

                    {/* Descripción */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-800">Descripción</label>
                        <textarea {...form.register("description")} rows={3}
                            placeholder="Describe la actividad con detalle..."
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
                        {form.formState.errors.description && (
                            <p className="text-xs text-red-500">{form.formState.errors.description.message}</p>
                        )}
                    </div>

                    {/* Lugar */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-800">Lugar</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input {...form.register("location")}
                                placeholder="Ej: Gimnasio, Sala multiuso, Patio..."
                                className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                        </div>
                        {form.formState.errors.location && (
                            <p className="text-xs text-red-500">{form.formState.errors.location.message}</p>
                        )}
                    </div>

                    {/* Tipo de actividad */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-800">Tipo de actividad</label>
                        <div className="grid grid-cols-4 gap-2">
                            {[
                                { value: "taller", emoji: "🎨", label: "Taller" },
                                { value: "charla", emoji: "🎤", label: "Charla" },
                                { value: "deporte", emoji: "⚽", label: "Deporte" },
                                { value: "cultural", emoji: "🎭", label: "Cultural" },
                                { value: "academico", emoji: "📚", label: "Académico" },
                                { value: "reunion", emoji: "🤝", label: "Reunión" },
                                { value: "otro", emoji: "📌", label: "Otro" },
                            ].map(opt => {
                                const selected = form.watch("activity_type") === opt.value
                                return (
                                    <button key={opt.value} type="button"
                                        onClick={() => form.setValue("activity_type", opt.value as any)}
                                        className={cn(
                                            "flex flex-col items-center gap-1 rounded-xl border-2 px-2 py-2 text-xs font-medium transition-all",
                                            selected
                                                ? "border-indigo-400 bg-indigo-50 text-indigo-800"
                                                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                                        )}>
                                        <span className="text-lg leading-none">{opt.emoji}</span>
                                        <span>{opt.label}</span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Fechas */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-800">Inicio</label>
                            <input {...form.register("start_datetime")} type="datetime-local"
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                            {form.formState.errors.start_datetime && (
                                <p className="text-xs text-red-500">{form.formState.errors.start_datetime.message}</p>
                            )}
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-800">Término</label>
                            <input {...form.register("end_datetime")} type="datetime-local"
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                            {form.formState.errors.end_datetime && (
                                <p className="text-xs text-red-500">{form.formState.errors.end_datetime.message}</p>
                            )}
                        </div>
                    </div>

                    {/* Materiales */}
                    <div className="space-y-1">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-slate-800">Materiales</label>
                            <span className="text-xs text-slate-400">Opcional</span>
                        </div>
                        <div className="relative">
                            <Paperclip className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                            <textarea {...form.register("materials")} rows={2}
                                placeholder="Ej: Lápices, hojas, carpeta..."
                                className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
                        </div>
                    </div>

                    {/* Target */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-800">Dirigido a</label>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { value: "general", label: "Todo el colegio", emoji: "🏫" },
                                { value: "por_curso", label: "Curso específico", emoji: "📋" },
                            ].map(opt => (
                                <button key={opt.value} type="button"
                                    onClick={() => form.setValue("target", opt.value as "general" | "por_curso")}
                                    className={cn(
                                        "flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-sm font-medium transition-all",
                                        target === opt.value
                                            ? "border-indigo-400 bg-indigo-50 text-indigo-800"
                                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                    )}>
                                    <span>{opt.emoji}</span>
                                    <span>{opt.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Cursos */}
                    {target === "por_curso" && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-800">Selecciona los cursos</label>
                            {courses.length === 0 ? (
                                <p className="text-xs text-slate-400">No hay cursos disponibles.</p>
                            ) : (
                                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1">
                                    {courses.map(c => {
                                        const label = `${c.name} ${c.section ?? ""}`.trim()
                                        const selected = selectedCourses.includes(c.id)
                                        return (
                                            <button key={c.id} type="button" onClick={() => toggleCourse(c.id)}
                                                className={cn(
                                                    "rounded-full border px-3 py-1 text-xs font-medium transition-all",
                                                    selected
                                                        ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                                                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                                                )}>
                                                {label}
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                            {form.formState.errors.course_ids && (
                                <p className="text-xs text-red-500">Selecciona al menos un curso</p>
                            )}
                        </div>
                    )}

                    {/* Acciones */}
                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                        <Button variant="ghost" size="sm" type="button" onClick={onClose}>Cancelar</Button>
                        <Button size="sm" type="submit" disabled={loading}
                            className="bg-indigo-600 hover:bg-indigo-700">
                            {loading ? "Guardando..." : isEdit ? "Guardar cambios" : "Publicar actividad"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
