import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { ActivitiesClient } from "@/components/activities/ActivitiesClient"

export default async function EstudianteActividadesPage() {
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
        .select("id, role, institution_id")
        .eq("id", user.id)
        .maybeSingle()

    if (!profile?.institution_id) redirect("/login")

    // ── Obtener el registro students del usuario ──────────────────────
    // students.user_id → users.id (distinto a students.id)
    const { data: studentRecord } = await supabase
        .from("students")
        .select("id, course_id")
        .eq("user_id", user.id)
        .maybeSingle()

    // El estudiante pertenece a un curso — lo usamos directamente
    const myCourseIds: string[] = studentRecord?.course_id
        ? [studentRecord.course_id]
        : []

    // ── Actividades de la institución ─────────────────────────────────
    const { data: allActivities } = await supabase
        .from("activities")
        .select(`
            id, title, description, location,
            start_datetime, end_datetime,
            materials, target, activity_type,
            created_by, active,
            activity_courses(
                course_id,
                courses(id, name, section)
            )
        `)
        .eq("institution_id", profile.institution_id)
        .eq("active", true)
        .order("start_datetime", { ascending: true })

    // ── Filtrar: general siempre, por_curso solo si el estudiante está ─
    const activities = (allActivities ?? []).filter(a => {
        if (a.target === "general") return true
        if (myCourseIds.length === 0) return false
        const activityCourseIds = (a.activity_courses ?? []).map((ac: any) => ac.course_id)
        return activityCourseIds.some((id: string) => myCourseIds.includes(id))
    })

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-4xl px-4 py-8">
                <ActivitiesClient
                    activities={activities}
                    courses={[]}
                    userId={profile.id}
                    userRole={profile.role}
                    institutionId={profile.institution_id}
                    canManage={false}
                />
            </div>
        </main>
    )
}
