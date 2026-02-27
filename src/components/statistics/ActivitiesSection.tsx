"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
} from "recharts"

type CountByLabel = { label: string; count: number }
type ActivitiesByMonth = { month: string; count: number }

type Props = {
    activities: {
        byMonth: ActivitiesByMonth[]
        byType: CountByLabel[]
    }
}

const TYPE_LABELS: Record<string, string> = {
    taller: "Taller",
    charla: "Charla",
    evento: "Evento",
    ceremonia: "Ceremonia",
    deportivo: "Deportivo",
    otro: "Otro",
}

function formatMonth(key: string) {
    const [year, month] = key.split("-").map(Number)
    const d = new Date(year, month - 1, 1)
    return d.toLocaleDateString("es-CL", { month: "short" })
}

export function ActivitiesSection({ activities }: Props) {
    const byMonthData = activities.byMonth.map((m) => ({
        ...m,
        label: formatMonth(m.month),
    }))

    const byTypeData = activities.byType.map((t) => ({
        name: TYPE_LABELS[t.label] ?? t.label,
        count: t.count,
    }))

    return (
        <div className="grid lg:grid-cols-3 gap-4">
            {/* Línea por mes */}
            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle className="text-sm">Actividades por mes</CardTitle>
                </CardHeader>
                <CardContent className="h-64">
                    {byMonthData.length === 0 ? (
                        <p className="text-xs text-slate-400 pt-4">
                            No hay actividades en el período seleccionado.
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
                                    stroke="#0ea5e9"
                                    strokeWidth={2}
                                    dot={{ r: 3 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>

            {/* Barras por tipo */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm">Por tipo</CardTitle>
                </CardHeader>
                <CardContent className="h-64">
                    {byTypeData.length === 0 ? (
                        <p className="text-xs text-slate-400 pt-4">
                            Sin datos de tipo de actividad en el período.
                        </p>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={byTypeData} margin={{ top: 10, right: 10, left: -20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                <Tooltip />
                                <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
