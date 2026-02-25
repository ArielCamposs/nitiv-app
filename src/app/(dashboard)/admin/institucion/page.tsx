import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { InstitucionClient } from "@/components/admin/InstitucionClient"

export default async function AdminInstitucionPage() {
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

    const { data: institution } = await supabase
        .from("institutions")
        .select("id, name, rbd, address, region, comuna, phone, logo_url, plan, active")
        .eq("id", profile.institution_id)
        .single()

    if (!institution) redirect("/")

    return (
        <div className="px-6 py-8 max-w-2xl mx-auto">
            <InstitucionClient institution={institution} />
        </div>
    )
}
