import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PaecForm } from "@/components/paec/paec-form"

async function getFormData() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
        .from("users")
        .select("institution_id, role")
        .eq("id", user.id)
        .maybeSingle()

    if (!profile || profile.role === "estudiante") return null

    // Query 1: solo estudiantes básico (ya sabemos que funciona)
    const { data: students, error: e1 } = await supabase
        .from("students")
        .select("id, name, last_name, rut, birthdate, course_id")
        .eq("institution_id", profile.institution_id)
        .order("last_name")

    console.log("students:", students)
    console.log("error students:", e1)

    // Query 2: profesionales
    const { data: professionals, error: e2 } = await supabase
        .from("users")
        .select("id, name, last_name, role")
        .eq("institution_id", profile.institution_id)
        .in("role", ["dupla", "director", "docente", "convivencia"])
        .order("last_name")

    console.log("professionals:", professionals)
    console.log("error professionals:", e2)

    // Query 3: cursos separado
    const { data: courses, error: e3 } = await supabase
        .from("courses")
        .select("id, name")
        .eq("institution_id", profile.institution_id)

    console.log("courses:", courses)
    console.log("error courses:", e3)

    return {
        students: students ?? [],
        professionals: professionals ?? [],
        courses: courses ?? [],
        institutionId: profile.institution_id,
    }
}

export default async function NuevoPaecPage() {
    const data = await getFormData()
    if (!data) redirect("/paec")

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-3xl px-4 py-8 space-y-2">
                <h1 className="text-2xl font-semibold text-slate-900">Nuevo PAEC</h1>
                <p className="text-sm text-slate-500 pb-4">
                    Ficha única por estudiante — Plan de Acompañamiento Emocional y Conductual
                </p>
                <PaecForm
                    students={data.students as any}
                    professionals={data.professionals as any}
                    courses={data.courses as any}
                    institutionId={data.institutionId}
                />
            </div>
        </main>
    )
}
