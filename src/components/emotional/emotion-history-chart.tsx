"use client"

import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

const SCORE_LABEL: Record<number, string> = {
    1: "Muy mal 😞",
    2: "Mal 😢",
    3: "Neutral 😐",
    4: "Bien 🙂",
    5: "Muy bien 🤩",
}

const MOTIVACIONAL_MESSAGES = [
    "¡Vas por buen camino! Tu bienestar está mejorando semana a semana. 💪",
    "¡Se nota el esfuerzo! Cada día que registras es un paso hacia adelante. 🌟",
    "¡Sigue así! Tu actitud positiva está marcando la diferencia. 🚀",
    "¡Qué buena racha! Recuerda que la dupla siempre está aquí para apoyarte. 🤝",
    "¡Excelente evolución! Estás demostrando una gran fortaleza emocional. 🌈",
]

interface ChartPoint {
    semana: string
    promedio: number | null
    registros: number
}

interface Props {
    chartData: ChartPoint[]
    tendencia: "mejorando" | "empeorando" | "estable"
    totalRegistros: number
    nombre: string
}

function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length || payload[0].value == null) return null
    const val = payload[0].value as number
    const label2 = SCORE_LABEL[Math.round(val)] ?? `${val}/5`
    return (
        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-md text-sm">
            <p className="font-semibold text-slate-700">{label}</p>
            <p className="text-slate-500">Promedio: <span className="font-bold text-slate-800">{label2}</span></p>
            <p className="text-slate-400 text-xs">{payload[0].payload.registros} registros</p>
        </div>
    )
}

export function EmotionHistoryChart({ chartData, tendencia, totalRegistros, nombre }: Props) {
    const mensaje = MOTIVACIONAL_MESSAGES[
        Math.floor(Math.random() * MOTIVACIONAL_MESSAGES.length)
    ]

    const color =
        tendencia === "mejorando" ? "#10b981" :
            tendencia === "empeorando" ? "#ef4444" :
                "#6b7280"

    const TrendIcon =
        tendencia === "mejorando" ? TrendingUp :
            tendencia === "empeorando" ? TrendingDown :
                Minus

    const trendLabel =
        tendencia === "mejorando" ? "Mejorando 🎉" :
            tendencia === "empeorando" ? "Necesita atención ⚠️" :
                "Estable 😌"

    const sinDatos = chartData.every(d => d.promedio === null)

    return (
        <div className="space-y-4">

            {/* Mensaje motivador — solo si mejora */}
            {tendencia === "mejorando" && (
                <div className="rounded-xl bg-linear-to-r from-emerald-50 to-green-50 border border-emerald-200 p-4 flex items-start gap-3">
                    <span className="text-2xl">🌟</span>
                    <div>
                        <p className="font-semibold text-emerald-800">¡Hola, {nombre}!</p>
                        <p className="text-emerald-700 text-sm mt-0.5">{mensaje}</p>
                    </div>
                </div>
            )}

            {/* Mensaje de atención — si empeora */}
            {tendencia === "empeorando" && (
                <div className="rounded-xl bg-linear-to-r from-rose-50 to-red-50 border border-rose-200 p-4 flex items-start gap-3">
                    <span className="text-2xl">💙</span>
                    <div>
                        <p className="font-semibold text-rose-800">¿Cómo estás, {nombre}?</p>
                        <p className="text-rose-700 text-sm mt-0.5">
                            Hemos notado que has tenido días difíciles últimamente. Recuerda que no estás solo/a — la dupla está aquí para ti.
                        </p>
                    </div>
                </div>
            )}

            {/* Tarjetas de resumen */}
            <div className="grid grid-cols-2 gap-3">
                <Card className="border-0 shadow-sm">
                    <CardContent className="pt-4 pb-3">
                        <p className="text-xs text-slate-500 mb-1">Tendencia (4 semanas)</p>
                        <div className="flex items-center gap-2">
                            <TrendIcon className="w-5 h-5" style={{ color }} />
                            <span className="font-semibold text-slate-800 text-sm">{trendLabel}</span>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="pt-4 pb-3">
                        <p className="text-xs text-slate-500 mb-1">Registros del período</p>
                        <p className="font-semibold text-slate-800 text-sm">
                            {totalRegistros} {totalRegistros === 1 ? "registro" : "registros"}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Gráfico */}
            <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Evolución emocional</CardTitle>
                    <CardDescription>Últimas 4 semanas</CardDescription>
                </CardHeader>
                <CardContent>
                    {sinDatos ? (
                        <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-2">
                            <span className="text-4xl">📭</span>
                            <p className="text-sm">Aún no hay registros suficientes</p>
                            <p className="text-xs">Registra tu emoción diaria para ver tu historial</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorPromedio" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="semana"
                                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    domain={[1, 5]}
                                    ticks={[1, 2, 3, 4, 5]}
                                    tickFormatter={(v) => ["", "😞", "😢", "😐", "🙂", "🤩"][v] ?? v}
                                    tick={{ fontSize: 13 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <ReferenceLine y={3} stroke="#e2e8f0" strokeDasharray="4 4" />
                                <Area
                                    type="monotone"
                                    dataKey="promedio"
                                    stroke={color}
                                    strokeWidth={2.5}
                                    fill="url(#colorPromedio)"
                                    dot={{ fill: color, r: 5, strokeWidth: 2, stroke: "#fff" }}
                                    activeDot={{ r: 7 }}
                                    connectNulls
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>

            {/* Leyenda */}
            <div className="flex justify-between text-xs text-slate-400 px-1">
                <span>1 = Muy mal 😞</span>
                <span>3 = Neutral 😐</span>
                <span>5 = Muy bien 🤩</span>
            </div>

        </div>
    )
}
