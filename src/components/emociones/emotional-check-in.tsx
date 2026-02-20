"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const EMOTIONS = [
    {
        id: "feliz",
        label: "Feliz",
        emoji: "😊",
        color: "bg-yellow-100 text-yellow-700 border-yellow-300",
        ring: "ring-yellow-300",
    },
    {
        id: "emocionado",
        label: "Emocionado",
        emoji: "🎉",
        color: "bg-pink-100 text-pink-700 border-pink-300",
        ring: "ring-pink-300",
    },
    {
        id: "esperanzado",
        label: "Esperanzado",
        emoji: "🌟",
        color: "bg-purple-100 text-purple-700 border-purple-300",
        ring: "ring-purple-300",
    },
    {
        id: "orgulloso",
        label: "Orgulloso",
        emoji: "💪",
        color: "bg-indigo-100 text-indigo-700 border-indigo-300",
        ring: "ring-indigo-300",
    },
    {
        id: "calma",
        label: "Calma",
        emoji: "😌",
        color: "bg-green-100 text-green-700 border-green-300",
        ring: "ring-green-300",
    },
    {
        id: "ansioso",
        label: "Ansioso",
        emoji: "😰",
        color: "bg-orange-100 text-orange-700 border-orange-300",
        ring: "ring-orange-300",
    },
    {
        id: "confundido",
        label: "Confundido",
        emoji: "😕",
        color: "bg-cyan-100 text-cyan-700 border-cyan-300",
        ring: "ring-cyan-300",
    },
    {
        id: "triste",
        label: "Triste",
        emoji: "😢",
        color: "bg-blue-100 text-blue-700 border-blue-300",
        ring: "ring-blue-300",
    },
    {
        id: "frustrado",
        label: "Frustrado",
        emoji: "😠",
        color: "bg-red-100 text-red-700 border-red-300",
        ring: "ring-red-300",
    },
    {
        id: "solo",
        label: "Solo",
        emoji: "😔",
        color: "bg-slate-100 text-slate-700 border-slate-300",
        ring: "ring-slate-300",
    },
]

const RISK_KEYWORDS = {
    critical: [
        "suicidio",
        "matarme",
        "suicidarme",
        "muerte",
        "quiero morirme",
        "ahorcarme",
        "cortarme",
        "envenenarme",
        "tirarme",
        "no quiero vivir",
    ],
    high: [
        "depresión severa",
        "nadie me quiere",
        "soy una carga",
        "no hay salida",
    ],
}

type Props = {
    data: any
}

export function EmotionalCheckIn({ data }: Props) {
    const router = useRouter()
    const supabase = createClient()

    // Default to "Calma" (index 4)
    const [selectedIndex, setSelectedIndex] = useState(4)
    const [intensity, setIntensity] = useState(3)
    const [reflection, setReflection] = useState("")
    const [saving, setSaving] = useState(false)
    const [riskAlert, setRiskAlert] = useState<{
        level: "critical" | "high"
        message: string
    } | null>(null)

    const checkForRiskKeywords = (text: string) => {
        const lowerText = text.toLowerCase()

        for (const keyword of RISK_KEYWORDS.critical) {
            if (lowerText.includes(keyword)) {
                return {
                    level: "critical" as const,
                    message: `Percibimos que podrías estar en riesgo.
Si necesitas ayuda inmediata:
🆘 Emergencias: 131
📞 Fono Prevención Suicidio: 1729`,
                }
            }
        }

        for (const keyword of RISK_KEYWORDS.high) {
            if (lowerText.includes(keyword)) {
                return {
                    level: "high" as const,
                    message: `Notamos que estás atravesando un momento difícil.
¿Te gustaría hablar con la dupla psicosocial?`,
                }
            }
        }

        return null
    }

    const handleReflectionChange = (text: string) => {
        setReflection(text)
        const risk = checkForRiskKeywords(text)
        setRiskAlert(risk)
    }

    const handleSubmit = async () => {
        const selectedEmotion = EMOTIONS[selectedIndex]

        if (riskAlert?.level === "critical") {
            toast.error("Por favor, contacta con emergencias: 131")
            return
        }

        try {
            setSaving(true)

            const currentWeek = Math.ceil(
                (new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) /
                (7 * 24 * 60 * 60 * 1000)
            )

            const { error } = await supabase.from("emotional_logs").insert({
                institution_id: data.institution_id,
                student_id: data.userId,
                emotion: selectedEmotion.id,
                intensity: intensity,
                reflection: reflection || null,
                week_number: currentWeek,
                year: new Date().getFullYear(),
                type: "weekly",
            })

            if (error) {
                console.error(error)
                toast.error("No se pudo guardar")
                return
            }

            if (riskAlert?.level === "high") {
                await supabase.from("alerts").insert({
                    institution_id: data.institution_id,
                    student_id: data.userId,
                    alert_type: "mental_health_concern",
                    severity: "media",
                    description: `Preocupación: ${reflection.substring(0, 100)}`,
                    triggered_by_id: data.userId,
                })
            }

            toast.success("¡Registro guardado!")
            setSelectedIndex(4) // Reset to Calma
            setIntensity(3)
            setReflection("")
            setRiskAlert(null)
            router.refresh()
        } finally {
            setSaving(false)
        }
    }

    const currentEmotion = EMOTIONS[selectedIndex]

    return (
        <div className="space-y-8 max-w-lg mx-auto">
            <div className="text-center">
                <h1 className="text-3xl font-bold text-slate-900">¿Cómo estás hoy?</h1>
                <p className="text-sm text-slate-500 mt-2">
                    Desliza para seleccionar tu emoción
                </p>
            </div>

            {/* Display de Emoción Grande */}
            <div className="flex justify-center">
                <div
                    className={`
                        relative w-64 h-64 rounded-full flex flex-col items-center justify-center
                        border-4 transition-all duration-300 ease-out shadow-xl
                        ${currentEmotion.color} ${currentEmotion.ring}
                    `}
                >
                    <span className="text-8xl mb-2 filter drop-shadow-sm transition-transform duration-300 hover:scale-110">
                        {currentEmotion.emoji}
                    </span>
                    <span className="text-2xl font-bold text-slate-900/80">
                        {currentEmotion.label}
                    </span>
                </div>
            </div>

            {/* Selector Deslizante tipo Scroll */}
            <Card className="border-0 shadow-none bg-transparent">
                <CardContent className="pt-6 pb-2 px-0">
                    <div className="relative h-12 flex items-center">
                        {/* Pista del slider */}
                        <div className="absolute w-full h-4 bg-slate-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-slate-900/20 transition-all duration-100"
                                style={{
                                    width: `${(selectedIndex / (EMOTIONS.length - 1)) * 100}%`
                                }}
                            />
                        </div>

                        {/* Input Range Personalizado */}
                        <input
                            type="range"
                            min="0"
                            max={EMOTIONS.length - 1}
                            step="1"
                            value={selectedIndex}
                            onChange={(e) => setSelectedIndex(Number(e.target.value))}
                            className="
                                absolute w-full h-12 opacity-0 cursor-pointer z-10
                            "
                        />

                        {/* Indicador visual del thumb (opcional, para mayor feedback) */}
                        <div
                            className="absolute h-8 w-8 bg-white border-2 border-slate-900 rounded-full shadow-md pointer-events-none transition-all duration-75 ease-out flex items-center justify-center"
                            style={{
                                left: `calc(${(selectedIndex / (EMOTIONS.length - 1)) * 100}% - 16px)`
                            }}
                        >
                            <div className="w-2 h-2 bg-slate-900 rounded-full" />
                        </div>
                    </div>

                    <div className="flex justify-between text-xs text-slate-400 mt-2 px-1">
                        <span>{EMOTIONS[0].label}</span>
                        <span>{EMOTIONS[EMOTIONS.length - 1].label}</span>
                    </div>
                </CardContent>
            </Card>

            {/* Intensidad */}
            <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-slate-700">
                        Intensidad de esta emoción
                    </label>
                    <Badge variant="outline" className="text-base font-normal">
                        {intensity}/5
                    </Badge>
                </div>
                <div className="relative h-2 bg-slate-100 rounded-full">
                    <input
                        type="range"
                        min="1"
                        max="5"
                        value={intensity}
                        onChange={(e) => setIntensity(Number(e.target.value))}
                        className="absolute w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div
                        className="absolute h-full bg-slate-900 rounded-full transition-all"
                        style={{ width: `${((intensity - 1) / 4) * 100}%` }}
                    />
                    <div
                        className="absolute h-4 w-4 bg-white border border-slate-300 rounded-full shadow-sm top-1/2 -translate-y-1/2 pointer-events-none transition-all"
                        style={{ left: `calc(${((intensity - 1) / 4) * 100}% - 8px)` }}
                    />
                </div>
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>Leve</span>
                    <span>Intensa</span>
                </div>
            </div>

            {/* Risk Alert Alert */}
            {riskAlert && (
                <div
                    className={`rounded-lg border p-4 animate-in fade-in slide-in-from-bottom-2 ${riskAlert.level === "critical"
                            ? "bg-red-50 border-red-300 text-red-800"
                            : "bg-amber-50 border-amber-300 text-amber-800"
                        }`}
                >
                    <p className="font-semibold mb-2">
                        {riskAlert.level === "critical" ? "🚨 Alerta de seguridad" : "📌 Nos preocupa tu bienestar"}
                    </p>
                    <p className="text-sm whitespace-pre-line mb-3">{riskAlert.message}</p>
                    {riskAlert.level === "critical" && (
                        <div className="flex flex-col gap-2">
                            <Button
                                size="sm"
                                className="bg-red-600 hover:bg-red-700 w-full"
                                onClick={() => window.open("tel:131")}
                            >
                                🚨 Emergencias (131)
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="w-full"
                                onClick={() => window.open("tel:1729")}
                            >
                                📞 Prevención Suicidio (1729)
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* Reflexión (Siempre visible ahora que hay emoción seleccionada por defecto, o condicional?) 
                Como por defecto es Calma, mejor dejarlo visible siempre o colapsado?
                El usuario dijo "cambies el ingreso", así que mejor dejarlo visible.
            */}
            <Card>
                <CardContent className="pt-6">
                    <label className="text-sm font-medium text-slate-700 block mb-2">
                        ¿Quieres contarnos por qué te sientes así? (Opcional)
                    </label>
                    <Textarea
                        placeholder="Escribe aquí..."
                        rows={3}
                        value={reflection}
                        onChange={(e) => handleReflectionChange(e.target.value)}
                        className="resize-none"
                    />
                    <div className="text-xs text-slate-400 mt-2 text-right">
                        {reflection.length} caracteres
                    </div>
                </CardContent>
            </Card>

            <Button
                onClick={handleSubmit}
                disabled={saving}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white h-12 text-lg"
            >
                {saving ? "Guardando..." : "Registrar mi día"}
            </Button>
        </div>
    )
}
