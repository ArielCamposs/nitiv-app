import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LogEditButton } from "@/components/historial/log-edit-button"
import { LogDeleteButton } from "@/components/historial/log-delete-button"

const EMOTION_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
    muy_bien: { label: "Muy bien", emoji: "😄", color: "bg-emerald-100 text-emerald-700" },
    bien: { label: "Bien", emoji: "🙂", color: "bg-emerald-50 text-emerald-600" },
    neutral: { label: "Neutral", emoji: "😐", color: "bg-slate-100 text-slate-600" },
    mal: { label: "Mal", emoji: "😔", color: "bg-rose-100 text-rose-600" },
    muy_mal: { label: "Muy mal", emoji: "😢", color: "bg-rose-200 text-rose-700" },
}

async function getHistorialAdmin(courseId?: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
        .from("users")
        .select("institution_id, role")
        .eq("id", user.id)
        .maybeSingle()

    if (!profile || profile.role !== "admin") return null

    const { data: courses } = await supabase
        .from("courses")
        .select("id, name")
        .eq("institution_id", profile.institution_id)
        .order("name")

    let studentsQuery = supabase
        .from("students")
        .select("id, name, last_name, course_id, courses(name)")
        .eq("institution_id", profile.institution_id)

    if (courseId) studentsQuery = studentsQuery.eq("course_id", courseId)

    const { data: students } = await studentsQuery.order("last_name")

    const studentIds = (students ?? []).map((s) => s.id)

    const { data: logs } = studentIds.length > 0
        ? await supabase
            .from("emotional_logs")
            .select("id, student_id, emotion, intensity, reflection, type, created_at")
            .in("student_id", studentIds)
            .order("created_at", { ascending: false })
            .limit(200)
        : { data: [] }

    return { courses: courses ?? [], students: students ?? [], logs: logs ?? [] }
}

export default async function AdminHistorialPage({
    searchParams,
}: {
    searchParams: { curso?: string }
}) {
    const courseId = searchParams.curso
    const data = await getHistorialAdmin(courseId)
    if (!data) redirect("/login")

    const { courses, students, logs } = data

    const logsByStudent = (logs ?? []).reduce((acc: Record<string, typeof logs>, log) => {
        if (!acc[log.student_id]) acc[log.student_id] = []
        acc[log.student_id].push(log)
        return acc
    }, {})

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Historial emocional</h1>
                    <p className="text-sm text-slate-500">
                        Registros de todos los estudiantes — vista administrador
                    </p>
                </div>

                {/* Filtro por curso */}
                <div className="flex flex-wrap gap-2">
                    <a
                        href="/admin/historial"
                        className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors border ${!courseId
                                ? "bg-indigo-600 text-white border-indigo-600"
                                : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                            }`}
                    >
                        Todos los cursos
                    </a>
                    {courses.map((c) => (
                        <a
                            key={c.id}
                            href={`/admin/historial?curso=${c.id}`}
                            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors border ${courseId === c.id
                                    ? "bg-indigo-600 text-white border-indigo-600"
                                    : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                                }`}
                        >
                            {c.name}
                        </a>
                    ))}
                </div>

                {/* Estadísticas globales */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: "Estudiantes", value: students.length },
                        { label: "Registros totales", value: logs.length },
                        { label: "Con reflexión", value: logs.filter((l) => l.reflection).length },
                        {
                            label: "Intensidad prom.",
                            value: logs.length > 0
                                ? (logs.reduce((a, l) => a + (l.intensity ?? 3), 0) / logs.length).toFixed(1)
                                : "—",
                        },
                    ].map((stat) => (
                        <Card key={stat.label}>
                            <CardContent className="pt-4 text-center">
                                <p className="text-xl font-bold text-indigo-600">{stat.value}</p>
                                <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Lista por estudiante */}
                <div className="space-y-4">
                    {students.length === 0 && (
                        <p className="text-sm text-slate-500 text-center py-8">
                            No hay estudiantes para este filtro.
                        </p>
                    )}
                    {students.map((student) => {
                        const studentLogs = logsByStudent[student.id] ?? []
                        if (studentLogs.length === 0) return null
                        return (
                            <Card key={student.id}>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm flex items-center justify-between">
                                        <span>{student.last_name}, {student.name}</span>
                                        <Badge variant="outline" className="text-xs">
                                            {(student.courses as any)?.name ?? "Sin curso"}
                                        </Badge>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="divide-y">
                                    {studentLogs.slice(0, 5).map((log: any) => {
                                        const cfg = EMOTION_CONFIG[log.emotion] ?? EMOTION_CONFIG.neutral
                                        return (
                                            <div key={log.id} className="flex items-start gap-3 py-2">
                                                <span className="text-xl">{cfg.emoji}</span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>
                                                            {cfg.label}
                                                        </span>
                                                        <Badge variant="outline" className="text-xs capitalize">
                                                            {log.type === "daily" ? "Diario" : "Semanal"}
                                                        </Badge>
                                                        <span className="text-xs text-slate-400">
                                                            Intensidad: {log.intensity}/5
                                                        </span>
                                                    </div>
                                                    {log.reflection && (
                                                        <p className="text-xs text-slate-500 mt-1 truncate">
                                                            {log.reflection}
                                                        </p>
                                                    )}
                                                    <p className="text-xs text-slate-400 mt-0.5">
                                                        {new Date(log.created_at).toLocaleDateString("es-CL", {
                                                            weekday: "long", day: "numeric", month: "long",
                                                        })}
                                                    </p>
                                                </div>

                                                {/* Acciones admin */}
                                                <div className="flex items-center gap-0.5 shrink-0">
                                                    <LogEditButton log={log} />
                                                    <LogDeleteButton
                                                        logId={log.id}
                                                        studentName={`${student.last_name}, ${student.name}`}
                                                        date={log.created_at}
                                                    />
                                                </div>
                                            </div>
                                        )
                                    })}
                                    {studentLogs.length > 5 && (
                                        <p className="text-xs text-slate-400 pt-2 text-center">
                                            +{studentLogs.length - 5} registros más
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            </div>
        </main>
    )
}
