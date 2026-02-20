import { createClient } from "@/lib/supabase/server"
import { EmotionSlider } from "@/components/emotional/emotion-slider"
import { WeeklyCheckinCard } from "@/components/emotional/weekly-checkin-card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

async function getEmotionsData() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    const { data: student } = await supabase
        .from("students")
        .select("id, institution_id, name")
        .eq("user_id", user.id)
        .maybeSingle()

    if (!student) return null

    // Check if logged today
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

    return {
        student,
        alreadyLoggedToday: !!todayLog
    }
}

export default async function EmocionesPage() {
    const data = await getEmotionsData()

    if (!data) {
        return (
            <div className="flex items-center justify-center min-h-screen text-slate-500">
                No se encontró perfil de estudiante.
            </div>
        )
    }

    const { student, alreadyLoggedToday } = data

    return (
        <main className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="mx-auto max-w-2xl space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        Hola, {student.name}
                    </h1>
                    <p className="text-slate-500">
                        Bienvenido a tu espacio emocional
                    </p>
                </div>

                <Tabs defaultValue="diario" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-8">
                        <TabsTrigger value="diario">Check-in Diario</TabsTrigger>
                        <TabsTrigger value="semanal">Check-in Semanal</TabsTrigger>
                    </TabsList>

                    <TabsContent value="diario">
                        <EmotionSlider
                            studentId={student.id}
                            institutionId={student.institution_id}
                            alreadyLogged={alreadyLoggedToday}
                        />
                    </TabsContent>

                    <TabsContent value="semanal">
                        <WeeklyCheckinCard />
                    </TabsContent>
                </Tabs>
            </div>
        </main>
    )
}
