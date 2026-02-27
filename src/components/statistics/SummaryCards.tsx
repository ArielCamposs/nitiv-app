import { Card, CardContent } from "@/components/ui/card"

type Summary = {
    total_emotion_logs: number
    total_incidents: number
    total_activities: number
    low_emotion_courses: number
}

export function SummaryCards({ data }: { data: Summary }) {
    const items = [
        { label: "Registros emocionales", value: data.total_emotion_logs },
        { label: "Incidentes DEC", value: data.total_incidents },
        { label: "Actividades realizadas", value: data.total_activities },
        { label: "Cursos en riesgo", value: data.low_emotion_courses },
    ]

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {items.map((item) => (
                <Card key={item.label}>
                    <CardContent className="pt-4 text-center">
                        <p className="text-2xl font-bold text-indigo-600">
                            {item.value ?? "—"}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">{item.label}</p>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
