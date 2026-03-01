"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { logAdminAction } from "@/lib/admin/log-action"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Select, SelectContent, SelectItem,
    SelectTrigger, SelectValue,
} from "@/components/ui/select"

// Thin label wrapper — @/components/ui/label not available in this project
const Label = ({ children, htmlFor, className = "" }: { children: React.ReactNode; htmlFor?: string; className?: string }) => (
    <label htmlFor={htmlFor} className={`text-sm font-medium text-slate-700 ${className}`}>{children}</label>
)

type Incident = {
    id: string
    folio: string
    type: string
    severity: string
    location: string | null
    context: string | null
    conduct_types: string[] | null
    triggers: string[] | null
    actions_taken: string[] | null
    description: string | null
    guardian_contacted: boolean
    incident_date: string
    end_date?: string | null
}

const TYPE_OPTIONS = [
    { value: "DEC", label: "Desregulación Emocional y Conductual" },
    { value: "agresion_fisica", label: "Agresión Física" },
    { value: "agresion_verbal", label: "Agresión Verbal" },
    { value: "bullying", label: "Bullying" },
    { value: "acoso", label: "Acoso" },
    { value: "consumo", label: "Consumo" },
    { value: "autoagresion", label: "Autoagresión" },
    { value: "otro", label: "Otro" },
]

export function DecEditForm({ incident }: { incident: Incident }) {
    const router = useRouter()
    const supabase = createClient()
    const [saving, setSaving] = useState(false)

    const [form, setForm] = useState({
        type: incident.type,
        severity: incident.severity,
        location: incident.location ?? "",
        context: incident.context ?? "",
        description: incident.description ?? "",
        guardian_contacted: incident.guardian_contacted,
        incident_date: incident.incident_date?.slice(0, 16) ?? "",
        end_date: incident.end_date?.slice(0, 16) ?? "",
        conduct_types: (incident.conduct_types ?? []).join(", "),
        triggers: (incident.triggers ?? []).join(", "),
        actions_taken: (incident.actions_taken ?? []).join(", "),
    })

    const set = (key: string, value: string | boolean) =>
        setForm((prev) => ({ ...prev, [key]: value }))

    const handleSave = async () => {
        setSaving(true)
        const toArray = (s: string) =>
            s.split(",").map((x) => x.trim()).filter(Boolean)

        const { error } = await supabase
            .from("incidents")
            .update({
                type: form.type,
                severity: form.severity,
                location: form.location || null,
                context: form.context || null,
                description: form.description || null,
                guardian_contacted: form.guardian_contacted,
                incident_date: form.incident_date,
                end_date: form.end_date || null,
                conduct_types: toArray(form.conduct_types),
                triggers: toArray(form.triggers),
                actions_taken: toArray(form.actions_taken),
            })
            .eq("id", incident.id)

        if (error) {
            toast.error("Error al guardar los cambios.")
            console.error(error)
        } else {
            await logAdminAction({
                action: "edit_incident",
                entityType: "incident",
                entityId: incident.id,
                entityDescription: incident.folio ?? incident.id,
                beforeData: {
                    type: incident.type,
                    severity: incident.severity,
                    location: incident.location,
                    context: incident.context,
                    description: incident.description,
                    guardian_contacted: incident.guardian_contacted,
                    incident_date: incident.incident_date,
                    end_date: incident.end_date,
                    conduct_types: incident.conduct_types,
                    triggers: incident.triggers,
                    actions_taken: incident.actions_taken,
                },
                afterData: {
                    type: form.type,
                    severity: form.severity,
                    location: form.location || null,
                    context: form.context || null,
                    description: form.description || null,
                    guardian_contacted: form.guardian_contacted,
                    incident_date: form.incident_date,
                    end_date: form.end_date || null,
                    conduct_types: toArray(form.conduct_types),
                    triggers: toArray(form.triggers),
                    actions_taken: toArray(form.actions_taken),
                },
            })
            toast.success("Caso actualizado correctamente.")
            router.push(`/dec/${incident.id}`)
            router.refresh()
        }
        setSaving(false)
    }

    return (
        <div className="space-y-5">
            {/* Datos básicos */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm uppercase tracking-wide text-slate-500">
                        Datos del incidente
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label>Tipo de incidente</Label>
                            <Select value={form.type} onValueChange={(v) => set("type", v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {TYPE_OPTIONS.map((o) => (
                                        <SelectItem key={o.value} value={o.value}>
                                            {o.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label>Severidad</Label>
                            <Select value={form.severity} onValueChange={(v) => set("severity", v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="moderada">Etapa 2 — Moderada</SelectItem>
                                    <SelectItem value="severa">Etapa 3 — Severa</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label>Lugar</Label>
                            <Input
                                value={form.location}
                                onChange={(e) => set("location", e.target.value)}
                                placeholder="Ej: Patio, Sala de clases..."
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label>Hora de inicio</Label>
                            <Input
                                type="datetime-local"
                                value={form.incident_date}
                                onChange={(e) => set("incident_date", e.target.value)}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label>Hora de término</Label>
                            <Input
                                type="datetime-local"
                                value={form.end_date}
                                onChange={(e) => set("end_date", e.target.value)}
                            />
                        </div>

                        <div className="space-y-1.5 col-span-2">
                            <Label>Actividad en curso</Label>
                            <Input
                                value={form.context}
                                onChange={(e) => set("context", e.target.value)}
                                placeholder="Ej: Recreo, Clase de matemáticas..."
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="guardian"
                            checked={form.guardian_contacted}
                            onChange={(e) => set("guardian_contacted", e.target.checked)}
                            className="rounded"
                        />
                        <Label htmlFor="guardian" className="cursor-pointer">
                            Apoderado contactado
                        </Label>
                    </div>
                </CardContent>
            </Card>

            {/* Arrays */}
            {[
                { key: "conduct_types", label: "Conductas observadas" },
                { key: "triggers", label: "Situaciones desencadenantes" },
                { key: "actions_taken", label: "Acciones realizadas" },
            ].map(({ key, label }) => (
                <Card key={key}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm uppercase tracking-wide text-slate-500">
                            {label}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Input
                            value={form[key as keyof typeof form] as string}
                            onChange={(e) => set(key, e.target.value)}
                            placeholder="Separadas por coma: valor1, valor2, valor3"
                        />
                        <p className="text-[11px] text-slate-400 mt-1">
                            Separa cada elemento con una coma
                        </p>
                    </CardContent>
                </Card>
            ))}

            {/* Observaciones */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm uppercase tracking-wide text-slate-500">
                        Observaciones adicionales
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Textarea
                        rows={4}
                        value={form.description}
                        onChange={(e) => set("description", e.target.value)}
                        placeholder="Observaciones del caso..."
                    />
                </CardContent>
            </Card>

            {/* Acciones */}
            <div className="flex justify-end gap-3">
                <Button
                    variant="outline"
                    onClick={() => router.push(`/dec/${incident.id}`)}
                    disabled={saving}
                >
                    Cancelar
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                    {saving ? "Guardando..." : "Guardar cambios"}
                </Button>
            </div>
        </div>
    )
}
