"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

const ENERGY_CONFIG = {
    regulada: { label: "Regulada", emoji: "😊", bg: "bg-emerald-400", text: "text-emerald-700" },
    inquieta: { label: "Inquieta", emoji: "😤", bg: "bg-amber-400", text: "text-amber-700" },
    apatica: { label: "Apática", emoji: "😴", bg: "bg-gray-400", text: "text-gray-600" },
    explosiva: { label: "Explosiva", emoji: "🔥", bg: "bg-red-500", text: "text-red-700" },
} as const

const SCORE_COLOR = (avg: number | null) => {
    if (avg === null) return "bg-slate-100 text-slate-400"
    if (avg >= 3.5) return "bg-emerald-100 text-emerald-700"
    if (avg >= 2.5) return "bg-amber-100 text-amber-700"
    if (avg >= 1.5) return "bg-gray-100 text-gray-600"
    return "bg-red-100 text-red-700"
}

const SCORE_LABEL = (avg: number | null) => {
    if (avg === null) return "Sin datos"
    if (avg >= 3.5) return "Regulada"
    if (avg >= 2.5) return "Inquieta"
    if (avg >= 1.5) return "Apática"
    return "Explosiva"
}

interface DayCell { day: string; energy: string | null; score: number | null }
interface WeekCell { week: string; energy: string | null; score: number | null; registros: number }

interface ByDayCourse { courseId: string; courseName: string; cells: DayCell[]; avg: number | null }
interface ByWeekCourse { courseId: string; courseName: string; cells: WeekCell[]; avg: number | null }

interface Props {
    byDay: ByDayCourse[]
    byWeek: ByWeekCourse[]
}

const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie"]
const WEEK_NAMES = ["S1", "S2", "S3", "S4"]

export function InstitutionalHeatmap({ byDay, byWeek }: Props) {
    const [tab, setTab] = useState<"day" | "week">("week")

    const isEmpty = tab === "day"
        ? byDay.every(c => c.cells.every(d => d.energy === null))
        : byWeek.every(c => c.cells.every(w => w.energy === null))

    return (
        <div className="space-y-4">

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-slate-100 rounded-lg w-fit">
                {[
                    { key: "week", label: "Últimas 4 semanas" },
                    { key: "day", label: "Semana actual" },
                ].map(t => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key as "day" | "week")}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${tab === t.key
                            ? "bg-white text-slate-800 shadow-sm"
                            : "text-slate-500 hover:text-slate-700"
                            }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Heatmap */}
            <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                        {tab === "week" ? "Clima por curso — últimas 4 semanas" : "Clima por curso — semana actual"}
                    </CardTitle>
                    <CardDescription>
                        {tab === "week"
                            ? "Energía promedio registrada por docentes cada semana"
                            : "Energía registrada por docentes cada día de esta semana"}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isEmpty ? (
                        <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-2">
                            <span className="text-4xl">📭</span>
                            <p className="text-sm">No hay registros de clima aún</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[420px]">
                                <thead>
                                    <tr>
                                        {/* Nombre curso */}
                                        <th className="text-left text-xs font-medium text-slate-400 pb-3 pr-3 w-32">
                                            Curso
                                        </th>
                                        {/* Columnas */}
                                        {(tab === "week" ? WEEK_NAMES : DAY_NAMES).map(col => (
                                            <th key={col} className="text-xs font-medium text-slate-400 text-center pb-3 px-1">
                                                {col}
                                            </th>
                                        ))}
                                        {/* Promedio */}
                                        <th className="text-xs font-medium text-slate-400 text-center pb-3 pl-3 w-24">
                                            Promedio
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="space-y-1">
                                    {(tab === "week" ? byWeek : byDay).map(course => (
                                        <tr key={course.courseId}>
                                            <td className="text-sm font-medium text-slate-700 pr-3 py-1.5 truncate max-w-[120px]">
                                                {course.courseName}
                                            </td>
                                            {course.cells.map((cell, i) => {
                                                const cfg = cell.energy
                                                    ? ENERGY_CONFIG[cell.energy as keyof typeof ENERGY_CONFIG]
                                                    : null
                                                return (
                                                    <td key={i} className="px-1 py-1.5">
                                                        <div
                                                            title={cfg?.label ?? "Sin registro"}
                                                            className={`h-10 w-full rounded-lg flex items-center justify-center text-lg transition-all
                                                                ${cfg ? `${cfg.bg} opacity-80` : "bg-slate-100"}`}
                                                        >
                                                            {cfg?.emoji ?? ""}
                                                        </div>
                                                    </td>
                                                )
                                            })}
                                            {/* Promedio del curso */}
                                            <td className="pl-3 py-1.5">
                                                <div className={`rounded-lg px-2 py-1 text-center text-xs font-medium ${SCORE_COLOR(course.avg)}`}>
                                                    {SCORE_LABEL(course.avg)}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Leyenda */}
                    <div className="flex flex-wrap gap-4 mt-5 pt-4 border-t border-slate-100">
                        {Object.entries(ENERGY_CONFIG).map(([, cfg]) => (
                            <div key={cfg.label} className="flex items-center gap-1.5">
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

        </div>
    )
}
