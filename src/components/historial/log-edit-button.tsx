"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { logAdminAction } from "@/lib/admin/log-action"
import { Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
    Dialog, DialogContent, DialogHeader,
    DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select, SelectContent, SelectItem,
    SelectTrigger, SelectValue,
} from "@/components/ui/select"

// Thin label wrapper — @/components/ui/label not available in this project
const Label = ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor} className="text-sm font-medium text-slate-700">{children}</label>
)

type Log = {
    id: string
    emotion: string
    intensity: number
    reflection: string | null
    type: string
}

const EMOTION_OPTIONS = [
    { value: "muy_bien", label: "😄 Muy bien" },
    { value: "bien", label: "🙂 Bien" },
    { value: "neutral", label: "😐 Neutral" },
    { value: "mal", label: "😔 Mal" },
    { value: "muy_mal", label: "😢 Muy mal" },
]

export function LogEditButton({ log }: { log: Log }) {
    const router = useRouter()
    const supabase = createClient()
    const [open, setOpen] = useState(false)
    const [saving, setSaving] = useState(false)

    const [form, setForm] = useState({
        emotion: log.emotion,
        intensity: log.intensity ?? 3,
        reflection: log.reflection ?? "",
        type: log.type,
    })

    const set = (key: string, value: string | number) =>
        setForm((prev) => ({ ...prev, [key]: value }))

    const handleSave = async () => {
        setSaving(true)
        const { error } = await supabase
            .from("emotional_logs")
            .update({
                emotion: form.emotion,
                intensity: form.intensity,
                reflection: form.reflection || null,
                type: form.type,
            })
            .eq("id", log.id)

        if (error) {
            toast.error("Error al guardar los cambios.")
            console.error(error)
        } else {
            await logAdminAction({
                action: "edit_emotional_log",
                entityType: "emotional_log",
                entityId: log.id,
                entityDescription: `Registro ${log.id.slice(0, 8)}`,
                beforeData: {
                    emotion: log.emotion,
                    intensity: log.intensity,
                    reflection: log.reflection,
                    type: log.type,
                },
                afterData: {
                    emotion: form.emotion,
                    intensity: form.intensity,
                    reflection: form.reflection || null,
                    type: form.type,
                },
            })
            toast.success("Registro actualizado correctamente.")
            setOpen(false)
            router.refresh()
        }
        setSaving(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <button className="text-slate-400 hover:text-indigo-600 transition-colors p-1 rounded hover:bg-indigo-50">
                    <Pencil className="h-3.5 w-3.5" />
                </button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Editar registro emocional</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 pt-2">
                    {/* Emoción */}
                    <div className="space-y-1.5">
                        <Label>Emoción</Label>
                        <Select value={form.emotion} onValueChange={(v) => set("emotion", v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {EMOTION_OPTIONS.map((o) => (
                                    <SelectItem key={o.value} value={o.value}>
                                        {o.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Tipo */}
                    <div className="space-y-1.5">
                        <Label>Tipo de registro</Label>
                        <Select value={form.type} onValueChange={(v) => set("type", v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="daily">Diario</SelectItem>
                                <SelectItem value="weekly">Semanal</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Intensidad */}
                    <div className="space-y-1.5">
                        <Label>Intensidad: {form.intensity}/5</Label>
                        <input
                            type="range"
                            min={1}
                            max={5}
                            step={1}
                            value={form.intensity}
                            onChange={(e) => set("intensity", Number(e.target.value))}
                            className="w-full accent-indigo-600"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400 px-0.5">
                            <span>Muy baja</span>
                            <span>Muy alta</span>
                        </div>
                    </div>

                    {/* Reflexión */}
                    <div className="space-y-1.5">
                        <Label>Reflexión</Label>
                        <Textarea
                            rows={3}
                            value={form.reflection}
                            onChange={(e) => set("reflection", e.target.value)}
                            placeholder="Reflexión del estudiante..."
                        />
                    </div>

                    {/* Acciones */}
                    <div className="flex justify-end gap-2 pt-1">
                        <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? "Guardando..." : "Guardar cambios"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
