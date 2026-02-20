import { createClient } from "@/lib/supabase/server"
import { DecForm } from "@/components/dec/dec-form"

async function getFormData() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
        .from("users")
        .select("id, institution_id")
        .eq("id", user.id)
        .maybeSingle()

    if (!profile) return null

    const { data: students } = await supabase
        .from("students")
        .select("id, name, last_name, courses(name)")
        .eq("institution_id", profile.institution_id)
        .eq("active", true)
        .order("last_name")

    // Usuarios que pueden recibir notificaciones DEC
    const { data: notifiables } = await supabase
        .from("users")
        .select("id, name, last_name, role")
        .eq("institution_id", profile.institution_id)
        .eq("active", true)
        .in("role", ["director", "dupla", "convivencia", "inspector", "utp"])
        .neq("id", profile.id) // no notificarse a sí mismo
        .order("role")

    return {
        students: students ?? [],
        notifiables: notifiables ?? [],
        teacherId: profile.id,
        institutionId: profile.institution_id,
    }
}

export default async function NuevoDecPage() {
    const data = await getFormData()
    if (!data) return <div>No se pudo cargar el formulario.</div>

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">
                        Nuevo caso DEC
                    </h1>
                    <p className="text-sm text-slate-500">
                        Registro de Desregulación Emocional y Conductual
                    </p>
                </div>

                <DecForm
                    students={data.students as any}
                    notifiables={data.notifiables as any}
                    teacherId={data.teacherId}
                    institutionId={data.institutionId}
                />
            </div>
        </main>
    )
}
