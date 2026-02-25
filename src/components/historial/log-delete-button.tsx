"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { logAdminAction } from "@/lib/admin/log-action"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog, DialogContent, DialogDescription,
    DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"

type Props = {
    logId: string
    studentName: string
    date: string
}

export function LogDeleteButton({ logId, studentName, date }: Props) {
    const router = useRouter()
    const supabase = createClient()
    const [open, setOpen] = useState(false)
    const [deleting, setDeleting] = useState(false)

    const handleDelete = async () => {
        setDeleting(true)
        const { error } = await supabase
            .from("emotional_logs")
            .delete()
            .eq("id", logId)

        if (error) {
            toast.error("Error al eliminar el registro.")
            console.error(error)
            setDeleting(false)
            return
        }

        await logAdminAction({
            action: "delete_emotional_log",
            entityType: "emotional_log",
            entityId: logId,
            entityDescription: `${studentName} · ${new Date(date).toLocaleDateString("es-CL")}`,
            beforeData: { studentName, date },
        })
        toast.success("Registro eliminado correctamente.")
        setOpen(false)
        router.refresh()
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <button className="text-rose-400 hover:text-rose-600 transition-colors p-1 rounded hover:bg-rose-50">
                    <Trash2 className="h-3.5 w-3.5" />
                </button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>¿Eliminar registro emocional?</DialogTitle>
                    <DialogDescription>
                        Registro de <strong>{studentName}</strong> del{" "}
                        <strong>{new Date(date).toLocaleDateString("es-CL", {
                            day: "numeric", month: "long", year: "numeric"
                        })}</strong>.
                        <br />
                        Esta acción es <strong>permanente</strong> y no se puede deshacer.
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
