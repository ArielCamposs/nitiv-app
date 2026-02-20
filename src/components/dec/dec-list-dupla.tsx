"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Card,
    CardContent,
} from "@/components/ui/card"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "../ui/dialog"
import { Textarea } from "@/components/ui/textarea"

type DecCase = {
    id: string
    folio: string
    type: string
    severity: string
    location: string | null
    incident_date: string
    resolved: boolean
    students: {
        id: string
        name: string
        last_name: string
        courses: { name: string } | null
    } | null
    users: { name: string; last_name: string; role: string } | null
    incident_recipients: Array<{
        id: string
        recipient_id: string
        seen: boolean
        seen_at: string | null
        role: string
    }>
}

const SEVERITY_META = {
    moderada: { label: "Etapa 2 — Moderada", color: "bg-amber-100 text-amber-700 border-amber-200" },
    severa: { label: "Etapa 3 — Severa", color: "bg-rose-100 text-rose-700 border-rose-200" },
}

type Props = {
    cases: DecCase[]
    currentUserId: string
    userRole: string
}

function DecFilters({
    filterSeverity,
    setFilterSeverity,
    filterStatus,
    setFilterStatus,
    count
}: any) {
    return (
        <div className="flex flex-wrap gap-3 items-center">
            <Select onValueChange={setFilterSeverity} value={filterSeverity}>
                <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filtrar por severidad" />
                </SelectTrigger>
                <SelectContent side="bottom" align="start" className="z-50">
                    <SelectItem value="all">Todas las severidades</SelectItem>
                    <SelectItem value="moderada">Etapa 2 — Moderada</SelectItem>
                    <SelectItem value="severa">Etapa 3 — Severa</SelectItem>
                </SelectContent>
            </Select>

            <Select onValueChange={setFilterStatus} value={filterStatus}>
                <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent side="bottom" align="start" className="z-50">
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="pending">En seguimiento</SelectItem>
                    <SelectItem value="resolved">Resueltos</SelectItem>
                </SelectContent>
            </Select>

            <div className="text-xs text-slate-500 px-2 py-2">
                {count} caso{count !== 1 ? "s" : ""}
            </div>
        </div>
    )
}

export function DecListDupla({ cases, currentUserId, userRole }: Props) {
    const router = useRouter()
    const supabase = createClient()
    const [filterSeverity, setFilterSeverity] = useState<string>("all")
    const [filterStatus, setFilterStatus] = useState<string>("all")
    const [resolvingId, setResolvingId] = useState<string | null>(null)
    const [resolutionNotes, setResolutionNotes] = useState("")
    const [saving, setSaving] = useState(false)

    const filtered = cases.filter((c) => {
        if (filterSeverity !== "all" && c.severity !== filterSeverity) return false
        if (filterStatus === "pending" && c.resolved) return false
        if (filterStatus === "resolved" && !c.resolved) return false
        return true
    })

    return (
        <div className="space-y-4">
            <DecFilters
                filterSeverity={filterSeverity}
                setFilterSeverity={setFilterSeverity}
                filterStatus={filterStatus}
                setFilterStatus={setFilterStatus}
                count={filtered.length}
            />

            {filtered.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 py-12 text-center">
                    <p className="text-sm text-slate-400">
                        No hay casos DEC con los filtros seleccionados.
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map((dec) => {
                        const severity = SEVERITY_META[dec.severity as keyof typeof SEVERITY_META]

                        return (
                            <Card key={dec.id} className="hover:shadow-md transition-shadow">
                                <CardContent className="py-3 px-4">
                                    <div className="flex items-center justify-between gap-4">
                                        {/* Información principal — LINK */}
                                        <Link href={`/dec/${dec.id}`} className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="text-sm font-semibold text-slate-900 truncate">
                                                    {dec.students
                                                        ? `${dec.students.last_name}, ${dec.students.name}`
                                                        : "Estudiante desconocido"}
                                                </p>
                                                <Badge
                                                    className={`text-[10px] shrink-0 border ${severity?.color}`}
                                                >
                                                    {severity?.label ?? dec.severity}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                                <span>{dec.students?.courses?.name ?? "Sin curso"}</span>
                                                <span>·</span>
                                                <span>{dec.folio ?? "Sin folio"}</span>
                                                <span>·</span>
                                                <span>
                                                    {new Date(dec.incident_date).toLocaleDateString("es-CL", {
                                                        day: "2-digit",
                                                        month: "short",
                                                    })}
                                                </span>
                                            </div>
                                        </Link>

                                        {/* Estado del caso + Resolver */}
                                        <div className="flex items-center gap-3">
                                            <Badge
                                                className={
                                                    dec.resolved
                                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]"
                                                        : "bg-amber-50 text-amber-700 border-amber-200 text-[10px]"
                                                }
                                                variant="outline"
                                            >
                                                {dec.resolved ? "Resuelto" : "Seguimiento"}
                                            </Badge>

                                            {!dec.resolved && ["dupla", "convivencia"].includes(userRole) && (
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button size="sm" variant="outline">
                                                            Resolver
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                                                        <DialogHeader>
                                                            <DialogTitle>Resolver caso DEC</DialogTitle>
                                                            <DialogDescription>
                                                                {dec.students?.last_name}, {dec.students?.name} · {dec.folio}
                                                            </DialogDescription>
                                                        </DialogHeader>
                                                        <div className="space-y-4">
                                                            <div>
                                                                <label className="text-sm font-medium">
                                                                    Observaciones de resolución
                                                                </label>
                                                                <Textarea
                                                                    rows={4}
                                                                    placeholder="Describe cómo se resolvió el caso..."
                                                                    value={resolvingId === dec.id ? resolutionNotes : ""}
                                                                    onChange={(e) => {
                                                                        setResolvingId(dec.id)
                                                                        setResolutionNotes(e.target.value)
                                                                    }}
                                                                />
                                                            </div>
                                                            <div className="flex justify-end gap-2">
                                                                <Button
                                                                    variant="outline"
                                                                    onClick={() => {
                                                                        setResolvingId(null)
                                                                        setResolutionNotes("")
                                                                    }}
                                                                >
                                                                    Cancelar
                                                                </Button>
                                                                <Button
                                                                    onClick={async () => {
                                                                        setSaving(true)
                                                                        const { error } = await supabase
                                                                            .from("incidents")
                                                                            .update({
                                                                                resolved: true,
                                                                                resolution_notes: resolutionNotes,
                                                                                resolved_by: currentUserId,
                                                                                resolved_at: new Date().toISOString(),
                                                                            })
                                                                            .eq("id", dec.id)

                                                                        if (error) {
                                                                            toast.error("Error al resolver el caso.")
                                                                            console.error(error)
                                                                        } else {
                                                                            toast.success("Caso resuelto correctamente.")
                                                                            setResolvingId(null)
                                                                            setResolutionNotes("")
                                                                            router.refresh()
                                                                        }
                                                                        setSaving(false)
                                                                    }}
                                                                    disabled={saving || !resolutionNotes.trim()}
                                                                >
                                                                    {saving ? "Guardando..." : "Resolver caso"}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
