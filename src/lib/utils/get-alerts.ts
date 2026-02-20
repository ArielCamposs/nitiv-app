import { createClient } from "@/lib/supabase/server"

export async function getActiveAlerts() {
    const supabase = await createClient()

    const { data: profile } = await supabase
        .from("users")
        .select("institution_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id ?? "")
        .maybeSingle()

    if (!profile) return []

    const { data: alerts } = await supabase
        .from("alerts")
        .select(`
      id,
      type,
      description,
      resolved,
      created_at,
      students (
        name,
        last_name,
        courses ( name )
      )
    `)
        .eq("institution_id", profile.institution_id)
        .eq("resolved", false)
        .order("created_at", { ascending: false })

    return alerts ?? []
}
