import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { EmotionHistoryChart } from "@/components/emotional/emotion-history-chart"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

const EMOTION_SCORE: Record<string, number> = {
    muy_mal: 1,
    mal: 2,
    neutral: 3,
    bien: 4,
    muy_bien: 5,
}

async function getHistorialData() {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch { }
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect("/login")

    const { data: student } = await supabase
        .from("students")
        .select("id, name")
        .eq("user_id", user.id)
        .maybeSingle()

    if (!student) redirect("/login")

    // Últimos 28 días
    const desde = new Date()
    desde.setDate(desde.getDate() - 28)

    const { data: logs } = await supabase
        .from("emotional_logs")
        .select("emotion, intensity, created_at")
        .eq("student_id", student.id)
        .eq("type", "daily")
        .gte("created_at", desde.toISOString())
        .order("created_at", { ascending: true })

    // Agrupar por semana (1 a 4)
    const weeks: Record<string, { total: number; count: number; emotions: string[] }> = {
        "Semana 1": { total: 0, count: 0, emotions: [] },
        "Semana 2": { total: 0, count: 0, emotions: [] },
        "Semana 3": { total: 0, count: 0, emotions: [] },
        "Semana 4": { total: 0, count: 0, emotions: [] },
    }

    const now = new Date()

    logs?.forEach((log) => {
        const diffDays = Math.floor(
            (now.getTime() - new Date(log.created_at).getTime()) / (1000 * 60 * 60 * 24)
        )
        const weekKey =
            diffDays <= 7 ? "Semana 4" :
                diffDays <= 14 ? "Semana 3" :
                    diffDays <= 21 ? "Semana 2" :
                        "Semana 1"

        const score = EMOTION_SCORE[log.emotion] ?? 3
        weeks[weekKey].total += score
        weeks[weekKey].count += 1
        weeks[weekKey].emotions.push(log.emotion)
    })

    const chartData = Object.entries(weeks).map(([semana, data]) => ({
        semana,
        promedio: data.count > 0
            ? Math.round((data.total / data.count) * 10) / 10
            : null,
        registros: data.count,
    }))

    // Detectar tendencia: comparar semanas 3-4 vs 1-2
    const promedioReciente =
        [chartData[2].promedio ?? 0, chartData[3].promedio ?? 0]
            .filter(Boolean)
            .reduce((a, b) => a + b, 0) / 2

    const promedioAnterior =
        [chartData[0].promedio ?? 0, chartData[1].promedio ?? 0]
            .filter(Boolean)
            .reduce((a, b) => a + b, 0) / 2

    const tendencia: "mejorando" | "empeorando" | "estable" =
        promedioReciente > promedioAnterior + 0.3 ? "mejorando" :
            promedioReciente < promedioAnterior - 0.3 ? "empeorando" :
                "estable"

    const totalRegistros = logs?.length ?? 0

    return { student, chartData, tendencia, totalRegistros }
}

export default async function HistorialPage() {
    const { student, chartData, tendencia, totalRegistros } = await getHistorialData()

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">

                <div className="flex items-center gap-3">
                    <Link
                        href="/estudiante"
                        className="text-slate-500 hover:text-slate-700 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-2xl font-semibold text-slate-900">
                        Tu historial emocional
                    </h1>
                </div>

                <EmotionHistoryChart
                    chartData={chartData}
                    tendencia={tendencia}
                    totalRegistros={totalRegistros}
                    nombre={student.name}
                />

            </div>
        </main>
    )
}
