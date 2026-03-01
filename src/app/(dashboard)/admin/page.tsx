import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import {
    Users, GraduationCap, BookOpen, Activity,
    AlertTriangle, ChevronRight,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

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

    // ── Queries en paralelo ───────────────────────────────────────────────
    const [
        { count: totalUsers },
        { count: totalStudents },
        { count: totalCourses },
        { count: totalActivities },
        { data: institution },
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

        // Institución
        supabase.from("institutions")
            .select("name, plan, region, comuna, logo_url")
            .eq("id", iid).single(),

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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                ].map(stat => (
                    <Link
                        key={stat.label}
                        href={stat.href}
                        className="bg-white rounded-2xl border border-slate-100 p-4 hover:shadow-md transition-shadow space-y-2"
                    >
                        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", stat.color)}>
                            <stat.icon className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">{stat.label}</p>
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

            {/* ── Acciones rápidas ─────────────────────────────────────────── */}
            <div className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-700">Acciones rápidas</h2>
                <div className="grid md:grid-cols-2 gap-2">
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
                            href: "/admin/heatmap",
                            label: "Clima emocional",
                            desc: "Evolución histórica por curso",
                            icon: Activity,
                            color: "text-amber-600 bg-amber-50",
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
    )
}
