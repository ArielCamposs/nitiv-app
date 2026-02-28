import { getActiveAlerts } from "@/lib/utils/get-alerts"
import { AlertsList } from "@/components/alerts/alerts-list"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import Link from "next/link"
import { ShieldAlert, Users, Activity, FileText, ChevronRight } from "lucide-react"

export default async function ConvivenciaPage() {
    const alerts = await getActiveAlerts()

    // Convivencia ve: dec_repetido + registros_negativos
    const convivenciaTypes = ["dec_repetido", "registros_negativos"]
    const activeAlertsCount = alerts.filter((a: any) => convivenciaTypes.includes(a.type)).length

    // Load institution stats
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll() { /* readonly in server components */ },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
        .from("users")
        .select("institution_id")
        .eq("id", user!.id)
        .maybeSingle()

    let openDecsCount = 0
    let activePaecsCount = 0

    if (profile?.institution_id) {
        const iid = profile.institution_id
        const [{ count: incidentCount }, { count: paecCount }] = await Promise.all([
            // Casos DEC no resueltos
            supabase.from("incidents").select("id", { count: "exact", head: true })
                .eq("institution_id", iid)
                .eq("resolved", false),
            // PAECs activos
            supabase.from("paec").select("id", { count: "exact", head: true })
                .eq("institution_id", iid)
                .eq("active", true),
        ])
        openDecsCount = incidentCount ?? 0
        activePaecsCount = paecCount ?? 0
    }

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
                {/* Cabecera */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900">
                            Dashboard Convivencia Escolar
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">
                            Resumen general y accesos rápidos
                        </p>
                    </div>
                </div>

                {/* Estadísticas Clave */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-2xl border bg-white p-6 shadow-sm flex items-center gap-4">
                        <div className="bg-rose-100 p-3 rounded-xl text-rose-600">
                            <ShieldAlert className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Casos DEC Abiertos</p>
                            <p className="text-2xl font-bold text-slate-800">{openDecsCount}</p>
                        </div>
                    </div>
                    <div className="rounded-2xl border bg-white p-6 shadow-sm flex items-center gap-4">
                        <div className="bg-amber-100 p-3 rounded-xl text-amber-600">
                            <Activity className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Alertas Activas</p>
                            <p className="text-2xl font-bold text-slate-800">{activeAlertsCount}</p>
                        </div>
                    </div>
                    <div className="rounded-2xl border bg-white p-6 shadow-sm flex items-center gap-4">
                        <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600">
                            <FileText className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">PAECs en Curso</p>
                            <p className="text-2xl font-bold text-slate-800">{activePaecsCount}</p>
                        </div>
                    </div>
                </div>

                {/* Acciones Rápidas */}
                <section>
                    <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">
                        Acciones Rápidas
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Link href="/convivencia/dec/nuevo" className="group rounded-2xl border bg-white p-5 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between">
                            <div className="bg-indigo-50 w-fit p-3 rounded-lg text-indigo-600 mb-4 group-hover:scale-110 transition-transform">
                                <ShieldAlert className="w-5 h-5" />
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-slate-700 group-hover:text-indigo-600 transition-colors">Nuevo DEC</span>
                                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                            </div>
                        </Link>

                        <Link href="/convivencia/estudiantes" className="group rounded-2xl border bg-white p-5 shadow-sm hover:border-cyan-300 hover:shadow-md transition-all flex flex-col justify-between">
                            <div className="bg-cyan-50 w-fit p-3 rounded-lg text-cyan-600 mb-4 group-hover:scale-110 transition-transform">
                                <Users className="w-5 h-5" />
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-slate-700 group-hover:text-cyan-600 transition-colors">Estudiantes</span>
                                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-600 transition-colors" />
                            </div>
                        </Link>

                        <Link href="/convivencia/heatmap" className="group rounded-2xl border bg-white p-5 shadow-sm hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between">
                            <div className="bg-emerald-50 w-fit p-3 rounded-lg text-emerald-600 mb-4 group-hover:scale-110 transition-transform">
                                <Activity className="w-5 h-5" />
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-slate-700 group-hover:text-emerald-600 transition-colors">Clima Emocional</span>
                                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                            </div>
                        </Link>

                        <Link href="/paec" className="group rounded-2xl border bg-white p-5 shadow-sm hover:border-violet-300 hover:shadow-md transition-all flex flex-col justify-between">
                            <div className="bg-violet-50 w-fit p-3 rounded-lg text-violet-600 mb-4 group-hover:scale-110 transition-transform">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-slate-700 group-hover:text-violet-600 transition-colors">Gestión PAEC</span>
                                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-violet-600 transition-colors" />
                            </div>
                        </Link>
                    </div>
                </section>

                {/* Panel de Alertas Activas */}
                <section className="bg-white rounded-2xl border shadow-sm p-6 space-y-6">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-800">
                            Alertas que requieren atención
                        </h2>
                        <p className="text-slate-500 text-sm mt-1">
                            Discrepancias, derivaciones o anomalías detectadas en estudiantes.
                        </p>
                    </div>
                    {activeAlertsCount === 0 ? (
                        <div className="text-center py-8">
                            <div className="bg-emerald-50 text-emerald-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                                <ShieldAlert className="w-6 h-6" />
                            </div>
                            <p className="text-slate-600 font-medium">No tienes alertas pendientes</p>
                            <p className="text-slate-400 text-sm">Todo está en orden por ahora.</p>
                        </div>
                    ) : (
                        <AlertsList
                            initialAlerts={alerts as any}
                            filterTypes={convivenciaTypes}
                        />
                    )}
                </section>
            </div>
        </main>
    )
}
