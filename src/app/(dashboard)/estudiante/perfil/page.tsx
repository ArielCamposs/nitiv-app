import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default async function PerfilEstudiantePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect("/login")

    const { data: student } = await supabase
        .from("students")
        .select(`
            id, name, last_name, rut, birthdate,
            guardian_name, guardian_phone, guardian_email,
            created_at,
            course:course_id ( name, level ),
            institution:institution_id ( name )
        `)
        .eq("user_id", user.id)
        .maybeSingle()

    if (!student) redirect("/login")

    const { data: userProfile } = await supabase
        .from("users")
        .select("email, avatar_url")
        .eq("id", user.id)
        .maybeSingle()

    // Obtener puntos reales desde tabla points
    const { data: pointsData } = await supabase
        .from("points")
        .select("amount")
        .eq("student_id", student.id)

    const totalPoints = (pointsData ?? []).reduce((a, p) => a + (p.amount ?? 0), 0)
    const level = Math.floor(totalPoints / 100) + 1

    const age = student.birthdate
        ? Math.floor((Date.now() - new Date(student.birthdate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : null

    const LEVEL_NAMES: Record<number, string> = {
        1: "Principiante", 2: "Explorador", 3: "Reflexivo",
        4: "Consciente", 5: "Empático", 6: "Maestro"
    }

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
                <h1 className="text-2xl font-semibold text-slate-900">Mi perfil</h1>

                {/* Tarjeta principal */}
                <Card>
                    <CardContent className="pt-6 flex items-center gap-5">
                        <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center text-2xl font-bold text-indigo-600">
                            {student.name[0]}{student.last_name[0]}
                        </div>
                        <div>
                            <p className="text-xl font-bold text-slate-900">
                                {student.name} {student.last_name}
                            </p>
                            <p className="text-sm text-slate-500">{(student.course as any)?.name ?? "Sin curso"}</p>
                            <p className="text-xs text-slate-400">{(student.institution as any)?.name}</p>
                        </div>
                        {userProfile && (
                            <div className="ml-auto text-right">
                                <p className="text-2xl font-bold text-indigo-600">{totalPoints}</p>
                                <p className="text-xs text-slate-500">puntos</p>
                                <Badge variant="outline" className="mt-1 text-xs">
                                    {LEVEL_NAMES[level] ?? "Experto"}
                                </Badge>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Datos personales */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Datos personales</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4 text-sm">
                        {[
                            { label: "RUT", value: student.rut ?? "No registrado" },
                            { label: "Edad", value: age ? `${age} años` : "No registrada" },
                            { label: "Fecha de nacimiento", value: student.birthdate ? new Date(student.birthdate).toLocaleDateString("es-CL") : "No registrada" },
                            { label: "Correo", value: userProfile?.email ?? "No registrado" },
                            { label: "Miembro desde", value: new Date(student.created_at).toLocaleDateString("es-CL") },
                        ].map((item) => (
                            <div key={item.label}>
                                <p className="text-xs text-slate-400">{item.label}</p>
                                <p className="font-medium text-slate-700">{item.value}</p>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Apoderado */}
                {(student.guardian_name || student.guardian_phone) && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Apoderado/a</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4 text-sm">
                            {[
                                { label: "Nombre", value: student.guardian_name ?? "—" },
                                { label: "Teléfono", value: student.guardian_phone ?? "—" },
                                { label: "Correo", value: student.guardian_email ?? "—" },
                            ].map((item) => (
                                <div key={item.label}>
                                    <p className="text-xs text-slate-400">{item.label}</p>
                                    <p className="font-medium text-slate-700">{item.value}</p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}
            </div>
        </main>
    )
}
