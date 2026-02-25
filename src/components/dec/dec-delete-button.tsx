"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { logAdminAction } from "@/lib/admin/log-action"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

type Props = {
    incidentId: string
    folio?: string
    redirectTo?: string
    size?: "sm" | "default"
}

export function DecDeleteButton({ incidentId, folio, redirectTo, size = "sm" }: Props) {
    const router = useRouter()
    const supabase = createClient()
    const [open, setOpen] = useState(false)
    const [deleting, setDeleting] = useState(false)

    const handleDelete = async () => {
        setDeleting(true)
        // Primero eliminar recipients (FK)
        await supabase
            .from("incident_recipients")
            .delete()
            .eq("incident_id", incidentId)

        const { error } = await supabase
            .from("incidents")
            .delete()
            .eq("id", incidentId)

        if (error) {
            toast.error("Error al eliminar el caso.")
            console.error(error)
            setDeleting(false)
            return
        }

        await logAdminAction({
            action: "delete_incident",
            entityType: "incident",
            entityId: incidentId,
            entityDescription: folio ?? incidentId,
            beforeData: { folio },
        })
        toast.success("Caso DEC eliminado correctamente.")
        setOpen(false)

        if (redirectTo) {
            router.push(redirectTo)
        } else {
            router.refresh()
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    size={size}
                    variant="outline"
                    className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Eliminar
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>¿Eliminar caso DEC?</DialogTitle>
                    <DialogDescription>
                        {folio && <span className="font-mono font-medium">{folio} · </span>}
                        Esta acción es <strong>permanente</strong> y no se puede deshacer.
                        Se eliminarán también todas las notificaciones asociadas.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Cancelar
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={deleting}
                    >
                        {deleting ? "Eliminando..." : "Sí, eliminar"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
