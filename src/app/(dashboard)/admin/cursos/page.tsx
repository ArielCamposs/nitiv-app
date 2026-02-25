import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { CoursesClient } from "@/components/admin/CoursesClient"

export default async function AdminCursosPage() {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll: () => cookieStore.getAll(),
                setAll: (c) => { try { c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch { } },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect("/login")

    const { data: profile } = await supabase
        .from("users").select("role, institution_id").eq("id", user.id).single()
    if (profile?.role !== "admin") redirect("/")

    const [{ data: courses }, { data: teachers }, { data: studentCounts }, { data: students }] = await Promise.all([
        supabase
            .from("courses")
            .select("id, name, level, section, year, active")
            .eq("institution_id", profile.institution_id)
            .order("name"),
        supabase
            .from("users")
            .select("id, name, last_name, role")
            .eq("institution_id", profile.institution_id)
            .in("role", ["docente", "dupla", "convivencia", "utp", "inspector", "director"])
            .eq("active", true)
            .order("name"),
        supabase
            .from("students")
            .select("course_id")
            .eq("institution_id", profile.institution_id)
            .eq("active", true),
        supabase
            .from("students")
            .select("id, name, last_name, course_id")
            .eq("institution_id", profile.institution_id)
            .eq("active", true)
            .order("last_name"),
    ])

    // Contar estudiantes por curso
    const countMap: Record<string, number> = {}
    studentCounts?.forEach(s => {
        if (s.course_id) countMap[s.course_id] = (countMap[s.course_id] ?? 0) + 1
    })

    // Obtener asignaciones docente-curso
    const courseIds = (courses ?? []).map(c => c.id)
    const { data: assignments } = courseIds.length > 0
        ? await supabase
            .from("course_teachers")
            .select("course_id, teacher_id")
            .in("course_id", courseIds)
        : { data: [] }

    return (
        <div className="px-6 py-8 max-w-5xl mx-auto">
            <CoursesClient
                courses={courses ?? []}
                teachers={teachers ?? []}
                assignments={assignments ?? []}
                studentCountMap={countMap}
                students={students ?? []}
                institutionId={profile.institution_id}
            />
        </div>
    )
}
