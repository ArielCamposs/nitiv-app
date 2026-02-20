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

    const since = new Date()
    since.setDate(since.getDate() - 28)

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
            .gte("log_date", since.toISOString().split("T")[0])
            .order("log_date", { ascending: true }),
    ])

    const today = new Date()
    const dow = today.getDay() === 0 ? 6 : today.getDay() - 1
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - dow)

    // ── Vista por día (última semana, Lun-Vie) ──
    const byDay = (courses ?? []).map(course => {
        const cells = DAY_NAMES.map((day, di) => {
            const date = new Date(startOfWeek)
            date.setDate(startOfWeek.getDate() + di)
            const dateStr = date.toISOString().split("T")[0]

            const dayLogs = (logs ?? []).filter(
                l => l.course_id === course.id && l.log_date === dateStr
            )
            const worst = dayLogs.sort(
                (a, b) => (ENERGY_SCORE[a.energy_level] ?? 3) - (ENERGY_SCORE[b.energy_level] ?? 3)
            )[0]

            return {
                day,
                energy: worst?.energy_level ?? null,
                score: worst ? (ENERGY_SCORE[worst.energy_level] ?? 3) : null,
            }
        })

        const scored = cells.filter(c => c.score !== null)
        const avg = scored.length > 0
            ? scored.reduce((a, c) => a + (c.score ?? 0), 0) / scored.length
            : null

        return {
            courseId: course.id,
            courseName: `${course.name} ${course.section ?? ""}`.trim(),
            cells,
            avg,
        }
    })

    // ── Vista por semana (últimas 4 semanas) ──
    const byWeek = (courses ?? []).map(course => {
        const cells = WEEK_NAMES.map((week, wi) => {
            const weekStart = new Date(today)
            weekStart.setDate(today.getDate() - (3 - wi) * 7 - dow)
            const weekEnd = new Date(weekStart)
            weekEnd.setDate(weekStart.getDate() + 4)

            const weekLogs = (logs ?? []).filter(l => {
                if (l.course_id !== course.id) return false
                const d = new Date(l.log_date)
                return d >= weekStart && d <= weekEnd
            })

            const worst = weekLogs.sort(
                (a, b) => (ENERGY_SCORE[a.energy_level] ?? 3) - (ENERGY_SCORE[b.energy_level] ?? 3)
            )[0]

            const avg = weekLogs.length > 0
                ? weekLogs.reduce((a, l) => a + (ENERGY_SCORE[l.energy_level] ?? 3), 0) / weekLogs.length
                : null

            return {
                week,
                energy: worst?.energy_level ?? null,
                score: avg,
                registros: weekLogs.length,
            }
        })

        const scored = cells.filter(c => c.score !== null)
        const avg = scored.length > 0
            ? scored.reduce((a, c) => a + (c.score ?? 0), 0) / scored.length
            : null

        return {
            courseId: course.id,
            courseName: `${course.name} ${course.section ?? ""}`.trim(),
            cells,
            avg,
        }
    })

    return { byDay, byWeek }
}
