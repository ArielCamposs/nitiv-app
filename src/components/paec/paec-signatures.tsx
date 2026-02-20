"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Props = {
    paec: any
    userRole: string
}

export function PaecSignatures({ paec, userRole }: Props) {
    const router = useRouter()
    const supabase = createClient()
    const [loading, setLoading] = useState(false)

    const canSign = ["dupla", "director"].includes(userRole)

    const handleSign = async (
        field: "representative_signed" | "guardian_signed"
    ) => {
        setLoading(true)
        const { error } = await supabase
            .from("paec")
            .update({
                [field]: true,
                [`${field}_at`]: new Date().toISOString(),
            })
            .eq("id", paec.id)

        if (error) {
            toast.error("Error al registrar firma.")
        } else {
            toast.success("Firma registrada correctamente.")
            router.refresh()
        }
        setLoading(false)
    }

    const handleUnsign = async (
        field: "representative_signed" | "guardian_signed"
    ) => {
        setLoading(true)
        const { error } = await supabase
            .from("paec")
            .update({
                [field]: false,
                [`${field}_at`]: null,
            })
            .eq("id", paec.id)

        if (error) {
            toast.error("Error al anular firma.")
        } else {
            toast.success("Firma anulada.")
            router.refresh()
        }
        setLoading(false)
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Firmas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

                {/* Firma representante establecimiento */}
                <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                        <p className="text-sm font-medium text-slate-900">
                            Representante del establecimiento
                        </p>
                        {paec.representative_signed && paec.representative_signed_at && (
                            <p className="text-xs text-slate-400 mt-0.5">
                                Firmado el{" "}
                                {new Date(paec.representative_signed_at).toLocaleDateString(
                                    "es-CL",
                                    { day: "2-digit", month: "short", year: "numeric" }
                                )}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {paec.representative_signed ? (
                            <>
                                <Badge className="bg-emerald-100 text-emerald-700">
                                    Firmado ✓
                                </Badge>
                                {canSign && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-red-500 hover:text-red-700 text-xs"
                                        onClick={() => handleUnsign("representative_signed")}
                                        disabled={loading}
                                    >
                                        Anular
                                    </Button>
                                )}
                            </>
                        ) : canSign ? (
                            <Button
                                size="sm"
                                onClick={() => handleSign("representative_signed")}
                                disabled={loading}
                            >
                                Firmar
                            </Button>
                        ) : (
                            <Badge className="bg-amber-100 text-amber-700">
                                Pendiente
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Firma apoderado */}
                <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                        <p className="text-sm font-medium text-slate-900">
                            Apoderado/a
                            {paec.guardian_name ? ` — ${paec.guardian_name}` : ""}
                        </p>
                        {paec.guardian_signed && paec.guardian_signed_at && (
                            <p className="text-xs text-slate-400 mt-0.5">
                                Firmado el{" "}
                                {new Date(paec.guardian_signed_at).toLocaleDateString(
                                    "es-CL",
                                    { day: "2-digit", month: "short", year: "numeric" }
                                )}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {paec.guardian_signed ? (
                            <>
                                <Badge className="bg-emerald-100 text-emerald-700">
                                    Firmado ✓
                                </Badge>
                                {canSign && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-red-500 hover:text-red-700 text-xs"
                                        onClick={() => handleUnsign("guardian_signed")}
                                        disabled={loading}
                                    >
                                        Anular
                                    </Button>
                                )}
                            </>
                        ) : canSign ? (
                            <Button
                                size="sm"
                                onClick={() => handleSign("guardian_signed")}
                                disabled={loading}
                            >
                                Firmar
                            </Button>
                        ) : (
                            <Badge className="bg-amber-100 text-amber-700">
                                Pendiente
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Estado general */}
                <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                    {paec.representative_signed && paec.guardian_signed ? (
                        <p className="text-emerald-700 font-medium">
                            ✅ PAEC completamente firmado
                        </p>
                    ) : (
                        <p className="text-amber-700">
                            ⚠️ Faltan{" "}
                            {!paec.representative_signed && !paec.guardian_signed
                                ? "ambas firmas"
                                : !paec.representative_signed
                                    ? "la firma del establecimiento"
                                    : "la firma del apoderado"}
                        </p>
                    )}
                </div>

            </CardContent>
        </Card>
    )
}
