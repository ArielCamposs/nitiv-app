import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

type CourseRisk = {
    course_id: string
    course_name: string
    avg_score: number
    low_students: {
        student_id: string
        name: string
        avg_score: number
    }[]
}

function scoreColor(score: number) {
    if (score < 2) return "bg-red-100 text-red-700 border-red-200"
    if (score < 2.5) return "bg-amber-100 text-amber-700 border-amber-200"
    return "bg-emerald-100 text-emerald-700 border-emerald-200"
}

export function RiskCoursesSection({ courses }: { courses: CourseRisk[] }) {
    if (courses.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm">Cursos en riesgo</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-xs text-slate-400">
                        No hay cursos en riesgo para el período seleccionado.
                    </p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-sm">Cursos en riesgo (promedio emocional bajo)</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-3">
                {courses.map((c) => (
                    <div
                        key={c.course_id}
                        className="rounded-lg border p-3 bg-slate-50/60 flex flex-col gap-2"
                    >
                        <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold text-sm text-slate-800">
                                {c.course_name}
                            </p>
                            <span
                                className={
                                    "text-xs font-semibold px-2 py-0.5 rounded-full border " +
                                    scoreColor(c.avg_score)
                                }
                            >
                                Promedio {c.avg_score.toFixed(2)}
                            </span>
                        </div>

                        {c.low_students.length === 0 ? (
                            <p className="text-xs text-slate-400">
                                No hay estudiantes con datos suficientes en este período.
                            </p>
                        ) : (
                            <div className="space-y-1">
                                <p className="text-[11px] text-slate-500 font-medium">
                                    Estudiantes con promedio emocional más bajo
                                </p>
                                <ul className="space-y-1">
                                    {c.low_students.map((s) => (
                                        <li
                                            key={s.student_id}
                                            className="flex items-center justify-between text-xs"
                                        >
                                            <span className="truncate max-w-[60%]">
                                                {s.name}
                                            </span>
                                            <Badge
                                                variant="outline"
                                                className="text-[10px] px-1.5 py-0 border-amber-300 text-amber-700"
                                            >
                                                {s.avg_score.toFixed(2)}
                                            </Badge>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}
