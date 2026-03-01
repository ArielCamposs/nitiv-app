"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { createNotifications, getUserIdsByRoles } from "@/lib/notifications"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

// Datos del formulario
const LOCATIONS = ["Sala de clases", "Patio", "Comedor", "Baño", "Pasillo", "Entrada", "Otro"]
const CONDUCT_TYPES = [
    "Agresión verbal",
    "Agresión física hacia objetos",
    "Agresión física hacia personas",
    "Autoagresión",
    "Conducta disruptiva",
    "Llanto intenso",
    "Aislamiento",
    "Huida / Escape",
    "Rigidez corporal",
    "Otro",
]
const TRIGGERS = [
    "Cambio de rutina",
    "Ruido excesivo",
    "Demanda académica",
    "Conflicto con pares",
    "Transición de actividad",
    "Frustración",
    "Sobrecarga sensorial",
    "Ansiedad anticipada",
    "Factor no identificado",
    "Otro",
]
const ACTIONS = [
    "Contención verbal",
    "Acompañamiento emocional",
    "Retiro del espacio",
    "Espacio de calma",
    "Contacto con apoderado",
    "Derivación a Dupla Psicosocial",
    "Primeros auxilios",
    "Llamada a emergencias",
    "Otro",
]

// ... imports

// ... constants

type Props = {
    students: { id: string; name: string; last_name: string; courses: any }[]
    notifiables: { id: string; name: string; last_name: string; role: string }[]
    teacherId: string
    institutionId: string
}

export function DecForm({ students, notifiables = [], teacherId, institutionId }: Props) {
    const router = useRouter()
    const supabase = createClient()

    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)

    // Sección 1: Identificación
    const [studentId, setStudentId] = useState("")
    const [location, setLocation] = useState("")
    const [incidentDate, setIncidentDate] = useState(
        new Date().toISOString().slice(0, 16)
    )
    const [incidentEndDate, setIncidentEndDate] = useState("")
    const [activity, setActivity] = useState("")
    const [guardianContacted, setGuardianContacted] = useState(false)

    // Sección 2: Tipificación
    const [conductTypes, setConductTypes] = useState<string[]>([])
    const [severity, setSeverity] = useState<"moderada" | "severa" | "">("")

    // Sección 3: Análisis funcional
    const [triggers, setTriggers] = useState<string[]>([])

    // Sección 4: Cierre
    const [actions, setActions] = useState<string[]>([])
    const [description, setDescription] = useState("")

    // Sección 5: Destinatarios
    const [recipients, setRecipients] = useState<string[]>([])

    // (El usuario elige libremente a quién notificar sin pre-marcar por severidad)

    const toggleItem = (
        list: string[],
        setList: (v: string[]) => void,
        item: string
    ) => {
        setList(
            list.includes(item) ? list.filter((i) => i !== item) : [...list, item]
        )
    }

    const handleSubmit = async () => {
        if (!studentId || !severity || !location) {
            toast.error("Completa los campos obligatorios: Estudiante, Lugar y Severidad.")
            return
        }

        try {
            setLoading(true)

            // 1) Crear el incidente
            const { data: incident, error } = await supabase
                .from("incidents")
                .insert({
                    institution_id: institutionId,
                    student_id: studentId,
                    reporter_id: teacherId,
                    type: "DEC",
                    severity,
                    location,
                    context: activity,
                    conduct_types: conductTypes,
                    triggers,
                    actions_taken: actions,
                    description: description.trim() || null,
                    guardian_contacted: guardianContacted,
                    incident_date: new Date(incidentDate).toISOString(),
                    end_date: incidentEndDate ? new Date(incidentEndDate).toISOString() : null,
                    resolved: false,
                })
                .select("id")
                .single()

            if (error || !incident) {
                console.error(error)
                toast.error("No se pudo guardar el caso DEC.")
                return
            }

            // 2) Insertar destinatarios
            if (recipients.length > 0) {
                const recipientRows = recipients.map((recipientId) => {
                    const user = notifiables.find((u) => u.id === recipientId)
                    return {
                        incident_id: incident.id,
                        recipient_id: recipientId,
                        role: user?.role ?? "unknown",
                        seen: false,
                    }
                })

                const { error: recipientsError } = await supabase
                    .from("incident_recipients")
                    .insert(recipientRows)

                if (recipientsError) {
                    console.error(recipientsError)
                    // No bloquear el flujo, el DEC ya fue guardado
                } else {
                    // Notificar a directivos en bulk
                    const student = students.find((s) => s.id === studentId)
                    const studentName = student ? `${student.name} ${student.last_name}` : "Estudiante"
                    const course = student?.courses?.name ?? "Sin curso"

                    const { data: reporterObj } = await supabase
                        .from("users")
                        .select("name, last_name")
                        .eq("id", teacherId)
                        .single()
                    const reporterName = reporterObj ? `${reporterObj.name} ${reporterObj.last_name}` : "Docente"

                    // Notificar SOLO a los seleccionados manualmente
                    const finalRecipients = recipients
                    await createNotifications({
                        institutionId,
                        recipientIds: finalRecipients,
                        type: "dec_nuevo",
                        title: "Nuevo caso DEC",
                        message: `${studentName} · ${course} — reportado por ${reporterName}`,
                        relatedId: incident.id,
                        relatedUrl: `/dec/${incident.id}`,
                    })
                }
            }

            toast.success("Caso DEC reportado. Los notificados recibirán la alerta.")
            router.push("/dec")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">

            {/* Indicador de pasos */}
            <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                    <div
                        key={s}
                        className={`h-1.5 flex-1 rounded-full transition-all ${s <= step ? "bg-indigo-500" : "bg-slate-200"
                            }`}
                    />
                ))}
            </div>

            {/* SECCIÓN 1: Identificación y contexto */}
            {step === 1 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Sección 1 — Identificación y contexto</CardTitle>
                        <CardDescription>
                            ¿Quién, cuándo y dónde ocurrió?
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-900">
                                Estudiante <span className="text-red-500">*</span>
                            </label>
                            <Select onValueChange={setStudentId} value={studentId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Buscar estudiante..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {students.map((s) => (
                                        <SelectItem key={s.id} value={s.id}>
                                            {s.last_name}, {s.name}{" "}
                                            {s.courses?.name ? `— ${s.courses.name}` : ""}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-900">
                                    Hora de inicio <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="datetime-local"
                                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                                    value={incidentDate}
                                    onChange={(e) => setIncidentDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-900">
                                    Hora de término <span className="text-slate-400 font-normal">(opcional)</span>
                                </label>
                                <input
                                    type="datetime-local"
                                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                                    value={incidentEndDate}
                                    onChange={(e) => setIncidentEndDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-900">
                                Lugar <span className="text-red-500">*</span>
                            </label>
                            <Select onValueChange={setLocation} value={location}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona el lugar" />
                                </SelectTrigger>
                                <SelectContent>
                                    {LOCATIONS.map((l) => (
                                        <SelectItem key={l} value={l}>{l}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-900">
                                Actividad en curso
                            </label>
                            <input
                                type="text"
                                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                                placeholder="Ej: Clases, recreo, almuerzo..."
                                value={activity}
                                onChange={(e) => setActivity(e.target.value)}
                            />
                        </div>

                        {/* Use simple HTML input for checkbox for now to avoid styling complexity */}
                        <div className="flex items-center gap-2 mt-4">
                            <input
                                type="checkbox"
                                id="guardian"
                                checked={guardianContacted}
                                onChange={(e) => setGuardianContacted(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <label htmlFor="guardian" className="text-sm text-slate-700">
                                Apoderado contactado
                            </label>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* SECCIÓN 2: Tipificación */}
            {step === 2 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Sección 2 — Tipificación del incidente</CardTitle>
                        <CardDescription>
                            ¿Qué conductas se observaron y cuál fue la intensidad?
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-900">
                                Tipos de conducta observada{" "}
                                <span className="text-slate-400 font-normal">(selecciona todos los que apliquen)</span>
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {CONDUCT_TYPES.map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => toggleItem(conductTypes, setConductTypes, c)}
                                        className={`rounded-full border px-3 py-1 text-xs transition-all ${conductTypes.includes(c)
                                            ? "border-indigo-500 bg-indigo-100 text-indigo-700"
                                            : "border-slate-200 text-slate-600 hover:border-slate-300"
                                            }`}
                                    >
                                        {c}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-900">
                                Nivel de intensidad <span className="text-red-500">*</span>
                            </label>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <button
                                    type="button"
                                    onClick={() => setSeverity("moderada")}
                                    className={`rounded-lg border p-4 text-left transition-all ${severity === "moderada"
                                        ? "border-amber-500 bg-amber-50 ring-1 ring-amber-500"
                                        : "border-slate-200 hover:border-slate-300"
                                        }`}
                                >
                                    <p className="text-sm font-semibold text-amber-700">
                                        🟡 Etapa 2 — Moderada
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">
                                        Conducta disruptiva que requiere intervención pero no representa riesgo inmediato.
                                    </p>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setSeverity("severa")}
                                    className={`rounded-lg border p-4 text-left transition-all ${severity === "severa"
                                        ? "border-rose-500 bg-rose-50 ring-1 ring-rose-500"
                                        : "border-slate-200 hover:border-slate-300"
                                        }`}
                                >
                                    <p className="text-sm font-semibold text-rose-700">
                                        🔴 Etapa 3 — Severa
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">
                                        Riesgo para sí mismo o para otros. Requiere intervención inmediata.
                                    </p>
                                </button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* SECCIÓN 3: Análisis funcional — desencadenantes */}
            {step === 3 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Sección 3 — Análisis funcional</CardTitle>
                        <CardDescription>
                            ¿Qué situaciones pudieron desencadenar la desregulación?
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {TRIGGERS.map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => toggleItem(triggers, setTriggers, t)}
                                    className={`rounded-full border px-3 py-1 text-xs transition-all ${triggers.includes(t)
                                        ? "border-indigo-500 bg-indigo-100 text-indigo-700"
                                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                                        }`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* SECCIÓN 4: Gestión y cierre */}
            {step === 4 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Sección 4 — Gestión y cierre</CardTitle>
                        <CardDescription>
                            ¿Qué acciones se tomaron durante y después del incidente?
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-900">
                                Acciones realizadas
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {ACTIONS.map((a) => (
                                    <button
                                        key={a}
                                        type="button"
                                        onClick={() => toggleItem(actions, setActions, a)}
                                        className={`rounded-full border px-3 py-1 text-xs transition-all ${actions.includes(a)
                                            ? "border-indigo-500 bg-indigo-100 text-indigo-700"
                                            : "border-slate-200 text-slate-600 hover:border-slate-300"
                                            }`}
                                    >
                                        {a}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-900">
                                Observaciones adicionales{" "}
                                <span className="text-slate-400 font-normal">(opcional)</span>
                            </label>
                            <Textarea
                                rows={4}
                                placeholder="Describe en detalle lo que ocurrió, contexto adicional..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* SECCIÓN 5: Destinatarios */}
            {step === 5 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Sección 5 — Notificaciones</CardTitle>
                        <CardDescription>
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {notifiables.length === 0 ? (
                            <p className="text-sm text-slate-400">
                                No hay otros usuarios disponibles para notificar en esta institución.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {notifiables.map((u) => {
                                    return (
                                        <label
                                            key={u.id}
                                            className={`flex items-center justify-between rounded-lg border px-3 py-2 cursor-pointer transition-all ${recipients.includes(u.id)
                                                ? "border-indigo-400 bg-indigo-50"
                                                : "border-slate-200 hover:border-slate-300"
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={recipients.includes(u.id)}
                                                    onChange={() => {
                                                        setRecipients((prev) =>
                                                            prev.includes(u.id)
                                                                ? prev.filter((id) => id !== u.id)
                                                                : [...prev, u.id]
                                                        )
                                                    }}
                                                    className="h-4 w-4"
                                                />
                                                <div>
                                                    <p className="text-sm font-medium text-slate-900">
                                                        {u.name} {u.last_name}
                                                    </p>
                                                    <p className="text-xs capitalize text-slate-400">
                                                        {u.role}
                                                    </p>
                                                </div>
                                            </div>
                                        </label>
                                    )
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Navegación entre pasos */}
            <div className="flex justify-between gap-3">
                {step > 1 && (
                    <Button
                        variant="outline"
                        onClick={() => setStep((s) => s - 1)}
                    >
                        ← Anterior
                    </Button>
                )}
                <div className="flex-1" />
                {step < 5 ? (
                    <Button onClick={() => setStep((s) => s + 1)}>
                        Siguiente →
                    </Button>
                ) : (
                    <Button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="bg-rose-600 hover:bg-rose-700"
                    >
                        {loading ? "Guardando..." : "Reportar DEC"}
                    </Button>
                )}
            </div>
        </div>
    )
}
