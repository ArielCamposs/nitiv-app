"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Zap } from "lucide-react"

const CLIMATE_OPTIONS = [
    { value: "regulada", label: "Regulada", emoji: "🟢", desc: "Ruido normal, calma general" },
    { value: "inquieta", label: "Inquieta", emoji: "🟡", desc: "Mucho ruido, distracciones" },
    { value: "apatica", label: "Apática", emoji: "🔵", desc: "Silencio excesivo, desánimo" },
    { value: "explosiva", label: "Explosiva", emoji: "🔴", desc: "Gritos, conflictos, descontrol" },
]

const CONDUCT_TAGS = [
    "Trabajadores / Enfocados",
    "Participativos",
    "Desafiantes / Discutidores",
    "Agotados / Sin energía",
    "Colaborativos",
]

interface Props {
    teacherId: string
    courseId: string
    institutionId: string
    pulseSessionId: string
    courseName: string
    onDone?: () => void
}

export function PulseTeacherRegister({
    teacherId, courseId, institutionId,
    pulseSessionId, courseName, onDone
}: Props) {
    const supabase = createClient()
    const router = useRouter()
    const [climate, setClimate] = useState<string | null>(null)
    const [tags, setTags] = useState<string[]>([])
    const [observation, setObservation] = useState("")
    const [loading, setLoading] = useState(false)

    const toggleTag = (tag: string) =>
        setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])

    const handleSubmit = async () => {
        if (!climate) {
            toast.warning("Selecciona el clima de la clase.")
            return
        }
        setLoading(true)
        try {
            const { error } = await supabase.from("pulse_teacher_entries").insert({
                pulse_session_id: pulseSessionId,
                teacher_id: teacherId,
                course_id: courseId,
                institution_id: institutionId,
                climate,
                conduct_tags: tags,
                observation: observation.trim() || null,
            })

            if (error) {
                if (error.code === "23505") {
                    toast.info("Ya registraste el pulso para este curso esta semana.")
                    router.refresh()
                    onDone?.()
                    return
                }
                throw error
            }

            toast.success(`Pulso de ${courseName} registrado.`)
            router.refresh()
            onDone?.()
        } catch (e) {
            console.error(e)
            toast.error("No se pudo guardar el registro de pulso.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-4 pt-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 uppercase tracking-wide">
                <Zap className="w-3.5 h-3.5" />
                Registro Modo Pulso
            </div>

            <div className="space-y-2">
                <p className="text-sm font-medium text-slate-800">¿Cómo estuvo el clima de esta clase?</p>
                <div className="grid grid-cols-2 gap-2">
                    {CLIMATE_OPTIONS.map(opt => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => setClimate(opt.value)}
                            className={cn(
                                "flex flex-col items-start rounded-xl border-2 p-3 text-left transition-all",
                                climate === opt.value
                                    ? "border-indigo-400 bg-indigo-50"
                                    : "border-slate-200 bg-white hover:border-slate-300"
                            )}
                        >
                            <span className="text-lg">{opt.emoji}</span>
                            <span className="text-sm font-medium text-slate-800 mt-1">{opt.label}</span>
                            <span className="text-xs text-slate-500">{opt.desc}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-2">
                <p className="text-sm font-medium text-slate-800">
                    Etiquetas del grupo <span className="text-slate-400 font-normal">(opcional)</span>
                </p>
                <div className="flex flex-wrap gap-2">
                    {CONDUCT_TAGS.map(tag => (
                        <button
                            key={tag}
                            type="button"
                            onClick={() => toggleTag(tag)}
                            className={cn(
                                "rounded-full border px-3 py-1 text-xs font-medium transition-all",
                                tags.includes(tag)
                                    ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                            )}
                        >
                            {tag}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-1">
                <p className="text-sm font-medium text-slate-800">
                    Observación <span className="text-slate-400 font-normal">(opcional)</span>
                </p>
                <textarea
                    value={observation}
                    onChange={e => setObservation(e.target.value)}
                    maxLength={300}
                    rows={2}
                    placeholder="Algo relevante que quieras agregar..."
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                />
            </div>

            <div className="flex justify-end">
                <Button
                    onClick={handleSubmit}
                    disabled={loading || !climate}
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700"
                >
                    {loading ? "Guardando..." : "Registrar pulso"}
                </Button>
            </div>
        </div>
    )
}
