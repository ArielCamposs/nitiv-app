"use client"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { GitMerge, X } from "lucide-react"

const TO_ROLES = [
    { value: "dupla", label: "Dupla psicosocial" },
    { value: "convivencia", label: "Convivencia" },
    { value: "inspector", label: "Inspectoría" },
    { value: "utp", label: "UTP" },
    { value: "director", label: "Dirección" },
]

interface Props {
    studentId: string
    institutionId: string
    fromUserId: string
    studentName: string
    onClose: () => void
}

export function DerivacionModal({ studentId, institutionId, fromUserId, studentName, onClose }: Props) {
    const supabase = createClient()
    const [toRole, setToRole] = useState("")
    const [reason, setReason] = useState("")
    const [loading, setLoading] = useState(false)

    const handleSubmit = async () => {
        if (!toRole || !reason.trim()) {
            toast.warning("Selecciona destino y escribe el motivo.")
            return
        }
        setLoading(true)
        try {
            const { error } = await supabase.from("case_derivations").insert({
                institution_id: institutionId,
                student_id: studentId,
                from_user_id: fromUserId,
                to_role: toRole,
                reason: reason.trim(),
            })
            if (error) throw error
            toast.success(`Caso derivado a ${TO_ROLES.find(r => r.value === toRole)?.label}.`)
            onClose()
        } catch (e) {
            console.error(e)
            toast.error("No se pudo crear la derivación.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-xl p-6 space-y-5">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                        <GitMerge className="w-5 h-5 text-indigo-600" />
                        <div>
                            <h2 className="text-base font-semibold text-slate-900">Derivar caso</h2>
                            <p className="text-xs text-slate-400">{studentName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                        <X className="w-4 h-4 text-slate-500" />
                    </button>
                </div>

                <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-800">Derivar a</p>
                    <div className="grid grid-cols-2 gap-2">
                        {TO_ROLES.map(r => (
                            <button key={r.value} type="button" onClick={() => setToRole(r.value)}
                                className={cn(
                                    "rounded-xl border-2 px-3 py-2.5 text-sm font-medium text-left transition-all",
                                    toRole === r.value
                                        ? "border-indigo-400 bg-indigo-50 text-indigo-800"
                                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                )}>
                                {r.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-800">Motivo de la derivación</p>
                    <textarea value={reason} onChange={e => setReason(e.target.value)}
                        rows={3} maxLength={500}
                        placeholder="Describe brevemente la situación que motiva la derivación..."
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
                    <p className="text-right text-xs text-slate-400">{reason.length}/500</p>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                    <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
                    <Button size="sm" onClick={handleSubmit} disabled={loading || !toRole || !reason.trim()}
                        className="bg-indigo-600 hover:bg-indigo-700 gap-1.5">
                        <GitMerge className="w-3.5 h-3.5" />
                        {loading ? "Derivando..." : "Confirmar derivación"}
                    </Button>
                </div>
            </div>
        </div>
    )
}
