import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(req: Request) {
    try {
        const supabase = await createServerClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

        const { data: profile } = await supabase
            .from("users").select("role").eq("id", user.id).single()
        if (profile?.role !== "admin") {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 })
        }

        const { userId, newPassword } = await req.json()

        if (!userId || !newPassword) {
            return NextResponse.json(
                { error: "userId y newPassword son requeridos." },
                { status: 400 }
            )
        }
        if (newPassword.length < 8) {
            return NextResponse.json(
                { error: "La contraseña debe tener al menos 8 caracteres." },
                { status: 400 }
            )
        }

        // users.id === auth user id directamente
        const { error } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            { password: newPassword }
        )

        if (error) return NextResponse.json({ error: error.message }, { status: 400 })

        return NextResponse.json({ ok: true })

    } catch (e) {
        console.error("[reset-password-user]", e)
        return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 })
    }
}
