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
import { Textarea } from "@/components/ui/textarea"

const weeklySchema = z.object({
    resumen: z
        .string()
        .min(10, "Escribe al menos 10 caracteres")
        .max(800, "Máximo 800 caracteres"),
})

type WeeklyFormValues = z.infer<typeof weeklySchema>

const LEVEL_LABELS: Record<number, string> = {
    1: "Muy poco",
    2: "Poco",
    3: "Moderado",
    4: "Alto",
    5: "Muy alto",
}

function getWeekNumber() {
    const now = new Date()
    const year = now.getFullYear()
    const oneJan = new Date(year, 0, 1)
    const numberOfDays = Math.floor(
        (now.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000)
    )
    const weekNumber = Math.ceil((now.getDay() + 1 + numberOfDays) / 7)
    return { weekNumber, year }
}

export function WeeklyCheckinCard() {
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const [alreadyDone, setAlreadyDone] = useState(false)
    const [stressValue, setStressValue] = useState(3)
    const [anxietyValue, setAnxietyValue] = useState(3)

    const stressLevel = Math.round(stressValue)
    const anxietyLevel = Math.round(anxietyValue)

    const { weekNumber, year } = getWeekNumber()

    const form = useForm<WeeklyFormValues>({
        resolver: zodResolver(weeklySchema),
    })

    // Verificar si ya existe registro semanal
    useEffect(() => {
        const checkExisting = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: student } = await supabase
                .from("students")
                .select("id")
                .eq("user_id", user.id)
                .maybeSingle()

            if (!student) return

            const { data: existing, error } = await supabase
                .from("emotional_logs")
                .select("id")
                .eq("student_id", student.id)
                .eq("type", "weekly")
                .eq("week_number", weekNumber)
                .eq("year", year)
                .maybeSingle()

            if (!error && existing) setAlreadyDone(true)
        }

        void checkExisting()
    }, [supabase, weekNumber, year])

    const onSubmit = async (values: WeeklyFormValues) => {
        try {
            setLoading(true)

            const { data: { user }, error: userError } = await supabase.auth.getUser()
            if (userError || !user) {
                toast.error("No se pudo obtener el usuario")
                return
            }

            const { data: student, error: studentError } = await supabase
                .from("students")
                .select("id, institution_id")
                .eq("user_id", user.id)
                .maybeSingle()

            if (studentError || !student) {
                toast.error("No se encontró el perfil de estudiante")
                return
            }

            // Seguridad: re-verificar que no exista otro semanal
            const { data: existing } = await supabase
                .from("emotional_logs")
                .select("id")
                .eq("student_id", student.id)
                .eq("type", "weekly")
                .eq("week_number", weekNumber)
                .eq("year", year)
                .maybeSingle()

            if (existing) {
                setAlreadyDone(true)
                toast.info("Ya realizaste tu check-in semanal esta semana.")
                return
            }

            const { error: insertError } = await supabase
                .from("emotional_logs")
                .insert({
                    institution_id: student.institution_id,
                    student_id: student.id,
                    emotion: "neutral",           // fijo en semanal, la reflexión es lo principal
                    stress_level: stressLevel,
                    anxiety_level: anxietyLevel,
                    reflection: values.resumen.trim(),
                    type: "weekly",
                    week_number: weekNumber,
                    year,
                })

            if (insertError) {
                console.error(insertError)
                toast.error("No se pudo guardar tu check-in semanal.")
                return
            }

            // Sumar puntos
            await supabase.from("points").insert({
                institution_id: student.institution_id,
                student_id: student.id,
                amount: 25,
                reason: "weekly_checkin",
            })

            toast.success("Check-in semanal registrado. ¡Gracias por tu reflexión! 🎉")
            setAlreadyDone(true)
        } catch (e) {
            console.error(e)
            toast.error("Ocurrió un error inesperado.")
        } finally {
            setLoading(false)
        }
    }

    if (alreadyDone) {
        return (
            <Card className="border-dashed border-amber-300 bg-amber-50/60">
                <CardHeader>
                    <CardTitle>Check-in semanal completado ✅</CardTitle>
                    <CardDescription>
                        Ya registraste tu reflexión de esta semana. Podrás hacer uno nuevo
                        la próxima semana.
                    </CardDescription>
                </CardHeader>
            </Card>
        )
    }

    return (
        <Card className="border border-slate-200">
            <CardHeader>
                <CardTitle>Check-in semanal</CardTitle>
                <CardDescription>
                    Usa este espacio en orientación para reflexionar más en profundidad
                    sobre tu semana.
                </CardDescription>
            </CardHeader>

            <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardContent className="space-y-6">
                    {/* Reflexión escrita */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">
                            Cuéntanos cómo fue tu semana
                        </label>
                        <Textarea
                            rows={5}
                            placeholder="Ej: Esta semana me sentí así por las pruebas, amistades, familia, etc."
                            {...form.register("resumen")}
                        />
                        {form.formState.errors.resumen && (
                            <p className="text-xs text-red-500">
                                {form.formState.errors.resumen.message}
                            </p>
                        )}
                        <p className="text-xs text-slate-400 text-right">
                            {form.watch("resumen")?.length ?? 0}/800
                        </p>
                    </div>

                    {/* Nivel de Estrés */}
                    <div className="space-y-2 px-1">
                        <label className="text-sm font-medium text-slate-700">
                            ¿Cómo fue tu nivel de estrés esta semana?{" "}
                            <span className="font-bold text-orange-500">
                                {LEVEL_LABELS[stressLevel]}
                            </span>
                        </label>
                        <input
                            type="range"
                            min={1} max={5} step={0.01}
                            value={stressValue}
                            onChange={(e) => setStressValue(Number(e.target.value))}
                            className="w-full h-2 rounded-full appearance-none cursor-pointer touch-none"
                            style={{ accentColor: "#f97316" }}
                        />
                        <div className="flex justify-between text-xs text-slate-400">
                            <span>Muy poco</span>
                            <span>Muy alto</span>
                        </div>
                    </div>

                    {/* Nivel de Ansiedad */}
                    <div className="space-y-2 px-1">
                        <label className="text-sm font-medium text-slate-700">
                            ¿Cómo fue tu nivel de ansiedad esta semana?{" "}
                            <span className="font-bold text-orange-500">
                                {LEVEL_LABELS[anxietyLevel]}
                            </span>
                        </label>
                        <input
                            type="range"
                            min={1} max={5} step={0.01}
                            value={anxietyValue}
                            onChange={(e) => setAnxietyValue(Number(e.target.value))}
                            className="w-full h-2 rounded-full appearance-none cursor-pointer touch-none"
                            style={{ accentColor: "#f97316" }}
                        />
                        <div className="flex justify-between text-xs text-slate-400">
                            <span>Muy poco</span>
                            <span>Muy alto</span>
                        </div>
                    </div>

                </CardContent>

                <CardFooter className="flex justify-end">
                    <Button type="submit" disabled={loading}>
                        {loading ? "Guardando..." : "Guardar check-in semanal"}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    )
}
