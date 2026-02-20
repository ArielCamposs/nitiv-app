import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from "@/components/ui/card"
import { PerceptionForm } from "@/components/teacher/perception-form"

const EMOTION_MAP: Record<string, { label: string; color: string }> = {
    muy_bien: { label: "😄 Muy bien", color: "text-emerald-600" },
    bien: { label: "🙂 Bien", color: "text-emerald-500" },
    neutral: { label: "😐 Neutral", color: "text-slate-500" },
    mal: { label: "😟 Mal", color: "text-rose-500" },
    muy_mal: { label: "😢 Muy mal", color: "text-rose-700" },
}

async function getStudentForTeacher(studentId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
        .from("users")
        .select("id, institution_id")
        .eq("id", user.id)
        .maybeSingle()

    if (!profile) return null

    // Verificar que el estudiante es de un curso del docente
    // Primero obtenemos los cursos del docente
    const { data: teacherCourses } = await supabase
        .from("course_teachers")
        .select("course_id")
        .eq("teacher_id", user.id)

    if (!teacherCourses?.length) return null
    const courseIds = teacherCourses.map(tc => tc.course_id)

    const { data: student } = await supabase
        .from("students")
        .select("id, name, last_name, rut, course_id, courses(name, level)")
        .eq("id", studentId)
        .in("course_id", courseIds) // Security check: must be in one of teacher's courses
        .maybeSingle()

    if (!student) return null

    // Últimos 7 registros emocionales del estudiante
    const { data: recentLogs } = await supabase
        .from("emotional_logs")
        .select("emotion, intensity, type, created_at")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(7)

    return {
        student,
        recentLogs: recentLogs ?? [],
        teacherId: profile.id,
        institutionId: profile.institution_id,
    }
}

export default async function StudentProfilePage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const data = await getStudentForTeacher(id)

    if (!data) return notFound()

    const { student, recentLogs, teacherId, institutionId } = data

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">

                {/* Encabezado del estudiante */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900">
                            {student.name} {student.last_name}
                        </h1>
                        <p className="text-sm text-slate-500">
                            {(student.courses as any)?.name} · {student.rut ?? "Sin RUT"}
                        </p>
                    </div>
                </div>

                {/* Últimos registros emocionales */}
                <Card>
                    <CardHeader>
                        <CardTitle>Registros emocionales recientes</CardTitle>
                        <CardDescription>
                            Últimos 7 registros del estudiante
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {recentLogs.length === 0 ? (
                            <p className="text-sm text-slate-400">
                                Este estudiante aún no ha registrado emociones.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {recentLogs.map((log, i) => {
                                    const emotion = EMOTION_MAP[log.emotion]
                                    return (
                                        <div
                                            key={i}
                                            className="flex items-center justify-between rounded-md border px-3 py-2"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={`text-sm font-medium ${emotion?.color}`}
                                                >
                                                    {emotion?.label ?? log.emotion}
                                                </span>
                                                <Badge
                                                    variant="outline"
                                                    className="text-[10px] capitalize"
                                                >
                                                    {log.type === "weekly" ? "Semanal" : "Diario"}
                                                </Badge>
                                            </div>
                                            <span className="text-xs text-slate-400">
                                                {new Date(log.created_at).toLocaleDateString("es-CL", {
                                                    day: "2-digit",
                                                    month: "short",
                                                })}
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Formulario de percepción docente */}
                <PerceptionForm
                    teacherId={teacherId}
                    studentId={student.id}
                    institutionId={institutionId}
                />
            </div>
        </main>
    )
}
