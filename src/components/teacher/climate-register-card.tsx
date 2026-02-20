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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

const ENERGY_OPTIONS = [
    {
        value: "explosiva",
        label: "🔴 Explosiva",
        desc: "Gritos, conflictos, descontrol",
    },
    {
        value: "inquieta",
        label: "🟡 Inquieta",
        desc: "Mucho ruido, dificultad para iniciar",
    },
    {
        value: "regulada",
        label: "🟢 Regulada",
        desc: "Ruido normal de trabajo, calma",
    },
    {
        value: "apatica",
        label: "🔵 Apática",
        desc: "Silencio excesivo, desánimo, falta de respuesta",
    },
]

const CONDUCT_TAGS = [
    "Trabajadores / Enfocados",
    "Participativos",
    "Desafiantes / Discutidores",
    "Agotados / Sin energía",
    "Colaborativos",
]

type Props = {
    teacherId: string
    courseId: string
    institutionId: string
}

function getTodayRange() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    return { from: today.toISOString(), to: tomorrow.toISOString() }
}

export function ClimateRegisterCard({
    teacherId,
    courseId,
    institutionId,
}: Props) {
    const supabase = createClient()
    const [energyLevel, setEnergyLevel] = useState<string>("")
    const [selectedTags, setSelectedTags] = useState<string[]>([])
    const [notes, setNotes] = useState("")
    const [loading, setLoading] = useState(false)
    const [alreadyDoneToday, setAlreadyDoneToday] = useState(false)

    useEffect(() => {
        const checkExisting = async () => {
            const { from, to } = getTodayRange()

            const { data: existing } = await supabase
                .from("teacher_logs")
                .select("id")
                .eq("teacher_id", teacherId)
                .eq("course_id", courseId)
                .gte("created_at", from)
                .lt("created_at", to)
                .maybeSingle()

            if (existing) setAlreadyDoneToday(true)
        }

        void checkExisting()
    }, [supabase, teacherId, courseId])

    const toggleTag = (tag: string) => {
        setSelectedTags((prev) =>
            prev.includes(tag)
                ? prev.filter((t) => t !== tag)
                : prev.length < 2
                    ? [...prev, tag]
                    : prev
        )
    }

    const handleSubmit = async () => {
        if (!energyLevel) {
            toast.error("Selecciona el nivel de energía de la clase.")
            return
        }

        try {
            setLoading(true)

            const { from, to } = getTodayRange()

            const { data: existing } = await supabase
                .from("teacher_logs")
                .select("id")
                .eq("teacher_id", teacherId)
                .eq("course_id", courseId)
                .gte("created_at", from)
                .lt("created_at", to)
                .maybeSingle()

            if (existing) {
                setAlreadyDoneToday(true)
                toast.info("Ya registraste el clima de este curso hoy.")
                return
            }

            const { error } = await supabase.from("teacher_logs").insert({
                institution_id: institutionId,
                teacher_id: teacherId,
                course_id: courseId,
                energy_level: energyLevel,
                tags: selectedTags,
                notes: notes.trim() || null,
                log_date: new Date().toISOString().split("T")[0],
            })

            if (error) {
                console.error(error)
                toast.error("No se pudo guardar el registro de clima.")
                return
            }

            toast.success("Clima de aula registrado.")
            setAlreadyDoneToday(true)
        } finally {
            setLoading(false)
        }
    }

    if (alreadyDoneToday) {
        return (
            <Card className="border-dashed border-emerald-300 bg-emerald-50/60">
                <CardHeader>
                    <CardTitle>Clima de hoy registrado</CardTitle>
                    <CardDescription>
                        Ya registraste el clima de este curso hoy. Mañana podrás hacerlo de nuevo.
                    </CardDescription>
                </CardHeader>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>¿Cómo estuvo la clase hoy?</CardTitle>
                <CardDescription>
                    Registro rápido del clima de aula. Solo toma 1 minuto.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

                {/* Paso 1: Termómetro de energía */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-900">
                        Paso 1 — Nivel de energía de la clase
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        {ENERGY_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => setEnergyLevel(opt.value)}
                                className={`rounded-lg border p-3 text-left transition-all ${energyLevel === opt.value
                                        ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500"
                                        : "border-slate-200 hover:border-slate-300"
                                    }`}
                            >
                                <div className="text-sm font-medium">{opt.label}</div>
                                <div className="text-xs text-slate-500">{opt.desc}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Paso 2: Etiquetas de conducta */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-900">
                        Paso 2 — Etiquetas de conducta{" "}
                        <span className="text-slate-400 font-normal">(máx. 2)</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {CONDUCT_TAGS.map((tag) => (
                            <button
                                key={tag}
                                type="button"
                                onClick={() => toggleTag(tag)}
                                className={`rounded-full border px-3 py-1 text-xs transition-all ${selectedTags.includes(tag)
                                        ? "border-indigo-500 bg-indigo-100 text-indigo-700"
                                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                                    }`}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Paso 3: Nota libre */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-900">
                        Paso 3 — Observación breve{" "}
                        <span className="text-slate-400 font-normal">(opcional)</span>
                    </label>
                    <Textarea
                        rows={3}
                        placeholder="Ej: El curso llegó muy activo después de educación física..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                </div>
            </CardContent>
            <CardFooter className="flex justify-end">
                <Button onClick={handleSubmit} disabled={loading || !energyLevel}>
                    {loading ? "Guardando..." : "Guardar clima"}
                </Button>
            </CardFooter>
        </Card>
    )
}
