import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

type DecCase = {
    id: string
    folio: string
    type: string
    severity: string
    location: string | null
    incident_date: string
    resolved: boolean
    students: {
        name: string
        last_name: string
        courses: { name: string } | null
    } | null
    users: { name: string; last_name: string } | null
}

const SEVERITY_META = {
    moderada: { label: "Etapa 2 — Moderada", color: "bg-amber-100 text-amber-700 border-amber-200" },
    severa: { label: "Etapa 3 — Severa", color: "bg-rose-100 text-rose-700 border-rose-200" },
}

const TYPE_LABELS: Record<string, string> = {
    DEC: "Desregulación Emocional",
    agresion_fisica: "Agresión Física",
    agresion_verbal: "Agresión Verbal",
    bullying: "Bullying",
    acoso: "Acoso",
    consumo: "Consumo",
    autoagresion: "Autoagresión",
    otro: "Otro",
}

export function DecCard({ dec }: { dec: DecCase }) {
    const severity = SEVERITY_META[dec.severity as keyof typeof SEVERITY_META]

    return (
        <Link href={`/dec/${dec.id}`}>
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="py-4 px-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <p className="text-sm font-semibold text-slate-900">
                                {dec.students
                                    ? `${dec.students.last_name}, ${dec.students.name}`
                                    : "Estudiante desconocido"}
                            </p>
                            <p className="text-xs text-slate-400">
                                {dec.students?.courses?.name ?? "Sin curso"} ·{" "}
                                {dec.folio ?? "Sin folio"}
                            </p>
                        </div>
                        <Badge className={`text-[10px] shrink-0 border ${severity?.color}`}>
                            {severity?.label ?? dec.severity}
                        </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600">
                            {TYPE_LABELS[dec.type] ?? dec.type}
                        </span>
                        <span className="text-xs text-slate-400">
                            {new Date(dec.incident_date).toLocaleDateString("es-CL", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        </span>
                    </div>

                    {dec.location && (
                        <p className="text-xs text-slate-400">📍 {dec.location}</p>
                    )}

                    <p className="text-xs text-slate-400">
                        Reportado por:{" "}
                        {dec.users ? `${dec.users.name} ${dec.users.last_name}` : "Desconocido"}
                    </p>
                </CardContent>
            </Card>
        </Link>
    )
}
