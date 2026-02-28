import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { DecListDupla } from "@/components/dec/dec-list-dupla"
import { MarkDecSeen } from "@/components/dec/mark-dec-seen"

async function getDecCasesForAdmin() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
        .from("users")
        .select("institution_id, role")
        .eq("id", user.id)
        .maybeSingle()

    if (!profile || profile.role !== "admin") return null

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

    return { cases: cases ?? [], role: profile.role, userId: user.id }
}

export default async function AdminDecPage() {
    const data = await getDecCasesForAdmin()
    if (!data) redirect("/login")

    const { cases, userId, role } = data

    return (
        <main className="min-h-screen bg-slate-50">
            <MarkDecSeen />
            <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900">Registro DEC</h1>
                        <p className="text-sm text-slate-500">
                            Todos los casos de la institución — vista administrador
                        </p>
                    </div>
                    <Link href="/dec/nuevo">
                        <Button>+ Nuevo caso DEC</Button>
                    </Link>
                </div>
                <DecListDupla cases={cases as any} currentUserId={userId} userRole={role} />
            </div>
        </main>
    )
}
