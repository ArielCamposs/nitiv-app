"use client"

import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer,
} from "recharts"
import { useState, useMemo } from "react"

const ENERGY_SCORE: Record<string, number> = {
    explosiva: 1, apatica: 2, inquieta: 3, regulada: 4,
}

const ENERGY_LABEL: Record<number, string> = {
    1: "Explosiva", 2: "Apática", 3: "Inquieta", 4: "Regulada",
}

const ENERGY_LABEL_TEXT: Record<string, string> = {
    explosiva: "Explosiva",
    apatica: "Apática",
    inquieta: "Inquieta",
    regulada: "Regulada",
}

const COURSE_COLORS = [
    "#6366f1", "#10b981", "#f59e0b", "#ef4444",
    "#8b5cf6", "#06b6d4", "#ec4899",
]

const RANGES = [
    { label: "30 días", value: 30 },
    { label: "60 días", value: 60 },
    { label: "90 días", value: 90 },
]

interface Props {
    courses: any[]
    historyLogs: any[]
}

function buildChartData(courses: any[], logs: any[], days: number) {
    if (logs.length === 0) return []

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)

    const filtered = logs.filter(
        (l) => new Date(l.log_date + "T12:00:00") >= cutoff
    )

    const weekMap: Record<string, Record<string, number[]>> = {}

    filtered.forEach((log) => {
        const date = new Date(log.log_date + "T12:00:00")
        const day = date.getDay()
        const diff = date.getDate() - day + (day === 0 ? -6 : 1)
        const monday = new Date(date.setDate(diff))
        const weekKey = monday.toISOString().split("T")[0]

        if (!weekMap[weekKey]) weekMap[weekKey] = {}
        if (!weekMap[weekKey][log.course_id]) weekMap[weekKey][log.course_id] = []
        weekMap[weekKey][log.course_id].push(ENERGY_SCORE[log.energy_level] ?? 3)
    })

    return Object.entries(weekMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([week, courseLogs]) => {
            const point: Record<string, any> = {
                semana: new Date(week + "T12:00:00").toLocaleDateString("es-CL", {
                    day: "numeric", month: "short",
                }),
            }
            courses.forEach((c) => {
                const vals = courseLogs[c.course_id]
                point[c.courses?.name ?? c.course_id] = vals
                    ? parseFloat((vals.reduce((a: number, b: number) => a + b, 0) / vals.length).toFixed(2))
                    : null
            })
            return point
        })
}

function buildSummary(courses: any[], logs: any[], days: number) {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)

    const filtered = logs.filter(
        (l) => new Date(l.log_date + "T12:00:00") >= cutoff
    )

    if (filtered.length === 0) return null

    const courseAverages = courses.map((c) => {
        const courseLogs = filtered.filter((l) => l.course_id === c.course_id)
        if (courseLogs.length === 0) return { name: c.courses?.name ?? "?", avg: null, count: 0 }
        const avg = courseLogs.reduce((a: number, l: any) => a + (ENERGY_SCORE[l.energy_level] ?? 3), 0) / courseLogs.length
        return { name: c.courses?.name ?? "?", avg, count: courseLogs.length }
    }).filter((c) => c.avg !== null)

    if (courseAverages.length === 0) return null

    const best = [...courseAverages].sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0))[0]
    const worst = [...courseAverages].sort((a, b) => (a.avg ?? 0) - (b.avg ?? 0))[0]
    const total = filtered.length

    const freqMap: Record<string, number> = {}
    filtered.forEach((l: any) => { freqMap[l.energy_level] = (freqMap[l.energy_level] ?? 0) + 1 })
    const mostFrequent = Object.entries(freqMap).sort((a, b) => b[1] - a[1])[0][0]

    return { best, worst, total, mostFrequent, courseCount: courseAverages.length }
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-sm space-y-1 min-w-[160px]">
            <p className="font-semibold text-slate-700 mb-2">Semana del {label}</p>
            {payload.map((entry: any) => (
                <div key={entry.name} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
                        <span className="text-slate-600 truncate max-w-[100px]">{entry.name}</span>
                    </div>
                    <span className="font-medium" style={{ color: entry.color }}>
                        {entry.value !== null
                            ? ENERGY_LABEL[Math.round(entry.value)] ?? entry.value
                            : "—"}
                    </span>
                </div>
            ))}
        </div>
    )
}

export function ClimateHistoryChart({ courses, historyLogs }: Props) {
    const [activeCourse, setActiveCourse] = useState<string | null>(null)
    const [days, setDays] = useState(30)

    const chartData = useMemo(
        () => buildChartData(courses, historyLogs, days),
        [courses, historyLogs, days]
    )

    const isEmpty = chartData.length === 0

    return (
        <div className="bg-white rounded-2xl border p-5 space-y-4">

            {/* Header + selector de rango */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h2 className="text-base font-semibold text-slate-800">
                        Evolución del clima por curso
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                        Energía promedio semanal
                    </p>
                </div>

                {/* Selector 30 / 60 / 90 días */}
                <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
                    {RANGES.map((r) => (
                        <button
                            key={r.value}
                            onClick={() => setDays(r.value)}
                            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${days === r.value
                                ? "bg-white text-slate-800 shadow-sm"
                                : "text-slate-500 hover:text-slate-700"
                                }`}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Selector de curso */}
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => setActiveCourse(null)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${activeCourse === null
                        ? "bg-slate-800 text-white border-slate-800"
                        : "text-slate-500 border-slate-200 hover:border-slate-400"
                        }`}
                >
                    Todos
                </button>
                {courses.map((c, i) => {
                    const name = c.courses?.name ?? c.course_id
                    return (
                        <button
                            key={c.course_id}
                            onClick={() => setActiveCourse(activeCourse === name ? null : name)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${activeCourse === name
                                ? "text-white border-transparent"
                                : "text-slate-500 border-slate-200 hover:border-slate-400"
                                }`}
                            style={
                                activeCourse === name
                                    ? { background: COURSE_COLORS[i % COURSE_COLORS.length] }
                                    : {}
                            }
                        >
                            {name}
                        </button>
                    )
                })}
            </div>

            {/* Gráfico o estado vacío */}
            {isEmpty ? (
                <div className="flex flex-col items-center justify-center h-52 text-slate-400 gap-3">
                    <span className="text-5xl">📭</span>
                    <p className="text-sm">Sin registros en los últimos {days} días</p>
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            {courses.map((c, i) => (
                                <linearGradient key={c.course_id} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={COURSE_COLORS[i % COURSE_COLORS.length]} stopOpacity={0.15} />
                                    <stop offset="95%" stopColor={COURSE_COLORS[i % COURSE_COLORS.length]} stopOpacity={0} />
                                </linearGradient>
                            ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis
                            dataKey="semana"
                            tick={{ fontSize: 11, fill: "#94a3b8" }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            domain={[1, 4]}
                            ticks={[1, 2, 3, 4]}
                            tickFormatter={(v) => ENERGY_LABEL[v]?.slice(0, 3) ?? v}
                            tick={{ fontSize: 10, fill: "#94a3b8" }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        {courses.map((c, i) => {
                            const name = c.courses?.name ?? c.course_id
                            const isActive = activeCourse === null || activeCourse === name
                            return (
                                <Area
                                    key={c.course_id}
                                    type="monotone"
                                    dataKey={name}
                                    stroke={COURSE_COLORS[i % COURSE_COLORS.length]}
                                    strokeWidth={isActive ? 2.5 : 0.5}
                                    fill={`url(#grad-${i})`}
                                    fillOpacity={isActive ? 1 : 0}
                                    dot={{ r: 3, fill: COURSE_COLORS[i % COURSE_COLORS.length] }}
                                    activeDot={{ r: 5 }}
                                    connectNulls
                                    opacity={isActive ? 1 : 0.2}
                                />
                            )
                        })}
                    </AreaChart>
                </ResponsiveContainer>
            )}

            {/* Leyenda */}
            <div className="flex flex-wrap gap-4 pt-2 border-t border-slate-100">
                {[
                    { label: "Regulada", color: "#10b981" },
                    { label: "Inquieta", color: "#f59e0b" },
                    { label: "Apática", color: "#6366f1" },
                    { label: "Explosiva", color: "#ef4444" },
                ].map((e) => (
                    <div key={e.label} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: e.color }} />
                        <span className="text-xs text-slate-400">{e.label}</span>
                    </div>
                ))}
            </div>

            {/* Resumen textual */}
            {!isEmpty && (() => {
                const summary = buildSummary(courses, historyLogs, days)
                if (!summary) return null
                const mostFreqLabel = ENERGY_LABEL_TEXT[summary.mostFrequent] ?? summary.mostFrequent
                return (
                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 space-y-2 text-sm text-slate-600">
                        <p className="font-semibold text-slate-700 text-xs uppercase tracking-wide">
                            Resumen del período
                        </p>
                        <ul className="space-y-1.5">
                            <li className="flex items-start gap-2">
                                <span>📋</span>
                                <span>
                                    Registraste <strong>{summary.total}</strong> registros en los últimos{" "}
                                    <strong>{days} días</strong>.
                                </span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span>📈</span>
                                <span>
                                    El clima predominante fue{" "}
                                    <strong>{mostFreqLabel}</strong>.
                                </span>
                            </li>
                            {summary.courseCount > 1 && (
                                <>
                                    <li className="flex items-start gap-2">
                                        <span>✅</span>
                                        <span>
                                            Tu curso más estable fue{" "}
                                            <strong>{summary.best.name}</strong>{" "}
                                            <span className="text-slate-400">
                                                (promedio {ENERGY_LABEL[Math.round(summary.best.avg ?? 0)]})
                                            </span>.
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span>⚠️</span>
                                        <span>
                                            El curso con mayor desafío fue{" "}
                                            <strong>{summary.worst.name}</strong>{" "}
                                            <span className="text-slate-400">
                                                (promedio {ENERGY_LABEL[Math.round(summary.worst.avg ?? 0)]})
                                            </span>.
                                        </span>
                                    </li>
                                </>
                            )}
                            {summary.courseCount === 1 && (
                                <li className="flex items-start gap-2">
                                    <span>✅</span>
                                    <span>
                                        Promedio general:{" "}
                                        <strong>
                                            {ENERGY_LABEL[Math.round(summary.best.avg ?? 0)]}
                                        </strong>.
                                    </span>
                                </li>
                            )}
                        </ul>
                    </div>
                )
            })()}
        </div>
    )
}
