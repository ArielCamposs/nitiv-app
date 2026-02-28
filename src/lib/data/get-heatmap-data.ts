import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

const ENERGY_SCORE: Record<string, number> = {
    explosiva: 1, apatica: 2, inquieta: 3, regulada: 4,
}

const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie"]
const WEEK_NAMES = ["S1", "S2", "S3", "S4"]

export async function getHeatmapData() {
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
        .select("institution_id")
        .eq("id", user.id)
        .maybeSingle()

    if (!profile?.institution_id) redirect("/login")

    // 90 días para el historial
    const since90 = new Date()
    since90.setDate(since90.getDate() - 90)

    const [{ data: courses }, { data: logs }] = await Promise.all([
        supabase
            .from("courses")
            .select("id, name, section, level")
            .eq("institution_id", profile.institution_id)
            .eq("active", true)
            .order("name"),
        supabase
            .from("teacher_logs")
            .select("course_id, energy_level, log_date")
            .eq("institution_id", profile.institution_id)
            .gte("log_date", since90.toISOString().split("T")[0])
            .order("log_date", { ascending: true }),
    ])

    // Adaptar cursos al formato esperado por ClimateHistoryChart: { course_id, courses: { name } }
    const adaptedCourses = (courses ?? []).map(c => ({
        course_id: c.id,
        courses: { name: `${c.name} ${c.section ?? ""}`.trim() }
    }))

    return { courses: adaptedCourses, historyLogs: logs ?? [] }
}
