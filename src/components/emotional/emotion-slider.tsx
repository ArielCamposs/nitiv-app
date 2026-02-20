"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { createAlert } from "@/lib/utils/create-alert"

const EMOTIONS = [
    { id: "muy_mal", label: "Muy mal", emoji: "😞", accent: "#ef4444", gradient: "from-red-100 to-red-50" },
    { id: "mal", label: "Mal", emoji: "😢", accent: "#f97316", gradient: "from-orange-100 to-orange-50" },
    { id: "neutral", label: "Neutral", emoji: "😐", accent: "#6b7280", gradient: "from-gray-100 to-gray-50" },
    { id: "bien", label: "Bien", emoji: "🙂", accent: "#10b981", gradient: "from-emerald-100 to-emerald-50" },
    { id: "muy_bien", label: "Muy bien", emoji: "🤩", accent: "#8b5cf6", gradient: "from-purple-100 to-purple-50" },
] as const

type EmotionId = typeof EMOTIONS[number]["id"]

const RISK_EMOTIONS: EmotionId[] = ["mal", "muy_mal"]

function getWeekNumber() {
    const now = new Date()
    const year = now.getFullYear()
    const oneJan = new Date(year, 0, 1)
    const numberOfDays = Math.floor((now.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000))
    const weekNumber = Math.ceil((now.getDay() + 1 + numberOfDays) / 7)
    return { weekNumber, year }
}

interface Props {
    studentId: string
    institutionId: string
    alreadyLogged?: boolean
}

export function EmotionSlider({ studentId, institutionId, alreadyLogged = false }: Props) {
    const [index, setIndex] = useState(2) // neutral por defecto
    const [intensity, setIntensity] = useState(3)
    const [reflection, setReflection] = useState("")
    const [saving, setSaving] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const emotion = EMOTIONS[index]
    const isRisk = RISK_EMOTIONS.includes(emotion.id)

    const handleSubmit = async () => {
        setSaving(true)
        try {
            const { weekNumber, year } = getWeekNumber()

            // 1) Insertar registro emocional
            const { error } = await supabase.from("emotional_logs").insert({
                institution_id: institutionId,
                student_id: studentId,
                emotion: emotion.id,
                intensity,
                reflection: reflection.trim() || null,
                type: "daily",
                week_number: weekNumber,
                year,
            })
            if (error) {
                console.error("Supabase error:", error.message, error.details)
                toast.error("No se pudo guardar tu registro. Intenta nuevamente.")
                return
            }

            // 2) Sumar puntos
            const basePoints = 10
            const extra = reflection.trim().length > 0 ? 5 : 0
            await supabase.from("points").insert({
                institution_id: institutionId,
                student_id: studentId,
                amount: basePoints + extra,
                reason: extra > 0 ? "daily_log_with_reflection" : "daily_log",
            })

            // 3) Generar alerta si es negativo repetido
            if (isRisk) {
                const { data: lastLogs } = await supabase
                    .from("emotional_logs")
                    .select("emotion")
                    .eq("student_id", studentId)
                    .eq("type", "daily")
                    .order("created_at", { ascending: false })
                    .limit(3)

                const allNegative = lastLogs?.every(
                    (l) => l.emotion === "mal" || l.emotion === "muy_mal"
                )
                if (allNegative && lastLogs?.length === 3) {
                    await createAlert({
                        institutionId,
                        studentId,
                        type: "registros_negativos",
                        description: "El estudiante lleva 3 o más días seguidos con registros negativos.",
                    })
                }
            }

            toast.success("¡Registro guardado! 🎉")
            setSubmitted(true)
            router.refresh()
        } catch (err) {
            console.error(err)
            toast.error("Ocurrió un error inesperado.")
        } finally {
            setSaving(false)
        }
    }

    if (alreadyLogged || submitted) {
        return (
            <Card className="border-dashed border-emerald-300 bg-emerald-50/60">
                <CardHeader>
                    <CardTitle>Registro de hoy completado ✅</CardTitle>
                    <CardDescription>
                        Ya registraste cómo te sientes hoy. Mañana podrás volver a hacerlo.
                    </CardDescription>
                </CardHeader>
            </Card>
        )
    }

    return (
        <Card className={`bg-linear-to-br ${emotion.gradient} transition-all duration-500 border-0 shadow-md`}>
            <CardHeader>
                <CardTitle>¿Cómo te sientes hoy?</CardTitle>
                <CardDescription>
                    Este registro es personal. Úsalo una vez al día para llevar un diario emocional.
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">

                {/* Emoji central */}
                <div className="flex flex-col items-center gap-1 py-2 select-none">
                    <div
                        key={emotion.id}
                        className="text-8xl animate-in zoom-in-50 duration-200"
                        style={{ filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.15))" }}
                    >
                        {emotion.emoji}
                    </div>
                    <span className="text-xl font-bold mt-1 transition-colors duration-300" style={{ color: emotion.accent }}>
                        {emotion.label}
                    </span>
                    {isRisk && (
                        <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full mt-1">
                            ⚠️ Si necesitas apoyo, la dupla está aquí para ti
                        </span>
                    )}
                </div>

                {/* Fila de emojis + slider */}
                <div className="space-y-2 px-1">
                    <label className="text-sm font-medium text-gray-500">
                        Desliza para elegir tu emoción
                    </label>

                    <div className="flex justify-between px-0.5">
                        {EMOTIONS.map((e, i) => (
                            <button
                                key={e.id}
                                onClick={() => setIndex(i)}
                                title={e.label}
                                className={`transition-all duration-200 ${i === index ? "text-3xl scale-125" : "text-lg opacity-40 hover:opacity-70"
                                    }`}
                            >
                                {e.emoji}
                            </button>
                        ))}
                    </div>

                    <input
                        type="range"
                        min={0}
                        max={EMOTIONS.length - 1}
                        step={1}
                        value={index}
                        onChange={(e) => setIndex(Number(e.target.value))}
                        className="w-full h-2 rounded-full appearance-none cursor-pointer"
                        style={{ accentColor: emotion.accent }}
                    />

                    <div className="flex justify-between text-xs text-gray-400 px-0.5">
                        <span>Muy mal 😞</span>
                        <span>Muy bien 🤩</span>
                    </div>
                </div>

                {/* Intensidad */}
                <div className="space-y-2 px-1">
                    <label className="text-sm font-medium text-gray-500">
                        Intensidad{" "}
                        <span className="font-bold" style={{ color: emotion.accent }}>{intensity}/5</span>
                    </label>
                    <input
                        type="range"
                        min={1} max={5} step={1}
                        value={intensity}
                        onChange={(e) => setIntensity(Number(e.target.value))}
                        className="w-full h-2 rounded-full appearance-none cursor-pointer"
                        style={{ accentColor: emotion.accent }}
                    />
                    <div className="flex justify-between text-xs text-gray-400">
                        <span>Poco</span>
                        <span>Muchísimo</span>
                    </div>
                </div>

                {/* Reflexión */}
                <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-500">
                        ¿Quieres contar un poco más?{" "}
                        <span className="font-normal text-gray-400">Opcional, pero suma puntos extra</span>
                    </label>
                    <Textarea
                        placeholder="Ej: Hoy me sentí así porque..."
                        value={reflection}
                        onChange={(e) => setReflection(e.target.value)}
                        maxLength={500}
                        rows={3}
                        className="bg-white/60 backdrop-blur-sm resize-none"
                    />
                    <p className="text-xs text-gray-400 text-right">{reflection.length}/500</p>
                </div>

                {/* Botón */}
                <div className="flex justify-end">
                    <Button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="text-white font-semibold px-6"
                        style={{ backgroundColor: emotion.accent }}
                    >
                        {saving ? "Guardando..." : "Guardar registro"}
                    </Button>
                </div>

            </CardContent>
        </Card>
    )
}
