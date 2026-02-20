"use client"

import { useState } from "react"
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer
} from "recharts"
import {
    Card, CardContent, CardHeader, CardTitle, CardDescription
} from "@/components/ui/card"
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Users } from "lucide-react"

const ENERGY_CONFIG = {
    regulada: { label: "Regulada", emoji: "😊", bg: "bg-emerald-500", color: "#10b981" },
    inquieta: { label: "Inquieta", emoji: "😤", bg: "bg-amber-400", color: "#f59e0b" },
    apatica: { label: "Apática", emoji: "😴", bg: "bg-gray-400", color: "#9ca3af" },
    explosiva: { label: "Explosiva", emoji: "🔥", bg: "bg-red-500", color: "#ef4444" },
} as const

const EMOTION_CONFIG = {
    muy_bien: { label: "Muy bien", emoji: "🤩", color: "text-purple-600" },
    bien: { label: "Bien", emoji: "🙂", color: "text-emerald-600" },
    neutral: { label: "Neutral", emoji: "😐", color: "text-gray-500" },
    mal: { label: "Mal", emoji: "😢", color: "text-orange-500" },
    muy_mal: { label: "Muy mal", emoji: "😞", color: "text-red-600" },
} as const

type Tendencia = "mejorando" | "empeorando" | "estable" | "sin_datos"

interface Props {
    profile: { name: string; last_name: string }
    courses: Array<{ id: string; name: string }>
    studentsEnriched: Array<{ id: string; name: string; last_name: string; course_id: string; courseName: string; lastEmotion: string | null }>
    heatmapData: Array<{ week: string; weekIndex: number; day: string; dayIndex: number; energy: string | null; score: number }>
    chartData: Array<{ semana: string; promedio: number | null }>
    tendencia: Tendencia
    alertsEnriched: Array<{ id: string; student_id: string; type: string; description: string; created_at: string; studentName: string }>
    totalLogs: number
}

const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie"]
const WEEK_NAMES = ["S1", "S2", "S3", "S4"]

export function TeacherDashboardClient({
    courses, studentsEnriched, heatmapData,
    chartData, tendencia, alertsEnriched,
}: Props) {
    const [selectedCourse, setSelectedCourse] = useState<string | null>(courses[0]?.id ?? null)

    const filteredStudents = selectedCourse
        ? studentsEnriched.filter(s => s.course_id === selectedCourse)
        : studentsEnriched

    const trendColor =
        tendencia === "mejorando" ? "#10b981" :
            tendencia === "empeorando" ? "#ef4444" : "#6b7280"

    const TrendIcon =
        tendencia === "mejorando" ? TrendingUp :
            tendencia === "empeorando" ? TrendingDown : Minus

    const trendLabel =
        tendencia === "mejorando" ? "Mejorando 🎉" :
            tendencia === "empeorando" ? "Empeorando ⚠️" :
                tendencia === "sin_datos" ? "Sin datos" : "Estable 😌"

    const sinDatos = chartData.every(d => d.promedio === null)

    return (
        <div className="space-y-6">

            {/* Selector de curso */}
            {courses.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                    {courses.map(c => (
                        <button
                            key={c.id}
                            onClick={() => setSelectedCourse(c.id)}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedCourse === c.id
                                    ? "bg-slate-900 text-white"
                                    : "bg-white text-slate-600 border border-slate-200 hover:border-slate-400"
                                }`}
                        >
                            {c.name}
                        </button>
                    ))}
                </div>
            )}

            {/* Tarjetas resumen */}
            <div className="grid grid-cols-3 gap-3">
                <Card className="border-0 shadow-sm">
                    <CardContent className="pt-4 pb-3">
                        <p className="text-xs text-slate-500">Tendencia</p>
                        <div className="flex items-center gap-1.5 mt-1">
                            <TrendIcon className="w-4 h-4" style={{ color: trendColor }} />
                            <span className="font-semibold text-sm text-slate-800">{trendLabel}</span>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="pt-4 pb-3">
                        <p className="text-xs text-slate-500">Estudiantes</p>
                        <p className="font-semibold text-sm text-slate-800 mt-1">{filteredStudents.length}</p>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="pt-4 pb-3">
                        <p className="text-xs text-slate-500">Alertas activas</p>
                        <p className={`font-semibold text-sm mt-1 ${alertsEnriched.length > 0 ? "text-red-600" : "text-slate-800"}`}>
                            {alertsEnriched.length}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Heatmap */}
            <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Clima del aula</CardTitle>
                    <CardDescription>Últimas 4 semanas — energía registrada por día</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr>
                                    <th className="w-8" />
                                    {DAY_NAMES.map(d => (
                                        <th key={d} className="text-xs font-medium text-slate-400 text-center pb-2 px-1">
                                            {d}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {WEEK_NAMES.map((week, wi) => (
                                    <tr key={week}>
                                        <td className="text-xs text-slate-400 pr-2 py-1">{week}</td>
                                        {DAY_NAMES.map((_, di) => {
                                            const cell = heatmapData.find(h => h.week === week && h.dayIndex === di)
                                            const cfg = cell?.energy
                                                ? ENERGY_CONFIG[cell.energy as keyof typeof ENERGY_CONFIG]
                                                : null
                                            return (
                                                <td key={di} className="px-1 py-1">
                                                    <div
                                                        title={cfg?.label ?? "Sin registro"}
                                                        className={`h-9 w-full rounded-md flex items-center justify-center text-base transition-all
                                                            ${cfg ? `${cfg.bg} opacity-80` : "bg-slate-100"}`}
                                                    >
                                                        {cfg?.emoji ?? ""}
                                                    </div>
                                                </td>
                                            )
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Leyenda */}
                    <div className="flex flex-wrap gap-4 mt-4">
                        {Object.entries(ENERGY_CONFIG).map(([key, cfg]) => (
                            <div key={key} className="flex items-center gap-1.5">
                                <span className="text-base">{cfg.emoji}</span>
                                <span className="text-xs text-slate-500">{cfg.label}</span>
                            </div>
                        ))}
                        <div className="flex items-center gap-1.5">
                            <div className="w-4 h-4 rounded-sm bg-slate-100" />
                            <span className="text-xs text-slate-400">Sin registro</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Gráfico tendencia */}
            <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Tendencia semanal</CardTitle>
                    <CardDescription>Promedio de energía del aula (4 = regulada · 1 = explosiva)</CardDescription>
                </CardHeader>
                <CardContent>
                    {sinDatos ? (
                        <div className="flex flex-col items-center justify-center h-32 text-slate-400 gap-2">
                            <span className="text-3xl">📭</span>
                            <p className="text-sm">No hay registros suficientes</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={180}>
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorEnergy" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={trendColor} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={trendColor} stopOpacity={0.02} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="semana" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                                <YAxis domain={[1, 4]} ticks={[1, 2, 3, 4]}
                                    tickFormatter={(v) => (["", "🔥", "😴", "😤", "😊"] as string[])[v] ?? v}
                                    tick={{ fontSize: 13 }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    formatter={(value: number) => {
                                        const map: Record<number, string> = { 1: "Explosiva 🔥", 2: "Apática 😴", 3: "Inquieta 😤", 4: "Regulada 😊" }
                                        return [map[Math.round(value)] ?? value, "Clima"]
                                    }}
                                />
                                <Area type="monotone" dataKey="promedio" stroke={trendColor} strokeWidth={2.5}
                                    fill="url(#colorEnergy)"
                                    dot={{ fill: trendColor, r: 5, strokeWidth: 2, stroke: "#fff" }}
                                    connectNulls />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>

            {/* Alertas */}
            {alertsEnriched.length > 0 && (
                <Card className="border-0 shadow-sm border-l-4 border-l-red-400">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                            <CardTitle className="text-base text-red-700">
                                Estudiantes que necesitan atención
                            </CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {alertsEnriched.map(alert => (
                            <div key={alert.id} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                                <span className="text-lg mt-0.5">⚠️</span>
                                <div>
                                    <p className="font-medium text-slate-800 text-sm">{alert.studentName}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">{alert.description}</p>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Lista estudiantes */}
            <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-500" />
                        <CardTitle className="text-base">Estudiantes del curso</CardTitle>
                    </div>
                    <CardDescription>Último estado emocional registrado</CardDescription>
                </CardHeader>
                <CardContent>
                    {filteredStudents.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-6">No hay estudiantes en este curso</p>
                    ) : (
                        <div className="space-y-2">
                            {filteredStudents.map(student => {
                                const emoConfig = student.lastEmotion
                                    ? EMOTION_CONFIG[student.lastEmotion as keyof typeof EMOTION_CONFIG]
                                    : null
                                return (
                                    <div key={student.id}
                                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-600">
                                                {student.name[0]}{student.last_name[0]}
                                            </div>
                                            <p className="font-medium text-slate-800 text-sm">
                                                {student.name} {student.last_name}
                                            </p>
                                        </div>
                                        {emoConfig ? (
                                            <span className={`text-sm font-medium ${emoConfig.color}`}>
                                                {emoConfig.emoji} {emoConfig.label}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-slate-400 italic">Sin registro</span>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

        </div>
    )
}
