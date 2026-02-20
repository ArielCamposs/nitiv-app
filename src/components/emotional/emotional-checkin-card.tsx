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
    { value: "muy_bien", label: "Muy bien", color: "bg-emerald-500" },
    { value: "bien", label: "Bien", color: "bg-emerald-300" },
    { value: "neutral", label: "Neutral", color: "bg-slate-300" },
    { value: "mal", label: "Mal", color: "bg-rose-300" },
    { value: "muy_mal", label: "Muy mal", color: "bg-rose-500" },
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
                    {/* Emoción */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-900">
                            Elige una emoción
                        </label>
                        <Select
                            onValueChange={(value) =>
                                form.setValue("emotion", value as FormValues["emotion"])
                            }
                            value={form.watch("emotion")}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona una emoción" />
                            </SelectTrigger>
                            <SelectContent>
                                {emotionsOptions.map((e) => (
                                    <SelectItem key={e.value} value={e.value}>
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`h-2 w-2 rounded-full ${e.color}`}
                                            ></span>
                                            <span>{e.label}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {form.formState.errors.emotion && (
                            <p className="text-xs text-red-500">
                                {form.formState.errors.emotion.message}
                            </p>
                        )}
                    </div>

                    {/* Intensidad */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-slate-900">
                                Intensidad
                            </span>
                            <span className="text-slate-500">
                                {form.watch("intensity")}/5
                            </span>
                        </div>
                        <Slider
                            min={1}
                            max={5}
                            step={1}
                            value={[form.watch("intensity")]}
                            onValueChange={([value]) =>
                                form.setValue("intensity", value, { shouldValidate: true })
                            }
                        />
                    </div>

                    {/* Reflexión */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-slate-900">
                                ¿Quieres contar un poco más?
                            </span>
                            <span className="text-xs text-slate-500">
                                Opcional, pero suma puntos extra
                            </span>
                        </div>
                        <Textarea
                            placeholder="Ej: Hoy me sentí así porque..."
                            rows={4}
                            {...form.register("reflection")}
                        />
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
