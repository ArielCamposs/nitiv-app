"use client"

import { useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Building2, Save, Upload, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { logAdminAction } from "@/lib/admin/log-action"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
    AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog"

const REGIONES = [
    "Arica y Parinacota", "Tarapacá", "Antofagasta", "Atacama", "Coquimbo",
    "Valparaíso", "Metropolitana de Santiago", "O'Higgins", "Maule",
    "Ñuble", "Biobío", "La Araucanía", "Los Ríos", "Los Lagos",
    "Aysén", "Magallanes",
]

const PLAN_BADGE: Record<string, string> = {
    demo: "text-slate-600 bg-slate-100",
    basico: "text-blue-700 bg-blue-100",
    profesional: "text-indigo-700 bg-indigo-100",
    enterprise: "text-purple-700 bg-purple-100",
}

interface Institution {
    id: string; name: string; rbd: string | null
    address: string | null; region: string | null; comuna: string | null
    phone: string | null; logo_url: string | null; plan: string; active: boolean
}

export function InstitucionClient({ institution: initial }: { institution: Institution }) {
    const supabase = createClient()
    const [form, setForm] = useState(initial)
    const [loading, setLoading] = useState(false)
    const [dirty, setDirty] = useState(false)
    const fileRef = useRef<HTMLInputElement>(null)
    const [uploading, setUploading] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)

    const update = (key: keyof Institution, value: string) => {
        setForm(p => ({ ...p, [key]: value || null }))
        setDirty(true)
    }

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validar tipo y tamaño
        if (!file.type.startsWith("image/")) {
            toast.error("Solo se permiten imágenes.")
            return
        }
        if (file.size > 2 * 1024 * 1024) {
            toast.error("La imagen no puede superar 2MB.")
            return
        }

        setUploading(true)
        try {
            const ext = file.name.split(".").pop()
            const filePath = `${form.id}/logo.${ext}`

            const { error: uploadError } = await supabase.storage
                .from("institution-logos")
                .upload(filePath, file, { upsert: true })

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from("institution-logos")
                .getPublicUrl(filePath)

            // Forzar cache bust
            const urlWithBust = `${publicUrl}?t=${Date.now()}`

            const { error: updateError } = await supabase
                .from("institutions")
                .update({ logo_url: publicUrl })
                .eq("id", form.id)

            if (updateError) throw updateError

            setForm(p => ({ ...p, logo_url: urlWithBust }))
            toast.success("Logo actualizado correctamente.")

        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "Error al subir el logo.")
        } finally {
            setUploading(false)
            if (fileRef.current) fileRef.current.value = ""
        }
    }

    const handleSaveClick = () => {
        if (!form.name.trim()) {
            toast.warning("El nombre de la institución es obligatorio.")
            return
        }
        setShowConfirm(true)
    }

    const handleSave = async () => {
        if (!form.name.trim()) return
        setLoading(true)
        try {
            const { error } = await supabase
                .from("institutions")
                .update({
                    name: form.name.trim(),
                    rbd: form.rbd?.trim() || null,
                    address: form.address?.trim() || null,
                    region: form.region || null,
                    comuna: form.comuna?.trim() || null,
                    phone: form.phone?.trim() || null,
                })
                .eq("id", form.id)

            if (error) throw error
            await logAdminAction({
                action: "edit_institution",
                entityType: "institution",
                entityId: form.id,
                entityDescription: form.name.trim(),
                afterData: {
                    name: form.name.trim(),
                    rbd: form.rbd?.trim() || null,
                    address: form.address?.trim() || null,
                    region: form.region || null,
                    comuna: form.comuna?.trim() || null,
                    phone: form.phone?.trim() || null,
                },
            })
            toast.success("Datos de la institución actualizados.")
            setDirty(false)
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "Error al guardar.")
        } finally {
            setLoading(false)
        }
    }

    const fields: { key: keyof Institution; label: string; placeholder: string; span: 1 | 2 }[] = [
        { key: "name", label: "Nombre del establecimiento *", placeholder: "Colegio San Martín", span: 2 },
        { key: "rbd", label: "RBD", placeholder: "12345", span: 1 },
        { key: "phone", label: "Teléfono", placeholder: "+56 32 123 4567", span: 1 },
        { key: "address", label: "Dirección", placeholder: "Av. Principal 123", span: 2 },
        { key: "comuna", label: "Comuna", placeholder: "Valparaíso", span: 1 },
    ]

    return (
        <>
            <div className="space-y-8">
                {/* Header */}
                <div className="flex items-start gap-4">
                    {/* Logo clickeable */}
                    <div className="relative group shrink-0">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center overflow-hidden border border-slate-100">
                            {form.logo_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={form.logo_url} alt="Logo" className="w-full h-full object-contain p-1" />
                            ) : (
                                <Building2 className="w-7 h-7 text-indigo-600" />
                            )}
                        </div>

                        {/* Overlay de upload */}
                        <button
                            onClick={() => fileRef.current?.click()}
                            disabled={uploading}
                            className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                            title="Cambiar logo"
                        >
                            {uploading
                                ? <Loader2 className="w-5 h-5 text-white animate-spin" />
                                : <Upload className="w-5 h-5 text-white" />
                            }
                        </button>

                        {/* Input oculto */}
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleLogoUpload}
                        />
                    </div>

                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">{form.name}</h1>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mt-1 inline-block ${PLAN_BADGE[form.plan] ?? PLAN_BADGE.demo}`}>
                            Plan {form.plan}
                        </span>
                        <p className="text-xs text-slate-400 mt-1">
                            Haz clic en el logo para cambiarlo · Máx. 2MB
                        </p>
                    </div>
                </div>

                {/* Formulario */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
                    <p className="text-sm font-semibold text-slate-700">Información del establecimiento</p>

                    <div className="grid grid-cols-2 gap-4">
                        {fields.map(f => (
                            <div key={f.key} className={`space-y-1 ${f.span === 2 ? "col-span-2" : ""}`}>
                                <label className="text-xs font-medium text-slate-700">{f.label}</label>
                                <input
                                    value={(form[f.key] as string | null) ?? ""}
                                    onChange={e => update(f.key, e.target.value)}
                                    placeholder={f.placeholder}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                />
                            </div>
                        ))}

                        {/* Región — select */}
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-700">Región</label>
                            <Select
                                value={form.region ?? ""}
                                onValueChange={v => update("region", v === "none" ? "" : v)}
                            >
                                <SelectTrigger className="w-full bg-white text-sm">
                                    <SelectValue placeholder="Selecciona una región" />
                                </SelectTrigger>
                                <SelectContent position="popper" className="max-h-[300px]">
                                    <SelectItem value="none" className="text-slate-400 italic">Sin región</SelectItem>
                                    {REGIONES.map(r => (
                                        <SelectItem key={r} value={r}>{r}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex justify-end pt-2 border-t border-slate-100">
                        <Button
                            onClick={handleSaveClick}
                            disabled={loading || !dirty}
                            className="gap-1.5 bg-indigo-600 hover:bg-indigo-700">
                            <Save className="w-4 h-4" />
                            {loading ? "Guardando..." : "Guardar cambios"}
                        </Button>
                    </div>
                </div>

                {/* Info solo lectura */}
                <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 space-y-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Solo lectura</p>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { label: "Plan actual", value: form.plan },
                            { label: "Estado", value: form.active ? "Activo" : "Inactivo" },
                        ].map(item => (
                            <div key={item.label}>
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{item.label}</p>
                                <p className="text-sm text-slate-700 mt-0.5">{item.value}</p>
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                        Para cambiar el plan o desactivar la institución, contacta al soporte de Nitiv.
                    </p>
                </div>
            </div>

            {/* Confirmación edición */}
            <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar cambios</AlertDialogTitle>
                        <AlertDialogDescription>
                            ¿Estás seguro de que deseas guardar los cambios en la institución{" "}
                            <strong>{form.name}</strong>?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => { setShowConfirm(false); handleSave() }}
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            Sí, guardar cambios
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
