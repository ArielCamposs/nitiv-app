import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { ExecutiveReport } from "@/components/reports/ExecutiveReport"

export default async function EstadisticasPage() {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll: () => cookieStore.getAll() } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect("/login")

    const { data: profile } = await supabase
        .from("users")
        .select("role, institution_id")
        .eq("id", user.id)
        .single()

    if (!profile) redirect("/login")

    const allowedRoles = ["director", "dupla", "admin", "utp"]
    if (!allowedRoles.includes(profile.role)) redirect("/")

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Estadísticas</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Informe ejecutivo semestral institucional
                    </p>
                </div>
                <ExecutiveReport institutionId={profile.institution_id} />
            </div>
        </main>
    )
}
