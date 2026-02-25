import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import {
    Users, GraduationCap, BookOpen, Activity,
    Shield, Zap, AlertTriangle, Clock, ChevronRight,
} from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const SEVERITY_META = {
    moderada: { label: "Moderada", color: "bg-amber-100 text-amber-700" },
    severa: { label: "Severa", color: "bg-rose-100 text-rose-700" },
}

const PLAN_BADGE: Record<string, string> = {
    demo: "bg-slate-100 text-slate-600",
    basico: "bg-blue-100 text-blue-700",
    profesional: "bg-indigo-100 text-indigo-700",
    enterprise: "bg-purple-100 text-purple-700",
}

export default async function AdminDashboardPage() {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll: () => cookieStore.getAll(),
                setAll: (c) => {
                    try { c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) }
                    catch { }
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect("/login")

    const { data: profile } = await supabase
        .from("users").select("name, institution_id").eq("id", user.id).single()
    if (!profile) redirect("/login")

    const iid = profile.institution_id

    // ── Todas las queries en paralelo ────────────────────────────────────────
    const [
        { count: totalUsers },
        { count: totalStudents },
        { count: totalCourses },
        { count: totalActivities },
        { count: openCases },
        { data: institution },
        { data: pulseSession },
        { data: recentCases },
        { count: studentsNoCourseCountVal },
        { data: recentUsers },
    ] = await Promise.all([
        // Staff activo
        supabase.from("users").select("*", { count: "exact", head: true })
            .eq("institution_id", iid).eq("active", true).neq("role", "admin"),

        // Estudiantes activos
        supabase.from("students").select("*", { count: "exact", head: true })
            .eq("institution_id", iid).eq("active", true),

        // Cursos activos
        supabase.from("courses").select("*", { count: "exact", head: true })
            .eq("institution_id", iid).eq("active", true),

        // Actividades activas
        supabase.from("activities").select("*", { count: "exact", head: true })
            .eq("institution_id", iid).eq("active", true),

        // Casos DEC abiertos
        supabase.from("incidents").select("*", { count: "exact", head: true })
            .eq("institution_id", iid).eq("resolved", false),

        // Institución
        supabase.from("institutions")
            .select("name, plan, region, comuna, logo_url")
            .eq("id", iid).single(),

        // Pulso activo
        supabase.from("pulse_sessions")
            .select("id, week_start, week_end")
            .eq("institution_id", iid).eq("active", true)
            .maybeSingle(),

        // Últimos 5 casos DEC
        supabase.from("incidents")
            .select(`
                id, folio, severity, incident_date, resolved,
                students ( name, last_name, courses ( name ) ),
                users!reporter_id ( name, last_name )
            `)
            .eq("institution_id", iid)
            .order("incident_date", { ascending: false })
            .limit(5),

        // Alertas: estudiantes sin curso
        supabase.from("students")
            .select("id", { count: "exact", head: true })
            .eq("institution_id", iid)
            .eq("active", true)
            .is("course_id", null),

        // Usuarios registrados esta semana
        supabase.from("users")
            .select("id, name, last_name, role, created_at")
            .eq("institution_id", iid)
            .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
            .order("created_at", { ascending: false })
            .limit(3),
    ])

    const studentsNoCourseCount = studentsNoCourseCountVal ?? 0

    const hora = new Date().getHours()
    const saludo = hora < 12 ? "Buenos días" : hora < 19 ? "Buenas tardes" : "Buenas noches"

    const fmtDate = (d: string) =>
        new Date(d).toLocaleDateString("es-CL", { day: "numeric", month: "short" })

    const fmtDateLong = (d: string) =>
        new Date(d + "T12:00:00").toLocaleDateString("es-CL", { day: "numeric", month: "long" })

    return (
        <div className="px-6 py-8 max-w-5xl mx-auto space-y-8">

            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="flex items-start gap-4">
                {institution?.logo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={institution.logo_url}
                        alt="Logo"
                        className="w-12 h-12 rounded-xl object-contain border border-slate-100"
                    />
                )}
                <div>
                    <p className="text-sm text-slate-500">
                        {saludo}, <span className="font-medium text-slate-700">{profile.name}</span>
                    </p>
                    <h1 className="text-2xl font-bold text-slate-900">{institution?.name}</h1>
                    <div className="flex items-center gap-2 mt-1">
                        {institution?.plan && (
                            <span className={cn(
                                "text-[11px] font-semibold px-2 py-0.5 rounded-full",
                                PLAN_BADGE[institution.plan] ?? PLAN_BADGE.demo
                            )}>
                                Plan {institution.plan}
                            </span>
                        )}
                        {institution?.region && (
                            <span className="text-xs text-slate-400">
                                {institution.comuna}, {institution.region}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* ── KPIs principales ────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                    {
                        label: "Staff activo",
                        value: totalUsers ?? 0,
                        icon: Users,
                        href: "/admin/usuarios",
                        color: "bg-indigo-50 text-indigo-600",
                    },
                    {
                        label: "Estudiantes",
                        value: totalStudents ?? 0,
                        icon: GraduationCap,
                        href: "/admin/estudiantes",
                        color: "bg-emerald-50 text-emerald-600",
                    },
                    {
                        label: "Cursos",
                        value: totalCourses ?? 0,
                        icon: BookOpen,
                        href: "/admin/cursos",
                        color: "bg-blue-50 text-blue-600",
                    },
                    {
                        label: "Actividades",
                        value: totalActivities ?? 0,
                        icon: Activity,
                        href: "/actividades",
                        color: "bg-amber-50 text-amber-600",
                    },
                    {
                        label: "Casos DEC abiertos",
                        value: openCases ?? 0,
                        icon: Shield,
                        href: "/admin/dec",
                        color: openCases && openCases > 0
                            ? "bg-rose-50 text-rose-600"
                            : "bg-slate-50 text-slate-400",
                    },
                    {
                        label: pulseSession ? "Pulso activo" : "Sin pulso activo",
                        value: pulseSession
                            ? `${fmtDateLong(pulseSession.week_start)}`
                            : "—",
                        icon: Zap,
                        href: "/admin/pulso",
                        color: pulseSession
                            ? "bg-violet-50 text-violet-600"
                            : "bg-slate-50 text-slate-400",
                        small: true,
                    },
                ].map(stat => (
                    <Link
                        key={stat.label}
                        href={stat.href}
                        className="bg-white rounded-2xl border border-slate-100 p-4 hover:shadow-md transition-shadow space-y-2 col-span-1"
                    >
                        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", stat.color)}>
                            <stat.icon className="w-4 h-4" />
                        </div>
                        <div>
                            <p className={cn(
                                "font-bold text-slate-900",
                                stat.small ? "text-sm leading-tight" : "text-2xl"
                            )}>
                                {stat.value}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">{stat.label}</p>
                        </div>
                    </Link>
                ))}
            </div>

            {/* ── Alertas ─────────────────────────────────────────────────── */}
            {(Number(studentsNoCourseCount) > 0 || (recentUsers?.length ?? 0) > 0) && (
                <div className="space-y-2">
                    <h2 className="text-sm font-semibold text-slate-700">Alertas</h2>
                    <div className="space-y-2">
                        {Number(studentsNoCourseCount) > 0 && (
                            <Link href="/admin/cursos"
                                className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 hover:bg-amber-100 transition-colors">
                                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                                <p className="text-sm text-amber-800 flex-1">
                                    <span className="font-semibold">{studentsNoCourseCount} estudiante{Number(studentsNoCourseCount) !== 1 ? "s" : ""}</span>
                                    {" "}sin curso asignado
                                </p>
                                <ChevronRight className="w-4 h-4 text-amber-400" />
                            </Link>
                        )}
                        {(recentUsers?.length ?? 0) > 0 && (
                            <Link href="/admin/usuarios"
                                className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 hover:bg-indigo-100 transition-colors">
                                <Users className="w-4 h-4 text-indigo-600 shrink-0" />
                                <p className="text-sm text-indigo-800 flex-1">
                                    <span className="font-semibold">{recentUsers?.length} usuario{(recentUsers?.length ?? 0) !== 1 ? "s" : ""}</span>
                                    {" "}nuevo{(recentUsers?.length ?? 0) !== 1 ? "s" : ""} esta semana
                                </p>
                                <ChevronRight className="w-4 h-4 text-indigo-400" />
                            </Link>
                        )}
                    </div>
                </div>
            )}

            {/* ── Layout inferior: Casos recientes + Accesos rápidos ──────── */}
            <div className="grid md:grid-cols-2 gap-6">

                {/* Casos DEC recientes */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-slate-700">Casos DEC recientes</h2>
                        <Link href="/admin/dec"
                            className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                            Ver todos →
                        </Link>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        {(recentCases ?? []).length === 0 ? (
                            <div className="py-10 text-center">
                                <Shield className="w-7 h-7 mx-auto mb-2 text-slate-200" />
                                <p className="text-sm text-slate-400">Sin casos registrados</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-slate-50">
                                {(recentCases ?? []).map((c: any) => {
                                    const meta = SEVERITY_META[c.severity as keyof typeof SEVERITY_META]
                                    return (
                                        <li key={c.id}>
                                            <Link href={`/dec/${c.id}`}
                                                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-slate-800 truncate">
                                                        {c.students?.last_name}, {c.students?.name}
                                                    </p>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <span className="text-[10px] text-slate-400">
                                                            {c.students?.courses?.name ?? "Sin curso"}
                                                        </span>
                                                        <span className="text-slate-200">·</span>
                                                        <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                                                            <Clock className="w-2.5 h-2.5" />
                                                            {fmtDate(c.incident_date)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <Badge className={cn("text-[10px]", meta?.color)}>
                                                        {meta?.label ?? c.severity}
                                                    </Badge>
                                                    <span className={cn(
                                                        "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                                                        c.resolved
                                                            ? "bg-emerald-50 text-emerald-600"
                                                            : "bg-amber-50 text-amber-600"
                                                    )}>
                                                        {c.resolved ? "Resuelto" : "Abierto"}
                                                    </span>
                                                </div>
                                            </Link>
                                        </li>
                                    )
                                })}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Accesos rápidos */}
                <div className="space-y-3">
                    <h2 className="text-sm font-semibold text-slate-700">Acciones rápidas</h2>
                    <div className="space-y-2">
                        {[
                            {
                                href: "/admin/usuarios",
                                label: "Agregar usuario staff",
                                desc: "Docente, Dupla, Inspector...",
                                icon: Users,
                                color: "text-indigo-600 bg-indigo-50",
                            },
                            {
                                href: "/admin/estudiantes",
                                label: "Agregar estudiante",
                                desc: "Crear ficha y cuenta de acceso",
                                icon: GraduationCap,
                                color: "text-emerald-600 bg-emerald-50",
                            },
                            {
                                href: "/admin/cursos",
                                label: "Gestionar cursos",
                                desc: "Crear cursos y asignar estudiantes",
                                icon: BookOpen,
                                color: "text-blue-600 bg-blue-50",
                            },
                            {
                                href: "/admin/pulso",
                                label: pulseSession ? "Ver pulso activo" : "Activar Modo Pulso",
                                desc: pulseSession
                                    ? `Semana ${fmtDateLong(pulseSession.week_start)}`
                                    : "Iniciar medición semanal",
                                icon: Zap,
                                color: "text-violet-600 bg-violet-50",
                            },
                            {
                                href: "/admin/auditoria",
                                label: "Ver auditoría",
                                desc: "Registro de tus acciones",
                                icon: Shield,
                                color: "text-slate-600 bg-slate-100",
                            },
                        ].map(a => (
                            <Link
                                key={a.href}
                                href={a.href}
                                className="flex items-center gap-3 bg-white rounded-xl border border-slate-100 px-4 py-3 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group"
                            >
                                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", a.color)}>
                                    <a.icon className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-800">{a.label}</p>
                                    <p className="text-xs text-slate-400">{a.desc}</p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
