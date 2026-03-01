import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

const ACTION_META: Record<string, { label: string; color: string }> = {
    // Registros emocionales
    delete_emotional_log: { label: "Eliminó registro emocional", color: "bg-rose-100 text-rose-700" },
    edit_emotional_log: { label: "Editó registro emocional", color: "bg-amber-100 text-amber-700" },
    // Estudiantes
    create_student: { label: "Creó estudiante", color: "bg-emerald-100 text-emerald-700" },
    edit_student: { label: "Editó estudiante", color: "bg-amber-100 text-amber-700" },
    toggle_student_active: { label: "Cambió estado estudiante", color: "bg-slate-100 text-slate-600" },
    reset_student_password: { label: "Cambió contraseña estudiante", color: "bg-indigo-100 text-indigo-700" },
    assign_student_to_course: { label: "Asignó estudiante a curso", color: "bg-sky-100 text-sky-700" },
    remove_student_from_course: { label: "Removió estudiante de curso", color: "bg-orange-100 text-orange-700" },
    // Cursos
    create_course: { label: "Creó curso", color: "bg-emerald-100 text-emerald-700" },
    edit_course: { label: "Editó curso", color: "bg-amber-100 text-amber-700" },
    toggle_course_active: { label: "Cambió estado de curso", color: "bg-slate-100 text-slate-600" },
    assign_teacher_to_course: { label: "Asignó docente a curso", color: "bg-sky-100 text-sky-700" },
    remove_teacher_from_course: { label: "Removió docente de curso", color: "bg-orange-100 text-orange-700" },
    // Usuarios staff
    create_user: { label: "Creó usuario staff", color: "bg-emerald-100 text-emerald-700" },
    edit_user: { label: "Editó usuario staff", color: "bg-amber-100 text-amber-700" },
    toggle_user_active: { label: "Cambió estado usuario", color: "bg-slate-100 text-slate-600" },
    reset_user_password: { label: "Cambió contraseña usuario", color: "bg-indigo-100 text-indigo-700" },
    // Institución
    edit_institution: { label: "Editó datos de institución", color: "bg-purple-100 text-purple-700" },
}

export default async function AdminAuditoriaPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect("/login")

    const { data: profile } = await supabase
        .from("users").select("role").eq("id", user.id).single()

    if (profile?.role !== "admin") redirect("/admin")

    const { data: logs } = await supabase
        .from("admin_audit_logs")
        .select("id, action, entity_type, entity_id, entity_description, before_data, after_data, created_at")
        .eq("admin_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200)

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Auditoría de acciones</h1>
                    <p className="text-sm text-slate-500">
                        Registro inmutable de todas tus acciones como administrador.
                    </p>
                </div>

                <span className="text-xs text-slate-500">
                    {logs?.length ?? 0} acción{(logs?.length ?? 0) !== 1 ? "es" : ""} registrada{(logs?.length ?? 0) !== 1 ? "s" : ""}
                </span>

                {(logs ?? []).length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-200 py-12 text-center">
                        <p className="text-sm text-slate-400">No hay acciones registradas aún.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {(logs ?? []).map((log) => {
                            const meta = ACTION_META[log.action] ?? { label: log.action, color: "bg-slate-100 text-slate-600" }
                            return (
                                <Card key={log.id}>
                                    <CardContent className="py-3 px-4">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="space-y-1 flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <Badge className={`text-[11px] ${meta.color}`}>
                                                        {meta.label}
                                                    </Badge>
                                                    {log.entity_description && (
                                                        <span className="text-sm font-medium text-slate-700 truncate">
                                                            {log.entity_description}
                                                        </span>
                                                    )}
                                                </div>

                                                {(log.before_data || log.after_data) && (
                                                    <details className="mt-1">
                                                        <summary className="text-[11px] text-slate-400 cursor-pointer hover:text-slate-600 select-none">
                                                            Ver detalle
                                                        </summary>
                                                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                            {log.before_data && (
                                                                <div className="rounded bg-rose-50 border border-rose-100 p-2">
                                                                    <p className="text-[10px] font-semibold uppercase text-rose-400 mb-1">Antes</p>
                                                                    <pre className="text-[10px] text-slate-600 whitespace-pre-wrap break-all">
                                                                        {JSON.stringify(log.before_data, null, 2)}
                                                                    </pre>
                                                                </div>
                                                            )}
                                                            {log.after_data && (
                                                                <div className="rounded bg-emerald-50 border border-emerald-100 p-2">
                                                                    <p className="text-[10px] font-semibold uppercase text-emerald-400 mb-1">Después</p>
                                                                    <pre className="text-[10px] text-slate-600 whitespace-pre-wrap break-all">
                                                                        {JSON.stringify(log.after_data, null, 2)}
                                                                    </pre>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </details>
                                                )}
                                            </div>

                                            <p className="text-xs text-slate-400 shrink-0 text-right">
                                                {new Date(log.created_at).toLocaleDateString("es-CL", {
                                                    day: "2-digit", month: "short", year: "numeric",
                                                })}
                                                <br />
                                                <span className="font-mono">
                                                    {new Date(log.created_at).toLocaleTimeString("es-CL", {
                                                        hour: "2-digit", minute: "2-digit",
                                                    })}
                                                </span>
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                )}
            </div>
        </main>
    )
}
