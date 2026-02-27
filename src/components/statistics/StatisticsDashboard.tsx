"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { SummaryCards } from "@/components/statistics/SummaryCards"
import { RiskCoursesSection } from "@/components/statistics/RiskCoursesSection"
import { IncidentsSection } from "@/components/statistics/IncidentsSection"
import { ActivitiesSection } from "@/components/statistics/ActivitiesSection"
import { toast } from "sonner"
import { getDashboardData, DashboardData } from "@/actions/statistics/getDashboardData"

import { useRef } from "react"
import jsPDF from "jspdf"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { generateStatisticsReport } from "@/app/(dashboard)/estadisticas/export-pdf"

type Props = { institutionId: string; institutionName: string }

const RANGES = [
    { value: 30, label: "Últimos 30 días" },
    { value: 90, label: "Últimos 90 días" },
    { value: 365, label: "Últimos 365 días" },
]

export function StatisticsDashboard({ institutionId, institutionName }: Props) {
    const [days, setDays] = useState<number>(30)
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState<DashboardData | null>(null)
    const dashboardRef = useRef<HTMLDivElement>(null)

    const loadData = async (range: number) => {
        setLoading(true)
        try {
            const result = await getDashboardData(institutionId, range)
            if (result.error) {
                toast.error(result.error)
            } else {
                setData(result.data ?? null)
            }
        } catch (e) {
            console.error(e)
            toast.error("No se pudo cargar el dashboard.")
        } finally {
            setLoading(false)
        }
    }

    const handleExportPdf = async () => {
        if (!data) return

        try {
            setLoading(true)

            const pdf = await generateStatisticsReport({
                institutionName,
                days,
                summary: {
                    studentsAtRisk: data.courseRisks.reduce((acc, c) => acc + c.low_students.length, 0),
                    coursesAtRisk: data.summary.low_emotion_courses,
                    totalIncidents: data.summary.total_incidents,
                    averageAttendance: 0,
                    averageGrade: 0,
                },
                courseRisks: data.courseRisks.map(c => ({
                    courseName: c.course_name,
                    studentsAtRisk: c.low_students.length,
                    averageGrade: Number(c.avg_score.toFixed(1)),
                    averageAttendance: 0
                })),
                incidents: data.incidents.recent.map(i => ({
                    type: i.type,
                    studentName: i.student_name,
                    createdAt: i.incident_date,
                    status: "Abierto"
                })),
                activities: data.activities.recent.map(a => ({
                    description: a.title,
                    userName: "Sistema",
                    timestamp: a.start_datetime
                }))
            })

            const filename = `informe-estadisticas-${days}d.pdf`
            pdf.save(filename)
            toast.success("Informe generado exitosamente")
        } catch (e) {
            console.error(e)
            toast.error("No se pudo generar el informe.")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        void loadData(days)
    }, [days, institutionId])

    return (
        <div className="space-y-6">
            {/* Selector de periodo + PDF */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                    {RANGES.map(r => (
                        <button
                            key={r.value}
                            disabled={loading}
                            onClick={() => setDays(r.value)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border ${days === r.value
                                ? "bg-indigo-600 text-white border-indigo-600"
                                : "bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
                                } disabled:opacity-50`}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={loading || !data}
                    onClick={handleExportPdf}
                >
                    {loading ? "Procesando..." : "Descargar informe PDF"}
                </Button>
            </div>

            <div
                ref={dashboardRef}
                className="space-y-6"
            >
                {data ? (
                    <Tabs defaultValue="overview" className="space-y-6">
                        <TabsList className="bg-slate-100/50 border">
                            <TabsTrigger value="overview" className="text-xs">Resumen</TabsTrigger>
                            <TabsTrigger value="incidents" className="text-xs">Incidentes DEC</TabsTrigger>
                            <TabsTrigger value="activities" className="text-xs">Actividades</TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="space-y-6">
                            <SummaryCards data={data.summary} />
                            <RiskCoursesSection courses={data.courseRisks} />
                        </TabsContent>

                        <TabsContent value="incidents" className="space-y-6">
                            <IncidentsSection incidents={data.incidents} days={days} />
                        </TabsContent>

                        <TabsContent value="activities" className="space-y-6">
                            <ActivitiesSection activities={data.activities} />
                        </TabsContent>
                    </Tabs>
                ) : (
                    <Card className="p-6 text-sm text-slate-500">
                        {loading ? "Cargando estadísticas..." : "No hay datos para el período seleccionado."}
                    </Card>
                )}
            </div>
        </div>
    )
}
