import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// Cliente con permisos de admin (service role)
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
            .from("users").select("role, institution_id").eq("id", user.id).single()
        if (profile?.role !== "admin") {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 })
        }

        const body = await req.json()
        const {
            email, password, name, last_name,
            rut, birthdate, course_id,
            guardian_name, guardian_phone, guardian_email,
        } = body

        if (!email || !password || !name || !last_name) {
            return NextResponse.json(
                { error: "Email, contraseña, nombre y apellido son obligatorios." },
                { status: 400 }
            )
        }

        // 1. Crear usuario en Supabase Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: email.trim().toLowerCase(),
            password,
            email_confirm: true, // confirmado directo, sin email de verificación
            user_metadata: { name, last_name },
        })

        if (authError) {
            console.error("[create-student authError]:", JSON.stringify(authError, null, 2))
            let errorMessage = authError.message

            const msgLower = errorMessage.toLowerCase()
            if (
                msgLower.includes("already registered") ||
                msgLower.includes("already exists") ||
                msgLower.includes("user_already_exists") ||
                (msgLower.includes("email") && msgLower.includes("use")) ||
                authError.code === "user_already_exists"
            ) {
                errorMessage = "Este correo electrónico ya está registrado."
            }
            return NextResponse.json({ error: errorMessage }, { status: 400 })
        }

        const authUserId = authData.user.id

        // 2. Crear registro en tabla users
        const { error: userError } = await supabaseAdmin.from("users").insert({
            id: authUserId,
            email: email.trim().toLowerCase(),
            name,
            last_name,
            role: "estudiante",
            institution_id: profile.institution_id,
        })

        if (userError) {
            // Rollback: eliminar el usuario de Auth
            await supabaseAdmin.auth.admin.deleteUser(authUserId)

            let errorMessage = userError.message
            if (userError.code === "23505" || errorMessage.includes("unique constraint") || errorMessage.includes("users_email_key")) {
                errorMessage = "Este correo electrónico ya está registrado en el sistema."
            }

            return NextResponse.json({ error: errorMessage }, { status: 400 })
        }

        // 3. Crear registro en tabla students
        const { data: student, error: studentError } = await supabaseAdmin
            .from("students")
            .insert({
                user_id: authUserId,
                institution_id: profile.institution_id,
                name,
                last_name,
                rut: rut?.trim() || null,
                birthdate: birthdate || null,
                course_id: course_id || null,
                guardian_name: guardian_name?.trim() || null,
                guardian_phone: guardian_phone?.trim() || null,
                guardian_email: guardian_email?.trim() || null,
                active: true,
            })
            .select("id, name, last_name, rut, birthdate, guardian_name, guardian_phone, guardian_email, course_id, active, created_at")
            .single()

        if (studentError) {
            // Rollback completo
            await supabaseAdmin.auth.admin.deleteUser(authUserId)

            let errorMessage = studentError.message
            if (studentError.code === "23505" || errorMessage.includes("unique constraint") || errorMessage.includes("students_rut_key")) {
                if (errorMessage.toLowerCase().includes("rut")) {
                    errorMessage = "Este RUT ya está registrado en el sistema."
                } else {
                    errorMessage = "Este correo electrónico (o RUT) ya está registrado en el sistema."
                }
            }

            return NextResponse.json({ error: errorMessage }, { status: 400 })
        }

        return NextResponse.json({ student })

    } catch (e) {
        console.error("[create-student]", e)
        return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 })
    }
}
