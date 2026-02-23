"use client"

import { useState } from "react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Zap } from "lucide-react"
import { cn } from "@/lib/utils"

const ENERGY_OPTIONS = [
    { value: "motivado", label: "Motivado/a", emoji: "🔥" },
    { value: "con_animo", label: "Con ánimo", emoji: "😊" },
    { value: "neutral", label: "Neutral", emoji: "😐" },
    { value: "desmotivado", label: "Desmotivado/a", emoji: "😔" },
    { value: "sin_animo", label: "Sin ánimo", emoji: "😞" },
]

const PERCEPTION_OPTIONS = [
    { value: "muy_bien", label: "Muy bien", emoji: "⭐" },
    { value: "bien", label: "Bien", emoji: "👍" },
    { value: "neutral", label: "Neutral", emoji: "😐" },
    { value: "mal", label: "Mal", emoji: "👎" },
    { value: "muy_mal", label: "Muy mal", emoji: "⚠️" },
]

interface Props {
    pulseSessionId: string
    studentId: string       // students.id
    institutionId: string
    weekStart: string
    weekEnd: string
    onDone: () => void
}

export function PulseCheckinCard({
    pulseSessionId, studentId, institutionId,
    weekStart, weekEnd, onDone
}: Props) {
    const supabase = createClient()
    const [energy, setEnergy] = useState<string | null>(null)
    const [perception, setPerception] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    const fmt = (d: string) =>
        new Date(d + "T12:00:00").toLocaleDateString("es-CL", { day: "numeric", month: "short" })

    const handleSubmit = async () => {
        if (!energy || !perception) {
            toast.warning("Selecciona tu energía y percepción antes de continuar.")
            return
        }
        setLoading(true)
        try {
            const { error } = await supabase.from("pulse_student_entries").insert({
                pulse_session_id: pulseSessionId,
                student_id: studentId,
                institution_id: institutionId,
                energy_level: energy,
                class_perception: perception,
            })
            if (error) {
                // Unique constraint: ya registró esta semana
                if (error.code === "23505") {
                    toast.info("Ya registraste tu pulso esta semana.")
                    onDone()
                    return
                }
                throw error
            }
            toast.success("¡Pulso registrado! Gracias por participar.")
            onDone()
        } catch (e) {
            console.error(e)
            toast.error("No se pudo guardar el registro de pulso.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-white shadow-sm">
            <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                    <div className="rounded-full bg-indigo-100 p-1.5">
                        <Zap className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                        <CardTitle className="text-base text-indigo-900">Modo Pulso activo</CardTitle>
                        <CardDescription className="text-xs text-indigo-600">
                            {fmt(weekStart)} — {fmt(weekEnd)} · Solo toma 10 segundos
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-5">
                {/* Energía */}
                <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-900">¿Cómo está tu energía esta semana?</p>
                    <div className="flex flex-wrap gap-2">
                        {ENERGY_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => setEnergy(opt.value)}
                                className={cn(
                                    "flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-xs font-medium transition-all",
                                    energy === opt.value
                                        ? "border-indigo-500 bg-indigo-100 text-indigo-800 scale-105 shadow-sm"
                                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                                )}
                            >
                                <span>{opt.emoji}</span>
                                <span>{opt.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Percepción de clase */}
                <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-900">¿Cómo percibes el ambiente de tu clase?</p>
                    <div className="flex flex-wrap gap-2">
                        {PERCEPTION_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => setPerception(opt.value)}
                                className={cn(
                                    "flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-xs font-medium transition-all",
                                    perception === opt.value
                                        ? "border-indigo-500 bg-indigo-100 text-indigo-800 scale-105 shadow-sm"
                                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                                )}
                            >
                                <span>{opt.emoji}</span>
                                <span>{opt.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </CardContent>

            <CardFooter className="flex justify-end">
                <Button
                    onClick={handleSubmit}
                    disabled={loading || !energy || !perception}
                    className="bg-indigo-600 hover:bg-indigo-700"
                >
                    {loading ? "Guardando..." : "Registrar pulso"}
                </Button>
            </CardFooter>
        </Card>
    )
}
