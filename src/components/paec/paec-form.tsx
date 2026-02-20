"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
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

type Student = {
    id: string
    name: string
    last_name: string
    rut: string | null
    birthdate: string | null
    course_id: string | null
}

type Course = {
    id: string
    name: string
}

type Professional = {
    id: string
    name: string
    last_name: string
    role: string
}

type Props = {
    students: Student[]
    teachers?: any[] // legacy or unused?
    professionals: Professional[]
    courses: Course[]
    institutionId: string
}

export function PaecForm({ students, professionals, courses, institutionId }: Props) {
    const router = useRouter()
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)

    // ── Sección 1 ──
    const [studentId, setStudentId] = useState("")
    const [courseName, setCourseName] = useState<string | null>(null)

    // ── Sección 2 ──
    const [guardianName, setGuardianName] = useState("")
    const [guardianRelationship, setGuardianRelationship] = useState("")
    const [guardianPhone, setGuardianPhone] = useState("")
    const [guardianPhoneAlt, setGuardianPhoneAlt] = useState("")
    const [guardianBackup, setGuardianBackup] = useState("")
    const [dataCommitment, setDataCommitment] = useState(false)

    // ── Sección 3 ──
    const [professional1, setProfessional1] = useState("")
    const [professional2, setProfessional2] = useState("")
    const [professional3, setProfessional3] = useState("")

    // ── Sección 4 ──
    const [strengths, setStrengths] = useState("")
    const [supportRoutines, setSupportRoutines] = useState(false)
    const [supportAnticipation, setSupportAnticipation] = useState(false)
    const [supportVisual, setSupportVisual] = useState(false)
    const [supportCalm, setSupportCalm] = useState(false)
    const [supportBreaks, setSupportBreaks] = useState(false)
    const [keySupport, setKeySupport] = useState("")

    // ── Sección 5 ──
    const [triggerNoise, setTriggerNoise] = useState(false)
    const [triggerChanges, setTriggerChanges] = useState(false)
    const [triggerOrders, setTriggerOrders] = useState(false)
    const [triggerSocial, setTriggerSocial] = useState(false)
    const [triggerSensory, setTriggerSensory] = useState(false)
    const [triggerOther, setTriggerOther] = useState("")
    const [alertIrritability, setAlertIrritability] = useState(false)
    const [alertIsolation, setAlertIsolation] = useState(false)
    const [alertCrying, setAlertCrying] = useState(false)
    const [alertRestlessness, setAlertRestlessness] = useState(false)
    const [alertOther, setAlertOther] = useState("")

    // ── Sección 6 ──
    const [manifestCrying, setManifestCrying] = useState(false)
    const [manifestShouting, setManifestShouting] = useState(false)
    const [manifestOpposition, setManifestOpposition] = useState(false)
    const [manifestWithdrawal, setManifestWithdrawal] = useState(false)
    const [manifestAggression, setManifestAggression] = useState(false)
    const [manifestOther, setManifestOther] = useState("")
    const [strategyCalmSpace, setStrategyCalmSpace] = useState(false)
    const [strategyAccompaniment, setStrategyAccompaniment] = useState(false)
    const [strategyReduceStimuli, setStrategyReduceStimuli] = useState(false)
    const [strategyOther, setStrategyOther] = useState("")
    const [strategyAvoid, setStrategyAvoid] = useState("")

    // ── Sección 7 ──
    const [procedureNotes, setProcedureNotes] = useState("")

    // ── Sección 8 ──
    const [reviewDate, setReviewDate] = useState("")

    const calcularEdad = (fecha: string | null): number | null => {
        if (!fecha) return null
        const hoy = new Date()
        const nac = new Date(fecha)
        let edad = hoy.getFullYear() - nac.getFullYear()
        const mes = hoy.getMonth() - nac.getMonth()
        if (mes < 0 || (mes === 0 && hoy.getDate() < nac.getDate())) edad--
        return edad
    }

    const getCourseName = (courseId: string | null): string => {
        if (!courseId) return "N/A"
        return courses.find((c) => c.id === courseId)?.name ?? "N/A"
    }

    const handleStudentChange = async (id: string) => {
        setStudentId(id)
        setSelectedStudent(students.find((s) => s.id === id) ?? null)

        const { data } = await supabase
            .from("students")
            .select("courses!course_id(name)")
            .eq("id", id)
            .maybeSingle()

        setCourseName((data?.courses as any)?.name ?? null)
    }

    const handleSubmit = async () => {
        if (!studentId) {
            toast.error("Selecciona un estudiante.")
            return
        }
        try {
            setLoading(true)
            const { error } = await supabase.from("paec").insert({
                institution_id: institutionId,
                student_id: studentId,
                date_of_birth: selectedStudent?.birthdate,
                age: calcularEdad(selectedStudent?.birthdate ?? null),
                guardian_name: guardianName,
                guardian_relationship: guardianRelationship,
                guardian_phone: guardianPhone,
                guardian_phone_alt: guardianPhoneAlt,
                guardian_backup_name: guardianBackup,
                data_update_commitment: dataCommitment,
                professional_1_id: professional1 === "none" || !professional1 ? null : professional1,
                professional_2_id: professional2 === "none" || !professional2 ? null : professional2,
                professional_3_id: professional3 === "none" || !professional3 ? null : professional3,
                strengths,
                support_routines: supportRoutines,
                support_anticipation: supportAnticipation,
                support_visual_aids: supportVisual,
                support_calm_space: supportCalm,
                support_breaks: supportBreaks,
                key_support: keySupport,
                trigger_noise: triggerNoise,
                trigger_changes: triggerChanges,
                trigger_orders: triggerOrders,
                trigger_social: triggerSocial,
                trigger_sensory: triggerSensory,
                trigger_other: triggerOther,
                alert_irritability: alertIrritability,
                alert_isolation: alertIsolation,
                alert_crying: alertCrying,
                alert_restlessness: alertRestlessness,
                alert_other: alertOther,
                manifestation_crying: manifestCrying,
                manifestation_shouting: manifestShouting,
                manifestation_opposition: manifestOpposition,
                manifestation_withdrawal: manifestWithdrawal,
                manifestation_aggression: manifestAggression,
                manifestation_other: manifestOther,
                strategy_calm_space: strategyCalmSpace,
                strategy_accompaniment: strategyAccompaniment,
                strategy_reduce_stimuli: strategyReduceStimuli,
                strategy_other: strategyOther,
                strategies_to_avoid: strategyAvoid,
                procedure_notes: procedureNotes,
                review_date: reviewDate || null,
            })

            if (error) {
                console.error(error)
                toast.error("No se pudo guardar el PAEC.")
                return
            }
            toast.success("PAEC creado correctamente.")
            router.push("/paec")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">

            {/* SECCIÓN 1 */}
            <Card>
                <CardHeader>
                    <CardTitle>Sección 1 — Identificación del estudiante</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-900">
                            Estudiante <span className="text-red-500">*</span>
                        </label>
                        <Select onValueChange={handleStudentChange} value={studentId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Buscar estudiante..." />
                            </SelectTrigger>
                            <SelectContent position="popper" className="z-50 max-h-60 overflow-y-auto">
                                {students.map((s) => (
                                    <SelectItem key={s.id} value={s.id}>
                                        {s.last_name}, {s.name}
                                        {s.course_id ? ` — ${getCourseName(s.course_id)}` : ""}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedStudent && (
                        <div className="grid grid-cols-2 gap-4 rounded-lg bg-slate-50 p-3 text-sm">
                            <div>
                                <p className="text-xs text-slate-400">RUT</p>
                                <p className="font-medium">{selectedStudent.rut || "N/A"}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400">Fecha de nacimiento</p>
                                <p className="font-medium">
                                    {selectedStudent.birthdate
                                        ? new Date(selectedStudent.birthdate).toLocaleDateString("es-CL")
                                        : "N/A"}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400">Edad</p>
                                <p className="font-medium">
                                    {calcularEdad(selectedStudent.birthdate) ?? "N/A"} años
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400">Curso</p>
                                <p className="font-medium">{courseName ?? "N/A"}</p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* SECCIÓN 2 */}
            <Card>
                <CardHeader>
                    <CardTitle>Sección 2 — Información de apoderado/a</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            placeholder="Nombre apoderado"
                            value={guardianName}
                            onChange={(e) => setGuardianName(e.target.value)}
                        />
                        <Input
                            placeholder="Parentesco (Padre, Madre, Tutor…)"
                            value={guardianRelationship}
                            onChange={(e) => setGuardianRelationship(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            type="tel"
                            placeholder="Teléfono principal"
                            value={guardianPhone}
                            onChange={(e) => setGuardianPhone(e.target.value)}
                        />
                        <Input
                            type="tel"
                            placeholder="Teléfono alternativo"
                            value={guardianPhoneAlt}
                            onChange={(e) => setGuardianPhoneAlt(e.target.value)}
                        />
                    </div>
                    <Input
                        placeholder="Apoderado suplente (nombre)"
                        value={guardianBackup}
                        onChange={(e) => setGuardianBackup(e.target.value)}
                    />
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={dataCommitment}
                            onChange={(e) => setDataCommitment(e.target.checked)}
                            className="h-4 w-4"
                        />
                        <span className="text-sm text-slate-700">
                            Compromiso de actualización de datos
                        </span>
                    </label>
                </CardContent>
            </Card>

            {/* SECCIÓN 3 */}
            <Card>
                <CardHeader>
                    <CardTitle>Sección 3 — Equipo de apoyo responsable</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {[
                        { label: "Profesional 1", value: professional1, onChange: setProfessional1 },
                        { label: "Profesional 2", value: professional2, onChange: setProfessional2 },
                        { label: "Profesional 3", value: professional3, onChange: setProfessional3 },
                    ].map((prof) => (
                        <div key={prof.label}>
                            <label className="text-sm font-medium text-slate-900">{prof.label}</label>
                            <Select onValueChange={prof.onChange} value={prof.value}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar profesional (opcional)" />
                                </SelectTrigger>
                                <SelectContent position="popper" className="z-50 max-h-48 overflow-y-auto">
                                    <SelectItem value="none">Sin asignar</SelectItem>
                                    {professionals.map((p) => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.name} {p.last_name} — {p.role}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* SECCIÓN 4 */}
            <Card>
                <CardHeader>
                    <CardTitle>Sección 4 — Eje Preventivo: Apoyos y bienestar</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-slate-900">
                            Fortalezas e intereses
                        </label>
                        <Textarea
                            rows={3}
                            placeholder="Describe las fortalezas e intereses del estudiante..."
                            value={strengths}
                            onChange={(e) => setStrengths(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-900 block mb-2">
                            Apoyos habituales
                        </label>
                        <div className="space-y-2">
                            {[
                                { label: "Rutinas", value: supportRoutines, onChange: setSupportRoutines },
                                { label: "Anticipación", value: supportAnticipation, onChange: setSupportAnticipation },
                                { label: "Apoyos visuales", value: supportVisual, onChange: setSupportVisual },
                                { label: "Espacio de calma", value: supportCalm, onChange: setSupportCalm },
                                { label: "Pausas", value: supportBreaks, onChange: setSupportBreaks },
                            ].map((item) => (
                                <label key={item.label} className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={item.value}
                                        onChange={(e) => item.onChange(e.target.checked)}
                                        className="h-4 w-4"
                                    />
                                    <span className="text-sm text-slate-700">{item.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-900">
                            Apoyo clave acordado
                        </label>
                        <Input
                            placeholder="Describe el apoyo clave..."
                            value={keySupport}
                            onChange={(e) => setKeySupport(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* SECCIÓN 5 */}
            <Card>
                <CardHeader>
                    <CardTitle>Sección 5 — Gatillantes y señales tempranas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div>
                        <label className="text-sm font-medium text-slate-900 block mb-2">
                            Gatillantes
                        </label>
                        <div className="space-y-2">
                            {[
                                { label: "Ruido", value: triggerNoise, onChange: setTriggerNoise },
                                { label: "Cambios", value: triggerChanges, onChange: setTriggerChanges },
                                { label: "Órdenes", value: triggerOrders, onChange: setTriggerOrders },
                                { label: "Sociales", value: triggerSocial, onChange: setTriggerSocial },
                                { label: "Sensoriales", value: triggerSensory, onChange: setTriggerSensory },
                            ].map((item) => (
                                <label key={item.label} className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={item.value}
                                        onChange={(e) => item.onChange(e.target.checked)}
                                        className="h-4 w-4"
                                    />
                                    <span className="text-sm text-slate-700">{item.label}</span>
                                </label>
                            ))}
                        </div>
                        <Input
                            className="mt-2"
                            placeholder="Otro gatillante..."
                            value={triggerOther}
                            onChange={(e) => setTriggerOther(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-slate-900 block mb-2">
                            Señales de alerta
                        </label>
                        <div className="space-y-2">
                            {[
                                { label: "Irritabilidad", value: alertIrritability, onChange: setAlertIrritability },
                                { label: "Aislamiento", value: alertIsolation, onChange: setAlertIsolation },
                                { label: "Llanto", value: alertCrying, onChange: setAlertCrying },
                                { label: "Inquietud", value: alertRestlessness, onChange: setAlertRestlessness },
                            ].map((item) => (
                                <label key={item.label} className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={item.value}
                                        onChange={(e) => item.onChange(e.target.checked)}
                                        className="h-4 w-4"
                                    />
                                    <span className="text-sm text-slate-700">{item.label}</span>
                                </label>
                            ))}
                        </div>
                        <Input
                            className="mt-2"
                            placeholder="Otra señal de alerta..."
                            value={alertOther}
                            onChange={(e) => setAlertOther(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* SECCIÓN 6 */}
            <Card>
                <CardHeader>
                    <CardTitle>Sección 6 — Eje Reactivo: Respuesta</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div>
                        <label className="text-sm font-medium text-slate-900 block mb-2">
                            Manifestación del malestar
                        </label>
                        <div className="space-y-2">
                            {[
                                { label: "Llanto", value: manifestCrying, onChange: setManifestCrying },
                                { label: "Gritos", value: manifestShouting, onChange: setManifestShouting },
                                { label: "Oposición", value: manifestOpposition, onChange: setManifestOpposition },
                                { label: "Retraimiento", value: manifestWithdrawal, onChange: setManifestWithdrawal },
                                { label: "Agresión", value: manifestAggression, onChange: setManifestAggression },
                            ].map((item) => (
                                <label key={item.label} className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={item.value}
                                        onChange={(e) => item.onChange(e.target.checked)}
                                        className="h-4 w-4"
                                    />
                                    <span className="text-sm text-slate-700">{item.label}</span>
                                </label>
                            ))}
                        </div>
                        <Input
                            className="mt-2"
                            placeholder="Otra manifestación..."
                            value={manifestOther}
                            onChange={(e) => setManifestOther(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-slate-900 block mb-2">
                            Estrategias que ayudan
                        </label>
                        <div className="space-y-2">
                            {[
                                { label: "Espacio de calma", value: strategyCalmSpace, onChange: setStrategyCalmSpace },
                                { label: "Acompañamiento", value: strategyAccompaniment, onChange: setStrategyAccompaniment },
                                { label: "Disminuir estímulos", value: strategyReduceStimuli, onChange: setStrategyReduceStimuli },
                            ].map((item) => (
                                <label key={item.label} className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={item.value}
                                        onChange={(e) => item.onChange(e.target.checked)}
                                        className="h-4 w-4"
                                    />
                                    <span className="text-sm text-slate-700">{item.label}</span>
                                </label>
                            ))}
                        </div>
                        <Input
                            className="mt-2"
                            placeholder="Otra estrategia..."
                            value={strategyOther}
                            onChange={(e) => setStrategyOther(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-slate-900">
                            Estrategias a evitar
                        </label>
                        <Textarea
                            rows={2}
                            placeholder="Describe qué NO hacer durante un episodio..."
                            value={strategyAvoid}
                            onChange={(e) => setStrategyAvoid(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* SECCIÓN 7 */}
            <Card>
                <CardHeader>
                    <CardTitle>Sección 7 — Procedimiento ante episodio</CardTitle>
                    <CardDescription>
                        Pasos base: (1) Contener y reducir estímulos · (2) Acompañar con adulto de referencia ·
                        (3) Facilitar regulación · (4) Registrar y comunicar
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Textarea
                        rows={3}
                        placeholder="Notas adicionales o ajustes específicos para este estudiante..."
                        value={procedureNotes}
                        onChange={(e) => setProcedureNotes(e.target.value)}
                    />
                </CardContent>
            </Card>

            {/* SECCIÓN 8 */}
            <Card>
                <CardHeader>
                    <CardTitle>Sección 8 — Seguimiento</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-900">
                            Fecha de revisión
                        </label>
                        <Input
                            type="date"
                            value={reviewDate}
                            onChange={(e) => setReviewDate(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* ACCIONES */}
            <div className="flex justify-end gap-3 pb-8">
                <Button
                    variant="outline"
                    onClick={() => router.push("/paec")}
                    disabled={loading}
                >
                    Cancelar
                </Button>
                <Button onClick={handleSubmit} disabled={loading}>
                    {loading ? "Guardando..." : "Crear PAEC"}
                </Button>
            </div>

        </div>
    )
}
