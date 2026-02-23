"use client"

import { useState } from "react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Zap, ZapOff } from "lucide-react"
import { addDays, format } from "date-fns"
import { es } from "date-fns/locale"

interface Props {
    institutionId: string
    userId: string              // users.id del admin/dupla
    activeSession?: {
        id: string
        week_start: string
        week_end: string
    } | null
}

export function PulseActivatePanel({ institutionId, userId, activeSession: initialSession }: Props) {
    const supabase = createClient()
    const [session, setSession] = useState(initialSession ?? null)
    const [loading, setLoading] = useState(false)

    // Semana actual: lunes → domingo
    const today = new Date()
    const dayOfWeek = today.getDay()
    const monday = new Date(today)
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    monday.setHours(0, 0, 0, 0)
    const sunday = addDays(monday, 6)

    const fmtDate = (d: Date | string) => {
        const date = typeof d === "string" ? new Date(d + "T12:00:00") : d
        return format(date, "d MMM", { locale: es })
    }

    const handleActivate = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from("pulse_sessions")
                .insert({
                    institution_id: institutionId,
                    activated_by: userId,
                    week_start: monday.toISOString().split("T")[0],
                    week_end: sunday.toISOString().split("T")[0],
                    active: true,
                })
                .select("id, week_start, week_end")
                .single()

            if (error) {
                if (error.code === "23P01") {
                    toast.error("Ya existe una sesión activa para este período.")
                    return
                }
                throw error
            }
            setSession(data)
            toast.success("Modo Pulso activado para esta semana.")
        } catch (e) {
            console.error(e)
            toast.error("No se pudo activar el Modo Pulso.")
        } finally {
            setLoading(false)
        }
    }

    const handleDeactivate = async () => {
        if (!session) return
        setLoading(true)
        try {
            const { error } = await supabase
                .from("pulse_sessions")
                .update({ active: false })
                .eq("id", session.id)

            if (error) throw error
            setSession(null)
            toast.success("Modo Pulso desactivado.")
        } catch (e) {
            console.error(e)
            toast.error("No se pudo desactivar el Modo Pulso.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card className={session ? "border-indigo-200 bg-indigo-50/40" : "border-0 shadow-sm"}>
            <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                    <div className={`rounded-full p-1.5 ${session ? "bg-indigo-100" : "bg-slate-100"}`}>
                        <Zap className={`w-4 h-4 ${session ? "text-indigo-600" : "text-slate-500"}`} />
                    </div>
                    <div>
                        <CardTitle className="text-base">Modo Pulso</CardTitle>
                        <CardDescription className="text-xs">
                            {session
                                ? `Activo: semana del ${fmtDate(session.week_start)} al ${fmtDate(session.week_end)}`
                                : `Semana disponible: ${fmtDate(monday)} — ${fmtDate(sunday)}`
                            }
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="pt-0">
                <p className="text-xs text-slate-500">
                    {session
                        ? "Estudiantes y docentes pueden registrar su pulso esta semana. Los resultados cruzados estarán disponibles en Reportes."
                        : "Activa el Modo Pulso para que estudiantes y docentes registren su energía y clima de aula esta semana."
                    }
                </p>
            </CardContent>

            <CardFooter className="pt-0">
                {session ? (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDeactivate}
                        disabled={loading}
                        className="gap-1.5 text-rose-600 border-rose-200 hover:bg-rose-50"
                    >
                        <ZapOff className="w-3.5 h-3.5" />
                        {loading ? "Desactivando..." : "Desactivar Modo Pulso"}
                    </Button>
                ) : (
                    <Button
                        size="sm"
                        onClick={handleActivate}
                        disabled={loading}
                        className="gap-1.5 bg-indigo-600 hover:bg-indigo-700"
                    >
                        <Zap className="w-3.5 h-3.5" />
                        {loading ? "Activando..." : "Activar esta semana"}
                    </Button>
                )}
            </CardFooter>
        </Card>
    )
}
