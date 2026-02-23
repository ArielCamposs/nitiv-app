import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Download } from "lucide-react"

const AUDIENCE_CONFIG: Record<string, { label: string; show: boolean }> = {
    docente: { label: "Docentes", show: false },  // estudiantes no ven recursos de docentes
    estudiante: { label: "Estudiantes", show: true },
    familia: { label: "Familias", show: true },
}

export default async function RecursosPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect("/login")

    const { data: profile } = await supabase
        .from("users")
        .select("institution_id, role")
        .eq("id", user.id)
        .maybeSingle()

    if (!profile?.institution_id) redirect("/login")

    // Audiencias visibles según rol
    const visibleAudiences = Object.entries(AUDIENCE_CONFIG)
        .filter(([, cfg]) => cfg.show)
        .map(([key]) => key)

    const { data: resources } = await supabase
        .from("resources")
        .select("id, title, body, audience, file_url, created_at")
        .eq("institution_id", profile.institution_id)
        .eq("active", true)
        .in("audience", visibleAudiences)
        .order("created_at", { ascending: false })

    // Agrupar por audiencia
    const grouped = (resources ?? []).reduce((acc: Record<string, any[]>, r: any) => {
        if (!acc[r.audience]) acc[r.audience] = []
        acc[r.audience].push(r)
        return acc
    }, {})

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-2xl px-4 py-8 space-y-8">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Recursos</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Guías, materiales y recursos de bienestar para ti
                    </p>
                </div>

                {(resources ?? []).length === 0 && (
                    <Card className="border-dashed">
                        <CardContent className="py-12 text-center text-slate-400">
                            <BookOpen className="mx-auto h-8 w-8 mb-3 opacity-40" />
                            <p className="text-sm">Aún no hay recursos publicados.</p>
                        </CardContent>
                    </Card>
                )}

                {Object.entries(grouped).map(([audience, items]) => (
                    <section key={audience} className="space-y-3">
                        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                            {AUDIENCE_CONFIG[audience]?.label ?? audience}
                        </h2>
                        {items.map((resource: any) => (
                            <Card key={resource.id}>
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <CardTitle className="text-base">{resource.title}</CardTitle>
                                        <Badge variant="outline" className="text-xs shrink-0 capitalize">
                                            {AUDIENCE_CONFIG[resource.audience]?.label ?? resource.audience}
                                        </Badge>
                                    </div>
                                    <CardDescription className="text-xs">
                                        {new Date(resource.created_at).toLocaleDateString("es-CL", {
                                            day: "numeric", month: "long", year: "numeric"
                                        })}
                                    </CardDescription>
                                </CardHeader>
                                {(resource.body || resource.file_url) && (
                                    <CardContent className="space-y-3">
                                        {resource.body && (
                                            <p className="text-sm text-slate-600">{resource.body}</p>
                                        )}
                                        {resource.file_url && (
                                            <a
                                                href={resource.file_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:underline"
                                            >
                                                <Download className="h-4 w-4" />
                                                Descargar archivo
                                            </a>
                                        )}
                                    </CardContent>
                                )}
                            </Card>
                        ))}
                    </section>
                ))}
            </div>
        </main>
    )
}
