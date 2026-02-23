import { getActiveAlerts } from "@/lib/utils/get-alerts"
import { AlertsList } from "@/components/alerts/alerts-list"
import { HelpRequestsPanel } from "@/components/help/HelpRequestsPanel"
import { PulseActivatePanel } from "@/components/pulse/pulse-activate-panel"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"

export default async function DuplaPage() {
    const alerts = await getActiveAlerts()
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    const { data: profile } = await supabase
        .from("users")
        .select("id, institution_id")
        .eq("id", user!.id)
        .single()

    // Pulso activo
    const { data: pulseSession } = profile?.institution_id
        ? await supabase
            .from("pulse_sessions")
            .select("id, week_start, week_end")
            .eq("institution_id", profile.institution_id)
            .eq("active", true)
            .maybeSingle()
        : { data: null }

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

                {/* Modo Pulso */}
                {profile?.institution_id && (
                    <PulseActivatePanel
                        institutionId={profile.institution_id}
                        userId={profile.id}
                        activeSession={pulseSession ?? null}
                    />
                )}

                <section className="space-y-3">
                    <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide">
                        Alertas activas
                    </h2>
                    <AlertsList
                        initialAlerts={alerts as any}
                        filterTypes={duplaTypes}
                    />
                </section>

                {profile?.institution_id && (
                    <section className="space-y-3">
                        <HelpRequestsPanel institutionId={profile.institution_id} />
                    </section>
                )}
            </div>
        </main>
    )
}
