"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
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

const LEVEL_LABELS: Record<number, string> = {
    1: "Muy poco", 2: "Poco", 3: "Moderado", 4: "Alto", 5: "Muy alto",
}

// Escala progresiva según distancia al índice seleccionado
function getEmojiScale(i: number, selected: number): number {
    const dist = Math.abs(i - selected)
    if (dist === 0) return 1.4
    if (dist === 1) return 1.1
    if (dist === 2) return 0.85
    return 0.7
}

function getEmojiOpacity(i: number, selected: number): number {
    const dist = Math.abs(i - selected)
    if (dist === 0) return 1
    if (dist === 1) return 0.7
    if (dist === 2) return 0.45
    return 0.3
}

interface Props {
    studentId: string
    institutionId: string
    alreadyLogged?: boolean
}

export function EmotionSlider({ studentId, institutionId, alreadyLogged = false }: Props) {
    const [indexValue, setIndexValue] = useState(2)
    const [prevIndex, setPrevIndex] = useState(2)
    const [stressValue, setStressValue] = useState(3)
    const [anxietyValue, setAnxietyValue] = useState(3)
    const [saving, setSaving] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const activeIndex = Math.round(indexValue)
    const stressLevel = Math.round(stressValue)
    const anxietyLevel = Math.round(anxietyValue)

    const emotion = EMOTIONS[activeIndex]
    const isRisk = RISK_EMOTIONS.includes(emotion.id)
    const direction = activeIndex > prevIndex ? 1 : -1

    const handleIndexChange = (newValue: number) => {
        if (Math.round(newValue) !== activeIndex) {
            setPrevIndex(activeIndex)
        }
        setIndexValue(newValue)
    }

    const handleSubmit = async () => {
        setSaving(true)
        try {
            const { weekNumber, year } = getWeekNumber()

            const { error } = await supabase.from("emotional_logs").insert({
                institution_id: institutionId,
                student_id: studentId,
                emotion: emotion.id,
                stress_level: stressLevel,
                anxiety_level: anxietyLevel,
                type: "daily",
                week_number: weekNumber,
                year,
            })
            if (error) {
                console.error("Supabase error:", error.message, error.details)
                toast.error("No se pudo guardar tu registro. Intenta nuevamente.")
                return
            }

            await supabase.from("points").insert({
                institution_id: institutionId,
                student_id: studentId,
                amount: 10,
                reason: "daily_log",
            })

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
        <Card className="border-0 shadow-md overflow-hidden">

            {/* Fondo animado con transición suave de gradiente */}
            <div
                className={`bg-linear-to-br ${emotion.gradient} transition-all duration-500 ease-in-out`}
            >
                <CardHeader>
                    <CardTitle>¿Cómo te sientes hoy?</CardTitle>
                    <CardDescription>
                        Este registro es personal. Úsalo una vez al día para llevar un diario emocional.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">

                    {/* Emoji central — morphing suave sin AnimatePresence */}
                    <div className="flex flex-col items-center gap-1 py-2 select-none">
                        <motion.div
                            animate={{
                                scale: [1, 0.85, 1],
                                filter: [
                                    "blur(0px) brightness(1)",
                                    "blur(3px) brightness(1.3)",
                                    "blur(0px) brightness(1)",
                                ],
                            }}
                            transition={{
                                duration: 0.35,
                                ease: "easeInOut",
                                times: [0, 0.4, 1],
                            }}
                            key={emotion.id}
                            className="text-8xl"
                            style={{
                                filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.15))",
                            }}
                        >
                            {emotion.emoji}
                        </motion.div>

                        {/* Label con transición CSS */}
                        <span
                            className="text-xl font-bold mt-1 transition-colors duration-300"
                            style={{ color: emotion.accent }}
                        >
                            {emotion.label}
                        </span>

                        {isRisk && (
                            <motion.span
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.2 }}
                                className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full mt-1"
                            >
                                ⚠️ Si necesitas apoyo, la dupla está aquí para ti
                            </motion.span>
                        )}
                    </div>

                    {/* Fila de emojis con escala progresiva */}
                    <div className="space-y-2 px-1">
                        <label className="text-sm font-medium text-gray-500">
                            Desliza para elegir tu emoción
                        </label>

                        <div className="flex justify-between items-end px-0.5 py-2">
                            {EMOTIONS.map((e, i) => (
                                <motion.button
                                    key={e.id}
                                    onClick={() => handleIndexChange(i)}
                                    title={e.label}
                                    animate={{
                                        scale: getEmojiScale(i, activeIndex),
                                        opacity: getEmojiOpacity(i, activeIndex),
                                    }}
                                    transition={{
                                        type: "spring",
                                        stiffness: 380,
                                        damping: 22,
                                    }}
                                    className="text-2xl cursor-pointer select-none leading-none"
                                >
                                    {e.emoji}
                                </motion.button>
                            ))}
                        </div>

                        <input
                            type="range"
                            min={0}
                            max={4}
                            step={0.01}
                            value={indexValue}
                            onChange={(e) => handleIndexChange(Number(e.target.value))}
                            className="w-full h-2 rounded-full appearance-none cursor-pointer touch-none"
                            style={{ accentColor: emotion.accent }}
                        />

                        <div className="flex justify-between text-xs text-gray-400 px-0.5">
                            <span>Muy mal 😞</span>
                            <span>Muy bien 🤩</span>
                        </div>
                    </div>

                    {/* Nivel de Estrés */}
                    <div className="space-y-2 px-1">
                        <label className="text-sm font-medium text-gray-500">
                            Nivel de estrés{" "}
                            <motion.span
                                key={stressLevel}
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.15 }}
                                className="font-bold"
                                style={{ color: emotion.accent }}
                            >
                                {LEVEL_LABELS[stressLevel]}
                            </motion.span>
                        </label>
                        <input
                            type="range"
                            min={1} max={5} step={0.01}
                            value={stressValue}
                            onChange={(e) => setStressValue(Number(e.target.value))}
                            className="w-full h-2 rounded-full appearance-none cursor-pointer touch-none"
                            style={{ accentColor: emotion.accent }}
                        />
                        <div className="flex justify-between text-xs text-gray-400">
                            <span>Muy poco</span>
                            <span>Muy alto</span>
                        </div>
                    </div>

                    {/* Nivel de Ansiedad */}
                    <div className="space-y-2 px-1">
                        <label className="text-sm font-medium text-gray-500">
                            Nivel de ansiedad{" "}
                            <motion.span
                                key={anxietyLevel}
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.15 }}
                                className="font-bold"
                                style={{ color: emotion.accent }}
                            >
                                {LEVEL_LABELS[anxietyLevel]}
                            </motion.span>
                        </label>
                        <input
                            type="range"
                            min={1} max={5} step={0.01}
                            value={anxietyValue}
                            onChange={(e) => setAnxietyValue(Number(e.target.value))}
                            className="w-full h-2 rounded-full appearance-none cursor-pointer touch-none"
                            style={{ accentColor: emotion.accent }}
                        />
                        <div className="flex justify-between text-xs text-gray-400">
                            <span>Muy poco</span>
                            <span>Muy alto</span>
                        </div>
                    </div>

                    {/* Botón */}
                    <div className="flex justify-end">
                        <motion.div
                            whileTap={{ scale: 0.96 }}
                            whileHover={{ scale: 1.02 }}
                            transition={{ type: "spring", stiffness: 400, damping: 15 }}
                        >
                            <Button
                                onClick={handleSubmit}
                                disabled={saving}
                                className="text-white font-semibold px-6"
                                style={{ backgroundColor: emotion.accent }}
                            >
                                {saving ? "Guardando..." : "Guardar registro"}
                            </Button>
                        </motion.div>
                    </div>

                </CardContent>
            </div>
        </Card>
    )
}
