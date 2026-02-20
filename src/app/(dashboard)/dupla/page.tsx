import { getActiveAlerts } from "@/lib/utils/get-alerts"
import { AlertsList } from "@/components/alerts/alerts-list"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"

export default async function DuplaPage() {
    const alerts = await getActiveAlerts()
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    // Dupla ve: registros_negativos, discrepancia_docente, sin_registro
    const duplaTypes = [
        "registros_negativos",
        "discrepancia_docente",
        "sin_registro",
    ]

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold text-slate-900">
                        Dashboard Dupla Psicosocial
                    </h1>
                    {alerts.filter((a: any) => duplaTypes.includes(a.type)).length > 0 && (
                        <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-700">
                            {alerts.filter((a: any) => duplaTypes.includes(a.type)).length} alertas activas
                        </span>
                    )}
                </div>

                <div>
                    <Link
                        href="/dupla/heatmap"
                        className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:underline"
                    >
                        Ver mapa de clima emocional por curso →
                    </Link>
                </div>

                <section className="space-y-3">
                    <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide">
                        Alertas activas
                    </h2>
                    <AlertsList
                        initialAlerts={alerts as any}
                        filterTypes={duplaTypes}
                    />
                </section>
            </div>
        </main>
    )
}
