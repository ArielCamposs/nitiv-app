import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { DecListDupla } from "@/components/dec/dec-list-dupla"

async function getDecCasesForConvivencia() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
        .from("users")
        .select("institution_id, role")
        .eq("id", user.id)
        .maybeSingle()

    if (profile?.role !== "convivencia") return null

    const { data: cases } = await supabase
        .from("incidents")
        .select(`
      id,
      folio,
      type,
      severity,
      location,
      incident_date,
      resolved,
      students (
        id,
        name,
        last_name,
        courses ( name )
      ),
      users!reporter_id (
        name,
        last_name,
        role
      ),
      incident_recipients (
        id,
        recipient_id,
        seen,
        seen_at,
        role
      )
    `)
        .eq("institution_id", profile.institution_id)
        .order("incident_date", { ascending: false })

    return { cases: cases ?? [], role: "convivencia", userId: user.id }
}

export default async function ConvivenciaDecPage() {
    const data = await getDecCasesForConvivencia()

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
                        <h1 className="text-2xl font-semibold text-slate-900">
                            Registro DEC
                        </h1>
                        <p className="text-sm text-slate-500">
                            Casos de Desregulación Emocional y Conductual
                        </p>
                    </div>
                    <Link href="/dec/nuevo">
                        <Button>+ Nuevo caso DEC</Button>
                    </Link>
                </div>

                <DecListDupla cases={data.cases as any} currentUserId={data.userId} userRole={data.role} />
            </div>
        </main>
    )
}
