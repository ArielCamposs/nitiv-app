import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

type Paec = {
    id: string
    student_id: string
    created_at: string
    review_date: string | null
    active: boolean
    representative_signed: boolean
    guardian_signed: boolean
    students: {
        name: string
        last_name: string
        rut: string | null
        courses: { name: string; level: string } | null
    } | null
}

type Props = {
    paecs: Paec[]
}

export function PaecList({ paecs }: Props) {
    if (paecs.length === 0) {
        return (
            <div className="rounded-lg border border-dashed border-slate-200 py-12 text-center">
                <p className="text-sm text-slate-400">
                    No hay PAEC registrados todavía.
                </p>
            </div>
        )
    }

    return (
        <div className="grid gap-3 sm:grid-cols-2">
            {paecs.map((paec) => (
                <Link key={paec.id} href={`/paec/${paec.id}`}>
                    <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
                        <CardContent className="py-4 px-4 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-900 truncate">
                                        {paec.students
                                            ? `${paec.students.last_name}, ${paec.students.name}`
                                            : "Estudiante desconocido"}
                                    </p>
                                    <p className="text-xs text-slate-400">
                                        {paec.students?.courses?.name ?? "Sin curso"}
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-1">
                                {paec.representative_signed && (
                                    <Badge className="text-[10px] bg-emerald-100 text-emerald-700">
                                        Firmado establecimiento ✓
                                    </Badge>
                                )}
                                {paec.guardian_signed && (
                                    <Badge className="text-[10px] bg-emerald-100 text-emerald-700">
                                        Firmado apoderado ✓
                                    </Badge>
                                )}
                                {(!paec.representative_signed || !paec.guardian_signed) && (
                                    <Badge className="text-[10px] bg-amber-100 text-amber-700">
                                        Pendiente firma
                                    </Badge>
                                )}
                            </div>

                            <p className="text-xs text-slate-400">
                                Creado:{" "}
                                {new Date(paec.created_at).toLocaleDateString("es-CL", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                })}
                            </p>

                            {paec.review_date && (
                                <p className="text-xs text-slate-400">
                                    Próxima revisión:{" "}
                                    {new Date(paec.review_date).toLocaleDateString("es-CL", {
                                        day: "2-digit",
                                        month: "short",
                                    })}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </Link>
            ))}
        </div>
    )
}
