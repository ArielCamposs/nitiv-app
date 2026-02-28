import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { ConvivenciaRecordsTabs } from "@/components/convivencia/convivencia-records-tabs"

const BLOCKED_ROLES = ["estudiante", "centro_alumnos", "admin"]

export default async function RegistrosConvivenciaPage() {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) {
                    try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) }
                    catch { }
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect("/login")

    const { data: profile } = await supabase
        .from("users")
        .select("id, institution_id, role, name, last_name")
        .eq("id", user.id)
        .maybeSingle()

    if (!profile?.institution_id || BLOCKED_ROLES.includes(profile.role)) {
        redirect("/")
    }

    // Last 90 days of records for this institution
    const since = new Date()
    since.setDate(since.getDate() - 90)

    const [{ data: records }, { data: students }] = await Promise.all([
        supabase
            .from("convivencia_records")
            .select(`
                id, type, severity, location, description,
                involved_count, actions_taken, resolved,
                resolution_notes, incident_date,
                convivencia_record_students (
                    student_id,
                    students ( id, name, last_name )
                )
            `)
            .eq("institution_id", profile.institution_id)
            .gte("incident_date", since.toISOString())
            .order("incident_date", { ascending: false }),

        // All active students for the institution (for the picker)
        supabase
            .from("students")
            .select("id, name, last_name, rut, courses(name)")
            .eq("institution_id", profile.institution_id)
            .eq("active", true)
            .order("last_name"),
    ])

    const reporterName = `${profile.name} ${profile.last_name ?? ""}`.trim()

    const roleHomeMap: Record<string, string> = {
        docente: "/docente", director: "/director", dupla: "/dupla",
        convivencia: "/convivencia", inspector: "/inspector", utp: "/utp",
    }
    const backHref = roleHomeMap[profile.role] ?? "/"

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
                <div className="flex items-center gap-3">
                    <Link href={backHref} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900">Registros de Convivencia</h1>
                        <p className="text-slate-500 text-sm mt-1">
                            Ingreso y seguimiento de casos de convivencia escolar
                        </p>
                    </div>
                </div>

                <ConvivenciaRecordsTabs
                    initialRecords={(records ?? []) as any}
                    students={(students ?? []) as any}
                    reporterName={reporterName}
                />
            </div>
        </main>
    )
}
