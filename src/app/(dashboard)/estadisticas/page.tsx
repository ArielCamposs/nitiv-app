import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { StatisticsDashboard } from "@/components/statistics/StatisticsDashboard"

const ALLOWED_ROLES = ["director", "dupla", "utp"]  // sin admin ni estudiantes

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
        .select("role, institution_id, institution:institution_id(name)")
        .eq("id", user.id)
        .single()

    if (!profile || !ALLOWED_ROLES.includes(profile.role)) redirect("/")

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Estadísticas</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Resumen institucional de bienestar, incidentes y actividades
                    </p>
                </div>
                <StatisticsDashboard
                    institutionId={profile.institution_id}
                    institutionName={(profile as any).institution?.name ?? "Institución"}
                />
            </div>
        </main>
    )
}
