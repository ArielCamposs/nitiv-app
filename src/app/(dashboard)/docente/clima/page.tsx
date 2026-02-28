import { createClient } from "@/lib/supabase/server"
import { ClimaPageTabs } from "@/components/teacher/clima-page-tabs"

type PulseSession = { id: string; week_start: string; week_end: string } | null

async function getTeacherCourses() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
        .from("users")
        .select("id, institution_id")
        .eq("id", user.id)
        .maybeSingle()

    if (!profile) return null

    const { data: courses } = await supabase
        .from("course_teachers")
        .select("course_id, is_head_teacher, courses(id, name, level)")
        .eq("teacher_id", user.id)

    const courseIds = (courses ?? []).map((c: any) => c.course_id)

    // 28 días para el resumen
    const since28 = new Date()
    since28.setDate(since28.getDate() - 28)

    // 90 días para el historial
    const since90 = new Date()
    since90.setDate(since90.getDate() - 90)

    const { data: teacherLogs } = await supabase
        .from("teacher_logs")
        .select("course_id, energy_level, log_date")
        .in("course_id", courseIds)
        .eq("teacher_id", user.id)
        .gte("log_date", since28.toISOString().split("T")[0])
        .order("log_date", { ascending: false })

    // Logs históricos (90 días, para el gráfico)
    const { data: historyLogs } = await supabase
        .from("teacher_logs")
        .select("course_id, energy_level, log_date")
        .in("course_id", courseIds)
        .eq("teacher_id", user.id)
        .gte("log_date", since90.toISOString().split("T")[0])
        .order("log_date", { ascending: true })

    const { data: pulseSession } = await supabase
        .from("pulse_sessions")
        .select("id, week_start, week_end")
        .eq("institution_id", profile.institution_id)
        .eq("active", true)
        .maybeSingle()

    let pulseDoneCourses: string[] = []
    if (pulseSession && courseIds.length > 0) {
        const { data: pulseEntries } = await supabase
            .from("pulse_teacher_entries")
            .select("course_id")
            .eq("pulse_session_id", pulseSession.id)
            .eq("teacher_id", user.id)
        pulseDoneCourses = (pulseEntries ?? []).map((e: any) => e.course_id)
    }

    return {
        teacherId: profile.id,
        institutionId: profile.institution_id,
        courses: courses ?? [],
        teacherLogs: teacherLogs ?? [],
        historyLogs: historyLogs ?? [],
        pulseSession: pulseSession as PulseSession,
        pulseDoneCourses,
    }
}

export default async function ClimaPage() {
    const data = await getTeacherCourses()
    if (!data) return <div>No se encontró tu perfil docente.</div>

    const fmtDate = (d: string) =>
        new Date(d + "T12:00:00").toLocaleDateString("es-CL", { day: "numeric", month: "short" })

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900">Clima de aula</h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Estadísticas de tus cursos
                        </p>
                    </div>
                    {data.pulseSession && (
                        <div className="flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1.5 text-xs font-semibold text-indigo-700">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
                            </span>
                            Modo Pulso · {fmtDate(data.pulseSession.week_start)} — {fmtDate(data.pulseSession.week_end)}
                        </div>
                    )}
                </div>

                {data.courses.length === 0 ? (
                    <p className="text-slate-500">
                        Aún no tienes cursos asignados. Solicita al administrador que te asigne uno.
                    </p>
                ) : (
                    <ClimaPageTabs
                        teacherId={data.teacherId}
                        institutionId={data.institutionId}
                        courses={data.courses}
                        teacherLogs={data.teacherLogs}
                        historyLogs={data.historyLogs}
                        pulseSession={data.pulseSession}
                        pulseDoneCourses={data.pulseDoneCourses}
                    />
                )}
            </div>
        </main>
    )
}
