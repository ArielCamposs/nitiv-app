import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Pencil } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AcuseRecibo } from "@/components/dec/acuse-recibo"
import { DecDeleteButton } from "@/components/dec/dec-delete-button"

const SEVERITY_META = {
    moderada: { label: "Etapa 2 — Moderada", color: "bg-amber-100 text-amber-700" },
    severa: { label: "Etapa 3 — Severa", color: "bg-rose-100 text-rose-700" },
}

const TYPE_LABELS: Record<string, string> = {
    DEC: "Desregulación Emocional y Conductual",
    agresion_fisica: "Agresión Física",
    agresion_verbal: "Agresión Verbal",
    bullying: "Bullying",
    acoso: "Acoso",
    consumo: "Consumo",
    autoagresion: "Autoagresión",
    otro: "Otro",
}

async function getDecDetail(id: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data: incident, error } = await supabase
        .from("incidents")
        .select(`
      id,
      folio,
      type,
      severity,
      location,
      context,
      conduct_types,
      triggers,
      actions_taken,
      description,
      guardian_contacted,
      resolved,
      incident_date,
      created_at,
      students (
        id,
        name,
        last_name,
        rut,
        guardian_name,
        guardian_phone,
        courses ( name, level )
      ),
      users!reporter_id (
        name,
        last_name,
        role
      )
    `)
        .eq("id", id)
        .maybeSingle()

    if (error || !incident) return null

    // Obtener destinatarios/notificados
    const { data: recipients } = await supabase
        .from("incident_recipients")
        .select(`
      id,
      role,
      seen,
      seen_at,
      response,
      responded_at,
      users!recipient_id (
        name,
        last_name
      )
    `)
        .eq("incident_id", id)

    // Ver si el usuario actual es destinatario pendiente
    const myRecipient = user ? recipients?.find(
        (r: any) => r.recipient_id === user.id && !r.seen
    ) : null

    // Detectar si el usuario actual es admin
    const isAdmin = user
        ? (await supabase.from("users").select("role").eq("id", user.id).single()).data?.role === "admin"
        : false

    return { incident, recipients: recipients ?? [], myRecipientId: myRecipient?.id ?? null, isAdmin }
}

function SectionBlock({
    title,
    children,
}: {
    title: string
    children: React.ReactNode
}) {
    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent>{children}</CardContent>
        </Card>
    )
}

function TagList({ items }: { items: string[] | null }) {
    if (!items?.length) {
        return <p className="text-sm text-slate-400">No registrado</p>
    }
    return (
        <div className="flex flex-wrap gap-2">
            {items.map((item) => (
                <span
                    key={item}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
                >
                    {item}
                </span>
            ))}
        </div>
    )
}

export default async function DecDetailPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const data = await getDecDetail(id)

    if (!data) return notFound()

    const { incident, recipients } = data
    const student = incident.students as any
    const reporter = incident.users as any
    const severity = SEVERITY_META[incident.severity as keyof typeof SEVERITY_META]

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">

                {/* Encabezado */}
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-semibold text-slate-900">Ficha DEC</h1>
                            {incident.folio && (
                                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-500">
                                    {incident.folio}
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                            {new Date(incident.incident_date).toLocaleDateString("es-CL", {
                                weekday: "long",
                                day: "2-digit",
                                month: "long",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                        <Badge className={`text-xs ${severity?.color}`}>
                            {severity?.label ?? incident.severity}
                        </Badge>

                        {/* Acciones admin */}
                        {data.isAdmin && (
                            <>
                                <Link href={`/dec/${incident.id}/editar`}>
                                    <Button size="sm" variant="outline" className="gap-1">
                                        <Pencil className="h-3.5 w-3.5" />
                                        Editar
                                    </Button>
                                </Link>
                                <DecDeleteButton
                                    incidentId={incident.id}
                                    folio={incident.folio}
                                    redirectTo="/admin/dec"
                                />
                            </>
                        )}
                    </div>
                </div>

                {/* Sección 1: Identificación */}
                <SectionBlock title="1. Identificación del estudiante">
                    <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
                        <div>
                            <p className="text-xs text-slate-400">Nombre</p>
                            <p className="font-medium text-slate-900">
                                {student?.name} {student?.last_name}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400">RUT</p>
                            <p className="text-slate-700">{student?.rut ?? "No registrado"}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400">Curso</p>
                            <p className="text-slate-700">
                                {student?.courses?.name ?? "Sin curso"}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400">Apoderado</p>
                            <p className="text-slate-700">
                                {student?.guardian_name ?? "No registrado"}
                            </p>
                        </div>
                        {student?.guardian_phone && (
                            <div>
                                <p className="text-xs text-slate-400">Teléfono apoderado</p>
                                <p className="text-slate-700">{student.guardian_phone}</p>
                            </div>
                        )}
                        <div>
                            <p className="text-xs text-slate-400">Apoderado contactado</p>
                            <p className={incident.guardian_contacted ? "text-emerald-600 font-medium" : "text-rose-500"}>
                                {incident.guardian_contacted ? "Sí" : "No"}
                            </p>
                        </div>
                    </div>
                </SectionBlock>

                {/* Sección 2: Contexto */}
                <SectionBlock title="2. Contexto del incidente">
                    <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
                        <div>
                            <p className="text-xs text-slate-400">Lugar</p>
                            <p className="text-slate-700">{incident.location ?? "No registrado"}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400">Actividad en curso</p>
                            <p className="text-slate-700">{incident.context ?? "No registrada"}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400">Tipo de incidente</p>
                            <p className="text-slate-700">
                                {TYPE_LABELS[incident.type] ?? incident.type}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400">Reportado por</p>
                            <p className="text-slate-700">
                                {reporter
                                    ? `${reporter.name} ${reporter.last_name}`
                                    : "Desconocido"}
                            </p>
                        </div>
                    </div>
                </SectionBlock>

                {/* Sección 3: Tipificación */}
                <SectionBlock title="3. Conductas observadas">
                    <TagList items={incident.conduct_types} />
                </SectionBlock>

                {/* Sección 4: Análisis funcional */}
                <SectionBlock title="4. Situaciones desencadenantes">
                    <TagList items={incident.triggers} />
                </SectionBlock>

                {/* Sección 5: Acciones tomadas */}
                <SectionBlock title="5. Acciones realizadas">
                    <TagList items={incident.actions_taken} />
                </SectionBlock>

                {/* Sección 6: Observaciones */}
                {incident.description && (
                    <SectionBlock title="6. Observaciones adicionales">
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">
                            {incident.description}
                        </p>
                    </SectionBlock>
                )}

                {/* Sección 7: Destinatarios / Notificados */}
                <SectionBlock title="7. Notificados del caso">
                    {recipients.length === 0 ? (
                        <p className="text-sm text-slate-400">
                            No se registraron destinatarios para este caso.
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {recipients.map((r: any) => (
                                <div
                                    key={r.id}
                                    className="flex items-center justify-between rounded-md border px-3 py-2"
                                >
                                    <div>
                                        <p className="text-sm font-medium text-slate-900">
                                            {r.users
                                                ? `${r.users.name} ${r.users.last_name}`
                                                : r.role}
                                        </p>
                                        <p className="text-xs capitalize text-slate-400">{r.role}</p>
                                    </div>
                                    <div className="text-right">
                                        {r.seen ? (
                                            <div>
                                                <span className="text-xs font-medium text-emerald-600">
                                                    Visto ✓
                                                </span>
                                                {r.seen_at && (
                                                    <p className="text-[10px] text-slate-400">
                                                        {new Date(r.seen_at).toLocaleDateString("es-CL", {
                                                            day: "2-digit",
                                                            month: "short",
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                        })}
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-400">Pendiente</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </SectionBlock>

                {/* Estado del caso */}
                <div className="flex items-center justify-between rounded-lg border border-dashed px-4 py-3">
                    <p className="text-sm text-slate-600">Estado del caso</p>
                    <Badge
                        className={
                            incident.resolved
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700"
                        }
                    >
                        {incident.resolved ? "Resuelto" : "En seguimiento"}
                    </Badge>
                </div>

                {data.myRecipientId && (
                    <AcuseRecibo recipientId={data.myRecipientId} />
                )}

            </div>
        </main>
    )
}
