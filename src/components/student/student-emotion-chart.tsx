"use client"

import {
    LineChart, Line, XAxis, YAxis, Tooltip,
    ResponsiveContainer, Legend, CartesianGrid
} from "recharts"

const EMOTION_SCORE: Record<string, number> = {
    muy_mal: 1, mal: 2, neutral: 3, bien: 4, muy_bien: 5,
}
const EMOTION_LABEL: Record<number, string> = {
    1: "Muy mal", 2: "Mal", 3: "Neutral", 4: "Bien", 5: "Muy bien",
}

interface Log {
    emotion: string
    stress_level: number | null
    anxiety_level: number | null
    created_at: string
}

export function StudentEmotionChart({ logs }: { logs: Log[] }) {
    const data = logs.map((log) => ({
        fecha: new Date(log.created_at).toLocaleDateString("es-CL", {
            weekday: "short", day: "numeric",
        }),
        Emoción: EMOTION_SCORE[log.emotion] ?? 3,
        Estrés: log.stress_level ?? null,
        Ansiedad: log.anxiety_level ?? null,
    }))

    return (
        <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                <YAxis
                    domain={[1, 5]}
                    ticks={[1, 2, 3, 4, 5]}
                    tickFormatter={(v) => EMOTION_LABEL[v]?.split(" ")[1] ?? v}
                    tick={{ fontSize: 10 }}
                />
                <Tooltip
                    formatter={(value: any, name: any) =>
                        name === "Emoción"
                            ? [EMOTION_LABEL[value as number] ?? value, name]
                            : [`${value}/5`, name]
                    }
                />
                <Legend />
                <Line type="monotone" dataKey="Emoción" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="Estrés" stroke="#f97316" strokeWidth={2} dot={{ r: 4 }} strokeDasharray="4 2" />
                <Line type="monotone" dataKey="Ansiedad" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} strokeDasharray="2 2" />
            </LineChart>
        </ResponsiveContainer>
    )
}
