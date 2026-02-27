"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Legend,
} from "recharts"

type CountByLabel = { label: string; count: number }
type IncidentByMonth = { month: string; count: number }

type Props = {
    incidents: {
        byMonth: IncidentByMonth[]
        bySeverity: CountByLabel[]
        byType: CountByLabel[]
        recent: {
            id: string
            folio: string | null
            type: string
            severity: string
            course_name: string | null
            incident_date: string
        }[]
    }
    days: number
}

const SEVERITY_LABELS: Record<string, string> = {
    moderada: "Moderada",
    severa: "Severa",
}

const TYPE_LABELS: Record<string, string> = {
    DEC: "DEC",
    agresion_fisica: "Agresión física",
    agresion_verbal: "Agresión verbal",
    bullyng: "Bullying",
    acoso: "Acoso",
    consumo: "Consumo",
}

function formatMonth(key: string) {
    const [year, month] = key.split("-").map(Number)
    const d = new Date(year, month - 1, 1)
    return d.toLocaleDateString("es-CL", { month: "short" })
}

export function IncidentsSection({ incidents, days }: Props) {
    const byMonthData = incidents.byMonth.map((m) => ({
        ...m,
        label: formatMonth(m.month),
    }))

    const bySeverityData = incidents.bySeverity.map((s) => ({
        name: SEVERITY_LABELS[s.label] ?? s.label,
        count: s.count,
    }))

    const byTypeData = incidents.byType.map((t) => ({
        name: TYPE_LABELS[t.label] ?? t.label,
        count: t.count,
    }))

    return (
        <div className="grid lg:grid-cols-3 gap-4">
            {/* Línea por mes */}
            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle className="text-sm">
                        Incidentes DEC por mes (últimos {days} días)
                    </CardTitle>
                </CardHeader>
                <CardContent className="h-64">
                    {byMonthData.length === 0 ? (
                        <p className="text-xs text-slate-400 pt-4">
                            No hay incidentes en el período seleccionado.
                        </p>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={byMonthData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                <Tooltip />
                                <Line
                                    type="monotone"
                                    dataKey="count"
                                    stroke="#ef4444"
                                    strokeWidth={2}
                                    dot={{ r: 3 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>

            {/* Barras por severidad */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm">Por severidad</CardTitle>
                </CardHeader>
                <CardContent className="h-64">
                    {bySeverityData.length === 0 ? (
                        <p className="text-xs text-slate-400 pt-4">
                            Sin datos de severidad en el período.
                        </p>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={bySeverityData} margin={{ top: 10, right: 10, left: -20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                <Tooltip />
                                <Bar dataKey="count" fill="#f97316" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>

            {/* Barras por tipo + recientes */}
            <Card className="lg:col-span-3">
                <CardHeader>
                    <CardTitle className="text-sm">Distribución por tipo y casos recientes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="h-56">
                        {byTypeData.length === 0 ? (
                            <p className="text-xs text-slate-400 pt-4">
                                No hay incidentes registrados por tipo en el período.
                            </p>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={byTypeData} margin={{ top: 10, right: 10, left: -20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="count" name="Incidentes" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    {/* Lista recientes */}
                    <div>
                        <p className="text-xs font-semibold text-slate-500 mb-2">
                            Últimos incidentes registrados
                        </p>
                        {incidents.recent.length === 0 ? (
                            <p className="text-xs text-slate-400">
                                No hay incidentes recientes en el período.
                            </p>
                        ) : (
                            <ul className="divide-y text-xs">
                                {incidents.recent.map((inc) => (
                                    <li key={inc.id} className="py-1.5 flex items-center justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="font-medium text-slate-700 truncate">
                                                {inc.folio ?? inc.id.slice(0, 8)} ·{" "}
                                                {TYPE_LABELS[inc.type] ?? inc.type}
                                            </p>
                                            <p className="text-[11px] text-slate-400">
                                                {inc.course_name ?? "Sin curso"} ·{" "}
                                                {SEVERITY_LABELS[inc.severity] ?? inc.severity}
                                            </p>
                                        </div>
                                        <span className="text-[11px] text-slate-400 shrink-0">
                                            {new Date(inc.incident_date).toLocaleDateString("es-CL", {
                                                day: "2-digit",
                                                month: "short",
                                            })}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
