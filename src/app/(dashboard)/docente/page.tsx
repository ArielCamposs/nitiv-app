import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { TeacherDashboardClient } from "@/components/docente/teacher-dashboard-client"

const ENERGY_SCORE: Record<string, number> = {
    regulada: 4,
    inquieta: 3,
    apatica: 2,
    explosiva: 1,
}

async function getTeacherData() {
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
        .select("id, institution_id, name, last_name")
        .eq("id", user.id)
        .maybeSingle()

    if (!profile) redirect("/login")

    // Últimos 28 días
    const since = new Date()
    since.setDate(since.getDate() - 28)

    const { data: teacherLogs } = await supabase
        .from("teacher_logs")
        .select("id, course_id, energy_level, tags, notes, log_date")
        .eq("teacher_id", user.id)
        .gte("log_date", since.toISOString().split("T")[0])
        .order("log_date", { ascending: true })

    const courseIds = [...new Set((teacherLogs ?? []).map(l => l.course_id))]

    const { data: courses } = courseIds.length > 0
        ? await supabase.from("courses").select("id, name").in("id", courseIds)
        : { data: [] }

    const { data: students } = courseIds.length > 0
        ? await supabase
            .from("students")
            .select("id, name, last_name, course_id")
            .in("course_id", courseIds)
        : { data: [] }

    const studentIds = (students ?? []).map(s => s.id)

    const { data: latestEmotions } = studentIds.length > 0
        ? await supabase
            .from("emotional_logs")
            .select("student_id, emotion, created_at")
            .in("student_id", studentIds)
            .eq("type", "daily")
            .order("created_at", { ascending: false })
        : { data: [] }

    const { data: alerts } = studentIds.length > 0
        ? await supabase
            .from("alerts")
            .select("id, student_id, type, description, created_at")
            .eq("institution_id", profile.institution_id)
            .in("student_id", studentIds)
            .eq("resolved", false)
            .order("created_at", { ascending: false })
            .limit(5)
        : { data: [] }

    // Última emoción por estudiante
    const latestByStudent: Record<string, string> = {}
    for (const log of (latestEmotions ?? [])) {
        if (!latestByStudent[log.student_id]) {
            latestByStudent[log.student_id] = log.emotion
        }
    }

    // ── Heatmap ──
    const today = new Date()
    const dow = today.getDay() === 0 ? 6 : today.getDay() - 1 // 0=Lun
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - dow)

    const dayNames = ["Lun", "Mar", "Mié", "Jue", "Vie"]
    const weekLabels = ["S1", "S2", "S3", "S4"]

    const heatmapData = weekLabels.flatMap((week, wi) =>
        dayNames.map((day, di) => {
            const date = new Date(startOfWeek)
            date.setDate(startOfWeek.getDate() - (3 - wi) * 7 + di)
            const dateStr = date.toISOString().split("T")[0]

            const logsDay = (teacherLogs ?? []).filter(l => l.log_date === dateStr)
            const worst = logsDay.sort((a, b) =>
                (ENERGY_SCORE[a.energy_level] ?? 3) - (ENERGY_SCORE[b.energy_level] ?? 3)
            )[0]

            return {
                week,
                weekIndex: wi,
                day,
                dayIndex: di,
                energy: worst?.energy_level ?? null,
                score: worst ? (ENERGY_SCORE[worst.energy_level] ?? 3) : 0,
            }
        })
    )

    // ── Chart data por semana ──
    const chartData = weekLabels.map((week, i) => {
        const cells = heatmapData.filter(d => d.week === week && d.energy !== null)
        const avg = cells.length > 0
            ? Math.round((cells.reduce((a, b) => a + b.score, 0) / cells.length) * 10) / 10
            : null
        return { semana: `Semana ${i + 1}`, promedio: avg }
    })

    // ── Tendencia ──
    const mid = new Date()
    mid.setDate(mid.getDate() - 14)

    const withScore = (teacherLogs ?? []).map(l => ({
        ...l,
        score: ENERGY_SCORE[l.energy_level] ?? 3,
        date: new Date(l.log_date),
    }))

    const firstHalf = withScore.filter(l => l.date < mid)
    const secondHalf = withScore.filter(l => l.date >= mid)

    const avgFirst = firstHalf.length > 0 ? firstHalf.reduce((a, b) => a + b.score, 0) / firstHalf.length : null
    const avgSecond = secondHalf.length > 0 ? secondHalf.reduce((a, b) => a + b.score, 0) / secondHalf.length : null

    const tendencia =
        avgFirst === null || avgSecond === null ? "sin_datos" :
            avgSecond > avgFirst + 0.3 ? "mejorando" :
                avgSecond < avgFirst - 0.3 ? "empeorando" :
                    "estable"

    const studentsEnriched = (students ?? []).map(s => ({
        ...s,
        lastEmotion: latestByStudent[s.id] ?? null,
        courseName: courses?.find(c => c.id === s.course_id)?.name ?? "Sin curso",
    }))

    const alertsEnriched = (alerts ?? []).map(a => {
        const st = students?.find(s => s.id === a.student_id)
        return {
            ...a,
            studentName: st ? `${st.name} ${st.last_name}` : "Estudiante",
        }
    })

    return {
        profile,
        courses: courses ?? [],
        studentsEnriched,
        heatmapData,
        chartData,
        tendencia,
        alertsEnriched,
        totalLogs: teacherLogs?.length ?? 0,
    }
}

export default async function DocenteDashboardPage() {
    const data = await getTeacherData()

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">
                        Dashboard Docente
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Clima de tu curso — últimas 4 semanas
                    </p>
                </div>
                <TeacherDashboardClient {...data} />
            </div>
        </main>
    )
}
