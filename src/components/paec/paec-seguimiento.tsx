"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Props = {
    paec: any
    userRole: string
}

export function PaecSeguimiento({ paec, userRole }: Props) {
    const router = useRouter()
    const supabase = createClient()
    const [loading, setLoading] = useState(false)

    const canEdit = ["dupla", "director"].includes(userRole)

    const [reviewDate, setReviewDate] = useState(
        paec.review_date ? paec.review_date.split("T")[0] : ""
    )
    const [requiresAdjustments, setRequiresAdjustments] = useState(
        paec.requires_adjustments ?? false
    )

    const handleSave = async () => {
        setLoading(true)
        const { error } = await supabase
            .from("paec")
            .update({
                review_date: reviewDate || null,
                requires_adjustments: requiresAdjustments,
                updated_at: new Date().toISOString(),
            })
            .eq("id", paec.id)

        if (error) {
            toast.error("Error al guardar seguimiento.")
        } else {
            toast.success("Seguimiento actualizado.")
            router.refresh()
        }
        setLoading(false)
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Seguimiento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

                {/* Fechas */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-xs text-slate-400">Fecha elaboración</p>
                        <p className="font-medium">
                            {new Date(paec.created_at).toLocaleDateString("es-CL", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                            })}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-400">Última actualización</p>
                        <p className="font-medium">
                            {new Date(paec.updated_at).toLocaleDateString("es-CL", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                            })}
                        </p>
                    </div>
                </div>

                {/* Fecha de revisión */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-900">
                        Próxima fecha de revisión
                    </label>
                    {canEdit ? (
                        <Input
                            type="date"
                            value={reviewDate}
                            onChange={(e) => setReviewDate(e.target.value)}
                        />
                    ) : (
                        <p className="text-sm text-slate-700">
                            {paec.review_date
                                ? new Date(paec.review_date).toLocaleDateString("es-CL", {
                                    day: "2-digit",
                                    month: "long",
                                    year: "numeric",
                                })
                                : "No definida"}
                        </p>
                    )}
                </div>

                {/* Estado del plan */}
                <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-900">Estado del plan</p>
                    {canEdit ? (
                        <div className="flex gap-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="adjustment"
                                    checked={!requiresAdjustments}
                                    onChange={() => setRequiresAdjustments(false)}
                                    className="h-4 w-4"
                                />
                                <span className="text-sm text-slate-700">Se mantiene</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="adjustment"
                                    checked={requiresAdjustments}
                                    onChange={() => setRequiresAdjustments(true)}
                                    className="h-4 w-4"
                                />
                                <span className="text-sm text-slate-700">Requiere ajustes</span>
                            </label>
                        </div>
                    ) : (
                        <Badge
                            className={
                                paec.requires_adjustments
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-emerald-100 text-emerald-700"
                            }
                        >
                            {paec.requires_adjustments ? "Requiere ajustes" : "Se mantiene"}
                        </Badge>
                    )}
                </div>

                {/* Alerta si requiere ajustes */}
                {paec.requires_adjustments && (
                    <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                        ⚠️ Este PAEC requiere ajustes. Edita el plan para actualizarlo.
                    </div>
                )}

                {/* Alerta si revisión vencida */}
                {paec.review_date && new Date(paec.review_date) < new Date() && (
                    <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
                        🔴 La fecha de revisión está vencida desde el{" "}
                        {new Date(paec.review_date).toLocaleDateString("es-CL")}
                    </div>
                )}

                {canEdit && (
                    <div className="flex justify-end">
                        <Button onClick={handleSave} disabled={loading} size="sm">
                            {loading ? "Guardando..." : "Guardar seguimiento"}
                        </Button>
                    </div>
                )}

            </CardContent>
        </Card>
    )
}
