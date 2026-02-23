// src/components/emotional/emotional-checkin-card.tsx
"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { createAlert } from "@/lib/utils/create-alert"

const formSchema = z.object({
    emotion: z.enum(["muy_bien", "bien", "neutral", "mal", "muy_mal"], {
        message: "Por favor, selecciona una emoción.",
    }),
    intensity: z.number().min(1).max(5),
    reflection: z.string().max(500).optional(),
})

type FormValues = z.infer<typeof formSchema>

const emotionsOptions = [
    { value: "muy_bien", label: "Muy bien", emoji: "😄", color: "border-emerald-500 bg-emerald-50 text-emerald-700" },
    { value: "bien", label: "Bien", emoji: "🙂", color: "border-emerald-300 bg-emerald-50/60 text-emerald-600" },
    { value: "neutral", label: "Neutral", emoji: "😐", color: "border-slate-300 bg-slate-50 text-slate-600" },
    { value: "mal", label: "Mal", emoji: "😔", color: "border-rose-300 bg-rose-50 text-rose-600" },
    { value: "muy_mal", label: "Muy mal", emoji: "😢", color: "border-rose-500 bg-rose-50 text-rose-700" },
]

// Lista de etiquetas emocionales clickeables
const emotionTags = [
    "Ansioso/a", "Cansado/a", "Motivado/a", "Triste", "Enojado/a",
    "Tranquilo/a", "Confundido/a", "Alegre", "Estresado/a", "Solo/a",
    "Esperanzado/a", "Aburrido/a", "Agradecido/a", "Asustado/a", "Orgulloso/a",
]

function getTodayRange() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    return { from: today.toISOString(), to: tomorrow.toISOString() }
}

export function EmotionalCheckinCard() {
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const [alreadyDoneToday, setAlreadyDoneToday] = useState(false)

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            intensity: 3,
        },
    })

    useEffect(() => {
        const checkDaily = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser()
            if (!user) return

            const { data: student, error: studentError } = await supabase
                .from("students")
                .select("id")
                .eq("user_id", user.id)
                .maybeSingle()

            if (studentError || !student) return

            const { from, to } = getTodayRange()

            const { data: existing, error } = await supabase
                .from("emotional_logs")
                .select("id")
                .eq("student_id", student.id)
                .eq("type", "daily")
                .gte("created_at", from)
                .lt("created_at", to)
                .maybeSingle()

            if (!error && existing) {
                setAlreadyDoneToday(true)
            }
        }

        void checkDaily()
    }, [supabase])

    const onSubmit = async (values: FormValues) => {
        try {
            setLoading(true)

            // 1) Obtener usuario actual
            const {
                data: { user },
                error: userError,
            } = await supabase.auth.getUser()

            if (userError || !user) {
                toast.error("No se pudo obtener el usuario")
                return
            }

            // 2) Obtener el estudiante asociado
            const { data: student, error: studentError } = await supabase
                .from("students")
                .select("id, institution_id")
                .eq("user_id", user.id)
                .maybeSingle()

            if (studentError || !student) {
                toast.error("No se encontró el perfil de estudiante")
                return
            }

            // 3) Calcular semana del año
            const now = new Date()
            const year = now.getFullYear()
            const oneJan = new Date(year, 0, 1)
            const numberOfDays = Math.floor(
                (now.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000)
            )
            const weekNumber = Math.ceil((now.getDay() + 1 + numberOfDays) / 7)

            // 3.1) Verificar si ya registró hoy (Lógica Robustecida)
            const { from, to } = getTodayRange()

            const { data: existingDaily, error: existingError } = await supabase
                .from("emotional_logs")
                .select("id")
                .eq("student_id", student.id)
                .eq("type", "daily")
                .gte("created_at", from)
                .lt("created_at", to)
                .maybeSingle()

            if (!existingError && existingDaily) {
                setAlreadyDoneToday(true)
                toast.info("Ya registraste tu emoción de hoy. Vuelve mañana 🙂")
                return
            }

            // 4) Insertar registro emocional
            const { error: insertError } = await supabase.from("emotional_logs").insert({
                institution_id: student.institution_id,
                student_id: student.id,
                emotion: values.emotion,
                intensity: values.intensity,
                reflection: values.reflection?.trim() || null,
                type: "daily", // por ahora diario, luego agregamos modo semanal profundo
                week_number: weekNumber,
                year,
            })

            if (insertError) {
                console.error(insertError)
                toast.error("No se pudo guardar tu registro. Intenta nuevamente.")
                return
            }

            // 5) Insertar puntos
            const basePoints = 10
            const extra = values.reflection && values.reflection.trim().length > 0 ? 5 : 0

            const { error: pointsError } = await supabase.from("points").insert({
                institution_id: student.institution_id,
                student_id: student.id,
                amount: basePoints + extra,
                reason: extra > 0 ? "daily_log_with_reflection" : "daily_log",
            })

            if (pointsError) {
                console.error(pointsError)
                // No bloquees el flujo si falla, solo log
            }

            // 6) Verificar si debe generar alerta de registros negativos
            if (
                values.emotion === "mal" ||
                values.emotion === "muy_mal"
            ) {
                // Obtener últimos 3 registros diarios
                const { data: lastLogs } = await supabase
                    .from("emotional_logs")
                    .select("emotion")
                    .eq("student_id", student.id)
                    .eq("type", "daily")
                    .order("created_at", { ascending: false })
                    .limit(3)

                const allNegative = lastLogs?.every(
                    (l) => l.emotion === "mal" || l.emotion === "muy_mal"
                )

                if (allNegative && lastLogs?.length === 3) {
                    await createAlert({
                        institutionId: student.institution_id,
                        studentId: student.id,
                        type: "registros_negativos",
                        description:
                            "El estudiante lleva 3 o más días seguidos con registros negativos (mal o muy mal).",
                    })
                }
            }

            toast.success("Registro guardado. Gracias por compartir cómo te sientes.")
            setAlreadyDoneToday(true)
            form.reset({ intensity: 3, reflection: "" })
        } catch (error) {
            console.error(error)
            toast.error("Ocurrió un error inesperado.")
        } finally {
            setLoading(false)
        }
    }

    if (alreadyDoneToday) {
        return (
            <Card className="border-dashed border-emerald-300 bg-emerald-50/60">
                <CardHeader>
                    <CardTitle>Registro de hoy completado</CardTitle>
                    <CardDescription>
                        Ya registraste cómo te sientes hoy. Mañana podrás volver a hacerlo.
                    </CardDescription>
                </CardHeader>
            </Card>
        )
    }

    return (
        <Card className="border-none shadow-sm">
            <CardHeader>
                <CardTitle>¿Cómo te sientes hoy?</CardTitle>
                <CardDescription>
                    Este registro es personal. Úsalo una vez al día para llevar un diario emocional.
                </CardDescription>
            </CardHeader>

            <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardContent className="space-y-6">
                    {/* Emoción principal — botones clickeables */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-slate-900">
                            ¿Cómo te sientes hoy?
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {emotionsOptions.map((e) => {
                                const selected = form.watch("emotion") === e.value
                                return (
                                    <button
                                        key={e.value}
                                        type="button"
                                        onClick={() => form.setValue("emotion", e.value as FormValues["emotion"], { shouldValidate: true })}
                                        className={`flex items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-medium transition-all
                                            ${selected
                                                ? e.color + " scale-105 shadow-sm"
                                                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                                            }`}
                                    >
                                        <span>{e.emoji}</span>
                                        <span>{e.label}</span>
                                    </button>
                                )
                            })}
                        </div>
                        {form.formState.errors.emotion && (
                            <p className="text-xs text-red-500">{form.formState.errors.emotion.message}</p>
                        )}
                    </div>

                    {/* Intensidad */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-slate-900">Intensidad</span>
                            <span className="text-slate-500">{form.watch("intensity")}/5</span>
                        </div>
                        <Slider
                            min={1} max={5} step={1}
                            value={[form.watch("intensity")]}
                            onValueChange={([value]) => form.setValue("intensity", value, { shouldValidate: true })}
                        />
                    </div>

                    {/* Etiquetas emocionales clickeables — reemplaza el textarea */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-slate-900">¿Algo más que quieras marcar?</span>
                            <span className="text-xs text-slate-400">Opcional · suma puntos extra</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {emotionTags.map((tag) => {
                                const currentTags: string[] = form.watch("reflection")?.split(",").map(t => t.trim()).filter(Boolean) ?? []
                                const isSelected = currentTags.includes(tag)
                                return (
                                    <button
                                        key={tag}
                                        type="button"
                                        onClick={() => {
                                            const updated = isSelected
                                                ? currentTags.filter(t => t !== tag)
                                                : [...currentTags, tag]
                                            form.setValue("reflection", updated.join(", "))
                                        }}
                                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-all
                                            ${isSelected
                                                ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                                                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                                            }`}
                                    >
                                        {tag}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </CardContent>

                <CardFooter className="flex justify-end">
                    <Button type="submit" disabled={loading}>
                        {loading ? "Guardando..." : "Guardar registro"}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    )
}
