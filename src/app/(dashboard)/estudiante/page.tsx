import { EmotionSlider } from "@/components/emotional/emotion-slider"
import { WeeklyCheckinCard } from "@/components/emotional/weekly-checkin-card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import Link from "next/link"

async function getStudentData() {
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
    if (!user) return null

    const { data: student } = await supabase
        .from("students")
        .select("id, institution_id, name, last_name")
        .eq("user_id", user.id)
        .maybeSingle()

    if (!student) return null

    const { data: pointsAgg } = await supabase
        .from("points")
        .select("amount")
        .eq("student_id", student.id)

    const totalPoints = pointsAgg?.reduce((acc, p) => acc + (p.amount ?? 0), 0) ?? 0

    // ── Verificar si ya registró hoy ──
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const tomorrow = new Date(startOfDay)
    tomorrow.setDate(startOfDay.getDate() + 1)

    const { data: todayLog } = await supabase
        .from("emotional_logs")
        .select("id")
        .eq("student_id", student.id)
        .eq("type", "daily")
        .gte("created_at", startOfDay.toISOString())
        .lt("created_at", tomorrow.toISOString())
        .maybeSingle()

    const alreadyLogged = !!todayLog

    return { student, totalPoints, alreadyLogged }
}

export default async function EstudianteDashboardPage() {
    const data = await getStudentData()

    if (!data) {
        return <div>No se encontró tu perfil de estudiante.</div>
    }

    const { student, totalPoints, alreadyLogged } = data

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-3xl px-4 py-8 space-y-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold text-slate-900">
                        Hola, {student.name}
                    </h1>
                    <div className="flex items-center gap-3">
                        <div className="rounded-full bg-amber-100 px-4 py-1 text-sm font-medium text-amber-700">
                            Puntos: {totalPoints}
                        </div>
                        <Link
                            href="/estudiante/tienda"
                            className="text-sm font-medium text-indigo-600 hover:underline"
                        >
                            Ir a la tienda
                        </Link>
                    </div>
                </div>

                <div className="space-y-6">
                    <section>
                        <h2 className="mb-4 text-xl font-semibold text-slate-900">
                            Registro emocional
                        </h2>

                        <Tabs defaultValue="diario" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-8">
                                <TabsTrigger value="diario">Check-in Diario</TabsTrigger>
                                <TabsTrigger value="semanal">Check-in Semanal</TabsTrigger>
                            </TabsList>

                            <TabsContent value="diario">
                                <EmotionSlider
                                    studentId={student.id}
                                    institutionId={student.institution_id}
                                    alreadyLogged={alreadyLogged}
                                />
                                <div className="flex justify-end mt-2">
                                    <Link
                                        href="/estudiante/historial"
                                        className="text-sm text-indigo-600 hover:underline font-medium"
                                    >
                                        Ver mi historial emocional →
                                    </Link>
                                </div>
                            </TabsContent>

                            <TabsContent value="semanal">
                                <WeeklyCheckinCard />
                            </TabsContent>
                        </Tabs>
                    </section>
                </div>
            </div>
        </main>
    )
}
