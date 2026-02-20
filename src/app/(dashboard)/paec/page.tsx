import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PaecList } from "@/components/paec/paec-list"

async function getPaecData() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
        .from("users")
        .select("institution_id, role")
        .eq("id", user.id)
        .maybeSingle()

    if (!profile || profile.role === "estudiante") return null

    const { data: paecs } = await supabase
        .from("paec")
        .select(`
      id,
      student_id,
      created_at,
      review_date,
      active,
      representative_signed,
      guardian_signed,
      students (
        name,
        last_name,
        rut,
        courses ( name, level )
      )
    `)
        .eq("institution_id", profile.institution_id)
        .eq("active", true)
        .order("created_at", { ascending: false })

    return { paecs: paecs ?? [], role: profile.role }
}

export default async function PaecPage() {
    const data = await getPaecData()

    if (!data) {
        return (
            <main className="min-h-screen bg-slate-50">
                <div className="mx-auto max-w-4xl px-4 py-8">
                    <p className="text-slate-500">No tienes acceso a este módulo.</p>
                </div>
            </main>
        )
    }

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900">PAEC</h1>
                        <p className="text-sm text-slate-500">
                            Plan de Acompañamiento Emocional y Conductual
                        </p>
                    </div>
                    <Link href="/paec/nuevo">
                        <Button>+ Nuevo PAEC</Button>
                    </Link>
                </div>

                <PaecList paecs={data.paecs as any} />
            </div>
        </main>
    )
}
