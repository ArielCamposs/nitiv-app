"use client"

import { useState } from "react"
import { toast } from "sonner"
import { KeyRound, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog, DialogContent, DialogHeader,
    DialogTitle, DialogDescription, DialogTrigger,
} from "@/components/ui/dialog"

type Props = {
    studentId: string
    studentName: string
}

export function ResetPasswordButton({ studentId, studentName }: Props) {
    const [open, setOpen] = useState(false)
    const [password, setPassword] = useState("")
    const [showPass, setShowPass] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleReset = async () => {
        if (password.length < 6) {
            toast.warning("La contraseña debe tener al menos 6 caracteres.")
            return
        }

        setLoading(true)
        try {
            const res = await fetch("/api/admin/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ studentId, newPassword: password }),
            })

            const json = await res.json()
            if (!res.ok) throw new Error(json.error ?? "Error al cambiar la contraseña.")

            toast.success(`Contraseña actualizada para ${studentName}.`)
            setPassword("")
            setOpen(false)

        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "Error al cambiar la contraseña.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setPassword("") }}>
            <DialogTrigger asChild>
                <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-colors">
                    <KeyRound className="w-3.5 h-3.5" />
                </button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Cambiar contraseña</DialogTitle>
                    <DialogDescription>
                        Estudiante: <strong>{studentName}</strong>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">
                            Nueva contraseña
                        </label>
                        <div className="relative">
                            <input
                                type={showPass ? "text" : "password"}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Mín. 6 caracteres"
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPass(!showPass)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                {showPass
                                    ? <EyeOff className="w-4 h-4" />
                                    : <Eye className="w-4 h-4" />
                                }
                            </button>
                        </div>
                        <p className="text-[11px] text-slate-400">
                            Comparte la nueva contraseña con el estudiante directamente.
                        </p>
                    </div>

                    {/* Indicador de fuerza */}
                    {password.length > 0 && (
                        <div className="space-y-1">
                            <div className="flex gap-1">
                                {[1, 2, 3, 4].map(i => (
                                    <div
                                        key={i}
                                        className={`h-1 flex-1 rounded-full transition-colors ${password.length >= i * 3
                                                ? i <= 1 ? "bg-rose-400"
                                                    : i <= 2 ? "bg-amber-400"
                                                        : i <= 3 ? "bg-indigo-400"
                                                            : "bg-emerald-400"
                                                : "bg-slate-100"
                                            }`}
                                    />
                                ))}
                            </div>
                            <p className="text-[10px] text-slate-400">
                                {password.length < 6 ? "Muy corta"
                                    : password.length < 9 ? "Aceptable"
                                        : password.length < 12 ? "Buena"
                                            : "Excelente"}
                            </p>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-1 border-t">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setOpen(false); setPassword("") }}
                            disabled={loading}
                        >
                            Cancelar
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleReset}
                            disabled={loading || password.length < 6}
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            {loading ? "Cambiando..." : "Cambiar contraseña"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
