"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type Alert = {
    id: string
    type: string
    description: string
    resolved: boolean
    created_at: string
    students: {
        name: string
        last_name: string
        courses: { name: string } | null
    } | null
}

const ALERT_META: Record<
    string,
    { label: string; color: string; border: string }
> = {
    registros_negativos: {
        label: "Registros negativos",
        color: "bg-rose-100 text-rose-700",
        border: "border-rose-200",
    },
    discrepancia_docente: {
        label: "Discrepancia docente",
        color: "bg-amber-100 text-amber-700",
        border: "border-amber-200",
    },
    sin_registro: {
        label: "Sin registro",
        color: "bg-slate-100 text-slate-600",
        border: "border-slate-200",
    },
    dec_repetido: {
        label: "DEC repetido",
        color: "bg-purple-100 text-purple-700",
        border: "border-purple-200",
    },
}

type Props = {
    alert: Alert
    onResolved: (id: string) => void
}

export function AlertCard({ alert, onResolved }: Props) {
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const meta = ALERT_META[alert.type] ?? {
        label: alert.type,
        color: "bg-slate-100 text-slate-600",
        border: "border-slate-200",
    }

    const handleResolve = async () => {
        try {
            setLoading(true)

            const { error } = await supabase
                .from("alerts")
                .update({
                    resolved: true,
                    resolved_at: new Date().toISOString(),
                })
                .eq("id", alert.id)

            if (error) {
                toast.error("No se pudo marcar como resuelta.")
                return
            }

            toast.success("Alerta marcada como resuelta.")
            onResolved(alert.id)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card className={`border ${meta.border}`}>
            <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm font-semibold text-slate-900">
                        {alert.students
                            ? `${alert.students.last_name}, ${alert.students.name}`
                            : "Estudiante desconocido"}
                    </CardTitle>
                    <Badge className={`text-[10px] shrink-0 ${meta.color}`}>
                        {meta.label}
                    </Badge>
                </div>
                {alert.students?.courses?.name && (
                    <p className="text-xs text-slate-400">
                        {alert.students.courses.name}
                    </p>
                )}
            </CardHeader>

            <CardContent className="pb-2">
                <p className="text-xs text-slate-600">{alert.description}</p>
                <p className="mt-1 text-[10px] text-slate-400">
                    {new Date(alert.created_at).toLocaleDateString("es-CL", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                    })}
                </p>
            </CardContent>

            <CardFooter>
                <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs"
                    onClick={handleResolve}
                    disabled={loading}
                >
                    {loading ? "Guardando..." : "Marcar como resuelta"}
                </Button>
            </CardFooter>
        </Card>
    )
}
