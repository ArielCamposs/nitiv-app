import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

async function getData() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect("/login")

    const { data: profile } = await supabase
        .from("users")
        .select("institution_id, role")
        .eq("id", user.id)
        .single()

    if (!profile?.institution_id) redirect("/login")

    const { data: courses } = await supabase
        .from("courses")
        .select("id, name, level, section")
        .eq("institution_id", profile.institution_id)
        .eq("active", true)
        .order("name")

    const courseIds = (courses ?? []).map(c => c.id)

    const { data: students } = courseIds.length
        ? await supabase
            .from("students")
            .select("id, name, last_name, rut, course_id")
            .in("course_id", courseIds)
            .eq("active", true)
            .order("last_name")
        : { data: [] }

    // Alertas activas por estudiante (para marcar en rojo)
    const { data: activeAlerts } = await supabase
        .from("alerts")
        .select("student_id")
        .eq("institution_id", profile.institution_id)
        .eq("resolved", false)

    const alertSet = new Set((activeAlerts ?? []).map(a => a.student_id))

    return {
        courses: (courses ?? []).map(c => ({
            ...c,
            students: (students ?? [])
                .filter(s => s.course_id === c.id)
                .map(s => ({ ...s, hasAlert: alertSet.has(s.id) })),
        })),
    }
}

export default async function DirectorEstudiantesPage() {
    const { courses } = await getData()

    const totalStudents = courses.reduce((acc, c) => acc + c.students.length, 0)

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Estudiantes</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        {totalStudents} estudiante{totalStudents !== 1 ? "s" : ""} en {courses.length} curso{courses.length !== 1 ? "s" : ""}
                    </p>
                </div>

                {courses.length === 0 && (
                    <p className="text-slate-400 text-sm">No hay cursos activos en la institución.</p>
                )}

                {courses.map(course => (
                    <div key={course.id} className="space-y-3">
                        {/* Header del curso */}
                        <div className="flex items-center gap-3">
                            <h2 className="text-base font-semibold text-slate-800">
                                {course.name}{course.section ? ` ${course.section}` : ""}
                            </h2>
                            <span className="text-xs text-slate-400">
                                {course.students.length} estudiantes
                            </span>
                        </div>

                        {course.students.length === 0 ? (
                            <p className="text-sm text-slate-400">Sin estudiantes asignados.</p>
                        ) : (
                            <div className="grid gap-2 sm:grid-cols-2">
                                {course.students.map(student => (
                                    <Link key={student.id} href={`/docente/estudiantes/${student.id}`}>
                                        <Card className="cursor-pointer hover:shadow-md transition-shadow">
                                            <CardContent className="flex items-center justify-between py-4 px-4">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-medium text-slate-900">
                                                            {student.last_name}, {student.name}
                                                        </p>
                                                        {student.hasAlert && (
                                                            <span className="h-2 w-2 rounded-full bg-rose-400 shrink-0" title="Tiene alertas activas" />
                                                        )}
                                                    </div>
                                                    {student.rut && (
                                                        <p className="text-xs text-slate-400">{student.rut}</p>
                                                    )}
                                                </div>
                                                <span className="text-xs text-indigo-500 font-medium shrink-0">
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
