"use client"
import { useState } from "react"
import { generateReport } from "@/actions/reports"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

type ReportData = {
    total_registros: number
    promedio_intensidad: number
    emocion_mas_frecuente: string
    mes_critico: string
    total_alertas_riesgo: number
    total_solicitudes_ayuda: number
    periodo: string
    fecha_generacion: string
    distribucion_emociones: { emotion: string; count: number }[]
    alertas_por_severidad: { severity: string; count: number }[]
    solicitudes_por_estado: { status: string; count: number }[]
    estudiantes_en_alerta: { name: string; registros_negativos: number }[]
}

const SEVERITY_LABEL: Record<string, string> = {
    critical: "🔴 Crítico",
    high: "🟠 Alto",
    medium: "🟡 Medio"
}

const STATUS_LABEL: Record<string, string> = {
    pending: "Pendiente",
    seen: "En atención",
    resolved: "Resuelto"
}

export function ExecutiveReport({ institutionId }: { institutionId: string }) {
    const currentYear = new Date().getFullYear()
    const currentSemester = new Date().getMonth() < 6 ? 1 : 2

    const [year, setYear] = useState(currentYear)
    const [semester, setSemester] = useState(currentSemester)
    const [loading, setLoading] = useState(false)
    const [report, setReport] = useState<ReportData | null>(null)

    const handleGenerate = async () => {
        setLoading(true)
        const result = await generateReport(institutionId, year, semester)

        if (result.error) {
            toast.error(result.error)
        } else {
            // Cargar el informe recién generado
            const { createClient } = await import("@/lib/supabase/client")
            const supabase = createClient()
            const { data } = await supabase
                .from("executive_reports")
                .select("data")
                .eq("id", result.reportId)
                .single()

            setReport(data?.data as ReportData)
            toast.success("Informe generado correctamente")
        }
        setLoading(false)
    }

    return (
        <div className="space-y-6 max-w-3xl">
            {/* Selector de período */}
            <Card>
                <CardHeader>
                    <CardTitle>Generar informe ejecutivo</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row sm:items-end gap-4">
                    <div className="space-y-1 w-full sm:w-auto">
                        <label className="text-sm font-medium">Año</label>
                        <select
                            value={year}
                            onChange={(e) => setYear(Number(e.target.value))}
                            className="border rounded-lg px-3 py-2 text-sm w-full"
                        >
                            {[currentYear - 1, currentYear].map((y) => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-1 w-full sm:w-auto">
                        <label className="text-sm font-medium">Semestre</label>
                        <select
                            value={semester}
                            onChange={(e) => setSemester(Number(e.target.value))}
                            className="border rounded-lg px-3 py-2 text-sm w-full"
                        >
                            <option value={1}>1° Semestre (Ene–Jun)</option>
                            <option value={2}>2° Semestre (Jul–Dic)</option>
                        </select>
                    </div>
                    <Button onClick={handleGenerate} disabled={loading} className="w-full sm:w-auto">
                        {loading ? "Generando..." : "Generar informe"}
                    </Button>
                </CardContent>
            </Card>

            {/* Resultado del informe */}
            {report && (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <h2 className="text-lg font-bold">
                            Informe {report.periodo}
                        </h2>
                        <p className="text-xs text-slate-400">
                            Generado el {new Date(report.fecha_generacion).toLocaleString("es-CL")}
                        </p>
                    </div>

                    {/* KPIs principales */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                            { label: "Registros emocionales", value: report.total_registros },
                            { label: "Promedio intensidad", value: report.promedio_intensidad },
                            { label: "Alertas de riesgo", value: report.total_alertas_riesgo },
                            { label: "Solicitudes de ayuda", value: report.total_solicitudes_ayuda },
                        ].map((kpi) => (
                            <Card key={kpi.label}>
                                <CardContent className="pt-4 text-center">
                                    <p className="text-2xl font-bold text-indigo-600">{kpi.value ?? "—"}</p>
                                    <p className="text-xs text-slate-500 mt-1">{kpi.label}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Highlights */}
                    <div className="grid sm:grid-cols-2 gap-3">
                        <Card>
                            <CardContent className="pt-4 space-y-1">
                                <p className="text-xs text-slate-500">Emoción más frecuente</p>
                                <p className="font-semibold capitalize">{report.emocion_mas_frecuente ?? "—"}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-4 space-y-1">
                                <p className="text-xs text-slate-500">Mes más crítico</p>
                                <p className="font-semibold">{report.mes_critico ?? "Sin datos"}</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Distribución emociones */}
                    {report.distribucion_emociones && (
                        <Card>
                            <CardHeader><CardTitle className="text-sm">Distribución de emociones</CardTitle></CardHeader>
                            <CardContent className="flex flex-wrap gap-2">
                                {report.distribucion_emociones.map((e) => (
                                    <Badge key={e.emotion} variant="outline" className="capitalize">
                                        {e.emotion}: {e.count}
                                    </Badge>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {/* Alertas por severidad */}
                    {report.alertas_por_severidad && (
                        <Card>
                            <CardHeader><CardTitle className="text-sm">Alertas de riesgo por severidad</CardTitle></CardHeader>
                            <CardContent className="flex flex-wrap gap-2">
                                {report.alertas_por_severidad.map((a) => (
                                    <Badge key={a.severity} variant="outline">
                                        {SEVERITY_LABEL[a.severity] ?? a.severity}: {a.count}
                                    </Badge>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {/* Estudiantes en alerta */}
                    {report.estudiantes_en_alerta?.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Top estudiantes con registros negativos</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2">
                                    {report.estudiantes_en_alerta.map((e, i) => (
                                        <li key={i} className="flex justify-between text-sm">
                                            <span>{e.name}</span>
                                            <Badge variant="destructive">{e.registros_negativos} registros</Badge>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
        </div>
    )
}
