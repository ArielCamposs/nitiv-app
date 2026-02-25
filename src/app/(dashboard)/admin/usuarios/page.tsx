import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { UsersClient } from "@/components/admin/UsersClient"

export default async function AdminUsuariosPage() {
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

    const { data: users } = await supabase
        .from("users")
        .select("id, name, last_name, email, role, phone, active, created_at")
        .eq("institution_id", profile.institution_id)
        .neq("role", "admin")
        .order("name")

    return (
        <div className="px-6 py-8 max-w-5xl mx-auto">
            <UsersClient
                users={users ?? []}
                institutionId={profile.institution_id}
            />
        </div>
    )
}
