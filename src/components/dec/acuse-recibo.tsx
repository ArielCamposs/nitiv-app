"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export function AcuseRecibo({ recipientId }: { recipientId: string }) {
    const supabase = createClient()
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    const handleAcuse = async () => {
        try {
            setLoading(true)

            const { error } = await supabase
                .from("incident_recipients")
                .update({
                    seen: true,
                    seen_at: new Date().toISOString(),
                })
                .eq("id", recipientId)

            if (error) {
                toast.error("No se pudo registrar el acuse de recibo.")
                return
            }

            toast.success("Acuse de recibo registrado. El reportante será notificado.")
            router.refresh()
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card className="border-indigo-200 bg-indigo-50">
            <CardContent className="flex items-center justify-between py-4 px-4">
                <div>
                    <p className="text-sm font-semibold text-indigo-900">
                        Tienes un caso DEC pendiente de acuse
                    </p>
                    <p className="text-xs text-indigo-600">
                        Al confirmar, el reportante sabrá que tomaste conocimiento del caso.
                    </p>
                </div>
                <Button
                    onClick={handleAcuse}
                    disabled={loading}
                    className="shrink-0 bg-indigo-600 hover:bg-indigo-700"
                >
                    {loading ? "Confirmando..." : "Enterado ✓"}
                </Button>
            </CardContent>
        </Card>
    )
}
