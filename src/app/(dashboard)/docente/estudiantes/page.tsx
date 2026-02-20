import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from "@/components/ui/card"

async function getStudentsByCourse() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Obtener cursos del docente
    const { data: courseTeachers } = await supabase
        .from("course_teachers")
        .select("course_id, is_head_teacher, courses(id, name, level, section)")
        .eq("teacher_id", user.id)

    if (!courseTeachers?.length) return { courses: [] }

    // Para cada curso obtener estudiantes
    const courseIds = courseTeachers.map((ct) => ct.course_id)

    const { data: students } = await supabase
        .from("students")
        .select("id, name, last_name, rut, course_id")
        .in("course_id", courseIds)
        .eq("active", true)
        .order("last_name")

    return {
        courses: courseTeachers.map((ct) => ({
            ...ct,
            students: students?.filter((s) => s.course_id === ct.course_id) ?? [],
        })),
    }
}

const EMOTION_LABELS: Record<string, { label: string; color: string }> = {
    muy_bien: { label: "Muy bien", color: "bg-emerald-100 text-emerald-700" },
    bien: { label: "Bien", color: "bg-emerald-50 text-emerald-600" },
    neutral: { label: "Neutral", color: "bg-slate-100 text-slate-600" },
    mal: { label: "Mal", color: "bg-rose-100 text-rose-600" },
    muy_mal: { label: "Muy mal", color: "bg-rose-200 text-rose-800" },
}

export default async function EstudiantesDocentePage() {
    const data = await getStudentsByCourse()

    if (!data || !data.courses.length) {
        return (
            <main className="min-h-screen bg-slate-50">
                <div className="mx-auto max-w-4xl px-4 py-8">
                    <p className="text-slate-500">
                        No tienes cursos asignados todavía.
                    </p>
                </div>
            </main>
        )
    }

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
                <h1 className="text-2xl font-semibold text-slate-900">
                    Mis estudiantes
                </h1>

                {data.courses.map((courseData: any) => (
                    <div key={courseData.course_id} className="space-y-3">
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-medium text-slate-800">
                                {courseData.courses?.name}
                            </h2>
                            {courseData.is_head_teacher && (
                                <Badge variant="outline" className="text-xs">
                                    Profesor Jefe
                                </Badge>
                            )}
                            <span className="text-xs text-slate-400">
                                {courseData.students.length} estudiantes
                            </span>
                        </div>

                        {courseData.students.length === 0 ? (
                            <p className="text-sm text-slate-400">
                                No hay estudiantes en este curso todavía.
                            </p>
                        ) : (
                            <div className="grid gap-2 sm:grid-cols-2">
                                {courseData.students.map((student: any) => (
                                    <Link
                                        key={student.id}
                                        href={`/docente/estudiantes/${student.id}`}
                                    >
                                        <Card className="cursor-pointer hover:shadow-md transition-shadow">
                                            <CardContent className="flex items-center justify-between py-4 px-4">
                                                <div>
                                                    <p className="text-sm font-medium text-slate-900">
                                                        {student.last_name}, {student.name}
                                                    </p>
                                                    {student.rut && (
                                                        <p className="text-xs text-slate-400">
                                                            {student.rut}
                                                        </p>
                                                    )}
                                                </div>
                                                <span className="text-xs text-indigo-500 font-medium">
                                                    Ver perfil →
                                                </span>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </main>
    )
}
