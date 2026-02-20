import { createClient } from "@/lib/supabase/server"
import { ClimateRegisterCard } from "@/components/teacher/climate-register-card"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

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

    return {
        teacherId: profile.id,
        institutionId: profile.institution_id,
        courses: courses ?? [],
    }
}

export default async function ClimaPage() {
    const data = await getTeacherCourses()
    if (!data) return <div>No se encontró tu perfil docente.</div>

    const { teacherId, institutionId, courses } = data

    // Si tiene solo un curso, lo seleccionamos directo
    const defaultCourse =
        courses.length === 1 ? (courses[0].courses as any) : null

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
                <h1 className="text-2xl font-semibold text-slate-900">
                    Registro de clima de aula
                </h1>

                {courses.length === 0 && (
                    <p className="text-slate-500">
                        Aún no tienes cursos asignados. Solicita al administrador que te asigne uno.
                    </p>
                )}

                {courses.map((c: any) => (
                    <div key={c.course_id} className="space-y-2">
                        <h2 className="text-sm font-medium text-slate-500">
                            {c.courses?.name}
                            {c.is_head_teacher ? " — Profesor Jefe" : ""}
                        </h2>
                        <ClimateRegisterCard
                            teacherId={teacherId}
                            courseId={c.course_id}
                            institutionId={institutionId}
                        />
                    </div>
                ))}
            </div>
        </main>
    )
}
