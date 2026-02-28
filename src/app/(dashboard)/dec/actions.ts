"use server"

import { createClient } from "@/lib/supabase/server"

export async function markDecAsSeen() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
        .from("incident_recipients")
        .update({ seen: true, seen_at: new Date().toISOString() })
        .eq("recipient_id", user.id)
        .eq("seen", false)
}
