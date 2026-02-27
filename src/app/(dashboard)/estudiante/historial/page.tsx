import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const EMOTION_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
    muy_bien: { label: "Muy bien", emoji: "😄", color: "bg-emerald-100 text-emerald-700" },
    bien: { label: "Bien", emoji: "🙂", color: "bg-emerald-50 text-emerald-600" },
    neutral: { label: "Neutral", emoji: "😐", color: "bg-slate-100 text-slate-600" },
    mal: { label: "Mal", emoji: "😔", color: "bg-rose-100 text-rose-600" },
    muy_mal: { label: "Muy mal", emoji: "😢", color: "bg-rose-200 text-rose-700" },
}

export default async function HistorialPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect("/login")

    const { data: student } = await supabase
        .from("students")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle()

    if (!student) redirect("/login")

    const { data: logs } = await supabase
        .from("emotional_logs")
        .select("id, emotion, stress_level, anxiety_level, reflection, type, created_at")
        .eq("student_id", student.id)
        .order("created_at", { ascending: false })
        .limit(50)

    const total = logs?.length ?? 0
    const conReflexion = logs?.filter(l => l.reflection).length ?? 0

    // Emoción más frecuente
    const emotionCount = (logs ?? []).reduce((acc: Record<string, number>, l: any) => {
        acc[l.emotion] = (acc[l.emotion] ?? 0) + 1
        return acc
    }, {})
    // Helper para type safe sort
    const topEmotion = Object.entries(emotionCount).sort((a, b) => b[1] - a[1])[0]?.[0]

    const avgStress = total > 0
        ? ((logs ?? []).reduce((a, l) => a + (l.stress_level ?? 3), 0) / total).toFixed(1)
        : "—"

    const avgAnxiety = total > 0
        ? ((logs ?? []).reduce((a, l) => a + (l.anxiety_level ?? 3), 0) / total).toFixed(1)
        : "—"

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
                <h1 className="text-2xl font-semibold text-slate-900">Mi historial emocional</h1>

                {/* Estadísticas */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: "Registros totales", value: total },
                        { label: "Con reflexión", value: conReflexion },
                        { label: "Estrés / Ansiedad prom.", value: avgStress !== "—" && avgAnxiety !== "—" ? `${avgStress} / ${avgAnxiety}` : "—" },
                        { label: "Emoción frecuente", value: topEmotion ? EMOTION_CONFIG[topEmotion]?.emoji + " " + EMOTION_CONFIG[topEmotion]?.label : "—" },
                    ].map((stat) => (
                        <Card key={stat.label}>
                            <CardContent className="pt-4 text-center">
                                <p className="text-xl font-bold text-indigo-600">{stat.value}</p>
                                <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Lista de registros */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Registros recientes</CardTitle>
                    </CardHeader>
                    <CardContent className="divide-y">
                        {(logs ?? []).length === 0 && (
                            <p className="text-sm text-slate-500 py-4 text-center">
                                Aún no tienes registros emocionales.
                            </p>
                        )}
                        {(logs ?? []).map((log: any) => {
                            const cfg = EMOTION_CONFIG[log.emotion] ?? EMOTION_CONFIG.neutral
                            return (
                                <div key={log.id} className="flex items-start gap-3 py-3">
                                    <span className="text-2xl">{cfg.emoji}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>
                                                {cfg.label}
                                            </span>
                                            <Badge variant="outline" className="text-xs capitalize">
                                                {log.type === "daily" ? "Diario" : "Semanal"}
                                            </Badge>
                                            <span className="text-xs text-slate-400">
                                                😰 Estrés: {log.stress_level ?? "—"}/5 · 😟 Ansiedad: {log.anxiety_level ?? "—"}/5
                                            </span>
                                        </div>
                                        {log.reflection && (
                                            <p className="text-xs text-slate-500 mt-1 truncate">
                                                {log.reflection}
                                            </p>
                                        )}
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            {new Date(log.created_at).toLocaleDateString("es-CL", {
                                                weekday: "long", day: "numeric", month: "long"
                                            })}
                                        </p>
                                    </div>
                                </div>
                            )
                        })}
                    </CardContent>
                </Card>
            </div>
        </main>
    )
}
