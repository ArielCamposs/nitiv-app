import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PulseActivatePanel } from "@/components/pulse/pulse-activate-panel"

export default async function DirectorPulsoPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect("/login")

    const { data: profile } = await supabase
        .from("users")
        .select("id, institution_id, role")
        .eq("id", user.id)
        .single()

    if (!profile || !["director", "dupla"].includes(profile.role)) redirect("/dashboard")

    const { data: pulseSession } = await supabase
        .from("pulse_sessions")
        .select("id, week_start, week_end")
        .eq("institution_id", profile.institution_id)
        .eq("active", true)
        .maybeSingle()

    const { data: recentSessions } = await supabase
        .from("pulse_sessions")
        .select("id, week_start, week_end, active, created_at")
        .eq("institution_id", profile.institution_id)
        .order("created_at", { ascending: false })
        .limit(5)

    const fmtDate = (d: string) =>
        new Date(d + "T12:00:00").toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" })

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">

                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Modo Pulso</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Activa la medición semanal de energía y clima para estudiantes y docentes.
                    </p>
                </div>

                {/* Panel de activación */}
                <PulseActivatePanel
                    institutionId={profile.institution_id}
                    userId={profile.id}
                    activeSession={pulseSession ?? null}
                />

                {/* Historial de sesiones */}
                {recentSessions && recentSessions.length > 0 && (
                    <div className="space-y-3">
                        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                            Sesiones recientes
                        </h2>
                        <div className="space-y-2">
                            {recentSessions.map((s) => (
                                <div
                                    key={s.id}
                                    className="flex items-center justify-between rounded-xl border bg-white px-4 py-3"
                                >
                                    <div>
                                        <p className="text-sm font-medium text-slate-800">
                                            {fmtDate(s.week_start)} — {fmtDate(s.week_end)}
                                        </p>
                                    </div>
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.active
                                            ? "bg-indigo-100 text-indigo-700"
                                            : "bg-slate-100 text-slate-500"
                                        }`}>
                                        {s.active ? "Activa" : "Cerrada"}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </main>
    )
}
