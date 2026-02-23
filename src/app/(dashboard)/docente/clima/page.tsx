import { createClient } from "@/lib/supabase/server"
import { ClimateRegisterCard } from "@/components/teacher/climate-register-card"
import { PulseTeacherRegister } from "@/components/pulse/pulse-teacher-register"

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

    // Estadísticas de las últimas 4 semanas por curso
    const since = new Date()
    since.setDate(since.getDate() - 28)

    const courseIds = (courses ?? []).map((c: any) => c.course_id)

    const { data: teacherLogs } = await supabase
        .from("teacher_logs")
        .select("course_id, energy_level, log_date")
        .in("course_id", courseIds)
        .gte("log_date", since.toISOString().split("T")[0])
        .order("log_date", { ascending: false })

    // ── Verificar Modo Pulso activo ───────────────────────────────────────────
    const { data: pulseSession } = await supabase
        .from("pulse_sessions")
        .select("id, week_start, week_end")
        .eq("institution_id", profile.institution_id)
        .eq("active", true)
        .maybeSingle()

    // Verificar qué cursos ya tienen pulso registrado esta sesión
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
        pulseSession: pulseSession as PulseSession,
        pulseDoneCourses,
    }
}

const ENERGY_SCORE: Record<string, number> = {
    explosiva: 1, apatica: 2, inquieta: 3, regulada: 4,
}

const ENERGY_LABEL: Record<string, { label: string; color: string }> = {
    explosiva: { label: "Explosiva", color: "text-red-600" },
    apatica: { label: "Apática", color: "text-blue-500" },
    inquieta: { label: "Inquieta", color: "text-yellow-600" },
    regulada: { label: "Regulada", color: "text-green-600" },
}

export default async function ClimaPage() {
    const data = await getTeacherCourses()
    if (!data) return <div>No se encontró tu perfil docente.</div>

    const { teacherId, institutionId, courses, teacherLogs, pulseSession, pulseDoneCourses } = data

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
                            Estadísticas de tus cursos en las últimas 4 semanas
                        </p>
                    </div>
                    {/* Banner Modo Pulso */}
                    {pulseSession && (
                        <div className="flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1.5 text-xs font-semibold text-indigo-700">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
                            </span>
                            Modo Pulso · {fmtDate(pulseSession.week_start)} — {fmtDate(pulseSession.week_end)}
                        </div>
                    )}
                </div>

                {courses.length === 0 && (
                    <p className="text-slate-500">
                        Aún no tienes cursos asignados. Solicita al administrador que te asigne uno.
                    </p>
                )}

                {courses.map((c: any) => {
                    const courseLogs = teacherLogs.filter(l => l.course_id === c.course_id)
                    const avg = courseLogs.length > 0
                        ? courseLogs.reduce((a, l) => a + (ENERGY_SCORE[l.energy_level] ?? 3), 0) / courseLogs.length
                        : null

                    const dominantLevel = courseLogs.length > 0
                        ? Object.entries(
                            courseLogs.reduce((acc: any, l) => {
                                acc[l.energy_level] = (acc[l.energy_level] ?? 0) + 1
                                return acc
                            }, {})
                        ).sort((a: any, b: any) => b[1] - a[1])[0][0]
                        : null

                    const cfg = dominantLevel ? ENERGY_LABEL[dominantLevel] : null
                    const pulseDoneThisCourse = pulseDoneCourses.includes(c.course_id)

                    return (
                        <div key={c.course_id} className="space-y-4">
                            {/* Nombre del curso */}
                            <h2 className="text-base font-semibold text-slate-700">
                                {c.courses?.name}
                                {c.is_head_teacher && (
                                    <span className="ml-2 text-xs font-normal text-indigo-500">
                                        Profesor Jefe
                                    </span>
                                )}
                            </h2>

                            {/* Estadísticas resumidas */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="rounded-xl border bg-white p-4 text-center">
                                    <p className="text-2xl font-bold text-slate-800">
                                        {courseLogs.length}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">Registros (28 días)</p>
                                </div>
                                <div className="rounded-xl border bg-white p-4 text-center">
                                    <p className={`text-lg font-bold ${cfg?.color ?? "text-slate-400"}`}>
                                        {cfg?.label ?? "Sin datos"}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">Clima predominante</p>
                                </div>
                                <div className="rounded-xl border bg-white p-4 text-center">
                                    <p className="text-2xl font-bold text-slate-800">
                                        {avg !== null ? avg.toFixed(1) : "—"}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">Promedio energía</p>
                                </div>
                            </div>

                            {/* Botón de registro — secundario, no lo principal */}
                            <details className="group rounded-xl border bg-white">
                                <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-xl">
                                    <span>Registrar clima de esta clase</span>
                                    <span className="text-slate-400 group-open:rotate-180 transition-transform">
                                        ▾
                                    </span>
                                </summary>
                                <div className="px-4 pb-4 pt-2 space-y-5">
                                    <ClimateRegisterCard
                                        teacherId={teacherId}
                                        courseId={c.course_id}
                                        institutionId={institutionId}
                                    />
                                    {/* Registro Modo Pulso — solo si hay sesión activa */}
                                    {pulseSession && (
                                        <>
                                            <div className="border-t border-dashed border-indigo-200" />
                                            {pulseDoneThisCourse ? (
                                                <p className="text-xs text-indigo-500 font-medium">
                                                    ✓ Pulso registrado para este curso esta semana.
                                                </p>
                                            ) : (
                                                <PulseTeacherRegister
                                                    teacherId={teacherId}
                                                    courseId={c.course_id}
                                                    institutionId={institutionId}
                                                    pulseSessionId={pulseSession.id}
                                                    courseName={c.courses?.name ?? ""}
                                                />
                                            )}
                                        </>
                                    )}
                                </div>
                            </details>
                        </div>
                    )
                })}
            </div>
        </main>
    )
}
