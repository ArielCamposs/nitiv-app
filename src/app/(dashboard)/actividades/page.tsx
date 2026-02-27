import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { ActivitiesClient } from "@/components/activities/ActivitiesClient"

const CAN_MANAGE_ROLES = ["dupla", "convivencia", "director", "admin"]

async function getActivitiesData() {
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

    if (!profile) redirect("/login")

    const [{ data: activities }, { data: courses }] = await Promise.all([
        supabase
            .from("activities")
            .select("*, activity_courses(course_id, courses(id, name, section))")
            .eq("institution_id", profile.institution_id)
            .eq("active", true)
            .order("start_datetime", { ascending: true }),
        supabase
            .from("courses")
            .select("id, name, section")
            .eq("institution_id", profile.institution_id)
            .eq("active", true)
            .order("name"),
    ])

    return {
        activities: activities ?? [],
        courses: courses ?? [],
        userId: profile.id,
        userRole: profile.role,
        institutionId: profile.institution_id,
        canManage: CAN_MANAGE_ROLES.includes(profile.role),
    }
}

export default async function ActividadesPage() {
    const data = await getActivitiesData()
    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-4xl px-4 py-8">
                <ActivitiesClient {...data} studentId={null} />
            </div>
        </main>
    )
}
