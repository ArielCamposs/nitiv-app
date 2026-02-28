import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET — obtener notificaciones del usuario
export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

        const { data, error } = await supabase
            .from("notifications")
            .select("id, type, title, message, related_url, read, created_at")
            .eq("recipient_id", user.id)
            .order("created_at", { ascending: false })
            .limit(30)

        if (error) throw error
        return NextResponse.json({ notifications: data ?? [] })

    } catch {
        return NextResponse.json({ error: "Error interno" }, { status: 500 })
    }
}

// PATCH — marcar como leída(s)
export async function PATCH(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

        const { ids, all, url_prefix, types } = await req.json()
        const now = new Date().toISOString()

        if (all) {
            await supabase
                .from("notifications")
                .update({ read: true, read_at: now })
                .eq("recipient_id", user.id)
                .eq("read", false)
        } else if (types?.length > 0) {
            // Marcar por tipo(s) de notificación
            await supabase
                .from("notifications")
                .update({ read: true, read_at: now })
                .eq("recipient_id", user.id)
                .eq("read", false)
                .in("type", types)
        } else if (url_prefix) {
            await supabase
                .from("notifications")
                .update({ read: true, read_at: now })
                .eq("recipient_id", user.id)
                .eq("read", false)
                .like("related_url", `${url_prefix}%`)
        } else if (ids?.length > 0) {
            await supabase
                .from("notifications")
                .update({ read: true, read_at: now })
                .eq("recipient_id", user.id)
                .in("id", ids)
        }

        return NextResponse.json({ ok: true })

    } catch {
        return NextResponse.json({ error: "Error interno" }, { status: 500 })
    }
}
