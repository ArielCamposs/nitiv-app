"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

type RiskAlert = {
    id: string
    severity: string
    status: string
    triggered_keywords: string[]
    created_at: string
    notes: string | null
    student: { name: string; last_name: string; course: { name: string } | null }
}

const SEVERITY_CONFIG: Record<string, { label: string; color: string }> = {
    critical: { label: "🔴 Crítico", color: "border-red-400 bg-red-50" },
    high: { label: "🟠 Alto", color: "border-orange-300 bg-orange-50" },
    medium: { label: "🟡 Medio", color: "border-yellow-300 bg-yellow-50" },
}

export function RiskAlertsPanel({ institutionId }: { institutionId: string }) {
    const [alerts, setAlerts] = useState<RiskAlert[]>([])
    const [notes, setNotes] = useState<Record<string, string>>({})
    const supabase = createClient()

    useEffect(() => {
        const load = async () => {
            const { data } = await supabase
                .from("risk_alerts")
                .select(`
                    id, severity, status, triggered_keywords, created_at, notes,
                    student:student_id ( name, last_name, course:course_id ( name ) )
                `)
                .eq("institution_id", institutionId)
                .order("created_at", { ascending: false })

            setAlerts((data as any) ?? [])
        }
        load()

        // Tiempo real — nueva alerta
        const channel = supabase
            .channel("risk-alerts-live")
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "risk_alerts",
                filter: `institution_id=eq.${institutionId}`
            }, () => {
                toast.error("🔴 Nueva alerta de riesgo detectada")
                load()
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [institutionId])

    const handleResolve = async (alertId: string) => {
        const { data: { user } } = await supabase.auth.getUser()

        await supabase
            .from("risk_alerts")
            .update({
                status: "resolved",
                reviewed_by: user?.id,
                reviewed_at: new Date().toISOString(),
                notes: notes[alertId] ?? null,
            })
            .eq("id", alertId)

        setAlerts((prev) =>
            prev.map((a) => a.id === alertId ? { ...a, status: "resolved" } : a)
        )
        toast.success("Alerta marcada como resuelta")
    }

    const pending = alerts.filter((a) => a.status === "pending")
    const resolved = alerts.filter((a) => a.status === "resolved")

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold">Alertas de riesgo</h2>
                {pending.length > 0 && (
                    <Badge variant="destructive">
                        {pending.length} sin atender
                    </Badge>
                )}
            </div>

            {alerts.length === 0 && (
                <p className="text-sm text-slate-500">No hay alertas registradas.</p>
            )}

            {[...pending, ...resolved].map((alert) => {
                const cfg = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.medium
                return (
                    <Card key={alert.id} className={`border-2 ${cfg.color}`}>
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center justify-between text-base">
                                <span>
                                    {alert.student.name} {alert.student.last_name}
                                    {alert.student.course && (
                                        <span className="ml-2 text-xs text-slate-400 font-normal">
                                            {alert.student.course.name}
                                        </span>
                                    )}
                                </span>
                                <Badge variant="outline">{cfg.label}</Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {/* Keywords detectadas */}
                            <div className="flex flex-wrap gap-1">
                                {alert.triggered_keywords.map((kw) => (
                                    <span key={kw}
                                        className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">
                                        {kw}
                                    </span>
                                ))}
                            </div>

                            <p className="text-xs text-slate-400">
                                {new Date(alert.created_at).toLocaleString("es-CL")}
                            </p>

                            {alert.status === "pending" && (
                                <>
                                    <Textarea
                                        placeholder="Agregar notas de intervención (opcional)..."
                                        rows={2}
                                        className="resize-none text-sm"
                                        value={notes[alert.id] ?? ""}
                                        onChange={(e) =>
                                            setNotes((prev) => ({ ...prev, [alert.id]: e.target.value }))
                                        }
                                    />
                                    <Button
                                        size="sm"
                                        onClick={() => handleResolve(alert.id)}
                                    >
                                        Marcar como atendida
                                    </Button>
                                </>
                            )}

                            {alert.status === "resolved" && alert.notes && (
                                <p className="text-xs text-slate-500 italic">
                                    Nota: {alert.notes}
                                </p>
                            )}

                            {alert.status === "resolved" && (
                                <Badge variant="secondary">✅ Atendida</Badge>
                            )}
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    )
}
