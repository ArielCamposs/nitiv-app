import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { ReportesClient } from "@/components/reportes/reportes-client"

const ENERGY_SCORE: Record<string, number> = {
    explosiva: 1, apatica: 2, inquieta: 3, regulada: 4,
}
const EMOTION_LABEL: Record<string, string> = {
    muy_bien: "Muy bien", bien: "Bien", neutral: "Neutral",
    mal: "Mal", muy_mal: "Muy mal",
}

async function getReportesData() {
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

    if (!profile?.institution_id) redirect("/login")
    if (profile.role === "estudiante") redirect("/estudiante")

    const iid = profile.institution_id
    const since = new Date()
    since.setDate(since.getDate() - 90)

    const [
        { data: courses },
        { data: students },
        { data: emotions },
        { data: incidents },
        { data: alerts },
        { data: paecs },
        { data: teacherLogs },
        { data: reporters },
        { data: institution },
        { data: pulseResults },
        { data: activePulse },
    ] = await Promise.all([
        supabase.from("courses").select("id, name, section").eq("institution_id", iid).eq("active", true),
        supabase.from("students").select("id, name, last_name, course_id").eq("institution_id", iid).eq("active", true),
        supabase.from("emotional_logs").select("student_id, emotion, intensity, reflection, created_at").eq("institution_id", iid).gte("created_at", since.toISOString()).order("created_at", { ascending: false }),
        supabase.from("incidents").select("id, student_id, reporter_id, folio, type, severity, resolved, incident_date, end_date").eq("institution_id", iid).order("incident_date", { ascending: false }),
        supabase.from("alerts").select("id, student_id, type, description, resolved, created_at").eq("institution_id", iid).order("created_at", { ascending: false }),
        supabase.from("paec").select("id, student_id, active").eq("institution_id", iid),
        supabase.from("teacher_logs").select("course_id, energy_level, log_date").eq("institution_id", iid).gte("log_date", new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]),
        supabase.from("users").select("id, name, last_name").eq("institution_id", iid),
        supabase.from("institutions").select("name").eq("id", iid).maybeSingle(),
        supabase.from("pulse_cross_results")
            .select("*")
            .eq("institution_id", iid)
            .order("week_start", { ascending: false })
            .limit(5),
        supabase.from("pulse_sessions")
            .select("id, week_start, week_end")
            .eq("institution_id", iid)
            .eq("active", true)
            .maybeSingle(),
    ])

    const studentsMap = Object.fromEntries((students ?? []).map(s => [s.id, s]))
    const coursesMap = Object.fromEntries((courses ?? []).map(c => [c.id, c]))
    const reportersMap = Object.fromEntries((reporters ?? []).map(r => [r.id, r]))

    // ── Excel emociones ──
    const emotionRows = (emotions ?? []).map(e => {
        const st = studentsMap[e.student_id]
        const co = st ? coursesMap[st.course_id ?? ""] : null
        return {
            studentName: st ? `${st.name} ${st.last_name}` : "—",
            courseName: co ? `${co.name} ${co.section ?? ""}`.trim() : "—",
            date: e.created_at, emotion: e.emotion,
            intensity: e.intensity ?? 0, reflection: e.reflection,
        }
    })

    // ── Excel DEC ──
    const incidentRows = (incidents ?? []).map(i => {
        const st = studentsMap[i.student_id]
        const co = st ? coursesMap[st.course_id ?? ""] : null
        const rep = reportersMap[i.reporter_id]
        return {
            folio: i.folio,
            studentName: st ? `${st.name} ${st.last_name}` : "—",
            courseName: co ? `${co.name} ${co.section ?? ""}`.trim() : "—",
            reporterName: rep ? `${rep.name} ${rep.last_name}` : "—",
            type: i.type, severity: i.severity,
            date: i.incident_date, resolved: i.resolved ?? false,
        }
    })

    // ── Excel alertas ──
    const alertRows = (alerts ?? []).map(a => {
        const st = studentsMap[a.student_id]
        const co = st ? coursesMap[st.course_id ?? ""] : null
        return {
            studentName: st ? `${st.name} ${st.last_name}` : "—",
            courseName: co ? `${co.name} ${co.section ?? ""}`.trim() : "—",
            alertType: a.type, description: a.description,
            date: a.created_at, resolved: a.resolved ?? false,
        }
    })

    // ── Meses para PDF institucional ──
    const MONTH_NAMES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
    const mesesMap: Record<string, { total: number; negativos: number; label: string }> = {}
    for (let i = 5; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
        mesesMap[key] = { total: 0, negativos: 0, label: MONTH_NAMES[d.getMonth()] }
    }
    for (const e of (emotions ?? [])) {
        const d = new Date(e.created_at)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
        if (mesesMap[key]) {
            mesesMap[key].total++
            if (e.emotion === "mal" || e.emotion === "muy_mal") mesesMap[key].negativos++
        }
    }
    const mesesData = Object.values(mesesMap).map(m => ({
        mes: m.label, total: m.total, negativos: m.negativos,
        pct: m.total > 0 ? Math.round((m.negativos / m.total) * 100) : 0,
    }))

    // ── Clima por curso ──
    const WEEK_LABELS = ["Semana 1", "Semana 2", "Semana 3", "Semana 4"]
    const now = new Date()

    const coursesClimate = (courses ?? []).filter(c => !!c.id).map(c => {
        const courseLogs = (teacherLogs ?? []).filter(l => l.course_id === c.id)
        const weeks = WEEK_LABELS.map((semana, wi) => {
            const weekStart = new Date(now); weekStart.setDate(now.getDate() - (3 - wi) * 7)
            const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6)
            const weekLogs = courseLogs.filter(l => {
                const d = new Date(l.log_date)
                return d >= weekStart && d <= weekEnd
            })
            const avg = weekLogs.length > 0
                ? weekLogs.reduce((a, l) => a + (ENERGY_SCORE[l.energy_level] ?? 3), 0) / weekLogs.length
                : null
            return { semana, promedio: avg !== null ? Math.round(avg * 10) / 10 : null, registros: weekLogs.length }
        })

        const avg = courseLogs.length > 0
            ? courseLogs.reduce((a, l) => a + (ENERGY_SCORE[l.energy_level] ?? 3), 0) / courseLogs.length
            : null

        const courseStudents = (students ?? []).filter(s => s.course_id === c.id)

        const studentsDetail = courseStudents.map(s => {
            const lastEmo = (emotions ?? [])
                .filter(e => e.student_id === s.id)
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
            const studentAlerts = (alerts ?? []).filter(a => a.student_id === s.id && !a.resolved)
            const studentIncidents = (incidents ?? []).filter(i => i.student_id === s.id && !i.resolved)
            return {
                id: s.id,
                name: `${s.name} ${s.last_name}`,
                lastEmotion: lastEmo ? (EMOTION_LABEL[lastEmo.emotion] ?? lastEmo.emotion) : "Sin registro",
                lastEmotionRaw: lastEmo?.emotion ?? null,
                alertCount: studentAlerts.length,
                incidentCount: studentIncidents.length,
                hasPaec: (paecs ?? []).some(p => p.student_id === s.id && p.active),
            }
        }).sort((a, b) => (b.alertCount + b.incidentCount) - (a.alertCount + a.incidentCount))

        const topStudents = courseStudents.map(s => {
            const lastEmo = (emotions ?? [])
                .filter(e => e.student_id === s.id)
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
            return {
                name: `${s.name} ${s.last_name}`,
                lastEmotion: lastEmo ? (EMOTION_LABEL[lastEmo.emotion] ?? lastEmo.emotion) : "Sin registro",
            }
        })

        return {
            courseId: c.id,
            courseName: `${c.name} ${c.section ?? ""}`.trim(),
            label: avg === null ? "Sin datos" : avg >= 3.5 ? "Regulada" : avg >= 2.5 ? "Inquieta" : avg >= 1.5 ? "Apática" : "Explosiva",
            avgScore: avg,
            registros: courseLogs.length,
            weeks,
            topStudents,
            studentsDetail,
        }
    })

    const studentsList = (students ?? []).map(s => ({
        id: s.id, name: s.name, last_name: s.last_name,
        courseName: coursesMap[s.course_id ?? ""]
            ? `${coursesMap[s.course_id!].name} ${coursesMap[s.course_id!].section ?? ""}`.trim()
            : "Sin curso",
        hasPaec: (paecs ?? []).some(p => p.student_id === s.id && p.active),
    }))

    return {
        role: profile.role,
        emotionRows, incidentRows, alertRows, mesesData,
        coursesClimate,
        institutionName: institution?.name ?? "Institución",
        totalStudents: students?.length ?? 0,
        totalAlerts: (alerts ?? []).filter(a => !a.resolved).length,
        totalIncidents: (incidents ?? []).filter(i => !i.resolved).length,
        studentsList,
        emotionsByStudent: (emotions ?? []),
        incidentsByStudent: (incidents ?? []),
        alertsByStudent: (alerts ?? []),
        studentsMap,
        pulseResults: pulseResults ?? [],
        activePulse: activePulse ?? null,
    }
}

export default async function ReportesPage() {
    const data = await getReportesData()
    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Reportes</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Exporta información en PDF o Excel
                    </p>
                </div>
                <ReportesClient {...data} />
            </div>
        </main>
    )
}
