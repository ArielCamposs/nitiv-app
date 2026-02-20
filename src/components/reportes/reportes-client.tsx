"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, FileSpreadsheet, Download } from "lucide-react"
import {
    generateStudentPDF,
    generateClimatePDF,
    generateInstitutionalPDF,
} from "@/lib/reports/generate-pdf"
import {
    generateEmotionsExcel,
    generateIncidentsExcel,
    generateAlertsExcel,
} from "@/lib/reports/generate-excel"

const EMOTION_LABEL: Record<string, string> = {
    muy_bien: "Muy bien", bien: "Bien", neutral: "Neutral",
    mal: "Mal", muy_mal: "Muy mal",
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
    coursesClimate: {
        courseId: string
        courseName: string
        label: string
        registros: number
        weeks: { semana: string; promedio: number | null; registros: number }[]
        topStudents: { name: string; lastEmotion: string }[]
    }[]
    institutionName: string
    totalStudents: number
    totalAlerts: number
    totalIncidents: number
    studentsList: StudentItem[]
    emotionsByStudent: any[]
    incidentsByStudent: any[]
    alertsByStudent: any[]
    studentsMap: Record<string, any>
}

function ReportCard({ title, description, icon: Icon, onPDF, onExcel, loadingPDF, loadingExcel }: {
    title: string
    description: string
    icon: React.ElementType
    onPDF?: () => void
    onExcel?: () => void
    loadingPDF?: boolean
    loadingExcel?: boolean
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
                    <Button
                        variant="outline" size="sm"
                        onClick={onPDF}
                        disabled={loadingPDF}
                        className="gap-1.5"
                    >
                        <FileText className="w-4 h-4" />
                        {loadingPDF ? "Generando..." : "Exportar PDF"}
                    </Button>
                )}
                {onExcel && (
                    <Button
                        variant="outline" size="sm"
                        onClick={onExcel}
                        disabled={loadingExcel}
                        className="gap-1.5"
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        {loadingExcel ? "Generando..." : "Exportar Excel"}
                    </Button>
                )}
            </CardContent>
        </Card>
    )
}

export function ReportesClient({
    role, emotionRows, incidentRows, alertRows,
    mesesData, coursesClimate, institutionName,
    totalStudents, totalAlerts, totalIncidents,
    studentsList, emotionsByStudent, incidentsByStudent,
    alertsByStudent,
}: Props) {
    const [loading, setLoading] = useState<Record<string, boolean>>({})
    const [selectedStudent, setSelectedStudent] = useState<string>("")
    const [selectedCourse, setSelectedCourse] = useState<string>("")

    const withLoading = async (key: string, fn: () => void) => {
        setLoading(p => ({ ...p, [key]: true }))
        await new Promise(r => setTimeout(r, 100)) // permite re-render
        try { fn() } finally {
            setLoading(p => ({ ...p, [key]: false }))
        }
    }

    const handleStudentPDF = () => {
        if (!selectedStudent) return
        const st = studentsList.find(s => s.id === selectedStudent)
        if (!st) return

        const emotions = emotionsByStudent.filter(e => e.student_id === st.id)
        const incidents = incidentsByStudent.filter(i => i.student_id === st.id)
        const alerts = alertsByStudent.filter(a => a.student_id === st.id)

        generateStudentPDF({
            student: { name: st.name, last_name: st.last_name, courseName: st.courseName },
            emotions: emotions.map(e => ({ date: e.created_at, emotion: e.emotion, intensity: e.intensity, reflection: e.reflection })),
            incidents: incidents.map(i => ({ folio: i.folio, type: i.type, severity: i.severity, date: i.incident_date, resolved: i.resolved })),
            hasPaec: st.hasPaec,
            alerts: alerts.map(a => ({ type: a.type, description: a.description, date: a.created_at })),
        })
    }

    return (
        <div className="space-y-6">

            {/* ── PDF Ficha individual ── */}
            <section className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                    Fichas individuales
                </h2>

                <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-3">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-slate-100 rounded-lg shrink-0">
                                <FileText className="w-5 h-5 text-slate-600" />
                            </div>
                            <div>
                                <CardTitle className="text-base">Ficha individual del estudiante</CardTitle>
                                <CardDescription className="text-xs mt-0.5">
                                    PDF con historial emocional, DEC, PAEC y alertas del estudiante
                                </CardDescription>
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

            {/* ── PDF Reportes generales ── */}
            <section className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                    Reportes generales — PDF
                </h2>

                <div className="grid gap-3 md:grid-cols-2">
                    <Card className="border-0 shadow-sm">
                        <CardHeader className="pb-3">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-slate-100 rounded-lg shrink-0">
                                    <FileText className="w-5 h-5 text-slate-600" />
                                </div>
                                <div>
                                    <CardTitle className="text-base">Clima emocional por curso</CardTitle>
                                    <CardDescription className="text-xs mt-0.5">
                                        Tendencias de energía del aula por curso, últimas 4 semanas
                                    </CardDescription>
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
                                        generateClimatePDF({
                                            courseName: course.courseName,
                                            weeks: course.weeks,
                                            topStudents: course.topStudents,
                                        })
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

                    {role === "director" && (
                        <ReportCard
                            title="Reporte institucional"
                            description="Resumen general: estudiantes, alertas, DEC y tendencias mensuales"
                            icon={FileText}
                            onPDF={() => withLoading("institutional", () =>
                                generateInstitutionalPDF({
                                    institutionName,
                                    totalStudents,
                                    totalAlerts,
                                    totalIncidents,
                                    meses: mesesData,
                                    courses: coursesClimate,
                                })
                            )}
                            loadingPDF={loading["institutional"]}
                        />
                    )}
                </div>
            </section>

            {/* ── Excel ── */}
            <section className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                    Datos en Excel
                </h2>

                <div className="grid gap-3 md:grid-cols-3">
                    <ReportCard
                        title="Registros emocionales"
                        description="Todos los check-ins diarios del período"
                        icon={FileSpreadsheet}
                        onExcel={() => withLoading("emotionsXlsx", () =>
                            generateEmotionsExcel({
                                courseName: institutionName,
                                rows: emotionRows,
                            })
                        )}
                        loadingExcel={loading["emotionsXlsx"]}
                    />
                    <ReportCard
                        title="Casos DEC"
                        description="Listado completo de DEC con estado y severidad"
                        icon={FileSpreadsheet}
                        onExcel={() => withLoading("incidentsXlsx", () =>
                            generateIncidentsExcel({ rows: incidentRows })
                        )}
                        loadingExcel={loading["incidentsXlsx"]}
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

        </div>
    )
}
