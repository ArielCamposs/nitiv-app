import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import { PaecEditForm } from "../../../../../components/paec/paec-edit-form"

async function getPaecData(id: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
        .from("users")
        .select("institution_id, role")
        .eq("id", user.id)
        .maybeSingle()

    if (!profile || !["dupla", "director"].includes(profile.role)) return null

    const [{ data: paec }, { data: students }, { data: professionals }, { data: courses }] =
        await Promise.all([
            supabase
                .from("paec")
                .select("*")
                .eq("id", id)
                .eq("institution_id", profile.institution_id)
                .maybeSingle(),
            supabase
                .from("students")
                .select("id, name, last_name, rut, birthdate, course_id")
                .eq("institution_id", profile.institution_id)
                .order("last_name"),
            supabase
                .from("users")
                .select("id, name, last_name, role")
                .eq("institution_id", profile.institution_id)
                .in("role", ["dupla", "director", "docente", "convivencia"])
                .order("last_name"),
            supabase
                .from("courses")
                .select("id, name")
                .eq("institution_id", profile.institution_id),
        ])

    if (!paec) return null

    return {
        paec,
        students: students ?? [],
        professionals: professionals ?? [],
        courses: courses ?? [],
        institutionId: profile.institution_id,
    }
}

export default async function EditarPaecPage({
    params,
}: {
    params: { id: string }
}) {
    const resolvedParams = await params
    const data = await getPaecData(resolvedParams.id)
    if (!data) notFound()

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-3xl px-4 py-8 space-y-2">
                <h1 className="text-2xl font-semibold text-slate-900">Editar PAEC</h1>
                <p className="text-sm text-slate-500 pb-4">
                    Modifica los datos del Plan de Acompañamiento Emocional y Conductual
                </p>
                <PaecEditForm
                    paec={data.paec as any}
                    students={data.students as any}
                    professionals={data.professionals as any}
                    courses={data.courses as any}

                />
            </div>
        </main>
    )
}
