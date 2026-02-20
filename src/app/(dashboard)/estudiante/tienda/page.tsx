import { createClient } from "@/lib/supabase/server"
import { RewardsStore } from "@/components/rewards/rewards-store"

async function getStudentAndPoints() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: student } = await supabase
        .from("students")
        .select("id, name")
        .eq("user_id", user.id)
        .maybeSingle()

    if (!student) return null

    const { data: points } = await supabase
        .from("points")
        .select("amount")
        .eq("student_id", student.id)

    const totalPoints =
        points?.reduce((acc, row) => acc + (row.amount ?? 0), 0) ?? 0

    return { student, totalPoints }
}

export default async function TiendaPage() {
    const data = await getStudentAndPoints()

    if (!data) {
        return <div>No se encontró tu perfil de estudiante.</div>
    }

    const { student, totalPoints } = data

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold text-slate-900">
                        Tienda de recompensas
                    </h1>
                    <div className="rounded-full bg-amber-100 px-4 py-1 text-sm font-medium text-amber-700">
                        Puntos disponibles: {totalPoints}
                    </div>
                </div>

                <RewardsStore studentId={student.id} availablePoints={totalPoints} />
            </div>
        </main>
    )
}
