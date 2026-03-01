import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StudentEmotionChart } from "@/components/student/student-emotion-chart"

const EMOTION_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
    muy_bien: { label: "Muy bien", emoji: "🤩", color: "bg-purple-100 text-purple-700" },
    bien: { label: "Bien", emoji: "🙂", color: "bg-emerald-100 text-emerald-700" },
    neutral: { label: "Neutral", emoji: "😐", color: "bg-slate-100 text-slate-600" },
    mal: { label: "Mal", emoji: "😢", color: "bg-orange-100 text-orange-600" },
    muy_mal: { label: "Muy mal", emoji: "😞", color: "bg-red-100 text-red-600" },
}

const LEVEL_NAMES: Record<number, string> = {
    1: "Principiante", 2: "Explorador", 3: "Reflexivo",
    4: "Consciente", 5: "Empático", 6: "Maestro",
}

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

    // Puntos y nivel
    const { data: pointsData } = await supabase
        .from("points")
        .select("amount")
        .eq("student_id", student.id)

    const totalPoints = (pointsData ?? []).reduce((a, p) => a + (p.amount ?? 0), 0)
    const level = Math.min(Math.floor(totalPoints / 100) + 1, 6)

    // Cosmético equipado
    const { data: equippedCosmetic } = await supabase
        .from("student_cosmetics")
        .select("cosmetics(name, type, image_url)")
        .eq("student_id", student.id)
        .eq("equipped", true)
        .maybeSingle()

    // Últimos 30 días de emociones para el heatmap
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: recentLogs } = await supabase
        .from("emotional_logs")
        .select("emotion, stress_level, anxiety_level, reflection, type, created_at")
        .eq("student_id", student.id)
        .eq("type", "daily")
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: true })

    const { data: paec } = await supabase
        .from("paec")
        .select(`
            strengths,
            support_routines, support_anticipation, support_visual_aids,
            support_calm_space, support_breaks, key_support,
            trigger_noise, trigger_changes, trigger_orders,
            trigger_social, trigger_sensory, trigger_other,
            strategy_calm_space, strategy_accompaniment,
            strategy_reduce_stimuli, strategy_other,
            review_date, active
        `)
        .eq("student_id", student.id)
        .eq("active", true)
        .maybeSingle()

    // DEC (Incidentes)
    const { data: decRecords } = await supabase
        .from("incidents")
        .select(`
            id,
            folio,
            type,
            severity,
            location,
            incident_date,
            end_date,
            resolved,
            users!reporter_id (
                name,
                last_name,
                role
            )
        `)
        .eq("student_id", student.id)
        .order("incident_date", { ascending: false })

    // Convivencia records the student was involved in
    const { data: convivenciaLinks } = await supabase
        .from("convivencia_record_students")
        .select(`
            convivencia_records (
                id, type, severity, location, description,
                actions_taken, resolved, resolution_notes, incident_date
            )
        `)
        .eq("student_id", student.id)

    const convivenciaRecords = (convivenciaLinks ?? [])
        .map((l: any) => l.convivencia_records)
        .filter(Boolean)
        .sort((a: any, b: any) => new Date(b.incident_date).getTime() - new Date(a.incident_date).getTime())

    const age = student.birthdate
        ? Math.floor((Date.now() - new Date(student.birthdate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : null

    const cosmeticData = (equippedCosmetic?.cosmetics as any)

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">

                {/* Header (Siempre visible) */}
                <Card className="bg-linear-to-br from-indigo-50 to-purple-50 border-0 shadow-md">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-5">
                            {/* Avatar / inicial */}
                            <div className="relative">
                                {cosmeticData?.image_url ? (
                                    <img
                                        src={cosmeticData.image_url}
                                        alt="Avatar"
                                        className="h-20 w-20 rounded-full object-cover ring-4 ring-indigo-200"
                                    />
                                ) : (
                                    <div className="h-20 w-20 rounded-full bg-indigo-200 flex items-center justify-center text-2xl font-bold text-indigo-700 ring-4 ring-indigo-100">
                                        {student.name[0]}{student.last_name[0]}
                                    </div>
                                )}
                                <span className="absolute -bottom-1 -right-1 bg-white text-xs font-bold text-indigo-600 border border-indigo-200 rounded-full px-1.5 py-0.5">
                                    Nv.{level}
                                </span>
                            </div>

                            <div className="flex-1">
                                <h1 className="text-xl font-bold text-slate-900">
                                    {student.name} {student.last_name}
                                </h1>
                                <p className="text-sm text-slate-500">
                                    {(student.course as any)?.name ?? "Sin curso"} · {(student.institution as any)?.name}
                                </p>
                                <Badge variant="outline" className="mt-1 text-xs border-indigo-300 text-indigo-600">
                                    {LEVEL_NAMES[level] ?? "Experto"}
                                </Badge>
                            </div>

                            <div className="text-right shrink-0">
                                <p className="text-3xl font-bold text-indigo-600">{totalPoints}</p>
                                <p className="text-xs text-slate-500">puntos totales</p>
                                <p className="text-xs text-slate-400 mt-1">
                                    {recentLogs?.length ?? 0} registros esta semana
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Contenido Separado en Pestañas */}
                <Tabs defaultValue="perfil" className="w-full">
                    <TabsList className="grid w-full grid-cols-5">
                        <TabsTrigger value="perfil">Perfil</TabsTrigger>
                        <TabsTrigger value="emocional">Emocional</TabsTrigger>
                        <TabsTrigger value="paec">PAEC</TabsTrigger>
                        <TabsTrigger value="dec">Historial DEC</TabsTrigger>
                        <TabsTrigger value="convivencia">Convivencia</TabsTrigger>
                    </TabsList>

                    {/* VISTA 1: PERFIL */}
                    <TabsContent value="perfil" className="mt-6 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Datos personales</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-2 gap-4 text-sm">
                                {[
                                    { label: "RUT", value: student.rut ?? "No registrado" },
                                    { label: "Edad", value: age ? `${age} años` : "No registrada" },
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
                    </TabsContent>

                    {/* VISTA 2: EMOCIONAL */}
                    <TabsContent value="emocional" className="mt-6 space-y-6">
                        {/* Gráfico emocional últimos 7 días */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Evolución emocional — últimos 30 días</CardTitle>
                                <CardDescription>Emoción, estrés y ansiedad diarios</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {(recentLogs ?? []).length === 0 ? (
                                    <p className="text-sm text-slate-400 py-4 text-center">
                                        Aún no hay registros esta semana.
                                    </p>
                                ) : (
                                    <StudentEmotionChart logs={recentLogs ?? []} />
                                )}
                            </CardContent>
                        </Card>

                        {/* Lista últimos 7 registros */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Registros recientes</CardTitle>
                            </CardHeader>
                            <CardContent className="divide-y">
                                {(recentLogs ?? []).slice(-7).reverse().map((log, i) => {
                                    const cfg = EMOTION_CONFIG[log.emotion] ?? EMOTION_CONFIG.neutral
                                    return (
                                        <div key={i} className="flex items-start gap-3 py-3">
                                            <span className="text-2xl">{cfg.emoji}</span>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>
                                                        {cfg.label}
                                                    </span>
                                                    <span className="text-xs text-slate-400">
                                                        😰 Estrés: {log.stress_level ?? "—"}/5
                                                    </span>
                                                    <span className="text-xs text-slate-400">
                                                        😟 Ansiedad: {log.anxiety_level ?? "—"}/5
                                                    </span>
                                                </div>
                                                {log.reflection && (
                                                    <p className="text-xs text-slate-500 mt-1 truncate">
                                                        {log.reflection}
                                                    </p>
                                                )}
                                                <p className="text-xs text-slate-400 mt-0.5">
                                                    {new Date(log.created_at).toLocaleDateString("es-CL", {
                                                        weekday: "long", day: "numeric", month: "long",
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* VISTA 3: PAEC */}
                    <TabsContent value="paec" className="mt-6 space-y-6">
                        {paec ? (
                            <Card className="border-violet-200 bg-violet-50/40">
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        📋 Plan de Apoyo Emocional y Conductual (PAEC)
                                    </CardTitle>
                                    {paec.review_date && (
                                        <CardDescription>
                                            Próxima revisión: {new Date(paec.review_date).toLocaleDateString("es-CL")}
                                        </CardDescription>
                                    )}
                                </CardHeader>
                                <CardContent className="space-y-4 text-sm">

                                    {paec.strengths && (
                                        <div>
                                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Fortalezas</p>
                                            <p className="text-slate-700">{paec.strengths}</p>
                                        </div>
                                    )}

                                    {/* Apoyos activos */}
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Apoyos activos</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {paec.support_routines && <Badge variant="secondary">Rutinas</Badge>}
                                            {paec.support_anticipation && <Badge variant="secondary">Anticipación</Badge>}
                                            {paec.support_visual_aids && <Badge variant="secondary">Apoyos visuales</Badge>}
                                            {paec.support_calm_space && <Badge variant="secondary">Espacio calma</Badge>}
                                            {paec.support_breaks && <Badge variant="secondary">Pausas activas</Badge>}
                                            {!paec.support_routines && !paec.support_anticipation && !paec.support_visual_aids &&
                                                !paec.support_calm_space && !paec.support_breaks && (
                                                    <span className="text-slate-400 text-xs">Sin apoyos registrados</span>
                                                )}
                                        </div>
                                    </div>

                                    {/* Desencadenantes */}
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Desencadenantes conocidos</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {paec.trigger_noise && <Badge variant="outline" className="border-rose-300 text-rose-600">Ruido</Badge>}
                                            {paec.trigger_changes && <Badge variant="outline" className="border-rose-300 text-rose-600">Cambios</Badge>}
                                            {paec.trigger_orders && <Badge variant="outline" className="border-rose-300 text-rose-600">Órdenes directas</Badge>}
                                            {paec.trigger_social && <Badge variant="outline" className="border-rose-300 text-rose-600">Interacción social</Badge>}
                                            {paec.trigger_sensory && <Badge variant="outline" className="border-rose-300 text-rose-600">Sensorial</Badge>}
                                            {paec.trigger_other && <Badge variant="outline" className="border-rose-300 text-rose-600">{paec.trigger_other}</Badge>}
                                            {!paec.trigger_noise && !paec.trigger_changes && !paec.trigger_orders &&
                                                !paec.trigger_social && !paec.trigger_sensory && !paec.trigger_other && (
                                                    <span className="text-slate-400 text-xs">No registrados</span>
                                                )}
                                        </div>
                                    </div>

                                    {/* Estrategias */}
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Estrategias de intervención</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {paec.strategy_calm_space && <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Espacio calma</Badge>}
                                            {paec.strategy_accompaniment && <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Acompañamiento</Badge>}
                                            {paec.strategy_reduce_stimuli && <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Reducir estímulos</Badge>}
                                            {paec.strategy_other && <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">{paec.strategy_other}</Badge>}
                                        </div>
                                    </div>

                                    {paec.key_support && (
                                        <div>
                                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Apoyo clave</p>
                                            <p className="text-slate-700">{paec.key_support}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ) : (
                            <Card className="border-dashed">
                                <CardContent className="py-6 text-center text-sm text-slate-400">
                                    📋 Este estudiante no tiene un PAEC activo registrado.
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    {/* VISTA 4: DEC */}
                    <TabsContent value="dec" className="mt-6 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Historial de Incidentes DEC</CardTitle>
                                <CardDescription>Registro de desregulaciones emocionales y conductuales</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {(!decRecords || decRecords.length === 0) ? (
                                    <p className="text-sm text-slate-400 py-4 text-center">
                                        No hay incidentes DEC registrados.
                                    </p>
                                ) : (
                                    <div className="space-y-3">
                                        {decRecords.map((dec) => (
                                            <div key={dec.id} className="border rounded-md p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-semibold text-sm text-slate-900">{dec.folio}</span>
                                                        <Badge variant="outline" className={`text-[10px] ${dec.severity === "moderada" ? "bg-amber-100 text-amber-700 border-amber-200" :
                                                            dec.severity === "severa" ? "bg-rose-100 text-rose-700 border-rose-200" :
                                                                "bg-slate-100 text-slate-700"
                                                            }`}>
                                                            {dec.severity === "moderada" ? "Etapa 2 — Moderada" :
                                                                dec.severity === "severa" ? "Etapa 3 — Severa" :
                                                                    dec.severity}
                                                        </Badge>
                                                        <Badge variant="outline" className={`text-[10px] ${dec.resolved ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
                                                            }`}>
                                                            {dec.resolved ? "Resuelto" : "En seguimiento"}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs text-slate-500">
                                                        Fecha: {new Date(dec.incident_date).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                                        {dec.end_date && ` - ${new Date(dec.end_date).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}`}
                                                    </p>
                                                    {dec.location && (
                                                        <p className="text-xs text-slate-500 mt-0.5">Lugar: {dec.location}</p>
                                                    )}
                                                </div>
                                                <div className="text-left sm:text-right">
                                                    <p className="text-xs text-slate-400">Reportado por:</p>
                                                    <p className="text-sm font-medium text-slate-700">
                                                        {(dec.users as any)?.name} {(dec.users as any)?.last_name}
                                                    </p>
                                                    <p className="text-xs text-slate-500 capitalize">{(dec.users as any)?.role}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* VISTA 5: CONVIVENCIA */}
                    <TabsContent value="convivencia" className="mt-6 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Mis Registros de Convivencia</CardTitle>
                                <CardDescription>Casos de convivencia escolar en que has sido involucrado</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {convivenciaRecords.length === 0 ? (
                                    <p className="text-sm text-slate-400 py-4 text-center">
                                        No tienes registros de convivencia asociados.
                                    </p>
                                ) : (
                                    <div className="space-y-3">
                                        {convivenciaRecords.map((rec: any) => {
                                            const SEVERITY_COLORS: Record<string, string> = {
                                                leve: "bg-yellow-100 text-yellow-700",
                                                moderada: "bg-orange-100 text-orange-700",
                                                grave: "bg-red-100 text-red-700",
                                            }
                                            const TYPE_LABELS: Record<string, string> = {
                                                pelea: "Pelea", fuga: "Fuga / Escapada",
                                                daño_material: "Daño Material", amenaza: "Amenaza",
                                                acoso: "Acoso", consumo: "Consumo de Sustancias",
                                                conflicto_grupal: "Conflicto Grupal", otro: "Otro",
                                            }
                                            return (
                                                <div key={rec.id} className="border rounded-xl p-4 space-y-2">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-semibold text-sm text-slate-900">
                                                                {TYPE_LABELS[rec.type] ?? rec.type}
                                                            </span>
                                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SEVERITY_COLORS[rec.severity] ?? ""}`}>
                                                                {rec.severity}
                                                            </span>
                                                            {rec.resolved && (
                                                                <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                                                                    Resuelto
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-slate-400 shrink-0">
                                                            {new Date(rec.incident_date).toLocaleDateString("es-CL", {
                                                                day: "numeric", month: "short", year: "numeric"
                                                            })}
                                                        </p>
                                                    </div>
                                                    <p className="text-xs text-slate-600">{rec.description}</p>
                                                    {rec.location && (
                                                        <p className="text-xs text-slate-400">📍 {rec.location}</p>
                                                    )}
                                                    {rec.resolved && rec.resolution_notes && (
                                                        <div className="mt-2 pl-2 border-l-2 border-emerald-300">
                                                            <p className="text-xs font-semibold text-emerald-600">Medidas tomadas</p>
                                                            <p className="text-xs text-slate-500">{rec.resolution_notes}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </main>
    )
}
