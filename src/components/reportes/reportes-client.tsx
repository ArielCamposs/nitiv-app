"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion"
import {
    FileText, FileSpreadsheet, Download, BarChart3,
    Thermometer, GitMerge, AlertTriangle, TrendingUp,
    TrendingDown, Users, Zap,
} from "lucide-react"
import {
    generateStudentPDF, generateClimatePDF, generateInstitutionalPDF,
} from "@/lib/reports/generate-pdf"
import {
    generateEmotionsExcel, generateIncidentsExcel, generateAlertsExcel,
} from "@/lib/reports/generate-excel"
import { cn } from "@/lib/utils"

// ─── Roles con acceso amplio ──────────────────────────────────────────────────
const STAFF_ROLES = ["admin", "dupla", "convivencia", "director", "inspector", "utp"]

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface StudentDetail {
    id: string
    name: string
    lastEmotion: string
    lastEmotionRaw: string | null
    alertCount: number
    incidentCount: number
    hasPaec: boolean
}

interface CourseClimate {
    courseId: string
    courseName: string
    label: string
    avgScore: number | null
    registros: number
    weeks: { semana: string; promedio: number | null; registros: number }[]
    topStudents: { name: string; lastEmotion: string }[]
    studentsDetail: StudentDetail[]
}

interface PulseResult {
    session_id: string
    institution_id: string
    week_start: string
    week_end: string
    total_student_entries: number
    avg_student_perception: number | null
    total_teacher_entries: number
    avg_teacher_climate: number | null
}

interface StudentItem {
    id: string; name: string; last_name: string
    courseName: string; hasPaec: boolean
}

interface Props {
    role: string
    emotionRows: any[]
    incidentRows: any[]
    alertRows: any[]
    mesesData: any[]
    coursesClimate: CourseClimate[]
    institutionName: string
    totalStudents: number
    totalAlerts: number
    totalIncidents: number
    studentsList: StudentItem[]
    emotionsByStudent: any[]
    incidentsByStudent: any[]
    alertsByStudent: any[]
    studentsMap: Record<string, any>
    pulseResults: PulseResult[]
    activePulse: { id: string; week_start: string; week_end: string } | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const EMOTION_COLOR: Record<string, string> = {
    muy_bien: "text-emerald-600", bien: "text-emerald-500",
    neutral: "text-slate-500", mal: "text-rose-500", muy_mal: "text-rose-600",
}

const CLIMATE_COLOR: Record<string, string> = {
    "Regulada": "text-green-600 bg-green-50 border-green-200",
    "Inquieta": "text-yellow-700 bg-yellow-50 border-yellow-200",
    "Apática": "text-blue-600 bg-blue-50 border-blue-200",
    "Explosiva": "text-red-600 bg-red-50 border-red-200",
    "Sin datos": "text-slate-400 bg-slate-50 border-slate-200",
}

const fmtDate = (d: string) =>
    new Date(d + "T12:00:00").toLocaleDateString("es-CL", { day: "numeric", month: "short" })

// ─── ReportCard ──────────────────────────────────────────────────────────────
function ReportCard({ title, description, icon: Icon, onPDF, onExcel, loadingPDF, loadingExcel }: {
    title: string; description: string; icon: React.ElementType
    onPDF?: () => void; onExcel?: () => void
    loadingPDF?: boolean; loadingExcel?: boolean
}) {
    return (
        <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-slate-100 rounded-lg shrink-0">
                        <Icon className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                        <CardTitle className="text-base">{title}</CardTitle>
                        <CardDescription className="text-xs mt-0.5">{description}</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex gap-2 pt-0">
                {onPDF && (
                    <Button variant="outline" size="sm" onClick={onPDF} disabled={loadingPDF} className="gap-1.5">
                        <FileText className="w-4 h-4" />
                        {loadingPDF ? "Generando..." : "Exportar PDF"}
                    </Button>
                )}
                {onExcel && (
                    <Button variant="outline" size="sm" onClick={onExcel} disabled={loadingExcel} className="gap-1.5">
                        <FileSpreadsheet className="w-4 h-4" />
                        {loadingExcel ? "Generando..." : "Exportar Excel"}
                    </Button>
                )}
            </CardContent>
        </Card>
    )
}

// ─── KPIs ─────────────────────────────────────────────────────────────────────
function KPISection({ coursesClimate, totalAlerts, totalIncidents, totalStudents }: {
    coursesClimate: CourseClimate[]
    totalAlerts: number
    totalIncidents: number
    totalStudents: number
}) {
    const withData = coursesClimate.filter(c => c.avgScore !== null)
    const critical = [...withData].sort((a, b) => (a.avgScore ?? 4) - (b.avgScore ?? 4))[0]
    const best = [...withData].sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0))[0]
    const studentsInAlert = coursesClimate.flatMap(c =>
        c.studentsDetail.filter(s => s.alertCount > 0 || s.incidentCount > 0)
    ).length

    return (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Card className="border-0 shadow-sm bg-red-50">
                <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                        <TrendingDown className="w-4 h-4 text-red-500" />
                        <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded border", CLIMATE_COLOR[critical?.label ?? "Sin datos"])}>
                            {critical?.label ?? "Sin datos"}
                        </span>
                    </div>
                    <p className="text-xs text-slate-500">Curso más crítico</p>
                    <p className="text-sm font-bold text-slate-900 mt-0.5 truncate">{critical?.courseName ?? "—"}</p>
                </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-green-50">
                <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded border", CLIMATE_COLOR[best?.label ?? "Sin datos"])}>
                            {best?.label ?? "Sin datos"}
                        </span>
                    </div>
                    <p className="text-xs text-slate-500">Mejor clima</p>
                    <p className="text-sm font-bold text-slate-900 mt-0.5 truncate">{best?.courseName ?? "—"}</p>
                </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-amber-50">
                <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200">
                            {totalAlerts} alertas
                        </span>
                    </div>
                    <p className="text-xs text-slate-500">Estudiantes en alerta</p>
                    <p className="text-2xl font-bold text-slate-900 mt-0.5">{studentsInAlert}</p>
                </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {totalIncidents} DEC
                        </span>
                    </div>
                    <p className="text-xs text-slate-500">Total estudiantes</p>
                    <p className="text-2xl font-bold text-slate-900 mt-0.5">{totalStudents}</p>
                </CardContent>
            </Card>
        </div>
    )
}

// ─── Accordion por curso ──────────────────────────────────────────────────────
function CourseAccordion({ coursesClimate }: { coursesClimate: CourseClimate[] }) {
    if (coursesClimate.length === 0) {
        return <p className="text-sm text-slate-400">No hay cursos con datos.</p>
    }

    return (
        <Accordion type="multiple" className="space-y-2">
            {coursesClimate.map(course => {
                const alertStudents = course.studentsDetail.filter(s => s.alertCount > 0 || s.incidentCount > 0)
                return (
                    <AccordionItem
                        key={course.courseId}
                        value={course.courseId}
                        className="rounded-xl border bg-white shadow-sm px-4"
                    >
                        <AccordionTrigger className="hover:no-underline py-3">
                            <div className="flex items-center justify-between w-full pr-2">
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-semibold text-slate-800">{course.courseName}</span>
                                    {alertStudents.length > 0 && (
                                        <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                                            <AlertTriangle className="w-3 h-3" />
                                            {alertStudents.length} en alerta
                                        </span>
                                    )}
                                </div>
                                <span className={cn("text-xs font-semibold px-2 py-0.5 rounded border", CLIMATE_COLOR[course.label])}>
                                    {course.label}
                                </span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                            {course.studentsDetail.length === 0 ? (
                                <p className="text-xs text-slate-400">Sin estudiantes registrados.</p>
                            ) : (
                                <div className="space-y-1 mt-1">
                                    {course.studentsDetail.map(student => (
                                        <div
                                            key={student.id}
                                            className={cn(
                                                "flex items-center justify-between rounded-lg px-3 py-2 text-sm",
                                                (student.alertCount > 0 || student.incidentCount > 0)
                                                    ? "bg-amber-50 border border-amber-100"
                                                    : "bg-slate-50"
                                            )}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-slate-800">{student.name}</span>
                                                {student.hasPaec && (
                                                    <span className="text-[10px] bg-indigo-50 border border-indigo-200 text-indigo-600 px-1.5 py-0.5 rounded-full font-semibold">PAEC</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={cn("text-xs font-medium", EMOTION_COLOR[student.lastEmotionRaw ?? ""] ?? "text-slate-400")}>
                                                    {student.lastEmotion}
                                                </span>
                                                {student.alertCount > 0 && (
                                                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
                                                        {student.alertCount} alerta{student.alertCount > 1 ? "s" : ""}
                                                    </span>
                                                )}
                                                {student.incidentCount > 0 && (
                                                    <span className="text-[10px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded-full">
                                                        {student.incidentCount} DEC
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </AccordionContent>
                    </AccordionItem>
                )
            })}
        </Accordion>
    )
}

// ─── Cruce Modo Pulso ─────────────────────────────────────────────────────────
const PERCEPTION_LABEL: Record<number, { label: string; color: string }> = {
    5: { label: "Muy bien", color: "text-emerald-600" },
    4: { label: "Bien", color: "text-emerald-500" },
    3: { label: "Neutral", color: "text-slate-500" },
    2: { label: "Mal", color: "text-rose-500" },
    1: { label: "Muy mal", color: "text-rose-600" },
}
const CLIMATE_SCORE_LABEL: Record<number, { label: string; color: string }> = {
    4: { label: "Regulada", color: "text-green-600" },
    3: { label: "Inquieta", color: "text-yellow-600" },
    2: { label: "Apática", color: "text-blue-500" },
    1: { label: "Explosiva", color: "text-red-600" },
}

function PulseCrossSection({ pulseResults, activePulse }: Pick<Props, "pulseResults" | "activePulse">) {
    if (pulseResults.length === 0) {
        return (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-400">
                <Zap className="w-6 h-6 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">Sin datos de Modo Pulso aún</p>
                <p className="text-xs mt-1">Activa el Modo Pulso desde el panel de administración.</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {activePulse && (
                <div className="flex items-center gap-2 rounded-lg bg-indigo-50 border border-indigo-200 px-4 py-2.5">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
                    </span>
                    <p className="text-xs font-semibold text-indigo-700">
                        Modo Pulso activo · {fmtDate(activePulse.week_start)} — {fmtDate(activePulse.week_end)}
                    </p>
                </div>
            )}

            {pulseResults.map(r => {
                const perceptionScore = r.avg_student_perception ? Math.round(r.avg_student_perception) : null
                const climateScore = r.avg_teacher_climate ? Math.round(r.avg_teacher_climate) : null
                const perceptionCfg = perceptionScore ? PERCEPTION_LABEL[perceptionScore] : null
                const climateCfg = climateScore ? CLIMATE_SCORE_LABEL[climateScore] : null

                // Divergencia: diff ≥ 2 puntos (escalas distintas: percepción 1-5, clima 1-4)
                // Normalizamos a 0-1 antes de comparar
                const perceptionNorm = perceptionScore ? (perceptionScore - 1) / 4 : null
                const climateNorm = climateScore ? (climateScore - 1) / 3 : null
                const hasDivergence = perceptionNorm !== null && climateNorm !== null
                    ? Math.abs(perceptionNorm - climateNorm) >= 0.4
                    : false

                return (
                    <div
                        key={r.session_id}
                        className={cn("rounded-xl border bg-white p-4", hasDivergence ? "border-amber-200" : "border-slate-100")}
                    >
                        <div className="flex items-start justify-between mb-3">
                            <p className="text-sm font-semibold text-slate-700">
                                Semana {fmtDate(r.week_start)} — {fmtDate(r.week_end)}
                            </p>
                            {hasDivergence && (
                                <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                    <AlertTriangle className="w-3 h-3" />
                                    Discrepancia
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-lg bg-slate-50 p-3">
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                                    Percepción estudiantes
                                </p>
                                <p className={cn("text-sm font-bold", perceptionCfg?.color ?? "text-slate-400")}>
                                    {perceptionCfg?.label ?? "Sin datos"}
                                </p>
                                <p className="text-xs text-slate-400 mt-0.5">{r.total_student_entries} registros</p>
                            </div>
                            <div className="rounded-lg bg-slate-50 p-3">
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                                    Clima docente
                                </p>
                                <p className={cn("text-sm font-bold", climateCfg?.color ?? "text-slate-400")}>
                                    {climateCfg?.label ?? "Sin datos"}
                                </p>
                                <p className="text-xs text-slate-400 mt-0.5">{r.total_teacher_entries} registros</p>
                            </div>
                        </div>

                        {hasDivergence && perceptionNorm !== null && climateNorm !== null && (
                            <div className="mt-3 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
                                <p className="text-xs text-amber-800">
                                    {perceptionNorm > climateNorm
                                        ? "Los estudiantes perciben el ambiente mejor de lo que el docente reporta el clima del aula."
                                        : "El docente reporta el clima más tenso de lo que los estudiantes perciben."
                                    }
                                </p>
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function ReportesClient({
    role, emotionRows, incidentRows, alertRows,
    mesesData, coursesClimate, institutionName,
    totalStudents, totalAlerts, totalIncidents,
    studentsList, emotionsByStudent, incidentsByStudent, alertsByStudent,
    pulseResults, activePulse,
}: Props) {
    const [loading, setLoading] = useState<Record<string, boolean>>({})
    const [selectedStudent, setSelectedStudent] = useState<string>("")
    const [selectedCourse, setSelectedCourse] = useState<string>("")

    const isStaff = STAFF_ROLES.includes(role)

    const withLoading = async (key: string, fn: () => void) => {
        setLoading(p => ({ ...p, [key]: true }))
        await new Promise(r => setTimeout(r, 100))
        try { fn() } finally { setLoading(p => ({ ...p, [key]: false })) }
    }

    const handleStudentPDF = () => {
        if (!selectedStudent) return
        const st = studentsList.find(s => s.id === selectedStudent)
        if (!st) return
        const emotions2 = emotionsByStudent.filter(e => e.student_id === st.id)
        const incidents2 = incidentsByStudent.filter(i => i.student_id === st.id)
        const alerts2 = alertsByStudent.filter(a => a.student_id === st.id)
        generateStudentPDF({
            student: { name: st.name, last_name: st.last_name, courseName: st.courseName },
            emotions: emotions2.map(e => ({ date: e.created_at, emotion: e.emotion, intensity: e.intensity, reflection: e.reflection })),
            incidents: incidents2.map(i => ({ folio: i.folio, type: i.type, severity: i.severity, date: i.incident_date, resolved: i.resolved })),
            hasPaec: st.hasPaec,
            alerts: alerts2.map(a => ({ type: a.type, description: a.description, date: a.created_at })),
        })
    }

    return (
        <div className="space-y-6">

            {isStaff && (
                <KPISection
                    coursesClimate={coursesClimate}
                    totalAlerts={totalAlerts}
                    totalIncidents={totalIncidents}
                    totalStudents={totalStudents}
                />
            )}

            <Tabs defaultValue="bienestar" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3 h-auto p-1">
                    <TabsTrigger value="bienestar" className="flex items-center gap-2 py-2.5 text-xs sm:text-sm">
                        <BarChart3 className="w-4 h-4 shrink-0" />
                        <span>Bienestar</span>
                    </TabsTrigger>
                    <TabsTrigger value="clima" className="flex items-center gap-2 py-2.5 text-xs sm:text-sm">
                        <Thermometer className="w-4 h-4 shrink-0" />
                        <span>Clima</span>
                    </TabsTrigger>
                    <TabsTrigger value="match" className="flex items-center gap-2 py-2.5 text-xs sm:text-sm">
                        <GitMerge className="w-4 h-4 shrink-0" />
                        <span>Match de datos</span>
                    </TabsTrigger>
                </TabsList>

                {/* ── Tab 1: Bienestar ─────────────────────────────────────────── */}
                <TabsContent value="bienestar" className="space-y-6">
                    {isStaff && (
                        <section className="space-y-3">
                            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Detalle por curso</h2>
                            <CourseAccordion coursesClimate={coursesClimate} />
                        </section>
                    )}

                    <section className="space-y-3">
                        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Fichas individuales</h2>
                        <Card className="border-0 shadow-sm">
                            <CardHeader className="pb-3">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-slate-100 rounded-lg shrink-0">
                                        <FileText className="w-5 h-5 text-slate-600" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base">Ficha individual del estudiante</CardTitle>
                                        <CardDescription className="text-xs mt-0.5">PDF con historial emocional, DEC, PAEC y alertas</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="flex flex-col sm:flex-row gap-3 pt-0">
                                <select
                                    value={selectedStudent}
                                    onChange={e => setSelectedStudent(e.target.value)}
                                    className="flex-1 border border-slate-200 rounded-md px-3 py-2 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
                                >
                                    <option value="">Selecciona un estudiante</option>
                                    {studentsList.map((s, i) => (
                                        <option key={s.id ?? `student-${i}`} value={s.id ?? ""}>
                                            {s.name} {s.last_name} — {s.courseName}
                                        </option>
                                    ))}
                                </select>
                                <Button
                                    variant="outline" size="sm"
                                    onClick={() => withLoading("student", handleStudentPDF)}
                                    disabled={!selectedStudent || loading["student"]}
                                    className="gap-1.5 shrink-0"
                                >
                                    <Download className="w-4 h-4" />
                                    {loading["student"] ? "Generando..." : "Exportar PDF"}
                                </Button>
                            </CardContent>
                        </Card>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Datos en Excel</h2>
                        <div className="grid gap-3 md:grid-cols-2">
                            <ReportCard
                                title="Registros emocionales"
                                description="Todos los check-ins diarios del período"
                                icon={FileSpreadsheet}
                                onExcel={() => withLoading("emotionsXlsx", () =>
                                    generateEmotionsExcel({ courseName: institutionName, rows: emotionRows })
                                )}
                                loadingExcel={loading["emotionsXlsx"]}
                            />
                            <ReportCard
                                title="Alertas de estudiantes"
                                description="Todas las alertas generadas con estado actual"
                                icon={FileSpreadsheet}
                                onExcel={() => withLoading("alertsXlsx", () =>
                                    generateAlertsExcel({ rows: alertRows })
                                )}
                                loadingExcel={loading["alertsXlsx"]}
                            />
                        </div>
                    </section>
                </TabsContent>

                {/* ── Tab 2: Clima ─────────────────────────────────────────────── */}
                <TabsContent value="clima" className="space-y-6">
                    <section className="space-y-3">
                        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Exportar</h2>
                        <Card className="border-0 shadow-sm">
                            <CardHeader className="pb-3">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-slate-100 rounded-lg shrink-0">
                                        <FileText className="w-5 h-5 text-slate-600" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base">Clima emocional por curso</CardTitle>
                                        <CardDescription className="text-xs mt-0.5">Tendencias de energía del aula, últimas 4 semanas</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="flex flex-col sm:flex-row gap-3 pt-0">
                                <select
                                    value={selectedCourse}
                                    onChange={e => setSelectedCourse(e.target.value)}
                                    className="flex-1 border border-slate-200 rounded-md px-3 py-2 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
                                >
                                    <option value="">Selecciona un curso</option>
                                    {coursesClimate.map((c, i) => (
                                        <option key={c.courseId ?? `curso-${i}`} value={c.courseId ?? ""}>
                                            {c.courseName}
                                        </option>
                                    ))}
                                </select>
                                <Button
                                    variant="outline" size="sm"
                                    onClick={() => {
                                        if (!selectedCourse) return
                                        const course = coursesClimate.find(c => c.courseId === selectedCourse)
                                        if (!course) return
                                        withLoading("climate", () =>
                                            generateClimatePDF({ courseName: course.courseName, weeks: course.weeks, topStudents: course.topStudents })
                                        )
                                    }}
                                    disabled={!selectedCourse || loading["climate"]}
                                    className="gap-1.5 shrink-0"
                                >
                                    <FileText className="w-4 h-4" />
                                    {loading["climate"] ? "Generando..." : "Exportar PDF"}
                                </Button>
                            </CardContent>
                        </Card>
                    </section>
                </TabsContent>

                {/* ── Tab 3: Match de datos ─────────────────────────────────────── */}
                <TabsContent value="match" className="space-y-6">
                    <section className="space-y-3">
                        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Cruce Modo Pulso</h2>
                        <PulseCrossSection pulseResults={pulseResults} activePulse={activePulse} />
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Exportar</h2>
                        <div className="grid gap-3 md:grid-cols-2">
                            <ReportCard
                                title="Casos DEC"
                                description="Listado completo de DEC con estado y severidad"
                                icon={FileSpreadsheet}
                                onExcel={() => withLoading("incidentsXlsx", () =>
                                    generateIncidentsExcel({ rows: incidentRows })
                                )}
                                loadingExcel={loading["incidentsXlsx"]}
                            />
                            {role === "director" && (
                                <ReportCard
                                    title="Reporte institucional"
                                    description="Resumen general: estudiantes, alertas, DEC y tendencias mensuales"
                                    icon={FileText}
                                    onPDF={() => withLoading("institutional", () =>
                                        generateInstitutionalPDF({
                                            institutionName, totalStudents, totalAlerts, totalIncidents,
                                            meses: mesesData, courses: coursesClimate,
                                        })
                                    )}
                                    loadingPDF={loading["institutional"]}
                                />
                            )}
                        </div>
                    </section>
                </TabsContent>
            </Tabs>
        </div>
    )
}
