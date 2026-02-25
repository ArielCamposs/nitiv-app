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
        // Verificar que quien llama es admin
        const supabase = await createServerClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

        const { data: profile } = await supabase
            .from("users").select("role").eq("id", user.id).single()
        if (profile?.role !== "admin") {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 })
        }

        const { studentId, newPassword } = await req.json()

        if (!studentId || !newPassword) {
            return NextResponse.json(
                { error: "studentId y newPassword son requeridos." },
                { status: 400 }
            )
        }

        if (newPassword.length < 6) {
            return NextResponse.json(
                { error: "La contraseña debe tener al menos 6 caracteres." },
                { status: 400 }
            )
        }

        // Obtener el user_id del estudiante
        const { data: student, error: studentError } = await supabaseAdmin
            .from("students")
            .select("user_id")
            .eq("id", studentId)
            .single()

        if (studentError || !student?.user_id) {
            return NextResponse.json(
                { error: "Estudiante no encontrado o sin cuenta de acceso." },
                { status: 404 }
            )
        }

        // Cambiar contraseña en Auth
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
            student.user_id,
            { password: newPassword }
        )

        if (authError) {
            return NextResponse.json({ error: authError.message }, { status: 400 })
        }

        return NextResponse.json({ ok: true })

    } catch (e) {
        console.error("[reset-password]", e)
        return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 })
    }
}
