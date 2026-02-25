import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import { DecEditForm } from "@/components/dec/dec-edit-form"

async function getIncidentForEdit(id: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
        .from("users").select("role").eq("id", user.id).single()

    if (profile?.role !== "admin") return null

    const { data: incident } = await supabase
        .from("incidents")
        .select(`
            id, folio, type, severity, location, context,
            conduct_types, triggers, actions_taken,
            description, guardian_contacted, incident_date,
            students ( id, name, last_name, courses ( name ) )
        `)
        .eq("id", id)
        .maybeSingle()

    return incident ?? null
}

export default async function DecEditPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const incident = await getIncidentForEdit(id)

    if (!incident) return notFound()

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Editar caso DEC</h1>
                    <p className="text-sm text-slate-500">
                        {(incident.students as any)?.last_name}, {(incident.students as any)?.name}
                        {incident.folio && (
                            <span className="font-mono ml-2 text-slate-400">{incident.folio}</span>
                        )}
                    </p>
                </div>
                <DecEditForm incident={incident as any} />
            </div>
        </main>
    )
}
