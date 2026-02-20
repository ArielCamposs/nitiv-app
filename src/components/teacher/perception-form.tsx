"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
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
import { Slider } from "@/components/ui/slider"
import { createAlert } from "@/lib/utils/create-alert"

const INDICATORS = [
    "Parece triste o desanimado",
    "Está aislado socialmente",
    "Cambio de conducta reciente",
    "Problemas de concentración",
    "Conflicto con compañeros",
    "Muestra signos de cansancio",
    "Participativo y motivado",
    "Bien integrado al curso",
]

type Props = {
    teacherId: string
    studentId: string
    institutionId: string
}

function getTodayRange() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    return { from: today.toISOString(), to: tomorrow.toISOString() }
}

export function PerceptionForm({
    teacherId,
    studentId,
    institutionId,
}: Props) {
    const supabase = createClient()
    const [wellbeing, setWellbeing] = useState(3)
    const [selectedIndicators, setSelectedIndicators] = useState<string[]>([])
    const [notes, setNotes] = useState("")
    const [loading, setLoading] = useState(false)
    const [alreadyDoneToday, setAlreadyDoneToday] = useState(false)

    useEffect(() => {
        const check = async () => {
            const { from, to } = getTodayRange()

            const { data: existing } = await supabase
                .from("teacher_student_perceptions")
                .select("id")
                .eq("teacher_id", teacherId)
                .eq("student_id", studentId)
                .gte("created_at", from)
                .lt("created_at", to)
                .maybeSingle()

            if (existing) setAlreadyDoneToday(true)
        }

        void check()
    }, [supabase, teacherId, studentId])

    const toggleIndicator = (ind: string) => {
        setSelectedIndicators((prev) =>
            prev.includes(ind)
                ? prev.filter((i) => i !== ind)
                : prev.length < 3
                    ? [...prev, ind]
                    : prev
        )
    }

    const handleSubmit = async () => {
        try {
            setLoading(true)

            const { from, to } = getTodayRange()

            const { data: existing } = await supabase
                .from("teacher_student_perceptions")
                .select("id")
                .eq("teacher_id", teacherId)
                .eq("student_id", studentId)
                .gte("created_at", from)
                .lt("created_at", to)
                .maybeSingle()

            if (existing) {
                setAlreadyDoneToday(true)
                toast.info("Ya registraste tu percepción de este estudiante hoy.")
                return
            }

            const { error } = await supabase
                .from("teacher_student_perceptions")
                .insert({
                    institution_id: institutionId,
                    teacher_id: teacherId,
                    student_id: studentId,
                    wellbeing_score: wellbeing,
                    indicators: selectedIndicators,
                    notes: notes.trim() || null,
                    log_date: new Date().toISOString().split("T")[0],
                })

            if (error) {
                console.error(error)
                toast.error("No se pudo guardar la percepción.")
                return
            }

            toast.success("Percepción guardada.")
            setAlreadyDoneToday(true)

            // Verificar discrepancia con el último registro del estudiante
            const { data: lastStudentLog } = await supabase
                .from("emotional_logs")
                .select("emotion")
                .eq("student_id", studentId)
                .eq("type", "daily")
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle()

            const studentEmotion = lastStudentLog?.emotion
            const studentPositive =
                studentEmotion === "muy_bien" || studentEmotion === "bien"
            const teacherNegative = wellbeing <= 2

            if (studentPositive && teacherNegative) {
                await createAlert({
                    institutionId,
                    studentId,
                    type: "discrepancia_docente",
                    description:
                        "El estudiante reportó sentirse bien, pero el docente percibe bajo bienestar. Podría estar ocultando su estado real.",
                    triggeredBy: teacherId,
                })
            }
        } finally {
            setLoading(false)
        }
    }

    if (alreadyDoneToday) {
        return (
            <Card className="border-dashed border-emerald-300 bg-emerald-50/60">
                <CardHeader>
                    <CardTitle>Percepción del día registrada</CardTitle>
                    <CardDescription>
                        Ya evaluaste el bienestar de este estudiante hoy.
                    </CardDescription>
                </CardHeader>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Tu percepción como docente</CardTitle>
                <CardDescription>
                    ¿Cómo ves el bienestar de este estudiante hoy?
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

                {/* Bienestar general */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-900">
                            Bienestar percibido
                        </span>
                        <span className="text-slate-500">{wellbeing}/5</span>
                    </div>
                    <Slider
                        min={1}
                        max={5}
                        step={1}
                        value={[wellbeing]}
                        onValueChange={([v]) => setWellbeing(v)}
                    />
                    <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Muy bajo</span>
                        <span>Muy alto</span>
                    </div>
                </div>

                {/* Indicadores */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-900">
                        Indicadores que observas{" "}
                        <span className="font-normal text-slate-400">(máx. 3)</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {INDICATORS.map((ind) => (
                            <button
                                key={ind}
                                type="button"
                                onClick={() => toggleIndicator(ind)}
                                className={`rounded-full border px-3 py-1 text-xs transition-all ${selectedIndicators.includes(ind)
                                    ? "border-indigo-500 bg-indigo-100 text-indigo-700"
                                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                                    }`}
                            >
                                {ind}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Nota libre */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-900">
                        Observación libre{" "}
                        <span className="font-normal text-slate-400">(opcional)</span>
                    </label>
                    <Textarea
                        rows={3}
                        placeholder="Ej: Llegó cabizbajo, no participó durante la clase..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                </div>
            </CardContent>
            <CardFooter className="flex justify-end">
                <Button onClick={handleSubmit} disabled={loading}>
                    {loading ? "Guardando..." : "Guardar percepción"}
                </Button>
            </CardFooter>
        </Card>
    )
}
